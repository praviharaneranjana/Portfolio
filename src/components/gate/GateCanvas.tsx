"use client";

import { Suspense, useEffect, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { Box3, MathUtils, Vector3, type Group, type MeshStandardMaterial, type Object3D, type PointLight } from "three";
import { siteConfig } from "@/config/site";
import { RCCar, type CarInput } from "./RCCar";
import { HangarEnvironment } from "./HangarEnvironment";
import { EternityVoid } from "./EternityVoid";

export type GateControl = {
  progress: number;
  unlockedAt: number | null;
};

type Props = {
  ctrl: RefObject<GateControl>;
  inputRef: RefObject<CarInput>;
  onDistanceUpdate: (dist: number, inRange: boolean) => void;
  isBypassing: boolean;
  isUnlocked: boolean;
  onReady: () => void;
};

const BG = siteConfig.scene.background;

// Cinematic unlock timeline (in seconds after unlock trigger)
const T = {
  bolts: [0.1, 0.8],
  dial: [0.2, 1.7],
  pins: [0.3, 0.9],
  unseal: [0.6, 1.0],
  doors: [1.0, 2.4],
  cameraZoomOut: [0.0, 1.3],
  cameraVoidChase: [1.3, 3.8],
} as const;

const seg = (t: number, [a, b]: readonly [number, number]) => MathUtils.clamp((t - a) / (b - a), 0, 1);
const inOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const inOutQuart = (x: number) => (x < 0.5 ? 8 * x ** 4 : 1 - (-2 * x + 2) ** 4 / 2);
const inCubic = (x: number) => x * x * x;
const outCubic = (x: number) => 1 - (1 - x) ** 3;
const outBack = (x: number) => 1 + 2.7 * (x - 1) ** 3 + 1.7 * (x - 1) ** 2;

type Parts = {
  doorL: Object3D;
  doorR: Object3D;
  dial: Object3D;
  bolts: Object3D[];
  pins: { obj: Object3D; dir: Vector3 }[];
  glow?: MeshStandardMaterial;
};

function collectParts(root: Object3D): Parts {
  const get = (name: string) => root.getObjectByName(name) as Object3D;
  const pins: { obj: Object3D; dir: Vector3; order: number }[] = [];
  let glow: MeshStandardMaterial | undefined;

  root.traverse((o) => {
    const m = (o as { material?: MeshStandardMaterial }).material;
    if (m?.name === "Glow") glow = m;
    if (!/^Pin_\d+$/.test(o.name)) return;
    const c = new Box3().setFromObject(o).getCenter(new Vector3());
    const dir = new Vector3(c.x, c.y, 0).normalize();
    const deg = MathUtils.radToDeg(Math.atan2(dir.y, dir.x));
    pins.push({ obj: o, dir, order: (((90 - deg) % 360) + 360) % 360 });
  });

  pins.sort((a, b) => a.order - b.order);
  return {
    doorL: get("DoorL"),
    doorR: get("DoorR"),
    dial: get("Dial"),
    bolts: [get("Bolt_0"), get("Bolt_1")].filter(Boolean),
    pins,
    glow,
  };
}

function SceneContent({ ctrl, inputRef, onDistanceUpdate, isBypassing, isUnlocked, onReady }: Props) {
  const { scene } = useGLTF(siteConfig.gate.model);
  const size = useThree((s) => s.size);
  const root = useRef<Group>(null);
  const parts = useRef<Parts | null>(null);
  const portalSpill = useRef<PointLight>(null);

  // Position & tracking state
  const carPosition = useRef(new Vector3(0, -2.46, 12.0));
  const carSpeed = useRef(0);
  const [inAccessZone, setInAccessZone] = useState(false);

  // Smooth camera state
  const isMobile = size.width < 768;
  const cameraTarget = useRef(new Vector3(0, isMobile ? 1.4 : 0.6, isMobile ? 15.5 : 14.5));
  const cameraLook = useRef(new Vector3(0, -1.0, 6.0));

  useEffect(onReady, [onReady]);

  const handleCarPositionUpdate = (pos: Vector3, speed: number) => {
    carPosition.current.copy(pos);
    carSpeed.current = speed;

    const distanceToGate = Math.max(0, pos.z - 2.0);
    const inRange = distanceToGate <= 3.2 && Math.abs(pos.x) <= 3.0;

    if (inRange !== inAccessZone) {
      setInAccessZone(inRange);
    }
    onDistanceUpdate(distanceToGate, inRange);
  };

  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.05);
    if (!root.current) return;
    parts.current ??= collectParts(root.current);

    const c = ctrl.current;
    const { doorL, doorR, dial, bolts, pins, glow } = parts.current;
    const t = c.unlockedAt === null ? -1 : performance.now() / 1000 - c.unlockedAt;

    if (t >= 0) {
      // 1. Vault Wheel Rotation
      const dialProgress = outCubic(seg(t, T.dial));
      dial.rotation.z = -dialProgress * Math.PI * 4;

      // 2. Pins Retract
      pins.forEach(({ obj, dir }) => {
        const amt = outBack(seg(t, T.pins));
        obj.position.set(dir.x * 0.28 * amt, dir.y * 0.28 * amt, 0);
      });

      // 3. Bolts Slide
      const boltProgress = inOutCubic(seg(t, T.bolts));
      bolts.forEach((bolt) => (bolt.position.x = 1.35 * boltProgress));

      // 4. Doors Unseal & Slide Open
      const unseal = 0.06 * Math.sin(Math.PI * seg(t, T.unseal));
      const open = inOutQuart(seg(t, T.doors));
      doorL.position.set(-4.6 * open, 0, unseal);
      doorR.position.set(4.6 * open, 0, unseal);

      // The entire rotation dial wheel travels with DoorR to the right (never left hovering in the center!)
      dial.position.set(doorR.position.x, 0, unseal);

      // Warm Coral Light Spills From Inside Vault Portal
      if (portalSpill.current) {
        portalSpill.current.intensity = 55 * seg(t, [0.8, 2.0]);
      }
    }

    if (glow) {
      glow.emissiveIntensity = inAccessZone ? 1.8 : 0.6;
    }

    // Dynamic Camera Flow
    const car = carPosition.current;

    if (t >= 0) {
      // DYNAMIC UNLOCK & CHASE CINEMATIC:
      // 1. Initial stage (t < 1.2s): Anticipation framing as the safe dial rotates and bolts pull back
      // 2. Drive-through stage (t >= 1.2s): Chase camera follows the RC car smoothly into the dark void towards Door to Eternity
      const zoomOut = inOutCubic(seg(t, T.cameraZoomOut));
      const voidChase = inOutCubic(seg(t, T.cameraVoidChase));

      if (voidChase > 0.01) {
        // High-speed chase behind the car as it enters the dark void corridor
        const followDist = isMobile ? 4.2 : 3.6;
        const camHeight = isMobile ? 1.6 : 1.2;

        const targetCamZ = car.z + followDist;
        const targetCamY = car.y + camHeight;
        const targetCamX = car.x * 0.5;

        cameraTarget.current.lerp(new Vector3(targetCamX, targetCamY, targetCamZ), dt * 9);
        // Look ahead towards the radiant Door to Eternity portal at Z = -36
        cameraLook.current.lerp(new Vector3(0, -0.4, car.z - 12.0), dt * 10);
      } else {
        // Anticipation framing while gate mechanism activates
        const wideCamZ = isMobile ? 10.5 : 9.5;
        const wideCamY = isMobile ? 0.8 : 0.2;

        const currentZ = MathUtils.lerp(car.z + 4.2, wideCamZ, zoomOut);
        const currentY = MathUtils.lerp(car.y + 1.8, wideCamY, zoomOut);

        cameraTarget.current.set(car.x * 0.4, currentY, currentZ);
        cameraLook.current.set(0, -0.6, -6.0);
      }
    } else {
      // ACTIVE 3RD-PERSON CHASE CAMERA
      // Wider FOV / distance on mobile so the user has full environmental visibility
      const followDist = isMobile ? 4.8 : 3.8;
      const camHeight = isMobile ? 2.0 : 1.4;

      const desiredCamPos = new Vector3(
        car.x * 0.65,
        car.y + camHeight,
        car.z + followDist,
      );

      const desiredLookAt = new Vector3(
        car.x * 0.35,
        car.y + 0.6,
        car.z - 5.0,
      );

      cameraTarget.current.lerp(desiredCamPos, dt * 8);
      cameraLook.current.lerp(desiredLookAt, dt * 9);
    }

    camera.position.copy(cameraTarget.current);
    camera.lookAt(cameraLook.current);
  });

  return (
    <>
      {/* 3D Vault Gate */}
      <group ref={root} position={[0, 0, 0]}>
        <primitive object={scene} />
      </group>

      {/* Realistic Concrete Hangar & Guided Tracks */}
      <HangarEnvironment inAccessZone={inAccessZone} />

      {/* Second Scene: The Really Dark Place Void & Door to Eternity Portal */}
      <EternityVoid isUnlocked={isUnlocked} />

      {/* Playable Military RC Car */}
      <RCCar
        inputRef={inputRef}
        onPositionUpdate={handleCarPositionUpdate}
        isBypassing={isBypassing}
        isUnlocked={isUnlocked}
      />

      {/* Warm Coral Ambient Light From Inside the Vault Portal */}
      <pointLight
        ref={portalSpill}
        position={[0, 0, -1.2]}
        color={siteConfig.scene.rimLight}
        intensity={0}
        distance={22}
        decay={1.2}
      />
    </>
  );
}

function StableLighting() {
  return (
    <>
      {/* Balanced, realistic industrial illumination without heavy shadows or flicker */}
      <ambientLight intensity={0.22} color="#94a3b8" />
      <directionalLight position={[6, 12, 10]} intensity={1.4} color="#f8fafc" />
      <directionalLight position={[-6, 8, -4]} intensity={0.6} color="#64748b" />
      {/* Subtle rim light for military asset silhouette */}
      <directionalLight position={[0, -2, 6]} intensity={0.3} color="#f97316" />
    </>
  );
}

export default function GateCanvas(props: Props) {
  return (
    <Canvas
      camera={{ position: [0, 1.2, 14], fov: 40, near: 0.1, far: 110 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#030407"]} />
      <fog attach="fog" args={["#030407", 24, 75]} />
      <StableLighting />
      <Suspense fallback={null}>
        <SceneContent {...props} />
      </Suspense>
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur luminanceThreshold={1.1} intensity={0.45} radius={0.55} />
        <Vignette offset={0.3} darkness={0.7} />
      </EffectComposer>
    </Canvas>
  );
}

useGLTF.preload(siteConfig.gate.model);

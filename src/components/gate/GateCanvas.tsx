"use client";

import { Suspense, useEffect, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Box3, MathUtils, Vector3, type Group, type MeshStandardMaterial, type Object3D, type PointLight } from "three";
import { siteConfig } from "@/config/site";
import { RCCar, type CarInput } from "./RCCar";
import { HangarEnvironment } from "./HangarEnvironment";

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

const FOV = 42;
const BG = siteConfig.scene.background;

// Unlock timeline, in seconds after bypass is triggered
const T = {
  bolts: [0, 0.55],
  glow: [0.15, 0.6],
  unseal: [0.45, 0.7],
  doors: [0.7, 2.2],
  dial: [0.2, 1.8],
  cameraFly: [1.2, 2.8],
} as const;

const seg = (t: number, [a, b]: readonly [number, number]) => MathUtils.clamp((t - a) / (b - a), 0, 1);
const inOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const inOutQuart = (x: number) => (x < 0.5 ? 8 * x ** 4 : 1 - (-2 * x + 2) ** 4 / 2);
const inCubic = (x: number) => x * x * x;
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
  const root = useRef<Group>(null);
  const parts = useRef<Parts | null>(null);
  const spill = useRef<PointLight>(null);

  // Car position & tracking state
  const carPosition = useRef(new Vector3(0, -2.46, 12.5));
  const carSpeed = useRef(0);
  const [inAccessZone, setInAccessZone] = useState(false);

  // Camera smooth chase state
  const cameraTarget = useRef(new Vector3(0, 0, 16));
  const cameraLook = useRef(new Vector3(0, 0, 0));

  useEffect(onReady, [onReady]);

  const handleCarPositionUpdate = (pos: Vector3, speed: number) => {
    carPosition.current.copy(pos);
    carSpeed.current = speed;

    // Distance to gate entry threshold at Z = 2.0
    const distanceToGate = Math.max(0, pos.z - 2.0);
    const inRange = distanceToGate <= 3.2 && Math.abs(pos.x) <= 3.2;

    if (inRange !== inAccessZone) {
      setInAccessZone(inRange);
    }
    onDistanceUpdate(distanceToGate, inRange);
  };

  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.1);
    if (!root.current) return;
    parts.current ??= collectParts(root.current);

    const c = ctrl.current;
    const { doorL, doorR, dial, bolts, pins, glow } = parts.current;
    const t = c.unlockedAt === null ? -1 : performance.now() / 1000 - c.unlockedAt;

    let glowLevel = inAccessZone ? 2.2 : 0.8;
    let shake = 0;

    if (t >= 0) {
      // Gate unlocking animations
      const b = inOutCubic(seg(t, T.bolts));
      bolts.forEach((bolt) => (bolt.position.x = 1.25 * b));
      if (t > 0.4 && t < 0.7) shake = (0.7 - t) * 0.18;

      const d = seg(t, T.dial);
      dial.rotation.z = -inCubic(d) * Math.PI * 6;
      dial.position.z = -8 * inCubic(seg(t, [0.65, 1.8]));

      glowLevel = 2.0 + 8 * seg(t, T.glow) * (1 - seg(t, [1.3, 2.2]));

      // Pins retract
      pins.forEach(({ obj, dir }) => {
        const amt = outBack(seg(t, [0.1, 0.6]));
        obj.position.set(dir.x * 0.26 * amt, dir.y * 0.26 * amt, 0);
      });

      // Blast doors slide open
      const unseal = 0.08 * Math.sin(Math.PI * seg(t, T.unseal));
      const open = inOutQuart(seg(t, T.doors));
      doorL.position.set(-4.5 * open, 0, unseal);
      doorR.position.set(4.5 * open, 0, unseal);

      if (spill.current) spill.current.intensity = 80 * seg(t, [0.5, 1.5]);
    }

    if (glow) glow.emissiveIntensity = glowLevel;

    // Dynamic 3rd person chase camera logic
    const car = carPosition.current;

    if (t >= 0) {
      // Cinematic camera sequence during unlock & gate passage!
      const flyProgress = inCubic(seg(t, T.cameraFly));
      const desiredCamPos = new Vector3(
        car.x * 0.5,
        -1.2 + flyProgress * 0.4,
        car.z + 3.8 - flyProgress * 12.0, // Swoop through the gate behind the car!
      );
      const desiredLookAt = new Vector3(0, -0.6, -10);

      cameraTarget.current.lerp(desiredCamPos, dt * 6);
      cameraLook.current.lerp(desiredLookAt, dt * 6);
    } else if (isBypassing) {
      // Cinematic hacking angle: low side angle framing car and gate
      const hackCamPos = new Vector3(car.x + 2.2, -1.6, car.z + 2.5);
      const hackLookAt = new Vector3(car.x * 0.5, -1.0, car.z - 2.5);

      cameraTarget.current.lerp(hackCamPos, dt * 5);
      cameraLook.current.lerp(hackLookAt, dt * 5);
    } else {
      // Active 3rd-person arcade chase camera
      const cameraFollowDistance = 3.6 + Math.min(1.2, Math.abs(carSpeed.current) * 0.15);
      const cameraHeight = 1.6;

      const desiredCamPos = new Vector3(
        car.x * 0.7,
        car.y + cameraHeight,
        car.z + cameraFollowDistance,
      );

      const desiredLookAt = new Vector3(
        car.x * 0.4,
        car.y + 0.8,
        car.z - 4.5,
      );

      cameraTarget.current.lerp(desiredCamPos, dt * 7);
      cameraLook.current.lerp(desiredLookAt, dt * 8);
    }

    // Apply camera position with shake effect
    camera.position.copy(cameraTarget.current);
    if (shake > 0) {
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
    }
    camera.lookAt(cameraLook.current);
  });

  return (
    <>
      {/* 3D Mechanical Vault Gate Model */}
      <group ref={root} position={[0, 0, 0]}>
        <primitive object={scene} />
      </group>

      {/* Cyber Hangar Floor & Access Zone */}
      <HangarEnvironment inAccessZone={inAccessZone} />

      {/* Playable RC Car */}
      <RCCar
        inputRef={inputRef}
        onPositionUpdate={handleCarPositionUpdate}
        isBypassing={isBypassing}
        isUnlocked={isUnlocked}
      />

      {/* Dramatic spill light emerging when vault doors part */}
      <pointLight
        ref={spill}
        position={[0, 0, -1.5]}
        color={siteConfig.scene.rimLight}
        intensity={0}
        distance={20}
        decay={1.2}
      />
    </>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.08} />
      {/* High-intensity ceiling spot */}
      <pointLight position={[0, 6, 8]} intensity={110} decay={1.5} color="#ffffff" />
      <directionalLight position={[-8, 5, 8]} intensity={1.4} color="#b0c0d8" />
      <directionalLight position={[8, -1, 6]} intensity={0.9} color={siteConfig.scene.rimLight} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={1.8} position={[0, 8, 8]} rotation-x={Math.PI / 2} scale={[16, 4, 1]} />
        <Lightformer form="rect" intensity={1.0} position={[-8, 2, 6]} rotation-y={Math.PI / 2} scale={[4, 12, 1]} />
        <Lightformer form="rect" intensity={0.6} color={siteConfig.scene.rimLight} position={[8, 0, 6]} rotation-y={-Math.PI / 2} scale={[4, 10, 1]} />
      </Environment>
    </>
  );
}

export default function GateCanvas(props: Props) {
  return (
    <Canvas
      camera={{ position: [0, 0, 16], fov: FOV, near: 0.1, far: 140 }}
      dpr={[1, 1.75]}
      gl={{ antialias: false, powerPreference: "high-performance" }}
    >
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 16, 42]} />
      <Lights />
      <Suspense fallback={null}>
        <SceneContent {...props} />
      </Suspense>
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur luminanceThreshold={1.1} intensity={0.8} radius={0.65} />
        <Noise premultiply blendFunction={BlendFunction.ADD} opacity={0.25} />
        <Vignette offset={0.22} darkness={0.85} />
      </EffectComposer>
    </Canvas>
  );
}

useGLTF.preload(siteConfig.gate.model);

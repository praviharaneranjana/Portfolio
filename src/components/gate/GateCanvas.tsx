"use client";

import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import { Bloom, EffectComposer, N8AO, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import {
  Box3,
  MathUtils,
  Vector3,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
  type PerspectiveCamera,
  type PointLight,
} from "three";
import { siteConfig } from "@/config/site";

/** Shared between IntroGate (input, UI) and the canvas (rendering). Mutated, never re-rendered. */
export type GateControl = {
  /** Accumulated clockwise wheel rotation in radians. */
  angle: number;
  /** performance.now() / 1000 when the lock released, else null. */
  unlockedAt: number | null;
  /** Wheel centre and radius in CSS pixels, written every frame so the UI can track the wheel. */
  dial: { x: number; y: number; r: number };
};

type Props = { controlRef: RefObject<GateControl>; lowDetail: boolean; onReady: () => void };

const BG = siteConfig.scene.background;
const FOV = 32;
const DOOR_TRAVEL = 5.0; // keep in sync with DOOR_TRAVEL in blender/build_gate.py

// Unlock timeline, seconds after release. IntroGate fades the overlay at ~2.9s.
const T = {
  glow: [0, 0.35],
  pins: [0.1, 0.6],
  bolts: [0.35, 1.0],
  unseal: [1.0, 1.4],
  seam: [0.95, 1.6],
  doors: [1.35, 3.0],
  spill: [1.2, 2.6],
  push: [1.9, 3.5],
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
  seam?: Object3D;
  bolts: Object3D[];
  pins: { obj: Object3D; dir: Vector3 }[];
  glow?: MeshStandardMaterial;
};

function collectParts(root: Object3D, shadows: boolean): Parts {
  const get = (name: string) => root.getObjectByName(name) as Object3D;
  const pins: Parts["pins"] = [];
  let glow: MeshStandardMaterial | undefined;

  root.traverse((o) => {
    const mesh = o as Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = shadows && o.name !== "Wall" && o.name !== "Chamber";
      mesh.receiveShadow = shadows;
    }
    const m = (o as { material?: MeshStandardMaterial }).material;
    if (m?.name === "Glow") glow = m;
    if (!/^Pin_\d+$/.test(o.name)) return;
    const c = new Box3().setFromObject(o).getCenter(new Vector3());
    pins.push({ obj: o, dir: new Vector3(c.x, c.y, 0).normalize() });
  });

  return {
    doorL: get("DoorL"),
    doorR: get("DoorR"),
    dial: get("Dial"),
    seam: root.getObjectByName("SeamGlow"),
    bolts: [get("Bolt_0"), get("Bolt_1")].filter(Boolean),
    pins,
    glow,
  };
}

/** Camera distance that fits the gate (or just the wheel on portrait screens) into the viewport. */
function fitDistance(aspect: number) {
  const tan = Math.tan(MathUtils.degToRad(FOV / 2));
  const [w, h] = aspect < 1 ? [5.2, 5.2] : [13.2, 8.4];
  return Math.max(h / 2 / tan, w / 2 / (tan * aspect));
}

function Vault({ controlRef, lowDetail, onReady }: Props) {
  const { scene } = useGLTF(siteConfig.gate.model);
  const size = useThree((s) => s.size);
  const partsRef = useRef<Parts | null>(null);
  const spill = useRef<PointLight>(null);
  const shown = useRef(0); // wheel angle actually drawn (eased toward ctrl.angle)
  const tmp = useMemo(() => new Vector3(), []);
  const baseZ = fitDistance(size.width / size.height) + 1.1;

  useEffect(onReady, [onReady]);

  useFrame((state, delta) => {
    const c = controlRef.current;
    const cam = state.camera as PerspectiveCamera;
    partsRef.current ??= collectParts(scene, !lowDetail);
    const { doorL, doorR, dial, seam, bolts, pins, glow } = partsRef.current;
    const t = c.unlockedAt === null ? -1 : performance.now() / 1000 - c.unlockedAt;
    const turns = Math.PI * 2 * siteConfig.gate.turns;

    // Heavy wheel: the drawn angle chases the input with a little lag.
    shown.current += (c.angle - shown.current) * Math.min(1, delta * 14);
    dial.rotation.z = -shown.current;

    const progress = Math.min(c.angle / turns, 1);
    if (glow) glow.emissiveIntensity = 0.5 + progress * 1.3 + (t >= 0 ? 2.2 * seg(t, T.glow) : 0);

    if (t >= 0) {
      const pinAmt = outBack(seg(t, T.pins));
      pins.forEach(({ obj, dir }) => obj.position.set(dir.x * 0.28 * pinAmt, dir.y * 0.28 * pinAmt, 0));
      const bolt = inOutCubic(seg(t, T.bolts));
      bolts.forEach((b) => (b.position.x = 1.35 * bolt));

      const unseal = 0.035 * Math.sin(Math.PI * seg(t, T.unseal));
      const open = inOutQuart(seg(t, T.doors));
      doorL.position.set(-DOOR_TRAVEL * open, 0, unseal);
      doorR.position.set(DOOR_TRAVEL * open, 0, unseal);
      dial.position.set(doorR.position.x, 0, unseal);
      if (seam) seam.visible = open < 0.01;
      if (glow) glow.emissiveIntensity += 4 * Math.sin(Math.PI * seg(t, T.seam));
      if (spill.current) spill.current.intensity = 60 * seg(t, T.spill);
    }

    // Camera: slow parallax to the pointer, then a push through the doorway once it opens.
    const push = t >= 0 ? inCubic(seg(t, T.push)) : 0;
    const targetX = state.pointer.x * 0.5 * (1 - push);
    const targetY = state.pointer.y * 0.3 * (1 - push);
    cam.position.x += (targetX - cam.position.x) * Math.min(1, delta * 3);
    cam.position.y += (targetY - cam.position.y) * Math.min(1, delta * 3);
    cam.position.z = MathUtils.lerp(baseZ, -3, push);
    cam.lookAt(cam.position.x * 0.3, cam.position.y * 0.3, -4);

    // Publish the wheel's screen position for the UI ring and drag maths.
    dial.getWorldPosition(tmp).setZ(0.5).project(cam);
    const x = (tmp.x * 0.5 + 0.5) * size.width;
    const y = (-tmp.y * 0.5 + 0.5) * size.height;
    tmp.set(dial.position.x + 0.9, 0, 0.5).project(cam);
    c.dial.x = x;
    c.dial.y = y;
    c.dial.r = Math.abs((tmp.x * 0.5 + 0.5) * size.width - x);
  });

  return (
    <>
      <primitive object={scene} />
      {/* Warm light inside the vault, revealed as the doors part. */}
      <pointLight ref={spill} position={[0, 0.4, -4]} color="#ffb59e" intensity={0} distance={18} decay={1.6} />
    </>
  );
}

function Lighting({ shadows }: { shadows: boolean }) {
  return (
    <>
      <ambientLight intensity={0.06} />
      <spotLight
        position={[-5, 8, 13]}
        angle={0.55}
        penumbra={0.9}
        intensity={420}
        decay={2}
        color="#f4f1ec"
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[9, 0.5, 8]} intensity={0.55} color="#dbe4f0" />
      <directionalLight position={[-10, -2, 3]} intensity={0.35} color={siteConfig.scene.rimLight} />
      {/* Softboxes for reflections: this is what makes the metal read as metal. */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[-2, 6, 8]} rotation-x={-Math.PI / 3} scale={[14, 4, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[-10, 0, 4]} rotation-y={Math.PI / 2.5} scale={[4, 12, 1]} />
        <Lightformer form="rect" intensity={0.5} position={[10, 1, 5]} rotation-y={-Math.PI / 2.5} scale={[3, 10, 1]} />
        <Lightformer
          form="rect"
          intensity={0.25}
          color={siteConfig.scene.rimLight}
          position={[0, -6, 6]}
          rotation-x={Math.PI / 3}
          scale={[12, 2, 1]}
        />
      </Environment>
    </>
  );
}

export default function GateCanvas({ controlRef, lowDetail, onReady }: Props) {
  return (
    <Canvas
      shadows={lowDetail ? false : "percentage"}
      camera={{ position: [0, 0, 16], fov: FOV, near: 0.1, far: 80 }}
      dpr={[1, lowDetail ? 1.5 : 1.75]}
      gl={{ antialias: false, powerPreference: "high-performance" }}
    >
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 18, 34]} />
      <Lighting shadows={!lowDetail} />
      <Suspense fallback={null}>
        <Vault controlRef={controlRef} lowDetail={lowDetail} onReady={onReady} />
      </Suspense>
      <EffectComposer multisampling={4}>
        <>{!lowDetail && <N8AO halfRes aoRadius={0.6} distanceFalloff={0.8} intensity={2.2} color="#000000" />}</>
        <Bloom mipmapBlur luminanceThreshold={1} intensity={0.5} radius={0.6} />
        <Noise premultiply blendFunction={BlendFunction.ADD} opacity={0.3} />
        <Vignette offset={0.25} darkness={0.8} />
      </EffectComposer>
    </Canvas>
  );
}

useGLTF.preload(siteConfig.gate.model);

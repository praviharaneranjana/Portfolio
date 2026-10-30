"use client";

import { Suspense, useEffect, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Box3, MathUtils, Vector3, type Group, type MeshStandardMaterial, type Object3D, type PointLight } from "three";
import { siteConfig } from "@/config/site";

/** Shared, mutable state written by the DOM overlay (input) and read every frame here. */
export type GateControl = {
  /** 0..1 — how far the wheel has been turned. */
  progress: number;
  /** performance.now() / 1000 when the unlock sequence started, or null while locked. */
  unlockedAt: number | null;
};

type Props = {
  ctrl: RefObject<GateControl>;
  onReady: () => void;
  /** Screen-space radius (px) of the lock ring, so the DOM progress ring can sit on top of it. */
  onDialRadius: (px: number) => void;
};

const FOV = 35;
const BG = siteConfig.scene.background;

// Unlock timeline, in seconds after the wheel completes its turn.
const T = {
  bolts: [0, 0.55],
  glow: [0.15, 0.6],
  unseal: [0.45, 0.7],
  doors: [0.7, 2.1],
  dial: [0.5, 1.9],
  camera: [1.0, 2.7],
} as const;

const seg = (t: number, [a, b]: readonly [number, number]) => MathUtils.clamp((t - a) / (b - a), 0, 1);
const inOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const inOutQuart = (x: number) => (x < 0.5 ? 8 * x ** 4 : 1 - (-2 * x + 2) ** 4 / 2);
const inCubic = (x: number) => x * x * x;
const outBack = (x: number) => 1 + 2.7 * (x - 1) ** 3 + 1.7 * (x - 1) ** 2;

/** Camera distance that frames the vault on any aspect ratio. */
function fitDistance(aspect: number) {
  const t = Math.tan(MathUtils.degToRad(FOV / 2));
  return Math.max(4.3 / t, (aspect < 1 ? 4.6 : 6.4) / (t * aspect));
}

type Parts = {
  doorL: Object3D;
  doorR: Object3D;
  dial: Object3D;
  bolts: Object3D[];
  pins: { obj: Object3D; dir: Vector3 }[];
  glow?: MeshStandardMaterial;
};

/** Finds the named nodes exported by blender/build_gate.py. */
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
    // Retract in clockwise order starting from 12 o'clock, following the wheel.
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

function Vault({ ctrl, onReady, onDialRadius }: Props) {
  const { scene } = useGLTF(siteConfig.gate.model);
  const size = useThree((s) => s.size);
  const root = useRef<Group>(null);
  const parts = useRef<Parts | null>(null);
  const spill = useRef<PointLight>(null);
  const shown = useRef(0);
  const baseZ = useRef(16);

  useEffect(onReady, [onReady]);

  // Frame the vault and report the ring's on-screen size whenever the viewport changes.
  useEffect(() => {
    const dist = fitDistance(size.width / size.height);
    baseZ.current = dist;
    const visibleHalfH = dist * Math.tan(MathUtils.degToRad(FOV / 2));
    onDialRadius((1.48 / visibleHalfH) * (size.height / 2));
  }, [size, onDialRadius]);

  useFrame(({ pointer, camera }, dt) => {
    if (!root.current) return;
    parts.current ??= collectParts(root.current);
    const c = ctrl.current;
    const { doorL, doorR, dial, bolts, pins, glow } = parts.current;
    shown.current += (c.progress - shown.current) * Math.min(1, dt * 14);
    const p = shown.current;
    const t = c.unlockedAt === null ? -1 : performance.now() / 1000 - c.unlockedAt;

    // Wheel follows the visitor's drag (clockwise = negative Z in three.js).
    let spin = -p * siteConfig.gate.turns * Math.PI * 2;

    // Each pin pulls out as the wheel passes it.
    pins.forEach(({ obj, dir }, i) => {
      const amt = outBack(MathUtils.clamp(p * pins.length - i, 0, 1));
      obj.position.set(dir.x * 0.22 * amt, dir.y * 0.22 * amt, 0);
    });

    let glowLevel = 0.6 + p * 1.2;
    let camZ = baseZ.current;
    let shake = 0;

    if (t >= 0) {
      const b = inOutCubic(seg(t, T.bolts));
      bolts.forEach((bolt) => (bolt.position.x = 1.25 * b));
      if (t > 0.5 && t < 0.75) shake = (0.75 - t) * 0.12;

      const d = seg(t, T.dial);
      spin -= inCubic(d) * Math.PI * 5;
      dial.position.z = -8 * inCubic(seg(t, [0.75, 1.9]));

      glowLevel = 1.8 + 7 * seg(t, T.glow) * (1 - seg(t, [1.3, 2.2]));

      const unseal = 0.08 * Math.sin(Math.PI * seg(t, T.unseal));
      const open = inOutQuart(seg(t, T.doors));
      doorL.position.set(-4.4 * open, 0, unseal);
      doorR.position.set(4.4 * open, 0, unseal);

      camZ = baseZ.current - (baseZ.current + 1.5) * inCubic(seg(t, T.camera));
      if (spill.current) spill.current.intensity = 60 * seg(t, [0.6, 1.4]);
    }

    dial.rotation.z = spin;
    if (glow) glow.emissiveIntensity = glowLevel;

    // Gentle parallax while locked; fades out as the camera flies through.
    const parallax = t < 0 ? 1 : 1 - seg(t, [0.8, 1.6]);
    camera.position.x += (pointer.x * 0.6 * parallax - camera.position.x) * 0.05 + (Math.random() - 0.5) * shake;
    camera.position.y += (pointer.y * 0.35 * parallax - camera.position.y) * 0.05 + (Math.random() - 0.5) * shake;
    camera.position.z = camZ;
    camera.lookAt(0, 0, camZ - 30);
  });

  return (
    <>
      <group ref={root}>
        <primitive object={scene} />
      </group>
      {/* Coral light from inside the vault, spilling through as the doors part. */}
      <pointLight ref={spill} position={[0, 0, -1.2]} color={siteConfig.scene.rimLight} intensity={0} distance={14} decay={1.4} />
    </>
  );
}

function Lights() {
  const key = useRef<PointLight>(null);
  useFrame(({ pointer }) => {
    if (!key.current) return;
    key.current.position.x += (pointer.x * 8 - key.current.position.x) * 0.05;
    key.current.position.y += (4 + pointer.y * 4 - key.current.position.y) * 0.05;
  });
  return (
    <>
      <ambientLight intensity={0.06} />
      <pointLight ref={key} position={[0, 4, 9]} intensity={90} decay={1.6} color={siteConfig.scene.keyLight} />
      <directionalLight position={[-8, 3, 6]} intensity={1.2} color="#dfe3ea" />
      <directionalLight position={[8, -2, 4]} intensity={0.6} color={siteConfig.scene.rimLight} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={1.4} position={[0, 6, 6]} rotation-x={Math.PI / 2} scale={[14, 3, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[-8, 1, 4]} rotation-y={Math.PI / 2} scale={[3, 10, 1]} />
        <Lightformer form="rect" intensity={0.3} color={siteConfig.scene.rimLight} position={[8, 0, 4]} rotation-y={-Math.PI / 2} scale={[3, 8, 1]} />
      </Environment>
    </>
  );
}

export default function GateCanvas(props: Props) {
  return (
    <Canvas
      camera={{ position: [0, 0, 16], fov: FOV, near: 0.1, far: 120 }}
      dpr={[1, 1.75]}
      gl={{ antialias: false, powerPreference: "high-performance" }}
    >
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 18, 46]} />
      <Lights />
      <Suspense fallback={null}>
        <Vault {...props} />
      </Suspense>
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur luminanceThreshold={1} intensity={0.9} radius={0.7} />
        <Noise premultiply blendFunction={BlendFunction.ADD} opacity={0.3} />
        <Vignette offset={0.25} darkness={0.8} />
      </EffectComposer>
    </Canvas>
  );
}

useGLTF.preload(siteConfig.gate.model);

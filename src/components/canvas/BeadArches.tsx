"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { siteConfig } from "@/config/site";
import { intro, secondsSinceOpen } from "@/lib/gate";

// Three ribbed arches, each a tube of bead rings — modelled on a sculptural studio render.
const ARCHES = [
  { x: -3.05, z: -0.5, scale: 0.94, tilt: 0.045, phase: 0.0 },
  { x: 0, z: 0.1, scale: 1.04, tilt: 0, phase: 1.4 },
  { x: 3.05, z: -0.5, scale: 0.94, tilt: -0.045, phase: 2.8 },
];

const ARCH_PATH = [
  [-0.98, -4.6],
  [-1.05, -2.2],
  [-0.98, -0.3],
  [-0.72, 0.85],
  [0, 1.32],
  [0.72, 0.85],
  [0.98, -0.3],
  [1.05, -2.2],
  [0.98, -4.6],
].map(([x, y]) => new THREE.Vector3(x, y, 0));

const RING_RADIUS = 0.48;
const BEAD_RADIUS = 0.112;
const RIPPLE = 0.035;
/** How far below its resting place each pillar starts its entrance. */
const RISE_FROM = -7.5;

const outQuart = (x: number) => 1 - Math.pow(1 - x, 4);

type Instance = { cx: number; cy: number; cz: number; dx: number; dy: number; dz: number; s: number; arch: number; scale: number };

function buildInstances(rings: number, beads: number) {
  const curve = new THREE.CatmullRomCurve3(ARCH_PATH, false, "centripetal");
  const frames = curve.computeFrenetFrames(rings, false);
  const out: Instance[] = [];
  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const d = new THREE.Vector3();

  ARCHES.forEach((arch, a) => {
    m.compose(
      new THREE.Vector3(arch.x, 0, arch.z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, arch.tilt)),
      new THREE.Vector3(arch.scale, arch.scale, arch.scale),
    );
    const rot = new THREE.Matrix4().extractRotation(m);
    for (let r = 0; r <= rings; r++) {
      const t = r / rings;
      curve.getPointAt(t, p).applyMatrix4(m);
      // Alternate rings are offset half a bead, so they nest like kernels on a cob.
      const offset = (r % 2) * (Math.PI / beads);
      for (let b = 0; b < beads; b++) {
        const angle = (b / beads) * Math.PI * 2 + offset;
        d.copy(frames.normals[r]).multiplyScalar(Math.cos(angle));
        d.addScaledVector(frames.binormals[r], Math.sin(angle)).normalize().applyMatrix4(rot);
        out.push({ cx: p.x, cy: p.y, cz: p.z, dx: d.x, dy: d.y, dz: d.z, s: t, arch: a, scale: arch.scale });
      }
    }
  });
  return { curve, instances: out };
}

export function BeadArches({ reducedMotion, lowDetail }: { reducedMotion: boolean; lowDetail: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);
  const cores = useRef<(THREE.Mesh | null)[]>([]);
  const lift = useRef<number[]>(ARCHES.map(() => (reducedMotion ? 0 : RISE_FROM)));
  const { curve, instances } = useMemo(() => buildInstances(lowDetail ? 60 : 84, lowDetail ? 12 : 15), [lowDetail]);
  const { material: mat } = siteConfig.scene;
  const ripple = siteConfig.scene.ripple && !reducedMotion;

  const writeMatrices = (time: number) => {
    const arr = mesh.current!.instanceMatrix.array as Float32Array;
    const dy = lift.current;
    for (let i = 0; i < instances.length; i++) {
      const it = instances[i];
      const wave = ripple ? Math.sin(time * 1.4 - it.s * 14 + ARCHES[it.arch].phase) * RIPPLE : 0;
      const r = (RING_RADIUS + wave) * it.scale;
      const s = BEAD_RADIUS * it.scale;
      const o = i * 16;
      arr[o] = s; arr[o + 5] = s; arr[o + 10] = s; arr[o + 15] = 1;
      arr[o + 12] = it.cx + it.dx * r;
      arr[o + 13] = it.cy + it.dy * r + dy[it.arch];
      arr[o + 14] = it.cz + it.dz * r;
    }
    mesh.current!.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    writeMatrices(0);
    mesh.current!.computeBoundingSphere();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instances]);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;

    // Entrance: once the gate opens, the pillars rise one after another (left, centre, right).
    const since = secondsSinceOpen();
    let entering = false;
    ARCHES.forEach((_, a) => {
      const k = since === null ? 0 : reducedMotion ? 1 : (since - a * intro.pillarStagger) / intro.pillarRise;
      const y = RISE_FROM * (1 - outQuart(THREE.MathUtils.clamp(k, 0, 1)));
      if (y !== lift.current[a]) entering = true;
      lift.current[a] = y;
      const core = cores.current[a];
      if (core) core.position.y = y;
    });

    const scroll = Math.min(window.scrollY / window.innerHeight, 1.5);
    const breathe = reducedMotion ? 0 : Math.sin(t * 0.7) * 0.05;
    g.position.y = breathe - scroll * 1.1;
    g.rotation.y += (state.pointer.x * 0.22 + scroll * 0.35 - g.rotation.y) * 0.05;
    g.rotation.x += (-state.pointer.y * 0.06 - g.rotation.x) * 0.05;

    if (ripple || entering) writeMatrices(t);
  });

  const segments = lowDetail ? [10, 8] : [14, 10];

  return (
    <group ref={group}>
      <instancedMesh ref={mesh} args={[undefined, undefined, instances.length]} frustumCulled={false}>
        <sphereGeometry args={[1, segments[0], segments[1]]} />
        <meshPhysicalMaterial
          color={mat.color}
          roughness={mat.roughness}
          metalness={mat.metalness}
          clearcoat={mat.clearcoat}
          clearcoatRoughness={0.25}
        />
      </instancedMesh>
      {/* Dark cores stop light leaking between the beads. */}
      {ARCHES.map((arch, a) => (
        <mesh
          key={arch.x}
          ref={(m) => {
            cores.current[a] = m;
          }}
          position={[arch.x, reducedMotion ? 0 : RISE_FROM, arch.z]}
          rotation={[0, 0, arch.tilt]}
          scale={arch.scale}
        >
          <tubeGeometry args={[curve, 96, RING_RADIUS * 0.9, 12, false]} />
          <meshStandardMaterial color="#050506" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

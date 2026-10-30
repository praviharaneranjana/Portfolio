"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { siteConfig } from "@/config/site";
import { intro, secondsSinceOpen } from "@/lib/gate";
import { Studio } from "@/components/canvas/Studio";
import { step, updateDrain, type Ball, type Floor, type View } from "./physics";

// A fixed, transparent, full-viewport canvas. The orthographic camera maps 1 unit to 1 CSS pixel, so the
// physics (document pixels) converts to the scene with a simple offset.

type HoldFloor = Floor & { hold?: boolean };

/**
 * Top of each hero pillar's crown, as fractions of the hero canvas height from its centre-x / top edge.
 * Measured from a render; re-measure if you change ARCHES, the camera in HeroCanvas, or the canvas height in Hero.
 */
const PILLAR_CROWNS = [
  { x: -0.475, y: 0.243 },
  { x: 0, y: 0.179 },
  { x: 0.475, y: 0.243 },
];
/** BeadArches sinks 1.1 world units per viewport scrolled; at the crowns that is ~0.16 of the canvas height. */
const PILLAR_SINK = 0.16;

function measureFloors(view: View) {
  const floors: HoldFloor[] = [];
  document.querySelectorAll<HTMLElement>("[data-ball-floor]").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 24 || r.height === 0) return;
    floors.push({ x0: r.left, x1: r.right, y: r.top + view.top, drain: false });
  });
  const pillars = document.querySelector<HTMLElement>("[data-ball-pillars]")?.getBoundingClientRect();
  return { floors, pillars: pillars ? { cx: pillars.left + pillars.width / 2, top: pillars.top + view.top, h: pillars.height } : null };
}

function pillarFloors(p: { cx: number; top: number; h: number }, view: View): HoldFloor[] {
  const sink = Math.min(view.top / view.height, 1.5) * PILLAR_SINK * p.h;
  return PILLAR_CROWNS.map((c) => {
    const x = p.cx + c.x * p.h;
    return { x0: x - 0.04 * p.h, x1: x + 0.04 * p.h, y: p.top + c.y * p.h + sink, drain: false, hold: view.top < 24 };
  });
}

/** Points spread evenly over a unit sphere (golden-angle spiral). */
function fibonacciSphere(n: number) {
  const out: THREE.Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    out.push(new THREE.Vector3(Math.cos(golden * i) * rad, y, Math.sin(golden * i) * rad));
  }
  return out;
}

/** One beaded ball, built at unit radius; the parent scales it to pixels. Same material as the hero pillars. */
function BeadBall({ beads, seed }: { beads: number; seed: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const points = useMemo(() => fibonacciSphere(beads), [beads]);
  const { material: mat } = siteConfig.scene;

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    // Deterministic jitter so the beads read as hand-set rather than machine-perfect.
    let r = seed * 9301 + 49297;
    const rand = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
    points.forEach((p, i) => {
      const size = 0.17 * (0.9 + rand() * 0.2);
      m.compose(p.clone().multiplyScalar(0.84 + rand() * 0.04), q, s.setScalar(size));
      mesh.current!.setMatrixAt(i, m);
    });
    mesh.current!.instanceMatrix.needsUpdate = true;
  }, [points, seed]);

  return (
    <>
      <instancedMesh ref={mesh} args={[undefined, undefined, beads]}>
        <sphereGeometry args={[1, 12, 9]} />
        <meshPhysicalMaterial
          color={mat.color}
          roughness={mat.roughness}
          metalness={mat.metalness}
          clearcoat={mat.clearcoat}
          clearcoatRoughness={0.25}
        />
      </instancedMesh>
      {/* Dark core, like the pillars, so no light shows between beads. */}
      <mesh>
        <sphereGeometry args={[0.8, 24, 16]} />
        <meshStandardMaterial color="#050506" roughness={0.9} />
      </mesh>
    </>
  );
}

function Balls({ radius, beads }: { radius: number; beads: number }) {
  const invalidate = useThree((s) => s.invalidate);
  const outer = useRef<(THREE.Group | null)[]>([]);
  const inner = useRef<(THREE.Group | null)[]>([]);
  const count = siteConfig.balls.count;

  useEffect(() => {
    const balls: Ball[] = [];
    const pop: number[] = []; // 0..1 entrance scale per ball
    let floors: HoldFloor[] = [];
    let pillars: ReturnType<typeof measureFloors>["pillars"] = null;
    let lastMeasure = -Infinity;
    let lastTop = NaN;
    let prev = performance.now();
    let raf = 0;

    const spawn = (view: View) => {
      const crowns = pillars ? pillarFloors(pillars, view) : [];
      for (let i = 0; i < count; i++) {
        const c = crowns[i % Math.max(crowns.length, 1)];
        const onScreen = c && c.x0 > radius && c.x1 < view.width - radius;
        const x = onScreen ? (c.x0 + c.x1) / 2 : view.width * (0.3 + 0.2 * i);
        const y = onScreen ? c.y - radius : view.top + radius;
        balls.push({ x, y, vx: 0, vy: 0, r: radius, angle: i, spin: 0, squash: 0, squashV: 0, grounded: false });
        pop.push(0);
      }
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((now - prev) / 1000, 1 / 20);
      prev = now;
      const since = secondsSinceOpen();
      if (since === null || since < intro.balls) return;

      const view: View = { top: window.scrollY, width: document.documentElement.clientWidth, height: window.innerHeight };
      if (now - lastMeasure > 400) {
        ({ floors, pillars } = measureFloors(view));
        lastMeasure = now;
      }
      if (!balls.length) spawn(view);

      const all = pillars ? [...pillarFloors(pillars, view), ...floors] : floors;
      updateDrain(all, view);
      let moved = step(balls, all, view, dt);

      balls.forEach((b, i) => {
        const o = outer.current[i];
        const n = inner.current[i];
        if (!o || !n) return;
        // Pop in with a little overshoot, staggered per ball.
        const k = Math.min(Math.max((since - intro.balls - i * 0.15) / 0.6, 0), 1);
        const p = k === 1 ? 1 : 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2;
        if (p !== pop[i]) moved = true;
        pop[i] = p;
        const sx = b.r * p * (1 + b.squash * 0.5);
        const sy = b.r * p * (1 - b.squash);
        o.visible = p > 0.001;
        o.position.set(b.x - view.width / 2, view.height / 2 - (b.y - view.top) - b.r * b.squash, 0);
        o.scale.set(sx, sy, sx);
        n.rotation.z = -b.angle;
      });

      if (moved || view.top !== lastTop) invalidate();
      lastTop = view.top;
    };

    const remeasure = () => (lastMeasure = -Infinity);
    window.addEventListener("resize", remeasure);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", remeasure);
    };
  }, [count, radius, invalidate]);

  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <group
          key={i}
          visible={false}
          ref={(g) => {
            outer.current[i] = g;
          }}
        >
          {/* Fixed tilt so the bead pattern reads as a sphere, then the roll. */}
          <group rotation={[0.5, 0.3, 0]}>
            <group
              ref={(g) => {
                inner.current[i] = g;
              }}
            >
              <BeadBall beads={beads} seed={i + 1} />
            </group>
          </group>
        </group>
      ))}
    </>
  );
}

export default function BallField() {
  const [radius, beads] = useMemo(() => {
    const small = window.innerWidth < 768;
    const { radius } = siteConfig.balls;
    return [small ? radius.mobile : radius.desktop, small ? 90 : 140];
  }, []);

  return (
    <Canvas
      orthographic
      frameloop="demand"
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 500], zoom: 1, near: 1, far: 2000 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      style={{ pointerEvents: "none" }}
    >
      <Studio />
      <Balls radius={radius} beads={beads} />
    </Canvas>
  );
}

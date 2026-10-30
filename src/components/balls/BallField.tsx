"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { siteConfig } from "@/config/site";
import { intro, secondsSinceOpen } from "@/lib/gate";
import { Studio } from "@/components/canvas/Studio";
import { PHYS, step, updateDrain, type Ball, type Floor, type View } from "./physics";

// A fixed, transparent, full-viewport canvas. The orthographic camera maps 1 unit to 1 CSS pixel, so the
// physics (document pixels) converts to the scene with a simple offset.

type HoldFloor = Floor & { hold?: boolean };

/**
 * What a ball is doing on top of the physics:
 * - `sim`: physics (rolling, landing on ledges)
 * - `charge` → `dash`: clicked; it swells, glows between the beads, then shoots to another ledge
 * - `leave` → `away`: the reader scrolled up; it hops off the side of the screen and waits
 * - `enter`: the reader scrolled down again; it drops back in from the top after a short stagger
 */
type Mode = "sim" | "charge" | "dash" | "leave" | "away" | "enter";
type Fx = {
  mode: Mode;
  t: number;
  /** Entrance pop (0..1), swell, bead spread, core glow, and stretch along the dash. */
  pop: number;
  grow: number;
  spread: number;
  glow: number;
  stretch: number;
  /** Dash path (document px) and direction in scene space; screen-space y while leaving. */
  from: { x: number; y: number };
  to: { x: number; y: number };
  dir: number;
};

/** Handle on one BeadBall so the loop can spread its beads and light its core without re-rendering. */
type BallLook = { setSpread: (s: number) => void; setGlow: (g: number) => void };

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

/** Click → swell for CHARGE seconds → dash for DASH seconds. */
const CHARGE = 0.65;
const DASH = 0.42;
/** Scrolling up this far sends the balls off screen; scrolling down this far brings them back. */
const LEAVE_AFTER = 60;
const RETURN_AFTER = 30;

const outQuart = (x: number) => 1 - Math.pow(1 - x, 4);
const outCubic = (x: number) => 1 - Math.pow(1 - x, 3);

function measureFloors(view: View, r: number) {
  const floors: HoldFloor[] = [];
  // Keep a gap of a ball and a bit between every ledge and the screen edge, so balls can always roll off
  // (on phones most cards span the full width, which would otherwise trap them).
  const min = r * 2.2;
  const max = view.width - r * 2.2;
  document.querySelectorAll<HTMLElement>("[data-ball-floor]").forEach((el) => {
    const rect = el.getBoundingClientRect();
    const x0 = Math.max(rect.left, min);
    const x1 = Math.min(rect.right, max);
    if (x1 - x0 < Math.max(24, r * 2) || rect.height === 0) return;
    floors.push({ x0, x1, y: rect.top + view.top, drain: false });
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

/** A random ledge in the lower, settled part of the screen, away from the ball. Falls back to the screen bottom. */
function pickTarget(b: Ball, floors: HoldFloor[], view: View) {
  const settled = floors.filter((f) => {
    const y = f.y - view.top;
    const onScreen = f.x1 > b.r && f.x0 < view.width - b.r;
    const inBand = f.hold || (y > view.height * (PHYS.drainLine + 0.06) && y < view.height - b.r * 3);
    return onScreen && inBand && y > b.r * 3;
  });
  const spots = settled.map((f) => {
    const x0 = Math.max(f.x0, b.r);
    const x1 = Math.min(f.x1, view.width - b.r);
    return { x: x0 + Math.random() * (x1 - x0), y: f.y - b.r };
  });
  const far = spots.filter((s) => Math.hypot(s.x - b.x, s.y - b.y) > view.width * 0.2);
  const pool = far.length ? far : spots;
  if (pool.length) return pool[Math.floor(Math.random() * pool.length)];
  // No ledge on screen: the far side of the viewport bottom.
  const side = b.x < view.width / 2 ? 1 : -1;
  const x = view.width / 2 + side * (0.15 + Math.random() * 0.3) * view.width;
  return { x, y: view.top + view.height - PHYS.screenMargin - b.r };
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

/**
 * One beaded ball, built at unit radius; the parent scales it to pixels. A tuned-down pillar material (see
 * `siteConfig.balls.material`). The dark core can glow coral, and the beads can spread apart to show it.
 */
function BeadBall({
  beads,
  seed,
  radius,
  lookRef,
}: {
  beads: number;
  seed: number;
  radius: number;
  lookRef: (look: BallLook) => void;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const core = useRef<THREE.Mesh>(null);
  const coreMat = useRef<THREE.MeshStandardMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const points = useMemo(() => fibonacciSphere(beads), [beads]);
  const mat = siteConfig.balls.material;

  useLayoutEffect(() => {
    // Deterministic jitter so the beads read as hand-set rather than machine-perfect.
    let r = seed * 9301 + 49297;
    const rand = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
    const base = points.map((p) => ({ dir: p, dist: 0.84 + rand() * 0.04, size: 0.17 * (0.9 + rand() * 0.2) }));
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const v = new THREE.Vector3();
    let last = -1;

    const setSpread = (k: number) => {
      if (Math.abs(k - last) < 0.002) return;
      last = k;
      base.forEach((b, i) => {
        m.compose(v.copy(b.dir).multiplyScalar(b.dist * (1 + 0.16 * k)), q, s.setScalar(b.size * (1 - 0.3 * k)));
        mesh.current!.setMatrixAt(i, m);
      });
      mesh.current!.instanceMatrix.needsUpdate = true;
      core.current!.scale.setScalar(1 + 0.1 * k);
    };
    const setGlow = (g: number) => {
      coreMat.current!.emissiveIntensity = g * 2.4;
      light.current!.intensity = g * 6;
    };
    setSpread(0);
    setGlow(0);
    lookRef({ setSpread, setGlow });
  }, [points, seed, lookRef]);

  return (
    <>
      <instancedMesh ref={mesh} args={[undefined, undefined, beads]}>
        <sphereGeometry args={[1, 12, 9]} />
        <meshPhysicalMaterial
          color={mat.color}
          roughness={mat.roughness}
          metalness={mat.metalness}
          clearcoat={mat.clearcoat}
          clearcoatRoughness={0.3}
          envMapIntensity={mat.envMapIntensity}
        />
      </instancedMesh>
      {/* Dark core, like the pillars, so no light shows between beads — until the ball charges up. */}
      <mesh ref={core}>
        <sphereGeometry args={[0.8, 24, 16]} />
        <meshStandardMaterial ref={coreMat} color="#050506" roughness={0.9} emissive={siteConfig.scene.rimLight} />
      </mesh>
      {/* Lights the inner faces of the beads while charging. Always mounted so shaders don't recompile. */}
      <pointLight ref={light} color={siteConfig.scene.rimLight} decay={0} distance={radius * 2.2} />
    </>
  );
}

function Balls({ radius, beads }: { radius: number; beads: number }) {
  const invalidate = useThree((s) => s.invalidate);
  const outer = useRef<(THREE.Group | null)[]>([]);
  const inner = useRef<(THREE.Group | null)[]>([]);
  const stretchers = useRef<(THREE.Group | null)[]>([]);
  const looks = useRef<(BallLook | null)[]>([]);
  const count = siteConfig.balls.count;
  // Stable per-index callbacks, so BeadBall's layout effect doesn't re-run on every render.
  const lookSetters = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => (look: BallLook) => {
        looks.current[i] = look;
      }),
    [count],
  );

  useEffect(() => {
    const balls: Ball[] = [];
    const fx: Fx[] = [];
    let floors: HoldFloor[] = [];
    let pillars: ReturnType<typeof measureFloors>["pillars"] = null;
    let all: HoldFloor[] = [];
    let lastMeasure = -Infinity;
    let lastTop = NaN;
    let upTravel = 0;
    let downTravel = 0;
    let swallowClick = false;
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
        fx.push({ mode: "sim", t: 0, pop: 0, grow: 1, spread: 0, glow: 0, stretch: 1, from: { x, y }, to: { x, y }, dir: 0 });
      }
    };

    const leave = (b: Ball, f: Fx, view: View) => {
      // Hop off the nearer side of the screen. Tracked in screen space, so scrolling doesn't drag it around.
      const side = b.x < view.width / 2 ? -1 : 1;
      f.mode = "leave";
      f.from = { x: side * (900 + Math.random() * 300), y: -380 - Math.random() * 120 };
      f.to.y = b.y - view.top;
      f.glow = f.spread = 0;
      f.stretch = f.grow = 1;
    };

    const enter = (i: number, view: View) => {
      const f = fx[i];
      const b = balls[i];
      f.mode = "enter";
      f.t = -i * 0.14;
      // Back at the top of the page: drop onto the pillar crowns. Otherwise spread across the screen.
      const c = view.top < 24 && pillars ? pillarFloors(pillars, view)[i % PILLAR_CROWNS.length] : null;
      const onScreen = c && c.x0 > radius && c.x1 < view.width - radius;
      b.x = onScreen ? (c.x0 + c.x1) / 2 : view.width * (0.25 + 0.5 * (i / Math.max(count - 1, 1))) + (Math.random() - 0.5) * 40;
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((now - prev) / 1000, 1 / 20);
      prev = now;
      const since = secondsSinceOpen();
      if (since === null || since < intro.balls) return;

      const view: View = { top: window.scrollY, width: document.documentElement.clientWidth, height: window.innerHeight };
      if (now - lastMeasure > 400) {
        ({ floors, pillars } = measureFloors(view, radius));
        lastMeasure = now;
      }
      if (!balls.length) spawn(view);

      // Scroll direction: up sends the balls away, down brings them back.
      const scrolled = Number.isNaN(lastTop) ? 0 : view.top - lastTop;
      if (scrolled < 0) {
        upTravel -= scrolled;
        downTravel = 0;
      } else if (scrolled > 0) {
        downTravel += scrolled;
        upTravel = 0;
      }
      if (upTravel > LEAVE_AFTER && view.top > 24) {
        balls.forEach((b, i) => {
          if (fx[i].mode === "sim" || fx[i].mode === "charge") leave(b, fx[i], view);
          else if (fx[i].mode === "enter") fx[i].mode = "away";
        });
      }
      if (downTravel > RETURN_AFTER || view.top < 24) {
        fx.forEach((f, i) => f.mode === "away" && enter(i, view));
      }

      all = pillars ? [...pillarFloors(pillars, view), ...floors] : floors;
      updateDrain(all, view);
      let moved = step(
        balls.filter((_, i) => fx[i].mode === "sim"),
        all,
        view,
        dt,
      );

      balls.forEach((b, i) => {
        const f = fx[i];
        f.t += dt;
        if (f.mode !== "sim" && f.mode !== "away") moved = true;

        if (f.mode === "charge") {
          // Gather power: swell, squeeze down, tremble, and let the coral core show between the beads.
          const k = Math.min(f.t / CHARGE, 1);
          b.vx = b.vy = b.squashV = 0;
          f.grow = 1 + 0.18 * outCubic(k);
          f.spread = k * k;
          f.glow = k;
          b.squash = 0.2 * k + Math.sin(f.t * 70) * 0.03 * k;
          if (k === 1) {
            f.mode = "dash";
            f.t = 0;
            f.from = { x: b.x, y: b.y };
            f.to = pickTarget(b, all, view);
            f.dir = Math.atan2(-(f.to.y - b.y), f.to.x - b.x);
          }
        } else if (f.mode === "dash") {
          const k = Math.min(f.t / DASH, 1);
          const e = outQuart(k);
          const dist = Math.hypot(f.to.x - f.from.x, f.to.y - f.from.y);
          const px = b.x;
          b.x = f.from.x + (f.to.x - f.from.x) * e;
          // A shallow arc rather than a ruler-straight line.
          b.y = f.from.y + (f.to.y - f.from.y) * e - Math.sin(Math.PI * e) * Math.min(dist * 0.12, 70);
          b.angle += (b.x - px) / b.r;
          b.squash = 0;
          f.stretch = 1 + 0.6 * (1 - k) * Math.min(dist / 300, 1);
          f.grow = 1 + 0.18 * (1 - e);
          f.spread = (1 - e) * 0.6;
          f.glow = 1 - 0.5 * k;
          if (k === 1) {
            f.mode = "sim";
            f.stretch = f.grow = 1;
            f.spread = 0;
            b.y = f.to.y;
            b.vx = Math.sign(f.to.x - f.from.x) * 90;
            b.vy = 0;
            b.squashV = 7; // land with a squish
          }
        } else if (f.mode === "leave") {
          // f.from = screen-space velocity, f.to.y = screen-space y.
          f.from.y += PHYS.gravity * 0.6 * dt;
          b.x += f.from.x * dt;
          f.to.y += f.from.y * dt;
          b.y = view.top + f.to.y;
          b.angle += (f.from.x / b.r) * dt;
          b.squash *= Math.exp(-6 * dt);
          if (b.x < -b.r * 2 || b.x > view.width + b.r * 2 || f.to.y - b.r > view.height) f.mode = "away";
        } else if (f.mode === "enter" && f.t >= 0) {
          // Fall in from just above the viewport; the physics catches it on the nearest ledge below.
          f.mode = "sim";
          b.y = view.top - b.r + 1;
          b.vx = 0;
          b.vy = 320;
          b.squash = b.squashV = 0;
          b.dropping = true;
        }

        // The coral glow cools off after a dash.
        if (f.mode === "sim" && f.glow > 0) {
          f.glow = f.glow < 0.01 ? 0 : f.glow * Math.exp(-3.5 * dt);
          moved = true;
        }

        const o = outer.current[i];
        const n = inner.current[i];
        const st = stretchers.current[i];
        const look = looks.current[i];
        if (!o || !n || !st) return;
        // Pop in with a little overshoot, staggered per ball.
        const k = Math.min(Math.max((since - intro.balls - i * 0.15) / 0.6, 0), 1);
        const p = k === 1 ? 1 : 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2;
        if (p !== f.pop) moved = true;
        f.pop = p;

        const s = b.r * p * f.grow;
        o.visible = p > 0.001 && f.mode !== "away" && !(f.mode === "enter" && f.t < 0);
        // Stretch along the direction of travel: rotate in, scale, rotate back out (so the beads don't turn).
        st.rotation.z = f.dir;
        st.scale.set(f.stretch, 1 / Math.sqrt(f.stretch), 1);
        st.children[0].rotation.z = -f.dir;
        // Squash about the contact point, so the ball flattens onto the ledge instead of sinking into it.
        const sy = s * (1 - b.squash);
        const sx = s * (1 + b.squash * 0.6);
        o.scale.set(sx, sy, sx);
        o.position.set(b.x - view.width / 2, view.height / 2 - (f.mode === "dash" ? b.y : b.y + b.r - sy) + view.top, 0);
        n.rotation.z = -b.angle;
        look?.setSpread(f.spread);
        look?.setGlow(f.glow);
      });

      if (moved || view.top !== lastTop) invalidate();
      lastTop = view.top;
    };

    // The canvas ignores the pointer (the page under it stays clickable), so hit-test the balls by hand.
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const top = window.scrollY;
      const i = balls.findIndex(
        (b, k) => fx[k].mode === "sim" && fx[k].pop > 0.99 && Math.hypot(e.clientX - b.x, e.clientY - (b.y - top)) < Math.max(b.r * 1.3, 22),
      );
      if (i < 0) return;
      e.preventDefault();
      e.stopPropagation();
      swallowClick = true;
      fx[i].mode = "charge";
      fx[i].t = 0;
    };
    const onClick = (e: MouseEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      e.preventDefault();
      e.stopPropagation();
    };

    const remeasure = () => (lastMeasure = -Infinity);
    window.addEventListener("resize", remeasure);
    window.addEventListener("pointerdown", onDown, { capture: true });
    window.addEventListener("click", onClick, { capture: true });
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("pointerdown", onDown, { capture: true });
      window.removeEventListener("click", onClick, { capture: true });
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
          <group
            ref={(g) => {
              stretchers.current[i] = g;
            }}
          >
            <group>
              {/* Fixed tilt so the bead pattern reads as a sphere, then the roll. */}
              <group rotation={[0.5, 0.3, 0]}>
                <group
                  ref={(g) => {
                    inner.current[i] = g;
                  }}
                >
                  <BeadBall beads={beads} seed={i + 1} radius={radius} lookRef={lookSetters[i]} />
                </group>
              </group>
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
    return [small ? radius.mobile : radius.desktop, small ? 70 : 140];
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

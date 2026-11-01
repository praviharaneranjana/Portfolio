"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { siteConfig } from "@/config/site";
import { intro, secondsSinceOpen } from "@/lib/gate";
import { Studio } from "@/components/canvas/Studio";
import {
  PHYS,
  bounceFlight,
  buildRoute,
  exitEdge,
  flightAt,
  landingX,
  nextLedge,
  planFlight,
  rollRange,
  rollToward,
  routeTarget,
  squish,
  stepSquash,
  type Ball,
  type Flight,
  type Ledge,
  type View,
} from "./physics";

// A fixed, transparent, full-viewport canvas. The orthographic camera maps 1 unit to 1 CSS pixel, so the
// motion (document pixels) converts to the scene with a simple offset.

/**
 * What a ball is doing:
 * - `roll`: on a ledge, rolling to where the scroll position says it should be (see `routeTarget`)
 * - `fly`: dropping or hopping onto the next ledge (or onto the bottom of the screen)
 * - `bottom`: resting on the bottom edge of the screen until the next ledge scrolls up and picks it up
 * - `charge` → `dash`: clicked; it swells, glows between the beads, then shoots to another ledge
 * - `leave` → `away`: the reader scrolled up; it hops off the side of the screen and waits
 * - `enter`: the reader scrolled down again; it drops back in from the top after a short stagger
 */
type Mode = "roll" | "fly" | "bottom" | "charge" | "dash" | "leave" | "away" | "enter";
type Fx = {
  mode: Mode;
  t: number;
  /** Ledge the ball is on, flying to, or waiting for. */
  ledge: unknown;
  /** Where it landed on its ledge; it rolls from here toward the exit. */
  entryX: number;
  flight: Flight | null;
  /** The current flight ends on the bottom of the screen rather than on `ledge`. */
  toBottom: boolean;
  /** After a dash the ball stays where it landed until the reader scrolls this far from here. */
  pinTop: number | null;
  /** Entrance pop (0..1), swell, bead spread, core glow, and stretch along the dash. */
  pop: number;
  grow: number;
  spread: number;
  glow: number;
  stretch: number;
  /** Dash path (document px) and direction in scene space; screen-space velocity and y while leaving. */
  from: { x: number; y: number };
  to: { x: number; y: number };
  dir: number;
};

/** Handle on one BeadBall so the loop can spread its beads and light its core without re-rendering. */
type BallLook = { setSpread: (s: number) => void; setGlow: (g: number) => void };

type BallMaterial = (typeof siteConfig.balls.materials)[number];

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
/** After a dash, scrolling this far puts the ball back on its route. */
const UNPIN_AFTER = 120;
/** Gap kept between a ball resting on the bottom of the screen and the screen edge. */
const SCREEN_MARGIN = 8;

const outQuart = (x: number) => 1 - Math.pow(1 - x, 4);
const outCubic = (x: number) => 1 - Math.pow(1 - x, 3);

function measureLedges(view: View, r: number) {
  const ledges: Ledge[] = [];
  // Keep a gap of a ball and a bit between every ledge and the screen edge, so balls can always roll off
  // (on phones most cards span the full width, which would otherwise trap them).
  const min = r * 2.2;
  const max = view.width - r * 2.2;
  document.querySelectorAll<HTMLElement>("[data-ball-floor]").forEach((el) => {
    // A card with ledges inside it: the balls ride its contents, not its top edge.
    if (el.querySelector("[data-ball-floor]")) return;
    const rect = el.getBoundingClientRect();
    const x0 = Math.max(rect.left, min);
    const x1 = Math.min(rect.right, max);
    if (x1 - x0 < r || rect.height === 0) return;
    ledges.push({ key: el, x0, x1, y: rect.top + view.top });
  });
  const pillars = document.querySelector<HTMLElement>("[data-ball-pillars]")?.getBoundingClientRect();
  return {
    route: buildRoute(ledges, r),
    pillars: pillars ? { cx: pillars.left + pillars.width / 2, top: pillars.top + view.top, h: pillars.height } : null,
  };
}

/** Crown `i` of the hero pillars as a ledge, or null when it is off screen (phones only show the middle one). */
function crownLedge(p: { cx: number; top: number; h: number }, i: number, view: View, r: number): Ledge | null {
  const c = PILLAR_CROWNS[i % PILLAR_CROWNS.length];
  const sink = Math.min(view.top / view.height, 1.5) * PILLAR_SINK * p.h;
  const x = p.cx + c.x * p.h;
  if (x - r < 0 || x + r > view.width) return null;
  return { key: `crown-${i}`, x0: x - 0.04 * p.h, x1: x + 0.04 * p.h, y: p.top + c.y * p.h + sink };
}

/** A random ledge on screen, away from the ball, for a dash. Falls back to the bottom of the screen. */
function pickTarget(b: Ball, route: Ledge[], view: View) {
  const spots = route
    .filter((l) => {
      const y = l.y - view.top;
      return y > PHYS.topMargin + b.r && y < view.height - b.r * 3;
    })
    .map((l) => {
      const [a, c] = rollRange(l, b.r);
      return { ledge: l.key as unknown, x: a + Math.random() * (c - a), y: l.y - b.r };
    });
  const far = spots.filter((s) => Math.hypot(s.x - b.x, s.y - b.y) > view.width * 0.2);
  const pool = far.length ? far : spots;
  if (pool.length) return pool[Math.floor(Math.random() * pool.length)];
  const side = b.x < view.width / 2 ? 1 : -1;
  const x = view.width / 2 + side * (0.15 + Math.random() * 0.3) * view.width;
  return { ledge: null, x, y: view.top + view.height - SCREEN_MARGIN - b.r };
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
 * One beaded ball, built at unit radius; the parent scales it to pixels. Each ball has its own finish from
 * `siteConfig.balls.materials`, light enough to read on the dark page. The core can glow coral, and the beads can
 * spread apart to show it.
 */
function BeadBall({
  beads,
  seed,
  radius,
  mat,
  lookRef,
}: {
  beads: number;
  seed: number;
  radius: number;
  mat: BallMaterial;
  lookRef: (look: BallLook) => void;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const core = useRef<THREE.Mesh>(null);
  const coreMat = useRef<THREE.MeshStandardMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const points = useMemo(() => fibonacciSphere(beads), [beads]);

  useLayoutEffect(() => {
    // Deterministic jitter so the beads read as hand-set rather than machine-perfect.
    let r = seed * 9301 + 49297;
    const rand = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
    const base = points.map((p) => ({ dir: p, dist: 0.84 + rand() * 0.04, size: 0.17 * (0.9 + rand() * 0.2) }));
    // Slight per-bead tint, like real beads from different batches.
    const tint = new THREE.Color();
    const color = new THREE.Color(mat.color);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const v = new THREE.Vector3();
    let last = -1;

    base.forEach((_, i) => mesh.current!.setColorAt(i, tint.copy(color).multiplyScalar(0.88 + rand() * 0.16)));
    mesh.current!.instanceColor!.needsUpdate = true;

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
  }, [points, seed, mat.color, lookRef]);

  return (
    <>
      <instancedMesh ref={mesh} args={[undefined, undefined, beads]}>
        <sphereGeometry args={[1, 12, 9]} />
        <meshPhysicalMaterial
          roughness={mat.roughness}
          metalness={mat.metalness}
          clearcoat={mat.clearcoat}
          clearcoatRoughness={0.25}
          envMapIntensity={mat.envMapIntensity}
        />
      </instancedMesh>
      {/* Shadowed core in a darker shade of the beads, so the gaps read as depth — until the ball charges up. */}
      <mesh ref={core}>
        <sphereGeometry args={[0.8, 24, 16]} />
        <meshStandardMaterial ref={coreMat} color={mat.core} roughness={0.8} emissive={siteConfig.scene.rimLight} />
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
  const { count, materials } = siteConfig.balls;
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
    let page: Ledge[] = [];
    let pillars: ReturnType<typeof measureLedges>["pillars"] = null;
    let lastMeasure = -Infinity;
    let lastTop = NaN;
    let upTravel = 0;
    let downTravel = 0;
    let swallowClick = false;
    let prev = performance.now();
    let raf = 0;

    const anchor = (i: number) => PHYS.anchors[i % PHYS.anchors.length];
    /** Ball i's route: its own pillar crown (when on screen), then every ledge on the page. */
    const routeFor = (i: number, view: View) => {
      const crown = pillars && crownLedge(pillars, i, view, radius);
      return crown ? [crown, ...page] : page;
    };
    /** At the very top of the page the balls wait on the crowns (or spread out along the first ledge). */
    const target = (i: number, route: Ledge[], view: View) =>
      view.top < 24 ? { index: route.length ? 0 : -1, progress: (i + 1) / (count + 1), hold: true } : { ...routeTarget(route, view, anchor(i)), hold: false };
    const bottomY = (view: View) => view.top + view.height - SCREEN_MARGIN - radius;

    const fly = (i: number, toX: number, toY: number, ledge: unknown, toBottom = false, boost = 1) => {
      const b = balls[i];
      const f = fx[i];
      f.mode = "fly";
      f.t = 0;
      f.flight = planFlight(b.x, b.y, toX, toY, boost);
      f.ledge = ledge;
      f.entryX = toX;
      f.toBottom = toBottom;
    };

    /** Drops ball i onto its target ledge from wherever it is (used when it has lost its place). */
    const flyToTarget = (i: number, route: Ledge[], view: View) => {
      const t = target(i, route, view);
      const l = route[t.index];
      if (!l || l.y - view.top > view.height - PHYS.bottomMargin) {
        fly(i, balls[i].x, bottomY(view), l?.key ?? null, true);
        return;
      }
      const [a, c] = rollRange(l, radius);
      const x = Math.min(Math.max(balls[i].x, a), c);
      fly(i, x, l.y - radius, l.key);
    };

    const spawn = (view: View) => {
      for (let i = 0; i < count; i++) {
        const route = routeFor(i, view);
        const t = target(i, route, view);
        const l = route[t.index];
        const [a, c] = l ? rollRange(l, radius) : [view.width * 0.3, view.width * 0.7];
        const x = a + (c - a) * t.progress;
        const y = l ? l.y - radius : bottomY(view);
        balls.push({ x, y, vx: 0, r: radius, angle: i, squash: 0, squashV: 0 });
        fx.push({
          mode: l ? "roll" : "bottom",
          t: 0,
          ledge: l?.key ?? null,
          entryX: x,
          flight: null,
          toBottom: false,
          pinTop: null,
          pop: 0,
          grow: 1,
          spread: 0,
          glow: 0,
          stretch: 1,
          from: { x, y },
          to: { x, y },
          dir: 0,
        });
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
      f.pinTop = null;
    };

    const enter = (i: number) => {
      fx[i].mode = "enter";
      fx[i].t = -i * 0.14;
    };

    /** On a ledge: roll toward where the scroll position puts the ball, and hand it on to the next ledge. */
    const roll = (i: number, route: Ledge[], view: View, dt: number) => {
      const b = balls[i];
      const f = fx[i];
      const k = route.findIndex((l) => l.key === f.ledge);
      const l = route[k];
      // Its ledge disappeared (layout change) or scrolled away above the screen while the ball lagged behind.
      if (!l || l.y - view.top < -b.r * 2) return flyToTarget(i, route, view);
      b.y = l.y - b.r;

      if (f.pinTop !== null) {
        if (Math.abs(view.top - f.pinTop) < UNPIN_AFTER) return rollToward(b, b.x, 0, dt);
        f.pinTop = null;
      }

      const t = target(i, route, view);
      const [a, c] = rollRange(l, b.r);
      const base = PHYS.rollSpeed;
      if (t.hold) return rollToward(b, a + (c - a) * t.progress, base, dt);
      // If the reader scrolled faster than the ball can follow, ledges already sliding under the navbar are skipped,
      // so it never hops somewhere that is about to leave the screen.
      let n = nextLedge(route, k, view);
      while (n < t.index && route[n].y - view.top < PHYS.topMargin + b.r * 2) n++;
      const to = route[n];
      const behind = t.index - k;
      // It can roll about as far sideways as the page scrolls while it is on this ledge.
      const exit = (hurry: boolean) =>
        exitEdge(l, to, hurry ? b.x : f.entryX, b.r, Math.max((to.y - l.y) * 1.5, b.r * 4), hurry);

      if (t.index <= k || !to) {
        // Roll from where it came in toward the exit, as far as the reader has scrolled.
        const from = Math.min(Math.max(f.entryX, a), c);
        const end = to ? Math.min(Math.max(exit(false), a), c) : c;
        return rollToward(b, t.index < k ? from : from + (end - from) * t.progress, base, dt);
      }

      // Time to move on: roll off the exit edge.
      const edge = exit(behind > 1);
      rollToward(b, edge, base * (1 + PHYS.catchUp * behind), dt, false);
      if (Math.abs(b.x - edge) > 0.5) return;

      // Roll off the edge.
      const dir = edge >= (l.x0 + l.x1) / 2 ? 1 : -1;
      if (to.y - view.top < view.height - PHYS.bottomMargin) {
        const x = landingX(to, edge, dir, b.r);
        fly(i, x, to.y - b.r, to.key, false, Math.min(1 + 0.4 * (behind - 1), 2));
      } else if (l.y - view.top < PHYS.topMargin) {
        // A long gap with no ledge on screen yet: wait on the bottom of the screen for the next one to come up.
        fly(i, edge + dir * b.r, bottomY(view), to.key, true);
      }
    };

    /** Resting on the bottom of the screen: drift under the next ledge, and get carried off when it arrives. */
    const waitOnBottom = (i: number, route: Ledge[], view: View, dt: number) => {
      const b = balls[i];
      const f = fx[i];
      b.y = bottomY(view);
      const l = route.find((r) => r.key === f.ledge);
      if (!l) {
        // Nothing to wait for (end of the page, or the layout changed): pick the ledge the scroll says.
        const t = target(i, route, view);
        if (route[t.index] && route[t.index].y - view.top < view.height - PHYS.bottomMargin) flyToTarget(i, route, view);
        return;
      }
      const [a, c] = rollRange(l, b.r);
      rollToward(b, Math.min(Math.max(b.x, a), c), PHYS.rollSpeed, dt);
      if (l.y - b.r <= b.y) {
        f.mode = "roll";
        f.entryX = b.x;
        b.y = l.y - b.r;
        squish(b, 200);
      }
    };

    const step = (i: number, route: Ledge[], view: View, dt: number) => {
      const b = balls[i];
      const f = fx[i];
      if (f.mode === "roll") roll(i, route, view, dt);
      else if (f.mode === "bottom") waitOnBottom(i, route, view, dt);
      else if (f.mode === "fly" && f.flight) {
        const p = flightAt(f.flight, f.t);
        b.angle += (p.x - b.x) / b.r;
        b.x = p.x;
        b.y = p.y;
        if (f.t >= f.flight.T) {
          const landY = f.toBottom ? bottomY(view) : route.find((l) => l.key === f.ledge)?.y;
          if (landY === undefined) return flyToTarget(i, route, view);
          b.y = f.toBottom ? landY : landY - b.r;
          squish(b, p.vy);
          const vx = f.flight.dx / f.flight.T;
          if (p.vy > PHYS.bounceSpeed) {
            // One small bounce, carrying a little of the sideways speed.
            f.flight = bounceFlight(b.x, b.y, p.vy, vx * 0.08);
            f.t = 0;
          } else {
            f.mode = f.toBottom ? "bottom" : "roll";
            f.flight = null;
            b.vx = vx * 0.4;
          }
        }
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
        ({ route: page, pillars } = measureLedges(view, radius));
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
          if (fx[i].mode === "enter") fx[i].mode = "away";
          else if (fx[i].mode !== "leave" && fx[i].mode !== "away" && fx[i].mode !== "dash") leave(b, fx[i], view);
        });
      }
      if (downTravel > RETURN_AFTER || view.top < 24) {
        fx.forEach((f, i) => f.mode === "away" && enter(i));
      }

      let moved = false;
      const routes = balls.map((_, i) => routeFor(i, view));

      balls.forEach((b, i) => {
        const f = fx[i];
        const route = routes[i];
        const px = b.x;
        const py = b.y;
        f.t += dt;
        step(i, route, view, dt);

        if (f.mode === "charge") {
          // Gather power: swell, squeeze down, tremble, and let the coral core show between the beads.
          const k = Math.min(f.t / CHARGE, 1);
          b.vx = b.squashV = 0;
          f.grow = 1 + 0.18 * outCubic(k);
          f.spread = k * k;
          f.glow = k;
          b.squash = 0.2 * k + Math.sin(f.t * 70) * 0.03 * k;
          if (k === 1) {
            const to = pickTarget(b, route, view);
            f.mode = "dash";
            f.t = 0;
            f.from = { x: b.x, y: b.y };
            f.to = { x: to.x, y: to.y };
            f.ledge = to.ledge;
            f.dir = Math.atan2(-(to.y - b.y), to.x - b.x);
          }
        } else if (f.mode === "dash") {
          const k = Math.min(f.t / DASH, 1);
          const e = outQuart(k);
          const dist = Math.hypot(f.to.x - f.from.x, f.to.y - f.from.y);
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
            f.mode = f.ledge === null ? "bottom" : "roll";
            f.stretch = f.grow = 1;
            f.spread = 0;
            f.entryX = b.x = f.to.x;
            f.pinTop = view.top;
            b.y = f.to.y;
            b.vx = 0;
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
          // Fall in from just above the screen onto the ledge the scroll position says.
          const t = target(i, route, view);
          const l = route[t.index];
          const [a, c] = l ? rollRange(l, b.r) : [b.r, view.width - b.r];
          b.x = a + (c - a) * (t.hold ? t.progress : 0.5);
          b.y = view.top - b.r - 4;
          b.squash = b.squashV = b.vx = 0;
          flyToTarget(i, route, view);
        }

        if (f.mode !== "charge" && f.mode !== "dash") stepSquash(b, dt);

        // The coral glow cools off after a dash.
        if ((f.mode === "roll" || f.mode === "bottom") && f.glow > 0) {
          f.glow = f.glow < 0.01 ? 0 : f.glow * Math.exp(-3.5 * dt);
          moved = true;
        }
        if (f.mode !== "away" && (Math.abs(b.x - px) + Math.abs(b.y - py) > 0.02 || Math.abs(b.squashV) > 0.01)) moved = true;
        if (f.mode === "charge" || f.mode === "enter") moved = true;
      });

      // Resting balls that touch (on the same ledge, close ledges, or the bottom of the screen) are pushed apart sideways.
      const resting = (m: Mode) => m === "roll" || m === "bottom";
      for (let i = 0; i < balls.length; i++)
        for (let j = i + 1; j < balls.length; j++) {
          const a = balls[i];
          const b = balls[j];
          const dy = Math.abs(b.y - a.y);
          const min = a.r + b.r;
          if (!resting(fx[i].mode) || !resting(fx[j].mode) || dy >= min) continue;
          const gap = Math.sqrt(min * min - dy * dy) - Math.abs(b.x - a.x);
          if (gap <= 0) continue;
          const s = b.x >= a.x ? 1 : -1;
          a.x -= (s * gap) / 2;
          b.x += (s * gap) / 2;
          a.angle -= (s * gap) / 2 / a.r;
          b.angle += (s * gap) / 2 / b.r;
          moved = true;
        }

      balls.forEach((b, i) => {
        const f = fx[i];
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
        (b, k) =>
          (fx[k].mode === "roll" || fx[k].mode === "bottom") &&
          fx[k].pop > 0.99 &&
          Math.hypot(e.clientX - b.x, e.clientY - (b.y - top)) < Math.max(b.r * 1.3, 22),
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
                  <BeadBall
                    beads={beads}
                    seed={i + 1}
                    radius={radius}
                    mat={materials[i % materials.length]}
                    lookRef={lookSetters[i]}
                  />
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
    return [small ? radius.mobile : radius.desktop, small ? 80 : 140];
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

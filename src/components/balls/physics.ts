// Route-following motion for the rolling balls, in document pixels (y grows downward). Pure functions, no DOM or
// three.js.
//
// Every element marked `data-ball-floor` is a ledge. The ledges are sorted top to bottom into one route, and each
// ball walks it one ledge at a time: it rolls along a ledge as the reader scrolls, rolls off the end nearest the next
// ledge and falls (or hops) onto it. Where a ball should be on the route comes from the scroll position, so the balls
// travel down the page with the content, at the reader's pace, and never skip a ledge that is on screen.

/** The top edge of an element (or a pillar crown). `key` identifies it across re-measures. */
export type Ledge = { key: unknown; x0: number; x1: number; y: number };

/** Visible part of the document: scrollY, viewport width and height. */
export type View = { top: number; width: number; height: number };

export type Ball = {
  /** Centre. */
  x: number;
  y: number;
  /** Rolling speed along the ledge (px/s). */
  vx: number;
  r: number;
  /** Roll angle (rad). */
  angle: number;
  /** Squash amount (0 = round, + = flattened) and its spring velocity. */
  squash: number;
  squashV: number;
};

/** A ballistic hop from one point to a landing point: constant horizontal speed, gravity on y. */
export type Flight = { x0: number; y0: number; dx: number; vy0: number; T: number; g: number };

export const PHYS = {
  /** Ball j follows the ledge that last crossed `anchors[j]` of the viewport height (spreads the balls out). */
  anchors: [0.42, 0.56, 0.7],
  /** A ledge closer than this to the top of the viewport (under the navbar) hands the ball on to the next one. */
  topMargin: 96,
  /** The next ledge must be this far above the bottom of the viewport before a ball drops onto it. */
  bottomMargin: 24,
  /** Rolling speed (px/s); and the extra share per ledge a ball has fallen behind the reader. */
  rollSpeed: 280,
  catchUp: 0.8,
  /** How quickly rolling speed follows its target (1/s). */
  rollResponse: 7,
  /** Gravity for falls and hops (px/s²). Lower than real so drops read clearly. */
  gravity: 2000,
  /** Shortest hop (s) and horizontal speed of sideways hops (px/s). */
  minHop: 0.16,
  hopSpeed: 650,
  /** Landings faster than this (px/s) bounce once; the bounce keeps this share of the impact speed. */
  bounceSpeed: 600,
  restitution: 0.24,
  /** Squash spring: stiffness, damping, and how much an impact compresses the ball. Soft, so it jiggles. */
  squashK: 240,
  squashC: 8,
  squashKick: 0.006,
  /** Ledges at nearly the same height that touch (within this many radii) are merged into one. */
  mergeGap: 1.5,
} as const;

/** Sorts ledges into a route and merges ones that form a single surface (a row of cards, nested elements). */
export function buildRoute(ledges: Ledge[], r: number): Ledge[] {
  const out: Ledge[] = [];
  for (const l of [...ledges].sort((a, b) => a.y - b.y || a.x0 - b.x0)) {
    const same = out.find(
      (o) => Math.abs(o.y - l.y) < r * 0.6 && l.x0 <= o.x1 + r * PHYS.mergeGap && l.x1 >= o.x0 - r * PHYS.mergeGap,
    );
    if (same) {
      same.x0 = Math.min(same.x0, l.x0);
      same.x1 = Math.max(same.x1, l.x1);
      same.y = Math.min(same.y, l.y);
    } else out.push({ ...l });
  }
  return out;
}

/** Index of the ledge a ball with this anchor should be on, and how far along it (0..1) it should have rolled. */
export function routeTarget(route: Ledge[], view: View, anchor: number) {
  if (!route.length) return { index: -1, progress: 0 };
  const s = view.top + anchor * view.height;
  let i = 0;
  while (i + 1 < route.length && route[i + 1].y <= s) i++;
  // The ledge is about to slide under the navbar: move on as soon as the next one is on screen.
  while (
    i + 1 < route.length &&
    route[i].y - view.top < PHYS.topMargin &&
    route[i + 1].y - view.top < view.height - PHYS.bottomMargin
  )
    i++;
  const next = route[i + 1];
  const span = Math.max(Math.min(next ? next.y - route[i].y : view.height, anchor * view.height - PHYS.topMargin), 1);
  return { index: i, progress: Math.min(Math.max((s - route[i].y) / span, 0), 1) };
}

/** The range a ball's centre can roll over on a ledge (a single point on ledges narrower than the ball). */
export function rollRange(l: Ledge, r: number): [number, number] {
  const a = l.x0 + r * 0.6;
  const b = l.x1 - r * 0.6;
  return a <= b ? [a, b] : [(l.x0 + l.x1) / 2, (l.x0 + l.x1) / 2];
}

/**
 * The edge a ball leaves ledge `l` by on its way to `next`: the end closer to the next ledge, or, when the next ledge
 * is under both ends (stacked cards), the end opposite where it came in, so it rolls across — unless that is further
 * than `budget` px (how far it can roll in the scroll it has on this ledge), or the ball has fallen behind the reader
 * (`hurry`): then it takes the nearer end.
 */
export function exitEdge(l: Ledge, next: Ledge, entryX: number, r: number, budget: number, hurry = false) {
  const gap = (x: number) => (x < next.x0 ? next.x0 - x : x > next.x1 ? x - next.x1 : 0);
  const left = gap(l.x0);
  const right = gap(l.x1);
  const near = entryX - l.x0 < l.x1 - entryX ? l.x0 : l.x1;
  if (Math.abs(left - right) < r) {
    const far = near === l.x0 ? l.x1 : l.x0;
    return hurry || Math.abs(far - entryX) > budget ? near : far;
  }
  return left < right ? l.x0 : l.x1;
}

/**
 * The ledge after `k` a ball should go to: the next one, unless it is off to the side while another ledge just below
 * sits right under this one (multi-column layouts). Then the ball stays in its column; the other balls, which are
 * elsewhere on the page, pick up the side column.
 */
export function nextLedge(route: Ledge[], k: number, view: View) {
  const l = route[k];
  const first = route[k + 1];
  const apart = (o: Ledge) => (o.x1 < l.x0 ? l.x0 - o.x1 : o.x0 > l.x1 ? o.x0 - l.x1 : 0);
  if (!first || apart(first) < view.width * 0.08) return k + 1;
  for (let n = k + 2; n < route.length && route[n].y - first.y < view.height * 0.25; n++) {
    if (apart(route[n]) < view.width * 0.08) return n;
  }
  return k + 1;
}

/** Where a ball rolling off at `fromX` (moving in `dir`) lands on `next`: a little past the edge, kept on the ledge. */
export function landingX(next: Ledge, fromX: number, dir: number, r: number) {
  const [a, b] = rollRange(next, r);
  return Math.min(Math.max(fromX + dir * r * 0.8, a), b);
}

/**
 * A hop from (x0, y0) to (x1, y1): a plain drop when going down, an arc when going sideways or up. `boost` > 1 makes
 * it quicker, for a ball catching up with the reader.
 */
export function planFlight(x0: number, y0: number, x1: number, y1: number, boost = 1): Flight {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const g = PHYS.gravity * boost * boost;
  const T = Math.max(Math.sqrt((2 * Math.max(dy, 0)) / g), Math.abs(dx) / (PHYS.hopSpeed * boost), PHYS.minHop / boost);
  return { x0, y0, dx, vy0: (dy - (g * T * T) / 2) / T, T, g };
}

/** A bounce in place after a hard landing. */
export function bounceFlight(x: number, y: number, impact: number, drift: number): Flight {
  const vy0 = -impact * PHYS.restitution;
  return { x0: x, y0: y, dx: drift, vy0, T: (-2 * vy0) / PHYS.gravity, g: PHYS.gravity };
}

/** Position on a flight at time t, plus vertical speed (for the landing squash). */
export function flightAt(f: Flight, t: number) {
  const k = Math.min(t, f.T);
  return { x: f.x0 + (f.dx * k) / f.T, y: f.y0 + f.vy0 * k + (f.g * k * k) / 2, vy: f.vy0 + f.g * k };
}

/**
 * Rolls a ball toward `targetX`, no faster than `maxSpeed`. It eases to a stop there, unless `brake` is false (rolling
 * off an edge): then it keeps its speed to the end.
 */
export function rollToward(b: Ball, targetX: number, maxSpeed: number, dt: number, brake = true) {
  const d = targetX - b.x;
  const want = brake ? Math.max(-maxSpeed, Math.min(maxSpeed, d * 5)) : Math.sign(d) * maxSpeed;
  b.vx += (want - b.vx) * Math.min(1, dt * PHYS.rollResponse);
  const step = b.vx * dt;
  // Don't overshoot the target.
  b.x = Math.abs(step) > Math.abs(targetX - b.x) && Math.sign(step) === Math.sign(targetX - b.x) ? targetX : b.x + step;
  b.angle += step / b.r;
}

/** Kicks the squash spring for a landing at `impact` px/s. */
export function squish(b: Ball, impact: number) {
  if (impact > 40) b.squashV += Math.max(impact, 180) * PHYS.squashKick;
}

/** Advances the squash spring (substepped: it is stiff). */
export function stepSquash(b: Ball, dt: number) {
  for (let left = dt; left > 1e-6; left -= 1 / 240) {
    const h = Math.min(1 / 240, left);
    b.squashV += (-PHYS.squashK * b.squash - PHYS.squashC * b.squashV) * h;
    b.squash = Math.max(-0.25, Math.min(0.32, b.squash + b.squashV * h));
  }
}

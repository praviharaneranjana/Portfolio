// 2D physics for the rolling balls, in document pixels (y grows downward). Pure functions, no DOM or three.js.
//
// Floors are one-way platforms (the top edge of a DOM element or a hero pillar): balls land on them from above and
// pass through from below. A floor "drains" once it scrolls into the top part of the screen: balls on it are pushed
// toward its nearer edge, roll off, and drop to the next floor. The bottom edge of the viewport is a solid floor and
// the top edge feeds balls back in, so the balls always stay on screen and travel down the page with the reader.

export type Floor = { x0: number; x1: number; y: number; drain: boolean };

export type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  /** Roll angle (rad) and angular velocity. */
  angle: number;
  spin: number;
  /** Squash amount (0 = round, + = flattened) and its spring velocity. */
  squash: number;
  squashV: number;
  grounded: boolean;
};

/** Visible part of the document: scrollY, viewport width and height. */
export type View = { top: number; width: number; height: number };

export const PHYS = {
  gravity: 2600,
  /** Bounce on floors / walls / other balls. */
  restitution: 0.3,
  wallRestitution: 0.45,
  /** Exponential decay of horizontal speed while rolling. */
  rollFriction: 1.5,
  /** Sideways push on a draining floor (px/s²). */
  drainAccel: 1100,
  /** A floor drains once its top is above this fraction of the viewport height. */
  drainLine: 0.32,
  /** Gap kept between balls resting on the viewport bottom and the screen edge. */
  screenMargin: 8,
  /** Impacts slower than this (px/s) settle instead of bouncing. */
  restSpeed: 220,
  /** Squash spring: stiffness, damping, and how much an impact compresses the ball. */
  squashK: 320,
  squashC: 13,
  squashKick: 0.0045,
  maxSpeed: 2600,
  /** Physics substep (s). */
  dt: 1 / 240,
} as const;

function land(b: Ball, y: number) {
  const impact = b.vy;
  b.y = y - b.r;
  b.grounded = true;
  if (impact > PHYS.restSpeed) {
    b.vy = -impact * PHYS.restitution;
    b.squashV += impact * PHYS.squashKick;
  } else {
    b.vy = 0;
  }
}

function collideBalls(a: Ball, b: Ball) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const min = a.r + b.r;
  const d2 = dx * dx + dy * dy;
  if (d2 >= min * min || d2 === 0) return;
  const d = Math.sqrt(d2);
  const nx = dx / d;
  const ny = dy / d;
  const push = (min - d) / 2;
  a.x -= nx * push;
  a.y -= ny * push;
  b.x += nx * push;
  b.y += ny * push;
  const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (rel >= 0) return;
  const j = (-(1 + PHYS.restitution) * rel) / 2; // equal masses
  a.vx -= j * nx;
  a.vy -= j * ny;
  b.vx += j * nx;
  b.vy += j * ny;
  const kick = Math.abs(rel) * PHYS.squashKick * 0.4;
  a.squashV += kick;
  b.squashV += kick;
}

function substep(balls: Ball[], floors: Floor[], view: View, dt: number) {
  const screenFloor = view.top + view.height - PHYS.screenMargin;

  for (const b of balls) {
    const prevBottom = b.y + b.r;
    b.vy = Math.min(b.vy + PHYS.gravity * dt, PHYS.maxSpeed);
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.grounded = false;

    // One-way floors: only catch a ball that was above the floor's top edge on the previous step.
    let support: Floor | null = null;
    let overhang = 0;
    for (const f of floors) {
      const over = b.x < f.x0 ? f.x0 - b.x : b.x > f.x1 ? b.x - f.x1 : 0;
      if (over > b.r * 0.85) continue;
      if (b.vy >= 0 && prevBottom <= f.y + Math.max(3, b.r * 0.35) && b.y + b.r >= f.y) {
        land(b, f.y);
        support = f;
        overhang = b.x < f.x0 ? -over : over;
      }
    }

    if (support) {
      // Past the edge: tip over the corner.
      if (overhang !== 0) b.vx += (overhang / b.r) * PHYS.gravity * 0.9 * dt;
      // Draining floor: roll toward the nearer edge.
      else if (support.drain) b.vx += (b.x >= (support.x0 + support.x1) / 2 ? 1 : -1) * PHYS.drainAccel * dt;
    }

    // The viewport bottom is solid; when the reader scrolls up it lifts the balls with it.
    if (b.y + b.r > screenFloor) {
      if (b.vy > 0) land(b, screenFloor);
      else b.y = screenFloor - b.r;
    }
    // A ball left above the viewport re-enters at the top edge and falls (one-way floors let it pass).
    if (b.y + b.r < view.top) {
      b.y = view.top - b.r + 1;
      b.vy = Math.max(b.vy, 0);
    }

    if (b.x < b.r) {
      b.x = b.r;
      b.vx = Math.abs(b.vx) * PHYS.wallRestitution;
    } else if (b.x > view.width - b.r) {
      b.x = view.width - b.r;
      b.vx = -Math.abs(b.vx) * PHYS.wallRestitution;
    }

    if (b.grounded) {
      b.vx *= Math.exp(-PHYS.rollFriction * dt);
      b.spin = b.vx / b.r;
    } else {
      b.spin *= Math.exp(-0.4 * dt);
    }
    b.angle += b.spin * dt;

    b.squashV += (-PHYS.squashK * b.squash - PHYS.squashC * b.squashV) * dt;
    b.squash = Math.max(-0.25, Math.min(0.32, b.squash + b.squashV * dt));
  }

  for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) collideBalls(balls[i], balls[j]);
}

/** Advance the simulation by `elapsed` seconds. Returns true if anything visibly moved. */
export function step(balls: Ball[], floors: Floor[], view: View, elapsed: number) {
  const before = balls.map((b) => b.x + b.y * 7 + b.squash * 1000);
  let left = Math.min(elapsed, 1 / 20);
  while (left > 1e-6) {
    const dt = Math.min(PHYS.dt, left);
    substep(balls, floors, view, dt);
    left -= dt;
  }
  return balls.some((b, i) => Math.abs(b.x + b.y * 7 + b.squash * 1000 - before[i]) > 0.05);
}

/** Marks floors in the top part of the viewport as draining. Floors with `hold` never drain (pillars before scrolling). */
export function updateDrain(floors: (Floor & { hold?: boolean })[], view: View) {
  for (const f of floors) f.drain = !f.hold && f.y - view.top < view.height * PHYS.drainLine;
}

"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { Terminal } from "lucide-react";
import { heroPanel, profile } from "@/content";
import { intro } from "@/lib/gate";
import { cn } from "@/lib/utils";
import { LiveClock } from "../contact/LiveClock";

const ease = [0.16, 1, 0.3, 1] as const;

const TABS = [
  { id: "results", label: "Results" },
  { id: "stack", label: "Stack" },
  { id: "availability", label: "Availability" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** Largest lean toward the pointer, in degrees. */
const TILT = { x: 5, y: 7 };
/** How far the panel is tipped back before it rises into place, in degrees. */
const ENTER_TILT = 22;
/** Depth of the slab: the back plate sits this far behind the face, the content this far in front. */
const DEPTH = { back: -18, content: 20 };

const panelMotion = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.22, ease },
};

/**
 * A steel-grey slab under the hero headline. It rises from a tipped-back angle when the gate opens, then leans toward
 * the pointer with a soft highlight that follows it, like light across brushed metal. Flat on touch screens and for
 * reduced motion. Content comes from `heroPanel` in src/content/hero.ts.
 */
export function HeroDashboard({ trigger = true }: { trigger?: boolean }) {
  const [tab, setTab] = useState<TabId>("results");
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  // Pointer over the panel, -0.5..0.5 on each axis.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spring = { stiffness: 140, damping: 22, mass: 0.6 };
  const leanY = useSpring(useTransform(px, (v) => v * TILT.y * 2), spring);
  const leanX = useSpring(useTransform(py, (v) => -v * TILT.x * 2), spring);

  // Entrance: 0 → 1 once the gate opens.
  const enter = useMotionValue(0);
  useEffect(() => {
    if (!trigger) return;
    const controls = animate(enter, 1, { duration: reduce ? 0.4 : 1.2, delay: intro.text + 0.6, ease });
    return () => controls.stop();
  }, [trigger, reduce, enter]);

  const rotateX = useTransform([leanX, enter], ([lean, e]: number[]) => lean + (reduce ? 0 : (1 - e) * ENTER_TILT));
  const y = useTransform(enter, (e) => (1 - e) * 40);
  const opacity = enter;

  const sheenX = useTransform(px, (v) => `${(v + 0.5) * 100}%`);
  const sheenY = useTransform(py, (v) => `${(v + 0.5) * 100}%`);
  const sheen = useMotionTemplate`radial-gradient(520px circle at ${sheenX} ${sheenY}, rgb(255 255 255 / 0.07), transparent 50%)`;
  const sheenOpacity = useSpring(0, spring);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
    sheenOpacity.set(1);
  };
  const onLeave = () => {
    px.set(0);
    py.set(0);
    sheenOpacity.set(0);
  };

  return (
    <div className="mt-12 [perspective:1600px]">
      <motion.div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={{ rotateX, rotateY: leanY, y, transformStyle: "preserve-3d", transformOrigin: "50% 100%" }}
        className="relative rounded-2xl"
      >
        {/* Back plate: shows as the slab's edge when the panel leans. */}
        <motion.div
          aria-hidden
          style={{ opacity, transform: `translateZ(${DEPTH.back}px)` }}
          className="absolute inset-0 rounded-2xl border border-white/[0.05] bg-[#09090a] shadow-[0_40px_80px_-24px_rgb(0_0_0/0.85)]"
        />
        {/* Face */}
        <motion.div
          aria-hidden
          style={{ opacity }}
          className="absolute inset-0 rounded-2xl border border-line bg-surface shadow-[inset_0_1px_0_rgb(255_255_255/0.07)]"
        />
        <motion.div
          aria-hidden
          style={{ background: sheen, opacity: sheenOpacity }}
          className="pointer-events-none absolute inset-0 rounded-2xl"
        />

        <motion.div style={{ opacity, transform: `translateZ(${DEPTH.content}px)` }} className="relative p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
              <span className="text-secondary">Homagama, Sri Lanka</span>
              <span className="font-mono text-foreground tabular-nums">
                <LiveClock timeZone={profile.timezone} />
              </span>
              <span className="font-mono text-xs text-muted">UTC+05:30</span>
            </p>

            <div role="tablist" aria-label="About my work" className="flex rounded-lg border border-line bg-background/60 p-1">
              {TABS.map((t) => {
                const selected = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    id={`hero-tab-${t.id}`}
                    aria-selected={selected}
                    aria-controls={`hero-panel-${t.id}`}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "h-8 rounded px-3 text-[13px] font-medium transition-colors duration-150",
                      selected
                        ? "bg-surface-elevated text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] ring-1 ring-white/10"
                        : "text-muted hover:text-foreground",
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-5" role="tabpanel" id={`hero-panel-${tab}`} aria-labelledby={`hero-tab-${tab}`}>
            <AnimatePresence mode="wait" initial={false}>
              {tab === "results" && (
                <motion.dl key="results" {...panelMotion} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {heroPanel.results.map((m) => (
                    <div
                      key={m.label}
                      data-ball-floor
                      className="flex flex-col rounded-lg border border-line bg-background/50 p-4 transition-colors duration-150 hover:border-white/15"
                    >
                      <dt className="text-[13px] text-secondary">{m.label}</dt>
                      <dd
                        className={cn(
                          "order-first mb-3 text-3xl font-medium tracking-tight tabular-nums md:text-[2rem]",
                          m.highlight ? "text-accent" : "text-foreground",
                        )}
                      >
                        {m.value}
                      </dd>
                      <dd className="mt-2 text-xs leading-relaxed text-muted">{m.detail}</dd>
                    </div>
                  ))}
                </motion.dl>
              )}

              {tab === "stack" && (
                <motion.ul key="stack" {...panelMotion} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {heroPanel.stack.map((s) => (
                    <li key={s.name} data-ball-floor className="rounded-lg border border-line bg-background/50 p-4">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm font-medium text-foreground">{s.name}</span>
                        <span className="font-mono text-xs text-muted">{s.area}</span>
                      </div>
                      <p className="mt-2 text-[13px] leading-relaxed text-secondary">{s.detail}</p>
                    </li>
                  ))}
                </motion.ul>
              )}

              {tab === "availability" && (
                <motion.div
                  key="availability"
                  {...panelMotion}
                  className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"
                >
                  <div data-ball-floor className="max-w-xl">
                    <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <span className="size-1.5 rounded-full bg-accent" />
                      {profile.availability}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-secondary">{heroPanel.availability}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <a href="#terminal" className="btn btn-sm btn-secondary">
                      <Terminal className="size-4 text-muted" strokeWidth={1.5} />
                      Open terminal
                    </a>
                    <a href="#contact" className="btn btn-sm btn-primary">
                      Get in touch
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

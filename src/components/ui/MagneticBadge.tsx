"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";

export type BadgeLink = { label: string; href: string; download?: boolean };

/** Half the badge size (size-32), so the arms start at its edge. */
const BADGE_R = 64;
/** Vertical gap between menu items, and the horizontal reach of the arms (narrow screens use the smaller one). */
const ROW = 40;
const REACH = { wide: 150, narrow: 104 };
const ease = [0.16, 1, 0.3, 1] as const;

/**
 * Coral circular badge with rotating text that leans toward the cursor. Clicking it opens a menu: arms grow out of
 * the badge to a column of links, on whichever side has more room.
 */
export function MagneticBadge({ text, links }: { text: string; links: BadgeLink[] }) {
  const ref = useRef<HTMLButtonElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState({ side: -1, reach: REACH.wide, shift: 0 });
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 16 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 16 });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      // Open toward the roomier side, and keep the column inside the viewport and the (clipped) hero section.
      const r = ref.current!.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const clip = ref.current!.closest("section")?.getBoundingClientRect();
      const half = ((links.length - 1) * ROW) / 2 + ROW;
      const top = Math.max(0, clip?.top ?? 0) + 16;
      const bottom = Math.min(window.innerHeight, clip?.bottom ?? window.innerHeight) - 16;
      const shift = Math.min(Math.max(0, top + half - cy), bottom - half - cy);
      x.set(0);
      y.set(0);
      setLayout({ side: cx > window.innerWidth / 2 ? -1 : 1, reach: window.innerWidth < 640 ? REACH.narrow : REACH.wide, shift });
    }
    setOpen((o) => !o);
  };

  const nodes = links.map((_, i) => {
    const nx = layout.side * layout.reach;
    const ny = (i - (links.length - 1) / 2) * ROW + layout.shift;
    return { x: nx, y: ny, len: Math.hypot(nx, ny), angle: (Math.atan2(ny, nx) * 180) / Math.PI };
  });

  return (
    <div ref={wrap} className="relative">
      <motion.button
        ref={ref}
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={toggle}
        style={{ x, y }}
        onPointerMove={(e) => {
          if (open) return;
          const r = ref.current!.getBoundingClientRect();
          x.set((e.clientX - r.left - r.width / 2) * 0.4);
          y.set((e.clientY - r.top - r.height / 2) * 0.4);
        }}
        onPointerLeave={() => {
          x.set(0);
          y.set(0);
        }}
        whileHover={{ scale: 1.06 }}
        animate={{ scale: open ? 0.92 : 1 }}
        className="group relative flex size-32 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent shadow-[0_0_50px_rgba(255,77,48,0.35)]"
      >
        <svg viewBox="0 0 100 100" className="animate-spin-slow absolute inset-0 size-full p-1.5" aria-hidden>
          <defs>
            <path id="badge-circle" d="M 50,50 m -37,0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" />
          </defs>
          <text className="fill-white font-mono text-[8.2px] font-semibold tracking-[0.22em] uppercase">
            <textPath href="#badge-circle">{text.repeat(2)}</textPath>
          </text>
        </svg>
        {/* Plus that turns into a close cross. */}
        <motion.svg
          viewBox="0 0 24 24"
          className="size-7 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          animate={{ rotate: open ? 135 : 0 }}
          transition={{ duration: 0.5, ease }}
          aria-hidden
        >
          <path d="M12 5v14M5 12h14" />
        </motion.svg>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.nav
            role="menu"
            aria-label="Site sections"
            className="pointer-events-none absolute top-1/2 left-1/2 z-50"
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
          >
            {links.map((link, i) => {
              const n = nodes[i];
              return (
                <div key={link.href}>
                  {/* Arm: rotated toward its node, grows out from the badge edge. */}
                  <div className="absolute top-0 left-0 origin-left" style={{ transform: `rotate(${n.angle}deg)` }}>
                    <motion.span
                      className="absolute top-0 h-px origin-left bg-gradient-to-r from-accent to-white/40"
                      style={{ left: BADGE_R + 4, width: Math.max(n.len - BADGE_R - 10, 0) }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.5, delay: i * 0.04, ease }}
                    />
                  </div>
                  <motion.span
                    className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
                    style={{ left: n.x, top: n.y }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.3 + i * 0.04 }}
                  />
                  <motion.a
                    role="menuitem"
                    href={link.href}
                    download={link.download}
                    onClick={() => setOpen(false)}
                    className={`pointer-events-auto absolute flex -translate-y-1/2 items-center gap-2 rounded-full border border-white/10 bg-surface-elevated px-3.5 shadow-[0_12px_30px_-8px_rgb(0_0_0/0.8)] py-1.5 font-mono text-[11px] tracking-wider whitespace-nowrap text-foreground uppercase transition-colors hover:border-accent hover:text-accent ${
                      layout.side < 0 ? "-translate-x-full" : ""
                    }`}
                    style={{ left: n.x + layout.side * 12, top: n.y }}
                    initial={{ opacity: 0, x: -layout.side * 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.45, delay: 0.25 + i * 0.04, ease }}
                  >
                    <span className="text-muted">{String(i + 1).padStart(2, "0")}</span>
                    {link.label}
                  </motion.a>
                </div>
              );
            })}
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}

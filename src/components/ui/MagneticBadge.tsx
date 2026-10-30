"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

/** Coral circular CTA with rotating text that leans toward the cursor. */
export function MagneticBadge({ href, text }: { href: string; text: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 16 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 16 });

  return (
    <motion.a
      ref={ref}
      href={href}
      aria-label="Get in touch"
      style={{ x, y }}
      onPointerMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * 0.4);
        y.set((e.clientY - r.top - r.height / 2) * 0.4);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      whileHover={{ scale: 1.06 }}
      className="group relative flex size-32 shrink-0 items-center justify-center rounded-full bg-accent shadow-[0_0_50px_rgba(255,77,48,0.35)]"
    >
      <svg viewBox="0 0 100 100" className="animate-spin-slow absolute inset-0 size-full p-1.5" aria-hidden>
        <defs>
          <path id="badge-circle" d="M 50,50 m -37,0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" />
        </defs>
        <text className="fill-white font-mono text-[8.2px] font-semibold tracking-[0.22em] uppercase">
          <textPath href="#badge-circle">{text.repeat(2)}</textPath>
        </text>
      </svg>
      <svg
        viewBox="0 0 24 24"
        className="size-7 text-white transition-transform duration-300 ease-out-expo group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path d="M7 17 17 7M8 7h9v9" />
      </svg>
    </motion.a>
  );
}

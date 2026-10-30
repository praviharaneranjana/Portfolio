"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

const ease = [0.16, 1, 0.3, 1] as const;

/** Fade-and-rise when scrolled into view. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

/** Editorial line reveal: each line slides up from behind a mask. */
export function MaskLines({
  lines,
  className,
  delay = 0,
  onMount = false,
}: {
  lines: { text: string; className?: string }[];
  className?: string;
  delay?: number;
  /** Animate on page load instead of on scroll (for the hero). */
  onMount?: boolean;
}) {
  // The trigger sits on the unclipped wrapper: the lines themselves start hidden behind
  // overflow:hidden, so an in-view check on them would never fire.
  return (
    <motion.span
      className={`block ${className ?? ""}`}
      initial="hidden"
      {...(onMount ? { animate: "show" } : { whileInView: "show", viewport: { once: true, margin: "-60px" } })}
      transition={{ staggerChildren: 0.12, delayChildren: delay }}
    >
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em]">
          <motion.span
            className={`block ${line.className ?? ""}`}
            variants={{ hidden: { y: "110%" }, show: { y: "0%", transition: { duration: 1.1, ease } } }}
          >
            {line.text}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

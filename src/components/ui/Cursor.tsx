"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

const INTERACTIVE = "a, button, input, textarea, [data-cursor]";
const QUERY = "(pointer: fine) and (prefers-reduced-motion: no-preference)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function Cursor() {
  const enabled = useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
  const [hovering, setHovering] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 350, damping: 32, mass: 0.6 });
  const ringY = useSpring(y, { stiffness: 350, damping: 32, mass: 0.6 });

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add("has-cursor");

    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    const over = (e: PointerEvent) => setHovering(!!(e.target as Element).closest?.(INTERACTIVE));
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerover", over);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
      document.documentElement.classList.remove("has-cursor");
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-[100] size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white mix-blend-difference"
        style={{ x, y }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-[100] -translate-x-1/2 -translate-y-1/2 rounded-full border"
        style={{ x: ringX, y: ringY }}
        animate={{
          width: hovering ? 64 : 38,
          height: hovering ? 64 : 38,
          borderColor: hovering ? "rgba(255,77,48,0.9)" : "rgba(255,255,255,0.3)",
          backgroundColor: hovering ? "rgba(255,77,48,0.1)" : "rgba(255,77,48,0)",
        }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      />
    </>
  );
}

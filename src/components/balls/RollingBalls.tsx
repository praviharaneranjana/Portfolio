"use client";

import { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { siteConfig } from "@/config/site";
import { useGateOpen } from "@/lib/gate";

// three.js needs `window`, so the ball canvas is client-only and code-split like the hero scene.
const BallField = dynamic(() => import("./BallField"), { ssr: false });

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(reducedMotionQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/**
 * Site-wide overlay: three beaded balls that start on the hero pillars and roll down the page as the visitor scrolls,
 * using every element marked `data-ball-floor` as a ledge. Mounted once in app/page.tsx.
 */
export function RollingBalls() {
  const gateOpen = useGateOpen();
  const reduced = useSyncExternalStore(subscribe, () => window.matchMedia(reducedMotionQuery).matches, () => true);
  if (!siteConfig.balls.enabled || !gateOpen || reduced) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40">
      <BallField />
    </div>
  );
}

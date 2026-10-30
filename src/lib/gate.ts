"use client";

import { useSyncExternalStore } from "react";
import { siteConfig } from "@/config/site";

// Tiny global store for the intro gate. The gate itself and anything that should wait for it
// (hero entrance, navbar, rolling balls) read the same value, so no provider is needed.
let open = !siteConfig.gate.enabled;
let openedAt: number | null = null;
const listeners = new Set<() => void>();

/** Choreography after the gate opens, in seconds. Pillars rise first, then text, then the balls drop. */
export const intro = {
  /** Each hero pillar starts this long after the previous one. */
  pillarStagger: 0.28,
  /** How long one pillar takes to rise into place. */
  pillarRise: 1.7,
  /** Hero copy starts once the pillars are mostly up. */
  text: 1.2,
  /** Rolling balls appear on top of the pillars. */
  balls: 2.6,
} as const;

export const gateStore = {
  isOpen: () => open,
  /** performance.now() (ms) when the gate opened; null while closed. With the gate disabled it is page load (0). */
  openedAt: () => (open ? (openedAt ?? 0) : null),
  open() {
    if (open) return;
    open = true;
    openedAt = performance.now();
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** Seconds since the gate opened, or null while it is still closed. Safe to call per frame. */
export function secondsSinceOpen() {
  const at = gateStore.openedAt();
  return at === null ? null : (performance.now() - at) / 1000;
}

/** True once the visitor has unlocked (or skipped) the intro gate. Always false on the server. */
export function useGateOpen() {
  return useSyncExternalStore(gateStore.subscribe, gateStore.isOpen, () => !siteConfig.gate.enabled);
}

"use client";

import { useSyncExternalStore } from "react";
import { siteConfig } from "@/config/site";

// Tiny global store for the intro gate. The gate itself and anything that should wait for it
// (hero entrance, navbar) read the same value, so no provider is needed.
let open = !siteConfig.gate.enabled;
const listeners = new Set<() => void>();

export const gateStore = {
  isOpen: () => open,
  open() {
    if (open) return;
    open = true;
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** True once the visitor has unlocked (or skipped) the intro gate. Always false on the server. */
export function useGateOpen() {
  return useSyncExternalStore(gateStore.subscribe, gateStore.isOpen, () => !siteConfig.gate.enabled);
}

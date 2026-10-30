"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import dynamic from "next/dynamic";
import { useLenis } from "lenis/react";
import { siteConfig } from "@/config/site";
import { profile } from "@/content";
import { gateStore, useGateOpen } from "@/lib/gate";
import { cn } from "@/lib/utils";
import type { GateControl } from "./GateCanvas";

// three.js needs `window`, so the 3D vault is client-only and code-split.
const GateCanvas = dynamic(() => import("./GateCanvas"), { ssr: false });

const FULL = Math.PI * 2 * siteConfig.gate.turns;
const FADE_AT = 2100; // ms after unlock: start fading the overlay
const DONE_AT = 2900; // ms after unlock: remove it and start the hero
const SESSION_KEY = "gate-unlocked";
const RING_TICKS = Array.from({ length: 48 }, (_, i) => i);

type Phase = "locked" | "unlocking" | "fading";

/**
 * Full-screen intro: a mechanical vault (modelled in Blender) the visitor unlocks by
 * dragging the wheel through a full turn. Wheel-scroll, arrow keys and "Skip" also work.
 */
export function IntroGate() {
  const isOpen = useGateOpen();
  if (isOpen) return null;
  return <Gate />;
}

function Gate() {
  const [phase, setPhase] = useState<Phase>("locked");
  const [ready, setReady] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const arc = useRef<SVGCircleElement>(null);
  const pct = useRef<HTMLSpanElement>(null);
  const ctrl = useRef<GateControl>({ progress: 0, unlockedAt: null });
  const drag = useRef<{ angle: number } | null>(null);
  const turned = useRef(0);
  const phaseRef = useRef<Phase>("locked");
  const lenis = useLenis();

  // Reduced-motion visitors and repeat visits (if enabled) go straight to the site.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = siteConfig.gate.oncePerSession && sessionStorage.getItem(SESSION_KEY) === "1";
    if (reduce || seen) gateStore.open();
    else window.scrollTo(0, 0);
  }, []);

  // Freeze page scroll while the gate is up.
  useEffect(() => {
    const html = document.documentElement;
    html.style.overflow = "hidden";
    lenis?.stop();
    return () => {
      html.style.overflow = "";
      lenis?.start();
    };
  }, [lenis]);

  const paint = useCallback((p: number) => {
    if (arc.current) arc.current.style.strokeDashoffset = String(1 - p);
    if (pct.current) pct.current.textContent = String(Math.round(p * 100)).padStart(3, "0");
  }, []);

  const unlock = useCallback(() => {
    if (phaseRef.current !== "locked") return;
    phaseRef.current = "unlocking";
    turned.current = FULL;
    ctrl.current.progress = 1;
    ctrl.current.unlockedAt = performance.now() / 1000;
    paint(1);
    setPhase("unlocking");
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // storage blocked (private mode) — the gate simply shows again next time
    }
    window.setTimeout(() => {
      phaseRef.current = "fading";
      setPhase("fading");
    }, FADE_AT);
    window.setTimeout(() => gateStore.open(), DONE_AT);
  }, [paint]);

  const advance = useCallback(
    (delta: number) => {
      if (phaseRef.current !== "locked") return;
      turned.current = Math.min(Math.max(turned.current + delta, 0), FULL);
      ctrl.current.progress = turned.current / FULL;
      paint(ctrl.current.progress);
      if (turned.current >= FULL) unlock();
    },
    [paint, unlock],
  );

  // Keyboard + mouse wheel alternatives to dragging.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        advance(FULL / 8);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") advance(-FULL / 8);
      else if (e.key === "Escape") unlock();
    };
    const onWheel = (e: WheelEvent) => advance(Math.max(-0.4, Math.min(0.4, e.deltaY * 0.004)));
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
    };
  }, [advance, unlock]);

  // Angle of the pointer around the wheel (screen centre). Screen Y points down, so clockwise is positive.
  const angleOf = (e: ReactPointerEvent) => {
    const dx = e.clientX - window.innerWidth / 2;
    const dy = e.clientY - window.innerHeight / 2;
    return { angle: Math.atan2(dy, dx), dist: Math.hypot(dx, dy) };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { angle: angleOf(e).angle };
    root.current?.setAttribute("data-dragging", "");
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const { angle, dist } = angleOf(e);
    let d = angle - drag.current.angle;
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    drag.current.angle = angle;
    if (dist > 18) advance(d); // the angle is unstable right at the centre
  };

  const endDrag = () => {
    drag.current = null;
    root.current?.removeAttribute("data-dragging");
  };

  const onDialRadius = useCallback((px: number) => {
    root.current?.style.setProperty("--dial-r", `${Math.max(px, 70)}px`);
  }, []);
  const onReady = useCallback(() => setReady(true), []);

  const status = !ready
    ? "Initialising vault"
    : phase === "locked"
      ? "Drag in a circle to turn the wheel"
      : "Access granted";

  return (
    <div
      ref={root}
      id="intro-gate"
      role="dialog"
      aria-modal="true"
      aria-label="Intro — turn the vault wheel to enter the site"
      data-cursor
      className={cn(
        "group/gate fixed inset-0 z-[90] touch-none bg-background select-none",
        "transition-opacity duration-700 ease-out-expo",
        phase === "fading" && "pointer-events-none opacity-0",
      )}
      style={{ "--dial-r": "160px" } as CSSProperties}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <noscript>
        <style>{`#intro-gate{display:none}`}</style>
      </noscript>

      <div className={cn("absolute inset-0 transition-opacity duration-1000", ready ? "opacity-100" : "opacity-0")}>
        <GateCanvas ctrl={ctrl} onReady={onReady} onDialRadius={onDialRadius} />
      </div>

      {/* Progress ring, laid over the lock ring of the 3D wheel */}
      <svg
        aria-hidden
        viewBox="-1.2 -1.2 2.4 2.4"
        className={cn(
          "pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700",
          ready && phase === "locked" ? "opacity-100" : "opacity-0",
        )}
        style={{ width: "calc(var(--dial-r) * 2.4)", height: "calc(var(--dial-r) * 2.4)" }}
      >
        <g className="origin-center animate-spin-slow">
          {RING_TICKS.map((i) => (
            <line
              key={i}
              x1="0"
              y1={i % 4 === 0 ? -1.13 : -1.11}
              x2="0"
              y2="-1.07"
              stroke="white"
              strokeOpacity={i % 4 === 0 ? 0.35 : 0.12}
              strokeWidth="0.008"
              transform={`rotate(${i * 7.5})`}
            />
          ))}
        </g>
        <circle r="1.02" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="0.012" />
        <circle
          ref={arc}
          r="1.02"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="0.022"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset="1"
          transform="rotate(-90)"
          style={{ filter: "drop-shadow(0 0 0.04px var(--accent))" }}
        />
        {/* Circular-motion hint */}
        <g className="origin-center animate-[spin_3.2s_linear_infinite] group-data-[dragging]/gate:opacity-0">
          <path d="M 0 -1.02 A 1.02 1.02 0 0 1 0.72 -0.72" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="0.014" strokeLinecap="round" />
          <path d="M 0.62 -0.8 L 0.73 -0.72 L 0.62 -0.64" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="0.014" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>

      {/* HUD */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {["top-5 left-5 border-t border-l", "top-5 right-5 border-t border-r", "bottom-5 left-5 border-b border-l", "bottom-5 right-5 border-b border-r"].map((c) => (
          <span key={c} className={cn("absolute size-6 border-white/20", c)} />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-8 pt-8 md:px-12">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-accent shadow-[0_0_8px_#ff4d30]" />
          <span className="label text-foreground">{profile.shortName}</span>
          <span className="label hidden text-muted sm:inline">/ Secure entry</span>
        </div>
        <span className="label text-muted">
          Vault <span className="text-foreground">01</span>
        </span>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-6 pb-10 text-center">
        <p aria-live="polite" className={cn("label", phase === "locked" ? "text-foreground" : "text-accent")}>
          {status}
          {!ready && <span className="animate-pulse">…</span>}
        </p>
        <p className="font-mono text-[11px] tracking-[0.2em] text-muted uppercase">
          Unlock <span ref={pct} className="text-foreground tabular-nums">000</span>%
          <span className="hidden sm:inline"> · or scroll / press →</span>
        </p>
      </div>

      <button
        type="button"
        onClick={unlock}
        disabled={phase !== "locked"}
        className="label absolute right-8 bottom-9 rounded-full border border-line px-4 py-2 text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-0 md:right-12"
      >
        Skip intro
      </button>
    </div>
  );
}

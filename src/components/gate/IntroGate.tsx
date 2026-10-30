"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLenis } from "lenis/react";
import { Volume2, VolumeX } from "lucide-react";
import { siteConfig } from "@/config/site";
import { profile } from "@/content";
import { gateStore, useGateOpen } from "@/lib/gate";
import { cn } from "@/lib/utils";
import type { GateControl } from "./GateCanvas";
import { sound } from "./sound";

const GateCanvas = dynamic(() => import("./GateCanvas"), { ssr: false });

const FADE_AT = 2900; // ms after release: overlay starts fading (doors are open, camera inside)
const OPEN_AT = 3600; // ms after release: gate removed, hero entrance starts
const SESSION_KEY = "gate-unlocked";
const KEY_SPEED = 2.8; // rad/s while an arrow key is held
const TICK_EVERY = Math.PI / 12; // ratchet click every 15°

type Phase = "locked" | "unlocking" | "fading";

export function IntroGate() {
  const isOpen = useGateOpen();
  if (isOpen) return null;
  return <VaultIntro />;
}

function VaultIntro() {
  const [phase, setPhase] = useState<Phase>("locked");
  const [ready, setReady] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [lowDetail] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const lenis = useLenis();

  const ctrl = useRef<GateControl>({ angle: 0, unlockedAt: null, dial: { x: 0, y: 0, r: 0 } });
  const phaseRef = useRef<Phase>("locked");
  const drag = useRef<{ id: number; last: number; time: number } | null>(null);
  const velocity = useRef(0);
  const keyDir = useRef(0);
  const lastTick = useRef(0);
  const ring = useRef<SVGSVGElement>(null);
  const arc = useRef<SVGCircleElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const target = Math.PI * 2 * siteConfig.gate.turns;

  // Reduced motion and repeat visits skip straight to the site.
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

  const finish = useCallback(() => {
    sound.setEnabled(false);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {}
    gateStore.open();
  }, []);

  const skip = useCallback(() => {
    phaseRef.current = "fading";
    setPhase("fading");
    window.setTimeout(finish, 500);
  }, [finish]);

  const unlock = useCallback(() => {
    if (phaseRef.current !== "locked") return;
    phaseRef.current = "unlocking";
    setPhase("unlocking");
    drag.current = null;
    ctrl.current.unlockedAt = performance.now() / 1000;
    sound.unlock();
    navigator.vibrate?.([30, 50, 70]);
    window.setTimeout(() => {
      phaseRef.current = "fading";
      setPhase("fading");
    }, FADE_AT);
    window.setTimeout(finish, OPEN_AT);
  }, [finish]);

  /** Apply a rotation step (radians, clockwise positive). The wheel never turns back past zero. */
  const turn = useCallback(
    (delta: number) => {
      const c = ctrl.current;
      c.angle = Math.max(0, Math.min(target, c.angle + delta));
      if (Math.abs(c.angle - lastTick.current) >= TICK_EVERY) {
        lastTick.current = c.angle;
        sound.tick();
      }
      if (c.angle >= target) unlock();
    },
    [target, unlock],
  );

  // Inertia, keyboard turning, and the UI ring that follows the wheel on screen.
  useEffect(() => {
    let raf = 0;
    let prev = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - prev) / 1000, 0.1);
      prev = now;
      if (phaseRef.current === "locked") {
        if (keyDir.current) turn(keyDir.current * KEY_SPEED * dt);
        else if (!drag.current && Math.abs(velocity.current) > 0.05) {
          turn(velocity.current * dt);
          velocity.current *= Math.exp(-dt * 4); // heavy wheel coasts briefly
        }
      }
      const { x, y, r } = ctrl.current.dial;
      if (ring.current && r > 0) {
        const size = r * 2.7;
        ring.current.style.transform = `translate(${x - size / 2}px, ${y - size / 2}px)`;
        ring.current.style.width = ring.current.style.height = `${size}px`;
      }
      const p = ctrl.current.angle / target;
      arc.current?.setAttribute("stroke-dashoffset", String(1 - p));
      if (readout.current) readout.current.textContent = `${String(Math.round(p * 360 * siteConfig.gate.turns)).padStart(3, "0")}°`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [target, turn]);

  useEffect(() => {
    const forward = ["ArrowRight", "ArrowDown", "KeyD", "Space", "Enter"];
    const back = ["ArrowLeft", "ArrowUp", "KeyA"];
    const down = (e: KeyboardEvent) => {
      if (e.code === "Escape") return skip();
      if (forward.includes(e.code)) keyDir.current = 1;
      else if (back.includes(e.code)) keyDir.current = -1;
      else return;
      e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      if (forward.includes(e.code) || back.includes(e.code)) keyDir.current = 0;
    };
    const blur = () => (keyDir.current = 0);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [skip]);

  // Drag anywhere: the angle is measured around the wheel's on-screen centre, so it feels like gripping the rim.
  const angleAt = (e: React.PointerEvent) => Math.atan2(e.clientY - ctrl.current.dial.y, e.clientX - ctrl.current.dial.x);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== "locked" || (e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, last: angleAt(e), time: performance.now() };
    velocity.current = 0;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const a = angleAt(e);
    let delta = a - d.last;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    const now = performance.now();
    velocity.current = delta / Math.max((now - d.time) / 1000, 1 / 120);
    d.last = a;
    d.time = now;
    turn(delta);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  };

  const toggleSound = () => {
    sound.setEnabled(!soundOn);
    setSoundOn(!soundOn);
  };

  return (
    <div
      id="intro-gate"
      role="dialog"
      aria-modal="true"
      aria-label="Entry vault. Turn the wheel clockwise to enter the site, or press Escape to skip."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cn(
        "fixed inset-0 z-[90] touch-none overflow-hidden bg-background select-none",
        "transition-opacity duration-700 ease-out",
        phase === "locked" && "cursor-grab active:cursor-grabbing",
        phase === "fading" && "pointer-events-none opacity-0",
      )}
    >
      <noscript>
        <style>{`#intro-gate{display:none}`}</style>
      </noscript>

      <div className={cn("absolute inset-0 transition-opacity duration-1000", ready ? "opacity-100" : "opacity-0")}>
        <GateCanvas controlRef={ctrl} lowDetail={lowDetail} onReady={() => setReady(true)} />
      </div>

      {/* Progress arc around the wheel, positioned every frame from the 3D projection. */}
      <svg
        ref={ring}
        aria-hidden
        viewBox="0 0 100 100"
        className={cn(
          "pointer-events-none absolute top-0 left-0 transition-opacity duration-500",
          ready && phase === "locked" ? "opacity-100" : "opacity-0",
        )}
      >
        <circle cx="50" cy="50" r="48" fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="0.4" />
        {/* Rotated inside the SVG: a CSS rotate would also rotate the per-frame translate. */}
        <circle
          transform="rotate(-90 50 50)"
          ref={arc}
          cx="50"
          cy="50"
          r="48"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="0.8"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1}
        />
      </svg>

      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-6 md:px-12 md:py-8">
        <span className="label text-muted">
          {profile.shortName} <span className="text-accent">{"//"}</span> Vault 01
        </span>
        <div className="pointer-events-auto flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundOn ? "Mute sound" : "Unmute sound"}
            className="flex size-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-white/40 hover:text-foreground"
          >
            {soundOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          </button>
          <button
            type="button"
            onClick={skip}
            className="label rounded-full border border-line px-4 py-2 text-muted transition-colors hover:border-white/40 hover:text-foreground"
          >
            Skip
          </button>
        </div>
      </header>

      <footer className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-8 text-center md:pb-12">
        <span ref={readout} className="font-mono text-xs tracking-widest text-foreground tabular-nums">
          000°
        </span>
        <p
          className={cn(
            "label text-muted transition-opacity duration-500",
            phase === "locked" && ready ? "opacity-100" : "opacity-0",
          )}
        >
          Drag the wheel clockwise to unlock<span className="hidden md:inline"> · or hold →</span>
        </p>
        <p className={cn("label text-accent transition-opacity duration-500", phase === "locked" ? "opacity-0" : "opacity-100")}>
          Access granted
        </p>
      </footer>
    </div>
  );
}

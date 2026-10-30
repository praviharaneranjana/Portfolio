"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLenis } from "lenis/react";
import { Volume2, VolumeX, ShieldAlert, Radio, Crosshair } from "lucide-react";
import { siteConfig } from "@/config/site";
import { profile } from "@/content";
import { gateStore, useGateOpen } from "@/lib/gate";
import { cn } from "@/lib/utils";
import type { GateControl } from "./GateCanvas";
import type { CarInput } from "./RCCar";
import { sound } from "./sound";

const GateCanvas = dynamic(() => import("./GateCanvas"), { ssr: false });

const UNLOCK_ANIMATION_DURATION = 2400; // ms to let the car drive through and doors open
const FADE_AT = 2000;
const SESSION_KEY = "gate-unlocked";

type Phase = "driving" | "bypassing" | "unlocked" | "fading";

export function IntroGate() {
  const isOpen = useGateOpen();
  if (isOpen) return null;
  return <RCGateExperience />;
}

function RCGateExperience() {
  const [phase, setPhase] = useState<Phase>("driving");
  const [ready, setReady] = useState(false);
  const [distance, setDistance] = useState<number>(12.5);
  const [inRange, setInRange] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [hackProgress, setHackProgress] = useState<number>(0);

  // Joystick & Drive controls
  const inputRef = useRef<CarInput>({ forward: 0, turn: 0 });
  const keyState = useRef<{ [key: string]: boolean }>({});
  const joystickBase = useRef<HTMLDivElement>(null);
  const joystickKnob = useRef<HTMLDivElement>(null);
  const joystickActive = useRef(false);
  const joystickTouchId = useRef<number | null>(null);

  const ctrl = useRef<GateControl>({ progress: 0, unlockedAt: null });
  const phaseRef = useRef<Phase>("driving");
  const lenis = useLenis();
  const hadInRange = useRef(false);

  // Reduced-motion visitors and repeat visits
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = siteConfig.gate.oncePerSession && sessionStorage.getItem(SESSION_KEY) === "1";
    if (reduce || seen) {
      gateStore.open();
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  // Freeze page scroll while gate is up
  useEffect(() => {
    const html = document.documentElement;
    html.style.overflow = "hidden";
    lenis?.stop();
    return () => {
      html.style.overflow = "";
      lenis?.start();
    };
  }, [lenis]);

  // Keyboard driving controls
  useEffect(() => {
    const updateKeys = () => {
      if (phaseRef.current !== "driving") return;
      let f = 0;
      let t = 0;
      if (keyState.current["w"] || keyState.current["arrowup"]) f += 1;
      if (keyState.current["s"] || keyState.current["arrowdown"]) f -= 1;
      if (keyState.current["a"] || keyState.current["arrowleft"]) t -= 1;
      if (keyState.current["d"] || keyState.current["arrowright"]) t += 1;

      // If joystick is active, joystick takes priority or blends
      if (!joystickActive.current) {
        inputRef.current.forward = f;
        inputRef.current.turn = t;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keyState.current[k] = true;
      updateKeys();

      // PlayStation Bypass Trigger via Space or E
      if ((k === " " || k === "e" || k === "enter") && inRange && phaseRef.current === "driving") {
        e.preventDefault();
        triggerBypass();
      } else if (k === "escape") {
        skipIntro();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keyState.current[e.key.toLowerCase()] = false;
      updateKeys();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [inRange]);

  // Toggle sound
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.setSoundEnabled(next);
  };

  // Skip straight to site
  const skipIntro = () => {
    sound.stopAll();
    phaseRef.current = "fading";
    setPhase("fading");
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {}
    gateStore.open();
  };

  // Trigger PlayStation-style door bypass
  const triggerBypass = useCallback(() => {
    if (phaseRef.current !== "driving") return;
    phaseRef.current = "bypassing";
    setPhase("bypassing");
    sound.playHackBypass();

    // Hacking progress bar animation
    let p = 0;
    const interval = setInterval(() => {
      p += 0.2;
      setHackProgress(Math.min(1, p));
      if (p >= 1) {
        clearInterval(interval);
        // Gate unlatches and opens
        phaseRef.current = "unlocked";
        setPhase("unlocked");
        ctrl.current.progress = 1;
        ctrl.current.unlockedAt = performance.now() / 1000;

        try {
          sessionStorage.setItem(SESSION_KEY, "1");
        } catch {}

        // Fade overlay and open dashboard
        window.setTimeout(() => {
          phaseRef.current = "fading";
          setPhase("fading");
        }, FADE_AT);

        window.setTimeout(() => {
          sound.stopAll();
          gateStore.open();
        }, UNLOCK_ANIMATION_DURATION);
      }
    }, 80);
  }, []);

  // Distance & Range update from 3D Canvas
  const handleDistanceUpdate = useCallback((dist: number, withinRange: boolean) => {
    setDistance(dist);
    setInRange(withinRange);

    if (withinRange && !hadInRange.current) {
      hadInRange.current = true;
      sound.playPromptAppear();
    } else if (!withinRange && hadInRange.current) {
      hadInRange.current = false;
    }
  }, []);

  // Virtual Joystick Pointer Handlers
  const handleJoystickMove = (clientX: number, clientY: number) => {
    if (!joystickBase.current || !joystickKnob.current) return;
    const rect = joystickBase.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxRadius = rect.width / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    const clampedDist = Math.min(dist, maxRadius);
    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    joystickKnob.current.style.transform = `translate(${knobX}px, ${knobY}px)`;

    // Convert to Car Inputs: forward (-dy / maxRadius), turn (dx / maxRadius)
    const normX = knobX / maxRadius;
    const normY = knobY / maxRadius;

    inputRef.current.forward = -normY;
    inputRef.current.turn = normX;
  };

  const handleJoystickStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    joystickActive.current = true;
    joystickTouchId.current = e.pointerId;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handleJoystickMove(e.clientX, e.clientY);
  };

  const handleJoystickPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!joystickActive.current || e.pointerId !== joystickTouchId.current) return;
    handleJoystickMove(e.clientX, e.clientY);
  };

  const handleJoystickEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== joystickTouchId.current) return;
    joystickActive.current = false;
    joystickTouchId.current = null;
    if (joystickKnob.current) {
      joystickKnob.current.style.transform = "translate(0px, 0px)";
    }
    inputRef.current.forward = 0;
    inputRef.current.turn = 0;
  };

  return (
    <div
      id="intro-gate"
      role="dialog"
      aria-modal="true"
      aria-label="Intro — Drive RC Car to bypass the vault gate"
      className={cn(
        "fixed inset-0 z-[90] touch-none bg-background select-none overflow-hidden",
        "transition-opacity duration-700 ease-out",
        phase === "fading" && "pointer-events-none opacity-0",
      )}
    >
      <noscript>
        <style>{`#intro-gate{display:none}`}</style>
      </noscript>

      {/* 3D R3F Canvas */}
      <div className={cn("absolute inset-0 transition-opacity duration-1000", ready ? "opacity-100" : "opacity-0")}>
        <GateCanvas
          ctrl={ctrl}
          inputRef={inputRef}
          onDistanceUpdate={handleDistanceUpdate}
          isBypassing={phase === "bypassing"}
          isUnlocked={phase === "unlocked"}
          onReady={() => setReady(true)}
        />
      </div>

      {/* TACTICAL GAME HUD (PlayStation / Action Game Style) */}

      {/* Top Telemetry Bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-6 md:p-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 backdrop-blur-md">
            <span className="size-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ff0000]" />
            <span className="font-mono text-[11px] tracking-wider text-white uppercase">RECON RC-01</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 font-mono text-[11px] text-zinc-400 backdrop-blur-md">
            <Radio className="size-3 text-cyan-400 animate-pulse" />
            <span>LINK 99.8%</span>
          </div>
        </div>

        {/* Center Target Proximity Meter */}
        <div className="hidden md:flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-black/50 px-6 py-2 backdrop-blur-md">
          <span className="font-mono text-[10px] tracking-widest text-zinc-400 uppercase">VAULT PROXIMITY</span>
          <div className="flex items-center gap-2">
            <Crosshair className={cn("size-3.5 transition-colors", inRange ? "text-cyan-400 animate-spin" : "text-zinc-500")} />
            <span className={cn("font-mono text-base font-bold tabular-nums", inRange ? "text-cyan-400" : "text-white")}>
              {distance.toFixed(1)}m
            </span>
          </div>
        </div>

        {/* Top Right Controls: Audio & Skip */}
        <div className="pointer-events-auto flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundEnabled ? "Mute audio" : "Unmute audio"}
            className="flex size-10 items-center justify-center rounded-full border border-white/15 bg-black/40 text-zinc-300 backdrop-blur-md transition-colors hover:border-cyan-400 hover:text-white"
          >
            {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4 text-zinc-500" />}
          </button>

          <button
            type="button"
            onClick={skipIntro}
            className="label rounded-full border border-white/15 bg-black/40 px-4 py-2 text-zinc-300 backdrop-blur-md transition-all hover:border-accent hover:text-white hover:shadow-[0_0_12px_rgba(255,77,48,0.3)]"
          >
            Skip intro
          </button>
        </div>
      </header>

      {/* Crosshair Center Reticle */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-25">
        <div className="size-16 rounded-full border border-dashed border-white/40" />
      </div>

      {/* Screen Corner Framing Accents */}
      <div aria-hidden className="pointer-events-none absolute inset-0 p-4 md:p-6">
        <span className="absolute top-4 left-4 size-6 border-t-2 border-l-2 border-cyan-500/40" />
        <span className="absolute top-4 right-4 size-6 border-t-2 border-r-2 border-cyan-500/40" />
        <span className="absolute bottom-4 left-4 size-6 border-b-2 border-l-2 border-cyan-500/40" />
        <span className="absolute bottom-4 right-4 size-6 border-b-2 border-r-2 border-cyan-500/40" />
      </div>

      {/* BOTTOM LEFT: VIRTUAL ANALOG JOYSTICK */}
      <div className="absolute bottom-8 left-8 z-30 select-none">
        <div
          ref={joystickBase}
          onPointerDown={handleJoystickStart}
          onPointerMove={handleJoystickPointerMove}
          onPointerUp={handleJoystickEnd}
          onPointerCancel={handleJoystickEnd}
          className="relative flex size-28 items-center justify-center rounded-full border-2 border-white/20 bg-black/60 shadow-[0_0_20px_rgba(0,0,0,0.8)] backdrop-blur-md cursor-grab active:cursor-grabbing md:size-32"
        >
          {/* Axis crosshair lines */}
          <div className="pointer-events-none absolute h-full w-px bg-white/10" />
          <div className="pointer-events-none absolute h-px w-full bg-white/10" />
          <div className="pointer-events-none absolute size-14 rounded-full border border-white/10" />

          {/* Dynamic Thumbstick Knob */}
          <div
            ref={joystickKnob}
            className="pointer-events-none absolute flex size-12 items-center justify-center rounded-full border-2 border-cyan-400 bg-zinc-800 shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-transform duration-75"
          >
            <div className="size-3 rounded-full bg-cyan-400" />
          </div>
        </div>
        <p className="mt-2 text-center font-mono text-[10px] tracking-wider text-zinc-400 uppercase">
          JOYSTICK / WASD
        </p>
      </div>

      {/* BOTTOM RIGHT: PLAYSTATION-STYLE ACTION PROMPT */}
      <div className="absolute bottom-8 right-8 z-30 flex flex-col items-end gap-3">
        {/* Drive Instructions Hint (when far from gate) */}
        {!inRange && phase === "driving" && (
          <div className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 backdrop-blur-md">
            <p className="font-mono text-xs text-zinc-300">
              DRIVE FORWARD TO VAULT GATE
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-zinc-500">
              KEYBOARD [W,A,S,D] OR VIRTUAL JOYSTICK
            </p>
          </div>
        )}

        {/* PLAYSTATION BUTTON PROMPT (Appears when near gate!) */}
        {inRange && phase === "driving" && (
          <button
            type="button"
            onClick={triggerBypass}
            className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border-2 border-cyan-400 bg-black/85 px-6 py-4 shadow-[0_0_30px_rgba(0,240,255,0.4)] backdrop-blur-lg transition-all duration-300 hover:scale-105 hover:border-white hover:shadow-[0_0_40px_rgba(0,240,255,0.7)] active:scale-95"
          >
            {/* Background cyber scan line */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/15 to-transparent animate-[shimmer_2s_infinite]" />

            {/* PlayStation Square Button Glyph */}
            <div className="relative flex size-10 items-center justify-center rounded-xl border-2 border-pink-400 bg-pink-500/20 shadow-[0_0_15px_#ff69b4]">
              {/* PlayStation Square Icon */}
              <div className="size-4.5 rounded-[3px] border-2 border-pink-300 shadow-[0_0_6px_#ff69b4]" />
            </div>

            <div className="flex flex-col text-left">
              <span className="font-mono text-sm font-bold tracking-wider text-white uppercase group-hover:text-cyan-300">
                HOLD [ ▢ ] TO BYPASS GATE
              </span>
              <span className="font-mono text-[10px] tracking-widest text-cyan-400">
                OR PRESS [SPACE / E] · CLICK TO HACK
              </span>
            </div>
          </button>
        )}

        {/* Hacking / Bypassing Progress State */}
        {phase === "bypassing" && (
          <div className="flex flex-col items-end gap-2 rounded-2xl border-2 border-cyan-400 bg-black/90 p-5 shadow-[0_0_35px_rgba(0,240,255,0.6)] backdrop-blur-lg">
            <div className="flex items-center gap-3">
              <div className="size-3 rounded-full bg-cyan-400 animate-ping" />
              <span className="font-mono text-sm font-bold tracking-wider text-cyan-300 uppercase">
                BYPASSING VAULT MATRIX...
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-64 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-100 shadow-[0_0_10px_#00f0ff]"
                style={{ width: `${hackProgress * 100}%` }}
              />
            </div>
            <span className="font-mono text-[11px] text-zinc-400">
              OVERRIDE: {Math.round(hackProgress * 100)}%
            </span>
          </div>
        )}

        {/* Unlocked / Granted State */}
        {phase === "unlocked" && (
          <div className="flex items-center gap-3 rounded-2xl border-2 border-emerald-400 bg-black/90 px-6 py-4 shadow-[0_0_35px_rgba(52,211,153,0.7)] backdrop-blur-lg animate-bounce">
            <ShieldAlert className="size-5 text-emerald-400" />
            <span className="font-mono text-sm font-bold tracking-wider text-emerald-300 uppercase">
              SECURITY OVERRIDDEN — ENTERING
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

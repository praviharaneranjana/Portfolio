"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLenis } from "lenis/react";
import { Volume2, VolumeX, ShieldCheck } from "lucide-react";
import { siteConfig } from "@/config/site";
import { gateStore, useGateOpen } from "@/lib/gate";
import { cn } from "@/lib/utils";
import type { GateControl } from "./GateCanvas";
import type { CarInput } from "./RCCar";
import { sound } from "./sound";

const GateCanvas = dynamic(() => import("./GateCanvas"), { ssr: false });

const UNLOCK_ANIMATION_DURATION = 4200; // ms to let the car drive through the gate into the Door to Eternity
const FADE_AT = 3500;
const SESSION_KEY = "gate-unlocked";
const HOLD_DURATION_MS = 650; // ms required to hold the PlayStation button to bypass

type Phase = "driving" | "unlocked" | "fading";

export function IntroGate() {
  const isOpen = useGateOpen();
  if (isOpen) return null;
  return <RCGateExperience />;
}

function RCGateExperience() {
  const [phase, setPhase] = useState<Phase>("driving");
  const [ready, setReady] = useState(false);
  const [distance, setDistance] = useState<number>(12.0);
  const [inRange, setInRange] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [isHolding, setIsHolding] = useState<boolean>(false);

  // Driving controls
  const inputRef = useRef<CarInput>({ forward: 0, turn: 0 });
  const keyState = useRef<{ [code: string]: boolean }>({});
  const joystickBase = useRef<HTMLDivElement>(null);
  const joystickKnob = useRef<HTMLDivElement>(null);
  const joystickActive = useRef(false);
  const joystickTouchId = useRef<number | null>(null);

  const ctrl = useRef<GateControl>({ progress: 0, unlockedAt: null });
  const phaseRef = useRef<Phase>("driving");
  const inRangeRef = useRef(false);
  const isHoldingRef = useRef(false);
  const holdStartRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const lenis = useLenis();
  const hadInRange = useRef(false);

  // Reduced motion and repeat visits
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = siteConfig.gate.oncePerSession && sessionStorage.getItem(SESSION_KEY) === "1";
    if (reduce || seen) {
      gateStore.open();
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  // Freeze page scroll
  useEffect(() => {
    const html = document.documentElement;
    html.style.overflow = "hidden";
    lenis?.stop();
    return () => {
      html.style.overflow = "";
      lenis?.start();
    };
  }, [lenis]);

  // Robust keyboard driving controls (using e.code for universal layout support)
  useEffect(() => {
    const updateDriveInputs = () => {
      if (phaseRef.current !== "driving") return;
      let forward = 0;
      let turn = 0;

      const keys = keyState.current;
      if (keys["KeyW"] || keys["ArrowUp"]) forward += 1;
      if (keys["KeyS"] || keys["ArrowDown"]) forward -= 1;
      if (keys["KeyA"] || keys["ArrowLeft"]) turn -= 1;
      if (keys["KeyD"] || keys["ArrowRight"]) turn += 1;

      if (!joystickActive.current) {
        inputRef.current.forward = forward;
        inputRef.current.turn = turn;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      keyState.current[e.code] = true;
      updateDriveInputs();

      // Holding Space / E for PlayStation bypass prompt
      if ((e.code === "Space" || e.code === "KeyE") && inRangeRef.current && phaseRef.current === "driving") {
        e.preventDefault();
        startHold();
      } else if (e.code === "Escape") {
        skipIntro();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keyState.current[e.code] = false;
      updateDriveInputs();

      if (e.code === "Space" || e.code === "KeyE") {
        endHold();
      }
    };

    const onBlur = () => {
      keyState.current = {};
      inputRef.current.forward = 0;
      inputRef.current.turn = 0;
      endHold();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.setSoundEnabled(next);
  };

  const skipIntro = () => {
    sound.stopAll();
    phaseRef.current = "fading";
    setPhase("fading");
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {}
    gateStore.open();
  };

  // Trigger Door Bypass & Opening Sequence
  const executeBypass = useCallback(() => {
    if (phaseRef.current !== "driving") return;
    phaseRef.current = "unlocked";
    setPhase("unlocked");
    setIsHolding(false);
    isHoldingRef.current = false;

    // Haptic feedback if supported
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([40, 60, 80]);
    }

    sound.playUnlockSequence();

    // Start gate opening timeline
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
  }, []);

  // Hold mechanic animation loop
  const startHold = useCallback(() => {
    if (phaseRef.current !== "driving" || !inRangeRef.current || isHoldingRef.current) return;
    isHoldingRef.current = true;
    setIsHolding(true);
    holdStartRef.current = performance.now();
  }, []);

  const endHold = useCallback(() => {
    isHoldingRef.current = false;
    setIsHolding(false);
    holdStartRef.current = null;
    setHoldProgress(0);
  }, []);

  useEffect(() => {
    if (!isHolding) return;
    let animId: number;
    const tick = (now: number) => {
      if (!isHoldingRef.current || !holdStartRef.current) return;
      const elapsed = now - holdStartRef.current;
      const progress = Math.min(1, elapsed / HOLD_DURATION_MS);
      setHoldProgress(progress);

      if (progress >= 1) {
        executeBypass();
      } else {
        animId = requestAnimationFrame(tick);
      }
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isHolding, executeBypass]);

  // Distance & Range update from 3D Canvas
  const handleDistanceUpdate = useCallback((dist: number, withinRange: boolean) => {
    setDistance(dist);
    setInRange(withinRange);
    inRangeRef.current = withinRange;

    if (withinRange && !hadInRange.current) {
      hadInRange.current = true;
      sound.playPromptAppear();
    } else if (!withinRange && hadInRange.current) {
      hadInRange.current = false;
      endHold();
    }
  }, [endHold]);

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

  // Circular progress ring circumference calculation for r=19
  const radius = 19;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - holdProgress);

  return (
    <div
      ref={rootRef}
      id="intro-gate"
      role="dialog"
      aria-modal="true"
      tabIndex={0}
      aria-label="Tactical Drone Entry — Drive to the vault gate and bypass access"
      className={cn(
        "fixed inset-0 z-[90] touch-none bg-background select-none overflow-hidden",
        "transition-opacity duration-700 ease-out",
        phase === "fading" && "pointer-events-none opacity-0",
      )}
    >
      <noscript>
        <style>{`#intro-gate{display:none}`}</style>
      </noscript>

      {/* 3D Scene Canvas */}
      <div className={cn("absolute inset-0 transition-opacity duration-1000", ready ? "opacity-100" : "opacity-0")}>
        <GateCanvas
          ctrl={ctrl}
          inputRef={inputRef}
          onDistanceUpdate={handleDistanceUpdate}
          isBypassing={isHolding}
          isUnlocked={phase === "unlocked"}
          onReady={() => setReady(true)}
        />
      </div>

      {/* TOP HUD BAR (Clean, non-intrusive military telemetry) */}
      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1 backdrop-blur-md">
            <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            <span className="font-mono text-[10px] sm:text-xs font-semibold tracking-wider text-zinc-200 uppercase">
              UGV RECON-01
            </span>
          </div>

          {/* Vault Proximity Distance */}
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 px-3 py-1 font-mono text-[10px] sm:text-xs backdrop-blur-md">
            <span className="text-zinc-500 uppercase tracking-wider hidden xs:inline">GATE:</span>
            <span className={cn("font-bold tabular-nums", inRange ? "text-cyan-400" : "text-zinc-300")}>
              {distance.toFixed(1)}m
            </span>
          </div>
        </div>

        {/* Audio Toggle & Skip Intro */}
        <div className="pointer-events-auto flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundEnabled ? "Mute audio" : "Unmute audio"}
            className="flex size-8 sm:size-9 items-center justify-center rounded-full border border-white/15 bg-black/50 text-zinc-300 backdrop-blur-md transition-colors hover:border-white hover:text-white"
          >
            {soundEnabled ? <Volume2 className="size-3.5 sm:size-4" /> : <VolumeX className="size-3.5 sm:size-4 text-zinc-500" />}
          </button>

          <button
            type="button"
            onClick={skipIntro}
            className="rounded-full border border-white/15 bg-black/50 px-3.5 py-1.5 font-mono text-[10px] sm:text-xs text-zinc-300 backdrop-blur-md transition-colors hover:border-white hover:text-white"
          >
            Skip
          </button>
        </div>
      </header>

      {/* MOBILE SAFE ZONE: Notification positioned at TOP-CENTER on mobile, BOTTOM-RIGHT on desktop */}
      <div className={cn(
        "absolute z-30 transition-all duration-300",
        // Mobile: top-20 centered; Desktop: bottom-8 right-8
        "top-16 inset-x-0 mx-auto flex justify-center sm:top-auto sm:bottom-8 sm:inset-x-auto sm:right-8 sm:mx-0"
      )}>
        {/* Drive Instruction Badge when far from gate */}
        {!inRange && phase === "driving" && (
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/75 px-4 py-2 shadow-lg backdrop-blur-md">
            <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <p className="font-mono text-[11px] sm:text-xs text-zinc-300 tracking-wide uppercase">
              Drive forward to vault gate
            </p>
          </div>
        )}

        {/* AUTHENTIC PLAYSTATION ACTION PROMPT (Appears when in range) */}
        {inRange && phase === "driving" && (
          <button
            type="button"
            onPointerDown={startHold}
            onPointerUp={endHold}
            onPointerCancel={endHold}
            onPointerLeave={endHold}
            className={cn(
              "group relative flex items-center gap-3.5 rounded-full border border-white/20 bg-zinc-950/90 px-4 py-2.5 shadow-[0_0_25px_rgba(0,0,0,0.8)] backdrop-blur-lg cursor-pointer transition-all active:scale-95 sm:px-5 sm:py-3",
              isHolding && "border-cyan-400 shadow-[0_0_25px_rgba(56,189,248,0.3)]"
            )}
          >
            {/* PlayStation Square Button with Circular Hold Progress Ring */}
            <div className="relative flex size-10 items-center justify-center">
              {/* Circular SVG Progress Ring */}
              <svg className="size-10 -rotate-90 origin-center" viewBox="0 0 44 44">
                {/* Background Ring Track */}
                <circle
                  cx="22"
                  cy="22"
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth="2.5"
                />
                {/* Active Progress Fill */}
                <circle
                  cx="22"
                  cy="22"
                  r={radius}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-[stroke-dashoffset] duration-75 ease-linear"
                />
              </svg>

              {/* PlayStation Square Icon inside */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="size-3.5 rounded-[2.5px] border-[2px] border-white group-hover:border-cyan-300" />
              </div>
            </div>

            {/* Prompt Label */}
            <div className="flex flex-col text-left">
              <span className="font-sans text-xs sm:text-sm font-bold tracking-wider text-white uppercase group-hover:text-cyan-300">
                HOLD TO BYPASS
              </span>
              <span className="font-mono text-[9px] sm:text-[10px] tracking-widest text-zinc-400">
                HOLD [ ▢ ] OR [SPACE]
              </span>
            </div>
          </button>
        )}

        {/* Unlocking / Access Granted Status */}
        {phase === "unlocked" && (
          <div className="flex items-center gap-2.5 rounded-full border border-cyan-400/40 bg-zinc-950/90 px-5 py-2.5 shadow-[0_0_30px_rgba(56,189,248,0.35)] backdrop-blur-md">
            <span className="size-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-mono text-xs sm:text-sm font-bold tracking-wider text-cyan-300 uppercase">
              ENTERING DOOR TO ETERNITY
            </span>
          </div>
        )}
      </div>

      {/* VIRTUAL ANALOG JOYSTICK (Bottom-Left, sized appropriately for mobile & desktop) */}
      <div className="absolute bottom-6 left-6 z-20 select-none sm:bottom-8 sm:left-8">
        <div
          ref={joystickBase}
          onPointerDown={handleJoystickStart}
          onPointerMove={handleJoystickPointerMove}
          onPointerUp={handleJoystickEnd}
          onPointerCancel={handleJoystickEnd}
          className="relative flex size-24 sm:size-28 items-center justify-center rounded-full border border-white/20 bg-black/50 shadow-2xl backdrop-blur-md cursor-grab active:cursor-grabbing"
        >
          {/* Subtle axis guides */}
          <div className="pointer-events-none absolute h-full w-px bg-white/10" />
          <div className="pointer-events-none absolute h-px w-full bg-white/10" />
          <div className="pointer-events-none absolute size-10 sm:size-12 rounded-full border border-white/10" />

          {/* Joystick Thumb Knob */}
          <div
            ref={joystickKnob}
            className="pointer-events-none absolute flex size-10 sm:size-11 items-center justify-center rounded-full border border-white/30 bg-zinc-800 shadow-md transition-transform duration-75"
          >
            <div className="size-2.5 rounded-full bg-zinc-300" />
          </div>
        </div>
        <p className="mt-1.5 text-center font-mono text-[9px] sm:text-[10px] tracking-widest text-zinc-500 uppercase">
          JOYSTICK / WASD
        </p>
      </div>
    </div>
  );
}

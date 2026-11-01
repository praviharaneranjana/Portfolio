"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { profile } from "@/content";
import { intro } from "@/lib/gate";
import { LiveClock } from "../contact/LiveClock";

type TabId = "telemetry" | "stack" | "clearance";

const METRICS = [
  { label: "Query latency", value: "−95%", detail: "High-volume SaaS DB rewrites" },
  { label: "OOM incidents", value: "3 → 0", detail: "Zero memory leak crashes in prod" },
  { label: "Architecture", value: "~130", detail: "Legacy enterprise pages modernized" },
  { label: "AI Precision", value: "0.73 AUC", detail: "XGBoost clinic no-show model" },
];

const RUNTIMES = [
  { name: ".NET 9 / C# 13", domain: "Enterprise Core", role: "SaaS backend, async queries, multitenancy" },
  { name: "Unity 6 / C#", domain: "Realtime 3D", role: "Physics engines, procedural math, gameplay systems" },
  { name: "Next.js / Three.js", domain: "Applied Web", role: "React 19, R3F shaders, client-side 3D viewports" },
  { name: "Python / ML", domain: "Predictive AI", role: "XGBoost classifiers, SHAP explainability pipelines" },
];

export function HeroDashboard({ trigger = true }: { trigger?: boolean }) {
  const [activeTab, setActiveTab] = useState<TabId>("telemetry");

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={trigger ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.9, delay: intro.text + 0.6, ease: [0.16, 1, 0.3, 1] }}
      data-ball-floor
      className="glass mt-12 rounded-2xl border border-line p-5 md:p-6"
    >
      {/* Top Telemetry Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-accent">
            <span className="size-1.5 animate-pulse rounded-full bg-accent" />
            <span className="font-mono text-[10.5px] font-semibold tracking-wider uppercase">
              SYS.STATUS: ONLINE // UNLOCKED
            </span>
          </div>

          <span className="hidden h-3 w-px bg-white/10 sm:block" />

          <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
            <span className="text-zinc-500">HOMAGAMA, LK:</span>
            <span className="font-semibold text-foreground">
              <LiveClock timeZone={profile.timezone} />
            </span>
            <span className="text-zinc-500">(UTC+05:30)</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 rounded-lg border border-line bg-black/40 p-1 font-mono text-[10.5px]">
          {(
            [
              { id: "telemetry", label: "Production Metrics" },
              { id: "stack", label: "Core Runtimes" },
              { id: "clearance", label: "Clearance / Ops" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-2.5 py-1 transition-all ${
                activeTab === tab.id
                  ? "bg-white/10 font-medium text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Panels */}
      <div className="pt-5">
        <AnimatePresence mode="wait">
          {activeTab === "telemetry" && (
            <motion.div
              key="telemetry"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
              {METRICS.map((m) => (
                <div
                  key={m.label}
                  data-ball-floor
                  className="group rounded-xl border border-line/60 bg-white/[0.02] p-3.5 transition-colors hover:border-accent/40 hover:bg-white/[0.04]"
                >
                  <span className="block font-mono text-[10px] tracking-wider text-muted uppercase">{m.label}</span>
                  <span className="mt-1 block font-mono text-xl font-semibold tracking-tight text-foreground transition-colors group-hover:text-accent">
                    {m.value}
                  </span>
                  <span className="mt-1 block text-xs text-zinc-400">{m.detail}</span>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === "stack" && (
            <motion.div
              key="stack"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
            >
              {RUNTIMES.map((r) => (
                <div
                  key={r.name}
                  data-ball-floor
                  className="rounded-xl border border-line/60 bg-white/[0.02] p-3.5 transition-colors hover:border-line"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-foreground">{r.name}</span>
                    <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-accent">
                      {r.domain}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted">{r.role}</p>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === "clearance" && (
            <motion.div
              key="clearance"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-foreground uppercase">Availability Status:</span>
                  <span className="font-mono text-xs font-semibold text-accent">{profile.availability}</span>
                </div>
                <p className="text-xs text-muted">
                  Open for software engineering roles in enterprise SaaS (.NET), full-stack architecture, and interactive
                  applications.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="#terminal"
                  className="label inline-flex items-center gap-1.5 rounded-lg border border-line bg-white/5 px-3 py-2 text-foreground transition-colors hover:border-accent hover:text-accent"
                >
                  <span>&gt;_</span> Open Terminal
                </a>
                <a
                  href="#contact"
                  className="label inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-white transition-opacity hover:opacity-90"
                >
                  Initiate Handshake ↗
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { profile } from "@/content";
import { commands, quickCommands } from "./commands";

type Line = { kind: "cmd" | "out" | "err"; text: string };

const intro: Line[] = [
  { kind: "out", text: "// pravihara.dev interactive shell — type 'help' to list commands" },
];

export function Terminal() {
  const [lines, setLines] = useState<Line[]>(intro);
  const [value, setValue] = useState("");
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    body.current?.scrollTo({ top: body.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  const run = (raw: string) => {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return;
    if (cmd === "clear") return setLines([]);

    const handler = commands[cmd];
    const output: Line[] = handler
      ? handler().map((text) => ({ kind: "out" as const, text }))
      : [{ kind: "err", text: `command not found: ${cmd}. Type 'help'.` }];
    setLines((l) => [...l, { kind: "cmd", text: cmd }, ...output]);

    if (cmd === "cv" && profile.resumeUrl) window.open(profile.resumeUrl, "_blank");
    if (cmd === "sudo hire pravihara") setTimeout(() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }), 900);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    run(value);
    setValue("");
  };

  return (
    <div className="max-w-4xl overflow-hidden rounded-2xl border border-line bg-background font-mono text-xs shadow-2xl">
      <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-[#ff5f56]" />
          <span className="size-3 rounded-full bg-[#ffbd2e]" />
          <span className="size-3 rounded-full bg-[#27c93f]" />
          <span className="ml-3 text-[11px] text-muted">pravihara@portfolio ~ %</span>
        </div>
        <span className="text-[10px] text-emerald-400 uppercase">● online</span>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-line bg-white/[0.02] p-3 text-[11px]">
        <span className="mr-2 self-center text-muted">QUICK EXEC:</span>
        {quickCommands.map((c) => (
          <button
            key={c}
            onClick={() => run(c)}
            className="rounded border border-line bg-white/5 px-2.5 py-1 text-foreground transition hover:border-accent/50 hover:text-accent"
          >
            {c}
          </button>
        ))}
      </div>

      <div ref={body} data-lenis-prevent className="h-72 space-y-1 overflow-y-auto p-6 leading-relaxed whitespace-pre-wrap">
        {lines.map((l, i) => (
          <div key={i} className={l.kind === "cmd" ? "pt-2 text-accent" : l.kind === "err" ? "text-red-400" : "text-zinc-300"}>
            {l.kind === "cmd" ? `> ${l.text}` : l.text}
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="flex items-center gap-3 border-t border-line bg-surface/50 px-6 py-4">
        <span className="font-bold text-accent">&gt;</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="type a command — try 'help'"
          aria-label="Terminal command"
          className="w-full bg-transparent text-foreground placeholder-zinc-600 outline-none"
          autoComplete="off"
          spellCheck={false}
        />
      </form>
    </div>
  );
}

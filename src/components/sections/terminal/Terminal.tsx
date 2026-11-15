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
    <div data-ball-floor className="max-w-4xl overflow-hidden rounded-2xl border border-line bg-background font-mono text-xs shadow-[0_24px_48px_-16px_rgb(0_0_0/0.6)]">
      <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="ml-3 text-xs text-muted">pravihara@portfolio ~ %</span>
        </div>
        <span className="text-xs text-muted">zsh</span>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-line bg-white/2 p-3 text-xs">
        <span className="mr-2 self-center text-muted">Try:</span>
        {quickCommands.map((c) => (
          <button
            key={c}
            onClick={() => run(c)}
            className="h-8 rounded-md border border-line bg-white/4 px-3 text-foreground transition-colors duration-150 hover:border-white/24"
          >
            {c}
          </button>
        ))}
      </div>

      <div ref={body} data-lenis-prevent className="h-72 space-y-1 overflow-y-auto p-6 leading-relaxed whitespace-pre-wrap">
        {lines.map((l, i) => (
          <div key={i} className={l.kind === "cmd" ? "pt-2 text-accent" : l.kind === "err" ? "text-red-400" : "text-secondary"}>
            {l.kind === "cmd" ? `> ${l.text}` : l.text}
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="flex items-center gap-3 border-t border-line bg-surface/50 px-6 py-4">
        <span className="font-medium text-accent">&gt;</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="type a command — try 'help'"
          aria-label="Terminal command"
          className="w-full bg-transparent text-base text-foreground placeholder:text-muted/70 outline-none sm:text-xs"
          autoComplete="off"
          spellCheck={false}
        />
      </form>
    </div>
  );
}

/** Short labels drawn as a node diagram; the last node is highlighted coral. */
export function Pipeline({ steps }: { steps: string[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-y-3">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center">
          <span
            className={
              i === steps.length - 1
                ? "rounded-md border border-accent/40 bg-accent/10 px-2.5 py-2 font-mono text-[10px] text-accent uppercase"
                : "rounded-md border border-line bg-surface px-2.5 py-2 font-mono text-[10px] text-zinc-300 uppercase"
            }
          >
            {s}
          </span>
          {i < steps.length - 1 && <span className="h-px w-5 bg-gradient-to-r from-white/30 to-accent/60" />}
        </div>
      ))}
    </div>
  );
}

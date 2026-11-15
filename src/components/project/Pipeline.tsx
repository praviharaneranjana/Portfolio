/** Short labels drawn as a node diagram; the last node is highlighted in the accent colour. */
export function Pipeline({ steps }: { steps: string[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-y-3">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center">
          <span
            className={
              i === steps.length - 1
                ? "rounded-md border border-accent/30 bg-accent/10 px-3 py-2 font-mono text-xs text-accent"
                : "rounded-md border border-line bg-surface px-3 py-2 font-mono text-xs text-secondary"
            }
          >
            {s}
          </span>
          {i < steps.length - 1 && <span className="h-px w-5 bg-white/20" />}
        </div>
      ))}
    </div>
  );
}

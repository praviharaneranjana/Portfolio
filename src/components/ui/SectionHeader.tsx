import { MaskLines, Reveal } from "./Reveal";

export function SectionHeader({ index, label, title, aside }: { index: string; label: string; title: string; aside?: string }) {
  return (
    <div className="mb-16 flex flex-col justify-between gap-6 border-b border-line pb-8 md:flex-row md:items-end">
      <div>
        <Reveal>
          <p className="label text-accent">
            {`${index} // ${label}`}
          </p>
        </Reveal>
        <h2 className="mt-4 text-4xl font-medium tracking-tight md:text-6xl">
          <MaskLines lines={[{ text: title }]} />
        </h2>
      </div>
      {aside && (
        <Reveal delay={0.15} className="max-w-sm font-mono text-sm leading-relaxed text-muted">
          {aside}
        </Reveal>
      )}
    </div>
  );
}

import { MaskLines, Reveal } from "./Reveal";

export function SectionHeader({ index, label, title, aside }: { index: string; label: string; title: string; aside?: string }) {
  return (
    <div className="mb-10 flex flex-col justify-between gap-5 border-b border-line pb-6 md:mb-16 md:gap-6 md:pb-8 md:flex-row md:items-end">
      <div>
        <Reveal>
          <p data-ball-floor className="label text-accent">
            {`${index} // ${label}`}
          </p>
        </Reveal>
        <h2 data-ball-floor className="mt-4 text-4xl leading-[1.1] font-medium tracking-[-0.02em] md:text-6xl md:tracking-[-0.03em]">
          <MaskLines lines={[{ text: title }]} />
        </h2>
      </div>
      {aside && (
        <Reveal delay={0.15} className="max-w-sm text-[15px] leading-relaxed text-secondary">
          <p data-ball-floor>{aside}</p>
        </Reveal>
      )}
    </div>
  );
}

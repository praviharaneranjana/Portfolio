import { capabilities, skills } from "@/content";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";

export function Capabilities() {
  return (
    <section id="capabilities" className="mx-auto max-w-[1440px] scroll-mt-20 border-b border-line px-6 py-28 md:px-12">
      <SectionHeader
        index="03"
        label="Capabilities"
        title="Range, with depth."
        aside="Four domains I work across — one engineering discipline underneath all of them."
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {capabilities.map((c, i) => (
          <Reveal key={c.code} delay={i * 0.08} className="h-full">
            <div className="flex h-full flex-col justify-between rounded-2xl border border-line bg-surface p-8 transition-colors duration-300 hover:border-accent/50">
              <div>
                <span className="font-mono text-xs text-muted uppercase">
                  {c.code} / {c.domain}
                </span>
                <h3 className="mt-5 mb-3 text-xl font-medium tracking-tight">{c.title}</h3>
                <p className="mb-8 text-sm leading-relaxed font-light text-zinc-400">{c.description}</p>
              </div>
              <ul className="space-y-2 border-t border-line pt-5 font-mono text-[11px] text-zinc-400">
                {c.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-accent">/</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="mt-20">
        <Reveal>
          <p className="label mb-6 text-muted">Full toolkit</p>
        </Reveal>
        <dl className="border-t border-line">
          {skills.map((g, i) => (
            <Reveal key={g.title} delay={i * 0.04}>
              <div className="grid grid-cols-1 gap-2 border-b border-line py-4 md:grid-cols-12">
                <dt className="font-mono text-[11px] tracking-wider text-muted uppercase md:col-span-3">{g.title}</dt>
                <dd className="text-sm text-zinc-300 md:col-span-9">{g.items.join("  ·  ")}</dd>
              </div>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}

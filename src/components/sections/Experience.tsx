import { experience } from "@/content";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { Badge } from "@/components/ui/Badge";

export function Experience() {
  return (
    <section id="experience" className="mx-auto max-w-[1440px] scroll-mt-20 border-b border-line px-6 py-28 md:px-12">
      <SectionHeader index="02" label="Experience" title="Where I ship." />

      {experience.map((job) => (
        <Reveal key={job.company + job.period}>
          <article className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="space-y-2 font-mono text-xs tracking-wider text-muted uppercase lg:col-span-3">
              <p className="text-foreground">{job.period}</p>
              <p>{job.location}</p>
              {job.note && <p className="pt-2 text-[10px] leading-relaxed normal-case">{job.note}</p>}
            </div>

            <div className="lg:col-span-6">
              <h3 className="text-3xl font-medium tracking-tight">{job.role}</h3>
              <p className="mt-1 text-lg text-muted">{job.company}</p>
              {job.project && <p className="mt-6 border-l border-accent pl-4 text-sm text-zinc-300">{job.project}</p>}
              <ul className="mt-8 space-y-3 text-[15px] leading-relaxed font-light text-zinc-400">
                {job.highlights.map((h) => (
                  <li key={h} className="flex gap-3">
                    <span className="font-mono text-accent">/</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-2">
                {job.stack.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
            </div>

            {job.metrics && (
              <div className="grid grid-cols-3 gap-4 self-start lg:col-span-3 lg:grid-cols-1">
                {job.metrics.map((m) => (
                  <div key={m.label} className="rounded-xl border border-line bg-surface p-5">
                    <p className="text-3xl font-medium tracking-tight md:text-4xl">{m.value}</p>
                    <p className="mt-1 font-mono text-[10px] tracking-wider text-muted uppercase">{m.label}</p>
                  </div>
                ))}
              </div>
            )}
          </article>
        </Reveal>
      ))}
    </section>
  );
}

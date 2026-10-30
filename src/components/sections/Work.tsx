import { projects } from "@/content";
import type { Project } from "@/types/content";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { Badge } from "@/components/ui/Badge";

const categoryLabel: Record<Project["category"], string> = {
  web: "Web Platform",
  ai: "Applied AI",
  mobile: "Mobile",
  game: "Game Dev",
  design: "UI/UX",
};

function Pipeline({ steps }: { steps: string[] }) {
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

function Dossier({ project, index }: { project: Project; index: number }) {
  return (
    <article data-ball-floor className="group relative overflow-hidden rounded-2xl border border-line bg-surface p-8 transition-colors duration-500 hover:border-white/25 hover:bg-surface-elevated md:p-12">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 font-mono text-xs text-muted">{String(index + 1).padStart(2, "0")}</span>
            <Badge className="text-accent">{categoryLabel[project.category]}</Badge>
            {project.status === "in-progress" && <Badge>In progress</Badge>}
            {project.stack.slice(0, 3).map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </div>

          <h3 className="text-2xl font-medium tracking-tight transition-colors group-hover:text-accent sm:text-4xl">
            {project.title} <span className="text-muted">— {project.subtitle}</span>
          </h3>

          {project.summary && <p className="max-w-xl leading-relaxed font-light text-zinc-400">{project.summary}</p>}

          <ul className="max-w-xl space-y-2 text-sm text-zinc-400">
            {project.highlights.slice(0, 3).map((h) => (
              <li key={h} className="flex gap-3">
                <span className="text-accent">/</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>

          {project.metrics && (
            <div className="grid grid-cols-3 gap-4 border-t border-line pt-5 font-mono">
              {project.metrics.map((m) => (
                <div key={m.label}>
                  <span className="block text-[10px] text-muted uppercase">{m.label}</span>
                  <span className="text-lg text-foreground">{m.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative flex h-72 flex-col justify-between overflow-hidden rounded-xl border border-line bg-background p-5 md:h-80 lg:col-span-5">
          <div className="flex justify-between border-b border-line pb-2 font-mono text-[10px] text-muted uppercase">
            <span>System Topology</span>
            <span className="text-emerald-400">{project.status === "in-progress" ? "Building" : "Shipped"}</span>
          </div>
          <div className="bg-grid absolute inset-0 -z-0 opacity-60" />
          <div className="relative flex flex-1 items-center justify-center">
            {project.pipeline && <Pipeline steps={project.pipeline} />}
          </div>
          <div className="relative flex justify-between border-t border-line pt-2 font-mono text-[10px] text-muted uppercase">
            <span>{project.stack.length} technologies</span>
            {project.links?.[0] ? (
              <a href={project.links[0].href} target="_blank" rel="noreferrer" className="text-foreground hover:text-accent">
                {project.links[0].label} ↗
              </a>
            ) : (
              <span>Case study soon</span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function Work() {
  const featured = projects.filter((p) => p.featured);
  const archive = projects.filter((p) => !p.featured);

  return (
    <section id="work" className="relative mx-auto max-w-[1440px] scroll-mt-20 border-b border-line px-6 py-28 md:px-12">
      <SectionHeader
        index="01"
        label="Selected Work"
        title="Built for production."
        aside="Enterprise platforms, applied AI and mobile products — engineered end to end, from schema to interface."
      />

      <div className="space-y-8">
        {featured.map((p, i) => (
          <Reveal key={p.slug}>
            <Dossier project={p} index={i} />
          </Reveal>
        ))}
      </div>

      {archive.length > 0 && (
        <div className="mt-24">
          <Reveal>
            <p className="label mb-6 text-muted">Archive</p>
          </Reveal>
          <ul className="border-t border-line">
            {archive.map((p, i) => (
              <Reveal key={p.slug} delay={i * 0.06}>
                <li className="group grid grid-cols-12 items-center gap-4 border-b border-line py-6 transition-colors hover:bg-white/[0.02]">
                  <span className="col-span-2 font-mono text-xs text-muted md:col-span-1">
                    {String(featured.length + i + 1).padStart(2, "0")}
                  </span>
                  <span data-ball-floor className="col-span-10 text-xl font-medium tracking-tight transition-colors group-hover:text-accent md:col-span-4">
                    {p.title}
                  </span>
                  <span className="col-span-12 text-sm text-muted md:col-span-4">{p.subtitle}</span>
                  <span className="col-span-12 font-mono text-[11px] text-muted uppercase md:col-span-3 md:text-right">
                    {p.stack.join(" · ")}
                  </span>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

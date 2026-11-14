import Link from "next/link";
import { projects } from "@/content";
import type { Project } from "@/types/content";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { Badge } from "@/components/ui/Badge";
import { BrowserFrame, PhoneFrame } from "@/components/ui/DeviceFrames";
import { Pipeline } from "@/components/project/Pipeline";
import { type CaseStudy, categoryLabel, hostOf, isCaseStudy, projectHref } from "@/lib/projects";

function ProjectLink({ project }: { project: Project }) {
  if (project.links?.[0]) {
    // Sits above the card's stretched link so it opens the live site, not the case study.
    return (
      <a href={project.links[0].href} target="_blank" rel="noreferrer" className="relative z-[2] text-foreground hover:text-accent">
        {project.links[0].label} ↗
      </a>
    );
  }
  if (project.screens) {
    return <span>{project.screens.desktop.length + project.screens.mobile.length} screens</span>;
  }
  return <span>Case study soon</span>;
}

function Topology({ project }: { project: Project }) {
  return (
    <div data-ball-floor className="relative flex h-72 flex-col justify-between overflow-hidden rounded-xl border border-line bg-background p-5 md:h-80 lg:col-span-5">
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
        <ProjectLink project={project} />
      </div>
    </div>
  );
}

/** Desktop in a browser window with the phone version laid over its corner. */
function Showcase({ project }: { project: CaseStudy }) {
  const [desktop] = project.screens.desktop;
  const [mobile] = project.screens.mobile;
  return (
    <div data-ball-floor className="relative overflow-hidden rounded-xl border border-line bg-background p-5 lg:col-span-5">
      <div className="bg-grid absolute inset-0 opacity-60" />
      <div className="relative flex justify-between border-b border-line pb-2 font-mono text-[10px] text-muted uppercase">
        <span>Desktop · Mobile</span>
        <span className="text-emerald-400">{project.status === "in-progress" ? "Building" : "Live"}</span>
      </div>
      <div className="relative my-6 pr-[12%] pb-[8%]">
        {desktop && (
          <BrowserFrame
            shot={desktop}
            url={hostOf(project)}
            sizes="(min-width: 1024px) 34vw, 85vw"
            className="transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1"
          />
        )}
        {mobile && (
          <PhoneFrame
            shot={mobile}
            sizes="(min-width: 1024px) 11vw, 28vw"
            className="absolute right-0 bottom-0 w-[27%] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-3"
          />
        )}
      </div>
      <div className="relative flex justify-between border-t border-line pt-2 font-mono text-[10px] text-muted uppercase">
        <span>{project.stack.length} technologies</span>
        <ProjectLink project={project} />
      </div>
    </div>
  );
}

function Dossier({ project, index }: { project: Project; index: number }) {
  const caseStudy = isCaseStudy(project) ? project : null;
  return (
    <article
      data-ball-floor
      className="group relative overflow-hidden rounded-2xl border border-line bg-surface p-8 transition-colors duration-500 hover:border-white/25 hover:bg-surface-elevated md:p-12"
    >
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <div data-ball-floor className="flex flex-wrap items-center gap-2">
            <span className="mr-2 font-mono text-xs text-muted">{String(index + 1).padStart(2, "0")}</span>
            <Badge className="text-accent">{categoryLabel[project.category]}</Badge>
            {project.status === "in-progress" && <Badge>In progress</Badge>}
            {project.stack.slice(0, 3).map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </div>

          <h3 data-ball-floor className="text-2xl font-medium tracking-tight transition-colors group-hover:text-accent sm:text-4xl">
            {caseStudy ? (
              // Stretched link: its ::after covers the whole card, so anywhere on the card opens the case study.
              <Link href={projectHref(project)} className="after:absolute after:inset-0 after:z-[1] after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-accent/60">
                {project.title} <span className="text-muted">— {project.subtitle}</span>
              </Link>
            ) : (
              <>
                {project.title} <span className="text-muted">— {project.subtitle}</span>
              </>
            )}
          </h3>

          {project.summary && <p data-ball-floor className="max-w-xl leading-relaxed font-light text-zinc-400">{project.summary}</p>}

          <ul className="max-w-xl space-y-2 text-sm text-zinc-400">
            {project.highlights.slice(0, 3).map((h) => (
              <li key={h} data-ball-floor className="flex gap-3">
                <span className="text-accent">/</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>

          {project.metrics && (
            <div data-ball-floor className="grid grid-cols-3 gap-4 border-t border-line pt-5 font-mono">
              {project.metrics.map((m) => (
                <div key={m.label}>
                  <span className="block text-[10px] text-muted uppercase">{m.label}</span>
                  <span className="text-lg text-foreground">{m.value}</span>
                </div>
              ))}
            </div>
          )}

          {caseStudy && (
            <p data-ball-floor aria-hidden className="label inline-flex items-center gap-3 text-foreground">
              View project
              <span className="flex size-8 items-center justify-center rounded-full border border-line text-accent transition-all duration-500 group-hover:translate-x-1 group-hover:border-accent/50 group-hover:bg-accent/10">
                →
              </span>
            </p>
          )}
        </div>

        {caseStudy ? <Showcase project={caseStudy} /> : <Topology project={project} />}
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
            <p data-ball-floor className="label mb-6 text-muted">Archive</p>
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
                  <span data-ball-floor className="col-span-12 text-sm text-muted md:col-span-4">{p.subtitle}</span>
                  <span data-ball-floor className="col-span-12 font-mono text-[11px] text-muted uppercase md:col-span-3 md:text-right">
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

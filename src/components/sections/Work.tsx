import Link from "next/link";
import { projects } from "@/content";
import type { Project } from "@/types/content";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { BrowserFrame, PhoneFrame } from "@/components/ui/DeviceFrames";
import { Pipeline } from "@/components/project/Pipeline";
import { type CaseStudy, categoryLabel, hostOf, isCaseStudy, pad, projectHref, statusLabel } from "@/lib/projects";

const ease = "transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]";

/** Desktop screenshot in a browser window, with the phone version over its corner. */
function Screens({ project, wide }: { project: CaseStudy; wide: boolean }) {
  const [desktop] = project.screens.desktop;
  const [mobile] = project.screens.mobile;
  return (
    <div className="relative w-full pr-[12%] pb-[6%]">
      {desktop && (
        <BrowserFrame
          shot={desktop}
          url={hostOf(project)}
          sizes={wide ? "(min-width: 1024px) 40vw, 90vw" : "(min-width: 1024px) 26vw, 90vw"}
          className={`${ease} group-hover:-translate-y-1`}
        />
      )}
      {mobile && (
        <PhoneFrame
          shot={mobile}
          sizes={wide ? "(min-width: 1024px) 11vw, 26vw" : "(min-width: 1024px) 7vw, 26vw"}
          className={`absolute right-0 bottom-0 w-[24%] ${ease} group-hover:-translate-y-2`}
        />
      )}
    </div>
  );
}

function ProjectCard({ project, index, wide }: { project: Project; index: number; wide: boolean }) {
  const caseStudy = isCaseStudy(project) ? project : null;
  const live = project.links?.[0];
  const extraStack = project.stack.length - 3;

  return (
    <article
      data-ball-floor
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-colors duration-500 hover:border-white/20 hover:bg-surface-elevated"
    >
      <div className="relative border-b border-line bg-background px-5 pt-6 pb-5 sm:px-7">
        <div className="bg-grid absolute inset-0 opacity-60" />
        <div className={`relative flex items-center justify-center ${caseStudy ? "" : "min-h-36 sm:min-h-44"}`}>
          {caseStudy ? <Screens project={caseStudy} wide={wide} /> : project.pipeline && <Pipeline steps={project.pipeline} />}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-7">
        <p className="flex flex-wrap items-center gap-x-2 font-mono text-[11px] tracking-wider text-muted uppercase">
          <span>{pad(index + 1)}</span>
          <span className="text-accent">{categoryLabel[project.category]}</span>
          {project.status && <span>· {statusLabel[project.status]}</span>}
        </p>

        <h3 data-ball-floor className="mt-3 text-xl font-medium tracking-tight transition-colors group-hover:text-accent sm:text-2xl">
          {caseStudy ? (
            // Stretched link: its ::after covers the whole card, so anywhere on the card opens the project page.
            <Link
              href={projectHref(project)}
              className="after:absolute after:inset-0 after:z-[1] after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-accent/60"
            >
              {project.title}
            </Link>
          ) : (
            project.title
          )}
        </h3>
        <p className="mt-1 text-sm text-muted">{project.subtitle}</p>

        {project.summary && <p data-ball-floor className="mt-4 text-[15px] leading-relaxed font-light text-zinc-400">{project.summary}</p>}

        {project.metrics && (
          <dl data-ball-floor className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4">
            {project.metrics.map((m) => (
              <div key={m.label}>
                <dt className="font-mono text-[10px] leading-tight tracking-wide text-muted uppercase">{m.label}</dt>
                <dd className="mt-1 text-lg tracking-tight text-foreground">{m.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {/* Projects without their own page keep their details here, folded away. */}
        {!caseStudy && project.highlights.length > 1 && (
          <details className="group/more mt-4 border-t border-line pt-4 text-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between py-1 text-foreground [&::-webkit-details-marker]:hidden">
              What I built
              <span className="text-accent transition-transform duration-300 group-open/more:rotate-45">+</span>
            </summary>
            <ul className="mt-3 space-y-2 leading-relaxed text-zinc-400">
              {project.highlights.map((h) => (
                <li key={h} className="flex gap-3">
                  <span className="text-accent">/</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </details>
        )}

        <div className="mt-auto flex items-center justify-between gap-4 pt-6 font-mono text-[11px] tracking-wide text-muted uppercase">
          <span className="truncate">
            {project.stack.slice(0, 3).join(" · ")}
            {extraStack > 0 && ` +${extraStack}`}
          </span>
          {live ? (
            // Sits above the stretched link so it opens the live site, not the project page.
            <a
              href={live.href}
              target="_blank"
              rel="noreferrer"
              aria-label={`Visit ${live.label} (opens in a new tab)`}
              className="relative z-[2] -my-3 shrink-0 py-3 text-foreground transition-colors hover:text-accent"
            >
              Visit website <span className="text-accent">↗</span>
            </a>
          ) : caseStudy ? (
            <span aria-hidden className="shrink-0 text-foreground">
              View <span className="inline-block text-accent transition-transform duration-500 group-hover:translate-x-1">→</span>
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function Work() {
  const featured = projects.filter((p) => p.featured);
  const archive = projects.filter((p) => !p.featured);

  return (
    <section id="work" className="relative mx-auto max-w-[1440px] scroll-mt-20 border-b border-line px-6 py-20 md:px-12 md:py-28">
      <SectionHeader
        index="01"
        label="Selected Work"
        title="Things I've built."
        aside="Cards with screenshots open a full project page. The others are short summaries."
      />

      {/* Six-column grid: the first two cards take half a row each, the rest a third. */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-6">
        {featured.map((p, i) => (
          <Reveal key={p.slug} delay={(i % 3) * 0.08} className={i < 2 ? "h-full lg:col-span-3" : "h-full lg:col-span-2"}>
            <ProjectCard project={p} index={i} wide={i < 2} />
          </Reveal>
        ))}
      </div>

      {archive.length > 0 && (
        <div className="mt-20">
          <Reveal>
            <p data-ball-floor className="label mb-4 text-muted">Older projects</p>
          </Reveal>
          <ul className="border-t border-line">
            {archive.map((p, i) => (
              <Reveal key={p.slug} delay={i * 0.06}>
                <li className="group grid grid-cols-[2.5rem_1fr] items-baseline gap-x-4 gap-y-1 border-b border-line py-4 md:grid-cols-12">
                  <span className="font-mono text-xs text-muted md:col-span-1">{pad(featured.length + i + 1)}</span>
                  <span data-ball-floor className="text-lg font-medium tracking-tight md:col-span-4">
                    {p.title}
                  </span>
                  <span data-ball-floor className="col-start-2 text-sm text-muted md:col-span-4 md:col-start-auto">
                    {p.subtitle}
                  </span>
                  <span className="col-start-2 font-mono text-[11px] text-muted uppercase md:col-span-3 md:col-start-auto md:text-right">
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

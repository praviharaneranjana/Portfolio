import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { BrowserFrame, PhoneFrame } from "@/components/ui/DeviceFrames";
import { MaskLines, Reveal } from "@/components/ui/Reveal";
import { ScreenTour } from "@/components/ui/ScreenTour";
import { Pipeline } from "@/components/project/Pipeline";
import { PhoneScroller } from "@/components/project/PhoneScroller";
import { type CaseStudy, categoryLabel, hostOf, pad, projectHref, statusLabel } from "@/lib/projects";
import { cn } from "@/lib/utils";

function Section({
  index,
  label,
  title,
  split = false,
  children,
}: {
  index: number;
  label: string;
  title: string;
  /** Heading on the left, content on the right (from lg up). */
  split?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={cn("border-t border-line py-20 md:py-28", split && "grid gap-10 lg:grid-cols-12")}>
      <Reveal className={cn(split ? "lg:col-span-4" : "mb-12 md:mb-16")}>
        <p data-ball-floor className="label text-accent">{`${pad(index)} // ${label}`}</p>
        <h2 data-ball-floor className="mt-4 text-3xl font-medium tracking-tight md:text-5xl">{title}</h2>
      </Reveal>
      <div className={cn(split && "lg:col-span-8")}>{children}</div>
    </section>
  );
}

export function ProjectDetail({ project, number, next }: { project: CaseStudy; number: number; next?: CaseStudy }) {
  const { desktop, mobile } = project.screens;
  const [heroDesktop] = desktop;
  const [heroPhone] = mobile;
  const url = hostOf(project);
  const link = project.links?.[0];

  const facts = [
    { label: "Category", value: categoryLabel[project.category] },
    project.status && { label: "Status", value: statusLabel[project.status] },
    { label: "Screens", value: [desktop.length && `${desktop.length} desktop`, mobile.length && `${mobile.length} mobile`].filter(Boolean).join(" · ") },
    { label: "Stack", value: `${project.stack.length} technologies` },
  ].filter((f): f is { label: string; value: string } => Boolean(f));

  let section = 0;

  return (
    <main className="mx-auto max-w-[1440px] px-6 pt-32 md:px-12 md:pt-40">
      {/* Intro */}
      <Reveal>
        <div data-ball-floor className="flex flex-wrap items-center gap-2">
          <span className="label mr-3 text-accent">{`Case study // ${pad(number)}`}</span>
          <Badge>{categoryLabel[project.category]}</Badge>
          {project.status && <Badge>{statusLabel[project.status]}</Badge>}
        </div>
      </Reveal>

      <h1 data-ball-floor className="mt-8 max-w-6xl text-5xl leading-[0.95] font-medium tracking-tight sm:text-6xl md:text-8xl">
        <MaskLines onMount lines={[{ text: project.title }]} />
      </h1>
      <Reveal delay={0.25}>
        <p data-ball-floor className="mt-6 max-w-3xl text-xl leading-snug text-muted md:text-3xl">{project.subtitle}</p>
      </Reveal>

      <div className="mt-14 grid gap-10 border-t border-line pt-10 lg:grid-cols-12">
        <Reveal delay={0.35} className="lg:col-span-7">
          {project.summary && <p data-ball-floor className="text-lg leading-relaxed font-light text-zinc-300 md:text-xl">{project.summary}</p>}
        </Reveal>
        <Reveal delay={0.45} className="lg:col-span-4 lg:col-start-9">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-6">
            {facts.map((f) => (
              <div key={f.label} data-ball-floor>
                <dt className="font-mono text-[10px] tracking-wider text-muted uppercase">{f.label}</dt>
                <dd className="mt-1 text-foreground">{f.value}</dd>
              </div>
            ))}
          </dl>
          {link && (
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="label mt-8 inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-foreground transition-all duration-300 hover:bg-white hover:text-black"
            >
              Visit {link.label} <ArrowUpRight className="size-3.5 text-accent" />
            </a>
          )}
        </Reveal>
      </div>

      {/* Hero composition: the desktop app with the phone version over its corner. */}
      <Reveal delay={0.2} className="mt-16 md:mt-20">
        <div className="relative overflow-hidden rounded-2xl border border-line bg-surface px-5 py-10 sm:px-10 md:px-16 md:py-16">
          <div className="bg-grid absolute inset-0 opacity-60" />
          <div className={cn("relative mx-auto max-w-5xl", heroPhone && "pr-[13%] pb-[7%]")}>
            {heroDesktop && <BrowserFrame shot={heroDesktop} url={url} preload sizes="(min-width: 1280px) 900px, 85vw" />}
            {heroPhone && (
              <PhoneFrame shot={heroPhone} preload sizes="(min-width: 1280px) 240px, 25vw" className="absolute right-0 bottom-0 w-[24%]" />
            )}
          </div>
        </div>
      </Reveal>

      <div className="mt-20 md:mt-28">
        <Section index={++section} label="Highlights" title="What I built" split>
          <ol className="border-t border-line">
            {project.highlights.map((h, i) => (
              <Reveal key={h} delay={i * 0.05}>
                <li data-ball-floor className="grid grid-cols-[2.5rem_1fr] gap-4 border-b border-line py-6 md:grid-cols-[3.5rem_1fr]">
                  <span className="pt-1 font-mono text-xs text-accent">{pad(i + 1)}</span>
                  <p className="leading-relaxed text-zinc-300 md:text-lg">{h}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </Section>

        <Section index={++section} label="Stack" title="Built with" split>
          <Reveal>
            {project.metrics && (
              <div data-ball-floor className="mb-10 grid grid-cols-3 gap-4 border-b border-line pb-8 font-mono">
                {project.metrics.map((m) => (
                  <div key={m.label}>
                    <span className="block text-[10px] text-muted uppercase">{m.label}</span>
                    <span className="text-2xl text-foreground md:text-3xl">{m.value}</span>
                  </div>
                ))}
              </div>
            )}
            <ul data-ball-floor className="flex flex-wrap gap-2">
              {project.stack.map((t) => (
                <li key={t}>
                  <Badge className="px-4 py-2 text-[11px]">{t}</Badge>
                </li>
              ))}
            </ul>
            {project.pipeline && (
              <div className="relative mt-10 overflow-hidden rounded-xl border border-line bg-background p-8">
                <div className="bg-grid absolute inset-0 opacity-60" />
                <div className="relative">
                  <Pipeline steps={project.pipeline} />
                </div>
              </div>
            )}
          </Reveal>
        </Section>

        <Section index={++section} label="Screens" title="Every screen">
          {desktop.length > 0 && (
            <Reveal>
              <ScreenTour shots={desktop} url={url} label={`${project.title} desktop screens`} />
            </Reveal>
          )}

          {mobile.length > 4 && (
            <div className="mt-20 md:mt-28">
              <Reveal>
                <p data-ball-floor className="label mb-8 text-muted">On a phone · {mobile.length} screens</p>
              </Reveal>
              <Reveal>
                <PhoneScroller shots={mobile} label={`${project.title} on a phone`} />
              </Reveal>
            </div>
          )}

          {mobile.length > 1 && mobile.length <= 4 && (
            <div className="mt-20 md:mt-28">
              <Reveal>
                <p data-ball-floor className="label mb-8 text-muted">On a phone · {mobile.length} screens</p>
              </Reveal>
              <div className="-mx-6 flex snap-x snap-mandatory scroll-px-6 gap-5 overflow-x-auto px-6 pb-2 md:mx-0 md:grid md:grid-cols-4 md:gap-8 md:overflow-visible md:px-0 lg:px-[8%]">
                {mobile.map((shot, i) => (
                  <Reveal key={shot.src} delay={i * 0.08} className="w-[58%] shrink-0 snap-start md:w-auto">
                    <PhoneFrame shot={shot} sizes="(min-width: 768px) 20vw, 58vw" />
                    <p className="mt-4 text-center font-mono text-[10px] text-muted uppercase">{shot.label}</p>
                  </Reveal>
                ))}
              </div>
            </div>
          )}
        </Section>

        {project.galleries?.map((g) => (
          <Section key={g.title} index={++section} label={g.label} title={g.title}>
            {g.description && (
              <Reveal>
                <p data-ball-floor className="-mt-4 mb-12 max-w-2xl leading-relaxed text-zinc-400 md:-mt-8 md:mb-16 md:text-lg">
                  {g.description}
                </p>
              </Reveal>
            )}
            <Reveal>
              {g.device === "desktop" ? (
                <ScreenTour shots={g.shots} url={url} label={`${project.title}: ${g.title}`} />
              ) : (
                <PhoneScroller shots={g.shots} label={`${project.title}: ${g.title}`} aspect={g.aspect} />
              )}
            </Reveal>
          </Section>
        ))}

        {project.details && (
          <Section index={++section} label="Under the hood" title="How it works" split>
            <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
              {project.details.map((d, i) => (
                <Reveal key={d.title} delay={(i % 2) * 0.08} className="bg-background p-6 md:p-8">
                  <p className="font-mono text-[10px] text-accent">{pad(i + 1)}</p>
                  <h3 data-ball-floor className="mt-3 text-lg font-medium tracking-tight">{d.title}</h3>
                  <p data-ball-floor className="mt-2 text-sm leading-relaxed text-zinc-400">{d.body}</p>
                </Reveal>
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* Closing call to action: the live product, after the visitor has seen every screen. */}
      {link && (
        <Reveal className="pb-8">
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="group flex flex-col gap-6 border-y border-line py-12 transition-colors duration-500 hover:border-white/25 md:flex-row md:items-center md:justify-between md:py-16"
          >
            <div>
              <p className="label text-accent">See it live</p>
              <p className="mt-4 text-4xl font-medium tracking-tight transition-colors group-hover:text-accent md:text-6xl">{link.label}</p>
              <p className="mt-3 text-muted md:text-lg">Opens {url ?? link.label} in a new tab.</p>
            </div>
            <span className="label inline-flex shrink-0 items-center gap-3 self-start rounded-full border border-line px-6 py-3.5 text-foreground transition-all duration-300 group-hover:bg-white group-hover:text-black md:self-auto">
              Visit website <ArrowUpRight className="size-4 text-accent" />
            </span>
          </a>
        </Reveal>
      )}

      {next && next.slug !== project.slug && (
        <Reveal className="pb-24">
          <Link
            href={projectHref(next)}
            className="group relative grid items-center gap-10 overflow-hidden rounded-2xl border border-line bg-surface p-8 transition-colors duration-500 hover:border-white/25 hover:bg-surface-elevated md:p-12 lg:grid-cols-12"
          >
            <div className="lg:col-span-6">
              <p data-ball-floor className="label text-muted">Next project</p>
              <p data-ball-floor className="mt-4 text-4xl font-medium tracking-tight transition-colors group-hover:text-accent md:text-6xl">{next.title}</p>
              <p className="mt-3 text-muted md:text-lg">{next.subtitle}</p>
              <span className="label mt-8 inline-flex items-center gap-3 text-foreground">
                View project
                <span className="flex size-8 items-center justify-center rounded-full border border-line text-accent transition-all duration-500 group-hover:translate-x-1 group-hover:border-accent/50 group-hover:bg-accent/10">
                  →
                </span>
              </span>
            </div>
            {next.screens.desktop[0] && (
              <div className="lg:col-span-6">
                <BrowserFrame
                  shot={next.screens.desktop[0]}
                  url={hostOf(next)}
                  sizes="(min-width: 1024px) 40vw, 85vw"
                  className="transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1.5"
                />
              </div>
            )}
          </Link>
        </Reveal>
      )}
    </main>
  );
}

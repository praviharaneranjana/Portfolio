"use client";

import { heroCards, profile } from "@/content";
import { siteConfig } from "@/config/site";
import { HeroScene } from "@/components/canvas/HeroScene";
import { MagneticBadge, type BadgeLink } from "@/components/ui/MagneticBadge";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { MaskLines, Reveal } from "@/components/ui/Reveal";
import { intro, useGateOpen } from "@/lib/gate";
import { FloatingCards } from "./FloatingCards";
import { HeroDashboard } from "./HeroDashboard";
import { Portrait } from "./Portrait";

// The badge menu links to every visible section, plus the CV.
const badgeLinks: BadgeLink[] = [
  ...siteConfig.sections.filter((s) => s.enabled).map((s) => ({ label: s.label, href: `#${s.id}` })),
  ...(profile.resumeUrl ? [{ label: "Download CV", href: profile.resumeUrl, download: true }] : []),
];

export function Hero() {
  const { hero } = profile;
  const gateOpen = useGateOpen();

  return (
    <section id="top" className="relative overflow-hidden border-b border-line">
      {/* 3D sculpture */}
      <div data-ball-pillars className="absolute inset-x-0 top-0 h-[58vh] md:h-[64vh]">
        <HeroScene />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </div>

      <FloatingCards cards={heroCards} />

      <div className="h-[52vh] md:h-[60vh]" />

      <div className="relative z-20 mx-auto w-full max-w-[1440px] px-6 pb-20 md:px-12">
        <Reveal trigger={gateOpen} delay={intro.text} className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span data-ball-floor className="label text-muted">{hero.eyebrow}</span>
          <span className="hidden h-px w-10 bg-white/15 sm:block" />
          <span className="label flex items-center gap-2 text-accent">
            <span className="size-1.5 animate-pulse rounded-full bg-accent" />
            {hero.eyebrowAccent}
          </span>
        </Reveal>

        <h1 data-ball-floor className="max-w-5xl text-[2.4rem] leading-[1.05] font-medium tracking-[-0.03em] sm:text-5xl md:text-6xl lg:text-[4.5rem]">
          <MaskLines
            trigger={gateOpen}
            delay={intro.text + 0.1}
            lines={[
              { text: hero.headlineMuted, className: "text-muted" },
              { text: hero.headlineStrong, className: "text-foreground" },
            ]}
          />
        </h1>

        <HeroDashboard trigger={gateOpen} />

        <div data-ball-floor className="mt-14 grid grid-cols-1 items-start gap-10 border-t border-line pt-10 md:grid-cols-2 lg:grid-cols-12">
          <Reveal trigger={gateOpen} delay={intro.text + 0.3} className="max-w-[16rem] lg:col-span-3">
            <Portrait />
          </Reveal>

          <Reveal trigger={gateOpen} delay={intro.text + 0.4} className="lg:col-span-4">
            <p data-ball-floor className="font-mono text-xs leading-relaxed tracking-wider text-muted uppercase">
              {hero.position}
            </p>
            <dl className="mt-6 border-t border-line">
              {hero.facts.map((f) => (
                <div key={f.label} data-ball-floor className="grid grid-cols-[6.5rem_1fr] gap-3 border-b border-line py-3">
                  <dt className="font-mono text-[10px] tracking-wider text-muted uppercase">{f.label}</dt>
                  <dd className="text-sm leading-snug text-zinc-300">{f.value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal trigger={gateOpen} delay={intro.text + 0.5} className="space-y-4 font-light text-zinc-300 lg:col-span-3">
            <p data-ball-floor className="text-base leading-relaxed">
              {hero.intro[0]}
            </p>
            {hero.intro.slice(1).map((p) => (
              <p key={p} data-ball-floor className="text-sm leading-relaxed text-muted">
                {p}
              </p>
            ))}
            <div data-ball-floor className="flex flex-wrap gap-5 pt-3 font-mono text-[11px] tracking-widest uppercase">
              <a href="#work" className="border-b border-white/30 pb-1 text-foreground transition-colors hover:border-accent hover:text-accent">
                View work ↓
              </a>
              {profile.resumeUrl && (
                <a href={profile.resumeUrl} download className="border-b border-white/15 pb-1 text-muted transition-colors hover:border-accent hover:text-accent">
                  Download CV ↗
                </a>
              )}
            </div>
            <ul data-ball-floor className="flex flex-wrap gap-2 pt-2" aria-label="Elsewhere">
              {profile.socials.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target={s.href.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    aria-label={s.label}
                    title={s.label}
                    className="flex size-10 items-center justify-center rounded-full border border-line bg-white/[0.03] text-muted transition-colors hover:border-accent hover:text-accent"
                  >
                    <SocialIcon icon={s.icon} className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal trigger={gateOpen} delay={intro.text + 0.6} className="flex lg:col-span-2 lg:justify-end">
            <MagneticBadge text={hero.badgeText} links={badgeLinks} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

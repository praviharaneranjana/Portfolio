import { heroCards, profile } from "@/content";
import { HeroScene } from "@/components/canvas/HeroScene";
import { MagneticBadge } from "@/components/ui/MagneticBadge";
import { MaskLines, Reveal } from "@/components/ui/Reveal";
import { FloatingCards } from "./FloatingCards";
import { Portrait } from "./Portrait";

export function Hero() {
  const { hero } = profile;

  return (
    <section id="top" className="relative overflow-hidden border-b border-line">
      {/* 3D sculpture */}
      <div className="absolute inset-x-0 top-0 h-[58vh] md:h-[64vh]">
        <HeroScene />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </div>

      <FloatingCards cards={heroCards} />

      <div className="h-[52vh] md:h-[60vh]" />

      <div className="relative z-20 mx-auto w-full max-w-[1440px] px-6 pb-20 md:px-12">
        <Reveal delay={0.5} className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="label text-muted">{hero.eyebrow}</span>
          <span className="hidden h-px w-10 bg-white/15 sm:block" />
          <span className="label flex items-center gap-2 text-accent">
            <span className="size-1.5 animate-pulse rounded-full bg-accent" />
            {hero.eyebrowAccent}
          </span>
        </Reveal>

        <h1 className="max-w-5xl text-[2.4rem] leading-[1.05] font-medium tracking-[-0.03em] sm:text-5xl md:text-6xl lg:text-[4.5rem]">
          <MaskLines
            onMount
            delay={0.6}
            lines={[
              { text: hero.headlineMuted, className: "text-muted" },
              { text: hero.headlineStrong, className: "text-foreground" },
            ]}
          />
        </h1>

        <div className="mt-14 grid grid-cols-1 items-start gap-10 border-t border-line pt-10 md:grid-cols-12">
          <Reveal delay={0.9} className="max-w-[16rem] md:col-span-3">
            <Portrait />
          </Reveal>

          <Reveal delay={1.0} className="font-mono text-xs leading-relaxed tracking-wider text-muted uppercase md:col-span-3">
            {hero.position}
          </Reveal>

          <Reveal delay={1.1} className="space-y-4 font-light text-zinc-300 md:col-span-4">
            <p className="text-base leading-relaxed">{hero.intro[0]}</p>
            {hero.intro.slice(1).map((p) => (
              <p key={p} className="text-sm leading-relaxed text-muted">
                {p}
              </p>
            ))}
            <div className="flex flex-wrap gap-5 pt-3 font-mono text-[11px] tracking-widest uppercase">
              <a href="#work" className="border-b border-white/30 pb-1 text-foreground transition-colors hover:border-accent hover:text-accent">
                View work ↓
              </a>
              {profile.resumeUrl && (
                <a href={profile.resumeUrl} download className="border-b border-white/15 pb-1 text-muted transition-colors hover:border-accent hover:text-accent">
                  Download CV ↗
                </a>
              )}
            </div>
          </Reveal>

          <Reveal delay={1.2} className="flex md:col-span-2 md:justify-end">
            <MagneticBadge href="#contact" text={hero.badgeText} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

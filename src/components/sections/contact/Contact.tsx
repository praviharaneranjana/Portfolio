import { profile } from "@/content";
import { MaskLines, Reveal } from "@/components/ui/Reveal";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { ContactForm } from "./ContactForm";
import { LiveClock } from "./LiveClock";

export function Contact() {
  return (
    <section id="contact" className="mx-auto max-w-[1440px] scroll-mt-20 px-6 py-28 md:px-12">
      <div className="grid grid-cols-1 gap-14 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-6">
          <Reveal>
            <p data-ball-floor className="label text-accent">06 // Contact</p>
          </Reveal>
          <h2 data-ball-floor className="text-5xl leading-[1.05] font-medium tracking-[-0.03em] md:text-7xl">
            <MaskLines lines={[{ text: "Let's build", className: "text-muted" }, { text: "something remarkable." }]} />
          </h2>
          <Reveal delay={0.2} className="max-w-md leading-relaxed font-light text-zinc-400">
            <p data-ball-floor>Open to Junior Software Engineer (.NET) roles, freelance projects and game-dev collaborations.</p>
          </Reveal>

          <Reveal delay={0.25} className="space-y-3">
            <a href={`mailto:${profile.email}`} data-ball-floor className="group flex items-center gap-3 text-lg hover:text-accent">
              <SocialIcon icon="mail" className="size-5 text-muted group-hover:text-accent" /> {profile.email}
            </a>
            {profile.phone && (
              <a href={`tel:${profile.phone.replace(/\s/g, "")}`} data-ball-floor className="group flex items-center gap-3 text-lg hover:text-accent">
                <SocialIcon icon="phone" className="size-5 text-muted group-hover:text-accent" /> {profile.phone}
              </a>
            )}
          </Reveal>

          <Reveal delay={0.3} className="grid grid-cols-2 gap-4 font-mono text-xs">
            <div className="rounded-xl border border-line bg-surface p-4">
              <span className="block text-[10px] text-muted uppercase">Local time</span>
              <span className="mt-1 block text-foreground">Colombo, LK · UTC+5:30</span>
              <span className="mt-0.5 block text-accent">
                <LiveClock timeZone={profile.timezone} />
              </span>
            </div>
            <div className="rounded-xl border border-line bg-surface p-4">
              <span className="block text-[10px] text-muted uppercase">Availability</span>
              <span className="mt-1 block text-foreground">{profile.availability}</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-emerald-400">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" /> Replies within 24h
              </span>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.15} className="lg:col-span-6">
          <ContactForm />
        </Reveal>
      </div>
    </section>
  );
}

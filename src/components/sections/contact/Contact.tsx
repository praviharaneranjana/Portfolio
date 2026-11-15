import { heroPanel, profile } from "@/content";
import { MaskLines, Reveal } from "@/components/ui/Reveal";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { ContactForm } from "./ContactForm";
import { LiveClock } from "./LiveClock";

export function Contact() {
  return (
    <section id="contact" className="mx-auto max-w-[1440px] scroll-mt-20 px-6 py-20 md:px-12 md:py-28">
      <div className="grid grid-cols-1 gap-14 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-6">
          <Reveal>
            <p data-ball-floor className="label text-accent">06 // Contact</p>
          </Reveal>
          <h2 data-ball-floor className="text-5xl leading-[1.05] font-medium tracking-[-0.03em] md:text-7xl">
            <MaskLines lines={[{ text: "Hiring, or have", className: "text-muted" }, { text: "a project in mind?" }]} />
          </h2>
          <Reveal delay={0.2} className="max-w-md text-lg leading-relaxed text-secondary">
            <p data-ball-floor>{heroPanel.availability}</p>
          </Reveal>

          <Reveal delay={0.25} className="space-y-3">
            <a href={`mailto:${profile.email}`} data-ball-floor className="group flex items-center gap-3 text-lg transition-colors duration-150 hover:text-accent">
              <SocialIcon icon="mail" className="size-5 text-muted transition-colors duration-150 group-hover:text-accent" /> {profile.email}
            </a>
            {profile.phone && (
              <a href={`tel:${profile.phone.replace(/\s/g, "")}`} data-ball-floor className="group flex items-center gap-3 text-lg tabular-nums transition-colors duration-150 hover:text-accent">
                <SocialIcon icon="phone" className="size-5 text-muted transition-colors duration-150 group-hover:text-accent" /> {profile.phone}
              </a>
            )}
          </Reveal>

          <Reveal delay={0.3} className="grid grid-cols-2 gap-4">
            <div data-ball-floor className="rounded-xl border border-line bg-surface p-5">
              <span className="block text-[13px] text-muted">Local time</span>
              <span className="mt-2 block font-mono text-lg text-foreground tabular-nums">
                <LiveClock timeZone={profile.timezone} />
              </span>
              <span className="mt-1 block text-[13px] text-secondary">Colombo · UTC+05:30</span>
            </div>
            <div data-ball-floor className="rounded-xl border border-line bg-surface p-5">
              <span className="block text-[13px] text-muted">Availability</span>
              <span className="mt-2 flex items-center gap-2 text-lg text-foreground">
                <span className="size-1.5 shrink-0 rounded-full bg-accent" />
                {profile.availability}
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

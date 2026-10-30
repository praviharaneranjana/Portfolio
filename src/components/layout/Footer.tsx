import { profile } from "@/content";

export function Footer() {
  return (
    <footer className="mx-auto max-w-[1440px] px-6 pb-10 md:px-12">
      <div className="flex flex-col items-center justify-between gap-4 border-t border-line pt-8 font-mono text-[11px] tracking-wider text-muted uppercase sm:flex-row">
        <p>© {profile.name}. Designed & engineered in Sri Lanka.</p>
        <div className="flex gap-6">
          {profile.socials.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noreferrer" className="transition-colors hover:text-foreground">
              {s.label}
            </a>
          ))}
          {profile.resumeUrl && (
            <a href={profile.resumeUrl} download className="transition-colors hover:text-foreground">
              CV
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}

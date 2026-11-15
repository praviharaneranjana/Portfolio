import { profile } from "@/content";

export function Footer() {
  return (
    <footer className="mx-auto max-w-[1440px] px-6 pb-10 md:px-12">
      <div data-ball-floor className="flex flex-col items-center justify-between gap-4 border-t border-line pt-8 text-sm text-muted sm:flex-row">
        <p>© {profile.name}. Built in Sri Lanka</p>
        <div className="flex gap-6">
          {profile.socials.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noreferrer" className="-my-3 py-3 transition-colors duration-150 hover:text-foreground">
              {s.label}
            </a>
          ))}
          {profile.resumeUrl && (
            <a href={profile.resumeUrl} download className="-my-3 py-3 transition-colors duration-150 hover:text-foreground">
              CV
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}

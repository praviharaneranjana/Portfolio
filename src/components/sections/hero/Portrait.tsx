import Image from "next/image";
import { profile } from "@/content";

/** Portrait frame. Shows the photo when `profile.photo` is set, otherwise a styled placeholder. */
export function Portrait() {
  return (
    <figure className="group relative">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-line bg-surface">
        {profile.photo ? (
          <Image
            src={profile.photo}
            alt={profile.name}
            fill
            sizes="(min-width: 768px) 22vw, 60vw"
            className="object-cover object-[50%_18%] grayscale transition duration-700 ease-out-expo group-hover:scale-[1.03] group-hover:grayscale-0"
            priority
          />
        ) : (
          <div className="bg-grid flex h-full flex-col items-center justify-center gap-3 text-center">
            <span className="text-5xl font-medium tracking-tight text-foreground/20">PA</span>
            <span className="label px-4 text-[9px] text-muted">Add photo → profile.photo</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
        {/* Corner registration marks */}
        <span className="absolute top-2 left-2 size-3 border-t border-l border-white/30" />
        <span className="absolute right-2 bottom-2 size-3 border-r border-b border-white/30" />
      </div>
      <figcaption className="mt-3 flex justify-between font-mono text-[10px] tracking-wider text-muted uppercase">
        <span>{profile.shortName} N. A.</span>
        <span>Fig. 01</span>
      </figcaption>
    </figure>
  );
}

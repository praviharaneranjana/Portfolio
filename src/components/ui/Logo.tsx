import { profile } from "@/content";

/** Wordmark: a flat coral dot and the name in the interface family. Used by both site headers. */
export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="size-2 rounded-full bg-accent" />
      <span className="text-[17px] font-medium tracking-[-0.01em] text-foreground">{profile.shortName}</span>
    </span>
  );
}

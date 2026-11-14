import type { ReactNode } from "react";
import Image from "next/image";
import type { Screenshot } from "@/types/content";
import { cn } from "@/lib/utils";

/** A quiet browser window: neutral dots and a URL pill, no colour so the accent stays coral. Children fill a 16:10 viewport. */
export function BrowserWindow({ url, className, children }: { url?: string; className?: string; children: ReactNode }) {
  return (
    <figure className={cn("overflow-hidden rounded-lg border border-white/12 bg-surface-elevated shadow-2xl shadow-black/60", className)}>
      <div className="flex h-6 items-center gap-1.5 border-b border-line px-2.5 md:h-7">
        <span className="size-1.5 rounded-full bg-white/20 md:size-2" />
        <span className="size-1.5 rounded-full bg-white/20 md:size-2" />
        <span className="size-1.5 rounded-full bg-white/20 md:size-2" />
        {url && (
          <span className="mx-auto truncate rounded-full bg-white/[0.05] px-3 py-0.5 font-mono text-[9px] text-muted">{url}</span>
        )}
      </div>
      <div className="relative aspect-[16/10] overflow-hidden bg-background">{children}</div>
    </figure>
  );
}

export function BrowserFrame({ shot, url, sizes, className }: { shot: Screenshot; url?: string; sizes: string; className?: string }) {
  return (
    <BrowserWindow url={url} className={className}>
      <Image src={shot.src} alt={shot.alt} fill sizes={sizes} className="object-cover object-top" />
    </BrowserWindow>
  );
}

/** A modern phone: thin dark bezel, rounded screen and a small island. */
export function PhoneFrame({ shot, sizes, className }: { shot: Screenshot; sizes: string; className?: string }) {
  return (
    <figure
      className={cn(
        "rounded-[1.6rem] border border-white/15 bg-[#050506] p-[5px] shadow-2xl ring-1 shadow-black/70 ring-black md:rounded-[2rem] md:p-[6px]",
        className,
      )}
    >
      <div className="overflow-hidden rounded-[1.3rem] bg-black md:rounded-[1.65rem]">
        {/* Status bar with the island, so it never covers the page's own navbar. */}
        <div className="relative pt-[11%]">
          <span className="absolute top-1/2 left-1/2 h-[42%] w-[30%] -translate-1/2 rounded-full bg-[#1b1c1f]" />
        </div>
        <div className="relative aspect-[390/844]">
          <Image src={shot.src} alt={shot.alt} fill sizes={sizes} className="object-cover object-top" />
        </div>
      </div>
    </figure>
  );
}

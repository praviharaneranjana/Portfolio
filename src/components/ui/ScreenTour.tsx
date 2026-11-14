"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Screenshot } from "@/types/content";
import { BrowserWindow } from "@/components/ui/DeviceFrames";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Every desktop screen in one browser window. A page list (chips on small screens, a rail from lg up)
 * switches the window, and the screens crossfade so the frame never jumps.
 */
export function ScreenTour({ shots, url, label }: { shots: Screenshot[]; url?: string; label: string }) {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();

  function go(index: number, focus = false) {
    const next = (index + shots.length) % shots.length;
    setActive(next);
    const tab = tabRefs.current[next];
    const list = listRef.current;
    if (focus) tab?.focus({ preventScroll: true });
    // Keep the chosen chip in view when the list scrolls sideways, without moving the page.
    if (tab && list && list.scrollWidth > list.clientWidth) {
      list.scrollTo({ left: tab.offsetLeft - list.clientWidth / 2 + tab.offsetWidth / 2, behavior: "smooth" });
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    const moves: Record<string, number> = {
      ArrowRight: active + 1,
      ArrowDown: active + 1,
      ArrowLeft: active - 1,
      ArrowUp: active - 1,
      Home: 0,
      End: shots.length - 1,
    };
    if (e.key in moves) {
      e.preventDefault();
      go(moves[e.key], true);
    }
  }

  const current = shots[active];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-10">
      <div className="lg:col-span-3">
        <div
          ref={listRef}
          role="tablist"
          aria-label={label}
          onKeyDown={onKeyDown}
          className="relative -mx-6 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] md:-mx-12 md:px-12 lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-l lg:border-line lg:px-0 lg:pb-0"
        >
          {shots.map((shot, i) => {
            const selected = i === active;
            return (
              <button
                key={shot.src}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                id={`${id}-tab-${i}`}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls={`${id}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => go(i)}
                className={cn(
                  "group/tab flex shrink-0 items-center gap-3 rounded-full border px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors duration-300",
                  "lg:-ml-px lg:rounded-none lg:border-0 lg:border-l lg:py-2.5 lg:pl-5 lg:text-left",
                  selected
                    ? "border-accent/40 bg-accent/10 text-foreground lg:border-accent lg:bg-transparent"
                    : "border-line text-muted hover:text-foreground lg:border-transparent",
                )}
              >
                <span className={cn("font-mono text-[10px] transition-colors", selected ? "text-accent" : "text-muted/60")}>{pad(i + 1)}</span>
                {shot.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="lg:col-span-9">
        <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${active}`}>
          <BrowserWindow url={url}>
            {shots.map((shot, i) => (
              <Image
                key={shot.src}
                src={shot.src}
                alt={i === active ? shot.alt : ""}
                aria-hidden={i !== active}
                fill
                sizes="(min-width: 1440px) 900px, (min-width: 1024px) 62vw, 92vw"
                className={cn(
                  "object-cover object-top transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
                  i === active ? "scale-100 opacity-100" : "scale-[1.015] opacity-0",
                )}
              />
            ))}
          </BrowserWindow>
        </div>

        <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <p data-ball-floor aria-hidden className="max-w-2xl text-sm leading-relaxed text-zinc-400">
            {current.alt}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <span className="mr-auto font-mono text-[10px] text-muted sm:mr-2">
              <span className="text-foreground">{pad(active + 1)}</span> / {pad(shots.length)}
            </span>
            <button
              type="button"
              onClick={() => go(active - 1)}
              aria-label="Previous screen"
              className="grid size-9 place-items-center rounded-full border border-line text-muted transition-colors hover:border-white/25 hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => go(active + 1)}
              aria-label="Next screen"
              className="grid size-9 place-items-center rounded-full border border-line text-muted transition-colors hover:border-white/25 hover:text-foreground"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

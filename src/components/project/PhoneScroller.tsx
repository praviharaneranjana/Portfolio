"use client";

import { useRef, useState, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Screenshot } from "@/types/content";
import { PhoneFrame } from "@/components/ui/DeviceFrames";
import { cn } from "@/lib/utils";

// Local copy: importing @/lib/projects would pull every project into the client bundle.
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * A row of phones that scrolls sideways: swipe on touch, drag with a mouse, or use the arrows.
 * It bleeds to the page gutters so phones slide in from the edge.
 */
export function PhoneScroller({ shots, label, aspect }: { shots: Screenshot[]; label: string; aspect?: string }) {
  const track = useRef<HTMLUListElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const [active, setActive] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [edges, setEdges] = useState({ start: true, end: false });

  const step = () => {
    const el = track.current;
    const item = el?.querySelector("li");
    if (!el || !item) return 0;
    return item.getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap || "0");
  };

  function onScroll() {
    const el = track.current;
    if (!el) return;
    const s = step();
    if (s) setActive(Math.min(shots.length - 1, Math.round(el.scrollLeft / s)));
    setEdges({ start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 4 });
  }

  function go(dir: 1 | -1) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.current?.scrollBy({ left: dir * step(), behavior: reduce ? "auto" : "smooth" });
  }

  // Mouse drag. Touch and pens already scroll natively.
  function onPointerDown(e: PointerEvent<HTMLUListElement>) {
    if (e.pointerType !== "mouse" || e.button !== 0 || !track.current) return;
    drag.current = { x: e.clientX, left: track.current.scrollLeft, moved: false };
  }
  function onPointerMove(e: PointerEvent<HTMLUListElement>) {
    const d = drag.current;
    const el = track.current;
    if (!d || !el) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 4) {
      d.moved = true;
      setDragging(true);
      el.setPointerCapture(e.pointerId);
    }
    if (d.moved) el.scrollLeft = d.left - dx;
  }
  function endDrag() {
    if (!drag.current) return;
    drag.current = null;
    // Turning snap back on lets the row settle on the nearest phone.
    setDragging(false);
  }

  return (
    <div role="region" aria-roledescription="carousel" aria-label={label}>
      <div className="relative">
        <ul
          ref={track}
          tabIndex={0}
          onScroll={onScroll}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDragStart={(e) => e.preventDefault()}
          className={cn(
            "-mx-6 flex scroll-px-6 gap-5 overflow-x-auto px-6 pb-4 [scrollbar-width:none] select-none focus-visible:outline-none md:-mx-12 md:scroll-px-12 md:gap-8 md:px-12 [&::-webkit-scrollbar]:hidden",
            dragging ? "cursor-grabbing" : "snap-x snap-mandatory md:cursor-grab",
          )}
        >
          {shots.map((shot, i) => (
            <li
              key={shot.src}
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${shots.length}: ${shot.label}`}
              className="w-[62%] shrink-0 snap-start sm:w-[38%] md:w-[26%] lg:w-[19%] xl:w-[16.5%]"
            >
              <PhoneFrame
                shot={shot}
                aspect={aspect}
                sizes="(min-width: 1280px) 240px, (min-width: 1024px) 19vw, (min-width: 768px) 26vw, 62vw"
                className={cn(
                  "transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                  i === active ? "opacity-100" : "opacity-80",
                )}
              />
              <p className="mt-4 flex items-baseline justify-center gap-2 font-mono text-[10px] uppercase">
                <span className="text-muted/60">{pad(i + 1)}</span>
                <span className="text-muted">{shot.label}</span>
              </p>
            </li>
          ))}
        </ul>
        {/* Edge fades hint that the row keeps going. */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 -left-6 w-12 bg-gradient-to-r from-background to-transparent transition-opacity duration-500 md:-left-12 md:w-24",
            edges.start && "opacity-0",
          )}
        />
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 -right-6 w-12 bg-gradient-to-l from-background to-transparent transition-opacity duration-500 md:-right-12 md:w-24",
            edges.end && "opacity-0",
          )}
        />
      </div>

      <div className="mt-6 flex items-center justify-between gap-4 border-t border-line pt-5">
        <p className="font-mono text-[10px] text-muted uppercase">
          <span className="text-foreground">{pad(active + 1)}</span> / {pad(shots.length)}
          <span className="ml-4 hidden md:inline">Drag or use the arrows</span>
          <span className="ml-4 md:hidden">Swipe to see more</span>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={edges.start}
            aria-label="Previous screens"
            className="grid size-9 place-items-center rounded-full border border-line text-muted transition-colors hover:border-white/25 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={edges.end}
            aria-label="Next screens"
            className="grid size-9 place-items-center rounded-full border border-line text-muted transition-colors hover:border-white/25 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

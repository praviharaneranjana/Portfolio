"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import type { CodeCard } from "@/types/content";
import { intro, useGateOpen } from "@/lib/gate";
import { CodeBlock } from "@/components/ui/CodeBlock";

function CardBody({ card }: { card: CodeCard }) {
  if (card.kind === "code" && card.code) return <CodeBlock code={card.code} language={card.language} />;

  if (card.kind === "metrics" && card.metrics)
    return (
      <dl className="space-y-2 text-xs">
        {card.metrics.map((m) => (
          <div key={m.label} className="flex items-baseline justify-between gap-4">
            <dt className="text-muted">{m.label}</dt>
            <dd className="font-mono text-foreground tabular-nums">{m.value}</dd>
          </div>
        ))}
      </dl>
    );

  if (card.kind === "pipeline" && card.steps)
    return (
      <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
        {card.steps.map((s, i) => (
          <div
            key={s}
            className={
              i === card.steps!.length - 1
                ? "rounded-md border border-accent/30 bg-accent/10 px-2 py-1.5 text-accent"
                : "rounded-md border border-line bg-white/3 px-2 py-1.5 text-secondary"
            }
          >
            {s}
          </div>
        ))}
      </div>
    );

  return null;
}

function FloatingCard({
  card,
  index,
  mx,
  my,
  trigger,
}: {
  card: CodeCard;
  index: number;
  mx: MotionValue<number>;
  my: MotionValue<number>;
  trigger: boolean;
}) {
  const x = useTransform(mx, (v) => v * card.depth);
  const y = useTransform(my, (v) => v * card.depth * 0.7);
  const rotate = useTransform(mx, (v) => v * (card.depth / 12));

  return (
    <motion.div
      className="absolute"
      style={{ ...card.position, width: card.width, x, y, rotate }}
      initial={{ opacity: 0, scale: 0.94, filter: "blur(8px)" }}
      animate={trigger ? { opacity: 1, scale: 1, filter: "blur(0px)" } : { opacity: 0, scale: 0.94, filter: "blur(8px)" }}
      transition={{ duration: 1.2, delay: intro.text + 0.3 + index * 0.15, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="glass rounded-xl p-4">
        <div className="mb-3 flex items-center justify-between gap-3 border-b border-line pb-3">
          <div className="flex min-w-0 items-center gap-1.5">
            {card.kind === "code" && (
              <>
                <span className="size-2 rounded-full bg-white/15" />
                <span className="size-2 rounded-full bg-white/15" />
                <span className="size-2 rounded-full bg-white/15" />
              </>
            )}
            <span className={`truncate font-mono text-[11px] text-secondary ${card.kind === "code" ? "ml-2" : ""}`}>
              {card.title}
            </span>
          </div>
          {card.badge && <span className="shrink-0 font-mono text-[11px] text-muted">{card.badge}</span>}
        </div>
        <CardBody card={card} />
      </div>
    </motion.div>
  );
}

export function FloatingCards({ cards, trigger }: { cards: CodeCard[]; trigger?: boolean }) {
  const gateOpen = useGateOpen();
  const isTriggered = trigger ?? gateOpen;
  const reduce = useReducedMotion();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const mx = useSpring(rawX, { stiffness: 60, damping: 18 });
  const my = useSpring(rawY, { stiffness: 60, damping: 18 });
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 450], [1, 0]);
  const lift = useTransform(scrollY, [0, 450], [0, -80]);

  useEffect(() => {
    if (reduce) return;
    const move = (e: PointerEvent) => {
      rawX.set(e.clientX / window.innerWidth - 0.5);
      rawY.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [reduce, rawX, rawY]);

  return (
    <motion.div aria-hidden className="pointer-events-none absolute inset-0 z-10 hidden lg:block" style={{ opacity, y: lift }}>
      {cards.map((card, i) => (
        <FloatingCard key={card.id} card={card} index={i} mx={mx} my={my} trigger={isTriggered} />
      ))}
    </motion.div>
  );
}

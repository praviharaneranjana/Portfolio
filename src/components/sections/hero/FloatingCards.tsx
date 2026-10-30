"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import type { CodeCard } from "@/types/content";
import { useGateOpen } from "@/lib/gate";
import { CodeBlock } from "@/components/ui/CodeBlock";

function CardBody({ card }: { card: CodeCard }) {
  if (card.kind === "code" && card.code) return <CodeBlock code={card.code} language={card.language} />;

  if (card.kind === "metrics" && card.metrics)
    return (
      <div className="space-y-2.5 font-mono text-[10.5px]">
        {card.metrics.map((m) => (
          <div key={m.label} className="flex justify-between text-muted">
            <span className="uppercase">{m.label}</span>
            <span className="text-foreground">{m.value}</span>
          </div>
        ))}
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full bg-gradient-to-r from-white/60 to-accent"
            initial={{ width: "0%" }}
            animate={{ width: "95%" }}
            transition={{ duration: 2.2, delay: 1.6, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>
    );

  if (card.kind === "pipeline" && card.steps)
    return (
      <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[9.5px] uppercase">
        {card.steps.map((s, i) => (
          <div
            key={s}
            className={
              i === card.steps!.length - 1
                ? "rounded border border-accent/40 bg-accent/15 p-1.5 font-semibold text-accent"
                : "rounded border border-line bg-white/5 p-1.5 text-zinc-300"
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
  const reduce = useReducedMotion();
  const x = useTransform(mx, (v) => v * card.depth);
  const y = useTransform(my, (v) => v * card.depth * 0.7);
  const rotate = useTransform(mx, (v) => v * (card.depth / 12));

  return (
    <motion.div
      className="absolute"
      style={{ ...card.position, width: card.width, x, y, rotate }}
      initial={{ opacity: 0, scale: 0.94, filter: "blur(8px)" }}
      animate={trigger ? { opacity: 1, scale: 1, filter: "blur(0px)" } : { opacity: 0, scale: 0.94, filter: "blur(8px)" }}
      transition={{ duration: 1.2, delay: 0.5 + index * 0.15, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Idle drift, independent of the mouse */}
      <motion.div
        className="glass rounded-xl p-4"
        animate={reduce ? undefined : { y: [0, -10, 0] }}
        transition={{ duration: 6 + index, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="mb-3 flex items-center justify-between border-b border-line pb-2.5">
          <div className="flex items-center gap-1.5">
            {card.kind === "code" && (
              <>
                <span className="size-2.5 rounded-full bg-[#ff5f56]/80" />
                <span className="size-2.5 rounded-full bg-[#ffbd2e]/80" />
                <span className="size-2.5 rounded-full bg-[#27c93f]/80" />
              </>
            )}
            {card.kind !== "code" && <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />}
            <span className="ml-1.5 font-mono text-[10px] text-muted uppercase">{card.title}</span>
          </div>
          {card.badge && (
            <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-accent">{card.badge}</span>
          )}
        </div>
        <CardBody card={card} />
      </motion.div>
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

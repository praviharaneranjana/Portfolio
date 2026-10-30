import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-line bg-white/[0.03] px-3 py-1 font-mono text-[10px] tracking-wider text-foreground/75 uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}

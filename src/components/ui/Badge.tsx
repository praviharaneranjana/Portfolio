import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Quiet tag for a technology or status. Styling lives in the `tag` utility (globals.css). */
export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("tag", className)}>{children}</span>;
}

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { profile } from "@/content";

/** Slim header for project pages: home, back to the work list, and contact. No gate choreography here. */
export function ProjectHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between gap-4 px-6 md:px-12">
        <Link href="/" className="group flex items-center gap-2">
          <span className="size-2 rounded-full bg-accent shadow-[0_0_8px_#ff4d30] transition-transform group-hover:scale-125" />
          <span className="text-lg font-semibold tracking-wide uppercase">
            {profile.shortName}
            <sup className="ml-0.5 font-mono text-[9px] text-muted">SE</sup>
          </span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-6">
          <Link href="/#work" className="label inline-flex items-center gap-2 text-muted transition-colors hover:text-foreground">
            <ArrowLeft className="size-3.5" />
            All work
          </Link>
          <Link
            href="/#contact"
            className="label hidden items-center gap-2 rounded-full border border-line px-5 py-2.5 text-foreground transition-all duration-300 hover:bg-white hover:text-black sm:inline-flex"
          >
            Get in touch <span className="text-accent">↗</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

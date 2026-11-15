import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { profile } from "@/content";
import { Logo } from "@/components/ui/Logo";

/** Slim header for project pages: home, back to the work list, and contact. No gate choreography here. */
export function ProjectHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between gap-4 px-6 md:px-12">
        <Link href="/" aria-label={`${profile.shortName}, home`}>
          <Logo />
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/#work" className="inline-flex items-center gap-2 text-sm text-muted transition-colors duration-150 hover:text-foreground">
            <ArrowLeft className="size-4" strokeWidth={1.5} />
            All work
          </Link>
          <Link href="/#contact" className="btn btn-sm btn-secondary max-sm:hidden">
            Get in touch
          </Link>
        </div>
      </div>
    </header>
  );
}

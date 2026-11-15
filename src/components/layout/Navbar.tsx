"use client";

import { useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { siteConfig } from "@/config/site";
import { profile } from "@/content";
import { intro, useGateOpen } from "@/lib/gate";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const gateOpen = useGateOpen();
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 40));
  const links = siteConfig.sections.filter((s) => s.enabled && s.nav);

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={gateOpen ? { y: 0, opacity: 1 } : { y: -40, opacity: 0 }}
      transition={{ duration: 0.8, delay: intro.text, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-500",
        scrolled || open ? "border-line bg-background/75 backdrop-blur-md" : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-6 md:px-12">
        <a href="#top" aria-label={`${profile.shortName}, back to top`} className="-my-2 py-2">
          <Logo />
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="text-sm text-muted transition-colors duration-150 hover:text-foreground">
              {s.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <a href="#contact" className="btn btn-sm btn-secondary max-sm:hidden">
            Get in touch
          </a>
          <button
            className="-mr-3 p-3 text-sm font-medium text-foreground md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-line px-6 py-6 md:hidden">
          {[...links, { id: "contact", label: "Contact" }].map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={() => setOpen(false)}
              className="block border-b border-line py-4 text-2xl font-medium tracking-tight"
            >
              {s.label}
            </a>
          ))}
        </nav>
      )}
    </motion.header>
  );
}

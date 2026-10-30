"use client";

import { useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { siteConfig } from "@/config/site";
import { profile } from "@/content";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 40));
  const links = siteConfig.sections.filter((s) => s.enabled && s.nav);

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-500",
        scrolled || open ? "border-line bg-background/75 backdrop-blur-md" : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-6 md:px-12">
        <a href="#top" className="group flex items-center gap-2">
          <span className="size-2 rounded-full bg-accent shadow-[0_0_8px_#ff4d30] transition-transform group-hover:scale-125" />
          <span className="text-lg font-semibold tracking-wide uppercase">
            {profile.shortName}
            <sup className="ml-0.5 font-mono text-[9px] text-muted">SE</sup>
          </span>
        </a>

        <nav className="hidden items-center gap-10 md:flex">
          {links.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="label text-muted transition-colors hover:text-foreground">
              {s.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <a
            href="#contact"
            className="label hidden items-center gap-2 rounded-full border border-line px-5 py-2.5 text-foreground transition-all duration-300 hover:bg-white hover:text-black sm:inline-flex"
          >
            Get in touch <span className="text-accent">↗</span>
          </a>
          <button
            className="label text-foreground md:hidden"
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

import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { Terminal } from "./Terminal";

export function TerminalSection() {
  return (
    <section id="terminal" className="mx-auto max-w-[1440px] scroll-mt-20 border-b border-line px-6 py-20 md:px-12 md:py-28">
      <SectionHeader
        index="05"
        label="Interactive"
        title="Or use the terminal."
        aside="Everything on this page, as commands. Type help to see them."
      />
      <Reveal>
        <Terminal />
      </Reveal>
    </section>
  );
}

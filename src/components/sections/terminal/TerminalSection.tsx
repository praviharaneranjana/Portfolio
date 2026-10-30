import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { Terminal } from "./Terminal";

export function TerminalSection() {
  return (
    <section id="terminal" className="mx-auto max-w-[1440px] scroll-mt-20 border-b border-line px-6 py-28 md:px-12">
      <SectionHeader
        index="05"
        label="Interactive"
        title="Query the system."
        aside="Prefer a shell to a scroll? Everything on this page, available as commands."
      />
      <Reveal>
        <Terminal />
      </Reveal>
    </section>
  );
}

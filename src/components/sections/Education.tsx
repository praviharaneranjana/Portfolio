import { education } from "@/content";
import { Reveal } from "@/components/ui/Reveal";

export function Education() {
  return (
    <section id="education" className="mx-auto max-w-[1440px] scroll-mt-20 border-b border-line px-6 py-20 md:px-12">
      {education.map((e) => (
        <Reveal key={e.degree}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            <p className="label text-accent md:col-span-3">04 // Education</p>
            <div className="md:col-span-6">
              <h3 className="text-2xl font-medium tracking-tight md:text-3xl">{e.degree}</h3>
              <p className="mt-1 text-muted">{e.institution}</p>
              <p className="mt-5 text-sm leading-relaxed text-zinc-400">{e.modules.join(" · ")}</p>
            </div>
            <p className="font-mono text-xs tracking-wider text-muted uppercase md:col-span-3 md:text-right">{e.period}</p>
          </div>
        </Reveal>
      ))}
    </section>
  );
}

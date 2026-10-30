import { siteConfig } from "@/config/site";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Cursor } from "@/components/ui/Cursor";
import { Hero, sectionComponents } from "@/components/sections";
import { IntroGate } from "@/components/gate/IntroGate";

export default function Home() {
  return (
    <>
      <div aria-hidden className="bg-grid pointer-events-none fixed inset-0 -z-10" />
      <IntroGate />
      <Cursor />
      <Navbar />
      <main>
        <Hero />
        {siteConfig.sections
          .filter((s) => s.enabled)
          .map(({ id }) => {
            const Component = sectionComponents[id];
            return <Component key={id} />;
          })}
      </main>
      <Footer />
    </>
  );
}

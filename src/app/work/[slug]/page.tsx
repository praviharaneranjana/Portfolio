import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { profile, projects } from "@/content";
import { caseStudies } from "@/lib/projects";
import { ProjectHeader } from "@/components/project/ProjectHeader";
import { ProjectDetail } from "@/components/project/ProjectDetail";
import { Footer } from "@/components/layout/Footer";
import { Cursor } from "@/components/ui/Cursor";

// One static page per project that has screenshots.
export function generateStaticParams() {
  return caseStudies.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = caseStudies.find((p) => p.slug === slug);
  if (!project) return {};
  const title = `${project.title} — ${profile.name}`;
  const description = project.summary ?? project.subtitle;
  const image = project.screens.desktop[0]?.src;
  return {
    title,
    description,
    alternates: { canonical: `/work/${project.slug}` },
    openGraph: { title, description, type: "article", url: `/work/${project.slug}`, images: image ? [image] : undefined },
  };
}

export default async function ProjectPage({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const index = caseStudies.findIndex((p) => p.slug === slug);
  if (index === -1) notFound();

  const project = caseStudies[index];
  const next = caseStudies[(index + 1) % caseStudies.length];
  // Same number as the project's card in Selected Work.
  const number = projects.filter((p) => p.featured).findIndex((p) => p.slug === slug) + 1 || index + 1;

  return (
    <>
      <div aria-hidden className="bg-grid pointer-events-none fixed inset-0 -z-10" />
      <Cursor />
      <ProjectHeader />
      <ProjectDetail project={project} number={number} next={next} />
      <Footer />
    </>
  );
}

import { projects } from "@/content";
import type { Project } from "@/types/content";

export const categoryLabel: Record<Project["category"], string> = {
  web: "Web Platform",
  ai: "Applied AI",
  mobile: "Mobile",
  game: "Game Dev",
  design: "UI/UX",
};

export const statusLabel: Record<NonNullable<Project["status"]>, string> = {
  shipped: "Shipped",
  "in-progress": "In progress",
  academic: "Academic",
};

export type CaseStudy = Project & { screens: NonNullable<Project["screens"]> };

/** Projects with real screenshots get their own page at /work/<slug>. */
export function isCaseStudy(project: Project): project is CaseStudy {
  return Boolean(project.screens);
}

export const caseStudies: CaseStudy[] = projects.filter(isCaseStudy);

export const projectHref = (project: Project) => `/work/${project.slug}`;

/** Host of the first link, shown in the browser frame's URL pill. */
export function hostOf(project: Project) {
  const href = project.links?.[0]?.href;
  return href ? new URL(href).host : undefined;
}

export const pad = (n: number) => String(n).padStart(2, "0");

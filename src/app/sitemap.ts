import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { caseStudies } from "@/lib/projects";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteConfig.url, changeFrequency: "monthly", priority: 1 },
    ...caseStudies.map((p) => ({ url: `${siteConfig.url}/work/${p.slug}`, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}

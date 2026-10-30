import type { Experience } from "@/types/content";

export const experience: Experience[] = [
  {
    company: "Factum Software Solutions (Pvt) Ltd",
    role: "Full-Stack Software Engineer",
    period: "Nov 2025 – Present",
    location: "Sri Lanka",
    note: "Joined as Software Engineering Intern, retained after internship",
    project: "Operate — Multi-Tenant Operations & Compliance Management SaaS (client base: Saudi Arabia)",
    metrics: [
      { label: "Query load cut", value: "84–95%" },
      { label: "Pages migrated", value: "~130" },
      { label: "Dashboard widgets", value: "13" },
    ],
    stack: ["Laravel 12", "PHP", "React", "Inertia.js", "Tailwind CSS", "Vite", "MySQL", "Redis", "AWS Translate", "Generative AI APIs"],
    highlights: [
      "Optimised dashboard performance by rewriting heavy queries as SQL aggregations, cutting query load by 84–95%, and fixed three out-of-memory crashes before release.",
      "Upgraded the backend from Laravel 9 to Laravel 12, including dependency updates and compatibility fixes.",
      "Implemented the AI-powered Knowledge Center, generating knowledge-base content, photos and videos from user prompts.",
      "Rebuilt the Announcements module end to end: composer, scheduling, attachments, read and acknowledgement tracking.",
      "Helped migrate ~130 pages from Bootstrap/Blade to React + Tailwind CSS via Inertia.js.",
      "Rebuilt the main dashboard in React with 13 customisable widgets (drag & drop, resize, show/hide, saved layouts).",
      "Resolved Arabic localisation and RTL layout issues in a bilingual (English/Arabic) application.",
      "Added dark mode, shared UI components and reusable React hooks.",
    ],
  },
];

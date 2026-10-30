import type { Capability } from "@/types/content";

export const capabilities: Capability[] = [
  {
    code: "01.0",
    domain: "Backend & Data",
    title: "Enterprise .NET & backend systems",
    description:
      "RESTful APIs, relational schema design and query optimisation for multi-tenant SaaS — built to stay fast as the data grows.",
    items: ["C#, ASP.NET, SQL Server", "Laravel, FastAPI, Node.js", "MySQL, PostgreSQL, Redis", "RBAC & multi-tenancy"],
  },
  {
    code: "02.0",
    domain: "Product Engineering",
    title: "Full-stack product interfaces",
    description:
      "Modern React front ends with reusable components and hooks, bilingual English/Arabic RTL support, and mobile apps in Flutter.",
    items: ["React, Next.js, TypeScript", "Inertia.js, Tailwind CSS", "Flutter & Dart", "i18n / RTL, dark mode"],
  },
  {
    code: "03.0",
    domain: "Applied AI",
    title: "AI-enabled, data-driven features",
    description:
      "Generative AI inside real products and explainable ML models validated properly — calibrated, leakage-checked and benchmarked.",
    items: ["Gemini & GenAI APIs", "XGBoost, scikit-learn", "SHAP explainability", "pandas, NumPy"],
  },
  {
    code: "04.0",
    domain: "Real-Time & Games",
    title: "Mobile game design in Unity",
    description:
      "A newer discipline I'm growing into: gameplay systems in C#, mobile performance budgets and the craft of game feel.",
    items: ["Unity & C#", "Mobile game design", "Gameplay prototyping", "Performance profiling"],
  },
];

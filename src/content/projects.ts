import type { Project } from "@/types/content";

export const projects: Project[] = [
  {
    slug: "shai",
    title: "SHAI",
    subtitle: "Smart Hospital AI Operations Platform — Final Year Project",
    category: "ai",
    status: "academic",
    featured: true,
    summary:
      "A full-stack platform that predicts outpatient no-shows, explains every prediction, and turns risk into action: triage, overbooking and multilingual reminders.",
    pipeline: ["HIS Sync", "40 Features", "XGBoost", "SHAP", "Triage"],
    stack: ["Python", "FastAPI", "PostgreSQL", "XGBoost", "scikit-learn", "SHAP", "Gemini API", "Next.js", "TypeScript", "Docker", "GitHub Actions"],
    metrics: [
      { label: "ROC-AUC (CV)", value: "0.73" },
      { label: "Appointments validated", value: "110k" },
      { label: "Engineered features", value: "40" },
    ],
    highlights: [
      "Predicts hospital outpatient no-shows with a calibrated XGBoost model and SHAP explanations.",
      "FastAPI + PostgreSQL backend with multi-hospital tenancy, consumed by a Next.js dashboard; Docker + GitHub Actions CI/CD.",
      "Role-based access, scrypt-hashed passwords, signed sessions, Alembic migrations and an HIS sync connector.",
      "Risk triage, priority worklist and overbooking optimisation using exact Poisson-binomial calculations.",
      "Gemini drafts patient reminders in English, Sinhala and Tamil with human review.",
    ],
  },
  {
    slug: "swymwise",
    title: "SwymWise",
    subtitle: "Swim Academy Management Mobile App",
    category: "mobile",
    status: "shipped",
    featured: true,
    summary:
      "A multi-role platform for swim academies — training, live sessions, attendance, competitions and a social feed — on a serverless, multi-tenant backend.",
    pipeline: ["Flutter", "Edge Fns ×39", "Postgres RLS", "FCM Queue", "Stripe"],
    stack: ["Flutter", "Dart", "Riverpod", "Supabase", "PostgreSQL", "TypeScript", "Firebase", "Stripe"],
    metrics: [
      { label: "Edge Functions", value: "~39" },
      { label: "Migrations", value: "~90" },
      { label: "Feature modules", value: "24" },
    ],
    highlights: [
      "Multi-role platform (swimmer, coach, admin): training, live sessions, attendance, competitions and a social feed.",
      "Serverless backend on Supabase Edge Functions with row-level security and per-academy tenant isolation.",
      "Push notifications via a DB-triggered queue, FCM and pg_cron retries; Stripe billing with idempotent webhooks.",
    ],
  },
  {
    slug: "unity-mobile-games",
    title: "Mobile Game Design",
    subtitle: "Learning Unity — new mobile game prototypes",
    category: "game",
    status: "in-progress",
    featured: true,
    summary:
      "My newest discipline: designing mobile games in Unity, bringing C# and production engineering habits to gameplay, performance and feel.",
    pipeline: ["Input", "Gameplay Loop", "Physics", "URP", "Mobile Build"],
    stack: ["Unity", "C#", "Mobile"],
    highlights: [
      "Newly started designing mobile games with Unity, applying C# and software-engineering practice to gameplay.",
      // TODO: replace with real prototypes, screenshots and WebGL / store links as they ship.
    ],
  },
  {
    slug: "auctinier",
    title: "Auctinier",
    subtitle: "Online Vehicle & Spare Parts Auction System",
    category: "web",
    status: "academic",
    stack: ["C#", "ASP.NET", "SQL Server"],
    highlights: [
      "Second-year group project: online auction management for vehicles and spare parts.",
      "Built with ASP.NET and C# using object-oriented design on a SQL Server relational database.",
    ],
  },
  {
    slug: "solo-travel-mate",
    title: "Solo Travel Mate",
    subtitle: "Trip planner for solo travellers in Sri Lanka",
    category: "mobile",
    status: "academic",
    stack: ["Flutter", "Dart", "Firebase"],
    highlights: ["Suggested routes, places, pricing, hotels and travel packages."],
  },
  {
    slug: "jumpbook-redesign",
    title: "Jumpbook Redesign",
    subtitle: "UI/UX redesign of an online bookstore",
    category: "design",
    status: "academic",
    stack: ["Figma"],
    highlights: ["Redesigned the UI/UX and built an interactive prototype in Figma."],
  },
];

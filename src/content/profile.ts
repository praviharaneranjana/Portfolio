import type { Profile } from "@/types/content";

export const profile: Profile = {
  name: "Pravihara Neranjana Abegunasekara",
  shortName: "Pravihara",
  role: "Software Engineer — .NET & Full-Stack",
  location: "Homagama, Sri Lanka",
  timezone: "Asia/Colombo",
  email: "pravihranera1998@gmail.com",
  phone: "+94 71 019 2005",
  photo: "/images/profile.jpg",
  resumeUrl: "/resume/Pravihara_Abegunasekara.pdf",
  availability: "Open to .NET roles",
  hero: {
    eyebrow: "Software Engineer // Sri Lanka",
    eyebrowAccent: "Open to .NET roles",
    headlineMuted: "Pravihara Abegunasekara.",
    headlineStrong: "I build full-stack web apps, and make slow ones fast.",
    position: ".NET & full-stack engineer. Mostly enterprise SaaS, plus AI projects and, lately, Unity games.",
    facts: [
      { label: "Based in", value: "Homagama, Sri Lanka · UTC+05:30" },
      { label: "Currently", value: "Full-Stack Software Engineer at Factum Software Solutions" },
      { label: "Building", value: "Operate — multi-tenant operations & compliance SaaS for clients in Saudi Arabia" },
      { label: "Studying", value: "BSc (Hons) Software Engineering, NSBM Green University — final year" },
      { label: "Stack", value: "C# · .NET · Laravel · React · Next.js · SQL · Python · Unity" },
    ],
    intro: [
      "At Factum I work on Operate, a multi-tenant SaaS used by clients in Saudi Arabia. Lately that means rewriting slow queries, rebuilding modules and moving old pages to React.",
      "Outside work I build AI projects and mobile apps, and I've recently started making mobile games in Unity.",
    ],
    badgeText: "• Open to .NET roles • Explore ",
  },
  socials: [
    { label: "LinkedIn", href: "https://linkedin.com/in/pravihara-neranjana-0ab495395", icon: "linkedin" },
    { label: "Email", href: "mailto:pravihranera1998@gmail.com", icon: "mail" },
    // TODO: add your real profile URLs — links without a URL are not shown.
    // { label: "GitHub", href: "https://github.com/<username>", icon: "github" },
    // { label: "Facebook", href: "https://facebook.com/<username>", icon: "facebook" },
    // { label: "Instagram", href: "https://instagram.com/<username>", icon: "instagram" },
  ],
};

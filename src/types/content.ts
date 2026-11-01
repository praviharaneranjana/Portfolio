export type SocialLink = {
  label: string;
  href: string;
  icon: "github" | "linkedin" | "facebook" | "instagram" | "mail" | "phone" | "globe";
};

export type Profile = {
  name: string;
  shortName: string;
  role: string;
  location: string;
  timezone: string;
  email: string;
  phone?: string;
  /** Path under /public, e.g. "/images/profile.jpg". Leave undefined to show the placeholder frame. */
  photo?: string;
  resumeUrl?: string;
  availability: string;
  hero: {
    eyebrow: string;
    eyebrowAccent: string;
    /** Rendered grey, then white — the two-tone editorial headline. */
    headlineMuted: string;
    headlineStrong: string;
    position: string;
    /** Short label/value facts listed under the position in the hero row. */
    facts: { label: string; value: string }[];
    intro: string[];
    badgeText: string;
  };
  socials: SocialLink[];
};

export type Metric = { label: string; value: string };

export type Experience = {
  company: string;
  role: string;
  period: string;
  location?: string;
  note?: string;
  project?: string;
  stack: string[];
  highlights: string[];
  metrics?: Metric[];
};

export type ProjectCategory = "web" | "ai" | "mobile" | "game" | "design";

export type Project = {
  slug: string;
  title: string;
  subtitle: string;
  category: ProjectCategory;
  status?: "shipped" | "in-progress" | "academic";
  featured?: boolean;
  summary?: string;
  stack: string[];
  highlights: string[];
  metrics?: Metric[];
  /** Short labels drawn as a node diagram on featured cards when there is no image. */
  pipeline?: string[];
  links?: { label: string; href: string }[];
  image?: string;
};

export type Capability = {
  code: string;
  domain: string;
  title: string;
  description: string;
  items: string[];
};

export type SkillGroup = {
  title: string;
  items: string[];
};

export type Education = {
  degree: string;
  institution: string;
  period: string;
  modules: string[];
};

export type CodeCard = {
  id: string;
  kind: "code" | "metrics" | "pipeline";
  title: string;
  badge?: string;
  language?: "csharp" | "php" | "python";
  code?: string;
  metrics?: Metric[];
  steps?: string[];
  /** Placement in the hero, as CSS values. */
  position: { top: string; left?: string; right?: string };
  width: string;
  /** Parallax strength; negative moves against the mouse. */
  depth: number;
};

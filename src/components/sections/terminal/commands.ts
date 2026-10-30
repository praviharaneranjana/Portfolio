import { capabilities, education, experience, profile, projects, skills } from "@/content";

// Terminal commands are generated from the content files, so they stay in sync automatically.
export const commands: Record<string, () => string[]> = {
  help: () => [
    "Available: whoami, stack, experience, projects, capabilities, education, contact, cv, clear",
    "Tip: try `sudo hire pravihara`",
  ],
  whoami: () => [profile.name, profile.role, `${profile.location} · ${profile.availability}`],
  stack: () => skills.map((g) => `${g.title.padEnd(16)} ${g.items.join(", ")}`),
  experience: () =>
    experience.flatMap((e) => [
      `${e.role} @ ${e.company} (${e.period})`,
      ...(e.metrics ?? []).map((m) => `  ${m.value.padEnd(8)} ${m.label}`),
    ]),
  projects: () => projects.map((p) => `${p.title.padEnd(20)} ${p.subtitle}`),
  capabilities: () => capabilities.map((c) => `${c.code}  ${c.title}`),
  education: () => education.map((e) => `${e.degree} — ${e.institution} (${e.period})`),
  contact: () => [
    `email     ${profile.email}`,
    ...(profile.phone ? [`phone     ${profile.phone}`] : []),
    ...profile.socials.filter((s) => s.icon !== "mail").map((s) => `${s.label.toLowerCase().padEnd(9)} ${s.href}`),
  ],
  cv: () => (profile.resumeUrl ? [`Opening ${profile.resumeUrl} …`] : ["CV not available."]),
  "sudo hire pravihara": () => ["[sudo] password accepted.", "Excellent decision. Opening a channel → scrolling to contact ↓"],
};

export const quickCommands = ["whoami", "stack", "experience", "projects", "contact"];

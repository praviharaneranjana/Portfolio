---
name: update-content
description: Update the portfolio's personal content (bio, role, jobs, skills, education, socials, CV) from a new CV or the user's instructions. Use when the user says things like "update my experience", "add a skill", "I got a new job", or shares an updated CV.
---

# Update portfolio content

All content lives in `src/content/` and is typed by `src/types/content.ts`. Components must not contain personal text.

## Steps

1. Identify which file(s) change:
   - `profile.ts` — name, role, contact, `photo`, `resumeUrl`, availability, and hero copy (`hero.*`)
   - `hero.ts` — floating code/metric cards in the hero (keep 3–4, snippets 4–7 lines, real facts only)
   - `capabilities.ts` — four capability domain cards
   - `experience.ts` — jobs, newest first
   - `skills.ts` — skill groups
   - `education.ts` — degrees
   - `projects.ts` — use the `add-project` skill instead
2. Edit the data. Keep highlights short (one line each, start with a verb, include numbers when the source has them). Don't invent metrics, links or dates — leave a `// TODO:` comment instead.
3. If a new field is needed, add it to `src/types/content.ts` first, then render it in the matching component in `src/components/sections/`.
4. If the user provides a new CV PDF, copy it to `public/resume/` and update `profile.resumeUrl`.
5. Metrics appear in several places (`experience.ts` metrics, `hero.ts` Operate card, project metrics) — keep them consistent.
6. For a new portrait, save to `public/images/profile.jpg` and set `profile.photo`.
7. Verify: `npm run lint && npm run build`.

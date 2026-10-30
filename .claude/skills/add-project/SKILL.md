---
name: add-project
description: Add or update a project card on the portfolio (web, AI, mobile, Unity game, or design work), including stack, highlights, metrics, links and screenshots. Use when the user describes a project they built or want to showcase.
---

# Add a project

## Steps

1. Gather: title, one-line subtitle, category (`web | ai | mobile | game | design`), status (`shipped | in-progress | academic`), stack, 2–5 highlights, optional metrics (max 3, short values like `0.73`, `~39`, `110k`), links, screenshot.
   Ask only for what's missing and matters; never fabricate metrics or URLs.
2. Add an entry to `src/content/projects.ts` (type `Project`). `slug` must be unique kebab-case.
   Featured projects also need `summary` (1–2 sentences) and `pipeline` (3–5 short labels drawn as a node diagram; last node is highlighted coral).
3. Ordering: array order = display order. `featured: true` renders a large "dossier" card in Selected Work; others go to the Archive list. Put the strongest project first.
4. Screenshots go in `public/images/projects/<slug>.png|webp` and are referenced as `image: "/images/projects/<slug>.webp"`. If `image` isn't rendered yet in `src/components/sections/Work.tsx`, render it in the dossier's right panel with `next/image` instead of the pipeline.
5. Unity games: prefer a short looping video or WebGL build link plus store links; category `game`.
6. Verify: `npm run lint && npm run build`.

@AGENTS.md

# Project: Pravihara's 3D portfolio

Single-page, statically rendered portfolio. Next.js 16 App Router + TypeScript + Tailwind v4 + React Three Fiber.

## Rules

- **Content is data.** All personal content lives in `src/content/*.ts`, typed by `src/types/content.ts`. Never hardcode bio/job/project text in components.
- **Config drives layout.** Section order and visibility come from `siteConfig.sections` in `src/config/site.ts`; each id maps to a component in `src/components/sections/index.ts`.
- **3D is client-only.** Anything importing `three`/`@react-three/*` must be a `"use client"` component reached through `HeroScene` (which uses `next/dynamic` with `ssr: false`). Don't import three.js from server components.
- **Keep it static.** `cacheComponents` is on. Avoid `new Date()`, `Math.random()`, cookies/headers etc. in server components — they break static prerendering.
- **Design system.** Premium editorial look — see `docs/DESIGN.md`. Tokens: `bg-background`, `bg-surface`, `bg-surface-elevated`, `text-foreground`, `text-muted`, `border-line`, `text-accent` (coral, the only accent). Utilities: `label`, `glass`, `bg-grid`. 3D colours in `siteConfig.scene`.
- **Honest content.** Only real facts from the CV/user. Never invent metrics, clients or projects for visual effect.
- **Scroll reveals.** Use `Reveal` / `MaskLines` from `src/components/ui/Reveal.tsx`. Put `whileInView` on an unclipped element — IntersectionObserver ignores elements hidden by `overflow: hidden`.
- **Icons.** `lucide-react` v1 has no brand icons — LinkedIn/GitHub are inline SVGs in `src/components/ui/SocialIcon.tsx`.
- Next.js 16 differs from older versions; check `node_modules/next/dist/docs/` before using unfamiliar APIs.

## Verify changes

```bash
npm run lint && npm run build
```

`LayoutProps`/`PageProps` are generated types — `tsc` alone fails until `next build` (or `next typegen`) has run.

## Skills

Project skills in `.claude/skills/`: `update-content`, `add-project`, `add-3d-scene`.

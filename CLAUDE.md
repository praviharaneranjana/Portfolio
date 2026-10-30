@AGENTS.md

# Project: Pravihara's 3D portfolio

Single-page, statically rendered portfolio. Next.js 16 App Router + TypeScript + Tailwind v4 + React Three Fiber.

## Rules

- **Content is data.** All personal content lives in `src/content/*.ts`, typed by `src/types/content.ts`. Never hardcode bio/job/project text in components.
- **Config drives layout.** Section order and visibility come from `siteConfig.sections` in `src/config/site.ts`; each id maps to a component in `src/components/sections/index.ts`.
- **3D is client-only.** Anything importing `three`/`@react-three/*` must be a `"use client"` component reached through a `next/dynamic(..., { ssr: false })` wrapper: `HeroScene` (hero), `IntroGate` (gate), `RollingBalls` (balls). Don't import three.js from server components.
- **Keep it static.** `cacheComponents` is on. Avoid `new Date()`, `Math.random()`, cookies/headers etc. in server components — they break static prerendering.
- **Design system.** Premium editorial look — see `docs/DESIGN.md`. Tokens: `bg-background`, `bg-surface`, `bg-surface-elevated`, `text-foreground`, `text-muted`, `border-line`, `text-accent` (coral, the only accent). Utilities: `label`, `glass`, `bg-grid`. 3D colours in `siteConfig.scene`.
- **Honest content.** Only real facts from the CV/user. Never invent metrics, clients or projects for visual effect.
- **Scroll reveals.** Use `Reveal` / `MaskLines` from `src/components/ui/Reveal.tsx`. Put `whileInView` on an unclipped element — IntersectionObserver ignores elements hidden by `overflow: hidden`.
- **Realistic, not cartoon.** No toy vehicles, joysticks, game HUDs or bright UI glows in 3D. Materials need surface variation and environment reflections. See `docs/BLENDER.md` → "What makes it look real".
- **Intro choreography.** Gate → pillars rise → copy → balls. Timings live in `intro` (`src/lib/gate.ts`); anything that waits for the gate uses `useGateOpen()` / `secondsSinceOpen()`.
- **Ball ledges.** Add `data-ball-floor` to an element to let the rolling balls land on its top edge. Prefer headings/cards narrower than the page.
- **Blender assets are generated.** Edit `blender/build_gate.py` and re-run it; never hand-edit `public/models/gate.glb`. Keep the node names listed in `docs/BLENDER.md`.
- **Icons.** `lucide-react` v1 has no brand icons — LinkedIn/GitHub are inline SVGs in `src/components/ui/SocialIcon.tsx`.
- Next.js 16 differs from older versions; check `node_modules/next/dist/docs/` before using unfamiliar APIs.

## Verify changes

```bash
npm run lint && npm run build
```

On this machine Node and Blender aren't on `PATH`: prepend `D:/node-v24.19.0-win-x64` to `PATH`; Blender is `D:/Softwares/blender-5.2.3-windows-x64/blender.exe`.

`LayoutProps`/`PageProps` are generated types — `tsc` alone fails until `next build` (or `next typegen`) has run.

## Skills

Project skills in `.claude/skills/`: `update-content`, `add-project`, `add-3d-scene`, `blender-asset`.

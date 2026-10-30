---
name: add-3d-scene
description: Add or change 3D elements on the portfolio — the intro vault gate, the hero pillars, the rolling balls, importing a GLB/GLTF (including models exported from Unity or Blender), per-section 3D objects, camera moves, or effects with React Three Fiber and drei. Use for any request touching the 3D scene.
---

# Work on the 3D scene

Read `docs/3D.md` first. For the gate model itself (geometry, textures, Blender), use the `blender-asset` skill.

## Where things live

| Layer | Files | Notes |
| --- | --- | --- |
| Intro gate | `src/components/gate/` | `IntroGate` (input + UI) ↔ `GateCanvas` (render) share a mutable `GateControl` ref |
| Hero pillars | `src/components/canvas/` | `HeroCanvas`, `Studio`, `BeadArches` |
| Rolling balls | `src/components/balls/` | `physics.ts` (pure), `BallField.tsx` (render), `RollingBalls.tsx` (wrapper) |
| Choreography | `src/lib/gate.ts` | `intro` timings, `useGateOpen()`, `secondsSinceOpen()` |

## Ground rules

- Everything importing three.js is `"use client"` and reached only through a `next/dynamic(..., { ssr: false })` wrapper (`HeroScene`, `IntroGate`, `RollingBalls`). Add objects to an existing canvas before adding a new one.
- Look must stay premium and realistic: physical materials, environment reflections, restrained colour (coral only as a rim accent). No cartoon/low-poly styling, toy vehicles, joysticks or game HUDs.
- Keep the frame budget: one instanced draw call for repeated geometry, light post effects, respect `reducedMotion`/`lowDetail`. Prefer `frameloop="demand"` for canvases that are usually still.
- Animate in `useFrame` (or a rAF loop + `invalidate()`) by mutating refs; never `setState` per frame. React Compiler lint: name ref props `xxxRef`, and keep lazily built scene data in a ref, not `useMemo`, if you mutate it per frame.
- Use colours from `siteConfig.scene` so the theme stays in sync.
- Canvases have `pointer-events: none`; use `state.pointer` for parallax. The gate takes input on its DOM overlay and projects the 3D wheel to screen space instead of raycasting.
- Anything that should wait for the intro reads `secondsSinceOpen()` and the `intro` timings.

## Rolling balls

- New ledge: add `data-ball-floor` to a DOM element (its top edge). No code change needed.
- Feel: `PHYS` in `physics.ts`. Size/count: `siteConfig.balls`.
- If hero pillars move (`ARCHES`, hero camera, or canvas height), re-measure `PILLAR_CROWNS` in `BallField.tsx` from a screenshot.

## Importing a model

1. Place `.glb` in `public/models/` (optimise: `npx gltf-transform optimize in.glb out.glb --compress draco`).
2. `npx gltfjsx public/models/<name>.glb -t -o src/components/canvas/<Name>.tsx`
3. Render it inside `<Suspense>` in the relevant canvas; add `useGLTF.preload(...)`. Light it with drei `<Environment>` + `<Lightformer>`s.

## Verify

1. `npm run lint && npm run build` (Node: `D:/node-v24.19.0-win-x64`).
2. `npx next start -p 3123` in the background, then screenshot with `playwright-core` (install it in the scratchpad, not the project) driving the installed Chrome. It gets the real GPU:

```js
const { chromium } = require("playwright-core");
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-angle=d3d11", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3123", { waitUntil: "networkidle" });
// Gate: hold ArrowRight ~2.5 s to unlock, wait ~8 s for pillars + balls, then scroll with page.mouse.wheel.
```

3. Check: no `pageerror`s, gate unlocks, pillars rise then text, balls land on pillars and roll on scroll, mobile (390×844) usable. Measure FPS with a 2 s rAF counter after the first few seconds (shader compile makes the first second slow).

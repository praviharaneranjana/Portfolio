---
name: add-3d-scene
description: Add or change 3D elements on the portfolio — swap the hero model, import a GLB/GLTF (including models exported from Unity or Blender), add per-section 3D objects, camera moves, or effects with React Three Fiber and drei. Use for any request touching the 3D scene.
---

# Work on the 3D scene

Read `docs/3D.md` first.

## Ground rules

- Everything under `src/components/canvas/` is `"use client"`. three.js must only be reached through `HeroScene` (dynamic import, `ssr: false`).
- The hero canvas is `HeroCanvas.tsx`; lights/environment in `Studio.tsx`; the sculpture in `BeadArches.tsx`. Add objects as children; avoid extra canvases.
- Look must stay premium and realistic: physical materials, environment reflections, restrained colour (coral only as a rim accent). No cartoon/low-poly styling.
- Keep the frame budget: one instanced draw call for repeated geometry, light post effects, respect `reducedMotion`/`lowDetail` props.
- Animate in `useFrame` by mutating refs; never `setState` per frame.
- Use colours from `siteConfig.scene` so the theme stays in sync.
- Canvas has `pointer-events: none`; use `state.pointer` for parallax. If an object must be clickable, give that object its own wrapper with pointer events and test carefully.

## Importing a model

1. Place `.glb` in `public/models/` (optimise: `npx gltf-transform optimize in.glb out.glb --compress draco`).
2. `npx gltfjsx public/models/<name>.glb -t -o src/components/canvas/<Name>.tsx`
3. Render it inside `<Suspense>` in `HeroCanvas.tsx`; add `useGLTF.preload(...)`.

## Scroll-linked motion

`BeadArches` reads `window.scrollY / innerHeight` in `useFrame` to sink/rotate the sculpture. Follow the same pattern, easing with `+= (target - current) * 0.05`.

## Verify

`npm run build`, then check visually in a real browser with GPU (headless SwiftShader is too slow for this scene — use Chrome with `--use-angle=metal`). Check: hero visible, no console errors, FPS ≥ 45 on integrated GPU, mobile (390px) usable.

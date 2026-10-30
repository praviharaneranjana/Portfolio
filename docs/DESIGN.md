# Design

## Direction: "premium studio" editorial

The site presents Pravihara as a brand — a studio-grade, editorial site rather than a template portfolio.
Reference: [`design/reference-hero.jpg`](design/reference-hero.jpg) (dark sculptural render, two-tone headline, coral rotating badge).

### Principles

- **Restraint.** One accent colour (coral), everything else obsidian / titanium / off-white.
- **Editorial grid.** Thin 1px divider lines, numbered section labels (`01 // Selected Work`), generous whitespace.
- **Real 3D, not cartoon.** Physically lit, reflective materials, studio lighting, film grain and vignette.
- **Honest content.** Every metric and project is real (from the CV). Never add invented numbers.
- **Motion with purpose.** Masked line reveals, parallax, magnetic hover — slow easing (`cubic-bezier(0.16, 1, 0.3, 1)`).

### Tokens (`src/app/globals.css`)

| Token | Value | Use |
| --- | --- | --- |
| `--background` | `#0e0f10` | page, 3D background |
| `--surface` / `--surface-elevated` | `#141517` / `#1a1b1e` | cards, hover |
| `--foreground` | `#ededee` | primary text |
| `--muted` | `#8b8c92` | secondary text, first headline line |
| `--line` | `rgb(255 255 255 / 0.08)` | dividers, borders |
| `--accent` | `#ff4d30` | coral: labels, badge, CTAs, focus |

Utilities: `label` (mono uppercase micro text), `glass` (frosted panels), `bg-grid`.

### Typography

Geist Sans (headlines: medium weight, `tracking-[-0.03em]`) and Geist Mono (labels, metadata, code).

## Hero anatomy

1. **Sculpture** — three beaded arches (`src/components/canvas/BeadArches.tsx`), top ~64vh, fading into the page.
2. **Floating editor cards** — `src/content/hero.ts`; mouse parallax by `depth`, idle drift, fade on scroll. Desktop (≥1024px) only.
3. **Eyebrow** — `SOFTWARE ENGINEER // SRI LANKA —— ● OPEN TO .NET ROLES`.
4. **Two-tone headline** — name in grey, statement in white, masked line reveal on load.
5. **Bottom row** — portrait (Fig. 01) · position statement · intro · magnetic coral badge.

## Interactions

| Element | Behaviour |
| --- | --- |
| Custom cursor | Dot + trailing ring; ring grows coral over links/buttons. Fine pointers only, off for reduced motion. |
| Sculpture | Rises on load, breathes, bead ripple, tilts to mouse, key light follows mouse, sinks/rotates on scroll. |
| Code cards | Spring parallax, gentle float, blur-in entrance. |
| Badge | Rotating text ring, magnetic pull toward cursor. |
| Headings | Masked line-by-line reveal when scrolled into view. |
| Terminal | Real commands generated from content files. |

## Photo

Put a portrait (4:5, at least 800×1000) at `public/images/profile.jpg`, then set `photo: "/images/profile.jpg"` in `src/content/profile.ts`. It shows in greyscale and turns to colour on hover. A dark, softly lit photo fits the palette best.

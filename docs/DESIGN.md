# Design

## Direction: "premium studio" editorial

The site presents Pravihara as a brand — a studio-grade, editorial site rather than a template portfolio.
Reference: [`design/reference-hero.jpg`](design/reference-hero.jpg) (dark sculptural render, two-tone headline, rotating accent badge).

### Principles

- **Restraint.** One accent colour (champagne gold), used rarely: the badge, section labels, one key figure, focus. Everything else obsidian / titanium / off-white. No glows, no hue gradients, no pulsing dots.
- **Editorial grid.** Thin 1px divider lines, numbered section labels (`01 // Selected Work`), generous whitespace.
- **One signature.** The mono uppercase `label` is for numbered section labels (and the hero eyebrow) only. Every other label, button, tag and caption is sentence case, 12px or larger.
- **Real 3D, not cartoon.** Physically lit, reflective materials with surface variation (roughness/normal maps), bevelled edges, environment reflections, film grain and vignette. No toy vehicles, joysticks, HUDs or game mechanics. Interaction is tactile and physical: turning a wheel, balls with weight.
- **Honest content.** Every metric and project is real (from the CV). Never add invented numbers.
- **Motion with purpose.** Masked line reveals, parallax, magnetic hover — slow easing (`cubic-bezier(0.16, 1, 0.3, 1)`).

### Tokens (`src/app/globals.css`)

| Token | Value | Use |
| --- | --- | --- |
| `--background` | `#0e0f10` | page, 3D background |
| `--surface` / `--surface-elevated` | `#141517` / `#1a1b1e` | cards, hover |
| `--foreground` | `#ededee` | primary text: headings, values |
| `--secondary` | `#a8a8ae` | body copy (`text-secondary`) |
| `--muted` | `#8b8c92` | meta, captions, first headline line |
| `--line` | `rgb(255 255 255 / 0.08)` | dividers, borders |
| `--accent` | `#c9a96e` | champagne gold: section labels, badge, one key figure, focus |

Three text roles only: `text-foreground`, `text-secondary`, `text-muted`. Don't use `zinc-*` greys or `font-light`.

Utilities:

| Utility | Use |
| --- | --- |
| `label` | Numbered section labels only (mono, 12px, uppercase). |
| `btn` + `btn-primary` / `btn-secondary` (+ `btn-sm`) | Every button and button-like link. Primary is off-white with dark text; one per group. 44px tall, 36px with `btn-sm`, 10px/8px radius. |
| `tag` | Technology and status tags (`Badge` component). 28px, 6px radius, sentence case. |
| `glass` | Floating panels over the 3D scene: neutral surface, hairline, blur. |
| `bg-grid` | Faint grid behind device frames. |

Radius: tags 6, buttons and inner tiles 8–10, cards 12–16. Spacing on the 4px grid; cards pad 24 (32 on desktop), stat tiles 16–20.

### Typography

Geist Sans for the interface (headlines medium weight, `tracking-[-0.03em]` from 56px, `-0.02em` from 40px) and Geist Mono for figures, times and code. Weights 400 and 500 only. Numbers use `tabular-nums`. No negative tracking below 16px, no italics, no trailing full stops on headings, labels or buttons.

## Intro: the vault

A heavy steel vault door in a concrete wall (Blender-built, see [BLENDER.md](BLENDER.md)). The visitor turns the handwheel clockwise one full turn while a thin champagne-gold arc traces progress around it. On release, pins retract, cross-bolts slide, the doors unseal and roll into their pockets, the camera pushes into the lit chamber, and the page fades straight into the hero. UI is minimal: brand label, mute, Skip, degree readout, one line of instruction.

## Hero anatomy

1. **Sculpture** — three beaded pillars (`src/components/canvas/BeadArches.tsx`), top ~64vh, fading into the page. They rise in one at a time after the gate, then the copy reveals.
2. **Floating editor cards** — `heroCards` in `src/content/hero.ts`; mouse parallax by `depth`, fade on scroll. Desktop (≥1024px) only.
3. **Eyebrow** — `SOFTWARE ENGINEER // SRI LANKA —— ● Open to .NET roles` (static champagne-gold dot).
4. **Two-tone headline** — name in grey, statement in white, masked line reveal on load.
5. **3D panel** — `heroPanel` in `src/content/hero.ts`, rendered by `HeroDashboard.tsx`. A slab with a back plate (−18px) and raised content (+20px): it rises from a tipped-back angle after the gate, leans toward the mouse (max 5°/7°) with a neutral highlight following the cursor, and stays flat on touch and for reduced motion. Tabs: Results · Stack · Availability. Figures must match the CV.
6. **Bottom row** — portrait (Fig. 01) · position statement · facts · intro · View work (primary) + Download CV (secondary) · magnetic champagne-gold badge (dark text).

## Interactions

| Element | Behaviour |
| --- | --- |
| Custom cursor | Dot + trailing ring; ring turns champagne gold over links/buttons. Fine pointers only, off for reduced motion. |
| Vault wheel | Drag (or hold →) to turn; inertia, ratchet ticks, champagne-gold progress arc. |
| Sculpture | Pillars rise one by one after the gate, breathe, bead ripple, tilt to mouse, key light follows mouse, sink/rotate on scroll. |
| Rolling balls | Three beaded balls (pillar material) perch on the pillars, then roll and squash down headings and cards (`data-ball-floor`) as you scroll, staying on screen. |
| Code cards | Spring parallax, blur-in entrance. No idle loop. |
| Hero panel | Tilts toward the cursor with depth layers and a moving highlight; tabs cross-fade. |
| Badge | Rotating text ring, magnetic pull toward cursor (critically damped, no hover scale). |
| Buttons | Colour/surface step on hover, 0.98 scale on press, 160ms. No `transition-all`, no `hover:scale`. |
| Headings | Masked line-by-line reveal when scrolled into view. |
| Terminal | Real commands generated from content files. |

## Photo

Put a portrait (4:5, at least 800×1000) at `public/images/profile.jpg`, then set `photo: "/images/profile.jpg"` in `src/content/profile.ts`. It shows in greyscale and turns to colour on hover. A dark, softly lit photo fits the palette best.

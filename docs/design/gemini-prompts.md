# Gemini prompts — UI mockups

Paste a prompt into Gemini (image generation). Generate 3–4 times and pick the best, then ask for edits in follow-up messages (e.g. "make the 3D island bigger", "change the accent to orange").
Save chosen images in `docs/design/` and note the decision in `docs/DESIGN.md`.

---

## 1. Full home page (desktop, tall screenshot)

```
Create a high-fidelity UI design mockup of a personal portfolio website for a software engineer and game developer, shown as one tall full-page desktop screenshot (1440px wide, about 1:3 portrait). Award-winning, modern, immersive 3D web design in the style of Awwwards and Dribbble showcases. Flat screenshot only — no laptop frame, no browser chrome, no people.

OVERALL STYLE
- Dark "deep space" theme: near-black background (#07060F) with a soft violet nebula glow at the top.
- Primary colour electric violet (#7C5CFF), accent cyan (#22D3EE), text off-white (#ECECF4), muted grey for secondary text.
- Glassmorphism cards: translucent dark panels, 1px subtle white border, background blur, soft violet glow on hover.
- Typography: clean geometric sans-serif (like Geist or Inter) for headings, monospace for small labels and tech tags.
- Tiny white stars scattered across the whole page background, generous spacing, 12-column grid, max content width about 1150px, centred.

NAVBAR (top, floating)
- Rounded pill-shaped glass navbar floating 16px from the top.
- Left: logo text "Pravihara.dev" in monospace, ".dev" in violet.
- Right: links "About  Experience  Projects  Skills  Education  Contact".

HERO SECTION (full screen height, two columns)
- Left column, vertically centred:
  - Small cyan pill badge with a glowing dot: "Open to .NET roles".
  - Huge bold heading on two lines: "Hi, I'm" in white and "Pravihara" with a violet-to-cyan gradient.
  - Monospace subtitle: "Software Engineer · .NET & Full-Stack".
  - One short grey sentence: "I build SaaS, AI products, mobile apps — and now Unity games."
  - Two buttons: solid violet rounded "View my work ↗" and outlined "Download CV ↓". Next to them a small map-pin icon with "Sri Lanka".
- Right column: the hero 3D scene (the visual focus of the page):
  - A floating low-poly 3D island hovering in space, rendered in a stylised, soft-lit, glossy 3D style (like Spline or Blender Eevee renders).
  - On the island: a small glowing laptop showing lines of colourful code, a tiny game controller, a stack of small glowing cubes like a Unity game prototype, and a miniature server rack with blinking lights.
  - Around the island: translucent holographic glass panels orbiting it — one shows C# code, one shows a small bar chart dashboard, one shows a phone app screen.
  - A thin glowing cyan orbit ring circles the island at an angle; a few small violet and cyan geometric shapes (icosahedron, torus, cube) float nearby.
  - Rim lighting in violet from the left and cyan from the right, soft bloom glow, subtle depth of field.
  - Show motion: light motion-blur trails along the orbit ring and particles drifting upward to suggest the scene slowly rotates and floats.
- Bottom centre of hero: a small "scroll" mouse icon with a thin line.

ABOUT SECTION
- Small cyan monospace label "01 · ABOUT", large heading "Engineer, builder, now game designer."
- Left: three short paragraphs of grey body text.
- Right: three stacked glass stat cards with big gradient numbers: "84–95%" (Query load cut), "~130" (Pages migrated to React), "1 yr" (Enterprise SaaS).

EXPERIENCE SECTION
- Label "02 · EXPERIENCE", heading "Where I've worked".
- Vertical timeline line on the left with a glowing violet dot.
- One large glass card: "Full-Stack Software Engineer @ Factum Software Solutions", date "Nov 2025 – Present" in monospace on the right, 4 bullet points with cyan bullets, and a row of small rounded tech tags (Laravel, React, MySQL, Redis, AWS).

PROJECTS SECTION
- Label "03 · PROJECTS", heading "Things I've built".
- Bento grid of glass cards:
  - One wide featured card "SHAI — Smart Hospital AI" with three big gradient metrics ("0.73 AUC", "110k", "40 features") and a small dashboard screenshot.
  - Two cards side by side: "SwymWise" with a phone mockup, and "Mobile Game Design" with a colourful low-poly game screenshot and a cyan "In progress" badge.
  - Three smaller cards below: "Auctinier", "Solo Travel Mate", "Jumpbook Redesign".
- Each card has small tech tags at the bottom; one card is shown in hover state, slightly lifted with a violet glow.

SKILLS SECTION
- Label "04 · SKILLS", heading "My toolkit".
- 4×2 grid of glass cards, each with a monospace cyan title (Languages, .NET & Backend, Databases, Frontend, Cloud & DevOps, AI & Data, Game Dev, Practices) and wrapped rounded tags.
- Behind the grid, a faint 3D cloud of floating tech logos/spheres connected by thin lines like a constellation.

EDUCATION SECTION
- Label "05 · EDUCATION", one glass card: "BSc (Hons) Software Engineering", "NSBM Green University", "2022 – Present".

CONTACT SECTION
- Label "06 · CONTACT", big heading "Let's build something."
- Left: email, phone and LinkedIn rows with icons.
- Right: glass card form with Name, Email, Message fields and a violet "Send message" button.

FOOTER
- Thin divider line, "Designed & built by Pravihara" on the left, small social icons on the right.

Keep all text crisp, correctly spelled and legible. Consistent spacing, polished, realistic, production-ready UI.
```

---

## 2. Hero section close-up (desktop, 16:9)

Use this to iterate on the 3D object in detail.

```
Create a high-fidelity 16:9 desktop UI mockup (1440×900) of ONLY the hero section of a dark, immersive 3D portfolio website for a software engineer who also makes mobile games. Flat screenshot, no device frame, no browser chrome.

Background: near-black (#07060F) deep space with a soft violet nebula glow and tiny scattered stars.
Top: a floating rounded glass pill navbar — left "Pravihara.dev" in monospace with ".dev" in violet (#7C5CFF); right links "About  Experience  Projects  Skills  Contact".

Left half (text, vertically centred):
- Small cyan (#22D3EE) pill badge with a glowing dot: "Open to .NET roles"
- Huge bold sans-serif heading: "Hi, I'm" (white) / "Pravihara" (violet-to-cyan gradient)
- Monospace subtitle: "Software Engineer · .NET & Full-Stack"
- Grey line: "I build SaaS, AI products, mobile apps — and now Unity games."
- Buttons: solid violet "View my work ↗" and outlined "Download CV ↓"

Right half (3D hero, the star of the image):
A floating low-poly 3D island in space, stylised glossy 3D render (Spline / Blender look), soft studio lighting with violet rim light from the left and cyan rim light from the right, gentle bloom.
On the island: a glowing laptop with colourful code on screen, a small game controller, a tower of small glowing cubes like a Unity prototype, and a tiny server rack with blinking lights, plus a small low-poly tree.
Orbiting the island: three translucent holographic glass panels (C# code, a mini analytics chart, a phone app screen), a thin glowing cyan orbit ring tilted at an angle, and small floating violet/cyan geometric shapes (icosahedron, torus, cube).
Suggest animation: soft motion-blur trails along the orbit ring, small glowing particles drifting upward, the island slightly tilted as if gently rotating and bobbing.
Bottom centre: a small scroll indicator.

Crisp, correctly spelled text. Premium, modern, Awwwards-quality design.
```

---

## 3. Mobile home page (phone)

```
Create a high-fidelity mobile UI mockup (390×844, iPhone proportions, flat screenshot, no phone frame) of the same dark 3D portfolio website for "Pravihara", a software engineer and game developer.

Dark deep-space background (#07060F) with violet (#7C5CFF) and cyan (#22D3EE) accents, tiny stars, glassmorphism.
- Top: floating glass pill navbar with "Pravihara.dev" and a hamburger icon.
- Upper half: the 3D floating low-poly island with a glowing laptop, game controller and glowing cubes, a tilted cyan orbit ring and holographic glass panels around it, centred and slightly smaller.
- Below it, left-aligned: cyan badge "Open to .NET roles", big bold heading "Hi, I'm Pravihara" with "Pravihara" in a violet-to-cyan gradient, monospace subtitle "Software Engineer · .NET & Full-Stack", one grey sentence, then two full-width stacked buttons "View my work" (violet) and "Download CV" (outlined).

Crisp, legible, correctly spelled text. Modern, premium mobile web design.
```

---

## 4. Animation preview (video — Gemini with Veo)

Images can't show motion. If your Gemini plan supports video, use this to preview the animation.

```
An 8-second smooth, looping screen recording of a dark 3D portfolio website hero section, 16:9.
Near-black space background with slowly twinkling stars and a soft violet nebula glow. On the left, the heading "Hi, I'm Pravihara" fades and slides up into place, followed by the subtitle and two buttons appearing one after another.
On the right, a glossy low-poly floating 3D island (glowing laptop, game controller, glowing cubes, tiny server rack) slowly rotates and gently bobs up and down. A thin cyan orbit ring spins around it, three translucent holographic glass panels (code, chart, phone app) orbit slowly, and small violet and cyan geometric shapes float and spin. Glowing particles drift upward.
The mouse cursor moves across the screen and the 3D island tilts slightly toward it (parallax).
Then the page scrolls down smoothly: the camera glides down past the island, the island shrinks and drifts up and away, and glass cards for "About" fade in from below.
Smooth easing, cinematic, Awwwards-quality web animation, no people, no sound.
```

---

## Follow-up tweaks to try in Gemini

- "Replace the floating island with a large glowing glass Unity-style cube with code inside it."
- "Make the 3D scene an astronaut developer sitting on a floating laptop."
- "Change the palette to emerald green and warm orange."
- "Make it lighter: white background, soft pastel 3D objects."
- "Put the 3D object in the centre behind the heading instead of on the right."

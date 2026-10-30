# Architecture

```
src/
├── app/
│   ├── layout.tsx          # fonts, metadata, smooth scroll + MotionConfig
│   ├── page.tsx            # grid backdrop, cursor, navbar, hero, sections (from config), footer
│   ├── globals.css         # design tokens + utilities (label, glass, bg-grid)
│   ├── actions/contact.ts  # Server Action for the contact form (Resend)
│   ├── robots.ts, sitemap.ts
├── config/site.ts          # sections order/visibility, SEO, 3D material & lights
├── content/                # ← YOUR DATA: profile (+hero copy), hero cards, projects, experience, capabilities, skills, education
├── types/content.ts
├── lib/utils.ts            # cn()
└── components/
    ├── canvas/             # three.js / R3F (client-only)
    │   ├── HeroScene.tsx        # dynamic import, ssr:false
    │   ├── HeroCanvas.tsx       # <Canvas>, post effects, perf monitor, off-screen pause
    │   ├── Studio.tsx           # environment softboxes + mouse-following key light
    │   └── BeadArches.tsx       # instanced beaded arch sculpture
    ├── layout/             # Navbar, Footer, SmoothScroll
    ├── sections/
    │   ├── hero/           # Hero, FloatingCards, Portrait
    │   ├── terminal/       # Terminal UI + commands generated from content
    │   ├── contact/        # Contact, ContactForm, LiveClock
    │   └── Work, Experience, Capabilities, Education
    └── ui/                 # Reveal/MaskLines, SectionHeader, Badge, Cursor, MagneticBadge, CodeBlock, SocialIcon
public/
├── images/profile.jpg      # your portrait (add it)
├── images/projects/        # project screenshots
├── models/                 # .glb files
└── resume/                 # downloadable CV
```

## Rendering model

- The page is **fully static** (prerendered at build). Sections are Server Components; only interactive bits (`Navbar`, `Reveal`, `ContactForm`, the 3D canvas) are Client Components.
- The 3D scene is one `<Canvas>` at the top of the hero. It reacts to mouse and scroll, and pauses when off-screen.
- three.js is code-split and loaded only on the client, so text content is visible and indexable immediately.

## Why no database

The content changes a few times a year and is owned by one person. Typed TS files give autocompletion and build-time errors for free, cost nothing to host, and keep the site static. If a CMS is wanted later (e.g. to publish blog posts from a phone), the content layer can be swapped for Sanity/Contentful/MDX without touching components, since components only import from `@/content`.

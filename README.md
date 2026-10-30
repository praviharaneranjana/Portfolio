# Pravihara.dev — 3D Portfolio

Personal portfolio of **Pravihara Neranjana Abegunasekara**, a software engineer working across .NET, full-stack web, AI, mobile and Unity game development. Premium editorial design with a real-time 3D sculptural hero.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router, TypeScript) | Static by default, fast, deploys free on Vercel |
| Styling | **Tailwind CSS v4** | Design tokens in one CSS file, quick to restyle |
| 3D | **three.js + React Three Fiber + drei + postprocessing** | Realistic real-time 3D written as React components |
| Animation | **Motion** (`motion/react`) + **Lenis** smooth scroll | Scroll reveals, page transitions |
| Content | **Typed TS files** in `src/content/` — no database | Edit one file, get type-checking, zero hosting cost |
| Contact | Server Action + **Resend** (optional) | No backend to run; works without a key (shows a fallback) |

## Getting started

```bash
npm install
cp .env.example .env.local   # optional: contact form + site URL
npm run dev                  # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with Turbopack |
| `npm run build` | Production build (also generates route types) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

## Updating the site

- **Your info** (bio, jobs, projects, skills, education): edit files in [`src/content/`](src/content/). See [docs/CONTENT.md](docs/CONTENT.md).
- **Sections order/visibility, colours, 3D options**: [`src/config/site.ts`](src/config/site.ts).
- **Theme colours**: CSS variables at the top of [`src/app/globals.css`](src/app/globals.css).
- **Your photo**: `public/images/profile.jpg` + `photo` in `src/content/profile.ts`.
- **Hero code cards**: [`src/content/hero.ts`](src/content/hero.ts).
- **3D scene**: [`src/components/canvas/`](src/components/canvas/). See [docs/3D.md](docs/3D.md).
- **CV PDF**: replace `public/resume/Pravihara_Abegunasekara.pdf`.

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — folder layout and how the pieces fit
- [docs/CONTENT.md](docs/CONTENT.md) — editing your content
- [docs/3D.md](docs/3D.md) — working with the 3D scene and models
- [docs/DESIGN.md](docs/DESIGN.md) — design system and the brief for the final UI
- [docs/ROADMAP.md](docs/ROADMAP.md) — what's done and what's next

## Deploy

Push to GitHub and import the repo on [Vercel](https://vercel.com). Set `NEXT_PUBLIC_SITE_URL` (and the Resend vars if you want the contact form to send email).

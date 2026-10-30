# Editing content

Everything shown on the site comes from `src/content/`. TypeScript checks your edits — if you misspell a field, `npm run build` tells you.

| File | Controls |
| --- | --- |
| `profile.ts` | Name, role, contact, photo, CV path, availability, and all **hero copy** (`hero.*`: eyebrow, two-tone headline, position statement, intro, badge text) |
| `hero.ts` | Floating editor cards around the hero: code snippets, metrics, pipelines, placement and parallax depth |
| `projects.ts` | Projects. `featured: true` → large "dossier" cards with a pipeline diagram (`pipeline`) ; the rest appear in the Archive list |
| `experience.ts` | Jobs (newest first), with optional `metrics` tiles |
| `capabilities.ts` | The four capability domain cards |
| `skills.ts` | The "Full toolkit" list (and the terminal `stack` command) |
| `education.ts` | Degrees and modules |

The **terminal** section reads from these files automatically (`src/components/sections/terminal/commands.ts`).

## Adding your photo

1. Save a portrait (4:5 ratio, ≥ 800×1000) as `public/images/profile.jpg`.
2. In `profile.ts` set `photo: "/images/profile.jpg"`.

## Adding a project

```ts
{
  slug: "my-game",
  title: "My Game",
  subtitle: "Hyper-casual Unity mobile game",
  category: "game",                // web | ai | mobile | game | design
  status: "in-progress",           // shipped | in-progress | academic
  featured: true,
  summary: "One or two sentences on what it is and why it matters.",
  pipeline: ["Input", "Gameplay", "URP", "Android"],  // 3–5 short labels
  stack: ["Unity", "C#"],
  highlights: ["What it does", "What you're proud of"],
  metrics: [{ label: "Downloads", value: "1k" }],     // optional, max 3
  links: [{ label: "Play", href: "https://..." }],    // optional
}
```

## Adding a hero card

```ts
{
  id: "api",
  kind: "code",                    // code | metrics | pipeline
  title: "OrdersController.cs",
  badge: ".NET 9",
  language: "csharp",              // csharp | php | python
  code: `[HttpGet("{id}")]\npublic async Task<IActionResult> Get(int id) => Ok(await _orders.FindAsync(id));`,
  position: { top: "20vh", left: "5%" },
  width: "18rem",
  depth: 30,                       // parallax strength; negative = opposite direction
}
```

Keep 3–4 cards; more crowds the sculpture.

## Hiding or reordering sections

`src/config/site.ts` → `sections`. `enabled: false` hides; `nav: false` keeps it out of the header.

## Open TODOs in content

- Add your photo (see above).
- Add GitHub URL in `profile.ts`.
- Add real Unity prototypes (screenshots, WebGL/store links) to the `unity-mobile-games` project.
- Add `links` (GitHub/live demo) to SHAI and SwymWise if public.
- Confirm the email spelling: `pravihranera1998@gmail.com`.

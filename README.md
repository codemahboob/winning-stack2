# Winning Stack — Bundle Landing Page

A single static page, no build step required.

## Deploy to Vercel

**Option A — Vercel dashboard (no CLI)**
1. Go to https://vercel.com/new
2. Choose "Deploy" → drag and drop this folder (or upload as a .zip)
3. Vercel auto-detects it as a static site — click Deploy

**Option B — Vercel CLI**
```
npm i -g vercel
cd winning-stack
vercel
```
Follow the prompts. Vercel will give you a live URL immediately, and a production URL after `vercel --prod`.

**Option C — GitHub**
1. Push this folder to a new GitHub repo
2. In Vercel, "Add New Project" → import the repo → Deploy

## Files
- `index.html` — the whole page (HTML/CSS inline, Google Fonts via CDN)
- `vercel.json` — static hosting config (clean URLs)

## Editing
- Price, copy, and reviews: edit directly in `index.html`
- Colors/spacing: CSS variables at the top of the `<style>` block (`--red`, `--paper`, `--space-*`)
- CTA button currently points to `#` — update the `href` on the `.cta` link to your checkout URL

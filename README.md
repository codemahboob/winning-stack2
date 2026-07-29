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
- `index.html` — the landing page (HTML/CSS/JS inline, Google Fonts via CDN)
- `privacy.html` — Privacy Policy
- `refund.html` — Return & Refund Policy
- `api/razorpay-webhook.js` — receives Razorpay's payment confirmation, emails the download link via Resend
- `api/download.js` — validates the emailed link (signature + 24-hour expiry) and redirects to the bundle file
- `vercel.json` — static hosting config (clean URLs)
- `package.json` — marks this as a Node project so Vercel builds the `api/` functions

## How fulfillment works

```
Customer pays → Razorpay confirms payment (server-to-server webhook)
             → api/razorpay-webhook.js verifies it's genuinely from Razorpay
             → generates a signed link that expires in 24 hours
             → calls the Resend API to email that link to the customer
Customer clicks the emailed link → api/download.js checks the signature + expiry
             → redirects to the real bundle file
```

This is the important upgrade from the earlier client-only version: fulfillment now happens **server-side**, triggered by Razorpay itself, not by the customer's browser. That means it can't be skipped or faked by closing the tab early.

## Required environment variables

Set these in Vercel → your project → Settings → Environment Variables:

| Variable | What it is |
|---|---|
| `RAZORPAY_WEBHOOK_SECRET` | A secret you create when setting up the webhook in Razorpay (see below) |
| `RESEND_API_KEY` | From resend.com/api-keys |
| `RESEND_FROM_EMAIL` | e.g. `Winning Stack <bundle@yourdomain.com>` — must be a domain you've verified in Resend |
| `DOWNLOAD_TOKEN_SECRET` | Any long random string — used to sign download links so they can't be forged |
| `SITE_URL` | Your deployed URL, e.g. `https://your-project.vercel.app` (no trailing slash) |
| `BUNDLE_FILE_URL` | Where the real bundle file lives — a Google Drive direct-download link, S3 signed URL, or a file you host under `/public` |

## Before you go live — setup steps

**1. Meta Pixel** — in `index.html`, replace both instances of `YOUR_PIXEL_ID` in the `<head>` with your real Pixel ID from Meta Events Manager.

**2. Razorpay checkout key** — in `index.html`, replace `YOUR_RAZORPAY_KEY_ID` in the `get-bundle-btn` handler with your Key ID from the Razorpay Dashboard.

**3. Razorpay webhook** — in Razorpay Dashboard → Settings → Webhooks:
- Webhook URL: `https://yourdomain.com/api/razorpay-webhook`
- Active events: `payment.captured`
- Set a secret, and save that same value as `RAZORPAY_WEBHOOK_SECRET` in Vercel

**4. Resend** — verify your sending domain in Resend, then set `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.

**5. Deploy, then test end-to-end** with a real ₹1 test payment (Razorpay test mode) and confirm the email arrives with a working link before switching to live keys.

⚠️ Razorpay's checkout collects the customer's email as part of its own form, so no extra work is needed there — the webhook payload already includes it.

## Editing
- Price, copy, and reviews: edit directly in `index.html`
- Colors/spacing: CSS variables at the top of the `<style>` block (`--red`, `--paper`, `--space-*`)
- Legal page contact email: currently `support@digiecom.example` in both `privacy.html` and `refund.html` — update to your real support email

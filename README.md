This is a [Next.js](https://nextjs.org) project — a live solar string-comparison dashboard for the eSenZ monitoring platform.

**Tech stack:** Next.js 14 (Pages Router), React 18, Recharts, Tailwind CSS 3.

## Getting Started

```bash
yarn install
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

The dashboard fetches a key-safe server proxy (`/api/esenz-live`) that calls the eSenZ upstream feed. The plant key lives only in `process.env.ESENZ_KEY` — copy `.env.local.example` to `.env.local` and set it before running.

## Project structure

```
pages/
  index.js        – main dashboard page (/)
  _app.js         – app shell: theme provider, global fonts, CSS
  _document.js    – sets saved/system theme before first paint
  api/
    esenz-live.js – server-side proxy for the eSenZ live feed
components/       – dashboard panels (TopBar, KpiStrip, InverterTiles, …)
lib/
  esenz.js        – feed helpers, derived series, anomaly thresholds
  theme.jsx       – small theme context (light/dark, localStorage)
styles/
  globals.css     – Tailwind + theme tokens (light/dark)
```

## Deploy on Vercel

Push to `main` and Vercel will auto-deploy from the connected repository.

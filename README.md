This is a [Next.js](https://nextjs.org) project — a live solar string-comparison dashboard for the eSenZ monitoring platform.

**Tech stack:** Next.js 14 (Pages Router), React 18, Recharts, Tailwind CSS 3.

## Getting Started

```bash
yarn install
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

The dashboard fetches a key-safe server proxy (`/api/esenz-live`) that calls the eSenZ upstream feed. The plant key lives only in `process.env.ESENZ_KEY` — copy `.env.local.example` to `.env.local` and set it before running.

## Sign-in

Every page and API route sits behind a session cookie enforced by `middleware.js`, so an unauthenticated visitor never receives the dashboard HTML or any plant data — there is nothing for "view source" or DevTools to show.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DASH_USER` | yes | Username accepted by the sign-in form |
| `DASH_PASS` | yes | Password, compared server-side only |
| `SESSION_SECRET` | no | Signs the session cookie; derived from the credentials when unset |

Credentials are compared inside `pages/api/login.js` and never reach client-side JavaScript. A successful sign-in sets an httpOnly, `SameSite=Lax` cookie carrying a signed 12-hour expiry — no server-side session store, so it works across serverless invocations.

With `DASH_USER` / `DASH_PASS` unset the app **fails closed**: nobody can sign in, and the login screen says which variables are missing.

## Project structure

```
middleware.js     – gates every page/API route on the session cookie
pages/
  index.js        – main dashboard page (/)
  login.js        – sign-in screen
  _app.js         – app shell: theme provider, global fonts, CSS
  _document.js    – sets saved/system theme before first paint
  api/
    esenz-live.js – server-side proxy for the eSenZ live feed
    login.js      – verifies credentials, issues the session cookie
    logout.js     – clears the session cookie
components/       – dashboard panels (TopBar, KpiStrip, InverterTiles, …)
lib/
  auth.js         – cookie signing/verification (Edge + Node safe)
  esenz.js        – feed helpers, derived series, anomaly thresholds
  theme.jsx       – small theme context (light/dark, localStorage)
styles/
  globals.css     – Tailwind + theme tokens (light/dark)
```

## Deploy on Vercel

Push to `main` and Vercel will auto-deploy from the connected repository.

Set `ESENZ_KEY`, `DASH_USER` and `DASH_PASS` under **Settings → Environment Variables** (Production). Vercel only injects environment variables at build/run time of a *new* deployment, so redeploy after adding or changing any of them.

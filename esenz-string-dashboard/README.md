# eSenZ String Dashboard

A live solar string-comparison dashboard for the **eSenZ monitoring platform**,
built with **Next.js 14 (Pages Router)**, React, Tailwind CSS, and Recharts.

It polls the eSenZ live JSON feed server-side (the plant API key never reaches
the browser), then visualises per-string current / Amp-hour data with automatic
anomaly detection per inverter.

## Features

- 🔒 **Key-safe**: the eSenZ plant key lives only in `.env.local` and is consumed
  exclusively by the server-side API route `pages/api/esenz-live.js`.
- 🎛️ **"Plant control room" UI** — dark graphite-green theme (Space Grotesk /
  IBM Plex Mono / Inter), edge-to-edge left-aligned layout, dense mono readouts.
- 📶 **KPI strip**: Total Power, Energy Today, PR Ratio (or CUF when the platform
  doesn't publish irradiance), Irradiance, Active Alerts — with count-up animation.
- 🏭 **Inverter tiles**: per-inverter avg current, string count, live status, and
  a mini sparkline of the last ~2h.
- 📈 **Power vs Irradiation dual-axis chart** (Recharts `ComposedChart`) with
  tabs: kW vs Irr · Inv kW vs Irr · E. Hourly · E. Daily · E. Monthly · E. Yearly.
- 🚨 **Alerts panel**: underperforming strings with plain-language likely cause
  and an Acknowledge action (threshold `DEVIATION`/`ALERT_THRESHOLD` in
  `lib/esenz.js`).
- 🟩 **String deviation heatmap** — tiles colored by Δ vs inverter average
  (±3% green, -3…-10% amber, below -10% / API fault red); clicking a tile opens
  a detail drawer.
- 📊 **Sortable / searchable data table** with sticky header, inline deviation
  sparklines per row, and CSV export.
- 🔄 **Refresh ring countdown** on the 60s poll + live wall clock + manual
  refresh.
- 🌙 **Night-mode handling**: eSenZ paints every string `#FFDCDC` when the plant
  produces nothing (evenings). The dashboard pauses anomaly alerts in that state
  — your alarm feed won't scream all night, and it resumes automatically at dawn.
- ⚠️ **Anomaly detection**: a string is flagged when it is more than **15%**
  below its *own inverter's* average for the selected metric, **or** when the
  eSenZ API itself marks it red (`STATUS_COLOUR_BACKGROUND === "#FFDCDC"`) while
  the plant is producing.
- 📱 **Mobile responsive** — cards and controls stack on small screens.

> **Note on "history"**: the live eSenZ snapshot carries no time-series data.
> Sparklines, the Power vs Irradiation curves, and the hourly/daily/monthly/yearly
> energy bars are *derived* approximations anchored to the real live values
> (footnoted in the UI for transparency). All KPI tiles and per-string numbers
> are real feed values.

## Setup

> Requires Node.js 18.17+ (Next.js 14 requirement).

```bash
# 1. Install dependencies
npm install

# 2. Configure the plant key (never commit the real value)
cp .env.local.example .env.local
#    → edit .env.local and set ESENZ_KEY=<your_plant_key>

# 3. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production

```bash
npm run build
npm run start
```

## How it works

1. The browser calls the local endpoint **`/api/esenz-live`** on mount, then
   every **60 seconds** (and on demand via the "Refresh now" button).
2. `pages/api/esenz-live.js` reads `ESENZ_KEY` from `process.env`, fetches
   `https://esenz.co.in/esenzAPIDashboardFromRT.aspx?KEY=...` **server-side**,
   and parses the response as text + `JSON.parse()` (the upstream `Content-Type`
   is `text/html` although the body is JSON — never call `.json()` on it).
3. The route replies with the payload and
   `Cache-Control: s-maxage=30, stale-while-revalidate=60` (fresh for shared
   caches for 30s, stale-served for up to 60s while background revalidation
   happens). The client always requests with `cache: 'no-store'` so polls get
   fresh data.
4. `components/StringDashboard.jsx` flattens `STRING_INFO_GROUPED` dynamically,
   computes per-inverter averages, applies anomaly detection, and renders the
   UI.

## Tuning

The anomaly threshold is a single named constant at the top of
`components/StringDashboard.jsx`:

```js
const DEVIATION_THRESHOLD = 0.15; // flag strings >15% below inverter average
```

Change it (e.g. `0.10` for 10%) and restart the dev server.

## Project structure

```
.
├── components/StringDashboard.jsx   # dashboard UI + anomaly logic
├── pages/
│   ├── _app.js                      # global styles import
│   ├── index.js                     # renders <StringDashboard />
│   └── api/esenz-live.js            # server-side eSenZ proxy (key-safe)
├── styles/globals.css               # Tailwind directives
├── .env.local.example               # ESENZ_KEY template
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```
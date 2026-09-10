// lib/esenz.js
// Pure helpers shared across the dashboard. The eSenZ feed is a point-in-time
// snapshot, so every "history" this file produces is DERIVED — deterministic,
// anchored to the current live values, never random, and footnoted in the UI.

export const DEVIATION_GOOD = 0.03; // within ±3% of inverter avg -> ok (green)
export const DEVIATION_WARN = 0.1; // -3..-10% below avg -> warn (amber)
export const ALERT_THRESHOLD = 0.15; // beyond -15% below avg -> alert (red)
export const API_FAULT_COLOUR = '#FFDCDC'; // eSenZ's own fault flag colour

export const POLL_INTERVAL_MS = 60 * 1000;
export const ALL_FILTER = 'ALL';
export const CHART_TABS = [
  'kW vs Irr',
  'Inv kW vs Irr',
  'E. Hourly',
  'E. Daily',
  'E. Monthly',
  'E. Yearly',
];

export const METRICS = [
  { key: 'live', label: 'Live Current', field: 'live', unit: 'A', decimals: 2 },
  { key: 'ahToday', label: 'Ah Today', field: 'ahToday', unit: 'Ah', decimals: 1 },
  { key: 'ahMonth', label: 'Ah This Month', field: 'ahMonth', unit: 'Ah', decimals: 1 },
  { key: 'ahYear', label: 'Ah This Year', field: 'ahYear', unit: 'Ah', decimals: 1 },
];

// Tolerantly convert upstream values ("1,234.5", "5.6 ", null, 0) to numbers.
export function toNumber(raw) {
  if (raw === null || raw === undefined) return 0;
  const cleaned = String(raw).replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

export function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

// Deterministic 0..1 noise so derived curves look organic but stay stable.
function dither(seed, i) {
  const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Solar day shape 0..1 (peak ~12:45) for a local minute-of-day.
function solShape(min) {
  const start = 6 * 60;
  const end = 19.5 * 60;
  if (min <= start || min >= end) return 0;
  const t = (min - start) / (end - start);
  return Math.pow(Math.sin(Math.PI * t), 1.6);
}

function nowMinutes(now) {
  return now.getHours() * 60 + now.getMinutes();
}

function fmtHM(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Flatten STRING_INFO_GROUPED into {label, strings[]}. Falls back to the flat
// STRING_INFO shape (grouped on the fly by INVERTER_NUMBER) when needed.
export function flattenPayload(data) {
  let groups = (data && data.STRING_INFO_GROUPED) || [];
  if (!Array.isArray(groups) || groups.length === 0) {
    const flat = (data && data.STRING_INFO) || [];
    if (Array.isArray(flat) && flat.length > 0) {
      const byInv = new Map();
      flat.forEach((s) => {
        const num = Number(s.INVERTER_NUMBER);
        const label = `INV${(Number.isFinite(num) ? num : 0) + 1}`;
        if (!byInv.has(label)) byInv.set(label, []);
        byInv.get(label).push(s);
      });
      groups = Array.from(byInv, ([label, strings]) => ({ GROUP_LABEL: label, STRING_INFO: strings }));
    }
  }
  return groups
    .filter((g) => g && Array.isArray(g.STRING_INFO))
    .map((g) => ({
      label: g.GROUP_LABEL || 'UNKNOWN',
      strings: g.STRING_INFO.map((s) => ({
        id: s.LEGEND_ID || 'UNKNOWN',
        live: toNumber(s.VALUE),
        ahToday: toNumber(s.VALUE_AH_TODAY),
        ahMonth: toNumber(s.VALUE_AH_THIS_MONTH),
        ahYear: toNumber(s.VALUE_AH_THIS_YEAR),
        apiFlaggedRaw:
          String(s.STATUS_COLOUR_BACKGROUND || '').trim().toUpperCase() === API_FAULT_COLOUR,
      })),
    }));
}

// Annotate groups: inverter averages + per-string deviation/level/flag for `field`.
// `apiFlagActive` gates the API's red flag: eSenZ marks EVERY string #FFDCDC at
// night when there's zero output, so we only treat that red as a real fault when
// the plant is actually producing (some string current > 0).
export function enrichGroups(groups, field, apiFlagActive = true) {
  return groups.map((g) => {
    const n = g.strings.length || 1;
    const avg = g.strings.reduce((sum, s) => sum + s[field], 0) / n;
    const avgCurrent = g.strings.reduce((sum, s) => sum + s.live, 0) / n;
    const strings = g.strings.map((s) => {
      const deviationPct = avg > 0 ? ((s[field] - avg) / avg) * 100 : null;
      const apiFlagged = s.apiFlaggedRaw && apiFlagActive;
      let level = 'ok';
      if (apiFlagged) level = 'crit';
      else if (deviationPct !== null && deviationPct < -DEVIATION_WARN * 100) level = 'crit';
      else if (deviationPct !== null && deviationPct < -DEVIATION_GOOD * 100) level = 'warn';
      const flagged = apiFlagged || (avg > 0 && s[field] < avg * (1 - ALERT_THRESHOLD));
      return { ...s, deviationPct, level, flagged, apiFlagged };
    });
    return {
      ...g,
      strings,
      avg,
      avgCurrent,
      flaggedCount: strings.filter((s) => s.flagged).length,
    };
  });
}

// Plain-language cause hint for an underperforming string.
export function likelyCause(s, inverterAvg) {
  if (s.apiFlagged) {
    return 'Flagged by the eSenZ monitor — inspect connector, fuse, or DC wiring.';
  }
  if (s.deviationPct !== null && s.deviationPct < -40) {
    return 'Sudden collapse (~50% down) — open string / poor connector contact likely.';
  }
  if (s.deviationPct !== null && s.deviationPct <= -ALERT_THRESHOLD * 100) {
    return 'Down >15% vs inverter avg — likely shading or soiling; schedule an inspection.';
  }
  return 'Underperforming vs inverter average — verify panel health and wiring.';
}

// Plant-level statistics pulled from the snapshot fields (all real).
export function plantStats(data, groups) {
  const capacityKw =
    toNumber(data && data.SOLAR_CAPACITY_DASHBOARD) || toNumber(data && data.SOLAR_CAPACITY) / 1000;
  const powerKw =
    toNumber(data && data.SOLAR_TOTAL_POWER_LIVE) / 1000 ||
    toNumber(data && data.SOLAR_TOTAL_POWER_LIVE_DASHBOARD);
  const energyToday =
    toNumber(data && data.SOLAR_ENERGY_TODAY_TOTAL_DASHBOARD) ||
    toNumber(data && data.SOLAR_ENERGY_TODAY_TOTAL) / 1000;
  const energyYesterday = toNumber(data && data.SOLAR_ENERGY_YESTERDAY_TOTAL) / 1000;
  const energyMonth =
    toNumber(data && data.SOLAR_ENERGY_THIS_MONTH_DASHBOARD) ||
    toNumber(data && data.SOLAR_ENERGY_THIS_MONTH) / 1000;
  const energyYear =
    toNumber(data && data.SOLAR_ENERGY_THIS_YEAR_DASHBOARD) ||
    toNumber(data && data.SOLAR_ENERGY_THIS_YEAR) / 1000;
  const irr = toNumber(data && data.IRRADIATION_LIVE) || toNumber(data && data.IRRADIATION_TODAY_RAW);
  const cuf = toNumber(data && data.CUF_TODAY);
  const prRaw = toNumber(data && data.PR_TODAY);
  // Instantaneous PR proxy when the platform hasn't published a daily PR.
  const prEst = powerKw > 0 && irr > 20 ? (powerKw / (capacityKw * 0.85)) / (irr / 1000) * 100 : null;
  const pr = prRaw > 0 ? prRaw : prEst === null ? null : clamp(prEst, 0, 120);
  const flaggedTotal = groups.reduce((sum, g) => sum + g.flaggedCount, 0);
  return {
    capacityKw,
    capacityLabel: (data && data.SOLAR_CAPACITY_DASHBOARD) || `${capacityKw} kWp`,
    plantName: (data && data.NAME) || 'Plant',
    powerKw,
    energyToday,
    energyYesterday,
    energyMonth,
    energyYear,
    irr,
    pr,
    cuf,
    flaggedTotal,
    feedStatus: (data && data.STATUS) === 'OK' ? 'ok' : 'warn',
    lastUpdated: (data && data.LAST_UPDATED) || null,
    nonComm: (data && data.NON_COMM_ALERT_MESSAGE) || null,
  };
}

// ---- One-line helpers used across the UI -------------------------------

export function fmtDelta(pct) {
  if (pct === null || pct === undefined) return '—';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

export function shortId(id) {
  // "INV01_STR_5_A" -> "STR 5"
  const m = String(id).match(/STR_(\d+)/i);
  return m ? `STR ${m[1]}` : String(id);
}

// streak-style sparkline values for the last ~2h, anchored to `live`.
export function sparkSeries(now, live, seed) {
  const end = nowMinutes(now);
  const pts = [];
  for (let m = Math.max(6 * 60, end - 120); m <= end; m += 20) {
    const shape = Math.max(0.02, solShape(m));
    pts.push({ m, shape, base: shape * (0.8 + 0.4 * dither(seed, Math.floor(m / 20))) });
  }
  if (pts.length === 0) return [live || 0];
  const last = pts[pts.length - 1];
  const factor = last.base > 0 && live > 0.05 ? live / last.base : 1;
  return pts.map((p) => Math.round(p.base * factor * 100) / 100);
}

// 15-min power + irradiance from 06:00 to "now", shaped like a solar day and
// scaled so the final data point lands on the live reading.
export function powerIrrSeries(now, { powerKw, irr, capacityKw }) {
  const to = Math.max(6 * 60, Math.min(nowMinutes(now), 19.5 * 60));
  const pts = [];
  for (let m = 6 * 60; m <= to; m += 15) {
    const shape = solShape(m);
    pts.push({
      time: fmtHM(m),
      powerKw: Math.round(shape * capacityKw * 0.85 * 10) / 10,
      irradiance: Math.round(shape * 1050),
      _shape: shape,
    });
  }
  if (pts.length === 0) return [];
  const last = pts[pts.length - 1];
  const pScale = last._shape > 0.02 ? clamp(powerKw / last.powerKw, 0.12, 2.5) : 1;
  const iScale = last._shape > 0.02 ? clamp(irr / last.irradiance, 0.12, 2.5) : 1;
  pts.forEach((p) => {
    if (p._shape > 0) {
      p.powerKw = p._shape > 0.02 ? Math.round(clamp(p.powerKw * pScale, 0, capacityKw * 1.25) * 10) / 10 : 0;
      p.irradiance = Math.max(0, Math.round(p.irradiance * iScale));
    }
    delete p._shape;
  });
  return pts;
}
// Energy series (kWh) for the "E. Hourly / Daily / Monthly / Yearly" tabs.
// Derived from the real totals in the snapshot; the current-day tail is the
// latest live reading.

export function hourlyEnergy(now, { energyToday, powerKw }) {
  const to = Math.max(6, Math.min(Math.floor(nowMinutes(now) / 60), 19));
  const arr = [];
  for (let h = 6; h <= to; h++) {
    const m = h * 60;
    arr.push({ time: fmtHM(m), shape: solShape(m) });
  }
  if (arr.length === 0) return [];
  const lastIdx = arr.length - 1;
  const prev = arr.slice(0, -1);
  const prevSum = prev.reduce((s, r) => s + r.shape, 0) || 1;
  const others = Math.max(0, energyToday - powerKw) || energyToday * 0.8;
  return arr.map((r, i) =>
    i === lastIdx
      ? { time: r.time, energy: Math.round(powerKw * 100) / 100 }
      : { time: r.time, energy: Math.round((r.shape / prevSum) * others * 100) / 100 }
  );
}

export function dailyEnergy(now, { energyToday, energyYesterday }) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    let v;
    if (i === 0) v = energyToday;
    else if (i === 1) v = energyYesterday;
    else v = Math.max(0, energyToday * (1 - i * 0.07) * (0.92 + 0.16 * dither(11, i)));
    out.push({ time: days[d.getDay()], energy: Math.round(v * 10) / 10, date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) });
  }
  return out;
}

export function monthlyEnergy(now, { energyMonth, energyToday }) {
  const today = now.getDate();
  const y = now.getFullYear();
  const m = now.getMonth();
  const out = [];
  for (let d = 1; d <= today; d++) {
    const wd = new Date(y, m, d).getDay();
    const shape = solShape(7 * 60 + (d % 6) * 7) * (wd === 0 || wd === 6 ? 0.8 : 1);
    out.push({ time: `${d}`, shape });
  }
  const prevSum = out.slice(0, -1).reduce((s, r) => s + r.shape, 0) || 1;
  const prevEnergy = Math.max(0, energyMonth - energyToday);
  return out.map((r, i) =>
    i === out.length - 1
      ? { time: r.time, energy: Math.round(energyToday * 10) / 10 }
      : { time: r.time, energy: Math.round((r.shape / prevSum) * prevEnergy * 100) / 100 }
  );
}

export function yearlyEnergy(now, { energyYear, energyMonth }) {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const shape = [0.55, 0.6, 0.8, 0.95, 1, 1, 1, 0.95, 0.85, 0.75, 0.6, 0.5]; // Udaipur seasonality
  const m = now.getMonth();
  const soFar = shape.slice(0, m + 1).reduce((s, v) => s + v, 0) || 1;
  const out = [];
  for (let i = 0; i <= m; i++) {
    const e = i === m ? energyMonth : (energyYear * shape[i]) / soFar;
    out.push({ time: names[i], energy: Math.round(e * 10) / 10 });
  }
  return out;
}
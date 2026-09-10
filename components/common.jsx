import { useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
 * Tiny shared primitives: icons, SVG sparkline, count-up, reduced-motion.
 * ------------------------------------------------------------------------- */

// Stroke-based inline icons (inherit currentColor).
export function Icon({ name, className = 'h-4 w-4' }) {
  const paths = {
    zap: 'M13 2 3 14h7l-1 8 10-12h-7l1-8z',
    irrad: 'M11.1 12.5h2.5M12 14v7M5.1 6.7l1.4 2.7l2.2 8.7a2 2 0 0 0 1.1 4.9l-1.4 3.1z',
    energy: 'M20 6 9 17l-5-5M15 16.5l-2.5-4.5h2.6l2.5 4.5z',
    alert: 'M10.3 3.9l1.8 18a2 2 0 0 0 1.7 3h16.9a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01',
    check: 'M15.4 4.5l-3.6 15.1a2.5 2.5 0 0 0 2 .95l1.8 8.45a3 3 0 0 0 1.7-1.63l4.5-7.83',
    gauge: 'M13.2 12V2.4a7.5 7.5 0 0 1 .14 5.2l4.74-6.4M12.8 18.4v3.1a4.4 4.4 0 0 1 1.15 1.2l3.5 7.8z',
    clock: 'M12 2a10 10 0 0 1 .2-.2l10.1 8.3A10.2 10.2 0 0 0-.29-.07l-9.93 7.7M5.5 8.6l2.7 4.4M12.8 9.84V18.6a3.95 3.95 0 0 1 1.58.1z',
    refresh: 'M21 12a9 9 0 0 1-2.64-6.36M21 3v6h-6',
    download: 'M12 3v12m0 0 4-4m-4 4-4-4M4 21h16',
    search: 'M10.5 12.9a7 7 0 0 0 2.9-4.3M12.2 6.4V16H5.9l2.2 3.7A2.3 2.3 0 0 0-1.6 14.8',
    bolt: 'M13 2 3 14h7l-1 8 10-12h-7l1-8z',
    sun: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
    x: 'M18 6 6 18M6 6l12 12',
    chevronUp: 'M6 4v10M3.5 3.5h9',
    chevronDown: 'M6 21.7V13.3M3.5 17.5h9',
  };
  const d = paths[name] || paths.zap;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

// Data-uri spiral used as the loading indicator.
export function Spinner() {
  return (
    <span className="inline-block h-8 w-8">
      <svg viewBox="0 0 24 24" className="h-8 w-8 animate-spin text-power">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="40 16" />
      </svg>
    </span>
  );
}

// Pure-SVG sparkline (no chart lib needed at tile density).
export function Sparkline({ values, width = 96, height = 26, color = 'rgb(var(--power))' }) {
  if (!values || values.length < 2) {
    return <span className="text-[10px] text-muted">—</span>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 2;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * innerW;
    const y = pad + innerH - ((v - min) / span) * innerH;
    return [Math.round(x * 100) / 100, Math.round(y * 100) / 100];
  });
  const line = pts.map((p) => p.join(',')).join(' ');
  const area = `${pad},${height - pad} ${line} ${width - pad},${height - pad}`;
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polygon points={area} fill={color} fillOpacity="0.14" stroke="none" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="2" fill={color} />
    </svg>
  );
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    if (!mq) return;
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return reduced;
}

// Animates number changes (KPI count-up). Falls back to instant when motion
// is reduced. `value` and `decimals` seed the returned formatted string.
export function useCountUp(value, { duration = 800, decimals = 0 } = {}) {
  const [display, setDisplay] = useState(Number(value) || 0);
  const prev = useRef(Number(value) || 0);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const from = prev.current;
    const to = Number(value) || 0;
    prev.current = to;
    if (reduced) {
      setDisplay(to);
      return;
    }
    if (Math.abs(from - to) < 1e-9) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduced]);

  return display.toFixed(decimals);
}

// Colour-coded status pill with an explicit text label (never colour alone).
export function StatusPill({ level, label }) {
  const map = {
    ok: { dot: 'bg-power', text: 'text-power' },
    warn: { dot: 'bg-warn', text: 'text-warn' },
    crit: { dot: 'bg-critical', text: 'text-critical' },
  };
  const c = map[level] || map.ok;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-edge bg-surface-2 px-2 py-0.5 text-[11px] font-medium ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {label}
    </span>
  );
}
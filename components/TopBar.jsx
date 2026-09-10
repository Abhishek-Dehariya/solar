import { useEffect, useRef, useState } from 'react';
import { Icon } from './common';
import { useTheme } from '../lib/theme';

/* Live wall-clock for the top bar. */
function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  return (
    <div className="hidden items-baseline gap-2 sm:flex">
      <span className="font-mono text-lg text-ink tnum">{time}</span>
      <span className="text-xs text-muted">{date}</span>
    </div>
  );
}

/* Refresh button wrapped in a 60s countdown ring. Uses theme-aware colors. */
function RefreshRing({ remainingMs, totalMs, refreshing, onRefresh }) {
  const R = 8;
  const C = 2 * Math.PI * R;
  const frac = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  const color = refreshing
    ? 'rgb(var(--warn))'
    : frac < 0.15
    ? 'rgb(var(--critical))'
    : 'rgb(var(--power))';
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={refreshing}
      title={refreshing ? 'Refreshing…' : 'Refresh now'}
      className="relative flex h-11 w-11 items-center justify-center rounded-full border border-edge bg-surface-2 text-muted transition-colors hover:border-power/60 hover:text-ink disabled:opacity-60"
    >
      <svg viewBox="0 0 20 20" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="10" cy="10" r={R} fill="none" stroke="rgb(var(--edge))" strokeWidth="1.5" />
        <circle
          cx="10"
          cy="10"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - frac)}
        />
      </svg>
      <Icon name={refreshing ? 'clock' : 'refresh'} className="h-4 w-4" />
    </button>
  );
}

/* Sun/moon toggle that flips between day (light) and night (dark) themes. */
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Switch to day mode (light)' : 'Switch to night mode (dark)'}
      aria-label={theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode'}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-edge bg-surface-2 text-muted transition-colors hover:border-power/60 hover:text-ink"
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="h-5 w-5" />
    </button>
  );
}

/* Top bar: plant identity + live clock + feed/night status + refresh. */
export default function TopBar({ stats, syncedAgo, remainingMs, totalMs, refreshing, nightMode, onRefresh }) {
  const feedOk = stats && stats.feedStatus === 'ok';
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-power/80" aria-hidden="true" />
          <h1 className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            Solar Dashboard
          </h1>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted">
       {stats ? `RGPV · ${stats.capacityLabel}` : 'Connecting…'},
          {stats && stats.lastUpdated ? <span className="text-dim"> · feed {stats.lastUpdated}</span> : null}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={`hidden rounded-full border px-2.5 py-1 text-[11px] font-medium md:inline-flex ${
            nightMode
              ? 'border-edge bg-surface-2 text-muted'
              : feedOk
              ? 'border-edge bg-surface-2 text-power'
              : 'border-warn/40 bg-warn/10 text-warn'
          }`}
        >
          {nightMode ? '☾ NIGHT · alerts paused' : feedOk ? '● LIVE' : '● DEGRADED'}
        </span>
        <span className="hidden text-xs text-muted lg:block">synced {syncedAgo}s ago</span>
        <LiveClock />
        <ThemeToggle />
        <RefreshRing remainingMs={remainingMs} totalMs={totalMs} refreshing={refreshing} onRefresh={onRefresh} />
      </div>
    </header>
  );
}
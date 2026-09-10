import { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { METRICS, ALL_FILTER, shortId, fmtDelta, sparkSeries, likelyCause } from '../lib/esenz';
import { Icon } from './common';

const LEVEL_STYLE = {
  ok: { bg: 'bg-power/[.08]', border: 'border-power/50', text: 'text-ink' },
  warn: { bg: 'bg-warn/[.10]', border: 'border-warn/60', text: 'text-ink' },
  crit: { bg: 'bg-critical/[.12]', border: 'border-critical/60', text: 'text-ink' },
};

const LEVEL_BAR = {
  ok: 'rgb(var(--power))',
  warn: 'rgb(var(--warn))',
  crit: 'rgb(var(--critical))',
};

/* One heatmap tile: string id, live value, Δ vs inverter avg, status bar. */
function Tile({ string, group, metric, onOpen }) {
  const s = LEVEL_STYLE[string.level] || LEVEL_STYLE.ok;
  const bar = LEVEL_BAR[string.level] || 'rgb(var(--power))';
  return (
    <button
      type="button"
      onClick={() => onOpen(group, string)}
      title={`${string.id} · ${metric.label} ${string[metric.field].toFixed(metric.decimals)}${metric.unit ?? ''} · ${fmtDelta(string.deviationPct)} vs ${group}`}
      className={`flex flex-col items-start gap-1 rounded-md border ${s.border} ${s.bg} p-2 text-left shadow-tile transition-colors hover:border-ink/40`}
    >
      <span className="truncate w-full font-mono text-[10px] text-muted">{shortId(string.id)}</span>
      <span className={`w-full text-right font-mono text-sm tnum ${s.text}`}>
        {string[metric.field].toFixed(metric.decimals)}
      </span>
      <span
        className={`w-full text-right font-mono text-[10px] tnum ${
          string.level === 'ok' ? 'text-power' : string.level === 'warn' ? 'text-warn' : 'text-critical'
        }`}
      >
        {fmtDelta(string.deviationPct)}
      </span>
      <span className="mt-auto h-0.5 w-full rounded" style={{ background: bar }} aria-hidden="true" />
    </button>
  );
}

/* Slide-over drawer: one string's full readout + 2h derived series. */
function StringDrawer({ group, string, metric, now, onClose }) {
  if (!string) return null;
  const spark = sparkSeries(now, string.live, string.id.length);
  const data = spark.map((v, i) => ({ t: i, cur: v }));
  const barColor = LEVEL_BAR[string.level] || 'rgb(var(--power))';
  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-edge bg-surface shadow-2xl">
      <div className="flex items-center justify-between border-b border-edge px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs text-muted">{group}</p>
          <h3 className="font-mono text-sm font-semibold text-ink">{string.id}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-md border border-edge p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
        >
          <Icon name="x" className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border border-edge bg-surface-2 p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted">Live</p>
            <p className="font-mono text-xl text-ink tnum">
              {string.live.toFixed(2)}<span className="ml-1 text-xs text-muted">A</span>
            </p>
          </div>
          <div className="rounded-md border border-edge bg-surface-2 p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted">Δ {metric.label}</p>
            <p className={`font-mono text-xl tnum ${string.level === 'ok' ? 'text-power' : string.level === 'warn' ? 'text-warn' : 'text-critical'}`}>
              {fmtDelta(string.deviationPct)}
            </p>
          </div>
        </div>

        <div className="space-y-1.5 text-[12px]">
          <p className="flex justify-between"><span className="text-muted">Ah today</span><span className="font-mono text-ink tnum">{string.ahToday.toFixed(1)}</span></p>
          <p className="flex justify-between"><span className="text-muted">Ah this month</span><span className="font-mono text-ink tnum">{string.ahMonth.toFixed(1)}</span></p>
          <p className="flex justify-between"><span className="text-muted">Ah this year</span><span className="font-mono text-ink tnum">{string.ahYear.toFixed(1)}</span></p>
        </div>

        <div>
          <p className="mb-1.5 text-[10px] uppercase tracking-wide text-muted">Live current · last 2h (derived)</p>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgb(var(--surface-3))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" hide />
                <YAxis stroke="rgb(var(--dim))" tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }} width={34} />
                <Tooltip content={() => null} />
                <Area
                  type="monotone"
                  dataKey="cur"
                  name="A"
                  stroke={barColor}
                  fill={barColor}
                  fillOpacity={0.14}
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {string.level !== 'ok' && (
          <div className="rounded-md border border-warn/30 bg-warn/5 p-2.5 text-[11px] leading-snug text-dim">
            <span className="font-semibold text-warn">Likely cause:</span> {likelyCause(string)}
          </div>
        )}
      </div>

      <div className="border-t border-edge px-4 py-2.5 text-[10px] text-dim">
        Sparkline is a derived approximation — the live feed ships no history.
      </div>
    </div>
  );
}

/* Heatmap grid + metric toggle + inverter filter + drawer. */
export default function StringHeatmap({ groups, metric, onMetricChange, filter, onFilterChange, now }) {
  const [selected, setSelected] = useState(null);
  const visible = filter === ALL_FILTER ? groups : groups.filter((g) => g.label === filter);
  const openString = (group, string) => setSelected({ group, string });

  return (
    <section className="rounded-lg border border-edge bg-surface p-4 shadow-tile">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-ink">
          <Icon name="energy" className="h-4 w-4 text-power" />
          String deviation heatmap
        </h2>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] uppercase tracking-wide text-muted">Metric</span>
          {METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => onMetricChange(m.key)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
                metric.key === m.key ? 'bg-power text-bg' : 'text-muted hover:bg-surface-2 hover:text-ink'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wide text-muted">Inverter</span>
        <button
          type="button"
          onClick={() => onFilterChange(ALL_FILTER)}
          className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
            filter === ALL_FILTER ? 'bg-power text-bg' : 'text-muted hover:bg-surface-2 hover:text-ink'
          }`}
        >
          All
        </button>
        {groups.map((g) => (
          <button
            key={g.label}
            type="button"
            onClick={() => onFilterChange(g.label)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
              filter === g.label ? 'bg-power text-bg' : 'text-muted hover:bg-surface-2 hover:text-ink'
            }`}
          >
            {g.label} <span className="text-[10px] opacity-60">({g.strings.length})</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-1.5">
        {visible.map((g) =>
          g.strings.map((s) => (
            <Tile
              key={`${g.label}/${s.id}`}
              string={s}
              group={g.label}
              metric={metric}
              onOpen={openString}
            />
          ))
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-dim">
        <span>Color = Δ vs inverter avg ·</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-power/70" /> within ±3%</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-warn/70" /> -3…-10%</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-critical/70" /> below -10% / API fault</span>
        <span>· click a tile for detail</span>
      </div>

      {selected && (
        <div className="fixed inset-0 z-30 bg-bg/70" onClick={() => setSelected(null)} aria-hidden="true" />
      )}
      {selected && (
        <StringDrawer
          group={selected.group}
          string={selected.string}
          metric={metric}
          now={now}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
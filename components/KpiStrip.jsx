import { useCountUp, Icon } from './common';

const ACCENTS = {
  power: 'rgb(var(--power))',
  irr: 'rgb(var(--irr))',
  warn: 'rgb(var(--warn))',
  critical: 'rgb(var(--critical))',
};

/* Single instrument-style tile (own component so useCountUp is hook-legal). */
function KpiTile({ k }) {
  const displayNum = k.value !== null && k.value !== undefined && Number.isFinite(Number(k.value));
  const n = useCountUp(displayNum ? k.value : 0, { decimals: k.decimals || 0 });
  const accent = ACCENTS[k.accent] || 'rgb(var(--power))';
  return (
    <div className="relative overflow-hidden rounded-lg border border-edge bg-surface p-3 shadow-tile">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
        aria-hidden="true"
      />
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
        <Icon name={k.icon || 'zap'} className="h-3.5 w-3.5" />
        {k.label}
      </div>
      <div
        className={`mt-1.5 font-display text-2xl tracking-tight tnum sm:text-[26px] ${
          displayNum ? (k.tone === 'crit' ? 'text-critical' : 'text-ink') : 'text-muted'
        }`}
      >
        {displayNum ? n : '—'}
        {displayNum ? <span className="ml-1 text-sm font-normal text-muted">{k.unit}</span> : null}
      </div>
      {k.sub ? <p className="mt-0.5 text-[11px] text-dim">{k.sub}</p> : null}
    </div>
  );
}

/* KPI strip: five instrument-style tiles with count-up readouts. */
export default function KpiStrip({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((k) => (
        <KpiTile key={k.key} k={k} />
      ))}
    </div>
  );
}
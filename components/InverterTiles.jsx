import { Sparkline, StatusPill, Icon } from './common';

const LEVEL_COLORS = {
  ok: 'rgb(var(--power))',
  warn: 'rgb(var(--warn))',
  crit: 'rgb(var(--critical))',
};

/* One tile per inverter: avg current hero number + sparkline + status.
   status/statusLabel are precomputed by the orchestrator so this stays dumb. */
export default function InverterTiles({ inverters }) {
  if (!inverters || inverters.length === 0) return null;
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        <Icon name="bolt" className="h-3.5 w-3.5 text-power" />
        Inverters
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {inverters.map((inv) => (
          <div key={inv.label} className="rounded-lg border border-edge bg-surface p-3 shadow-tile">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-sm font-semibold text-ink">{inv.label}</span>
              <StatusPill level={inv.status} label={inv.statusLabel} />
            </div>
            <div className="mt-2 flex items-end justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted">Avg current</p>
                <p className="font-mono text-2xl text-ink tnum">
                  {inv.avgCurrent.toFixed(2)}<span className="ml-1 text-sm text-muted">A</span>
                </p>
                <p className="mt-0.5 text-[11px] text-dim">{inv.stringCount} strings</p>
              </div>
              <Sparkline
                values={inv.spark}
                color={LEVEL_COLORS[inv.status] || 'rgb(var(--power))'}
                width={88}
                height={30}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
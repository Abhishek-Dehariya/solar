import { fmtDelta, likelyCause, ALERT_THRESHOLD } from '../lib/esenz';
import { Icon } from './common';

/* Lists underperforming strings with plain-language causes + acknowledge. */
export default function AlertsPanel({ alerts, acknowledged, onAck, onAckAll, nightMode }) {
  const open = alerts.filter((a) => !acknowledged.includes(a.id));
  return (
    <section className="flex h-full flex-col rounded-lg border border-edge bg-surface p-4 shadow-tile">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-ink">
          <Icon name="alert" className={`h-4 w-4 ${open.length ? 'text-critical' : 'text-power'}`} />
          Alerts
        </h2>
        <span
          className={`rounded-full border px-2 py-0.5 font-mono text-[11px] tnum ${
            nightMode
              ? 'border-edge bg-surface-2 text-muted'
              : open.length
              ? 'border-critical/40 bg-critical/10 text-critical'
              : 'border-edge bg-surface-2 text-muted'
          }`}
        >
          {nightMode ? 'paused' : open.length ? `${open.length} open` : '0'}
        </span>
      </div>

      {open.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <span className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-power/10 text-power">
            <Icon name="check" className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium text-ink">
            {nightMode ? 'Night mode — zero output expected' : 'All strings within threshold'}
          </p>
          <p className="mt-1 text-xs text-muted">
            {nightMode
              ? 'Anomaly alerts resume automatically when the plant starts producing.'
              : `Alert when a string drops ${ALERT_THRESHOLD * 100}% below its inverter avg.`}
          </p>
        </div>
      ) : (
        <div className="max-h-72 flex-1 space-y-2 overflow-y-auto pr-1">
          {open.map((a) => (
            <div
              key={a.id}
              className="rounded-lg border border-critical/30 bg-critical/5 p-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-ink">{a.id}</p>
                  <p className="text-[11px] text-muted">
                    {a.group} · {a.live.toFixed(2)}A · {fmtDelta(a.deviationPct)} vs avg
                    {a.apiFlagged ? <span className="text-critical"> · API-flagged</span> : null}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onAck(a.id)}
                  className="shrink-0 rounded-md border border-edge bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-power transition-colors hover:bg-power/10"
                >
                  Acknowledge
                </button>
              </div>
              <p className="mt-1.5 text-[11px] leading-snug text-dim">{likelyCause(a, a.inverterAvg)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <p className="text-[11px] text-dim">
          Threshold {ALERT_THRESHOLD * 100}%{acknowledged.length ? ` · ${acknowledged.length} acknowledged` : ''}
        </p>
        {open.length > 1 ? (
          <button
            type="button"
            onClick={onAckAll}
            className="text-[11px] font-medium text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Acknowledge all
          </button>
        ) : null}
      </div>
    </section>
  );
}
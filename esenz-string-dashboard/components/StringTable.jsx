import { useMemo, useState } from 'react';
import { fmtDelta, shortId } from '../lib/esenz';
import { Icon, Sparkline } from './common';

const LEVEL_BADGE = {
  ok: 'border-edge bg-surface-2 text-power',
  warn: 'border-warn/40 bg-warn/10 text-warn',
  crit: 'border-critical/40 bg-critical/10 text-critical',
};

const ARROW = { asc: '↑', desc: '↓' };

const COLS = [
  { key: 'group', label: 'Inverter' },
  { key: 'id', label: 'String' },
  { key: 'live', label: 'Live (A)', right: true },
  { key: 'ahToday', label: 'Ah today', right: true },
  { key: 'ahMonth', label: 'Ah month', right: true },
  { key: 'ahYear', label: 'Ah year', right: true },
  { key: 'deviationPct', label: 'Δ vs avg', right: true },
  { key: 'status', label: 'Status', center: true },
];

function compare(a, b, sortKey) {
  if (sortKey === 'deviationPct') return (a.deviationPct ?? 1e9) - (b.deviationPct ?? 1e9);
  if (sortKey === 'status') return a.level.localeCompare(b.level);
  if (sortKey === 'group') return a.group.localeCompare(b.group);
  if (sortKey === 'id') return a.id.localeCompare(b.id);
  return a[sortKey] - b[sortKey];
}

/* Sortable, searchable table with sticky header, inline sparkline + CSV export. */
export default function StringTable({ rows, metric }) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('group');
  const [sortDir, setSortDir] = useState('asc');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? rows.filter((r) => r.id.toLowerCase().includes(q) || r.group.toLowerCase().includes(q))
      : rows;
    const sorted = [...base].sort((a, b) => compare(a, b, sortKey));
    return sortDir === 'desc' ? sorted.reverse() : sorted;
  }, [rows, query, sortKey, sortDir]);

  const onSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const exportCsv = () => {
    const head = 'Inverter,String,Live A,Ah Today,Ah Month,Ah Year,DeltaPct,Status';
    const lines = filtered.map((r) =>
      [
        r.group,
        r.id,
        r.live.toFixed(2),
        r.ahToday.toFixed(1),
        r.ahMonth.toFixed(1),
        r.ahYear.toFixed(1),
        r.deviationPct === null ? '' : r.deviationPct.toFixed(1),
        r.level,
      ].join(',')
    );
    const blob = new Blob([[head, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `esenz-strings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-lg border border-edge bg-surface shadow-tile">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-sm font-semibold text-ink">String data</h2>
          <span className="font-mono text-[11px] text-dim tnum">{filtered.length}/{rows.length} rows</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="relative">
            <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dim" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search string / inverter…"
              className="w-52 rounded-md border border-edge bg-surface-2 py-1.5 pl-8 pr-3 text-xs text-ink placeholder:text-dim focus:border-power/50 focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-md border border-edge bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-power/40 hover:text-ink"
          >
            <Icon name="download" className="h-3.5 w-3.5" />
            CSV
          </button>
        </div>
      </div>

      <div className="mt-3 max-h-[52vh] overflow-auto">
        <table className="w-full min-w-[820px] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-surface-2">
            <tr>
              {COLS.map((c) => (
                <th
                  key={c.key}
                  onClick={() => onSort(c.key)}
                  className={`whitespace-nowrap cursor-pointer select-none px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted hover:text-ink ${
                    c.right ? 'text-right' : ''
                  } ${c.center ? 'text-center' : ''}`}
                >
                  {c.label}
                  <span className="ml-0.5 text-power">{sortKey === c.key ? ARROW[sortDir] : ''}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-edge-soft">
            {filtered.map((r) => (
              <tr key={r.id} className={r.level === 'crit' ? 'bg-critical/[.06]' : 'hover:bg-surface-2/60'}>
                <td className="px-3 py-2 text-muted">{r.group}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-ink">{shortId(r.id)}</span>
                    <span className="hidden text-[9px] text-dim xl:inline">{r.id}</span>
                    <Sparkline
                      values={r.spark}
                      width={54}
                      height={16}
                      color={
                        r.level === 'ok'
                          ? 'rgb(var(--power))'
                          : r.level === 'warn'
                          ? 'rgb(var(--warn))'
                          : 'rgb(var(--critical))'
                      }
                    />
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-mono text-ink tnum">{r.live.toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-mono text-muted tnum">{r.ahToday.toFixed(1)}</td>
                <td className="px-3 py-2 text-right font-mono text-muted tnum">{r.ahMonth.toFixed(1)}</td>
                <td className="px-3 py-2 text-right font-mono text-muted tnum">{r.ahYear.toFixed(1)}</td>
                <td
                  className={`px-3 py-2 text-right font-mono tnum ${
                    r.deviationPct === null
                      ? 'text-dim'
                      : r.level === 'ok'
                      ? 'text-power'
                      : r.level === 'warn'
                      ? 'text-warn'
                      : 'text-critical'
                  }`}
                >
                  {fmtDelta(r.deviationPct)}
                  {r.apiFlagged ? <span className="ml-1 text-critical">*</span> : null}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${LEVEL_BADGE[r.level] || LEVEL_BADGE.ok}`}>
                    {r.level === 'ok' ? 'OK' : r.level === 'warn' ? 'Watch' : 'Check'}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={COLS.length} className="px-3 py-10 text-center text-sm text-muted">
                  No strings match “{query}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="px-4 pb-2.5 pt-2 text-[10px] text-dim">
        Deviation is against the <span className="text-muted">{metric.label}</span> inverter average · * = API-flagged.
      </p>
    </section>
  );
}
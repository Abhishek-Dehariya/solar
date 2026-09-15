import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import {
  POLL_INTERVAL_MS,
  METRICS,
  ALL_FILTER,
  ALERT_THRESHOLD,
  flattenPayload,
  enrichGroups,
  plantStats,
  sparkSeries,
} from '../lib/esenz';
import TopBar from './TopBar';
import KpiStrip from './KpiStrip';
import InverterTiles from './InverterTiles';
import PowerIrradiationChart from './PowerIrradiationChart';
import AlertsPanel from './AlertsPanel';
import StringHeatmap from './StringHeatmap';
import StringTable from './StringTable';
import { Icon, Spinner } from './common';

/* ---------------------------------------------------------------------------
 * Control-room dashboard orchestrator.
 * Fetches the key-safe server route, polls every 60s, and composes the
 * instrument panels. All anomaly/anchor logic lives in lib/esenz.js.
 * ------------------------------------------------------------------------- */

export default function StringDashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metricKey, setMetricKey] = useState('live');
  const [filter, setFilter] = useState(ALL_FILTER);
  const [acked, setAcked] = useState([]);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const dataRef = useRef(null);

  const metric = METRICS.find((m) => m.key === metricKey) || METRICS[0];

  // One-second tick drives the live clock + countdown ring.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch the server-side proxy. `silent` keeps background polls from
  // clobbering the stale-data banner; `showSpinner` drives the refresh ring.
  const loadData = useCallback(async ({ silent = false, showSpinner = false } = {}) => {
    if (!silent) setError(null);
    if (showSpinner) setRefreshing(true);
    try {
      const res = await fetch('/api/esenz-live', { cache: 'no-store' });
      if (res.status === 401) {
        router.replace('/login');
        return;
      }
      if (!res.ok) {
        let message = `Request failed (HTTP ${res.status})`;
        try {
          const body = await res.json();
          if (body && body.error) message = body.error;
        } catch (_) {
          /* keep generic message */
        }
        throw new Error(message);
      }
      const payload = await res.json();
      dataRef.current = payload;
      setData(payload);
      setLastFetchedAt(Date.now());
    } catch (err) {
      if (!silent || !dataRef.current) setError(err.message || 'Failed to load live data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  // Initial load + 60s poll.
  useEffect(() => {
    loadData({ silent: true });
    const id = setInterval(() => loadData({ silent: true }), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loadData]);

  // A stable "now" bound to the last successful fetch, so derived series
  // (sparklines, charts) don't regenerate every second.
  const seriesNow = useMemo(() => new Date(lastFetchedAt || Date.now()), [lastFetchedAt]);

  // Folds STRING_INFO_GROUPED into per-inverter groups. The API's red flag is
  // gated on real output: at night eSenZ paints every string #FFDCDC, which
  // would otherwise report a full-plant alarm every evening.
  const { groups, nightMode } = useMemo(() => {
    if (!data) return { groups: [], nightMode: false };
    const flat = flattenPayload(data);
    const plantHasOutput = flat.some((g) => g.strings.some((s) => s.live > 0.05));
    return {
      groups: enrichGroups(flat, metric.field, plantHasOutput),
      nightMode: !plantHasOutput,
    };
  }, [data, metric.field]);
  const stats = useMemo(() => (data ? plantStats(data, groups) : null), [data, groups]);

  // Flat table rows (searchable/sortable/exportable), each with a derived spark.
  const rows = useMemo(() => {
    const out = [];
    groups.forEach((g) =>
      g.strings.forEach((s) =>
        out.push({
          ...s,
          group: g.label,
          inverterAvg: g.avg,
          spark: sparkSeries(seriesNow, s.live, s.id.length),
        })
      )
    );
    return out;
  }, [groups, seriesNow]);

  // One tile per inverter with status derived from its own strings.
  const inverters = useMemo(
    () =>
      groups.map((g) => {
        const warns = g.strings.filter((s) => s.level === 'warn').length;
        let status = 'ok';
        let statusLabel = 'OK';
        if (g.flaggedCount > 0) {
          status = 'crit';
          statusLabel = `${g.flaggedCount} flagged`;
        } else if (warns > 0) {
          status = 'warn';
          statusLabel = `${warns} watch`;
        }
        return {
          label: g.label,
          avgCurrent: g.avgCurrent,
          stringCount: g.strings.length,
          flaggedCount: g.flaggedCount,
          status,
          statusLabel,
          spark: sparkSeries(seriesNow, g.avgCurrent, g.label.length + 7),
        };
      }),
    [groups, seriesNow]
  );

  const alerts = useMemo(
    () =>
      groups.flatMap((g) =>
        g.strings.filter((s) => s.flagged).map((s) => ({ ...s, group: g.label, inverterAvg: g.avg }))
      ),
    [groups]
  );

  const ackAlert = (id) => setAcked((prev) => (prev.includes(id) ? prev : [...prev, id]));
  const ackAll = () => setAcked((prev) => Array.from(new Set([...prev, ...alerts.map((a) => a.id)])));

  // Countdown ring plumbing.
  const remainingMs = lastFetchedAt
    ? Math.max(0, lastFetchedAt + POLL_INTERVAL_MS - now.getTime())
    : POLL_INTERVAL_MS;
  const syncedAgo = lastFetchedAt ? Math.round((now.getTime() - lastFetchedAt) / 1000) : 0;

  const kpis = useMemo(() => {
    if (!stats) return [];
    const irrVal = stats.irr > 0 ? stats.irr : null;
    const hasPr = stats.pr !== null && stats.pr > 0;
    return [
      {
        key: 'power',
        label: 'Total Power',
        value: Math.round(stats.powerKw * 100) / 100,
        unit: 'kW',
        decimals: stats.powerKw < 10 ? 2 : 1,
        accent: 'power',
        icon: 'bolt',
      },
      {
        key: 'energy',
        label: 'Energy Today',
        value: Math.round(stats.energyToday),
        unit: 'kWh',
        decimals: 0,
        accent: 'power',
        icon: 'energy',
      },
      {
        key: 'pr',
        label: hasPr ? 'PR Ratio' : 'CUF Today',
        value: hasPr ? stats.pr : stats.cuf || null,
        unit: '%',
        decimals: 1,
        accent: hasPr ? 'irr' : 'power',
        icon: 'gauge',
        sub: hasPr ? undefined : 'PR n/a (no irradiance feed)',
      },
      {
        key: 'irr',
        label: 'Irradiance',
        value: irrVal,
        unit: 'W/m²',
        decimals: 0,
        accent: 'irr',
        icon: 'irrad',
        sub: irrVal === null ? 'night / no sensor feed' : undefined,
      },
      {
        key: 'alerts',
        label: 'Active Alerts',
        value: stats.flaggedTotal,
        unit: '',
        decimals: 0,
        accent: stats.flaggedTotal > 0 ? 'critical' : 'power',
        icon: 'alert',
        tone: stats.flaggedTotal > 0 ? 'crit' : 'ok',
      },
    ];
  }, [stats]);
/* ----------------------------- render states ---------------------------- */

  // Full-screen loading (first fetch in flight).
  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3 text-center">
          <Spinner />
          <p className="text-sm text-muted">Connecting to live feed…</p>
        </div>
      </div>
    );
  }

  // Full-screen error with retry (nothing to fall back on).
  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="w-full max-w-md rounded-lg border border-critical/40 bg-surface p-6 text-center shadow-tile">
          <p className="mb-1 flex items-center justify-center gap-2 font-display text-lg font-semibold text-ink">
            <Icon name="alert" className="h-5 w-5 text-critical" />
            Unable to load live data
          </p>
          <p className="mb-5 text-sm text-muted">{error || 'No data returned by the API.'}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              loadData();
            }}
            className="rounded-md bg-power px-4 py-2 text-sm font-semibold text-bg transition-colors hover:bg-power/85"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------------ main layout ------------------------------ */

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6">
        <TopBar
          stats={stats}
          syncedAgo={syncedAgo}
          remainingMs={remainingMs}
          totalMs={POLL_INTERVAL_MS}
          refreshing={refreshing}
          nightMode={nightMode}
          onRefresh={() => loadData({ showSpinner: true })}
        />

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
            <Icon name="alert" className="h-4 w-4 shrink-0" />
            <span>
              {error}{' '}
              <span className="text-warn/70">— showing last known data (synced {syncedAgo}s ago).</span>
            </span>
          </div>
        )}

        <KpiStrip items={kpis} />

        <InverterTiles inverters={inverters} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <PowerIrradiationChart stats={stats} groups={groups} now={seriesNow} />
          </div>
          <div className="min-h-[320px]">
            <AlertsPanel
              alerts={alerts}
              acknowledged={acked}
              onAck={ackAlert}
              onAckAll={ackAll}
              nightMode={nightMode}
            />
          </div>
        </div>

        <StringHeatmap
          groups={groups}
          metric={metric}
          onMetricChange={setMetricKey}
          filter={filter}
          onFilterChange={setFilter}
          now={seriesNow}
        />

        <StringTable rows={rows} metric={metric} />

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-edge-soft py-3 text-[10px] text-dim">
          <span>
            Auto-refresh every {POLL_INTERVAL_MS / 1000}s · anomaly threshold{' '}
            {(ALERT_THRESHOLD * 100).toFixed(0)}% vs inverter avg
          </span>
          <span className="hidden sm:inline">
            Derived series are approximations anchored to the live snapshot — the eSenZ feed ships no history.
          </span>
        </footer>
      </div>
    </div>
  );
}

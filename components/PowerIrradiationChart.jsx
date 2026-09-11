import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  CHART_TABS,
  powerIrrSeries,
  hourlyEnergy,
  dailyEnergy,
  monthlyEnergy,
  yearlyEnergy,
} from '../lib/esenz';
import { Icon } from './common';

const POWER = 'rgb(var(--power))';
const IRR = 'rgb(var(--irr))';

/* Dark, mono tooltip that matches the KPI readouts. */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-md border border-edge bg-surface-3 px-3 py-2 font-mono text-xs text-ink shadow-lg">
      <div className="mb-1 text-muted">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color || 'rgb(var(--ink))' }}>
          {p.name}: <span className="tnum">{typeof p.value === 'number' ? p.value.toLocaleString('en-IN') : p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* Build the right dataset for the active tab (real-anchored, derived). */
function buildData(tab, stats, groups, now) {
  const base = {
    kW: stats.powerKw,
    capacityKw: stats.capacityKw || 1,
    energyToday: stats.energyToday,
    energyYesterday: stats.energyYesterday,
    energyMonth: stats.energyMonth,
    energyYear: stats.energyYear,
    irr: stats.irr,
  };
  if (tab === 'kW vs Irr') {
    return {
      data: powerIrrSeries(now, base),
      kind: 'dual',
      leftKey: 'powerKw',
      leftName: 'Power (kW)',
      rightKey: 'irradiance',
      rightName: 'Irradiance (W/m²)',
      unit: '',
    };
  }
  if (tab === 'Inv kW vs Irr') {
    const series = powerIrrSeries(now, base);
    const totalLiveAmps = groups.reduce((s, g) => s + g.avgCurrent * g.strings.length, 0) || 1;
    const shares = groups.map((g) => (g.avgCurrent * g.strings.length) / totalLiveAmps);
    const invData = series.map((p) => {
      const row = { time: p.time, irradiance: p.irradiance };
      groups.forEach((g, i) => {
        row[g.label] = Math.round(p.powerKw * shares[i] * 10) / 10;
      });
      return row;
    });
    return {
      data: invData,
      kind: 'dual',
      leftKey: groups[0] ? groups[0].label : 'INV1',
      leftName: 'Inverter kW',
      rightKey: 'irradiance',
      rightName: 'Irradiance (W/m²)',
      unit: '',
      multiLeft: true,
    };
  }
  if (tab === 'E. Hourly') {
    return { data: hourlyEnergy(now, base), kind: 'bars', leftKey: 'energy', leftName: 'kWh', unit: 'kWh' };
  }
  if (tab === 'E. Daily') {
    return { data: dailyEnergy(now, base), kind: 'bars', leftKey: 'energy', leftName: 'kWh', unit: 'kWh' };
  }
  if (tab === 'E. Monthly') {
    return { data: monthlyEnergy(now, base), kind: 'bars', leftKey: 'energy', leftName: 'kWh', unit: 'kWh' };
  }
  return { data: yearlyEnergy(now, base), kind: 'bars', leftKey: 'energy', leftName: 'kWh', unit: 'kWh' };
}

/* Dual-axis Power vs Irradiation chart with energy tabs. */
export default function PowerIrradiationChart({ stats, groups, now }) {
  const [tab, setTab] = useState(CHART_TABS[0]);
  const cfg = useMemo(() => buildData(tab, stats, groups, now), [tab, stats, groups, now]);
  const { data, kind, leftKey, leftName, rightKey, rightName, multiLeft } = cfg;
  const isDual = kind === 'dual';

  const axisCommon = {
    stroke: 'rgb(var(--dim))',
    tick: { fontSize: 11, fill: 'rgb(var(--muted))' },
  };

  return (
    <section className="flex h-full flex-col rounded-lg border border-edge bg-surface p-4 shadow-tile">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-ink">
          <Icon name="sun" className="h-4 w-4 text-irr" />
          Power vs Irradiation
        </h2>
        <div className="flex flex-wrap gap-1">
          {CHART_TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                tab === t
                  ? 'bg-power text-bg'
                  : 'text-muted hover:bg-surface-2 hover:text-ink'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[320px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          {isDual ? (
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgb(var(--surface-3))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" {...axisCommon} tick={{ ...axisCommon.tick, fontSize: 10 }} />
              <YAxis yAxisId="left" stroke={POWER} tick={{ fontSize: 11, fill: POWER }} width={44} />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke={IRR}
                tick={{ fontSize: 11, fill: IRR }}
                width={44}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: 'rgb(var(--muted))' }} />
              {multiLeft
                ? groups.map((g, i) => (
                    <Line
                      key={g.label}
                      yAxisId="left"
                      type="monotone"
                      dataKey={g.label}
                      name={g.label}
                      stroke={
                        [
                          'rgb(var(--power))',
                          'rgb(125 211 252)',
                          'rgb(196 181 253)',
                          'rgb(253 186 116)',
                          'rgb(134 239 172)',
                        ][i % 5]
                      }
                      strokeWidth={1.5}
                      dot={false}
                    />
                  ))
                : (
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey={leftKey}
                      name={leftName}
                      stroke={POWER}
                      fill={POWER}
                      fillOpacity={0.12}
                      strokeWidth={2}
                    />
                  )}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey={rightKey}
                name={rightName}
                stroke={IRR}
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          ) : (
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgb(var(--surface-3))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" {...axisCommon} tick={{ ...axisCommon.tick, fontSize: 10 }} />
              <YAxis {...axisCommon} width={44} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgb(var(--power) / 0.08)' }} />
              <Bar dataKey={leftKey} name={`Energy (${cfg.unit})`} fill={POWER} radius={[3, 3, 0, 0]} maxBarSize={26} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-dim">
        {tab.startsWith('E.')
          ? 'Energy bars derived from the real daily/monthly/yearly totals in the live feed.'
          : 'Curves anchored to live power/irradiance — the eSenZ snapshot carries no history.'}
      </p>
    </section>
  );
}
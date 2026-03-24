'use client';

import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

type MetricKey = 'chlorine' | 'ph' | 'alkalinity' | 'hardness' | 'temperature';
type ChartView = 'overview' | MetricKey;
type Period = '7' | '15' | '30' | '90' | 'all';

type MeasurementPoint = {
  id: string;
  measuredAtIso: string;
  measuredAtLabel: string;
  chlorine: number;
  ph: number;
  alkalinity: number;
  hardness: number;
  temperature: number | null;
  chlorineOutOfRange: boolean;
  phOutOfRange: boolean;
  alkalinityOutOfRange: boolean;
  hardnessOutOfRange: boolean;
  temperatureOutOfRange: boolean;
};

type MetricConfig = {
  key: MetricKey;
  label: string;
  color: string;
  min: number | null;
  max: number | null;
  enabled: boolean;
};

type DashboardChartProps = {
  data: MeasurementPoint[];
  tracksTemperature: boolean;
  ranges: Record<MetricKey, { min: number | null; max: number | null }>;
};

const PERIOD_OPTIONS: Array<{ value: Period; label: string }> = [
  { value: '7', label: '7 dias' },
  { value: '15', label: '15 dias' },
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
  { value: 'all', label: 'Todas' }
];

const METRIC_COLORS: Record<MetricKey, string> = {
  chlorine: '#0c78b2',
  ph: '#11b981',
  alkalinity: '#6366f1',
  hardness: '#f59e0b',
  temperature: '#f97316'
};

const METRIC_LABELS: Record<MetricKey, string> = {
  chlorine: 'Cloro',
  ph: 'pH',
  alkalinity: 'Alcalinidade',
  hardness: 'Dureza',
  temperature: 'Temperatura'
};

function formatTooltipDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}

export function DashboardChart({ data, tracksTemperature, ranges }: DashboardChartProps) {
  const [view, setView] = useState<ChartView>('overview');
  const [period, setPeriod] = useState<Period>('30');

  const filteredData = useMemo(() => {
    if (period === 'all') return data;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(period));
    return data.filter(item => new Date(item.measuredAtIso) >= cutoff);
  }, [data, period]);

  const metricConfigs: MetricConfig[] = useMemo(
    () => [
      { key: 'chlorine', label: METRIC_LABELS.chlorine, color: METRIC_COLORS.chlorine, min: ranges.chlorine.min, max: ranges.chlorine.max, enabled: true },
      { key: 'ph', label: METRIC_LABELS.ph, color: METRIC_COLORS.ph, min: ranges.ph.min, max: ranges.ph.max, enabled: true },
      { key: 'alkalinity', label: METRIC_LABELS.alkalinity, color: METRIC_COLORS.alkalinity, min: ranges.alkalinity.min, max: ranges.alkalinity.max, enabled: true },
      { key: 'hardness', label: METRIC_LABELS.hardness, color: METRIC_COLORS.hardness, min: ranges.hardness.min, max: ranges.hardness.max, enabled: true },
      { key: 'temperature', label: METRIC_LABELS.temperature, color: METRIC_COLORS.temperature, min: ranges.temperature.min, max: ranges.temperature.max, enabled: tracksTemperature }
    ],
    [ranges, tracksTemperature]
  );

  const activeConfigs = metricConfigs.filter(config => {
    if (!config.enabled) return false;
    if (view === 'overview') return true;
    return config.key === view;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[{ value: 'overview', label: 'Visão geral' }, ...metricConfigs.filter(item => item.enabled).map(item => ({ value: item.key, label: item.label }))].map(item => (
          <button
            key={item.value}
            type="button"
            onClick={() => setView(item.value as ChartView)}
            className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${view === item.value ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Período</span>
        {PERIOD_OPTIONS.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => setPeriod(option.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${period === option.value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="h-96 w-full">
        <ResponsiveContainer>
          <LineChart data={filteredData} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="measuredAtLabel" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} />
            <Tooltip
              formatter={(value: number, key: string) => [value, METRIC_LABELS[key as MetricKey] ?? key]}
              labelFormatter={(_label, payload) => {
                const point = payload?.[0]?.payload as MeasurementPoint | undefined;
                return point ? formatTooltipDate(point.measuredAtIso) : '';
              }}
            />
            <Legend />

            {view !== 'overview' && activeConfigs[0]?.min !== null && activeConfigs[0]?.max !== null ? (
              <ReferenceArea y1={activeConfigs[0].min} y2={activeConfigs[0].max} fill="#22c55e" fillOpacity={0.08} />
            ) : null}

            {activeConfigs.map(config => (
              <Line
                key={config.key}
                type="monotone"
                dataKey={config.key}
                name={config.label}
                stroke={config.color}
                strokeWidth={view === 'overview' ? 2 : 3}
                dot={(props: { cx?: number; cy?: number; payload?: MeasurementPoint }) => {
                  const cx = props.cx ?? 0;
                  const cy = props.cy ?? 0;
                  const payload = props.payload;
                  if (!payload) return <circle cx={cx} cy={cy} r={0} />;
                  const out = payload[`${config.key}OutOfRange` as keyof MeasurementPoint] as boolean;
                  return <circle cx={cx} cy={cy} r={out ? 4 : 2.5} fill={out ? '#dc2626' : config.color} stroke={out ? '#7f1d1d' : '#fff'} strokeWidth={out ? 1.5 : 1} />;
                }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

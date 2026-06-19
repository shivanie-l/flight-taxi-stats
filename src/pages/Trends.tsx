import { useMemo, useState } from 'react'
import { useSummaryData } from '../lib/useData'
import { pivotTrends, carriersOf, paddedDomain, TREND_COLORS } from '../lib/trends'
import { clsx } from 'clsx'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'

type Metric = 'median' | 'p90' | 'p95'
const METRICS: { key: Metric; label: string }[] = [
  { key: 'p95', label: '95th pct' },
  { key: 'p90', label: '90th pct' },
  { key: 'median', label: 'Median' },
]

export default function Trends() {
  const { data, loading, error } = useSummaryData()
  const [metric, setMetric] = useState<Metric>('p95')

  const carriers = useMemo(() => (data ? carriersOf(data.trends) : []), [data])
  const taxiData = useMemo(() => (data ? pivotTrends(data.trends, metric) : []), [data, metric])
  const trapData = useMemo(() => (data ? pivotTrends(data.trends, 'trap_rate') : []), [data])

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>
  if (error || !data) return <div className="p-8 text-red-400">Failed to load data.</div>

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      <div>
        <h1 className="text-3xl font-bold mb-2">Trends over time</h1>
        <p className="text-slate-400 max-w-2xl">
          Taxi-out time and the "on-time trap" rate across the full history in our dataset,
          month by month and airline by airline.
        </p>
      </div>

      {/* Metric toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-400 mr-1">Metric:</span>
        {METRICS.map(m => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm border transition-colors',
              metric === m.key
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Taxi-out time series */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {METRICS.find(m => m.key === metric)!.label} taxi-out by airline
        </h2>
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={taxiData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} minTickGap={20} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit="m" domain={paddedDomain(3)} />
              <Tooltip
                formatter={(v: number) => `${v} min`}
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {carriers.map((c, i) => (
                <Line key={c} type="monotone" dataKey={c} stroke={TREND_COLORS[i % TREND_COLORS.length]} dot={false} strokeWidth={2} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trap rate time series */}
      <div>
        <h2 className="text-xl font-semibold mb-1">On-time trap rate by airline</h2>
        <p className="text-sm text-slate-500 mb-4">
          Share of gate-on-time flights that still sat on the tarmac 15 minutes or more.
        </p>
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={trapData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} minTickGap={20} />
              <YAxis
                tickFormatter={v => `${Math.round(Number(v) * 100)}%`}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                domain={[(min: number) => Math.max(0, min - 0.05), (max: number) => Math.min(1, max + 0.05)]}
              />
              <Tooltip
                formatter={(v: number) => `${(v * 100).toFixed(1)}%`}
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {carriers.map((c, i) => (
                <Line key={c} type="monotone" dataKey={c} stroke={TREND_COLORS[i % TREND_COLORS.length]} dot={false} strokeWidth={2} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

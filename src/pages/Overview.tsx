import { useSummaryData } from '../lib/useData'
import { fmtMinutes, fmtPct, fmtCount, monthLabel } from '../lib/format'
import StatCard from '../components/StatCard'
import PercentileBar from '../components/PercentileBar'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import type { MonthlyTrend } from '../lib/types'

function overallStats(airlines: ReturnType<typeof useSummaryData>['data']) {
  if (!airlines) return null
  const rows = airlines.airlines
  const totalFlights = rows.reduce((s, r) => s + r.count, 0)
  const weightedMean = rows.reduce((s, r) => s + r.mean * r.count, 0) / totalFlights
  const weightedMedian = rows.reduce((s, r) => s + r.median * r.count, 0) / totalFlights
  const weightedP95 = rows.reduce((s, r) => s + r.p95 * r.count, 0) / totalFlights
  const weightedTrap = rows.reduce((s, r) => s + r.pct_gate_ontime_tarmac_delayed * r.count, 0) / totalFlights
  return { weightedMean, weightedMedian, weightedP95, weightedTrap }
}

function buildTrendData(trends: MonthlyTrend[]) {
  const byMonth: Record<string, { label: string; [carrier: string]: number | string }> = {}
  for (const t of trends) {
    const key = `${t.year}-${String(t.month).padStart(2, '0')}`
    if (!byMonth[key]) byMonth[key] = { label: monthLabel(t.year, t.month) }
    byMonth[key][t.carrier_code] = t.median
  }
  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)
}

const COLORS = ['#3b82f6', '#f97316', '#22c55e', '#a855f7', '#ec4899', '#14b8a6', '#f59e0b']

export default function Overview() {
  const { data, loading, error } = useSummaryData()

  if (loading) return <div className="p-8 text-slate-400">Loading data…</div>
  if (error || !data) return <div className="p-8 text-red-400">Failed to load data. Run the pipeline first.</div>

  const stats = overallStats(data)!
  const trendData = buildTrendData(data.trends)
  const carriers = [...new Set(data.trends.map(t => t.carrier_code))].slice(0, 7)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      {/* Hero */}
      <div>
        <h1 className="text-3xl font-bold mb-2">How long do airlines keep you on the tarmac?</h1>
        <p className="text-slate-400 max-w-2xl">
          Airlines report "on-time" departures based on when the door closes — not when the plane
          actually leaves the ground. This site tracks the time between <strong className="text-white">
          doors close</strong> and <strong className="text-white">wheels up</strong> so you can see
          how long passengers are actually trapped on the plane before takeoff.
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Data through {data.data_through} · {fmtCount(data.total_flights_analyzed)} flights analyzed ·
          Updated {data.last_updated}
        </p>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Median taxi-out"
          value={fmtMinutes(stats.weightedMedian)}
          sub="Half of flights take longer"
          colorMinutes={stats.weightedMedian}
        />
        <StatCard
          label="Average taxi-out"
          value={fmtMinutes(stats.weightedMean)}
          colorMinutes={stats.weightedMean}
        />
        <StatCard
          label="95th percentile"
          value={fmtMinutes(stats.weightedP95)}
          sub="1-in-20 flights take this long"
          colorMinutes={stats.weightedP95}
        />
        <StatCard
          label='"On-time" trap rate'
          value={fmtPct(stats.weightedTrap)}
          sub='Gate on-time but >15m tarmac wait'
        />
      </div>

      {/* Trend chart */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Median taxi-out time by airline over time</h2>
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit="m" />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {carriers.map((c, i) => (
                <Line
                  key={c}
                  type="monotone"
                  dataKey={c}
                  stroke={COLORS[i % COLORS.length]}
                  dot={false}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Airline quick ranking */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Airline ranking — median taxi-out</h2>
        <div className="space-y-3">
          {[...data.airlines]
            .sort((a, b) => a.median - b.median)
            .map(a => (
              <div key={a.carrier_code} className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{a.carrier_name}</span>
                  <span className="text-xs text-slate-400">{fmtCount(a.count)} flights</span>
                </div>
                <PercentileBar median={a.median} p75={a.p75} p90={a.p90} p95={a.p95} />
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

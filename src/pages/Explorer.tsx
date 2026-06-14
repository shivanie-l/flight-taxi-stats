import { useMemo, useState, useEffect } from 'react'
import { useRoutesData } from '../lib/useData'
import {
  aggregate, percentile, survivalSeries, densitySeries, trapRate, medianTrapTime,
} from '../lib/histogram'
import { fmtMinutes, fmtPct, fmtCount } from '../lib/format'
import StatCard from '../components/StatCard'
import ToggleChips from '../components/ToggleChips'
import SurvivalChart from '../components/SurvivalChart'
import DistributionChart from '../components/DistributionChart'

export default function Explorer() {
  const { data, loading, error } = useRoutesData()

  const routeIds = useMemo(() => (data ? Object.keys(data.routes).sort() : []), [data])
  const [routeId, setRouteId] = useState<string>('')
  const [airlines, setAirlines] = useState<Set<string>>(new Set())
  const [dows, setDows] = useState<Set<string>>(new Set(['0', '1', '2', '3', '4', '5', '6']))
  const [tods, setTods] = useState<Set<string>>(new Set(['0', '1', '2', '3']))

  // pick a sensible default route once data arrives
  useEffect(() => {
    if (routeIds.length && !routeId) setRouteId(routeIds.includes('SAN-SFO') ? 'SAN-SFO' : routeIds[0])
  }, [routeIds, routeId])

  const route = data && routeId ? data.routes[routeId] : null
  const availableAirlines = route ? Object.keys(route.airlines) : []

  // reset airline selection to "all available" whenever the route changes
  useEffect(() => {
    if (route) setAirlines(new Set(Object.keys(route.airlines)))
  }, [routeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const result = useMemo(() => {
    if (!data || !route) return null
    const nbins = data.bin_edges.length - 1
    const agg = aggregate(
      route,
      [...airlines],
      [...dows].map(Number),
      [...tods].map(Number),
      nbins,
    )
    if (agg.total === 0) return { agg, empty: true } as const
    return {
      agg,
      empty: false,
      median: percentile(agg.h, data.bin_edges, 0.5),
      p90: percentile(agg.h, data.bin_edges, 0.9),
      p95: percentile(agg.h, data.bin_edges, 0.95),
      trap: trapRate(agg.g, data.bin_edges),
      trapMedian: medianTrapTime(agg.g, data.bin_edges),
      survival: survivalSeries(agg.h, data.bin_edges),
      density: densitySeries(agg.h, data.bin_edges),
    } as const
  }, [data, route, airlines, dows, tods])

  if (loading) return <div className="p-8 text-slate-400">Loading route data…</div>
  if (error || !data) return <div className="p-8 text-red-400">Failed to load route data.</div>

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Route explorer</h1>
        <p className="text-slate-400 max-w-2xl">
          Pick a route and slice by airline, day of week, and time of day. Every stat and chart
          recomputes from the underlying taxi-out distribution. Hover the survival curve to see
          your odds of being stuck on the tarmac past any given time.
        </p>
      </div>

      {/* Filters */}
      <div className="grid md:grid-cols-2 gap-6 rounded-xl bg-slate-900 border border-slate-800 p-5">
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-400">Route</span>
          <select
            value={routeId}
            onChange={e => setRouteId(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-blue-500"
          >
            {routeIds.map(id => {
              const r = data.routes[id]
              return (
                <option key={id} value={id}>
                  {r.origin} → {r.dest}
                </option>
              )
            })}
          </select>
        </div>
        <ToggleChips
          label="Airline"
          options={availableAirlines.map(c => ({ value: c, label: c }))}
          selected={airlines}
          onChange={setAirlines}
        />
        <ToggleChips
          label="Day of week"
          options={data.dow_labels.map((l, i) => ({ value: String(i), label: l }))}
          selected={dows}
          onChange={setDows}
        />
        <ToggleChips
          label="Time of day (departure)"
          options={data.tod_labels.map((l, i) => ({ value: String(i), label: l }))}
          selected={tods}
          onChange={setTods}
        />
      </div>

      {result && result.empty && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-8 text-center text-slate-400">
          No flights match this filter combination. Try widening the days or times.
        </div>
      )}

      {result && !result.empty && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Matching flights" value={fmtCount(result.agg.total)} />
            <StatCard label="Median taxi-out" value={fmtMinutes(result.median)} colorMinutes={result.median} />
            <StatCard label="90th percentile" value={fmtMinutes(result.p90)} colorMinutes={result.p90} />
            <StatCard label="95th percentile" value={fmtMinutes(result.p95)} colorMinutes={result.p95} />
            <StatCard
              label="On-time trap rate"
              value={fmtPct(result.trap)}
              sub="gate on-time but 15m+ on tarmac"
            />
          </div>

          {/* Median trap time callout */}
          <div className="rounded-xl bg-gradient-to-r from-orange-950/40 to-slate-900 border border-orange-900/40 p-5 flex flex-col md:flex-row md:items-center gap-3 justify-between">
            <div>
              <div className="text-sm text-orange-300 font-medium">If you do get trapped on this route…</div>
              <div className="text-slate-400 text-sm">
                Among flights that pushed back "on time" but sat 15 min or more, half waited at least:
              </div>
            </div>
            <div className="text-3xl font-bold text-orange-400 whitespace-nowrap">
              {fmtMinutes(result.trapMedian)}
            </div>
          </div>

          {/* Survival curve */}
          <div>
            <h2 className="text-xl font-semibold mb-1">How likely are you to still be on the tarmac?</h2>
            <p className="text-sm text-slate-500 mb-4">
              Hover any minute to read the probability of a taxi-out at least that long.
            </p>
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
              <SurvivalChart data={result.survival} median={result.median} p95={result.p95} />
            </div>
          </div>

          {/* Distribution histogram */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Full taxi-out distribution</h2>
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
              <DistributionChart data={result.density} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

import { fmtMinutes, fmtPct, taxiColor } from '../lib/format'
import type { AirlineStats, AirportStats, PercentileStats } from '../lib/types'

type Row = AirlineStats | AirportStats
export type SortKey = keyof PercentileStats

function isAirline(r: Row): r is AirlineStats {
  return 'carrier_code' in r
}

interface Props {
  rows: Row[]
  sortKey: SortKey
  onSort: (k: SortKey) => void
  title: string
}

const cols: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: 'median', label: 'Median', numeric: true },
  { key: 'p90', label: 'p90', numeric: true },
  { key: 'p95', label: 'p95', numeric: true },
  { key: 'mean', label: 'Avg', numeric: true },
  { key: 'pct_over_30', label: '>30 min', numeric: true },
  { key: 'pct_gate_ontime_tarmac_delayed', label: '"On-time" trap', numeric: true },
  { key: 'count', label: 'Flights', numeric: true },
]

export default function RankTable({ rows, sortKey, onSort, title }: Props) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900">
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Name</th>
              {cols.map(c => (
                <th
                  key={c.key as string}
                  className="text-right px-3 py-3 text-slate-400 font-medium cursor-pointer hover:text-white select-none whitespace-nowrap"
                  onClick={() => onSort(c.key)}
                >
                  {c.label}
                  {sortKey === c.key && <span className="ml-1 text-blue-400">▾</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const name = isAirline(row)
                ? `${row.carrier_name} (${row.carrier_code})`
                : `${row.airport_code} — ${row.airport_name}`
              return (
                <tr
                  key={i}
                  className="border-b border-slate-800/50 hover:bg-slate-900/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-slate-200">{name}</td>
                  <td className="px-3 py-3 text-right" style={{ color: taxiColor(row.median) }}>
                    {fmtMinutes(row.median)}
                  </td>
                  <td className="px-3 py-3 text-right" style={{ color: taxiColor(row.p90) }}>
                    {fmtMinutes(row.p90)}
                  </td>
                  <td className="px-3 py-3 text-right" style={{ color: taxiColor(row.p95) }}>
                    {fmtMinutes(row.p95)}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-300">{fmtMinutes(row.mean)}</td>
                  <td className="px-3 py-3 text-right" style={{ color: row.pct_over_30 > 0.1 ? '#f97316' : '#94a3b8' }}>
                    {fmtPct(row.pct_over_30)}
                  </td>
                  <td className="px-3 py-3 text-right" style={{ color: row.pct_gate_ontime_tarmac_delayed > 0.15 ? '#ef4444' : '#94a3b8' }}>
                    {fmtPct(row.pct_gate_ontime_tarmac_delayed)}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-500">
                    {row.count.toLocaleString()}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        "On-time trap" = % of flights marked on-time at gate but with taxi-out &gt; 15 min
      </p>
    </div>
  )
}

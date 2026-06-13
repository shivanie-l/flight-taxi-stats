import { taxiColor } from '../lib/format'

interface Props {
  median: number
  p75: number
  p90: number
  p95: number
  /** max minutes for the bar scale */
  max?: number
}

export default function PercentileBar({ median, p75, p90, p95, max = 60 }: Props) {
  const pct = (v: number) => Math.min(100, (v / max) * 100)

  const segments = [
    { end: pct(median), color: taxiColor(median), label: `p50 ${Math.round(median)}m` },
    { end: pct(p75), color: taxiColor(p75), label: `p75 ${Math.round(p75)}m` },
    { end: pct(p90), color: taxiColor(p90), label: `p90 ${Math.round(p90)}m` },
    { end: pct(p95), color: taxiColor(p95), label: `p95 ${Math.round(p95)}m` },
  ]

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="relative h-3 rounded-full bg-slate-800 overflow-hidden">
        {segments.map((s, i) => (
          <div
            key={i}
            className="absolute top-0 left-0 h-full rounded-full transition-all"
            style={{ width: `${s.end}%`, backgroundColor: s.color, opacity: 1 - i * 0.15 }}
          />
        ))}
      </div>
      <div className="flex gap-3 text-xs text-slate-400">
        {segments.map(s => (
          <span key={s.label} style={{ color: s.color }}>{s.label}</span>
        ))}
      </div>
    </div>
  )
}

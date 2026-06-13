import { taxiColor } from '../lib/format'

interface Props {
  label: string
  value: string
  sub?: string
  colorMinutes?: number
}

export default function StatCard({ label, value, sub, colorMinutes }: Props) {
  const color = colorMinutes !== undefined ? taxiColor(colorMinutes) : undefined
  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 flex flex-col gap-1">
      <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-bold" style={color ? { color } : undefined}>{value}</span>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
    </div>
  )
}

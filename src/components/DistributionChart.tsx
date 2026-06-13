import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
import type { TooltipProps } from 'recharts'
import { taxiColor } from '../lib/format'

interface Bin {
  label: string
  binStart: number
  binEnd: number
  pct: number
  count: number
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null
  const b = payload[0].payload as Bin
  return (
    <div className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 shadow-xl">
      <div className="text-sm text-white font-medium">{b.label} min taxi-out</div>
      <div className="text-lg font-bold" style={{ color: taxiColor(b.binStart) }}>
        {(b.pct * 100).toFixed(1)}%
      </div>
      <div className="text-xs text-slate-500">{b.count.toLocaleString()} flights</div>
    </div>
  )
}

export default function DistributionChart({ data }: { data: Bin[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={0} angle={-35} textAnchor="end" height={50} />
        <YAxis tickFormatter={v => `${Math.round(v * 100)}%`} tick={{ fill: '#94a3b8', fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b', opacity: 0.4 }} />
        <Bar dataKey="pct" radius={[3, 3, 0, 0]} isAnimationActive={false}>
          {data.map((b, i) => (
            <Cell key={i} fill={taxiColor(b.binStart)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

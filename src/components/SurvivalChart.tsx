import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from 'recharts'
import type { TooltipProps } from 'recharts'

interface Point {
  minute: number
  survival: number
}

interface Props {
  data: Point[]
  median: number
  p95: number
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null
  const m = payload[0].payload.minute as number
  const s = payload[0].payload.survival as number
  const oneIn = s > 0 ? Math.round(1 / s) : Infinity
  return (
    <div className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 shadow-xl">
      <div className="text-sm text-slate-300">
        Trapped <span className="font-semibold text-white">≥ {m} min</span>
      </div>
      <div className="text-2xl font-bold text-orange-400">{(s * 100).toFixed(1)}%</div>
      <div className="text-xs text-slate-500">
        {Number.isFinite(oneIn) && oneIn > 1 ? `about 1 in ${oneIn} flights` : 'almost every flight'}
      </div>
    </div>
  )
}

export default function SurvivalChart({ data, median, p95 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id="survFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="minute"
          type="number"
          domain={[0, 120]}
          ticks={[0, 15, 30, 45, 60, 75, 90, 105, 120]}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          unit="m"
        />
        <YAxis
          tickFormatter={v => `${Math.round(v * 100)}%`}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          domain={[0, 1]}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#f97316', strokeWidth: 1 }} />
        <ReferenceLine x={15} stroke="#eab308" strokeDasharray="4 4"
          label={{ value: 'trap line (15m)', fill: '#eab308', fontSize: 10, position: 'insideTopRight' }} />
        <ReferenceLine x={Math.round(median)} stroke="#22c55e" strokeDasharray="2 2"
          label={{ value: `median`, fill: '#22c55e', fontSize: 10, position: 'top' }} />
        <ReferenceLine x={Math.round(p95)} stroke="#ef4444" strokeDasharray="2 2"
          label={{ value: `p95`, fill: '#ef4444', fontSize: 10, position: 'top' }} />
        <Area
          type="monotone"
          dataKey="survival"
          stroke="#f97316"
          strokeWidth={2.5}
          fill="url(#survFill)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

import { monthLabel } from './format'
import type { MonthlyTrend } from './types'

export const TREND_COLORS = [
  '#3b82f6', '#f97316', '#22c55e', '#a855f7',
  '#ec4899', '#14b8a6', '#f59e0b', '#ef4444',
]

export interface TrendRow {
  label: string
  _sort: string
  [carrier: string]: number | string
}

export function carriersOf(trends: MonthlyTrend[]): string[] {
  return [...new Set(trends.map(t => t.carrier_code))]
}

/** Pivot the long trend rows into one row per month with a column per carrier. */
export function pivotTrends(trends: MonthlyTrend[], field: keyof MonthlyTrend): TrendRow[] {
  const byMonth: Record<string, TrendRow> = {}
  for (const t of trends) {
    const key = `${t.year}-${String(t.month).padStart(2, '0')}`
    if (!byMonth[key]) byMonth[key] = { label: monthLabel(t.year, t.month), _sort: key }
    byMonth[key][t.carrier_code] = t[field] as number
  }
  return Object.values(byMonth).sort((a, b) => a._sort.localeCompare(b._sort))
}

/**
 * Auto-scaled Y-axis domain that pads around the data instead of forcing a 0
 * baseline — so genuine month-to-month movement is actually visible.
 */
export function paddedDomain(
  pad: number,
  min = 0,
  max = Infinity,
): [(d: number) => number, (d: number) => number] {
  return [
    (dataMin: number) => Math.max(min, Math.floor(dataMin - pad)),
    (dataMax: number) => Math.min(max, Math.ceil(dataMax + pad)),
  ]
}

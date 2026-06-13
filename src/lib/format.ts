export function fmtMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)}m`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function fmtPct(pct: number): string {
  return `${(pct * 100).toFixed(1)}%`
}

export function fmtCount(n: number): string {
  return n.toLocaleString()
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1).toLocaleString('default', { month: 'short', year: '2-digit' })
}

/** Color scale: green (short) → yellow → red (long) for taxi-out minutes */
export function taxiColor(minutes: number): string {
  if (minutes <= 12) return '#22c55e'
  if (minutes <= 18) return '#84cc16'
  if (minutes <= 25) return '#eab308'
  if (minutes <= 35) return '#f97316'
  return '#ef4444'
}

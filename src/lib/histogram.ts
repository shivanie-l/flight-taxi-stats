import type { RouteEntry } from './types'

/** The taxi-out minute that separates "on-time trap" flights (taxi-out > this). */
export const TRAP_THRESHOLD = 15

export interface Aggregated {
  /** summed taxi-out histogram (all flights) */
  h: number[]
  /** summed taxi-out histogram (gate-on-time flights only) */
  g: number[]
  /** total flights in h */
  total: number
}

/**
 * Sum the per-cell histograms for the selected airlines, days-of-week, and
 * times-of-day into a single distribution. This is what makes every stat on the
 * page recompute live as the user toggles filters.
 */
export function aggregate(
  route: RouteEntry,
  airlineCodes: string[],
  dowIdxs: number[],
  todIdxs: number[],
  nbins: number,
): Aggregated {
  const h = new Array(nbins).fill(0)
  const g = new Array(nbins).fill(0)
  for (const code of airlineCodes) {
    const al = route.airlines[code]
    if (!al) continue
    for (const d of dowIdxs) {
      for (const t of todIdxs) {
        const cell = al.cells[d]?.[t]
        if (!cell) continue
        for (let i = 0; i < nbins; i++) {
          h[i] += cell.h[i]
          g[i] += cell.g[i]
        }
      }
    }
  }
  const total = h.reduce((s, x) => s + x, 0)
  return { h, g, total }
}

function sum(a: number[]): number {
  return a.reduce((s, x) => s + x, 0)
}

/** Linear-interpolated percentile (p in [0,1]) over a binned distribution. */
export function percentile(hist: number[], edges: number[], p: number): number {
  const n = sum(hist)
  if (n === 0) return 0
  const target = p * n
  let cum = 0
  for (let i = 0; i < hist.length; i++) {
    const next = cum + hist[i]
    if (next >= target && hist[i] > 0) {
      const lo = edges[i]
      // cap the open-ended final bin's upper edge for display sanity
      const hi = Math.min(edges[i + 1], 120)
      const frac = (target - cum) / hist[i]
      return lo + frac * (hi - lo)
    }
    cum = next
  }
  return Math.min(edges[edges.length - 1], 120)
}

/** P(taxi-out >= m minutes). Smooth, evaluated by interpolating within bins. */
export function survivalAt(hist: number[], edges: number[], m: number): number {
  const n = sum(hist)
  if (n === 0) return 0
  let atOrAbove = 0
  for (let i = 0; i < hist.length; i++) {
    const lo = edges[i]
    const hi = edges[i + 1]
    if (lo >= m) {
      atOrAbove += hist[i]
    } else if (hi > m) {
      // m falls inside this bin: assume uniform spread within the bin
      const span = Math.min(hi, 120) - lo
      if (span > 0) atOrAbove += hist[i] * ((Math.min(hi, 120) - m) / span)
    }
  }
  return atOrAbove / n
}

/** Build the survival curve series at integer-minute resolution. */
export function survivalSeries(
  hist: number[],
  edges: number[],
  maxMinute = 120,
): { minute: number; survival: number }[] {
  const out = []
  for (let m = 0; m <= maxMinute; m++) {
    out.push({ minute: m, survival: survivalAt(hist, edges, m) })
  }
  return out
}

/** Probability density per bin, for the histogram bars. */
export function densitySeries(hist: number[], edges: number[]) {
  const n = sum(hist)
  return hist.map((c, i) => {
    const lo = edges[i]
    const hi = edges[i + 1]
    const label = hi >= 999 ? `${lo}+` : `${lo}-${hi}`
    return {
      label,
      binStart: lo,
      binEnd: hi,
      pct: n > 0 ? c / n : 0,
      count: c,
    }
  })
}

/** % of gate-on-time flights that were nonetheless trapped (taxi-out > 15 min). */
export function trapRate(gateHist: number[], edges: number[]): number {
  const n = sum(gateHist)
  if (n === 0) return 0
  let trapped = 0
  for (let i = 0; i < gateHist.length; i++) {
    if (edges[i] >= TRAP_THRESHOLD) trapped += gateHist[i]
  }
  return trapped / n
}

/**
 * Median taxi-out among trapped passengers (gate on time but taxi-out > 15 min).
 * "If you get trapped, half the time it's at least this long."
 */
export function medianTrapTime(gateHist: number[], edges: number[]): number {
  const masked = gateHist.map((c, i) => (edges[i] >= TRAP_THRESHOLD ? c : 0))
  if (sum(masked) === 0) return 0
  return percentile(masked, edges, 0.5)
}

export interface PercentileStats {
  count: number
  mean: number
  median: number
  p75: number
  p90: number
  p95: number
  p99: number
  /** % of flights where taxi-out > 30 min */
  pct_over_30: number
  /** % of flights marked "on-time" by gate departure that had taxi-out > 15 min */
  pct_gate_ontime_tarmac_delayed: number
}

export interface AirlineStats extends PercentileStats {
  carrier_code: string
  carrier_name: string
}

export interface AirportStats extends PercentileStats {
  airport_code: string
  airport_name: string
  city: string
  state: string
}

export interface RouteStats extends PercentileStats {
  origin: string
  dest: string
  carrier_code: string
}

export interface MonthlyTrend {
  year: number
  month: number
  carrier_code: string
  median: number
  p90: number
  p95: number
  trap_rate: number
  count: number
}

export interface HistogramBucket {
  bin_start: number
  bin_end: number
  count: number
  pct: number
}

export interface SummaryData {
  last_updated: string
  data_through: string
  total_flights_analyzed: number
  airlines: AirlineStats[]
  airports: AirportStats[]
  trends: MonthlyTrend[]
}

// ---- Routes explorer ----

/** One airline x day-of-week x time-of-day cell: taxi-out histograms. */
export interface RouteCell {
  /** counts per taxi-out bin, all flights */
  h: number[]
  /** counts per taxi-out bin, flights that pushed back on time at the gate */
  g: number[]
}

export interface RouteAirline {
  name: string
  /** cells[dayOfWeek 0-6][timeOfDay 0-3] */
  cells: RouteCell[][]
}

export interface RouteEntry {
  origin: string
  dest: string
  airlines: Record<string, RouteAirline>
}

export interface RoutesData {
  /** length NBINS+1; final edge (999) is the open-ended "120+" bucket */
  bin_edges: number[]
  tod_labels: string[]
  dow_labels: string[]
  routes: Record<string, RouteEntry>
}

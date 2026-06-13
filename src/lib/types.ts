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
  mean: number
  median: number
  p95: number
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

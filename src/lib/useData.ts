import { useState, useEffect } from 'react'
import type { SummaryData } from './types'

let cache: SummaryData | null = null

export function useSummaryData() {
  const [data, setData] = useState<SummaryData | null>(cache)
  const [loading, setLoading] = useState(cache === null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cache) return
    fetch('/data/summary.json')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<SummaryData>
      })
      .then(d => {
        cache = d
        setData(d)
        setLoading(false)
      })
      .catch(e => {
        setError(String(e))
        setLoading(false)
      })
  }, [])

  return { data, loading, error }
}

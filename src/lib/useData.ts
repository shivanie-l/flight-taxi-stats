import { useState, useEffect } from 'react'
import type { SummaryData, RoutesData } from './types'

function makeLoader<T>(url: string) {
  let cache: T | null = null
  return function useJson() {
    const [data, setData] = useState<T | null>(cache)
    const [loading, setLoading] = useState(cache === null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
      if (cache) return
      fetch(url)
        .then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json() as Promise<T>
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
}

export const useSummaryData = makeLoader<SummaryData>('/data/summary.json')
export const useRoutesData = makeLoader<RoutesData>('/data/routes.json')

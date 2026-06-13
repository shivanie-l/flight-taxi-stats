import { useState } from 'react'
import { useSummaryData } from '../lib/useData'
import RankTable, { type SortKey } from '../components/RankTable'

export default function Airlines() {
  const { data, loading, error } = useSummaryData()
  const [sortKey, setSortKey] = useState<SortKey>('median')
  const [search, setSearch] = useState('')

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>
  if (error || !data) return <div className="p-8 text-red-400">Failed to load data.</div>

  const rows = [...data.airlines]
    .filter(a =>
      search === '' ||
      a.carrier_name.toLowerCase().includes(search.toLowerCase()) ||
      a.carrier_code.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => (a[sortKey] as number) - (b[sortKey] as number))

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Airlines</h1>
        <p className="text-slate-400">
          Taxi-out time statistics (doors close → wheels up) by airline, sorted by median.
          Lower is better for passengers.
        </p>
      </div>
      <input
        type="search"
        placeholder="Search airlines…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
      />
      <RankTable
        rows={rows}
        sortKey={sortKey}
        onSort={setSortKey}
        title=""
      />
    </div>
  )
}

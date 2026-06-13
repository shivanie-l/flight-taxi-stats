import { clsx } from 'clsx'

interface Option {
  value: string
  label: string
}

interface Props {
  label: string
  options: Option[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
  /** require at least one selection (clicking the last active one is a no-op) */
  requireOne?: boolean
}

export default function ToggleChips({ label, options, selected, onChange, requireOne = true }: Props) {
  const toggle = (v: string) => {
    const next = new Set(selected)
    if (next.has(v)) {
      if (requireOne && next.size === 1) return
      next.delete(v)
    } else {
      next.add(v)
    }
    onChange(next)
  }

  const allSelected = selected.size === options.length

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
        <button
          onClick={() => onChange(allSelected ? new Set([options[0].value]) : new Set(options.map(o => o.value)))}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          {allSelected ? 'Clear' : 'All'}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => (
          <button
            key={o.value}
            onClick={() => toggle(o.value)}
            className={clsx(
              'px-2.5 py-1 rounded-lg text-sm border transition-colors',
              selected.has(o.value)
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

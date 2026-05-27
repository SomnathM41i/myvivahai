const STYLES = {
  done:       'bg-emerald-100 text-emerald-700',
  completed:  'bg-emerald-100 text-emerald-700',
  processing: 'bg-primary-100 text-primary-700',
  pending:    'bg-amber-100 text-amber-700',
  failed:     'bg-red-100 text-red-700',
}
const LABELS = { done: 'Done', completed: 'Done', processing: 'Processing', pending: 'Pending', failed: 'Failed' }

export default function StatusBadge({ status, progress }) {
  const key = status?.toLowerCase() ?? 'pending'

  if (key === 'pending' || key === 'processing') {
    const pct = progress
    const isIndeterminate = pct === undefined || pct === null
    const barColor = key === 'pending' ? 'bg-amber-400' : 'bg-primary-500'
    return (
      <div className="flex items-center gap-2 min-w-[90px]">
        <div className="flex-1 h-1.5 bg-surface-200 rounded-full overflow-hidden relative">
          {isIndeterminate ? (
            <div className={`h-full rounded-full w-1/3 ${barColor} animate-progress`} />
          ) : (
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          )}
        </div>
        {!isIndeterminate && (
          <span className="text-xs font-semibold text-surface-500 shrink-0 tabular-nums">
            {Math.round(pct)}%
          </span>
        )}
      </div>
    )
  }

  return (
    <span className={`badge ${STYLES[key] ?? 'bg-surface-100 text-surface-600'}`}>
      {LABELS[key] ?? status}
    </span>
  )
}

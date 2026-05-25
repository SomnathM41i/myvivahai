const STYLES = {
  done:       'bg-emerald-100 text-emerald-700',
  completed:  'bg-emerald-100 text-emerald-700',
  processing: 'bg-primary-100 text-primary-700',
  pending:    'bg-amber-100 text-amber-700',
  failed:     'bg-red-100 text-red-700',
}
const LABELS = { done: 'Done', completed: 'Done', processing: 'Processing', pending: 'Pending', failed: 'Failed' }

export default function StatusBadge({ status }) {
  const key = status?.toLowerCase() ?? 'pending'
  return (
    <span className={`badge ${STYLES[key] ?? 'bg-surface-100 text-surface-600'}`}>
      {key === 'processing' && <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse mr-1" />}
      {LABELS[key] ?? status}
    </span>
  )
}

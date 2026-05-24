/**
 * src/components/ui/StatusBadge.jsx
 * Renders a coloured pill for upload/extraction status.
 */
const STATUS_STYLES = {
  done:       'bg-green-100 text-green-700',
  completed:  'bg-green-100 text-green-700',
  processing: 'bg-blue-100 text-blue-700 animate-pulse',
  pending:    'bg-yellow-100 text-yellow-700',
  failed:     'bg-red-100 text-red-700',
}

const STATUS_LABELS = {
  done:       'Done',
  completed:  'Done',
  processing: 'Processing',
  pending:    'Pending',
  failed:     'Failed',
}

export default function StatusBadge({ status }) {
  const key = status?.toLowerCase() ?? 'pending'
  const cls = STATUS_STYLES[key] ?? 'bg-gray-100 text-gray-600'
  const label = STATUS_LABELS[key] ?? status

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

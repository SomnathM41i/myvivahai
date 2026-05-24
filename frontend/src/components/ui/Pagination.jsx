/**
 * src/components/ui/Pagination.jsx
 */
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, totalPages, onPageChange, loading }) {
  if (totalPages <= 1) return null

  const pages = []
  const delta = 2
  const left  = Math.max(1, page - delta)
  const right = Math.min(totalPages, page + delta)

  if (left > 1)  pages.push(1, left > 2 ? '…' : null)
  for (let i = left; i <= right; i++) pages.push(i)
  if (right < totalPages) pages.push(right < totalPages - 1 ? '…' : null, totalPages)
  const clean = pages.filter((p) => p !== null)

  const btn = (label, onClick, disabled, active = false) => (
    <button
      key={label}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        px-3 py-1.5 text-sm rounded-md border transition-colors
        ${active
          ? 'bg-indigo-600 text-white border-indigo-600'
          : disabled
            ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}
      `}
    >
      {label}
    </button>
  )

  return (
    <div className="flex items-center gap-1">
      {btn(<ChevronLeft size={14} />, () => onPageChange(page - 1), page === 1)}
      {clean.map((p, i) =>
        p === '…'
          ? <span key={`ellipsis-${i}`} className="px-2 text-gray-400">…</span>
          : btn(p, () => onPageChange(p), false, p === page)
      )}
      {btn(<ChevronRight size={14} />, () => onPageChange(page + 1), page === totalPages)}
    </div>
  )
}

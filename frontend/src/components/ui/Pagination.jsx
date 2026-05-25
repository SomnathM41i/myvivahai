import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Pagination({ page, totalPages, onPageChange, loading }) {
  if (totalPages <= 1) return null

  const pages = []
  const delta = 2, left = Math.max(1, page - delta), right = Math.min(totalPages, page + delta)
  if (left > 1) pages.push(1, left > 2 ? '…' : null)
  for (let i = left; i <= right; i++) pages.push(i)
  if (right < totalPages) pages.push(right < totalPages - 1 ? '…' : null, totalPages)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1">
      <PageBtn disabled={page === 1} onClick={() => onPageChange(page - 1)}><ChevronLeft size={14} /></PageBtn>
      {pages.filter(p => p !== null).map((p, i) =>
        p === '…' ? <span key={`e-${i}`} className="px-2 text-surface-300">…</span>
        : <PageBtn key={p} active={p === page} onClick={() => onPageChange(p)}>{p}</PageBtn>
      )}
      <PageBtn disabled={page === totalPages} onClick={() => onPageChange(page + 1)}><ChevronRight size={14} /></PageBtn>
    </motion.div>
  )
}

function PageBtn({ children, onClick, disabled, active }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-9 h-9 rounded-xl text-sm font-semibold flex items-center justify-center transition-colors duration-200
        ${active ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white' : disabled
          ? 'text-surface-300 cursor-not-allowed' : 'text-surface-500 hover:bg-surface-100 hover:text-surface-700 border border-surface-200 bg-white'}`}>
      {children}
    </button>
  )
}

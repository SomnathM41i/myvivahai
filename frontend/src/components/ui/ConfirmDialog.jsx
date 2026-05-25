import { AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = 'Delete', loading }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative bg-white rounded-2xl shadow-modal w-full max-w-md mx-4 p-6">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-surface-800">{title}</h3>
                <p className="mt-1 text-sm text-surface-500">{message}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={onCancel} disabled={loading}
                className="btn-secondary">Cancel</button>
              <button onClick={onConfirm} disabled={loading}
                className="btn-danger">{loading ? 'Deleting…' : confirmLabel}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

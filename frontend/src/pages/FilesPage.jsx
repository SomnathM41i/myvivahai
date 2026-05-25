import { useState } from 'react'
import { Search, RefreshCw, Download, Trash2, Eye, FileText, Filter, Loader2, AlertCircle, FileUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFiles } from '../hooks/useFiles'
import { downloadFile } from '../services/fileService'
import StatusBadge from '../components/ui/StatusBadge'
import Pagination from '../components/ui/Pagination'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import FileDetailModal from '../features/files/FileDetailModal'
import { formatBytes, formatDate } from '../utils/formatter'
import { stagger, fadeInUp, listItem } from '../utils/animations'

const STATUS_OPTIONS  = ['', 'pending', 'processing', 'done', 'failed']
const TYPE_OPTIONS    = ['', 'pdf', 'docx', 'image', 'txt']

export default function FilesPage() {
  const {
    items, total, totalPages, page, search, status, fileType, loading, error,
    setStatus, setFileType, handleSearch, goToPage, handleDelete, handleReprocess, refresh,
  } = useFiles()

  const [selectedFile, setSelectedFile] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState({})
  const [downloadLoading, setDownloadLoading] = useState({})

  const markLoading = (id, v) => setActionLoading(p => ({ ...p, [id]: v }))

  const confirmDelete = async () => {
    if (!deleteTarget) return; setDeleteLoading(true)
    try { await handleDelete(deleteTarget.id); if (selectedFile?.id === deleteTarget.id) setSelectedFile(null) }
    finally { setDeleteLoading(false); setDeleteTarget(null) }
  }

  const onReprocess = async (id) => { markLoading(id, true); try { await handleReprocess(id) } finally { markLoading(id, false) } }
  const onDownload  = async (f) => {
    setDownloadLoading(p => ({...p, [f.id]: true}))
    try { await downloadFile(f.id, f.original_filename) } finally { setDownloadLoading(p => ({...p, [f.id]: false})) }
  }

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-6">
      <motion.div variants={fadeInUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-800">Uploaded Files</h1>
          <p className="text-sm text-surface-400 mt-1">
            {total > 0 ? `${total} file${total !== 1 ? 's' : ''}` : 'No files yet'}
          </p>
        </div>
        <button onClick={refresh} disabled={loading} className="btn-secondary">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </motion.div>

      <motion.div variants={fadeInUp} className="card !p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
            <input type="text" placeholder="Search by filename…" value={search}
              onChange={(e) => handleSearch(e.target.value)} className="input !pl-9" />
          </div>
          <div className="relative">
            <Filter size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="select !pl-8">
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All statuses'}</option>)}
            </select>
          </div>
          <div className="relative">
            <FileText size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
            <select value={fileType} onChange={(e) => setFileType(e.target.value)} className="select !pl-8">
              {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t ? t.toUpperCase() : 'All types'}</option>)}
            </select>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>{error && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={18} className="shrink-0" />{error}
        </motion.div>
      )}</AnimatePresence>

      <motion.div variants={fadeInUp} className="card !p-0 overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-primary-400" /></div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-50 border-b border-surface-100">
                    <th className="text-left px-5 py-3.5 font-semibold text-surface-500 text-xs uppercase tracking-wider">File Name</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-surface-500 text-xs uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-surface-500 text-xs uppercase tracking-wider">Status</th>
                    <th className="text-right px-4 py-3.5 font-semibold text-surface-500 text-xs uppercase tracking-wider">Size</th>
                    <th className="text-right px-5 py-3.5 font-semibold text-surface-500 text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <motion.tbody variants={stagger} initial="initial" animate="animate" className="divide-y divide-surface-100">
                  {items.map(file => (
                    <motion.tr key={file.id} variants={listItem} className="transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                            <FileText size={15} className="text-primary-500" />
                          </div>
                          <span className="font-semibold text-surface-700 truncate max-w-xs">{file.original_filename}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-surface-400 whitespace-nowrap text-sm">{formatDate(file.created_at)}</td>
                      <td className="px-4 py-4"><StatusBadge status={file.status} /></td>
                      <td className="px-4 py-4 text-right text-surface-400 whitespace-nowrap text-sm">
                        {file.file_size_bytes != null ? formatBytes(file.file_size_bytes) : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <ActionBtn icon={Eye} title="View" onClick={() => setSelectedFile(file)} />
                          <ActionBtn icon={downloadLoading[file.id] ? Loader2 : Download} title="Download"
                            onClick={() => onDownload(file)} disabled={downloadLoading[file.id]}
                            iconClass={downloadLoading[file.id] ? 'animate-spin' : ''} />
                          <ActionBtn icon={actionLoading[file.id] ? Loader2 : RefreshCw} title="Reprocess"
                            onClick={() => onReprocess(file.id)} disabled={file.status === 'processing' || actionLoading[file.id]}
                            className="text-primary-600 hover:text-primary-800" iconClass={actionLoading[file.id] ? 'animate-spin' : ''} />
                          <ActionBtn icon={Trash2} title="Delete" onClick={() => setDeleteTarget(file)}
                            className="text-red-400 hover:text-red-600" />
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-surface-100">
              {items.map(file => (
                <motion.div key={file.id} variants={listItem} initial="initial" animate="animate">
                  <MobileCard file={file} loading={actionLoading[file.id]}
                    onView={() => setSelectedFile(file)} onDelete={() => setDeleteTarget(file)}
                    onReprocess={() => onReprocess(file.id)} onDownload={() => onDownload(file)}
                    downloading={downloadLoading[file.id]} />
                </motion.div>
              ))}
            </div>

            {(totalPages > 1 || total > 0) && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-surface-100 bg-surface-50/50">
                <p className="text-xs text-surface-400">
                  Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
                </p>
                <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} loading={loading} />
              </div>
            )}
          </>
        )}
      </motion.div>

      <AnimatePresence>{selectedFile && (
        <FileDetailModal file={selectedFile} onClose={() => setSelectedFile(null)}
          onDelete={(id) => { setSelectedFile(null); setDeleteTarget(items.find(f => f.id === id)) }}
          onReprocess={(id) => onReprocess(id)} onDownload={() => onDownload(selectedFile)}
          downloading={downloadLoading[selectedFile.id]} />
      )}</AnimatePresence>

      <ConfirmDialog open={!!deleteTarget} title="Delete file?"
        message={`"${deleteTarget?.original_filename}" and its extracted data will be permanently deleted.`}
        confirmLabel="Delete" loading={deleteLoading}
        onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </motion.div>
  )
}

function MobileCard({ file, loading, downloading, onView, onDelete, onReprocess, onDownload }) {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-surface-700 truncate text-sm">{file.original_filename}</p>
          <p className="text-xs text-surface-400 mt-0.5">{formatDate(file.created_at)}</p>
        </div>
        <StatusBadge status={file.status} />
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onView} className="btn-secondary !py-1.5 !text-xs flex-1">View</button>
        <button onClick={onDownload} disabled={downloading}
          className="btn-secondary !py-1.5 !text-xs flex-1 disabled:opacity-50">{downloading ? '…' : 'Download'}</button>
        <button onClick={onReprocess} disabled={file.status === 'processing' || loading}
          className="btn-ghost !py-1.5 !text-xs flex-1">Reprocess</button>
        <button onClick={onDelete} className="btn-ghost !py-1.5 !text-xs !text-red-500 flex-1">Delete</button>
      </div>
    </div>
  )
}

function ActionBtn({ icon: Icon, title, onClick, disabled, className = 'text-surface-400 hover:text-surface-600', iconClass = '' }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-200
        hover:bg-surface-100 ${className} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
      <Icon size={15} className={iconClass} />
    </button>
  )
}

function EmptyState() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-surface-50 flex items-center justify-center mb-4">
        <FileUp size={32} className="text-surface-300" />
      </div>
      <h3 className="text-base font-bold text-surface-500">No files found</h3>
      <p className="text-sm text-surface-400 mt-1 max-w-xs">Upload a biodata file to get started, or clear your search filters.</p>
    </motion.div>
  )
}

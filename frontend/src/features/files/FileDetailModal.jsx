import { useEffect, useState } from 'react'
import { X, Download, RefreshCw, Trash2, FileText } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import JsonViewer from '../../components/ui/JsonViewer'
import StatusBadge from '../../components/ui/StatusBadge'
import { exportProfileJson, exportProfileCsv, exportProfileXlsx, getProfileByUploadId } from '../../services/profileDataService'
import { formatBytes, formatDate } from '../../utils/formatter'
import { fadeIn, stagger } from '../../utils/animations'

export default function FileDetailModal({ file, onClose, onDelete, onReprocess, onDownload, downloading }) {
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [tab, setTab] = useState('details')

  useEffect(() => {
    if (!file) return; setProfile(null); setTab('details')
    if (file.processed_output) { try { setProfile({ raw_json: file.processed_output, id: null }) } catch {} }
    if (file.status === 'done') {
      setProfileLoading(true)
      getProfileByUploadId(file.id).then(p => { if (p) setProfile(p) }).catch(() => {}).finally(() => setProfileLoading(false))
    }
  }, [file])

  if (!file) return null

  const handleExport = async (format) => {
    if (!profile?.id) return; setExporting(true)
    try {
      const slug = (file.original_filename || 'profile').replace(/\.[^.]+$/, '')
      if (format === 'json') await exportProfileJson(profile.id, slug)
      else if (format === 'csv') await exportProfileCsv(profile.id, slug)
      else await exportProfileXlsx(profile.id, slug)
    } finally { setExporting(false) }
  }

  let jsonData = null
  if (profile?.raw_json) {
    if (typeof profile.raw_json === 'string') { try { jsonData = JSON.parse(profile.raw_json) } catch { jsonData = null } }
    else { jsonData = profile.raw_json }
  } else if (file.processed_output) { try { jsonData = JSON.parse(file.processed_output) } catch { jsonData = null } }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
      className="fixed inset-0 z-40 flex justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-lg bg-white shadow-drawer flex flex-col h-full overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-primary-400 via-primary-500 to-violet-500 shrink-0" />

        <motion.div variants={stagger} initial="initial" animate="animate"
          className="flex items-start justify-between p-5 border-b border-surface-100">
          <motion.div variants={fadeIn} className="min-w-0 pr-4">
            <h2 className="text-base font-bold text-surface-800 truncate">{file.original_filename}</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <StatusBadge status={file.status} />
              <span className="text-xs text-surface-400">{formatDate(file.created_at)}</span>
              {file.file_size_bytes != null && <span className="text-xs text-surface-400">{formatBytes(file.file_size_bytes)}</span>}
            </div>
          </motion.div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors">
            <X size={18} />
          </button>
        </motion.div>

        <div className="flex border-b border-surface-100">
          {['details', 'json'].map(t => (
            <button key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3.5 text-sm font-semibold transition-colors relative ${tab === t ? 'text-primary-600' : 'text-surface-400 hover:text-surface-600'}`}>
              {t === 'json' ? 'Extracted JSON' : 'Details'}
              {tab === t && <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-gradient-to-r from-primary-400 to-primary-500 rounded-full" />}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'details' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
              <DetailRow label="File type" value={file.file_type?.toUpperCase()} />
              <DetailRow label="Status" value={<StatusBadge status={file.status} />} />
              <DetailRow label="Uploaded" value={formatDate(file.created_at)} />
              {file.completed_at && <DetailRow label="Completed" value={formatDate(file.completed_at)} />}
              {file.file_size_bytes != null && <DetailRow label="File size" value={formatBytes(file.file_size_bytes)} />}
              {file.model_used && <DetailRow label="Model" value={file.model_used} />}
              {file.profiles_count != null && <DetailRow label="Profiles" value={file.profiles_count} />}
              {file.error_message && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs font-bold text-red-700 mb-1 uppercase tracking-wider">Error</p>
                  <p className="text-xs text-red-600 font-mono">{file.error_message}</p>
                </motion.div>
              )}
            </motion.div>
          )}
          {tab === 'json' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {profileLoading && <p className="text-sm text-surface-400 animate-pulse">Loading extracted data…</p>}
              {!profileLoading && jsonData && (
                <>
                  <JsonViewer data={jsonData} maxHeight="calc(100vh - 280px)" />
                  {profile?.id && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                      <p className="text-xs font-bold text-surface-500 mb-2 uppercase tracking-wider">Export</p>
                      <div className="flex gap-2">
                        {['json', 'csv', 'xlsx'].map(fmt => (
                          <button key={fmt}
                            disabled={exporting} onClick={() => handleExport(fmt)}
                            className="btn-secondary !px-4 !py-1.5 !text-xs uppercase disabled:opacity-50">
                            {fmt}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </>
              )}
              {!profileLoading && !jsonData && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-surface-50 flex items-center justify-center mb-3">
                    <FileText size={28} className="text-surface-300" />
                  </div>
                  <p className="text-sm text-surface-500 font-medium">No extracted data yet.</p>
                  <p className="text-xs text-surface-400 mt-1">{file.status === 'failed' ? 'Extraction failed — try reprocessing.' : 'Processing may still be in progress.'}</p>
                </div>
              )}
            </motion.div>
          )}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="p-4 border-t border-surface-100 flex items-center gap-2">
          <button onClick={onDownload} disabled={downloading} className="btn-secondary !text-xs">
            <Download size={14} /> {downloading ? 'Downloading' : 'Download'}
          </button>
          <button onClick={() => onReprocess(file.id)} disabled={file.status === 'processing'} className="btn-ghost !text-xs">
            <RefreshCw size={14} /> Reprocess
          </button>
          <button onClick={() => onDelete(file.id)} className="btn-ghost !text-xs !text-red-500 ml-auto">
            <Trash2 size={14} /> Delete
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

function DetailRow({ label, value }) {
  return (
    <motion.div variants={fadeIn} initial="initial" animate="animate"
      className="flex justify-between items-center py-3 border-b border-surface-100 last:border-0">
      <span className="text-sm text-surface-500 font-medium">{label}</span>
      <span className="text-sm font-semibold text-surface-800">{value}</span>
    </motion.div>
  )
}

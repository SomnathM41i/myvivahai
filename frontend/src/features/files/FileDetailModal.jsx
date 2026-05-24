/**
 * src/features/files/FileDetailModal.jsx
 * Slide-over drawer showing file details + extracted JSON + profile actions.
 */
import { useEffect, useState } from 'react'
import { X, Download, RefreshCw, Trash2, FileText } from 'lucide-react'
import JsonViewer from '../../components/ui/JsonViewer'
import StatusBadge from '../../components/ui/StatusBadge'
import { getDownloadUrl } from '../../services/fileService'
import { getProfile, exportProfileJson, exportProfileCsv, exportProfileXlsx } from '../../services/profileDataService'
import { formatBytes, formatDate } from '../../utils/formatter'

export default function FileDetailModal({ file, onClose, onDelete, onReprocess }) {
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [tab, setTab] = useState('details') // 'details' | 'json'

useEffect(() => {
    if (!file) return
    setProfile(null)
    setTab('details')

    // First try processed_output directly on the upload (always available)
    if (file.processed_output) {
      try {
        setProfile({ raw_json: file.processed_output, id: null })
      } catch {}
    }

    // Also fetch the full profile record (has id, needed for exports)
    if (file.status === 'done') {
      setProfileLoading(true)
      import('../../services/profileDataService')
        .then(({ getProfileByUploadId }) => getProfileByUploadId(file.id))
        .then((p) => { if (p) setProfile(p) })
        .catch(() => {})
        .finally(() => setProfileLoading(false))
    }
  }, [file])

  if (!file) return null

  const handleExport = async (format) => {
    if (!profile?.id) return
    setExporting(true)
    try {
      const slug = (file.original_filename || 'profile').replace(/\.[^.]+$/, '')
      if (format === 'json') await exportProfileJson(profile.id, slug)
      else if (format === 'csv')  await exportProfileCsv(profile.id, slug)
      else if (format === 'xlsx') await exportProfileXlsx(profile.id, slug)
    } finally {
      setExporting(false)
    }
  }

  const jsonData = profile?.raw_json
    ? (typeof profile.raw_json === 'string' ? JSON.parse(profile.raw_json) : profile.raw_json)
    : file.processed_output
      ? JSON.parse(file.processed_output)
      : null

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-200">
          <div className="min-w-0 pr-4">
            <h2 className="text-base font-semibold text-gray-900 truncate">{file.original_filename}</h2>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={file.status} />
              <span className="text-xs text-gray-400">{formatDate(file.created_at)}</span>
              {file.file_size_bytes != null && (
                <span className="text-xs text-gray-400">{formatBytes(file.file_size_bytes)}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {['details', 'json'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium transition-colors capitalize
                ${tab === t
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t === 'json' ? 'Extracted JSON' : 'Details'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'details' && (
            <div className="space-y-4">
              <DetailRow label="File type"    value={file.file_type?.toUpperCase()} />
              <DetailRow label="Status"       value={<StatusBadge status={file.status} />} />
              <DetailRow label="Uploaded"     value={formatDate(file.created_at)} />
              {file.completed_at && (
                <DetailRow label="Completed"  value={formatDate(file.completed_at)} />
              )}
              {file.file_size_bytes != null && (
                <DetailRow label="File size"  value={formatBytes(file.file_size_bytes)} />
              )}
              {file.model_used && (
                <DetailRow label="Model"      value={file.model_used} />
              )}
              {file.profiles_count != null && (
                <DetailRow label="Profiles"   value={file.profiles_count} />
              )}
              {file.error_message && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs font-medium text-red-700 mb-1">Extraction Error</p>
                  <p className="text-xs text-red-600 font-mono">{file.error_message}</p>
                </div>
              )}
            </div>
          )}

          {tab === 'json' && (
            <div>
              {profileLoading && (
                <p className="text-sm text-gray-400 animate-pulse">Loading extracted data…</p>
              )}
              {!profileLoading && jsonData && (
                <>
                  <JsonViewer data={jsonData} maxHeight="calc(100vh - 280px)" />
                  {profile?.id && (
                    <div className="mt-4">
                      <p className="text-xs text-gray-500 mb-2 font-medium">Export as:</p>
                      <div className="flex gap-2">
                        {['json', 'csv', 'xlsx'].map((fmt) => (
                          <button
                            key={fmt}
                            disabled={exporting}
                            onClick={() => handleExport(fmt)}
                            className="px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors uppercase disabled:opacity-50"
                          >
                            {fmt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              {!profileLoading && !jsonData && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText size={40} className="text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">No extracted data yet.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {file.status === 'failed' ? 'Extraction failed — try reprocessing.' : 'Processing may still be in progress.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-gray-200 flex items-center gap-2 flex-wrap">
          <a
            href={getDownloadUrl(file.id)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download size={14} /> Download
          </a>
          <button
            onClick={() => onReprocess(file.id)}
            disabled={file.status === 'processing'}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} /> Reprocess
          </button>
          <button
            onClick={() => onDelete(file.id)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors ml-auto"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  )
}

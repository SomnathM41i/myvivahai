/**
 * src/pages/FilesPage.jsx
 * File management table page.
 * Features: search, status/type filter, pagination, view/delete/reprocess/download.
 */
import { useState } from 'react'
import {
  Search, RefreshCw, Download, Trash2, Eye, FileText,
  Filter, Loader2, AlertCircle, FileUp
} from 'lucide-react'
import { useFiles } from '../hooks/useFiles'
import { getDownloadUrl } from '../services/fileService'
import StatusBadge from '../components/ui/StatusBadge'
import Pagination from '../components/ui/Pagination'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import FileDetailModal from '../features/files/FileDetailModal'
import { formatBytes, formatDate } from '../utils/formatter'

const STATUS_OPTIONS  = ['', 'pending', 'processing', 'done', 'failed']
const TYPE_OPTIONS    = ['', 'pdf', 'docx', 'image', 'txt']

export default function FilesPage() {
  const {
    items, total, totalPages, page,
    search, status, fileType, loading, error,
    setStatus, setFileType,
    handleSearch, goToPage, handleDelete, handleReprocess, refresh,
  } = useFiles()

  const [selectedFile, setSelectedFile]     = useState(null)
  const [deleteTarget, setDeleteTarget]     = useState(null)
  const [deleteLoading, setDeleteLoading]   = useState(false)
  const [actionLoading, setActionLoading]   = useState({}) // { [fileId]: bool }

  const markLoading = (id, val) =>
    setActionLoading((prev) => ({ ...prev, [id]: val }))

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await handleDelete(deleteTarget.id)
      if (selectedFile?.id === deleteTarget.id) setSelectedFile(null)
    } finally {
      setDeleteLoading(false)
      setDeleteTarget(null)
    }
  }

  const onReprocess = async (fileId) => {
    markLoading(fileId, true)
    try {
      await handleReprocess(fileId)
    } finally {
      markLoading(fileId, false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Uploaded Files</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total > 0 ? `${total} file${total !== 1 ? 's' : ''}` : 'No files yet'}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by filename…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="pl-8 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white appearance-none"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All statuses'}</option>
              ))}
            </select>
          </div>

          {/* File type filter */}
          <div className="relative">
            <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              className="pl-8 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white appearance-none"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t ? t.toUpperCase() : 'All types'}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle size={18} className="flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-indigo-400" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-5 py-3 font-medium text-gray-600">File Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Upload Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Size</th>
                    <th className="text-right px-5 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((file) => (
                    <FileRow
                      key={file.id}
                      file={file}
                      loading={actionLoading[file.id]}
                      onView={() => setSelectedFile(file)}
                      onDelete={() => setDeleteTarget(file)}
                      onReprocess={() => onReprocess(file.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {items.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  loading={actionLoading[file.id]}
                  onView={() => setSelectedFile(file)}
                  onDelete={() => setDeleteTarget(file)}
                  onReprocess={() => onReprocess(file.id)}
                />
              ))}
            </div>

            {/* Footer: count + pagination */}
            {(totalPages > 1 || total > 0) && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500">
                  Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
                </p>
                <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} loading={loading} />
              </div>
            )}
          </>
        )}
      </div>

      {/* File detail modal */}
      {selectedFile && (
        <FileDetailModal
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          onDelete={(id) => { setSelectedFile(null); setDeleteTarget(items.find((f) => f.id === id)) }}
          onReprocess={(id) => onReprocess(id)}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete file?"
        message={`"${deleteTarget?.original_filename}" and its extracted data will be permanently deleted.`}
        confirmLabel="Delete"
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FileRow({ file, loading, onView, onDelete, onReprocess }) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-5 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={16} className="text-indigo-400 flex-shrink-0" />
          <span className="font-medium text-gray-800 truncate max-w-xs" title={file.original_filename}>
            {file.original_filename}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(file.created_at)}</td>
      <td className="px-4 py-3"><StatusBadge status={file.status} /></td>
      <td className="px-4 py-3 text-right text-gray-500 whitespace-nowrap">
        {file.file_size_bytes != null ? formatBytes(file.file_size_bytes) : '—'}
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center justify-end gap-1">
          <ActionBtn icon={Eye} title="View" onClick={onView} />
          <ActionBtn icon={Download} title="Download" href={getDownloadUrl(file.id)} />
          <ActionBtn
            icon={loading ? Loader2 : RefreshCw}
            title="Reprocess"
            onClick={onReprocess}
            disabled={file.status === 'processing' || loading}
            className="text-blue-600 hover:text-blue-800"
            iconClass={loading ? 'animate-spin' : ''}
          />
          <ActionBtn icon={Trash2} title="Delete" onClick={onDelete} className="text-red-500 hover:text-red-700" />
        </div>
      </td>
    </tr>
  )
}

function FileCard({ file, loading, onView, onDelete, onReprocess }) {
  return (
    <div className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-gray-800 truncate text-sm">{file.original_filename}</p>
          <p className="text-xs text-gray-400 mt-0.5">{formatDate(file.created_at)}</p>
        </div>
        <StatusBadge status={file.status} />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button onClick={onView} className="flex-1 py-1.5 text-xs text-center bg-indigo-50 text-indigo-700 rounded-lg font-medium">View</button>
        <a href={getDownloadUrl(file.id)} target="_blank" rel="noreferrer"
          className="flex-1 py-1.5 text-xs text-center bg-gray-100 text-gray-700 rounded-lg font-medium">
          Download
        </a>
        <button onClick={onReprocess} disabled={file.status === 'processing' || loading}
          className="flex-1 py-1.5 text-xs text-center bg-blue-50 text-blue-700 rounded-lg font-medium disabled:opacity-50">
          Reprocess
        </button>
        <button onClick={onDelete} className="flex-1 py-1.5 text-xs text-center bg-red-50 text-red-700 rounded-lg font-medium">
          Delete
        </button>
      </div>
    </div>
  )
}

function ActionBtn({ icon: Icon, title, onClick, href, disabled, className = 'text-gray-500 hover:text-gray-700', iconClass = '' }) {
  const cls = `p-1.5 rounded-md transition-colors ${className} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" title={title} className={cls}>
        <Icon size={15} className={iconClass} />
      </a>
    )
  }
  return (
    <button onClick={onClick} disabled={disabled} title={title} className={cls}>
      <Icon size={15} className={iconClass} />
    </button>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <FileUp size={48} className="text-gray-200 mb-4" />
      <h3 className="text-base font-semibold text-gray-500">No files found</h3>
      <p className="text-sm text-gray-400 mt-1 max-w-xs">
        Upload a biodata file to get started, or clear your search filters.
      </p>
    </div>
  )
}

/**
 * UploadBiodata.jsx  —  unified upload + live stream + history management
 *
 * What changed vs original:
 *  - Uploads now go to /api/biodata/upload (Celery + SSE path), not /api/uploads/
 *  - Live extraction pipeline is shown inline after upload
 *  - Upload history has Delete and Retry buttons per row
 *  - Retry resets status via POST /api/uploads/{id}/retry
 *  - Delete removes via DELETE /api/uploads/{id}
 */

import { useCallback, useState, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Upload, FileText, CheckCircle, Clock, AlertCircle,
  Trash2, RefreshCw, ChevronDown, ChevronUp, Zap,
} from 'lucide-react'
import api from '../services/apiClient'
import { useExtractionStream } from '../hooks/useExtractionStream'

// ── API helpers ──────────────────────────────────────────────────────────

const uploadFile    = (file) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/biodata/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then(r => r.data)
}
const getUploads    = () => api.get('/uploads/').then(r => r.data)
const deleteUpload  = (id) => api.delete(`/uploads/${id}`)
const retryUpload   = (id) => api.post(`/uploads/${id}/retry`).then(r => r.data)

// ── Status helpers ───────────────────────────────────────────────────────

const STATUS = {
  done:       { Icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Done' },
  processing: { Icon: Zap,         color: 'text-blue-600',    bg: 'bg-blue-50',    label: 'Processing' },
  pending:    { Icon: Clock,       color: 'text-amber-500',   bg: 'bg-amber-50',   label: 'Pending' },
  queued:     { Icon: Clock,       color: 'text-amber-500',   bg: 'bg-amber-50',   label: 'Queued' },
  failed:     { Icon: AlertCircle, color: 'text-red-600',     bg: 'bg-red-50',     label: 'Failed' },
}
const getStatus = (s) => STATUS[s] || STATUS.pending

// ── Pipeline stages ──────────────────────────────────────────────────────

const PIPELINE = [
  { key: 'ocr',       label: 'Parse'     },
  { key: 'llm',       label: 'LLM'       },
  { key: 'structure', label: 'Structure' },
  { key: 'save',      label: 'Save'      },
  { key: 'done',      label: 'Complete'  },
]
const STAGE_IDX = { connected:0, ocr:1, llm:2, structure:3, save:4, done:5 }

const LOG_COLOR = {
  ok:    'text-emerald-600',
  error: 'text-red-500',
  ai:    'text-pink-500',
  info:  'text-blue-500',
}

// ── Main component ───────────────────────────────────────────────────────

export default function UploadBiodata() {
  const qc = useQueryClient()
  const [taskId, setTaskId] = useState(null)
  const [activeId, setActiveId] = useState(null)   // upload_id being streamed

  // Upload history
  const { data: uploads = [], isLoading } = useQuery({
    queryKey: ['uploads'],
    queryFn: getUploads,
    refetchInterval: (query) => {
      const rows = query.state.data
      const hasPending = Array.isArray(rows) && rows.some(u => ['pending','processing','queued'].includes(u.status))
      return hasPending ? 3000 : false
    },
  })

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: uploadFile,
    onSuccess: (data) => {
      setTaskId(data.task_id)
      setActiveId(data.upload_id)
      qc.invalidateQueries({ queryKey: ['uploads'] })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteUpload,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['uploads'] }),
  })

  // Retry mutation
  const retryMutation = useMutation({
    mutationFn: retryUpload,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['uploads'] })
      // Can't SSE-stream a retry (no new task_id from Celery here),
      // the status poll above will pick it up.
    },
  })

  // SSE stream for current upload
  const stream = useExtractionStream(taskId)

  // Dropzone
  const onDrop = useCallback((files) => {
    if (files[0] && !uploadMutation.isPending) {
      stream.reset()
      setTaskId(null)
      setActiveId(null)
      uploadMutation.mutate(files[0])
    }
  }, [uploadMutation, stream])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    disabled: uploadMutation.isPending,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.jpg', '.jpeg', '.png'],
      'text/plain': ['.txt'],
    },
  })

  const isStreaming = uploadMutation.isPending || stream.status === 'streaming'

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Upload Biodata</h1>
      <p className="text-gray-500 mb-6">PDF, DOCX, image or TXT — AI extracts your profile automatically</p>

      {/* ── Drop zone ── */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
          transition-all mb-6
          ${isDragActive          ? 'border-primary-500 bg-primary-50'
          : isStreaming           ? 'border-primary-300 bg-primary-50/40 cursor-not-allowed opacity-60'
          : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'}`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto text-gray-400 mb-3" size={40} />
        {isDragActive
          ? <p className="text-primary-600 font-medium">Drop it here!</p>
          : isStreaming
            ? <p className="text-primary-600 font-medium animate-pulse">Processing…</p>
            : <p className="text-gray-600">Drag & drop or <span className="text-primary-600 font-medium">browse</span></p>
        }
        <p className="text-xs text-gray-400 mt-2">PDF, DOCX, JPG, PNG, TXT — max 20 MB</p>
      </div>

      {/* ── Live stream panel ── */}
      {taskId && (
        <StreamPanel stream={stream} />
      )}

      {/* ── Upload error ── */}
      {uploadMutation.error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 mb-6 text-sm">
          {uploadMutation.error.response?.data?.detail || uploadMutation.error.message}
        </div>
      )}

      {/* ── Upload history ── */}
      {(isLoading || uploads.length > 0) && (
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Upload History</h2>
          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {uploads.map((u) => (
                <UploadRow
                  key={u.id}
                  upload={u}
                  isActive={u.id === activeId}
                  onDelete={() => deleteMutation.mutate(u.id)}
                  onRetry={() => retryMutation.mutate(u.id)}
                  isDeleting={deleteMutation.isPending && deleteMutation.variables === u.id}
                  isRetrying={retryMutation.isPending && retryMutation.variables === u.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── StreamPanel ──────────────────────────────────────────────────────────

function StreamPanel({ stream }) {
  const logRef = useRef()
  if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight

  const isDone  = stream.status === 'done'
  const isError = stream.status === 'error'

  return (
    <div className="card mb-6 border border-primary-100 bg-primary-50/30">
      {/* Pipeline stepper */}
      <div className="flex items-center mb-4">
        {PIPELINE.map((step, i) => {
          const idx    = STAGE_IDX[step.key]
          const done   = stream.stageIndex > idx
          const active = stream.stageIndex === idx
          return (
            <div key={step.key} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs
                  transition-all duration-300
                  ${done   ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                  : active ? 'border-primary-400 bg-primary-50 text-primary-600 animate-pulse'
                  :          'border-gray-200 bg-white text-gray-300'}`}>
                  {done ? '✓' : active ? '●' : '○'}
                </div>
                <span className={`text-[10px] mt-1 text-center truncate w-full px-0.5
                  ${done   ? 'text-emerald-600'
                  : active ? 'text-primary-500 font-medium'
                  :          'text-gray-300'}`}>
                  {step.label}
                </span>
              </div>
              {i < PIPELINE.length - 1 && (
                <div className={`h-px w-4 shrink-0 mx-0.5 mb-5 transition-colors
                  ${stream.stageIndex > idx ? 'bg-emerald-300' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-500
            ${isError ? 'bg-red-400' : isDone ? 'bg-emerald-500' : 'bg-primary-500'}`}
          style={{ width: `${stream.progress}%` }}
        />
      </div>

      {/* Live log */}
      {stream.logs.length > 0 && (
        <div
          ref={logRef}
          className="bg-gray-900 rounded-lg p-3 h-28 overflow-y-auto font-mono text-[11px] space-y-0.5"
        >
          {stream.logs.map((l, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-gray-600 shrink-0">{l.time}</span>
              <span className={LOG_COLOR[l.level] ?? 'text-gray-400'}>{l.text}</span>
            </div>
          ))}
        </div>
      )}

      {stream.error && (
        <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          ⚠️ {stream.error}
        </div>
      )}

      {isDone && stream.profile && (
        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <p className="text-xs font-semibold text-emerald-700 mb-2">Extracted Profile</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              ['Name',      stream.profile.name],
              ['Age',       stream.profile.age],
              ['Education', stream.profile.education],
              ['Occupation',stream.profile.occupation],
              ['City',      stream.profile.city],
              ['Religion',  stream.profile.religion],
            ].filter(([,v]) => v).map(([k,v]) => (
              <div key={k} className="bg-white rounded-md px-2 py-1.5">
                <p className="text-[10px] text-gray-400">{k}</p>
                <p className="text-xs font-medium text-gray-800 truncate">{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── UploadRow ────────────────────────────────────────────────────────────

function UploadRow({ upload, isActive, onDelete, onRetry, isDeleting, isRetrying }) {
  const { Icon, color, bg, label } = getStatus(upload.status)
  const canRetry = ['failed', 'pending'].includes(upload.status)
  const canDelete = upload.status !== 'processing'

  return (
    <div className={`flex items-center justify-between py-3 gap-3
      ${isActive ? 'bg-primary-50/40 -mx-4 px-4 rounded-lg' : ''}`}>
      {/* File info */}
      <div className="flex items-center gap-3 min-w-0">
        <FileText size={16} className="text-gray-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-700 truncate">{upload.original_filename}</p>
          <p className="text-xs text-gray-400">
            {upload.file_type} · {new Date(upload.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Right side: status + actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Status badge */}
        <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${color} ${bg}`}>
          <Icon size={11} />
          {label}
          {upload.status === 'processing' && isActive && (
            <span className="ml-1 w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping inline-block" />
          )}
        </span>

        {/* Retry button */}
        {canRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            title="Retry processing"
            className="p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-primary-50
              disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={14} className={isRetrying ? 'animate-spin' : ''} />
          </button>
        )}

        {/* Delete button */}
        {canDelete && (
          <button
            onClick={onDelete}
            disabled={isDeleting}
            title="Delete upload"
            className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50
              disabled:opacity-40 transition-colors"
          >
            <Trash2 size={14} className={isDeleting ? 'opacity-40' : ''} />
          </button>
        )}
      </div>
    </div>
  )
}
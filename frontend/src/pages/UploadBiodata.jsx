import { useCallback, useState, useRef, useLayoutEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Upload, FileText, CheckCircle, Clock, AlertCircle,
  Trash2, RefreshCw, Eye, ScanLine, Info, Sparkles,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../services/apiClient'
import { useExtractionStream } from '../hooks/useExtractionStream'
import { stagger, fadeIn, fadeInUp, listItem } from '../utils/animations'

const uploadFile = (file, mode) => {
  const fd = new FormData()
  fd.append('file', file); fd.append('extraction_mode', mode)
  return api.post('/uploads/', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
}
const getUploads   = () => api.get('/uploads/').then(r => r.data)
const deleteUpload  = (id) => api.delete(`/uploads/${id}`)
const retryUpload   = (id) => api.post(`/uploads/${id}/retry`).then(r => r.data)

const STATUS = {
  done:       { Icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Done' },
  processing: { Icon: ScanLine,    color: 'text-primary-600',  bg: 'bg-primary-50',  label: 'Processing' },
  pending:    { Icon: Clock,       color: 'text-amber-600',   bg: 'bg-amber-50',   label: 'Pending' },
  queued:     { Icon: Clock,       color: 'text-amber-600',   bg: 'bg-amber-50',   label: 'Queued' },
  failed:     { Icon: AlertCircle, color: 'text-red-600',     bg: 'bg-red-50',     label: 'Failed' },
}
const getStatus = (s) => STATUS[s] || STATUS.pending

const MODES = {
  ocr: {
    id: 'ocr', label: 'OCR + AI', icon: ScanLine,
    color: 'text-primary-600', border: 'border-primary-400/50', bg: 'bg-primary-50', badge: 'bg-primary-100 text-primary-700',
    title: 'OCR + AI Text',
    desc: 'Extracts text via OCR first, then sends to AI. Works with DOCX, TXT, and clean printed biodata.',
    works: ['PDF', 'DOCX', 'TXT', 'Clear printed images'],
    notBest: ['Marathi/Hindi handwriting', 'WhatsApp photo quality'],
  },
  vision: {
    id: 'vision', label: 'Groq Vision AI', icon: Eye,
    color: 'text-violet-600', border: 'border-violet-400/50', bg: 'bg-violet-50', badge: 'bg-violet-100 text-violet-700',
    title: 'Groq Vision AI',
    desc: 'Llama 4 Scout — fast, good for Marathi/Hindi on Groq hardware.',
    works: ['Marathi / Hindi biodata', 'Phone photos', 'WhatsApp images', 'Newspaper biodata pages'],
    notBest: ['DOCX / TXT files (falls back to OCR automatically)'],
  },
  gemini: {
    id: 'gemini', label: 'Gemini Vision AI', icon: Eye,
    color: 'text-blue-600', border: 'border-blue-400/50', bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700',
    title: 'Gemini Vision AI (Recommended)',
    desc: 'Google Gemini 2.5 — best for Marathi/Hindi handwriting and complex layouts.',
    works: ['Marathi / Hindi text', 'Handwritten biodata', 'Complex layouts', 'Phone photos'],
    notBest: ['DOCX / TXT files (falls back to OCR automatically)'],
  },
}

const PIPELINE = [
  { key: 'upload',    label: 'Upload'    },
  { key: 'ocr',      label: 'Parse'     },
  { key: 'llm',      label: 'AI'        },
  { key: 'structure',label: 'Structure' },
  { key: 'save',     label: 'Save'      },
  { key: 'done',     label: 'Complete'  },
]
const STAGE_IDX = { connected:0, upload:1, ocr:2, llm:3, structure:4, save:5, done:6 }
const LOG_COLOR = { ok: 'text-emerald-500', error: 'text-red-500', ai: 'text-violet-500', info: 'text-primary-500' }

export default function UploadBiodata() {
  const qc = useQueryClient()
  const [taskId, setTaskId] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [mode, setMode] = useState('vision')
  const [showInfo, setShowInfo] = useState(false)

  const { data: uploads = [], isLoading } = useQuery({
    queryKey: ['uploads'], queryFn: getUploads,
    refetchInterval: (query) => {
      const rows = query.state.data
      const hasPending = Array.isArray(rows) && rows.some(u => ['pending','processing','queued'].includes(u.status))
      return hasPending ? 3000 : false
    },
  })

  const uploadMutation = useMutation({
    mutationFn: ({ file, mode }) => uploadFile(file, mode),
    onSuccess: (data) => { setTaskId(data.task_id); setActiveId(data.id); qc.invalidateQueries({ queryKey: ['uploads'] }) },
  })
  const deleteMutation = useMutation({ mutationFn: deleteUpload, onSuccess: () => qc.invalidateQueries({ queryKey: ['uploads'] }) })
  const retryMutation = useMutation({ mutationFn: retryUpload, onSuccess: () => qc.invalidateQueries({ queryKey: ['uploads'] }) })
  const stream = useExtractionStream(taskId)

  const onDrop = useCallback((files) => {
    if (files[0] && !uploadMutation.isPending) {
      stream.reset(); setTaskId(null); setActiveId(null)
      uploadMutation.mutate({ file: files[0], mode })
    }
  }, [uploadMutation, stream, mode])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, maxFiles: 1, disabled: uploadMutation.isPending,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.jpg', '.jpeg', '.png'],
      'text/plain': ['.txt'],
    },
  })

  const isStreaming = uploadMutation.isPending || stream.status === 'streaming'
  const currentMode = MODES[mode]

  return (
    <motion.div variants={stagger} initial="initial" animate="animate">
      <motion.div variants={fadeIn} className="mb-8">
        <h1 className="text-2xl font-bold text-surface-800 mb-1">Upload Biodata</h1>
        <p className="text-surface-400">PDF, DOCX, image or TXT — AI extracts your profile automatically</p>
      </motion.div>

      <motion.div variants={fadeInUp} className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-bold text-surface-700">Extraction Method</span>
          <button onClick={() => setShowInfo(v => !v)}
            className="w-6 h-6 rounded-lg bg-surface-100 hover:bg-surface-200 flex items-center justify-center text-surface-400 hover:text-surface-600 transition-colors">
            <Info size={13} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.values(MODES).map((m) => {
            const Icon = m.icon; const selected = mode === m.id
            return (
              <button key={m.id} onClick={() => setMode(m.id)} disabled={isStreaming}
                className={`text-left rounded-xl border-2 p-5 transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${selected ? `${m.border} ${m.bg} shadow-sm` : 'border-surface-200 bg-white hover:border-surface-300'}`}>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selected ? 'bg-white shadow-sm' : 'bg-surface-50'}`}>
                    <Icon size={16} className={selected ? m.color : 'text-surface-400'} />
                  </div>
                  <span className={`text-sm font-bold ${selected ? m.color : 'text-surface-700'}`}>{m.title}</span>
                  {m.id === 'gemini' && (
                    <span className="badge bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[10px]">
                      <Sparkles size={9} />BEST
                    </span>
                  )}
                </div>
                <p className="text-xs text-surface-400 leading-relaxed">{m.desc}</p>
              </button>
            )
          })}
        </div>

        <AnimatePresence>
          {showInfo && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 overflow-hidden">
              {Object.values(MODES).map((m) => (
                <div key={m.id} className="rounded-xl bg-surface-50 border border-surface-200 p-4">
                  <p className="text-xs font-bold text-surface-600 mb-2 uppercase tracking-wider">{m.label}</p>
                  <ul className="space-y-1.5">
                    {m.works.map(w => <li key={w} className="text-xs text-emerald-700 flex gap-2"><span className="text-emerald-500">✓</span>{w}</li>)}
                  </ul>
                  {m.notBest.length > 0 && (
                    <ul className="space-y-1.5 mt-2">
                      {m.notBest.map(w => <li key={w} className="text-xs text-surface-400 flex gap-2"><span>–</span>{w}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <div {...getRootProps()}
          className={`rounded-2xl border-2 border-dashed p-14 text-center cursor-pointer transition-all duration-200 mb-6
            ${isDragActive ? `${currentMode.border} ${currentMode.bg}` : isStreaming
              ? 'border-primary-200 bg-primary-50/50 cursor-not-allowed opacity-60'
              : 'border-surface-200 bg-white hover:border-primary-300 hover:bg-primary-50/30'}`}>
          <input {...getInputProps()} />
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center mx-auto mb-4">
            <Upload size={24} className={isDragActive ? currentMode.color : 'text-surface-400'} />
          </div>
          {isDragActive ? (
            <p className={`font-bold ${currentMode.color}`}>Drop it here!</p>
          ) : isStreaming ? (
            <p className="text-primary-600 font-semibold">Processing…</p>
          ) : (
            <>
              <p className="text-surface-600 font-medium">Drag & drop or <span className={`font-semibold ${currentMode.color}`}>browse</span></p>
              <p className="text-xs text-surface-400 mt-1.5">Using <span className={`font-medium ${currentMode.color}`}>{currentMode.title}</span></p>
            </>
          )}
          <p className="text-xs text-surface-300 mt-3">PDF, DOCX, JPG, PNG, TXT — max 20 MB</p>
        </div>
      </motion.div>

      {taskId && <StreamPanel stream={stream} mode={mode} />}

      <AnimatePresence>
        {uploadMutation.error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-4 mb-6 text-sm">
            {uploadMutation.error.response?.data?.detail || uploadMutation.error.message}
          </motion.div>
        )}
      </AnimatePresence>

      {(isLoading || uploads.length > 0) && (
        <motion.div variants={fadeInUp} className="card p-0 overflow-hidden">
          <div className="p-5 border-b border-surface-100">
            <h2 className="font-bold text-surface-800">Upload History</h2>
          </div>
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[1,2,3].map(i => <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: i * 0.08 }} className="shimmer h-12 rounded-xl" />)}
            </div>
          ) : (
            <motion.div variants={stagger} initial="initial" animate="animate" className="divide-y divide-surface-100">
              {uploads.map((u) => (
                <motion.div key={u.id} variants={listItem} className="px-5">
                  <UploadRow upload={u} isActive={u.id === activeId}
                    progress={u.id === activeId && stream.status === 'streaming' ? stream.progress : undefined}
                    onDelete={() => deleteMutation.mutate(u.id)} onRetry={() => retryMutation.mutate(u.id)}
                    isDeleting={deleteMutation.isPending && deleteMutation.variables === u.id}
                    isRetrying={retryMutation.isPending && retryMutation.variables === u.id} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}

function StreamPanel({ stream, mode }) {
  const logRef = useRef()
  useLayoutEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight })

  const isDone = stream.status === 'done'
  const isError = stream.status === 'error'
  const modeInfo = MODES[mode] || MODES.ocr

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="card border border-primary-100 bg-gradient-to-br from-white to-primary-50/40 mb-6 overflow-hidden">
      <div className="h-0.5 bg-gradient-to-r from-primary-400 via-primary-500 to-violet-500 -mx-6 -mt-6 mb-4" />

      <div className="flex items-center gap-2 mb-4">
        {(() => { const Icon = modeInfo.icon; return <Icon size={14} className={modeInfo.color} /> })()}
        <span className={`text-xs font-bold uppercase tracking-wider ${modeInfo.color}`}>{modeInfo.title}</span>
      </div>

      <div className="flex items-center mb-4">
        {PIPELINE.map((step, i) => {
          const idx = STAGE_IDX[step.key] ?? i; const done = stream.stageIndex > idx; const active = stream.stageIndex === idx
          return (
            <div key={step.key} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center text-xs font-bold transition-colors duration-200
                  ${done ? 'border-emerald-400 bg-emerald-50 text-emerald-600' : active
                    ? 'border-primary-400 bg-primary-50 text-primary-600' : 'border-surface-200 bg-white text-surface-300'}`}>
                  {done ? '✓' : active ? '●' : '○'}
                </div>
                <span className={`text-[10px] mt-1.5 text-center truncate w-full px-0.5 font-semibold
                  ${done ? 'text-emerald-600' : active ? 'text-primary-500' : 'text-surface-300'}`}>
                  {mode === 'vision' && step.key === 'ocr' ? 'Vision' : step.label}
                </span>
              </div>
              {i < PIPELINE.length - 1 && (
                <div className={`h-0.5 w-5 shrink-0 mx-1 mb-6 rounded-full transition-colors duration-300
                  ${stream.stageIndex > idx ? 'bg-emerald-300' : 'bg-surface-200'}`} />
              )}
            </div>
          )
        })}
      </div>

      <div className="h-2 bg-surface-100 rounded-full overflow-hidden mb-4">
        <div className={`h-full rounded-full transition-all duration-500
          ${isError ? 'bg-red-400' : isDone ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-primary-400 to-primary-500'}`}
          style={{ width: `${stream.progress}%` }} />
      </div>

      {stream.logs.length > 0 && (
        <div ref={logRef} className="bg-surface-900 rounded-xl p-4 h-28 overflow-y-auto font-mono text-[11px] space-y-1 leading-relaxed">
          {stream.logs.map((l, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-surface-500 shrink-0">{l.time}</span>
              <span className={LOG_COLOR[l.level] ?? 'text-surface-400'}>{l.text}</span>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {stream.error && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {stream.error}
          </motion.div>
        )}
      </AnimatePresence>

      {isDone && stream.profile && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          className="mt-4 p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/40 border border-emerald-200 rounded-xl">
          <p className="text-xs font-bold text-emerald-700 mb-3 uppercase tracking-wider">Extracted Profile</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[['Name', stream.profile.name], ['Age', stream.profile.age], ['Education', stream.profile.education],
              ['Occupation', stream.profile.occupation], ['City', stream.profile.city], ['Religion', stream.profile.religion],
            ].filter(([,v]) => v).map(([k,v]) => (
              <div key={k} className="bg-white/80 rounded-xl px-3 py-2 shadow-sm">
                <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">{k}</p>
                <p className="text-xs font-semibold text-surface-800 truncate mt-0.5">{v}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

function UploadRow({ upload, isActive, onDelete, onRetry, isDeleting, isRetrying, progress }) {
  const { Icon, color, bg, label } = getStatus(upload.status)
  const canRetry = ['failed', 'pending'].includes(upload.status)
  const canDelete = upload.status !== 'processing'
  const modeInfo = MODES[upload.extraction_mode] || MODES.ocr
  const ModeIcon = modeInfo.icon
  const isPendingOrProcessing = ['pending', 'processing'].includes(upload.status)

  return (
    <div className={`flex items-center justify-between py-4 gap-3 transition-colors ${isActive ? 'bg-primary-50/40 -mx-5 px-5' : ''}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-surface-50 flex items-center justify-center">
          <FileText size={14} className="text-surface-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-surface-700 truncate">{upload.original_filename}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-surface-400">{upload.file_type} · {new Date(upload.created_at).toLocaleDateString()}</p>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${modeInfo.badge}`}>
              <ModeIcon size={8} />{modeInfo.label}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {isPendingOrProcessing ? (
          <div className="flex items-center gap-2 min-w-[90px]">
            <div className="flex-1 h-1.5 bg-surface-200 rounded-full overflow-hidden relative">
              {progress !== undefined ? (
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    upload.status === 'pending' ? 'bg-amber-400' : 'bg-primary-500'
                  }`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              ) : (
                <div className={`h-full rounded-full w-1/3 ${upload.status === 'pending' ? 'bg-amber-400' : 'bg-primary-500'} animate-progress`} />
              )}
            </div>
            {progress !== undefined && (
              <span className="text-xs font-semibold text-surface-500 shrink-0 tabular-nums">{Math.round(progress)}%</span>
            )}
          </div>
        ) : (
          <span className={`badge ${color} ${bg}`}>
            <Icon size={11} />{label}
          </span>
        )}
        {canRetry && (
          <button onClick={onRetry} disabled={isRetrying} title="Retry"
            className="btn-ghost !p-1.5">
            <RefreshCw size={14} className={isRetrying ? 'animate-spin' : ''} />
          </button>
        )}
        {canDelete && (
          <button onClick={onDelete} disabled={isDeleting} title="Delete"
            className="btn-ghost !p-1.5 !text-surface-400 hover:!text-red-500 hover:!bg-red-50">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

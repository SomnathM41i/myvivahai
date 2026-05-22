import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useUpload } from '../hooks/useUpload'
import { Upload, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react'

const STATUS_ICON  = { done: CheckCircle, processing: Clock, failed: AlertCircle, pending: Clock }
const STATUS_COLOR = { done: 'text-green-600', processing: 'text-blue-600', failed: 'text-red-600', pending: 'text-gray-400' }

export default function UploadBiodata() {
  const { uploads, upload, isUploading, progress, error } = useUpload()

  const onDrop = useCallback((files) => { if (files[0]) upload(files[0]) }, [upload])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, maxFiles: 1, disabled: isUploading,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.jpg', '.jpeg', '.png'],
      'text/plain': ['.txt'],
    },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Upload Biodata</h1>
      <p className="text-gray-500 mb-6">PDF, DOCX, image or TXT — AI extracts your profile automatically</p>

      <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
        transition-colors mb-6 ${isDragActive ? 'border-primary-500 bg-primary-50'
          : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'}
        ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <input {...getInputProps()} />
        <Upload className="mx-auto text-gray-400 mb-3" size={40} />
        {isDragActive
          ? <p className="text-primary-600 font-medium">Drop it here!</p>
          : <p className="text-gray-600">Drag & drop or <span className="text-primary-600 font-medium">browse</span></p>}
        <p className="text-xs text-gray-400 mt-2">PDF, DOCX, JPG, PNG, TXT — max 20 MB</p>
      </div>

      {isUploading && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Uploading…</span><span>{progress}%</span>
          </div>
          <div className="bg-gray-200 rounded-full h-2">
            <div className="bg-primary-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 mb-6 text-sm">
          {error.message}
        </div>
      )}

      {uploads.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Upload History</h2>
          <div className="space-y-2">
            {uploads.map((u) => {
              const Icon = STATUS_ICON[u.status] || Clock
              return (
                <div key={u.id} className="flex items-center justify-between py-2 border-b last:border-0 border-gray-100">
                  <div className="flex items-center gap-3">
                    <FileText size={16} className="text-gray-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">{u.original_filename}</p>
                      <p className="text-xs text-gray-400">{u.file_type} · {new Date(u.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-medium ${STATUS_COLOR[u.status]}`}>
                    <Icon size={13} />{u.status}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

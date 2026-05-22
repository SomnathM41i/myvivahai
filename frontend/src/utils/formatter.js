export const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN') : '—'
export const formatConfidence = (s) => s != null ? `${Math.round(s * 100)}%` : '—'
export const formatFileSize = (bytes) =>
  bytes < 1024 ** 2 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`

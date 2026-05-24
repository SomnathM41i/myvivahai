/**
 * src/services/fileService.js
 * API calls for the Files management page.
 */
import api from './apiClient'

/**
 * @param {Object} params
 * @param {number} params.page
 * @param {number} params.pageSize
 * @param {string} [params.search]
 * @param {string} [params.status]
 * @param {string} [params.fileType]
 */
export async function getFiles({ page = 1, pageSize = 20, search, status, fileType } = {}) {
  const params = { page, page_size: pageSize }
  if (search)   params.search    = search
  if (status)   params.status    = status
  if (fileType) params.file_type = fileType

  const { data } = await api.get('/files/', { params })
  return data // { items, total, page, page_size, total_pages }
}

export async function getFile(fileId) {
  const { data } = await api.get(`/files/${fileId}`)
  return data
}

export async function deleteFile(fileId) {
  await api.delete(`/files/${fileId}`)
}

export async function reprocessFile(fileId) {
  const { data } = await api.post(`/files/${fileId}/reprocess`)
  return data
}

/** Returns the download URL — open directly in browser for file save dialog */
export function getDownloadUrl(fileId) {
  const base = import.meta.env.VITE_API_URL || '/api'
  return `${base}/files/${fileId}/download`
}

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

function getFilenameFromDisposition(disposition) {
  if (!disposition) return null

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1].replace(/"/g, ''))

  const filenameMatch = disposition.match(/filename="?([^"]+)"?/i)
  return filenameMatch?.[1] || null
}

function saveBlob(blob, filename) {
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(href)
}

/** Download through the authenticated API client so protected files include the bearer token. */
export async function downloadFile(fileId, fallbackFilename = 'download') {
  const response = await api.get(`/files/${fileId}/download`, {
    responseType: 'blob',
  })

  const filename =
    getFilenameFromDisposition(response.headers['content-disposition']) ||
    fallbackFilename

  saveBlob(response.data, filename)
}

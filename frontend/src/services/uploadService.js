import api from './apiClient'

export const uploadBiodata = async (file, onProgress) => {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/uploads/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => onProgress?.(Math.round((e.loaded * 100) / e.total)),
  })
  return data
}

export const getUploads = async () => (await api.get('/uploads/')).data
export const getUploadStatus = async (id) => (await api.get(`/uploads/${id}/status`)).data

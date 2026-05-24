/**
 * src/services/profileDataService.js
 * API calls for extracted profile data management.
 */
import api from './apiClient'

export async function getProfile(profileId) {
  const { data } = await api.get(`/profiles/${profileId}`)
  return data
}

export async function updateProfile(profileId, updates) {
  const { data } = await api.put(`/profiles/${profileId}`, updates)
  return data
}

export async function deleteProfile(profileId) {
  await api.delete(`/profiles/${profileId}`)
}

/** Trigger a file download from the export endpoint */
async function downloadExport(url, filename) {
  const token = localStorage.getItem('access_token')
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`Export failed: ${res.status}`)
  const blob = await res.blob()
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.click()
  URL.revokeObjectURL(href)
}

export async function exportProfileJson(profileId, name = 'profile') {
  const base = import.meta.env.VITE_API_URL || '/api'
  await downloadExport(`${base}/profiles/${profileId}/export/json`, `${name}_profile.json`)
}

export async function exportProfileCsv(profileId, name = 'profile') {
  const base = import.meta.env.VITE_API_URL || '/api'
  await downloadExport(`${base}/profiles/${profileId}/export/csv`, `${name}_profile.csv`)
}

export async function exportProfileXlsx(profileId, name = 'profile') {
  const base = import.meta.env.VITE_API_URL || '/api'
  await downloadExport(`${base}/profiles/${profileId}/export/xlsx`, `${name}_profile.xlsx`)
}

export async function getProfileByUploadId(uploadFileId) {
  try {
    const { data } = await api.get(`/files/${uploadFileId}/profile`)
    return data
  } catch {
    return null
  }
}
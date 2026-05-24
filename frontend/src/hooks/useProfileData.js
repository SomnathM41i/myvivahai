/**
 * src/hooks/useProfileData.js
 * Manages state for a single extracted profile:
 * loading, editing, export, delete.
 */
import { useState, useCallback } from 'react'
import {
  getProfile,
  updateProfile,
  deleteProfile,
  exportProfileJson,
  exportProfileCsv,
  exportProfileXlsx,
} from '../services/profileDataService'

export function useProfileData() {
  const [profile, setProfile]       = useState(null)
  const [loading, setLoading]       = useState(false)
  const [saving, setSaving]         = useState(false)
  const [exporting, setExporting]   = useState(false)
  const [error, setError]           = useState(null)

  const load = useCallback(async (profileId) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getProfile(profileId)
      setProfile(data)
      return data
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [])

  const save = useCallback(async (profileId, updates) => {
    setSaving(true)
    setError(null)
    try {
      const updated = await updateProfile(profileId, updates)
      setProfile(updated)
      return updated
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to save profile')
      throw err
    } finally {
      setSaving(false)
    }
  }, [])

  const remove = useCallback(async (profileId) => {
    await deleteProfile(profileId)
    setProfile(null)
  }, [])

  const exportAs = useCallback(async (format, profileId, name) => {
    setExporting(true)
    setError(null)
    try {
      const slug = (name || 'profile').toLowerCase().replace(/\s+/g, '_')
      if (format === 'json') await exportProfileJson(profileId, slug)
      else if (format === 'csv') await exportProfileCsv(profileId, slug)
      else if (format === 'xlsx') await exportProfileXlsx(profileId, slug)
    } catch (err) {
      setError('Export failed — please try again')
    } finally {
      setExporting(false)
    }
  }, [])

  return { profile, loading, saving, exporting, error, load, save, remove, exportAs }
}

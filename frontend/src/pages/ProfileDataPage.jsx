/**
 * src/pages/ProfileDataPage.jsx
 * View / edit / export / delete generated biodata profile.
 * Accessible at /profile/:profileId
 */
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Edit2, Save, X, Trash2, Download, Loader2,
  FileJson, FileSpreadsheet, FileText, ChevronLeft, AlertCircle
} from 'lucide-react'
import { useProfileData } from '../hooks/useProfileData'
import JsonViewer from '../components/ui/JsonViewer'
import ConfirmDialog from '../components/ui/ConfirmDialog'

const FIELDS = [
  { key: 'full_name',          label: 'Full Name',          group: 'Personal' },
  { key: 'date_of_birth',      label: 'Date of Birth',      group: 'Personal' },
  { key: 'gender',             label: 'Gender',             group: 'Personal' },
  { key: 'blood_group',        label: 'Blood Group',        group: 'Personal' },
  { key: 'height',             label: 'Height',             group: 'Personal' },
  { key: 'mother_tongue',      label: 'Mother Tongue',      group: 'Personal' },
  { key: 'religion',           label: 'Religion',           group: 'Background' },
  { key: 'caste',              label: 'Caste',              group: 'Background' },
  { key: 'gotra',              label: 'Gotra',              group: 'Background' },
  { key: 'rashi',              label: 'Rashi',              group: 'Background' },
  { key: 'nakshatra',          label: 'Nakshatra',          group: 'Background' },
  { key: 'manglik',            label: 'Manglik',            group: 'Background' },
  { key: 'education',          label: 'Education',          group: 'Career' },
  { key: 'occupation',         label: 'Occupation',         group: 'Career' },
  { key: 'annual_income',      label: 'Annual Income',      group: 'Career' },
  { key: 'city',               label: 'City',               group: 'Contact' },
  { key: 'state',              label: 'State',              group: 'Contact' },
  { key: 'mobile',             label: 'Mobile',             group: 'Contact' },
  { key: 'email',              label: 'Email',              group: 'Contact' },
  { key: 'father_name',        label: "Father's Name",      group: 'Family' },
  { key: 'mother_name',        label: "Mother's Name",      group: 'Family' },
  { key: 'siblings',           label: 'Siblings',           group: 'Family' },
  { key: 'family_type',        label: 'Family Type',        group: 'Family' },
  { key: 'partner_preference', label: 'Partner Preference', group: 'Preference', textarea: true },
]

const GROUPS = [...new Set(FIELDS.map((f) => f.group))]

export default function ProfileDataPage() {
  const { profileId } = useParams()
  const navigate      = useNavigate()
  const { profile, loading, saving, exporting, error, load, save, remove, exportAs } =
    useProfileData()

  const [editing, setEditing]       = useState(false)
  const [form, setForm]             = useState({})
  const [tab, setTab]               = useState('data')   // 'data' | 'json'
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => { load(profileId) }, [profileId, load])

  useEffect(() => {
    if (profile) {
      const initial = {}
      FIELDS.forEach(({ key }) => { initial[key] = profile[key] ?? '' })
      setForm(initial)
    }
  }, [profile])

  const startEdit = () => setEditing(true)
  const cancelEdit = () => {
    const reset = {}
    FIELDS.forEach(({ key }) => { reset[key] = profile[key] ?? '' })
    setForm(reset)
    setEditing(false)
  }

  const handleSave = async () => {
    const updates = {}
    FIELDS.forEach(({ key }) => {
      if (form[key] !== (profile[key] ?? '')) updates[key] = form[key] || null
    })
    if (Object.keys(updates).length === 0) { setEditing(false); return }
    try {
      await save(profileId, updates)
      setEditing(false)
    } catch { /* error shown via hook */ }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      await remove(profileId)
      navigate(-1)
    } finally {
      setDeleteLoading(false)
      setConfirmDelete(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 size={32} className="animate-spin text-indigo-400" />
      </div>
    )
  }

  if (!profile && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 text-center">
        <AlertCircle size={40} className="text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">Profile not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-indigo-600 hover:underline">
          ← Go back
        </button>
      </div>
    )
  }

  const jsonData = profile?.raw_json
    ? (typeof profile.raw_json === 'string' ? JSON.parse(profile.raw_json) : profile.raw_json)
    : null

  const slug = (profile?.full_name || 'profile').toLowerCase().replace(/\s+/g, '_')

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {profile.full_name || 'Unnamed Profile'}
            </h1>
            <p className="text-sm text-gray-400">Profile #{profileId}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <X size={14} /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <button
              onClick={startEdit}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Edit2 size={14} /> Edit
            </button>
          )}
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" /> {error}
        </div>
      )}

      {/* Export buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-500 mr-1">
          <Download size={14} className="inline mr-1" />Export:
        </span>
        {[
          { fmt: 'json',  label: 'JSON',  Icon: FileJson },
          { fmt: 'csv',   label: 'CSV',   Icon: FileText },
          { fmt: 'xlsx',  label: 'Excel', Icon: FileSpreadsheet },
        ].map(({ fmt, label, Icon }) => (
          <button
            key={fmt}
            disabled={exporting}
            onClick={() => exportAs(fmt, profileId, slug)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Icon size={14} /> {label}
          </button>
        ))}
        {exporting && <Loader2 size={14} className="animate-spin text-indigo-400 ml-1" />}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[{ id: 'data', label: 'Profile Data' }, { id: 'json', label: 'Raw JSON' }].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-5 py-3 text-sm font-medium transition-colors
              ${tab === id ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'data' && (
        <div className="space-y-6">
          {GROUPS.map((group) => {
            const groupFields = FIELDS.filter((f) => f.group === group)
            return (
              <div key={group} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700">{group}</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {groupFields.map(({ key, label, textarea }) => (
                    <div key={key} className="flex items-start gap-4 px-5 py-3">
                      <span className="w-40 flex-shrink-0 text-sm text-gray-500 pt-1">{label}</span>
                      {editing ? (
                        textarea ? (
                          <textarea
                            rows={3}
                            value={form[key] || ''}
                            onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                          />
                        ) : (
                          <input
                            type="text"
                            value={form[key] || ''}
                            onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        )
                      ) : (
                        <span className={`flex-1 text-sm ${profile[key] ? 'text-gray-800' : 'text-gray-300 italic'}`}>
                          {profile[key] || 'Not extracted'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* AI confidence */}
          {profile.ai_confidence != null && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-4 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-indigo-800">AI Confidence</p>
                <div className="mt-1.5 bg-indigo-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 bg-indigo-600 rounded-full transition-all"
                    style={{ width: `${Math.round(profile.ai_confidence * 100)}%` }}
                  />
                </div>
              </div>
              <span className="text-lg font-bold text-indigo-700">
                {Math.round(profile.ai_confidence * 100)}%
              </span>
            </div>
          )}
        </div>
      )}

      {tab === 'json' && (
        <JsonViewer data={jsonData || profile} maxHeight="600px" />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete extracted data?"
        message="This will permanently delete the extracted profile data. The source file will not be deleted."
        confirmLabel="Delete Profile"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

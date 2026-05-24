import { useProfile } from '../hooks/useProfile'
import { exportJSON, exportExcel } from '../services/exportService'
import { Link } from 'react-router-dom'
import { Edit, Upload, FileJson, Sheet, Sparkles } from 'lucide-react'
import { useState } from 'react'

const F = ({ label, value }) => value ? (
  <div>
    <p className="label">{label}</p>
    <p className="text-gray-800 text-sm font-medium">{value}</p>
  </div>
) : null

function ExportButtons({ profile }) {
  const [busy, setBusy] = useState(null)
  async function handle(type) {
    setBusy(type)
    try {
      if (type === 'json') exportJSON(profile)
      else await exportExcel(profile)
    } finally { setBusy(null) }
  }
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handle('json')} disabled={!!busy}
        className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2
                   border border-gray-200 rounded-lg text-gray-600
                   hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        <FileJson size={15} />{busy === 'json' ? 'Exporting…' : 'Export JSON'}
      </button>
      <button
        onClick={() => handle('excel')} disabled={!!busy}
        className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2
                   border border-green-200 rounded-lg text-green-700
                   hover:bg-green-50 transition-colors disabled:opacity-50"
      >
        <Sheet size={15} />{busy === 'excel' ? 'Exporting…' : 'Export Excel'}
      </button>
    </div>
  )
}

export default function ProfilePreview() {
  const { profile, isLoading } = useProfile()
  if (isLoading) return <p className="text-gray-400">Loading profile…</p>
  if (!profile) return (
    <div className="text-center py-16">
      <p className="text-gray-500 mb-4">No profile yet. Upload a biodata to get started.</p>
      <Link to="/upload" className="btn-primary inline-flex items-center gap-2">
        <Upload size={16} />Upload Biodata
      </Link>
    </div>
  )

  const pct = profile.ai_confidence != null ? Math.round(profile.ai_confidence * 100) : null
  const confColor = pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-500'

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{profile.full_name || 'My Profile'}</h1>
          {pct != null && (
            <p className={`text-sm mt-1 flex items-center gap-1 ${confColor}`}>
              <Sparkles size={13} />AI confidence: {pct}%
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ExportButtons profile={profile} />
          <Link to="/profile/edit" className="btn-primary inline-flex items-center gap-2">
            <Edit size={16} />Edit
          </Link>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b">Personal</h2>
          <div className="grid grid-cols-2 gap-4">
            <F label="Date of Birth" value={profile.date_of_birth} />
            <F label="Gender"        value={profile.gender} />
            <F label="Religion"      value={profile.religion} />
            <F label="Caste"         value={profile.caste} />
            <F label="Mother Tongue" value={profile.mother_tongue} />
            <F label="Height"        value={profile.height} />
            <F label="Blood Group"   value={profile.blood_group} />
            <F label="Mobile"        value={profile.mobile} />
            <F label="Email"         value={profile.email} />
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b">Education & Career</h2>
          <div className="grid grid-cols-2 gap-4">
            <F label="Education"     value={profile.education} />
            <F label="Occupation"    value={profile.occupation} />
            <F label="Annual Income" value={profile.annual_income} />
            <F label="City"          value={profile.city} />
            <F label="State"         value={profile.state} />
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b">Family</h2>
          <div className="grid grid-cols-2 gap-4">
            <F label="Father's Name" value={profile.father_name} />
            <F label="Mother's Name" value={profile.mother_name} />
            <F label="Siblings"      value={profile.siblings} />
            <F label="Family Type"   value={profile.family_type} />
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b">Horoscope</h2>
          <div className="grid grid-cols-2 gap-4">
            <F label="Rashi"     value={profile.rashi} />
            <F label="Nakshatra" value={profile.nakshatra} />
            <F label="Gotra"     value={profile.gotra} />
            <F label="Manglik"   value={profile.manglik} />
          </div>
        </div>

        {profile.partner_preference && (
          <div className="card lg:col-span-2">
            <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b">Partner Preference</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{profile.partner_preference}</p>
          </div>
        )}
      </div>
    </div>
  )
}
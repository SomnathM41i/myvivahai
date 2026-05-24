import { useQuery } from '@tanstack/react-query'
import { getDashboardStats } from '../services/analyticsService'
import { useProfile } from '../hooks/useProfile'
import { exportJSON, exportExcel } from '../services/exportService'
import { Upload, User, CheckCircle, TrendingUp, FileJson, Sheet, ChevronRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, bg }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`p-3 rounded-xl ${bg}`}>
        <Icon size={20} className={color} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800 leading-none">{value}</p>
        <p className="text-sm text-gray-500 mt-1">{label}</p>
      </div>
    </div>
  )
}

// ── Confidence pill ───────────────────────────────────────────────────────────
function ConfidencePill({ score }) {
  if (score == null) return null
  const pct = Math.round(score * 100)
  const color = pct >= 80 ? 'bg-green-100 text-green-700'
              : pct >= 60 ? 'bg-yellow-100 text-yellow-700'
              : 'bg-red-100 text-red-700'
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
      <Sparkles size={11} />AI {pct}%
    </span>
  )
}

// ── Profile section row ───────────────────────────────────────────────────────
function ProfileRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex flex-col">
      <span className="label">{label}</span>
      <span className="text-sm text-gray-800 font-medium truncate">{value}</span>
    </div>
  )
}

// ── Export button ─────────────────────────────────────────────────────────────
function ExportButton({ profile }) {
  const [busy, setBusy] = useState(null)

  async function handle(type) {
    setBusy(type)
    try {
      if (type === 'json') exportJSON(profile)
      else await exportExcel(profile)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handle('json')}
        disabled={!!busy}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5
                   border border-gray-200 rounded-lg text-gray-600
                   hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50"
      >
        <FileJson size={13} />
        {busy === 'json' ? 'Exporting…' : 'JSON'}
      </button>
      <button
        onClick={() => handle('excel')}
        disabled={!!busy}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5
                   border border-green-200 rounded-lg text-green-700
                   hover:bg-green-50 hover:border-green-300 transition-colors disabled:opacity-50"
      >
        <Sheet size={13} />
        {busy === 'excel' ? 'Exporting…' : 'Excel'}
      </button>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardStats,
  })
  const { profile, isLoading: profileLoading } = useProfile()

  if (statsLoading) return <p className="text-gray-400">Loading…</p>

  const stats = [
    { label: 'Total Uploads',   value: data?.stats?.total_uploads ?? 0,    icon: Upload,      color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { label: 'Processed',        value: data?.stats?.processed_uploads ?? 0, icon: CheckCircle, color: 'text-green-600',  bg: 'bg-green-50'  },
    { label: 'Profile Complete', value: data?.stats?.profile_complete ? 'Yes' : 'No', icon: User, color: 'text-purple-600', bg: 'bg-purple-50' },
    {
      label: 'AI Confidence',
      value: data?.stats?.ai_confidence != null ? `${Math.round(data.stats.ai_confidence * 100)}%` : '—',
      icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50',
    },
  ]

  return (
    <div>
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-800 mb-1">
        Welcome back, {data?.user?.name?.split(' ')[0]} 👋
      </h1>
      <p className="text-gray-500 mb-8">Here's your myvivahai overview</p>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Extracted Profile Card */}
      {profileLoading ? (
        <div className="card animate-pulse h-48" />
      ) : profile ? (
        <div className="card mb-6">
          {/* Card header */}
          <div className="flex items-start justify-between mb-5 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-800">{profile.full_name || 'My Profile'}</h2>
              <div className="flex items-center gap-2 mt-1">
                <ConfidencePill score={profile.ai_confidence} />
                {profile.city && profile.state && (
                  <span className="text-xs text-gray-400">{profile.city}, {profile.state}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ExportButton profile={profile} />
              <Link
                to="/profile"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline"
              >
                View full <ChevronRight size={13} />
              </Link>
            </div>
          </div>

          {/* Profile fields grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-5">
            <ProfileRow label="Date of Birth"  value={profile.date_of_birth} />
            <ProfileRow label="Gender"          value={profile.gender} />
            <ProfileRow label="Religion"        value={profile.religion} />
            <ProfileRow label="Caste"           value={profile.caste} />
            <ProfileRow label="Mother Tongue"   value={profile.mother_tongue} />
            <ProfileRow label="Height"          value={profile.height} />
            <ProfileRow label="Blood Group"     value={profile.blood_group} />
            <ProfileRow label="Mobile"          value={profile.mobile} />
            <ProfileRow label="Education"       value={profile.education} />
            <ProfileRow label="Occupation"      value={profile.occupation} />
            <ProfileRow label="Annual Income"   value={profile.annual_income} />
            <ProfileRow label="Family Type"     value={profile.family_type} />
            <ProfileRow label="Rashi"           value={profile.rashi} />
            <ProfileRow label="Nakshatra"       value={profile.nakshatra} />
            <ProfileRow label="Gotra"           value={profile.gotra} />
            <ProfileRow label="Manglik"         value={profile.manglik} />
          </div>

          {/* Family row */}
          {(profile.father_name || profile.mother_name || profile.siblings) && (
            <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
              <ProfileRow label="Father's Name" value={profile.father_name} />
              <ProfileRow label="Mother's Name" value={profile.mother_name} />
              <ProfileRow label="Siblings"      value={profile.siblings} />
            </div>
          )}
        </div>
      ) : (
        /* No profile CTA */
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-6 flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-primary-800">Get started — upload your biodata</h3>
            <p className="text-primary-600 text-sm mt-1">AI extracts your complete profile in seconds</p>
          </div>
          <Link to="/upload" className="btn-primary whitespace-nowrap">Upload Now</Link>
        </div>
      )}
    </div>
  )
}
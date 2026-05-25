import { useQuery } from '@tanstack/react-query'
import { getDashboardStats } from '../services/analyticsService'
import { getFiles } from '../services/fileService'
import { getProfileByUploadId, exportProfileJson, exportProfileXlsx } from '../services/profileDataService'
import { Upload, CheckCircle, TrendingUp, FileJson, Sheet, ChevronRight, Sparkles, User, FileText, Loader2 } from 'lucide-react'
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
  const pct = typeof score === 'number' && score <= 1
    ? Math.round(score * 100)
    : Math.round(score)
  const color = pct >= 80 ? 'bg-green-100 text-green-700'
              : pct >= 60 ? 'bg-yellow-100 text-yellow-700'
              : 'bg-red-100 text-red-700'
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
      <Sparkles size={11} />AI {pct}%
    </span>
  )
}

// ── Profile field ─────────────────────────────────────────────────────────────
function ProfileRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{label}</span>
      <span className="text-sm text-gray-800 font-medium truncate">{value}</span>
    </div>
  )
}

// ── Export button ─────────────────────────────────────────────────────────────
function ExportButton({ profileId, fileName }) {
  const [busy, setBusy] = useState(null)
  const slug = (fileName || 'profile').replace(/\.[^.]+$/, '')

  async function handle(type) {
    if (!profileId) return
    setBusy(type)
    try {
      if (type === 'json') await exportProfileJson(profileId, slug)
      else await exportProfileXlsx(profileId, slug)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => handle('json')} disabled={!!busy || !profileId}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5
                   border border-gray-200 rounded-lg text-gray-600
                   hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50">
        <FileJson size={13} />{busy === 'json' ? 'Exporting…' : 'JSON'}
      </button>
      <button onClick={() => handle('excel')} disabled={!!busy || !profileId}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5
                   border border-green-200 rounded-lg text-green-700
                   hover:bg-green-50 hover:border-green-300 transition-colors disabled:opacity-50">
        <Sheet size={13} />{busy === 'excel' ? 'Exporting…' : 'Excel'}
      </button>
    </div>
  )
}

// ── Profile Card ──────────────────────────────────────────────────────────────
function ProfileCard({ file }) {
  // Fetch the profile for this specific file
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile-by-upload', file.id],
    queryFn: () => getProfileByUploadId(file.id),
    enabled: file.status === 'done',
  })

  const name = profile?.full_name || file.original_filename || 'Unnamed Profile'

  return (
    <div className="card mb-4">
      {/* Card header */}
      <div className="flex items-start justify-between mb-4 pb-3 border-b border-gray-100">
        <div>
          <h2 className="text-base font-bold text-gray-800">{name}</h2>
          <div className="flex items-center gap-2 mt-1">
            {profile?.ai_confidence != null && <ConfidencePill score={profile.ai_confidence} />}
            {profile?.city && profile?.state && (
              <span className="text-xs text-gray-400">{profile.city}, {profile.state}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton profileId={profile?.id} fileName={file.original_filename} />
          <Link
            to="/files"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline"
          >
            View full <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
          <Loader2 size={16} className="animate-spin" /> Loading profile data…
        </div>
      ) : profile ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
            <ProfileRow label="Date of Birth"   value={profile.date_of_birth} />
            <ProfileRow label="Gender"           value={profile.gender} />
            <ProfileRow label="Religion"         value={profile.religion} />
            <ProfileRow label="Caste"            value={profile.caste} />
            <ProfileRow label="Mother Tongue"    value={profile.mother_tongue} />
            <ProfileRow label="Height"           value={profile.height} />
            <ProfileRow label="Blood Group"      value={profile.blood_group} />
            <ProfileRow label="Mobile"           value={profile.mobile} />
            <ProfileRow label="Education"        value={profile.highest_education || profile.education} />
            <ProfileRow label="Occupation"       value={profile.occupation} />
            <ProfileRow label="Annual Income"    value={profile.annual_income} />
            <ProfileRow label="Rashi"            value={profile.rashi} />
            <ProfileRow label="Nakshatra"        value={profile.nakshatra} />
            <ProfileRow label="Gotra"            value={profile.gotra} />
          </div>
          {(profile.father_name || profile.mother_name || profile.siblings) && (
            <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
              <ProfileRow label="Father's Name"  value={profile.father_name} />
              <ProfileRow label="Mother's Name"  value={profile.mother_name} />
              <ProfileRow label="Siblings"       value={profile.siblings} />
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-400 italic">No extracted data available for this file.</p>
      )}
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardStats,
  })

  const { data: filesData, isLoading: filesLoading } = useQuery({
    queryKey: ['files', 'dashboard'],
    queryFn: () => getFiles({ page: 1, pageSize: 20 }),
  })

  if (statsLoading) return <p className="text-gray-400">Loading…</p>

  const stats = [
    { label: 'Total Uploads',    value: statsData?.stats?.total_uploads ?? 0,    icon: Upload,      color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { label: 'Processed',        value: statsData?.stats?.processed_uploads ?? 0, icon: CheckCircle, color: 'text-green-600',  bg: 'bg-green-50'  },
    { label: 'Profile Complete', value: statsData?.stats?.profile_complete ? 'Yes' : 'No', icon: User, color: 'text-purple-600', bg: 'bg-purple-50' },
    {
      label: 'AI Confidence',
      value: statsData?.stats?.ai_confidence != null
        ? `${Math.round(statsData.stats.ai_confidence * 100)}%`
        : '—',
      icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50',
    },
  ]

  const doneFiles = (filesData?.items ?? []).filter(f => f.status === 'done')

  return (
    <div>
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-800 mb-1">
        Welcome back, {statsData?.user?.name?.split(' ')[0]} 👋
      </h1>
      <p className="text-gray-500 mb-8">Here's your myvivahai overview</p>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Recent Profiles heading */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <FileText size={18} className="text-primary-600" />
          Recent Profiles
          {doneFiles.length > 0 && (
            <span className="text-sm font-normal text-gray-400">({doneFiles.length})</span>
          )}
        </h2>
        <Link to="/files" className="text-xs font-semibold text-primary-600 hover:underline flex items-center gap-1">
          View all files <ChevronRight size={13} />
        </Link>
      </div>

      {/* Profile cards */}
      {filesLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="card animate-pulse h-48" />)}
        </div>
      ) : doneFiles.length > 0 ? (
        <div>
          {doneFiles.map((file) => (
            <ProfileCard key={file.id} file={file} />
          ))}
        </div>
      ) : (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-6 flex items-center justify-between">
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
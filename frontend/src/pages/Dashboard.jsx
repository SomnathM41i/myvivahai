import { useQuery } from '@tanstack/react-query'
import { getDashboardStats } from '../services/analyticsService'
import { getFiles } from '../services/fileService'
import { getProfileByUploadId, exportProfileJson, exportProfileXlsx } from '../services/profileDataService'
import { Upload, CheckCircle, TrendingUp, FileJson, Sheet, ChevronRight, Sparkles, User, FileText, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { stagger, fadeIn, fadeInUp } from '../utils/animations'

function StatCard({ label, value, icon: Icon, color, bg }) {
  return (
    <motion.div variants={fadeInUp} className="card flex items-center gap-4 p-5">
      <div className={`p-3 rounded-xl ${bg} shadow-sm`}>
        <Icon size={20} className={color} />
      </div>
      <div>
        <p className="stat-value text-surface-800">{value}</p>
        <p className="text-sm text-surface-400 mt-0.5 font-medium">{label}</p>
      </div>
    </motion.div>
  )
}

function ConfidencePill({ score }) {
  if (score == null) return null
  const pct = typeof score === 'number' && score <= 1 ? Math.round(score * 100) : Math.round(score)
  const color = pct >= 80 ? 'bg-emerald-100 text-emerald-700'
              : pct >= 60 ? 'bg-amber-100 text-amber-700'
              : 'bg-red-100 text-red-700'
  return (
    <span className={`badge ${color}`}>
      <Sparkles size={11} />AI {pct}%
    </span>
  )
}

function ProfileRow({ label, value }) {
  if (!value) return null
  return (
    <motion.div variants={fadeIn} className="flex flex-col">
      <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-0.5">{label}</span>
      <span className="text-sm text-surface-800 font-medium truncate">{value}</span>
    </motion.div>
  )
}

function ExportButton({ profileId, fileName }) {
  const [busy, setBusy] = useState(null)
  const slug = (fileName || 'profile').replace(/\.[^.]+$/, '')

  async function handle(type) {
    if (!profileId) return
    setBusy(type)
    try {
      if (type === 'json') await exportProfileJson(profileId, slug)
      else await exportProfileXlsx(profileId, slug)
    } finally { setBusy(null) }
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => handle('json')} disabled={!!busy || !profileId}
        className="btn-secondary !px-3 !py-1.5 !text-xs">
        <FileJson size={13} />{busy === 'json' ? '…' : 'JSON'}
      </button>
      <button onClick={() => handle('excel')} disabled={!!busy || !profileId}
        className="!px-3 !py-1.5 !text-xs inline-flex items-center gap-1.5 font-semibold
                   border border-emerald-200 rounded-xl text-emerald-700 bg-emerald-50
                   hover:bg-emerald-100 hover:border-emerald-300 transition-colors duration-200 disabled:opacity-50">
        <Sheet size={13} />{busy === 'excel' ? '…' : 'Excel'}
      </button>
    </div>
  )
}

function ProfileCard({ file }) {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile-by-upload', file.id],
    queryFn: () => getProfileByUploadId(file.id),
    enabled: file.status === 'done',
  })

  const name = profile?.full_name || file.original_filename || 'Unnamed Profile'

  return (
    <motion.div variants={fadeInUp} className="card mb-4 overflow-hidden">
      <div className="h-0.5 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 -mx-6 -mt-6 mb-5" />

      <div className="flex items-start justify-between mb-4 pb-4 border-b border-surface-100">
        <motion.div variants={fadeIn}>
          <h2 className="text-base font-bold text-surface-800">{name}</h2>
          <div className="flex items-center gap-2 mt-1.5">
            {profile?.ai_confidence != null && <ConfidencePill score={profile.ai_confidence} />}
            {profile?.city && profile?.state && (
              <span className="text-xs text-surface-400">{profile.city}, {profile.state}</span>
            )}
          </div>
        </motion.div>
        <div className="flex items-center gap-3">
          <ExportButton profileId={profile?.id} fileName={file.original_filename} />
          <Link to="/files"
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-0.5 transition-colors">
            View full <ChevronRight size={12} />
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-surface-400 py-4">
          <Loader2 size={16} className="animate-spin" /> Loading profile data…
        </div>
      ) : profile ? (
        <motion.div variants={stagger} initial="initial" animate="animate">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
            <ProfileRow label="DOB"        value={profile.date_of_birth} />
            <ProfileRow label="Gender"     value={profile.gender} />
            <ProfileRow label="Religion"   value={profile.religion} />
            <ProfileRow label="Caste"      value={profile.caste} />
            <ProfileRow label="Tongue"     value={profile.mother_tongue} />
            <ProfileRow label="Height"     value={profile.height} />
            <ProfileRow label="Blood"      value={profile.blood_group} />
            <ProfileRow label="Mobile"     value={profile.mobile} />
            <ProfileRow label="Education"  value={profile.highest_education || profile.education} />
            <ProfileRow label="Occupation" value={profile.occupation} />
            <ProfileRow label="Income"     value={profile.annual_income} />
            <ProfileRow label="Rashi"      value={profile.rashi} />
            <ProfileRow label="Nakshatra"  value={profile.nakshatra} />
            <ProfileRow label="Gotra"      value={profile.gotra} />
          </div>
          {(profile.father_name || profile.mother_name || profile.siblings) && (
            <motion.div variants={fadeInUp} className="mt-4 pt-4 border-t border-surface-100 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
              <ProfileRow label="Father" value={profile.father_name} />
              <ProfileRow label="Mother" value={profile.mother_name} />
              <ProfileRow label="Siblings" value={profile.siblings} />
            </motion.div>
          )}
        </motion.div>
      ) : (
        <p className="text-sm text-surface-400 italic">No extracted data available.</p>
      )}
    </motion.div>
  )
}

export default function Dashboard() {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard'], queryFn: getDashboardStats,
  })
  const { data: filesData, isLoading: filesLoading } = useQuery({
    queryKey: ['files', 'dashboard'],
    queryFn: () => getFiles({ page: 1, pageSize: 20 }),
  })

  if (statsLoading) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1,2,3,4].map(i => <motion.div key={i} initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
        className="shimmer h-24 rounded-2xl" />)}
    </div>
  )

  const stats = [
    { label: 'Total Uploads',    value: statsData?.stats?.total_uploads ?? 0,    icon: Upload,      color: 'text-primary-600',  bg: 'bg-primary-50'   },
    { label: 'Processed',        value: statsData?.stats?.processed_uploads ?? 0, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50'  },
    { label: 'Profile Complete', value: statsData?.stats?.profile_complete ? 'Yes' : 'No', icon: User, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'AI Confidence',    value: statsData?.stats?.ai_confidence != null ? `${Math.round(statsData.stats.ai_confidence * 100)}%` : '—',
      icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
  ]

  const doneFiles = (filesData?.items ?? []).filter(f => f.status === 'done')

  return (
    <motion.div variants={stagger} initial="initial" animate="animate">
      <motion.div variants={fadeIn} className="mb-8">
        <h1 className="text-2xl font-bold text-surface-800 mb-1">
          Welcome back, {statsData?.user?.name?.split(' ')[0]}
        </h1>
        <p className="text-surface-400">Here's your myvivahai overview</p>
      </motion.div>

      <motion.div variants={fadeInUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s, i) => <StatCard key={s.label} {...s} />)}
      </motion.div>

      <motion.div variants={fadeInUp} className="flex items-center justify-between mb-4">
        <h2 className="section-heading">
          <FileText size={18} className="text-primary-500" />
          Recent Profiles
          {doneFiles.length > 0 && (
            <span className="text-sm font-normal text-surface-400">({doneFiles.length})</span>
          )}
        </h2>
        <Link to="/files" className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors">
          View all files <ChevronRight size={13} />
        </Link>
      </motion.div>

      {filesLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: i * 0.1 }} className="shimmer h-48 rounded-2xl" />)}
        </div>
      ) : doneFiles.length > 0 ? (
        <motion.div variants={stagger} initial="initial" animate="animate">
          {doneFiles.map((file) => <ProfileCard key={file.id} file={file} />)}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="card-glass flex items-center justify-between p-6"
        >
          <div>
            <h3 className="font-semibold text-surface-800">Get started — upload your biodata</h3>
            <p className="text-surface-400 text-sm mt-1">AI extracts your complete profile in seconds</p>
          </div>
          <Link to="/upload" className="btn-primary">Upload Now</Link>
        </motion.div>
      )}
    </motion.div>
  )
}

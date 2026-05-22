import { useQuery } from '@tanstack/react-query'
import { getDashboardStats } from '../services/analyticsService'
import { Upload, User, CheckCircle, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboardStats })
  if (isLoading) return <p className="text-gray-400">Loading...</p>

  const stats = [
    { label: 'Total Uploads',    value: data?.stats?.total_uploads ?? 0,     icon: Upload,       color: 'text-blue-600' },
    { label: 'Processed',         value: data?.stats?.processed_uploads ?? 0,  icon: CheckCircle,  color: 'text-green-600' },
    { label: 'Profile Complete',  value: data?.stats?.profile_complete ? 'Yes' : 'No', icon: User, color: 'text-purple-600' },
    { label: 'AI Confidence',     value: data?.stats?.ai_confidence != null
        ? `${Math.round(data.stats.ai_confidence * 100)}%` : '—',             icon: TrendingUp,   color: 'text-orange-600' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">
        Welcome back, {data?.user?.name?.split(' ')[0]} 👋
      </h1>
      <p className="text-gray-500 mb-8">Here's your myvivahai overview</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className={`p-3 rounded-lg bg-gray-50 ${color}`}><Icon size={22} /></div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{value}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {!data?.stats?.profile_complete && (
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

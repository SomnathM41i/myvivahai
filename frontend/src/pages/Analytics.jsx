import { useQuery } from '@tanstack/react-query'
import { getDashboardStats } from '../services/analyticsService'

export default function Analytics() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboardStats })
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Analytics</h1>
      <p className="text-gray-500 mb-6">Biodata processing insights</p>
      {isLoading ? <p className="text-gray-400">Loading…</p> : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            ['Total Uploads', data?.stats?.total_uploads],
            ['Processed', data?.stats?.processed_uploads],
            ['AI Confidence', data?.stats?.ai_confidence != null
              ? `${Math.round(data.stats.ai_confidence * 100)}%` : '—'],
          ].map(([label, value]) => (
            <div key={label} className="card text-center">
              <p className="text-3xl font-bold text-primary-600">{value ?? 0}</p>
              <p className="text-gray-500 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

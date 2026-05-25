import { useQuery } from '@tanstack/react-query'
import { getDashboardStats } from '../services/analyticsService'
import { motion } from 'framer-motion'
import { stagger, fadeInUp } from '../utils/animations'
import { TrendingUp, Upload, CheckCircle } from 'lucide-react'

const ICONS = { 'Total Uploads': Upload, 'Processed': CheckCircle, 'AI Confidence': TrendingUp }
const COLORS = { 'Total Uploads': 'text-primary-600 bg-primary-50', 'Processed': 'text-emerald-600 bg-emerald-50', 'AI Confidence': 'text-violet-600 bg-violet-50' }

export default function Analytics() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboardStats })
  return (
    <motion.div variants={stagger} initial="initial" animate="animate">
      <motion.h1 variants={fadeInUp} className="text-2xl font-bold text-surface-800 mb-1">Analytics</motion.h1>
      <motion.p variants={fadeInUp} className="text-surface-400 mb-8">Biodata processing insights</motion.p>
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1,2,3].map(i => <motion.div key={i} className="shimmer h-32 rounded-2xl" />)}
        </div>
      ) : (
        <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            ['Total Uploads', data?.stats?.total_uploads],
            ['Processed', data?.stats?.processed_uploads],
            ['AI Confidence', data?.stats?.ai_confidence != null ? `${Math.round(data.stats.ai_confidence * 100)}%` : '—'],
          ].map(([label, value]) => {
            const Icon = ICONS[label]
            const [color, bg] = (COLORS[label] || 'text-surface-600 bg-surface-50').split(' ')
            return (
              <motion.div key={label} variants={fadeInUp} className="card p-6">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                  <Icon size={20} className={color} />
                </div>
                <p className="stat-value text-surface-800">{value ?? 0}</p>
                <p className="text-sm text-surface-400 font-medium mt-1">{label}</p>
              </motion.div>
            )}
          )}
        </motion.div>
      )}
    </motion.div>
  )
}

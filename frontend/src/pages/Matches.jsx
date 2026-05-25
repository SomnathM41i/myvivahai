import { motion } from 'framer-motion'
import { fadeInUp } from '../utils/animations'
import { Heart } from 'lucide-react'

export default function Matches() {
  return (
    <motion.div variants={fadeInUp} initial="initial" animate="animate">
      <h1 className="text-2xl font-bold text-surface-800 mb-1">Matches</h1>
      <p className="text-surface-400 mb-6">Compatible profiles based on your preferences</p>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card-glass flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
          <Heart size={28} className="text-surface-300" />
        </div>
        <p className="text-surface-500 font-semibold">Matching engine coming soon</p>
        <p className="text-surface-400 text-sm mt-1">Upload your biodata first and we'll find compatible matches.</p>
      </motion.div>
    </motion.div>
  )
}

import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LayoutDashboard, Upload, LogOut, FolderOpen, Sparkles } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { pageTransition } from '../utils/animations'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/upload',    icon: Upload,          label: 'Upload Biodata' },
  { to: '/files',     icon: FolderOpen,      label: 'Files' },
]

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink to={to} className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 relative
       ${isActive ? 'text-white bg-gradient-to-r from-primary-500/20 to-primary-600/10 border border-primary-500/20' : 'text-surface-400 hover:text-surface-200 hover:bg-white/5'}`}>
      {({ isActive }) => (
        <>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200
            ${isActive ? 'bg-primary-500' : 'bg-white/5'}`}>
            <Icon size={16} className={isActive ? 'text-white' : 'text-surface-400'} />
          </div>
          <span>{label}</span>
        </>
      )}
    </NavLink>
  )
}

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="min-h-screen flex relative bg-surface-50">
      {/* Sidebar */}
      <aside className="w-64 bg-surface-900 border-r border-surface-800/50 flex flex-col shrink-0 relative z-10">
        <div className="p-6 border-b border-surface-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">myvivahai</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        <div className="p-4 border-t border-surface-800/50">
          {user && (
            <div className="flex items-center gap-3 mb-3 px-2">
              {user.profile_image ? (
                <img src={user.profile_image} alt={user.name}
                  className="w-9 h-9 rounded-xl object-cover ring-2 ring-surface-700" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold">
                  {user.name?.charAt(0) || '?'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-surface-200 truncate">{user.name}</p>
                <p className="text-xs text-surface-400 truncate">{user.email}</p>
              </div>
            </div>
          )}
          <button onClick={() => { logout(); navigate('/login') }}
            className="flex items-center gap-2 w-full px-2 py-2 text-sm text-surface-400 hover:text-red-400 rounded-xl hover:bg-red-500/5 transition-colors duration-200">
            <LogOut size={15} />Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto relative">
        <div className="max-w-6xl mx-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} {...pageTransition}>
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

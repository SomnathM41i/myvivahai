import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../app/store'
import { Sparkles } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || '/api'

export default function Login() {
  const navigate = useNavigate()
  const { token, setToken } = useAuthStore()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('access_token')
    if (t) { setToken(t); navigate('/dashboard', { replace: true }) }
    else if (token) navigate('/dashboard', { replace: true })
  }, [token, setToken, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="fixed top-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary-400/15 via-violet-300/10 to-transparent blur-3xl pointer-events-none" />
      <div className="fixed bottom-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-violet-400/15 via-fuchsia-300/10 to-transparent blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mx-auto mb-4">
            <Sparkles size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-surface-800">myvivahai</h1>
          <p className="text-surface-400 text-sm mt-1">AI-Powered Biodata Extraction</p>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-surface-100 p-8">
          <h2 className="text-base font-bold text-surface-800 mb-1">Sign in</h2>
          <p className="text-sm text-surface-400 mb-6">Upload your biodata and let AI extract your profile instantly.</p>

          <button onClick={() => { window.location.href = `${API}/auth/google` }}
            className="w-full flex items-center justify-center gap-3 border border-surface-200 rounded-xl py-3 px-4
                       hover:bg-surface-50 hover:border-surface-300 transition-colors duration-200 font-semibold text-surface-700 bg-white">
            <img src="https://www.google.com/favicon.ico" alt="" className="w-5 h-5" />
            Continue with Google
          </button>

          <p className="text-xs text-surface-400 text-center mt-4">No password — secure Google OAuth only</p>
        </div>
      </div>
    </div>
  )
}

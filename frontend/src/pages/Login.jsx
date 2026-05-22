import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../app/store'

const API = import.meta.env.VITE_API_URL || '/api'

export default function Login() {
  const navigate = useNavigate()
  const { token, setToken } = useAuthStore()

  useEffect(() => {
    // Handle token returned as query param after OAuth redirect
    const params = new URLSearchParams(window.location.search)
    const t = params.get('access_token')
    if (t) { setToken(t); navigate('/dashboard', { replace: true }) }
    else if (token) navigate('/dashboard', { replace: true })
  }, [])

  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-gray-800 mb-2">Sign in to myvivahai</h2>
      <p className="text-gray-500 text-sm mb-6">
        Upload your matrimonial biodata and let AI extract your complete profile instantly.
      </p>
      <button onClick={() => { window.location.href = `${API}/auth/google` }}
        className="w-full flex items-center justify-center gap-3 border border-gray-300
                   rounded-lg py-3 px-4 hover:bg-gray-50 transition-colors font-medium text-gray-700">
        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
        Continue with Google
      </button>
      <p className="text-xs text-gray-400 text-center mt-4">No password — Google OAuth only</p>
    </div>
  )
}

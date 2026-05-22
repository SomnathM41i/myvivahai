import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../app/store'
import api from '../services/apiClient'

export function useAuth() {
  const { user, setUser, logout, token } = useAuthStore()
  const { isLoading } = useQuery({
    queryKey: ['me'],
    enabled: !!token && !user,
    retry: false,
    queryFn: async () => {
      const { data } = await api.get('/auth/me')
      setUser(data)
      return data
    },
  })
  return { user, isLoading, logout }
}

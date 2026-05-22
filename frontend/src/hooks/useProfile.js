import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProfile, updateProfile } from '../services/profileService'

export function useProfile() {
  const qc = useQueryClient()
  const profile = useQuery({ queryKey: ['profile'], queryFn: getProfile, retry: false })
  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  })
  return {
    profile: profile.data,
    isLoading: profile.isLoading,
    update: mutation.mutate,
    isUpdating: mutation.isPending,
  }
}

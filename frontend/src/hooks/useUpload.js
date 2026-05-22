import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { uploadBiodata, getUploads } from '../services/uploadService'

export function useUpload() {
  const [progress, setProgress] = useState(0)
  const qc = useQueryClient()
  const uploads = useQuery({ queryKey: ['uploads'], queryFn: getUploads })
  const mutation = useMutation({
    mutationFn: (file) => uploadBiodata(file, setProgress),
    onSuccess: () => { setProgress(0); qc.invalidateQueries({ queryKey: ['uploads'] }) },
  })
  return {
    uploads: uploads.data || [],
    isLoading: uploads.isLoading,
    upload: mutation.mutate,
    isUploading: mutation.isPending,
    progress,
    error: mutation.error,
  }
}

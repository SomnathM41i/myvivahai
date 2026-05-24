/**
 * src/hooks/useFiles.js
 * Manages file list state: fetching, pagination, search, filtering,
 * delete, reprocess. Clean API for the FilesPage component.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { getFiles, deleteFile, reprocessFile } from '../services/fileService'

const DEFAULT_PAGE_SIZE = 20

export function useFiles() {
  const [items, setItems]           = useState([])
  const [total, setTotal]           = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage]             = useState(1)
  const [search, setSearch]         = useState('')
  const [status, setStatus]         = useState('')
  const [fileType, setFileType]     = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)

  // Debounce search input
  const searchTimer = useRef(null)

  const fetchFiles = useCallback(
    async (opts = {}) => {
      setLoading(true)
      setError(null)
      try {
        const result = await getFiles({
          page:     opts.page     ?? page,
          pageSize: DEFAULT_PAGE_SIZE,
          search:   opts.search   !== undefined ? opts.search   : search,
          status:   opts.status   !== undefined ? opts.status   : status,
          fileType: opts.fileType !== undefined ? opts.fileType : fileType,
        })
        setItems(result.items)
        setTotal(result.total)
        setTotalPages(result.total_pages)
        setPage(result.page)
      } catch (err) {
        setError(err?.response?.data?.detail || 'Failed to load files')
      } finally {
        setLoading(false)
      }
    },
    [page, search, status, fileType]
  )

  // Initial load + refresh when filters change
  useEffect(() => {
    fetchFiles({ page: 1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, fileType])

  // Debounced search
  const handleSearch = useCallback(
    (value) => {
      setSearch(value)
      clearTimeout(searchTimer.current)
      searchTimer.current = setTimeout(() => {
        setPage(1)
        fetchFiles({ page: 1, search: value })
      }, 300)
    },
    [fetchFiles]
  )

  const goToPage = useCallback(
    (p) => {
      setPage(p)
      fetchFiles({ page: p })
    },
    [fetchFiles]
  )

  const handleDelete = useCallback(
    async (fileId) => {
      await deleteFile(fileId)
      // Optimistic remove, then refresh
      setItems((prev) => prev.filter((f) => f.id !== fileId))
      setTotal((t) => t - 1)
    },
    []
  )

  const handleReprocess = useCallback(
    async (fileId) => {
      const updated = await reprocessFile(fileId)
      setItems((prev) => prev.map((f) => (f.id === fileId ? updated : f)))
    },
    []
  )

  const refresh = useCallback(() => fetchFiles(), [fetchFiles])

  return {
    items,
    total,
    totalPages,
    page,
    search,
    status,
    fileType,
    loading,
    error,
    setStatus,
    setFileType,
    handleSearch,
    goToPage,
    handleDelete,
    handleReprocess,
    refresh,
  }
}

import api from './apiClient'
export const getProfile = async () => (await api.get('/profile/')).data
export const updateProfile = async (updates) => (await api.patch('/profile/', updates)).data

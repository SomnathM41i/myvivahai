import api from './apiClient'
export const getDashboardStats = async () => (await api.get('/dashboard/stats')).data

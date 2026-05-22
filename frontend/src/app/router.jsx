import { createBrowserRouter, Navigate } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout'
import AuthLayout from '../layouts/AuthLayout'
import Login from '../pages/Login'
import Dashboard from '../pages/Dashboard'
import UploadBiodata from '../pages/UploadBiodata'
import ProfilePreview from '../pages/ProfilePreview'
import EditProfile from '../pages/EditProfile'
import Matches from '../pages/Matches'
import Analytics from '../pages/Analytics'

const Guard = ({ children }) =>
  localStorage.getItem('access_token') ? children : <Navigate to="/login" replace />

export const router = createBrowserRouter([
  { path: '/login', element: <AuthLayout><Login /></AuthLayout> },
  {
    path: '/',
    element: <Guard><DashboardLayout /></Guard>,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'upload', element: <UploadBiodata /> },
      { path: 'profile', element: <ProfilePreview /> },
      { path: 'profile/edit', element: <EditProfile /> },
      { path: 'matches', element: <Matches /> },
      { path: 'analytics', element: <Analytics /> },
    ],
  },
])

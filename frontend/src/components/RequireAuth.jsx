import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Spinner } from './ui'

export default function RequireAuth({ role, children }) {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) return <Spinner />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return children
}

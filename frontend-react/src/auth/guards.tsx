import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './auth-context'

export function RequireAuth() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

export function PublicOnly() {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return <Navigate to="/requirements" replace />
  return <Outlet />
}

export function RequireAdmin() {
  const { isSuperuser } = useAuth()
  if (!isSuperuser) return <Navigate to="/requirements" replace />
  return <Outlet />
}

export function RequireFunctionsAccess() {
  const { canAccessFunctionsDirectory } = useAuth()
  if (!canAccessFunctionsDirectory) return <Navigate to="/requirements" replace />
  return <Outlet />
}

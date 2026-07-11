import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { Spinner } from './common'

export default function ProtectedRoute({
  children,
  role,
}: {
  children: ReactNode
  role?: 'business_owner' | 'professional'
}) {
  const { profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Spinner label="Cargando…" />
  if (!profile) return <Navigate to="/login" state={{ from: location.pathname }} replace />

  // Si un profesional intenta entrar a rutas de dueño (o viceversa) lo redirige a su home.
  if (role && profile.role !== role && profile.role !== 'admin') {
    return <Navigate to={profile.role === 'professional' ? '/pro/perfil' : '/app'} replace />
  }
  return <>{children}</>
}

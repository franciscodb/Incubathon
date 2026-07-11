import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Profile } from '../lib/types'
import * as db from '../lib/db'
import { getBackendMode } from '../lib/api'

type BackendMode = 'mock' | 'live' | 'unknown'

interface AuthState {
  profile: Profile | null
  loading: boolean
  backendMode: BackendMode
  register: (input: db.AuthInput) => Promise<Profile>
  login: (input: db.AuthInput) => Promise<Profile>
  loginDemo: () => Promise<Profile>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [backendMode, setBackendMode] = useState<BackendMode>('unknown')

  const refresh = useCallback(async () => {
    const p = await db.getCurrentProfile()
    setProfile(p)
  }, [])

  useEffect(() => {
    let mounted = true
    // Restaura la sesión (si hay token guardado) y detecta el modo del backend.
    db.getCurrentProfile()
      .then((p) => mounted && setProfile(p))
      .finally(() => mounted && setLoading(false))
    getBackendMode().then((m) => mounted && setBackendMode(m))
    return () => {
      mounted = false
    }
  }, [])

  const register = useCallback(async (input: db.AuthInput) => {
    const p = await db.register(input)
    setProfile(p)
    return p
  }, [])

  const login = useCallback(async (input: db.AuthInput) => {
    const p = await db.login(input)
    setProfile(p)
    return p
  }, [])

  const loginDemo = useCallback(async () => {
    const p = await db.loginDemo()
    setProfile(p)
    return p
  }, [])

  const logout = useCallback(async () => {
    await db.logout()
    setProfile(null)
  }, [])

  const value = useMemo(
    () => ({ profile, loading, backendMode, register, login, loginDemo, logout, refresh }),
    [profile, loading, backendMode, register, login, loginDemo, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { LoginResponse, UserProfile } from '@/types'

type AuthContextValue = {
  token: string
  profile: UserProfile | null
  isAuthenticated: boolean
  fullName: string
  organization: string
  isSuperuser: boolean
  canEditGKContract: boolean
  canEditGKStages: boolean
  canEditGKFunctions: boolean
  canDeleteRequirements: boolean
  canAccessFunctionsDirectory: boolean
  setAuth: (payload: LoginResponse) => void
  setProfile: (value: UserProfile) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredProfile(): UserProfile | null {
  const raw = localStorage.getItem('profile')
  if (!raw) return null
  try {
    return JSON.parse(raw) as UserProfile
  } catch {
    localStorage.removeItem('profile')
    return null
  }
}

function normalizeOrg(value: string) {
  return (value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]/gi, '')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem('accessToken') || '')
  const [profile, setProfileState] = useState<UserProfile | null>(readStoredProfile)

  useEffect(() => {
    const handleLogout = () => {
      setToken('')
      setProfileState(null)
    }
    window.addEventListener('auth:logout', handleLogout)
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const accessLevel = profile?.accessLevel || 'read'
    const isSuperuser = Boolean(profile?.isSuperuser)
    const orgNormalized = normalizeOrg(profile?.organization || '')
    const isTantos = orgNormalized.includes('тантос')
    return {
      token,
      profile,
      isAuthenticated: Boolean(token),
      fullName: profile?.fullName || '',
      organization: String(profile?.organization || ''),
      isSuperuser,
      canEditGKContract:
        isSuperuser || (accessLevel === 'edit' && Boolean(profile?.gkDirectoryGrants?.gkContractEdit)),
      canEditGKStages:
        isSuperuser || (accessLevel === 'edit' && Boolean(profile?.gkDirectoryGrants?.gkStageEdit)),
      canEditGKFunctions:
        isSuperuser || (accessLevel === 'edit' && Boolean(profile?.gkDirectoryGrants?.gkFunctionEdit)),
      canDeleteRequirements:
        isSuperuser || (accessLevel === 'edit' && Boolean(profile?.requirementFieldGrants?.deleteRequirement)),
      canAccessFunctionsDirectory: isTantos,
      setAuth: (payload) => {
        setToken(payload.accessToken)
        setProfileState(payload.profile)
        localStorage.setItem('accessToken', payload.accessToken)
        localStorage.setItem('profile', JSON.stringify(payload.profile))
      },
      setProfile: (nextProfile) => {
        setProfileState(nextProfile)
        localStorage.setItem('profile', JSON.stringify(nextProfile))
      },
      logout: () => {
        setToken('')
        setProfileState(null)
        localStorage.removeItem('accessToken')
        localStorage.removeItem('profile')
      },
    }
  }, [profile, token])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}

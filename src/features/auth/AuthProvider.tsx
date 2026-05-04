import { googleLogout } from '@react-oauth/google'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { decodeIdToken, isExpired } from './decodeIdToken'
import type { AuthUser } from './types'

type AuthContextValue = {
  /** True when no Google client ID was configured at build time. */
  configured: boolean
  user: AuthUser | null
  idToken: string | null
  /** Apply a credential JWT received from a Google sign-in callback. */
  setCredential: (token: string) => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'expense-splitter:idToken'

function readStoredToken(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStoredToken(token: string | null) {
  try {
    if (token === null) sessionStorage.removeItem(STORAGE_KEY)
    else sessionStorage.setItem(STORAGE_KEY, token)
  } catch {
    /* sessionStorage may be unavailable (Safari private mode, etc.) */
  }
}

type AuthProviderProps = {
  children: ReactNode
  /**
   * If false, the provider exposes a no-op context where `configured` is
   * false. The UI should hide auth-gated features in that case.
   */
  configured: boolean
}

export function AuthProvider({ children, configured }: AuthProviderProps) {
  const [idToken, setIdToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = readStoredToken()
    if (!stored) return null
    const decoded = decodeIdToken(stored)
    if (!decoded || isExpired(decoded)) {
      writeStoredToken(null)
      return null
    }
    return stored
  })
  const [user, setUser] = useState<AuthUser | null>(() =>
    idToken ? decodeIdToken(idToken) : null,
  )

  const setCredential = useCallback((token: string) => {
    const decoded = decodeIdToken(token)
    if (!decoded) return
    writeStoredToken(token)
    setIdToken(token)
    setUser(decoded)
  }, [])

  const signOut = useCallback(() => {
    googleLogout()
    writeStoredToken(null)
    setIdToken(null)
    setUser(null)
  }, [])

  // Auto-sign-out when the token expires while the tab is open. Always
  // schedule via setTimeout so we never call setState synchronously inside
  // the effect body.
  useEffect(() => {
    if (!user) return
    const msUntilExpiry = Math.max(0, user.exp * 1000 - Date.now())
    const t = setTimeout(signOut, msUntilExpiry)
    return () => clearTimeout(t)
  }, [user, signOut])

  const value = useMemo<AuthContextValue>(
    () => ({ configured, user, idToken, setCredential, signOut }),
    [configured, user, idToken, setCredential, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

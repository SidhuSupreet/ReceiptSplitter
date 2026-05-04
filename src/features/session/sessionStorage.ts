import type { Session } from './types'

const STORAGE_KEY = 'expense-splitter:session:v1'

export function readSession(): Session | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Session
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.people)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function writeSession(session: Session): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Quota or serialization error — silently drop; in-memory state is still authoritative.
  }
}

export function clearStoredSession(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore.
  }
}

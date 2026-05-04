import type { AuthUser } from './types'

type Claims = {
  email?: unknown
  name?: unknown
  picture?: unknown
  exp?: unknown
}

/**
 * Decode (without verifying) a Google ID token to extract claims for display.
 *
 * The Worker is responsible for verifying the token's signature against
 * Google's JWKS — never trust this output for authorization decisions.
 */
export function decodeIdToken(token: string): AuthUser | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
    const json = atob(padded)
    const claims = JSON.parse(json) as Claims

    if (typeof claims.email !== 'string' || typeof claims.exp !== 'number') {
      return null
    }
    return {
      email: claims.email,
      name: typeof claims.name === 'string' ? claims.name : undefined,
      picture: typeof claims.picture === 'string' ? claims.picture : undefined,
      exp: claims.exp,
    }
  } catch {
    return null
  }
}

/** True when the token's exp claim is at or before the current time. */
export function isExpired(user: AuthUser, nowSeconds = Date.now() / 1000): boolean {
  return user.exp <= nowSeconds
}

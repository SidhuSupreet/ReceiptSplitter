import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs'
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com']

// Module-scoped JWKS cache. Cloudflare Workers reuse module instances across
// invocations within the same isolate, so this avoids re-fetching JWKS on
// every request.
const jwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL))

export type VerifiedUser = {
  email: string
  emailVerified: boolean
  name?: string
  sub: string
}

export class AuthError extends Error {
  constructor(
    public readonly code: 'missing' | 'invalid' | 'forbidden',
    message: string,
  ) {
    super(message)
  }
}

/**
 * Parse `Authorization: Bearer <jwt>` from headers. Throws AuthError('missing')
 * when no bearer token is present.
 */
export function extractBearer(headers: Headers): string {
  const raw = headers.get('authorization') ?? headers.get('Authorization')
  if (!raw) throw new AuthError('missing', 'Missing Authorization header')
  const match = /^Bearer\s+(.+)$/i.exec(raw.trim())
  if (!match)
    throw new AuthError('missing', 'Authorization header must use Bearer scheme')
  return match[1]
}

/**
 * Verify a Google ID token's signature, issuer, audience, and expiry.
 *
 * Returns the verified user identity. Throws AuthError on any failure.
 */
export async function verifyGoogleIdToken(
  token: string,
  audience: string,
): Promise<VerifiedUser> {
  let payload: JWTPayload
  try {
    const verified = await jwtVerify(token, jwks, {
      issuer: GOOGLE_ISSUERS,
      audience,
    })
    payload = verified.payload
  } catch (err) {
    const message = err instanceof Error ? err.message : 'verification failed'
    throw new AuthError('invalid', message)
  }

  const email = typeof payload.email === 'string' ? payload.email : null
  if (!email) {
    throw new AuthError('invalid', 'Token has no email claim')
  }
  return {
    email: email.toLowerCase(),
    emailVerified: payload.email_verified === true,
    name: typeof payload.name === 'string' ? payload.name : undefined,
    sub: payload.sub ?? '',
  }
}

/**
 * Enforce that the verified user's email is in the comma-separated allowlist.
 *
 * If the allowlist is empty or unset, the Worker is treated as deny-all. We
 * fail closed to make misconfiguration obvious.
 */
export function assertEmailAllowed(user: VerifiedUser, allowedEmailsRaw: string): void {
  if (!user.emailVerified) {
    throw new AuthError('forbidden', 'Google account email is not verified')
  }
  const allowed = allowedEmailsRaw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (allowed.length === 0) {
    throw new AuthError('forbidden', 'No allowlist configured')
  }
  if (!allowed.includes(user.email)) {
    throw new AuthError('forbidden', 'Email is not on the allowlist')
  }
}

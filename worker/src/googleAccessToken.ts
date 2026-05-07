import { importPKCS8, SignJWT } from 'jose'

type ServiceAccountJson = {
  client_email: string
  private_key: string
}

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets'

let cached: { token: string; expiresAtMs: number } | null = null
const SKEW_MS = 60_000

export function parseServiceAccountJson(raw: string): ServiceAccountJson {
  const parsed = JSON.parse(raw) as unknown
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid service account JSON')
  const o = parsed as Record<string, unknown>
  const client_email = o.client_email
  const private_key = o.private_key
  if (typeof client_email !== 'string' || typeof private_key !== 'string') {
    throw new Error('Service account JSON missing client_email or private_key')
  }
  return { client_email, private_key }
}

/**
 * Returns a valid Google OAuth access token for Sheets API, using a JWT bearer grant.
 * Tokens are cached briefly in-module across Worker invocations in the same isolate.
 */
export async function getSheetsAccessToken(serviceAccountJsonRaw: string): Promise<string> {
  const now = Date.now()
  if (cached && cached.expiresAtMs > now + SKEW_MS) return cached.token

  const sa = parseServiceAccountJson(serviceAccountJsonRaw)
  const pem = sa.private_key.replace(/\\n/g, '\n')
  const key = await importPKCS8(pem, 'RS256')
  const assertion = await new SignJWT({ scope: SHEETS_SCOPE })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('45m')
    .setIssuer(sa.client_email)
    .setAudience(TOKEN_URL)
    .setSubject(sa.client_email)
    .sign(key)

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  })

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google token exchange failed: ${res.status} ${text}`)
  }

  const json = (await res.json()) as {
    access_token?: string
    expires_in?: number
  }
  if (typeof json.access_token !== 'string') {
    throw new Error('Google token response missing access_token')
  }
  const expiresInSec = typeof json.expires_in === 'number' ? json.expires_in : 3600
  cached = {
    token: json.access_token,
    expiresAtMs: now + expiresInSec * 1000,
  }
  return json.access_token
}

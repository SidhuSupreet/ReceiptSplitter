import { parseWithClaude } from './anthropic'
import { assertEmailAllowed, AuthError, extractBearer, verifyGoogleIdToken } from './auth'

export interface Env {
  /** Anthropic API key. Set via `wrangler secret put ANTHROPIC_API_KEY`. */
  ANTHROPIC_API_KEY: string
  /** Google OAuth Web Client ID, used for `aud` JWT verification. */
  GOOGLE_CLIENT_ID: string
  /** Comma-separated emails permitted to use OCR. */
  ALLOWED_EMAILS: string
  /** Comma-separated origins permitted to call this Worker (CORS). */
  ALLOWED_ORIGINS: string
}

type OcrRequestBody = { text?: unknown }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const cors = corsHeaders(request, env.ALLOWED_ORIGINS)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    if (url.pathname !== '/ocr' && url.pathname !== '/') {
      return json({ error: 'not found' }, 404, cors)
    }

    if (request.method !== 'POST') {
      return json({ error: 'method not allowed' }, 405, cors)
    }

    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: 'ANTHROPIC_API_KEY is not set' }, 503, cors)
    }
    if (!env.GOOGLE_CLIENT_ID) {
      return json({ error: 'GOOGLE_CLIENT_ID is not set' }, 503, cors)
    }

    let token: string
    try {
      token = extractBearer(request.headers)
    } catch (err) {
      return authErrorResponse(err, cors)
    }

    let user
    try {
      user = await verifyGoogleIdToken(token, env.GOOGLE_CLIENT_ID)
      assertEmailAllowed(user, env.ALLOWED_EMAILS ?? '')
    } catch (err) {
      return authErrorResponse(err, cors)
    }

    let body: OcrRequestBody
    try {
      body = (await request.json()) as OcrRequestBody
    } catch {
      return json({ error: 'invalid JSON body' }, 400, cors)
    }

    if (typeof body.text !== 'string') {
      return json({ error: '`text` must be a string' }, 400, cors)
    }

    try {
      const result = await parseWithClaude(body.text, env.ANTHROPIC_API_KEY)
      return json(result, 200, cors)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'parse failed'
      return json({ error: message }, 502, cors)
    }
  },
} satisfies ExportedHandler<Env>

function corsHeaders(request: Request, allowedOriginsRaw: string): Headers {
  const headers = new Headers({
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  })
  const origin = request.headers.get('origin')
  const allowed = (allowedOriginsRaw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (origin && allowed.includes(origin)) {
    headers.set('access-control-allow-origin', origin)
  }
  return headers
}

function json(payload: unknown, status: number, cors: Headers): Response {
  const headers = new Headers(cors)
  headers.set('content-type', 'application/json')
  return new Response(JSON.stringify(payload), { status, headers })
}

function authErrorResponse(err: unknown, cors: Headers): Response {
  if (err instanceof AuthError) {
    const status = err.code === 'forbidden' ? 403 : 401
    return json({ error: err.message }, status, cors)
  }
  const message = err instanceof Error ? err.message : 'auth failed'
  return json({ error: message }, 401, cors)
}

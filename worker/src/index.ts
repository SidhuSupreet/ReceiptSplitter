import { parseWithClaude } from './anthropic'
import {
  assertEmailAllowed,
  AuthError,
  extractBearer,
  extractBearerOptional,
  verifyGoogleIdToken,
} from './auth'
import {
  newShareId,
  normalizeIncomingSession,
  PayloadTooLargeError,
  SplitNotFoundError,
  SplitsStore,
  SplitUpdateForbiddenError,
} from './splitsStore'

export interface Env {
  /** Anthropic API key. Set via `wrangler secret put ANTHROPIC_API_KEY`. */
  ANTHROPIC_API_KEY: string
  /** Google OAuth Web Client ID, used for `aud` JWT verification. */
  GOOGLE_CLIENT_ID: string
  /** Comma-separated emails permitted to use OCR and to publish splits. */
  ALLOWED_EMAILS: string
  /** Comma-separated origins permitted to call this Worker (CORS). */
  ALLOWED_ORIGINS: string
  /** Google Spreadsheet ID (from the sheet URL). Empty disables split storage. */
  SPLITS_SPREADSHEET_ID: string
  /** Worksheet tab name (row 1 should be headers: shareId, ownerSub, ownerEmail, createdAt, payload). */
  SPLITS_TAB_NAME: string
  /**
   * Full JSON key for a service account with Editor access to the spreadsheet.
   * Set via `wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON`.
   */
  GOOGLE_SERVICE_ACCOUNT_JSON?: string
}

type OcrRequestBody = { text?: unknown }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname.replace(/\/$/, '') || '/'
    const cors = corsHeaders(request, env.ALLOWED_ORIGINS)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    if (path === '/ocr' || path === '/') {
      return handleOcr(request, env, cors)
    }

    if (path === '/splits' && request.method === 'POST') {
      return handleCreateSplit(request, env, cors)
    }

    if (path === '/me/splits' && request.method === 'GET') {
      return handleListSplits(request, env, cors)
    }

    if (path.startsWith('/splits/')) {
      const shareId = decodeURIComponent(path.slice('/splits/'.length))
      if (shareId && request.method === 'GET') {
        return handleGetSplit(request, shareId, env, cors)
      }
      if (shareId && request.method === 'PUT') {
        return handleUpdateSplit(request, shareId, env, cors)
      }
    }

    return json({ error: 'not found' }, 404, cors)
  },
} satisfies ExportedHandler<Env>

async function handleOcr(request: Request, env: Env, cors: Headers): Promise<Response> {
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

  try {
    const user = await verifyGoogleIdToken(token, env.GOOGLE_CLIENT_ID)
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
}

function splitsConfigured(env: Env): boolean {
  return splitStorageMisconfiguration(env) === null
}

/** If split storage cannot run, returns a human-readable reason for 503 responses. */
function splitStorageMisconfiguration(env: Env): string | null {
  if (!(env.SPLITS_SPREADSHEET_ID ?? '').trim()) {
    return 'SPLITS_SPREADSHEET_ID is empty (set in wrangler.toml [vars], Cloudflare Worker Settings → Variables, or deploy with --var).'
  }
  if (!(env.GOOGLE_SERVICE_ACCOUNT_JSON ?? '').trim()) {
    return 'GOOGLE_SERVICE_ACCOUNT_JSON is missing (wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON, or add to CI secrets).'
  }
  return null
}

function jsonSplitStorageMisconfigured(env: Env, cors: Headers): Response {
  const detail = splitStorageMisconfiguration(env) ?? 'unknown'
  return json({ error: 'Split storage is not configured', detail }, 503, cors)
}

function splitsStore(env: Env): SplitsStore {
  const id = (env.SPLITS_SPREADSHEET_ID ?? '').trim()
  const tab = (env.SPLITS_TAB_NAME ?? '').trim() || 'splits'
  const sa = (env.GOOGLE_SERVICE_ACCOUNT_JSON ?? '').trim()
  return new SplitsStore(id, tab, sa)
}

async function handleCreateSplit(
  request: Request,
  env: Env,
  cors: Headers,
): Promise<Response> {
  if (!splitsConfigured(env)) {
    return jsonSplitStorageMisconfigured(env, cors)
  }

  const token = extractBearerOptional(request.headers)
  let ownerSub = ''
  let ownerEmail = 'Anonymous'

  if (token) {
    if (!env.GOOGLE_CLIENT_ID) {
      return json({ error: 'GOOGLE_CLIENT_ID is not set' }, 503, cors)
    }
    let user
    try {
      user = await verifyGoogleIdToken(token, env.GOOGLE_CLIENT_ID)
      assertEmailAllowed(user, env.ALLOWED_EMAILS ?? '')
    } catch (err) {
      return authErrorResponse(err, cors)
    }
    if (!user.sub) {
      return json({ error: 'Invalid token: missing subject' }, 401, cors)
    }
    ownerSub = user.sub
    ownerEmail = user.email
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid JSON body' }, 400, cors)
  }

  const session = normalizeIncomingSession(body)
  if (!session) {
    return json({ error: 'Body must be a valid session object' }, 400, cors)
  }

  const store = splitsStore(env)
  const shareId = newShareId()

  try {
    await store.appendSplit(shareId, ownerSub, ownerEmail, session)
  } catch (err) {
    if (err instanceof PayloadTooLargeError) {
      return json({ error: err.message }, 413, cors)
    }
    const message = err instanceof Error ? err.message : 'save failed'
    return json({ error: message }, 502, cors)
  }

  return json({ shareId }, 201, cors)
}

async function handleGetSplit(
  request: Request,
  shareId: string,
  env: Env,
  cors: Headers,
): Promise<Response> {
  if (!splitsConfigured(env)) {
    return jsonSplitStorageMisconfigured(env, cors)
  }

  let data: Awaited<ReturnType<SplitsStore['getShareData']>>
  try {
    data = await splitsStore(env).getShareData(shareId)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'load failed'
    return json({ error: message }, 502, cors)
  }

  if (!data) {
    return json({ error: 'Not found' }, 404, cors)
  }

  let isOwner = false
  const optional = extractBearerOptional(request.headers)
  if (optional) {
    if (!env.GOOGLE_CLIENT_ID) {
      return json({ error: 'GOOGLE_CLIENT_ID is not set' }, 503, cors)
    }
    try {
      const user = await verifyGoogleIdToken(optional, env.GOOGLE_CLIENT_ID)
      if (user.sub && data.ownerSub && user.sub === data.ownerSub) {
        isOwner = true
      }
    } catch (err) {
      return authErrorResponse(err, cors)
    }
  }

  return json({ session: data.session, isOwner }, 200, cors)
}

async function handleUpdateSplit(
  request: Request,
  shareId: string,
  env: Env,
  cors: Headers,
): Promise<Response> {
  if (!splitsConfigured(env)) {
    return jsonSplitStorageMisconfigured(env, cors)
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

  if (!user.sub) {
    return json({ error: 'Invalid token: missing subject' }, 401, cors)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid JSON body' }, 400, cors)
  }

  const session = normalizeIncomingSession(body)
  if (!session) {
    return json({ error: 'Body must be a valid session object' }, 400, cors)
  }

  try {
    await splitsStore(env).updateSplitPayload(shareId, user.sub, session)
  } catch (err) {
    if (err instanceof PayloadTooLargeError) {
      return json({ error: err.message }, 413, cors)
    }
    if (err instanceof SplitNotFoundError) {
      return json({ error: 'Not found' }, 404, cors)
    }
    if (err instanceof SplitUpdateForbiddenError) {
      return json({ error: err.message }, 403, cors)
    }
    const message = err instanceof Error ? err.message : 'update failed'
    return json({ error: message }, 502, cors)
  }

  return json({ ok: true }, 200, cors)
}

async function handleListSplits(
  request: Request,
  env: Env,
  cors: Headers,
): Promise<Response> {
  if (!splitsConfigured(env)) {
    return jsonSplitStorageMisconfigured(env, cors)
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

  if (!user.sub) {
    return json({ error: 'Invalid token: missing subject' }, 401, cors)
  }

  try {
    const splits = await splitsStore(env).listMetaForOwner(user.sub)
    return json({ splits }, 200, cors)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'list failed'
    return json({ error: message }, 502, cors)
  }
}

function corsHeaders(request: Request, allowedOriginsRaw: string): Headers {
  const headers = new Headers({
    'access-control-allow-methods': 'GET, POST, PUT, OPTIONS',
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

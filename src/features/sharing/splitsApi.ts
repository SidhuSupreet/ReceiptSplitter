import type { Session } from '@/features/session/types'

import { sessionForWire } from './shareEncoding'

const DEFAULT_OCR = 'http://localhost:8787/ocr'

/** Origin of the Cloudflare Worker (same host as `VITE_OCR_ENDPOINT`). */
export function getWorkerOrigin(): string {
  const ep = import.meta.env.VITE_OCR_ENDPOINT ?? DEFAULT_OCR
  return ep.replace(/\/ocr\/?$/i, '').replace(/\/$/, '')
}

export type SavedSplitMeta = {
  shareId: string
  createdAt: string
}

export type PublishSplitResult =
  | { ok: true; shareId: string }
  | { ok: false; error: string }

/** Parse Worker JSON error body; includes `detail` when present (e.g. split storage 503). */
function errorMessageFromResponseJson(json: unknown, fallback: string): string {
  if (!json || typeof json !== 'object') return fallback
  const o = json as { error?: unknown; detail?: unknown }
  const err = typeof o.error === 'string' ? o.error : fallback
  const det = typeof o.detail === 'string' ? o.detail : ''
  return det ? `${err} — ${det}` : err
}

export async function publishSplit(
  session: Session,
  idToken: string,
): Promise<PublishSplitResult> {
  const base = getWorkerOrigin()
  let response: Response
  try {
    response = await fetch(`${base}/splits`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(sessionForWire(session)),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error'
    return { ok: false, error: message }
  }

  if (response.ok) {
    const json = (await response.json()) as { shareId?: string }
    if (typeof json.shareId !== 'string' || !json.shareId) {
      return { ok: false, error: 'Unexpected response from server' }
    }
    return { ok: true, shareId: json.shareId }
  }

  let message = `Server returned ${response.status}`
  try {
    const body = (await response.json()) as unknown
    message = errorMessageFromResponseJson(body, message)
  } catch {
    /* ignore */
  }
  return { ok: false, error: message }
}

export type FetchSharedSplitResult =
  | { ok: true; session: Session }
  | { ok: false; error: string }

export async function fetchSharedSession(shareId: string): Promise<FetchSharedSplitResult> {
  const base = getWorkerOrigin()
  let response: Response
  try {
    response = await fetch(`${base}/splits/${encodeURIComponent(shareId)}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error'
    return { ok: false, error: message }
  }

  if (response.ok) {
    const json = (await response.json()) as { session?: Session }
    if (!json.session || typeof json.session !== 'object') {
      return { ok: false, error: 'Unexpected response from server' }
    }
    return { ok: true, session: json.session as Session }
  }

  if (response.status === 404) {
    return { ok: false, error: 'This share link is invalid or expired.' }
  }

  let message = `Server returned ${response.status}`
  try {
    const body = (await response.json()) as unknown
    message = errorMessageFromResponseJson(body, message)
  } catch {
    /* ignore */
  }
  return { ok: false, error: message }
}

export type ListSplitsResult =
  | { ok: true; splits: SavedSplitMeta[] }
  | { ok: false; error: string }

export async function listMySplits(idToken: string): Promise<ListSplitsResult> {
  const base = getWorkerOrigin()
  let response: Response
  try {
    response = await fetch(`${base}/me/splits`, {
      headers: { authorization: `Bearer ${idToken}` },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error'
    return { ok: false, error: message }
  }

  if (response.ok) {
    const json = (await response.json()) as { splits?: SavedSplitMeta[] }
    const splits = Array.isArray(json.splits) ? json.splits : []
    return { ok: true, splits }
  }

  let message = `Server returned ${response.status}`
  try {
    const body = (await response.json()) as unknown
    message = errorMessageFromResponseJson(body, message)
  } catch {
    /* ignore */
  }
  return { ok: false, error: message }
}

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

export type CloudSplitMutationResult =
  | { ok: true; shareId: string }
  | { ok: false; error: string }

export type CloudSplitUpdateResult = { ok: true } | { ok: false; error: string }

/** Parse Worker JSON error body; includes `detail` when present (e.g. split storage 503). */
function errorMessageFromResponseJson(json: unknown, fallback: string): string {
  if (!json || typeof json !== 'object') return fallback
  const o = json as { error?: unknown; detail?: unknown }
  const err = typeof o.error === 'string' ? o.error : fallback
  const det = typeof o.detail === 'string' ? o.detail : ''
  return det ? `${err} — ${det}` : err
}

/** Create a new cloud-backed split (optional auth: signed-in rows are owned; guests are anonymous). */
export async function createCloudSplit(
  session: Session,
  idToken: string | null,
): Promise<CloudSplitMutationResult> {
  const base = getWorkerOrigin()
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (idToken) headers.authorization = `Bearer ${idToken}`

  let response: Response
  try {
    response = await fetch(`${base}/splits`, {
      method: 'POST',
      headers,
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

/** Update payload for an existing owned split. */
export async function updateCloudSplit(
  shareId: string,
  session: Session,
  idToken: string,
): Promise<CloudSplitUpdateResult> {
  const base = getWorkerOrigin()
  let response: Response
  try {
    response = await fetch(`${base}/splits/${encodeURIComponent(shareId)}`, {
      method: 'PUT',
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

  if (response.ok) return { ok: true }

  let message = `Server returned ${response.status}`
  try {
    const body = (await response.json()) as unknown
    message = errorMessageFromResponseJson(body, message)
  } catch {
    /* ignore */
  }
  return { ok: false, error: message }
}

/**
 * Persist session to the cloud: PUT when signed in and `cloudShareId` is set; otherwise POST (new id).
 */
export async function saveCloudSplit(
  session: Session,
  idToken: string | null,
  cloudShareId: string | null,
): Promise<CloudSplitMutationResult> {
  if (idToken && cloudShareId) {
    const u = await updateCloudSplit(cloudShareId, session, idToken)
    if (!u.ok) return u
    return { ok: true, shareId: cloudShareId }
  }
  return createCloudSplit(session, idToken)
}

export type FetchSharedSplitResult =
  | { ok: true; session: Session; isOwner: boolean }
  | { ok: false; error: string }

export async function fetchSharedSession(
  shareId: string,
  idToken?: string | null,
): Promise<FetchSharedSplitResult> {
  const base = getWorkerOrigin()
  const headers: Record<string, string> = {}
  if (idToken) headers.authorization = `Bearer ${idToken}`

  let response: Response
  try {
    response = await fetch(`${base}/splits/${encodeURIComponent(shareId)}`, { headers })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error'
    return { ok: false, error: message }
  }

  if (response.ok) {
    const json = (await response.json()) as {
      session?: Session
      isOwner?: unknown
    }
    if (!json.session || typeof json.session !== 'object') {
      return { ok: false, error: 'Unexpected response from server' }
    }
    const isOwner = json.isOwner === true
    return { ok: true, session: json.session as Session, isOwner }
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

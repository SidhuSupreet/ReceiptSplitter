import type { Session } from '@/features/session/types'

export const SHARE_URL_WARNING_THRESHOLD = 1800

export type WireSession = Omit<Session, 'receipts'> & {
  receipts: Array<Omit<Session['receipts'][number], 'imageDataUrl'>>
}

export type ShareDecodeError = { type: 'malformed' } | { type: 'invalid' }

export type ShareDecodeResult =
  | { ok: true; session: Session }
  | { ok: false; error: ShareDecodeError }

/** Strips receipt images for links and API payloads. */
export function sessionForWire(session: Session): WireSession {
  return {
    ...session,
    receipts: session.receipts.map((receipt) => {
      const { imageDataUrl, ...rest } = receipt
      void imageDataUrl
      return rest
    }),
  }
}

export function encodeSessionParam(session: Session): string {
  const json = JSON.stringify(sessionForWire(session))
  return btoa(encodeURIComponent(json))
}

export function buildShareUrl(session: Session, origin?: string): string {
  const resolvedOrigin =
    origin ?? (typeof window !== 'undefined' ? window.location.origin : '')
  // Trim trailing slash from BASE_URL so the joined path doesn't double up.
  const basePath = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')
  return `${resolvedOrigin}${basePath}/#/session/${session.id}?data=${encodeSessionParam(session)}`
}

/** Short link: loads session from Worker / Sheets by `shareId` (no `?data=`). */
export function buildShortShareUrl(shareId: string, origin?: string): string {
  const resolvedOrigin =
    origin ?? (typeof window !== 'undefined' ? window.location.origin : '')
  const basePath = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')
  return `${resolvedOrigin}${basePath}/#/session/${encodeURIComponent(shareId)}`
}

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<Session>
  return (
    typeof candidate.id === 'string' &&
    Array.isArray(candidate.people) &&
    Array.isArray(candidate.receipts) &&
    typeof candidate.createdAt === 'string'
  )
}

export function decodeSessionParam(param: string): ShareDecodeResult {
  try {
    const json = decodeURIComponent(atob(param))
    const parsed = JSON.parse(json) as unknown
    if (!isSession(parsed)) return { ok: false, error: { type: 'invalid' } }
    return { ok: true, session: parsed }
  } catch {
    return { ok: false, error: { type: 'malformed' } }
  }
}

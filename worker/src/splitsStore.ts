import { getSheetsAccessToken } from './googleAccessToken'
import {
  decodePayloadFromSheet,
  encodePayloadForSheet,
  isSession,
  stripSessionImages,
  type Session,
} from './sessionPayload'

const MAX_CELL_CHARS = 50_000

export type SplitMeta = {
  shareId: string
  createdAt: string
}

export class SplitsStore {
  constructor(
    private readonly spreadsheetId: string,
    private readonly tabName: string,
    private readonly serviceAccountJson: string,
  ) {}

  /**
   * A1 range for the tab. Quotes are only for names with spaces/special chars;
   * `'plain'!A:E` can make the API return "Unable to parse range".
   */
  private a1Range(columns: string): string {
    const name = this.tabName.trim()
    if (!name) return columns
    const mustQuote =
      /[\s']/.test(name) || !/^[A-Za-z0-9_]+$/.test(name) || /^(true|false|null)$/i.test(name)
    const sheet = mustQuote ? `'${name.replace(/'/g, "''")}'` : name
    return `${sheet}!${columns}`
  }

  private async sheetsFetch(
    path: string,
    init: RequestInit & { method?: string } = {},
  ): Promise<Response> {
    const token = await getSheetsAccessToken(this.serviceAccountJson)
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}${path}`
    return fetch(url, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        ...(init.headers as Record<string, string>),
      },
    })
  }

  /**
   * Append a row: shareId, ownerSub, ownerEmail, createdAt, payload.
   */
  async appendSplit(
    shareId: string,
    ownerSub: string,
    ownerEmail: string,
    session: Session,
  ): Promise<void> {
    const stripped = stripSessionImages(session)
    const payload = await encodePayloadForSheet(stripped)
    if (payload.length > MAX_CELL_CHARS) {
      throw new PayloadTooLargeError()
    }
    const createdAt = new Date().toISOString()
    const body = {
      values: [[shareId, ownerSub, ownerEmail, createdAt, payload]],
    }
    const range = this.a1Range('A:E')
    const urlPath = `/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`
    const res = await this.sheetsFetch(urlPath, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text()
      let hint = ''
      if (res.status === 400 && text.includes('Unable to parse range')) {
        hint =
          ' Check that a worksheet tab exists whose name matches SPLITS_TAB_NAME exactly (case-sensitive). Default is "splits"; if your tab is "Sheet1", set SPLITS_TAB_NAME=Sheet1.'
      }
      throw new Error(`Sheets append failed: ${res.status} ${text}${hint}`)
    }
  }

  /** Session and ownerSub (sheet column B) for a share id, or null if missing. */
  async getShareData(
    shareId: string,
  ): Promise<{ session: Session; ownerSub: string } | null> {
    const rows = await this.readAllDataRows()
    for (const row of rows) {
      const id = row[0]?.trim()
      if (id !== shareId) continue
      const ownerSub = (row[1] ?? '').trim()
      const cell = row[4] ?? ''
      const session = await decodePayloadFromSheet(
        typeof cell === 'string' ? cell : String(cell),
      )
      if (!session) return null
      return { session, ownerSub }
    }
    return null
  }

  async getSessionByShareId(shareId: string): Promise<Session | null> {
    const data = await this.getShareData(shareId)
    return data?.session ?? null
  }

  /**
   * Overwrite payload for an existing row. `editorSub` must match column B and B must be non-empty.
   */
  async updateSplitPayload(shareId: string, editorSub: string, session: Session): Promise<void> {
    const rows = await this.readAllDataRows()
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (row[0]?.trim() !== shareId) continue
      const ownerSub = (row[1] ?? '').trim()
      if (!ownerSub) throw new SplitUpdateForbiddenError('guest')
      if (ownerSub !== editorSub) throw new SplitUpdateForbiddenError('not_owner')
      const sheetRow = i + 2
      const stripped = stripSessionImages(session)
      const payload = await encodePayloadForSheet(stripped)
      if (payload.length > MAX_CELL_CHARS) {
        throw new PayloadTooLargeError()
      }
      const range = this.a1Range(`E${sheetRow}`)
      const urlPath = `/values/${encodeURIComponent(range)}?valueInputOption=RAW`
      const res = await this.sheetsFetch(urlPath, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ values: [[payload]] }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Sheets update failed: ${res.status} ${text}`)
      }
      return
    }
    throw new SplitNotFoundError()
  }

  async listMetaForOwner(ownerSub: string): Promise<SplitMeta[]> {
    const rows = await this.readAllDataRows()
    const out: SplitMeta[] = []
    for (const row of rows) {
      const sub = row[1]?.trim()
      if (sub !== ownerSub) continue
      const sid = row[0]?.trim()
      const createdAt = row[3]?.trim()
      if (sid && createdAt) out.push({ shareId: sid, createdAt })
    }
    out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    return out
  }

  private async readAllDataRows(): Promise<string[][]> {
    const range = this.a1Range('A2:E')
    const path = `/values/${encodeURIComponent(range)}`
    const res = await this.sheetsFetch(path)
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Sheets read failed: ${res.status} ${text}`)
    }
    const json = (await res.json()) as { values?: string[][] }
    return json.values ?? []
  }
}

export class PayloadTooLargeError extends Error {
  constructor() {
    super('Payload exceeds Google Sheets cell limit after compression')
    this.name = 'PayloadTooLargeError'
  }
}

export class SplitNotFoundError extends Error {
  constructor() {
    super('Split not found')
    this.name = 'SplitNotFoundError'
  }
}

export class SplitUpdateForbiddenError extends Error {
  constructor(public readonly reason: 'guest' | 'not_owner') {
    super(reason === 'guest' ? 'Cannot update a guest split' : 'Not allowed to update this split')
    this.name = 'SplitUpdateForbiddenError'
  }
}

export function newShareId(): string {
  const bytes = new Uint8Array(9)
  crypto.getRandomValues(bytes)
  return bytesToBase64Url(bytes)
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function normalizeIncomingSession(body: unknown): Session | null {
  if (!isSession(body)) return null
  return stripSessionImages(body)
}

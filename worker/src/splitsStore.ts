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

  private range(columns: string): string {
    const escaped = `'${this.tabName.replace(/'/g, "''")}'`
    return `${escaped}!${columns}`
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
    const range = this.range('A:E')
    const urlPath = `/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`
    const res = await this.sheetsFetch(urlPath, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Sheets append failed: ${res.status} ${text}`)
    }
  }

  async getSessionByShareId(shareId: string): Promise<Session | null> {
    const rows = await this.readAllDataRows()
    for (const row of rows) {
      const id = row[0]?.trim()
      if (id === shareId) {
        const cell = row[4] ?? ''
        return decodePayloadFromSheet(typeof cell === 'string' ? cell : String(cell))
      }
    }
    return null
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
    const range = this.range('A2:E')
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

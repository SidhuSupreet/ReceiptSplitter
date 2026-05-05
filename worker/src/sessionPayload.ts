/** Session shape stored in Sheets (matches app `Session` minus receipt images). */

export type LineItem = {
  id: string
  receiptId: string
  name: string
  priceCents: number
  quantity: number
  assignedTo: string[]
  excludeFromTaxTip?: boolean
}

export type Payment = {
  personId: string
  amountCents: number
}

export type Receipt = {
  id: string
  label: string
  imageDataUrl?: string
  items: LineItem[]
  taxCents: number
  tipCents: number
  payments: Payment[]
}

export type Session = {
  id: string
  people: { id: string; name: string }[]
  receipts: Receipt[]
  createdAt: string
}

export function isSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false
  const o = value as Partial<Session>
  return (
    typeof o.id === 'string' &&
    Array.isArray(o.people) &&
    Array.isArray(o.receipts) &&
    typeof o.createdAt === 'string'
  )
}

export function stripSessionImages(session: Session): Session {
  return {
    ...session,
    receipts: session.receipts.map(({ imageDataUrl: _img, ...rest }) => rest),
  }
}

const GZIP_PREFIX = 'z:'

export async function encodePayloadForSheet(session: Session): Promise<string> {
  const json = JSON.stringify(session)
  const bytes = new TextEncoder().encode(json)
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))
  const buf = await new Response(stream).arrayBuffer()
  const b64 = bytesToBase64(new Uint8Array(buf))
  return `${GZIP_PREFIX}${b64}`
}

export async function decodePayloadFromSheet(cell: string): Promise<Session | null> {
  const raw = cell.trim()
  if (!raw) return null
  let json: string
  if (raw.startsWith(GZIP_PREFIX)) {
    const b64 = raw.slice(GZIP_PREFIX.length)
    try {
      json = await gunzipBase64ToString(b64)
    } catch {
      return null
    }
  } else {
    json = raw
  }
  try {
    const parsed = JSON.parse(json) as unknown
    return isSession(parsed) ? parsed : null
  } catch {
    return null
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

async function gunzipBase64ToString(b64: string): Promise<string> {
  const bytes = base64ToBytes(b64)
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
  return await new Response(stream).text()
}

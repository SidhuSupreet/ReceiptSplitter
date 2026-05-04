/**
 * Receipt OCR text → structured JSON via Anthropic Claude.
 *
 * Uses raw fetch (no SDK) so the Worker bundle stays tiny and avoids any
 * Node-only modules.
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const MODEL = 'claude-sonnet-4-20250514'

const SYSTEM_PROMPT = `You are parsing raw OCR text extracted from a receipt.
Return only a JSON object with this exact shape:
{
  "items": [{ "name": string, "priceCents": number, "quantity": number }],
  "taxCents": number,
  "tipCents": number
}
Rules:
- All amounts in cents as integers (e.g. $12.50 = 1250)
- Exclude subtotal, total, balance due — items only
- If tax or tip is not present, use 0
- If quantity is not visible, default to 1
- If the text is too garbled to parse, return { "error": "unparseable" }
Return only raw JSON. No markdown fences, no commentary.`

export type OcrSuccess = {
  items: Array<{ name: string; priceCents: number; quantity: number }>
  taxCents: number
  tipCents: number
}

export type OcrUnparseable = { error: 'unparseable' }
export type OcrErrorEnvelope = { error: string }
export type OcrResponse = OcrSuccess | OcrUnparseable | OcrErrorEnvelope

export async function parseWithClaude(
  rawText: string,
  apiKey: string,
): Promise<OcrResponse> {
  if (!rawText.trim()) {
    return { error: 'unparseable' }
  }

  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: rawText }],
    }),
  })

  if (!response.ok) {
    const detail = await safeReadText(response)
    return { error: `anthropic ${response.status}: ${detail}` }
  }

  const json = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>
  }
  const block = json.content?.find((b) => b.type === 'text' && typeof b.text === 'string')
  if (!block?.text) {
    return { error: 'no text response from model' }
  }

  const trimmed = block.text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
  try {
    return JSON.parse(trimmed) as OcrResponse
  } catch {
    return { error: 'unparseable' }
  }
}

async function safeReadText(response: Response): Promise<string> {
  try {
    const text = await response.text()
    return text.slice(0, 200)
  } catch {
    return '<no body>'
  }
}

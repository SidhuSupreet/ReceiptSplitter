import { ocrResponseSchema, type OcrSuccess } from './ocrSchema'

export type ParseError =
  | 'unparseable'
  | 'network'
  | 'invalid'
  | 'auth'
  | 'config'
  | 'forbidden'

export type ParseResult =
  | { ok: true; data: OcrSuccess }
  | { ok: false; error: ParseError; message?: string }

const DEFAULT_ENDPOINT = 'http://localhost:8787/ocr'

function resolveEndpoint(): string {
  return import.meta.env.VITE_OCR_ENDPOINT ?? DEFAULT_ENDPOINT
}

export async function parseReceiptText(
  rawText: string,
  idToken: string | null,
): Promise<ParseResult> {
  if (!rawText.trim()) {
    return { ok: false, error: 'unparseable' }
  }
  if (!idToken) {
    return { ok: false, error: 'auth', message: 'Sign in to scan receipts.' }
  }

  let response: Response
  try {
    response = await fetch(resolveEndpoint(), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ text: rawText }),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'network error'
    return { ok: false, error: 'network', message }
  }

  if (response.status === 401) {
    return { ok: false, error: 'auth', message: 'Session expired — sign in again.' }
  }
  if (response.status === 403) {
    return {
      ok: false,
      error: 'forbidden',
      message: 'This Google account is not on the allowlist.',
    }
  }
  if (response.status === 503) {
    return {
      ok: false,
      error: 'config',
      message: 'OCR service is misconfigured. Try manual entry.',
    }
  }
  if (!response.ok) {
    return {
      ok: false,
      error: 'network',
      message: `Server returned ${response.status}`,
    }
  }

  let json: unknown
  try {
    json = await response.json()
  } catch {
    return { ok: false, error: 'invalid', message: 'Invalid JSON from server' }
  }

  const parsed = ocrResponseSchema.safeParse(json)
  if (!parsed.success) {
    return { ok: false, error: 'invalid', message: 'Unexpected response shape' }
  }
  if ('error' in parsed.data) {
    if (parsed.data.error === 'unparseable') {
      return { ok: false, error: 'unparseable' }
    }
    return { ok: false, error: 'invalid', message: parsed.data.error }
  }

  return { ok: true, data: parsed.data }
}

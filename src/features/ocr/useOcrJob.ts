import { useCallback, useState } from 'react'

import { useAuth } from '@/features/auth/AuthProvider'

import { preprocessImage } from './imagePreprocess'
import { parseReceiptText, type ParseResult } from './ocrClient'
import type { OcrSuccess } from './ocrSchema'
import { runTesseract } from './tesseractRunner'

export type OcrFailureReason =
  | 'unparseable'
  | 'network'
  | 'invalid'
  | 'auth'
  | 'config'
  | 'forbidden'
  | 'unknown'

export type OcrJobState =
  | { status: 'idle' }
  | { status: 'reading'; progress: number; statusLabel: string }
  | { status: 'parsing' }
  | { status: 'success' }
  | { status: 'failure' }

export type OcrRunResult =
  | { kind: 'success'; rawText: string; parsed: OcrSuccess; imageDataUrl: string }
  | {
      kind: 'failure'
      reason: OcrFailureReason
      rawText: string
      imageDataUrl: string
      message?: string
    }

const DEFAULT_STATE: OcrJobState = { status: 'idle' }

export function useOcrJob() {
  const [state, setState] = useState<OcrJobState>(DEFAULT_STATE)
  const { idToken } = useAuth()

  const reset = useCallback(() => setState(DEFAULT_STATE), [])

  const run = useCallback(
    async (file: File): Promise<OcrRunResult> => {
      let imageDataUrl = ''
      try {
        imageDataUrl = await preprocessImage(file)
        setState({ status: 'reading', progress: 0, statusLabel: 'Reading image…' })
        const rawText = await runTesseract(imageDataUrl, ({ progress, status }) => {
          setState({
            status: 'reading',
            progress: Math.max(0, Math.min(1, progress)),
            statusLabel: humanizeStatus(status),
          })
        })

        if (!rawText.trim()) {
          setState({ status: 'failure' })
          return { kind: 'failure', reason: 'unparseable', rawText, imageDataUrl }
        }

        setState({ status: 'parsing' })
        const result = await parseReceiptText(rawText, idToken)
        return finalize(result, rawText, imageDataUrl, setState)
      } catch (err) {
        setState({ status: 'failure' })
        const message = err instanceof Error ? err.message : 'Unknown error'
        return {
          kind: 'failure',
          reason: 'unknown',
          rawText: '',
          imageDataUrl,
          message,
        }
      }
    },
    [idToken],
  )

  return { state, run, reset }
}

function finalize(
  result: ParseResult,
  rawText: string,
  imageDataUrl: string,
  setState: (next: OcrJobState) => void,
): OcrRunResult {
  if (result.ok) {
    setState({ status: 'success' })
    return { kind: 'success', rawText, parsed: result.data, imageDataUrl }
  }
  setState({ status: 'failure' })
  return {
    kind: 'failure',
    reason: result.error,
    rawText,
    imageDataUrl,
    message: result.message,
  }
}

function humanizeStatus(status: string): string {
  if (status === 'recognizing text') return 'Reading text…'
  if (status === 'loading tesseract core') return 'Loading OCR engine…'
  if (status.startsWith('loading')) return 'Loading…'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

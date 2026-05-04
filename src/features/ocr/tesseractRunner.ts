export type OcrProgress = {
  /** 0..1 fraction of overall progress. */
  progress: number
  status: string
}

export type OcrProgressCallback = (progress: OcrProgress) => void

/**
 * Lazy-loads tesseract.js (it's ~1MB) so it's only fetched when the user
 * actually attempts to scan a receipt.
 */
export async function runTesseract(
  source: string | File | Blob,
  onProgress?: OcrProgressCallback,
): Promise<string> {
  const { default: Tesseract } = await import('tesseract.js')
  const result = await Tesseract.recognize(source, 'eng', {
    logger: (m: { status: string; progress: number }) => {
      if (onProgress) onProgress({ status: m.status, progress: m.progress })
    },
  })
  return result.data.text ?? ''
}

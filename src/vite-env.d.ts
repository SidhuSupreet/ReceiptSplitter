/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google OAuth 2.0 Web Client ID. Public; baked into the bundle. */
  readonly VITE_GOOGLE_CLIENT_ID?: string
  /** Cloudflare Worker URL for `/ocr`. Public; baked into the bundle. */
  readonly VITE_OCR_ENDPOINT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

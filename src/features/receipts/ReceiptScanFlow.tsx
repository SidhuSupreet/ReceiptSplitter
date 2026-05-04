import { Loader2, Lock, RefreshCcw } from 'lucide-react'
import { useState } from 'react'

import { useAuth } from '@/features/auth/AuthProvider'
import { SignInButton } from '@/features/auth/SignInButton'
import type { OcrSuccess } from '@/features/ocr/ocrSchema'
import type { OcrFailureReason } from '@/features/ocr/useOcrJob'
import { useOcrJob } from '@/features/ocr/useOcrJob'
import type { LineItem } from '@/features/session/types'
import { useSession } from '@/features/session/useSession'
import { Button } from '@/shared/components/ui/button'
import { useToast } from '@/shared/components/ui/toaster'

import { ManualEntryForm, type ManualEntryResult } from './ManualEntryForm'
import { UploadZone } from './UploadZone'

type ReceiptScanFlowProps = {
  onCommit: () => void
  onCancel: () => void
}

type Defaults = {
  items: OcrSuccess['items']
  taxCents: number
  tipCents: number
}

export function ReceiptScanFlow({ onCommit, onCancel }: ReceiptScanFlowProps) {
  const { session, dispatch } = useSession()
  const { state, run, reset } = useOcrJob()
  const [defaults, setDefaults] = useState<Defaults | null>(null)
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(undefined)
  const { toast } = useToast()
  const { configured, user } = useAuth()

  async function handleFile(file: File) {
    setDefaults(null)
    setImageDataUrl(undefined)
    const result = await run(file)
    if (result.kind === 'success') {
      setDefaults({
        items: result.parsed.items,
        taxCents: result.parsed.taxCents,
        tipCents: result.parsed.tipCents,
      })
      setImageDataUrl(result.imageDataUrl)
    } else {
      setImageDataUrl(result.imageDataUrl)
      toast({
        title: ocrErrorTitle(result.reason),
        description: ocrErrorDescription(result.reason, result.message),
        variant: 'warning',
      })
    }
  }

  function commit(result: ManualEntryResult) {
    const items: Array<Partial<LineItem>> = result.items.map((i) => ({
      name: i.name,
      priceCents: i.priceCents,
      quantity: i.quantity,
      assignedTo: [],
    }))
    dispatch({
      type: 'ADD_RECEIPT',
      receipt: {
        label: result.label || `Receipt ${session.receipts.length + 1}`,
        items: items as LineItem[],
        taxCents: result.taxCents,
        tipCents: result.tipCents,
        imageDataUrl,
      },
    })
    onCommit()
  }

  if (state.status === 'idle' && !defaults && !imageDataUrl) {
    if (!configured) {
      return (
        <div className="rounded-lg border border-dashed border-(--color-border) bg-(--color-muted)/40 p-6 text-center text-sm">
          <p className="font-medium">Receipt scanning is unavailable</p>
          <p className="mt-1 text-(--color-muted-foreground)">
            This deployment doesn’t have OCR configured. Use manual entry instead.
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={onCancel}>
            Switch to manual entry
          </Button>
        </div>
      )
    }
    if (!user) {
      return (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-(--color-border) bg-(--color-muted)/40 p-6 text-center text-sm">
          <span className="grid size-10 place-items-center rounded-full bg-(--color-background) text-(--color-muted-foreground)">
            <Lock className="size-5" />
          </span>
          <div>
            <p className="font-medium">Sign in to scan receipts</p>
            <p className="mt-1 text-(--color-muted-foreground)">
              OCR uses an allow-listed Google account to keep API costs in check. Manual
              entry stays available without signing in.
            </p>
          </div>
          <SignInButton size="medium" />
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Use manual entry instead
          </Button>
        </div>
      )
    }
    return (
      <div className="space-y-3">
        <UploadZone onFile={(file) => void handleFile(file)} />
        <p className="text-xs text-(--color-muted-foreground)">
          Tip: a clear, well-lit photo of the printed receipt gives the best results.
        </p>
      </div>
    )
  }

  if (state.status === 'reading' || state.status === 'parsing') {
    const progress = state.status === 'reading' ? state.progress : 1
    const label = state.status === 'parsing' ? 'Parsing items…' : state.statusLabel
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <Loader2 className="size-8 animate-spin text-(--color-primary)" />
        <p className="text-sm font-medium">{label}</p>
        <div className="h-1.5 w-56 overflow-hidden rounded-full bg-(--color-muted)">
          <div
            className="h-full bg-(--color-primary) transition-all"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {imageDataUrl ? (
        <div className="overflow-hidden rounded-lg border border-(--color-border)">
          <img
            src={imageDataUrl}
            alt="Receipt preview"
            className="max-h-56 w-full bg-(--color-muted) object-contain"
          />
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <p className="text-xs text-(--color-muted-foreground)">
          {defaults
            ? 'Auto-parsed items below — tweak as needed.'
            : 'Auto-parse didn’t work — enter items manually.'}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            reset()
            setDefaults(null)
            setImageDataUrl(undefined)
          }}
        >
          <RefreshCcw className="size-4" />
          Try another image
        </Button>
      </div>

      <ManualEntryForm
        defaultLabel={`Receipt ${session.receipts.length + 1}`}
        onSubmit={commit}
        onCancel={onCancel}
        initialItems={defaults?.items}
        initialTaxCents={defaults?.taxCents ?? 0}
        initialTipCents={defaults?.tipCents ?? 0}
      />
    </div>
  )
}

function ocrErrorTitle(reason: OcrFailureReason): string {
  switch (reason) {
    case 'unparseable':
      return 'Couldn’t read this receipt'
    case 'network':
      return 'Couldn’t reach the parser'
    case 'auth':
      return 'Sign-in required'
    case 'forbidden':
      return 'Account not allowed'
    case 'config':
      return 'OCR service misconfigured'
    default:
      return 'Receipt parse failed'
  }
}

function ocrErrorDescription(reason: OcrFailureReason, message?: string): string {
  switch (reason) {
    case 'unparseable':
      return 'Try a clearer photo, or enter the items manually below.'
    case 'network':
      return message ?? 'Check your connection and try again.'
    case 'auth':
      return message ?? 'Sign in with Google to continue.'
    case 'forbidden':
      return message ?? 'Ask the owner to add your email to the allowlist.'
    case 'config':
      return message ?? 'Enter items manually for now.'
    default:
      return message ?? 'Enter the items manually below.'
  }
}

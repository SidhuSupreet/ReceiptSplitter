import { Check, Copy, QrCode, Share2 } from 'lucide-react'
import QRCode from 'qrcode'
import { type ReactNode, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/features/auth/AuthProvider'
import type { Session } from '@/features/session/types'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { useToast } from '@/shared/components/ui/toaster'

import { useCloudShare } from './cloudShare'
import { buildShortShareUrl } from './shareEncoding'
import { saveCloudSplit } from './splitsApi'

type ShareModalProps = {
  session: Session
  trigger?: ReactNode
}

export function ShareModal({ session, trigger }: ShareModalProps) {
  const [open, setOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [syncState, setSyncState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [syncError, setSyncError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()
  const { idToken } = useAuth()
  const { cloudShareId, setCloudShareId } = useCloudShare()
  const sessionRef = useRef(session)
  sessionRef.current = session
  const cloudShareIdRef = useRef(cloudShareId)
  cloudShareIdRef.current = cloudShareId

  useEffect(() => {
    if (!open) {
      setShareUrl(null)
      setSyncState('idle')
      setSyncError(null)
      return
    }

    const s = sessionRef.current
    const binding = cloudShareIdRef.current
    let cancelled = false
    setSyncState('loading')
    setSyncError(null)
    setShareUrl(null)

    void saveCloudSplit(s, idToken, binding).then((result) => {
      if (cancelled) return
      if (!result.ok) {
        setSyncState('error')
        setSyncError(result.error)
        toast({
          title: 'Could not save share link',
          description: result.error,
          variant: 'destructive',
        })
        return
      }
      setCloudShareId(result.shareId)
      setShareUrl(buildShortShareUrl(result.shareId))
      setSyncState('idle')
    })

    return () => {
      cancelled = true
    }
  }, [open, idToken, setCloudShareId, toast])

  async function handleCopy() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast({ title: 'Link copied' })
      setTimeout(() => setCopied(false), 1600)
    } catch {
      toast({
        title: 'Could not copy',
        description: 'Select the link and copy it manually.',
        variant: 'destructive',
      })
    }
  }

  const loading = open && syncState === 'loading'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Share2 className="size-4" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="size-4" />
            Share this split
          </DialogTitle>
          <DialogDescription>
            Short links load from your app backend. Sharing saves the current session first.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {open ? (
            loading ? (
              <div className="flex h-48 w-48 items-center justify-center rounded-lg border border-(--color-border) text-sm text-(--color-muted-foreground)">
                Preparing link…
              </div>
            ) : shareUrl ? (
              <ShareQRCode value={shareUrl} />
            ) : syncState === 'error' ? (
              <div className="flex min-h-48 w-full items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-4 text-center text-sm text-destructive">
                {syncError ?? 'Something went wrong'}
              </div>
            ) : null
          ) : null}

          <div className="flex w-full gap-2">
            <Input
              readOnly
              value={shareUrl ?? ''}
              placeholder={loading ? 'Saving…' : syncState === 'error' ? '' : '—'}
              className="font-mono text-xs"
            />
            <Button
              onClick={handleCopy}
              variant={copied ? 'secondary' : 'default'}
              disabled={!shareUrl}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ShareQRCode({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    QRCode.toCanvas(canvas, value, {
      width: 192,
      margin: 1,
      errorCorrectionLevel: 'L',
      color: { dark: '#0f172a', light: '#ffffff' },
    }).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Could not render QR code'
      setError(message)
    })
  }, [value])

  if (error) {
    return (
      <div className="flex h-48 w-48 flex-col items-center justify-center gap-2 rounded-lg border border-(--color-border) text-center text-xs text-(--color-muted-foreground)">
        <QrCode className="size-6" />
        QR unavailable
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-(--color-border) bg-white p-2">
      <canvas ref={canvasRef} aria-label="QR code for share link" />
    </div>
  )
}

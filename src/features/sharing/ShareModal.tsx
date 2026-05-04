import { Check, Copy, QrCode, Share2, TriangleAlert } from 'lucide-react'
import QRCode from 'qrcode'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'

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

import { buildShareUrl, SHARE_URL_WARNING_THRESHOLD } from './shareEncoding'

type ShareModalProps = {
  session: Session
  trigger?: ReactNode
}

export function ShareModal({ session, trigger }: ShareModalProps) {
  const [open, setOpen] = useState(false)
  const url = useMemo(() => buildShareUrl(session), [session])
  const oversize = url.length > SHARE_URL_WARNING_THRESHOLD
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
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
            Anyone with this link can view the full breakdown. Re-share after editing.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {open ? <ShareQRCode value={url} /> : null}
          <div className="flex w-full gap-2">
            <Input readOnly value={url} className="font-mono text-xs" />
            <Button onClick={handleCopy} variant={copied ? 'secondary' : 'default'}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          {oversize ? (
            <div className="flex w-full items-start gap-2 rounded-md border border-amber-300/50 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100">
              <TriangleAlert className="size-4 shrink-0" />
              <span>
                This link is long ({url.length.toLocaleString()} characters) and may not
                work everywhere. Consider sharing a screenshot of the settlement instead.
              </span>
            </div>
          ) : null}
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

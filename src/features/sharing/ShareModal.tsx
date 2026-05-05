import { Check, Copy, Link2, QrCode, Share2, TriangleAlert } from 'lucide-react'
import QRCode from 'qrcode'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'

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

import {
  buildShareUrl,
  buildShortShareUrl,
  SHARE_URL_WARNING_THRESHOLD,
} from './shareEncoding'
import { publishSplit } from './splitsApi'

type ShareModalProps = {
  session: Session
  trigger?: ReactNode
}

export function ShareModal({ session, trigger }: ShareModalProps) {
  const [open, setOpen] = useState(false)
  const classicUrl = useMemo(() => buildShareUrl(session), [session])
  /** When set, the modal shows a cloud short link instead of the classic data URL. */
  const [shortShareId, setShortShareId] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()
  const { configured, user, idToken } = useAuth()

  const displayUrl = shortShareId ? buildShortShareUrl(shortShareId) : classicUrl

  useEffect(() => {
    void Promise.resolve().then(() => setShortShareId(null))
  }, [classicUrl])

  const oversizeClassic = classicUrl.length > SHARE_URL_WARNING_THRESHOLD
  const usingShort = shortShareId !== null

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(displayUrl)
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

  async function handleShortLink() {
    if (!idToken) {
      toast({
        title: 'Sign in required',
        description: 'Short links save a copy to the cloud — sign in with Google first.',
        variant: 'destructive',
      })
      return
    }
    setPublishing(true)
    const result = await publishSplit(session, idToken)
    setPublishing(false)
    if (result.ok) {
      setShortShareId(result.shareId)
      toast({ title: 'Short link ready' })
    } else {
      toast({
        title: 'Could not create short link',
        description: result.error,
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
          {open ? <ShareQRCode value={displayUrl} /> : null}
          <div className="flex w-full gap-2">
            <Input readOnly value={displayUrl} className="font-mono text-xs" />
            <Button onClick={handleCopy} variant={copied ? 'secondary' : 'default'}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>

          {configured && user && idToken ? (
            <div className="flex w-full flex-col gap-2">
              {!usingShort ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  disabled={publishing}
                  onClick={handleShortLink}
                >
                  <Link2 className="size-4" />
                  {publishing ? 'Saving…' : 'Create short link (save to cloud)'}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShortShareId(null)}
                >
                  Show classic link instead
                </Button>
              )}
              <p className="text-xs text-(--color-muted-foreground)">
                Short links load from your app backend — keep your Google Sheet backed up
                if you rely on them.
              </p>
            </div>
          ) : configured && !user ? (
            <p className="text-xs text-(--color-muted-foreground)">
              Sign in with Google to create a short link that doesn’t paste the whole bill
              into the URL.
            </p>
          ) : null}

          {oversizeClassic && !usingShort ? (
            <div className="flex w-full items-start gap-2 rounded-md border border-amber-300/50 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100">
              <TriangleAlert className="size-4 shrink-0" />
              <span>
                This link is long ({classicUrl.length.toLocaleString()} characters) and may
                not work everywhere. Sign in and use a short link, or share a screenshot.
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

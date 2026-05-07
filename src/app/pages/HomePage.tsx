import { Loader2, Plus, ReceiptText, RefreshCw, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useAuth } from '@/features/auth/AuthProvider'
import { ExportMenu } from '@/features/export/ExportMenu'
import { PeopleRoster } from '@/features/people/PeopleRoster'
import { AddReceiptDialog } from '@/features/receipts/AddReceiptDialog'
import { ReceiptCard } from '@/features/receipts/ReceiptCard'
import { useSession } from '@/features/session/useSession'
import { SettlementPanel } from '@/features/settlement/SettlementPanel'
import { ShareModal } from '@/features/sharing/ShareModal'
import { fetchSharedSession, saveCloudSplit } from '@/features/sharing/splitsApi'
import { useCloudShare } from '@/features/sharing/useCloudShare'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { useToast } from '@/shared/components/ui/toaster'

export function HomePage() {
  const { session, dispatch } = useSession()
  const { cloudShareId, setCloudShareId, clearCloudShare } = useCloudShare()
  const { user, idToken } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()
  const [confirmReset, setConfirmReset] = useState(false)
  const [saving, setSaving] = useState(false)
  const hasContent = session.people.length > 0 || session.receipts.length > 0

  const shareToLoad = searchParams.get('share')?.trim() ?? ''

  useEffect(() => {
    if (!shareToLoad) return

    if (!idToken) {
      toast({
        title: 'Sign in required',
        description: 'Sign in with Google to open this split in the editor.',
        variant: 'destructive',
      })
      setSearchParams({}, { replace: true })
      return
    }

    let cancelled = false
    void fetchSharedSession(shareToLoad, idToken).then((result) => {
      if (cancelled) return
      if (!result.ok) {
        toast({
          title: 'Could not open split',
          description: result.error,
          variant: 'destructive',
        })
        setSearchParams({}, { replace: true })
        return
      }
      if (!result.isOwner) {
        toast({
          title: 'Not your split',
          description: 'You can only edit splits you created while signed in.',
          variant: 'destructive',
        })
        setSearchParams({}, { replace: true })
        return
      }
      dispatch({ type: 'LOAD_SESSION', session: result.session })
      setCloudShareId(shareToLoad)
      setSearchParams({}, { replace: true })
      toast({ title: 'Split loaded' })
    })

    return () => {
      cancelled = true
    }
  }, [shareToLoad, idToken, dispatch, setCloudShareId, setSearchParams, toast])

  async function handleSave() {
    if (!hasContent) return
    if (!user || !idToken) {
      toast({
        title: 'Sign in to save',
        description: 'Cloud save keeps one link while you edit. Guests can share once but can’t update the same link.',
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    const result = await saveCloudSplit(session, idToken, cloudShareId)
    setSaving(false)
    if (result.ok) {
      setCloudShareId(result.shareId)
      toast({ title: 'Saved to cloud' })
    } else {
      toast({
        title: 'Save failed',
        description: result.error,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:py-10">
      <PageIntro onReset={() => setConfirmReset(true)} canReset={hasContent} />

      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <aside className="space-y-6">
          <PeopleRoster />
        </aside>

        <section className="space-y-6">
          <ReceiptsSection />
          <SettlementPanel
            session={session}
            actions={
              hasContent ? (
                <>
                  <ExportMenu session={session} />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={saving || !user}
                    onClick={() => void handleSave()}
                    title={
                      user ? 'Save the current session to the cloud' : 'Sign in to save to the cloud'
                    }
                  >
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    Save
                  </Button>
                  <ShareModal session={session} />
                </>
              ) : null
            }
          />
        </section>
      </div>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a new split?</DialogTitle>
            <DialogDescription>
              This clears every person, receipt, and payment from this session.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                dispatch({ type: 'RESET' })
                clearCloudShare()
                setConfirmReset(false)
              }}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PageIntro({ onReset, canReset }: { onReset: () => void; canReset: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Split a bill
        </h1>
        <p className="text-sm text-(--color-muted-foreground)">
          Add the people, capture each receipt, and we’ll work out who owes whom.
        </p>
      </div>
      {canReset ? (
        <Button variant="outline" size="sm" onClick={onReset}>
          <RefreshCw className="size-4" />
          New split
        </Button>
      ) : null}
    </div>
  )
}

function ReceiptsSection() {
  const { session } = useSession()

  if (session.receipts.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-(--color-muted) text-(--color-muted-foreground)">
            <ReceiptText className="size-6" />
          </span>
          <h2 className="text-lg font-semibold tracking-tight">No receipts yet</h2>
          <p className="max-w-sm text-sm text-(--color-muted-foreground)">
            Add a receipt by uploading a photo or entering items by hand.
          </p>
          <AddReceiptDialog
            trigger={
              <Button>
                <Plus className="size-4" />
                Add receipt
              </Button>
            }
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Receipts</h2>
        <AddReceiptDialog
          trigger={
            <Button size="sm">
              <Plus className="size-4" />
              Add receipt
            </Button>
          }
        />
      </div>
      <div className="space-y-4">
        {session.receipts.map((receipt) => (
          <ReceiptCard key={receipt.id} receipt={receipt} />
        ))}
      </div>
    </div>
  )
}

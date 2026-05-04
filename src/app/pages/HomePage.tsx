import { Plus, ReceiptText, RefreshCw } from 'lucide-react'
import { useState } from 'react'

import { ExportMenu } from '@/features/export/ExportMenu'
import { PeopleRoster } from '@/features/people/PeopleRoster'
import { AddReceiptDialog } from '@/features/receipts/AddReceiptDialog'
import { ReceiptCard } from '@/features/receipts/ReceiptCard'
import { useSession } from '@/features/session/useSession'
import { SettlementPanel } from '@/features/settlement/SettlementPanel'
import { ShareModal } from '@/features/sharing/ShareModal'
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

export function HomePage() {
  const { session, dispatch } = useSession()
  const [confirmReset, setConfirmReset] = useState(false)
  const hasContent = session.people.length > 0 || session.receipts.length > 0

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

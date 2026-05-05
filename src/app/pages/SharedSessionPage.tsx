import { ArrowRight, Pencil, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { useAuth } from '@/features/auth/AuthProvider'

import { ReadOnlyReceiptCard } from '@/features/receipts/ReadOnlyReceiptCard'
import type { Session } from '@/features/session/types'
import { SettlementPanel } from '@/features/settlement/SettlementPanel'
import { decodeSessionParam } from '@/features/sharing/shareEncoding'
import { fetchSharedSession } from '@/features/sharing/splitsApi'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'

export function SharedSessionPage() {
  const { id: pathId } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const data = params.get('data')

  if (data) {
    const decoded = decodeSessionParam(data)
    if (!decoded.ok) {
      const message =
        decoded.error.type === 'malformed'
          ? 'This share link looks corrupted.'
          : 'This share link doesn’t contain a valid session.'
      return <SharedError reason={message} />
    }
    return <SharedSessionView session={decoded.session} />
  }

  if (!pathId?.trim()) {
    return <SharedError reason="No share data or id provided." />
  }

  const shareId = pathId.trim()
  return <FetchedSharedSession key={shareId} shareId={shareId} />
}

function FetchedSharedSession({ shareId }: { shareId: string }) {
  const { idToken } = useAuth()
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'ok'; session: Session; isOwner: boolean }
    | { status: 'error'; message: string }
  >({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    void fetchSharedSession(shareId, idToken).then((result) => {
      if (cancelled) return
      if (result.ok)
        setState({ status: 'ok', session: result.session, isOwner: result.isOwner })
      else setState({ status: 'error', message: result.error })
    })
    return () => {
      cancelled = true
    }
  }, [shareId, idToken])

  if (state.status === 'loading') {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="text-sm text-(--color-muted-foreground)">Loading shared split…</p>
      </div>
    )
  }

  if (state.status === 'error') {
    return <SharedError reason={state.message} />
  }

  return (
    <SharedSessionView
      session={state.session}
      shareId={shareId}
      showOwnerEdit={state.isOwner}
    />
  )
}

function SharedSessionView({
  session,
  shareId,
  showOwnerEdit,
}: {
  session: Session
  /** Present for cloud-backed shares; used for the owner edit link. */
  shareId?: string
  showOwnerEdit?: boolean
}) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:py-10">
      <SharedSummary session={session} />
      {showOwnerEdit && shareId ? (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" asChild>
            <Link
              to={{
                pathname: '/',
                search: `?share=${encodeURIComponent(shareId)}`,
              }}
            >
              <Pencil className="size-4" />
              Edit this split
            </Link>
          </Button>
        </div>
      ) : null}
      <SettlementPanel session={session} />
      {session.receipts.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Receipts</h2>
          <div className="space-y-4">
            {session.receipts.map((receipt) => (
              <ReadOnlyReceiptCard key={receipt.id} session={session} receipt={receipt} />
            ))}
          </div>
        </section>
      ) : null}
      <CTAFooter />
    </div>
  )
}

function SharedSummary({ session }: { session: Session }) {
  const date = new Date(session.createdAt)
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Shared split</h1>
      <p className="text-sm text-(--color-muted-foreground)">
        {session.people.length} {session.people.length === 1 ? 'person' : 'people'} ·{' '}
        {session.receipts.length} {session.receipts.length === 1 ? 'receipt' : 'receipts'}{' '}
        · created {Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString()}
      </p>
    </div>
  )
}

function CTAFooter() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
        <span className="grid size-10 place-items-center rounded-full bg-(--color-accent) text-(--color-accent-foreground)">
          <Sparkles className="size-5" />
        </span>
        <h2 className="text-lg font-semibold tracking-tight">Splitting your own bill?</h2>
        <p className="max-w-md text-sm text-(--color-muted-foreground)">
          Start a new session — add your friends, drop in receipts, and share the result
          when you’re done.
        </p>
        <Button asChild>
          <Link to="/">
            Create your own split
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function SharedError({ reason }: { reason: string }) {
  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <h1 className="text-xl font-semibold tracking-tight">Couldn’t open this split</h1>
      <p className="mt-2 text-sm text-(--color-muted-foreground)">{reason}</p>
      <Button asChild className="mt-6">
        <Link to="/">Start a new split</Link>
      </Button>
    </div>
  )
}

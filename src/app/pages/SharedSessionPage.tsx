import { ArrowRight, Sparkles } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import { ReadOnlyReceiptCard } from '@/features/receipts/ReadOnlyReceiptCard'
import type { Session } from '@/features/session/types'
import { SettlementPanel } from '@/features/settlement/SettlementPanel'
import { decodeSessionParam } from '@/features/sharing/shareEncoding'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'

export function SharedSessionPage() {
  const [params] = useSearchParams()
  const data = params.get('data')

  if (!data) {
    return <SharedError reason="No share data provided." />
  }

  const decoded = decodeSessionParam(data)
  if (!decoded.ok) {
    const message =
      decoded.error.type === 'malformed'
        ? 'This share link looks corrupted.'
        : 'This share link doesn’t contain a valid session.'
    return <SharedError reason={message} />
  }

  const session = decoded.session

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:py-10">
      <SharedSummary session={session} />
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

import { PersonAvatar } from '@/features/people/PersonPill'
import type { Receipt, Session } from '@/features/session/types'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { Separator } from '@/shared/components/ui/separator'
import { cn } from '@/shared/utils/cn'
import { formatCents } from '@/shared/utils/money'

import {
  receiptSubtotal,
  receiptTotal,
  totalPaid,
  unallocatedRemainder,
} from './receiptTotals'

type ReadOnlyReceiptCardProps = {
  session: Session
  receipt: Receipt
}

export function ReadOnlyReceiptCard({ session, receipt }: ReadOnlyReceiptCardProps) {
  const peopleById = new Map(session.people.map((p) => [p.id, p]))
  const subtotal = receiptSubtotal(receipt)
  const total = receiptTotal(receipt)
  const paid = totalPaid(receipt)
  const remainder = unallocatedRemainder(receipt)

  return (
    <Card>
      <CardHeader>
        <div>
          <h3 className="text-base font-semibold tracking-tight">{receipt.label}</h3>
          <p className="text-xs text-(--color-muted-foreground)">
            {receipt.items.length} {receipt.items.length === 1 ? 'item' : 'items'} ·{' '}
            {formatCents(total)} total
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {receipt.items.length === 0 ? (
          <p className="text-sm text-(--color-muted-foreground)">No items.</p>
        ) : (
          <ul className="space-y-2">
            {receipt.items.map((item) => {
              const lineTotal = item.priceCents * item.quantity
              const assigned = item.assignedTo
                .map((id) => peopleById.get(id))
                .filter((p): p is NonNullable<typeof p> => Boolean(p))
              return (
                <li
                  key={item.id}
                  className={cn(
                    'rounded-lg border p-3',
                    item.assignedTo.length === 0
                      ? 'border-amber-400/60 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-950/30'
                      : 'border-(--color-border)',
                  )}
                >
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">
                      {item.name || 'Untitled item'}
                      {item.quantity > 1 ? (
                        <span className="ml-1 text-(--color-muted-foreground)">
                          × {item.quantity}
                        </span>
                      ) : null}
                      {item.excludeFromTaxTip ? (
                        <span className="ml-2 font-normal text-(--color-muted-foreground)">
                          (off bill)
                        </span>
                      ) : null}
                    </span>
                    <span className="tabular-nums">{formatCents(lineTotal)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-(--color-muted-foreground)">
                    {assigned.length === 0 ? (
                      <span>Unassigned</span>
                    ) : (
                      assigned.map((p) => (
                        <span key={p.id} className="inline-flex items-center gap-1">
                          <PersonAvatar person={p} size="sm" />
                          {p.name}
                        </span>
                      ))
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <Separator />

        <dl className="space-y-1 text-sm tabular-nums">
          <Line label="Subtotal" value={subtotal} />
          {receipt.taxCents > 0 ? <Line label="Tax" value={receipt.taxCents} /> : null}
          {receipt.tipCents > 0 ? <Line label="Tip" value={receipt.tipCents} /> : null}
          <div className="flex items-center justify-between border-t border-(--color-border) pt-1.5 text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatCents(total)}</dd>
          </div>
        </dl>

        {receipt.payments.length > 0 ? (
          <>
            <Separator />
            <div>
              <h4 className="mb-2 text-sm font-semibold">Paid by</h4>
              <ul className="space-y-1.5 text-sm">
                {receipt.payments.map((payment) => {
                  const person = peopleById.get(payment.personId)
                  if (!person) return null
                  return (
                    <li
                      key={payment.personId}
                      className="flex items-center gap-2 tabular-nums"
                    >
                      <PersonAvatar person={person} size="sm" />
                      <span className="flex-1">{person.name}</span>
                      <span>{formatCents(payment.amountCents)}</span>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-2 text-xs text-(--color-muted-foreground) tabular-nums">
                Paid {formatCents(paid)} / {formatCents(total)}
                {Math.abs(remainder) > 1
                  ? ` · ${formatCents(remainder)} unallocated`
                  : ''}
              </p>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-(--color-muted-foreground)">
      <dt>{label}</dt>
      <dd>{formatCents(value)}</dd>
    </div>
  )
}

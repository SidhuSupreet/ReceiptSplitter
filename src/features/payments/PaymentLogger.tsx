import { AlertTriangle, CheckCircle2, Wallet } from 'lucide-react'

import { PersonAvatar } from '@/features/people/PersonPill'
import {
  receiptTotal,
  totalPaid,
  unallocatedRemainder,
} from '@/features/receipts/receiptTotals'
import type { Receipt } from '@/features/session/types'
import { useSession } from '@/features/session/useSession'
import { MoneyInput } from '@/shared/components/MoneyInput'
import { cn } from '@/shared/utils/cn'
import { formatCents } from '@/shared/utils/money'

type PaymentLoggerProps = {
  receipt: Receipt
  readOnly?: boolean
}

const TOLERANCE_CENTS = 1

export function PaymentLogger({ receipt, readOnly = false }: PaymentLoggerProps) {
  const { session, dispatch } = useSession()
  const total = receiptTotal(receipt)
  const paid = totalPaid(receipt)
  const remainder = unallocatedRemainder(receipt)
  const balanced = Math.abs(remainder) <= TOLERANCE_CENTS

  if (session.people.length === 0) {
    return (
      <p className="text-sm text-(--color-muted-foreground)">
        Add people to log who paid.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {session.people.map((person) => {
          const payment = receipt.payments.find((p) => p.personId === person.id)
          return (
            <li key={person.id} className="flex items-center gap-3">
              <PersonAvatar person={person} size="sm" />
              <span className="flex-1 truncate text-sm font-medium">{person.name}</span>
              <MoneyInput
                aria-label={`${person.name} payment amount`}
                cents={payment?.amountCents ?? 0}
                disabled={readOnly}
                onCentsChange={(amountCents) =>
                  dispatch({
                    type: 'UPSERT_PAYMENT',
                    receiptId: receipt.id,
                    personId: person.id,
                    amountCents,
                  })
                }
                className="w-28 text-right"
              />
            </li>
          )
        })}
      </ul>

      <div
        className={cn(
          'flex items-center gap-2 rounded-md border px-3 py-2 text-sm',
          balanced
            ? 'border-emerald-300/50 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-100'
            : 'border-amber-300/50 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100',
        )}
      >
        {balanced ? (
          <CheckCircle2 className="size-4 shrink-0" />
        ) : (
          <AlertTriangle className="size-4 shrink-0" />
        )}
        <Wallet className="size-4 shrink-0 opacity-60" />
        <span className="flex-1">
          {balanced ? 'Payments match the receipt total.' : 'Payments don’t match.'}
        </span>
        <span className="tabular-nums">
          {formatCents(paid)} / {formatCents(total)}
        </span>
      </div>
    </div>
  )
}

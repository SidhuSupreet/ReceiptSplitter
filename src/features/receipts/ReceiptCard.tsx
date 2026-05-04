import { Plus } from 'lucide-react'

import { PaymentLogger } from '@/features/payments/PaymentLogger'
import type { Receipt } from '@/features/session/types'
import { useSession } from '@/features/session/useSession'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { Separator } from '@/shared/components/ui/separator'
import { formatCents } from '@/shared/utils/money'

import { ItemRow } from './ItemRow'
import { ReceiptHeader } from './ReceiptHeader'
import { receiptSubtotal, receiptTotal } from './receiptTotals'
import { TaxTipFields } from './TaxTipFields'

type ReceiptCardProps = {
  receipt: Receipt
  readOnly?: boolean
}

export function ReceiptCard({ receipt, readOnly = false }: ReceiptCardProps) {
  const { dispatch } = useSession()

  return (
    <Card>
      <CardHeader>
        <ReceiptHeader receipt={receipt} readOnly={readOnly} />
      </CardHeader>
      <CardContent className="space-y-5">
        {receipt.items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-(--color-border) p-4 text-center text-sm text-(--color-muted-foreground)">
            No items yet. Add one to start splitting this receipt.
          </p>
        ) : (
          <ul className="space-y-2">
            {receipt.items.map((item) => (
              <li key={item.id}>
                <ItemRow item={item} receiptId={receipt.id} readOnly={readOnly} />
              </li>
            ))}
          </ul>
        )}

        {!readOnly ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => dispatch({ type: 'ADD_ITEM', receiptId: receipt.id })}
          >
            <Plus className="size-4" />
            Add item
          </Button>
        ) : null}

        <Separator />

        <div className="space-y-3">
          <TaxTipFields receipt={receipt} readOnly={readOnly} />
          <ReceiptTotalsSummary receipt={receipt} />
        </div>

        <Separator />

        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Who paid?</h4>
          <PaymentLogger receipt={receipt} readOnly={readOnly} />
        </div>
      </CardContent>
    </Card>
  )
}

function ReceiptTotalsSummary({ receipt }: { receipt: Receipt }) {
  const subtotal = receiptSubtotal(receipt)
  const total = receiptTotal(receipt)
  return (
    <dl className="space-y-1 text-sm tabular-nums">
      <Line label="Subtotal" value={subtotal} />
      {receipt.taxCents > 0 ? <Line label="Tax" value={receipt.taxCents} /> : null}
      {receipt.tipCents > 0 ? <Line label="Tip" value={receipt.tipCents} /> : null}
      <div className="flex items-center justify-between border-t border-(--color-border) pt-1.5 text-base font-semibold">
        <dt>Total</dt>
        <dd>{formatCents(total)}</dd>
      </div>
    </dl>
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

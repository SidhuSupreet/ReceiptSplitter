import { type Receipt } from '@/features/session/types'
import { useSession } from '@/features/session/useSession'
import { MoneyInput } from '@/shared/components/MoneyInput'
import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'

type TaxTipFieldsProps = {
  receipt: Receipt
  readOnly?: boolean
}

export function TaxTipFields({ receipt, readOnly = false }: TaxTipFieldsProps) {
  const { dispatch } = useSession()

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor={`tax-${receipt.id}`}>Tax</Label>
          {!readOnly && receipt.taxCents > 0 ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() =>
                dispatch({ type: 'SET_TAX', receiptId: receipt.id, taxCents: 0 })
              }
            >
              No tax
            </Button>
          ) : null}
        </div>
        <MoneyInput
          id={`tax-${receipt.id}`}
          cents={receipt.taxCents}
          disabled={readOnly}
          onCentsChange={(taxCents) =>
            dispatch({ type: 'SET_TAX', receiptId: receipt.id, taxCents })
          }
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor={`tip-${receipt.id}`}>Tip</Label>
          {!readOnly && receipt.tipCents > 0 ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() =>
                dispatch({ type: 'SET_TIP', receiptId: receipt.id, tipCents: 0 })
              }
            >
              No tip
            </Button>
          ) : null}
        </div>
        <MoneyInput
          id={`tip-${receipt.id}`}
          cents={receipt.tipCents}
          disabled={readOnly}
          onCentsChange={(tipCents) =>
            dispatch({ type: 'SET_TIP', receiptId: receipt.id, tipCents })
          }
        />
      </div>
    </div>
  )
}

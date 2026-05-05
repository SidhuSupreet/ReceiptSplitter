import { AlertCircle, Trash2, UsersRound } from 'lucide-react'

import { PersonPill } from '@/features/people/PersonPill'
import type { LineItem } from '@/features/session/types'
import { useSession } from '@/features/session/useSession'
import { MoneyInput } from '@/shared/components/MoneyInput'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { cn } from '@/shared/utils/cn'
import { formatCents } from '@/shared/utils/money'

type ItemRowProps = {
  item: LineItem
  receiptId: string
  readOnly?: boolean
}

export function ItemRow({ item, receiptId, readOnly = false }: ItemRowProps) {
  const { session, dispatch } = useSession()
  const unassigned = item.assignedTo.length === 0
  const lineTotal = item.priceCents * item.quantity

  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-colors',
        unassigned
          ? 'border-amber-400/60 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-950/30'
          : 'border-(--color-border) bg-(--color-card)',
      )}
    >
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 sm:gap-3">
        <Input
          aria-label="Item name"
          value={item.name}
          placeholder="Item name"
          disabled={readOnly}
          onChange={(e) =>
            dispatch({
              type: 'UPDATE_ITEM',
              receiptId,
              itemId: item.id,
              patch: { name: e.target.value },
            })
          }
          className="min-w-0"
        />
        <MoneyInput
          aria-label="Unit price"
          cents={item.priceCents}
          disabled={readOnly}
          onCentsChange={(priceCents) =>
            dispatch({
              type: 'UPDATE_ITEM',
              receiptId,
              itemId: item.id,
              patch: { priceCents },
            })
          }
          className="w-24 text-right"
        />
        <Input
          aria-label="Quantity"
          type="number"
          inputMode="numeric"
          min={1}
          value={item.quantity}
          disabled={readOnly}
          onChange={(e) => {
            const n = Math.max(1, Math.floor(Number(e.target.value) || 1))
            dispatch({
              type: 'UPDATE_ITEM',
              receiptId,
              itemId: item.id,
              patch: { quantity: n },
            })
          }}
          className="w-16 text-center"
        />
        {!readOnly ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Remove item"
            onClick={() => dispatch({ type: 'REMOVE_ITEM', receiptId, itemId: item.id })}
          >
            <Trash2 className="size-4 text-(--color-muted-foreground)" />
          </Button>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {unassigned ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
            <AlertCircle className="size-3.5" />
            Unassigned
          </span>
        ) : null}

        {session.people.length === 0 ? (
          <span className="text-xs text-(--color-muted-foreground)">
            Add people to assign this item.
          </span>
        ) : (
          <>
            {session.people.map((person) => (
              <PersonPill
                key={person.id}
                person={person}
                size="sm"
                selected={item.assignedTo.includes(person.id)}
                disabled={readOnly}
                onClick={() =>
                  dispatch({
                    type: 'TOGGLE_ASSIGNMENT',
                    receiptId,
                    itemId: item.id,
                    personId: person.id,
                  })
                }
              />
            ))}
            {!readOnly && session.people.length > 1 ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={() =>
                  dispatch({ type: 'ASSIGN_ALL', receiptId, itemId: item.id })
                }
              >
                <UsersRound className="size-3.5" />
                All
              </Button>
            ) : null}
          </>
        )}

        <span className="ml-auto text-sm font-semibold tabular-nums">
          {formatCents(lineTotal)}
        </span>
      </div>

      {!readOnly ? (
        <div className="mt-3 flex items-center gap-2">
          <Checkbox
            id={`exclude-tax-tip-${item.id}`}
            checked={item.excludeFromTaxTip === true}
            onCheckedChange={(checked) =>
              dispatch({
                type: 'UPDATE_ITEM',
                receiptId,
                itemId: item.id,
                patch: { excludeFromTaxTip: checked === true },
              })
            }
          />
          <Label
            htmlFor={`exclude-tax-tip-${item.id}`}
            className="cursor-pointer text-xs font-normal text-(--color-muted-foreground)"
          >
            Off bill — not part of tax/tip split
          </Label>
        </div>
      ) : null}
    </div>
  )
}

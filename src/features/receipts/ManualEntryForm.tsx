import { Plus, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'

import type { LineItem } from '@/features/session/types'
import { MoneyInput } from '@/shared/components/MoneyInput'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { generateId } from '@/shared/utils/id'

type DraftItem = Pick<LineItem, 'id' | 'name' | 'priceCents' | 'quantity'>

export type ManualEntryResult = {
  label: string
  items: Array<{ name: string; priceCents: number; quantity: number }>
  taxCents: number
  tipCents: number
}

type ManualEntryFormProps = {
  defaultLabel?: string
  initialItems?: Array<{ name: string; priceCents: number; quantity: number }>
  initialTaxCents?: number
  initialTipCents?: number
  onSubmit: (result: ManualEntryResult) => void
  onCancel: () => void
}

function makeRow(item?: Partial<DraftItem>): DraftItem {
  return {
    id: item?.id ?? generateId(),
    name: item?.name ?? '',
    priceCents: item?.priceCents ?? 0,
    quantity: item?.quantity ?? 1,
  }
}

function rowsFromInitial(
  items?: Array<{ name: string; priceCents: number; quantity: number }>,
): DraftItem[] {
  if (!items || items.length === 0) return [makeRow()]
  return items.map((i) => makeRow(i))
}

export function ManualEntryForm({
  defaultLabel = '',
  initialItems,
  initialTaxCents = 0,
  initialTipCents = 0,
  onSubmit,
  onCancel,
}: ManualEntryFormProps) {
  const [label, setLabel] = useState(defaultLabel)
  const [rows, setRows] = useState<DraftItem[]>(() => rowsFromInitial(initialItems))
  const [taxCents, setTaxCents] = useState(initialTaxCents)
  const [tipCents, setTipCents] = useState(initialTipCents)

  function patchRow(id: string, patch: Partial<DraftItem>) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function removeRow(id: string) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((row) => row.id !== id)))
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const items = rows
      .filter((r) => r.name.trim() !== '' || r.priceCents > 0)
      .map((r) => ({
        name: r.name.trim() || 'Untitled item',
        priceCents: r.priceCents,
        quantity: Math.max(1, r.quantity),
      }))
    onSubmit({
      label: label.trim() || 'Untitled receipt',
      items,
      taxCents,
      tipCents,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="receipt-label">Receipt label</Label>
        <Input
          id="receipt-label"
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Friday dinner"
        />
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_5.5rem_3.5rem_2.25rem] gap-2 text-xs font-medium text-(--color-muted-foreground)">
          <span>Item</span>
          <span className="text-right">Price</span>
          <span className="text-center">Qty</span>
          <span />
        </div>
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="grid grid-cols-[1fr_5.5rem_3.5rem_2.25rem] items-center gap-2"
            >
              <Input
                aria-label="Item name"
                value={row.name}
                placeholder="Item name"
                onChange={(e) => patchRow(row.id, { name: e.target.value })}
              />
              <MoneyInput
                aria-label="Unit price"
                cents={row.priceCents}
                onCentsChange={(priceCents) => patchRow(row.id, { priceCents })}
                className="text-right"
              />
              <Input
                aria-label="Quantity"
                type="number"
                min={1}
                value={row.quantity}
                onChange={(e) =>
                  patchRow(row.id, {
                    quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)),
                  })
                }
                className="text-center"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove row"
                disabled={rows.length === 1}
                onClick={() => removeRow(row.id)}
              >
                <Trash2 className="size-4 text-(--color-muted-foreground)" />
              </Button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setRows((prev) => [...prev, makeRow()])}
        >
          <Plus className="size-4" />
          Add item
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="manual-tax">Tax</Label>
          <MoneyInput id="manual-tax" cents={taxCents} onCentsChange={setTaxCents} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="manual-tip">Tip</Label>
          <MoneyInput id="manual-tip" cents={tipCents} onCentsChange={setTipCents} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Add receipt</Button>
      </div>
    </form>
  )
}

import type { LineItem, Receipt } from '@/features/session/types'
import { splitEvenly } from '@/shared/utils/money'

/**
 * Per-person assigned subtotals for items matching `includeItem`.
 * Unassigned lines are skipped.
 */
export function itemSubtotalsByPerson(
  receipt: Receipt,
  includeItem: (item: LineItem) => boolean = () => true,
): Map<string, number> {
  const subtotals = new Map<string, number>()
  for (const item of receipt.items) {
    if (!includeItem(item)) continue
    if (item.assignedTo.length === 0) continue
    const lineTotal = item.priceCents * item.quantity
    const parts = splitEvenly(lineTotal, item.assignedTo.length)
    item.assignedTo.forEach((personId, i) => {
      subtotals.set(personId, (subtotals.get(personId) ?? 0) + parts[i])
    })
  }
  return subtotals
}

/**
 * Subtotals used to prorate tax/tip: same people as all assigned items, but only
 * bill (non-excluded) amounts count toward weights. Zeros ensure the “all off-bill”
 * case still splits tax/tip evenly across people on the receipt.
 */
export function taxTipProrationSubtotalsByPerson(receipt: Receipt): Map<string, number> {
  const full = itemSubtotalsByPerson(receipt)
  const bill = itemSubtotalsByPerson(receipt, (i) => !i.excludeFromTaxTip)
  const result = new Map<string, number>()
  for (const personId of full.keys()) {
    result.set(personId, bill.get(personId) ?? 0)
  }
  return result
}

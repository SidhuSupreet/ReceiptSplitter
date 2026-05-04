import type { Receipt } from '@/features/session/types'

export function receiptSubtotal(receipt: Receipt): number {
  return receipt.items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0)
}

export function receiptTotal(receipt: Receipt): number {
  return receiptSubtotal(receipt) + receipt.taxCents + receipt.tipCents
}

export function totalPaid(receipt: Receipt): number {
  return receipt.payments.reduce((sum, p) => sum + p.amountCents, 0)
}

export function unallocatedRemainder(receipt: Receipt): number {
  return receiptTotal(receipt) - totalPaid(receipt)
}

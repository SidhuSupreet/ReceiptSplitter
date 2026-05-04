import type { PersonBalance, Settlement } from '@/features/session/types'

const ZERO_TOLERANCE = 0

/**
 * Greedy minimal-payment settlement.
 *
 * Pairs the largest debtor with the largest creditor on each iteration,
 * transferring `min(|debtor.net|, creditor.net)` until all balances are zero.
 *
 * Result has at most N − 1 settlements for N participants whose balances sum to zero.
 */
export function computeSettlements(balances: PersonBalance[]): Settlement[] {
  const debtors = balances
    .filter((b) => b.netCents < -ZERO_TOLERANCE)
    .map((b) => ({ personId: b.personId, amount: -b.netCents }))
    .sort((a, b) => b.amount - a.amount)

  const creditors = balances
    .filter((b) => b.netCents > ZERO_TOLERANCE)
    .map((b) => ({ personId: b.personId, amount: b.netCents }))
    .sort((a, b) => b.amount - a.amount)

  const settlements: Settlement[] = []

  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0]
    const creditor = creditors[0]
    const transfer = Math.min(debtor.amount, creditor.amount)
    if (transfer <= 0) break

    settlements.push({
      fromPersonId: debtor.personId,
      toPersonId: creditor.personId,
      amountCents: transfer,
    })

    debtor.amount -= transfer
    creditor.amount -= transfer

    if (debtor.amount === 0) debtors.shift()
    if (creditor.amount === 0) creditors.shift()
  }

  return settlements
}

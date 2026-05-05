import type { PersonBalance, Session } from '@/features/session/types'

import { itemSubtotalsByPerson, taxTipProrationSubtotalsByPerson } from './itemSubtotalsByPerson'
import { prorateExtras } from './prorateExtras'

/**
 * Computes per-person paid/owed/net balances across all receipts in the session.
 *
 * For each receipt:
 *   - Each item's price * quantity is split among its assigned people.
 *   - Tax + tip are prorated in proportion to bill item subtotals (lines not excluded).
 *   - Payments record what each person actually paid.
 *
 * Net = paid − owed (positive => they're owed money back).
 *
 * The function reconciles cumulative rounding remainders so that
 * `Σ netCents === 0` for each receipt and overall.
 */
export function computeBalances(session: Session): PersonBalance[] {
  const owed = new Map<string, number>()
  const paid = new Map<string, number>()
  for (const person of session.people) {
    owed.set(person.id, 0)
    paid.set(person.id, 0)
  }

  for (const receipt of session.receipts) {
    const itemSubtotals = itemSubtotalsByPerson(receipt)
    const prorationBase = taxTipProrationSubtotalsByPerson(receipt)
    const extras = prorateExtras(prorationBase, receipt.taxCents + receipt.tipCents)

    for (const [personId, sub] of itemSubtotals) {
      owed.set(personId, (owed.get(personId) ?? 0) + sub)
    }
    for (const [personId, extra] of extras) {
      owed.set(personId, (owed.get(personId) ?? 0) + extra)
    }
    for (const payment of receipt.payments) {
      paid.set(payment.personId, (paid.get(payment.personId) ?? 0) + payment.amountCents)
    }
  }

  const balances: PersonBalance[] = session.people.map((person) => {
    const paidCents = paid.get(person.id) ?? 0
    const owedCents = owed.get(person.id) ?? 0
    return {
      personId: person.id,
      paidCents,
      owedCents,
      netCents: paidCents - owedCents,
    }
  })

  // Reconcile cumulative rounding so net sums to exactly zero.
  const netSum = balances.reduce((acc, b) => acc + b.netCents, 0)
  if (netSum !== 0 && balances.length > 0) {
    balances[0].netCents -= netSum
    balances[0].owedCents += netSum
  }

  return balances
}

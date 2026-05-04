import { receiptSubtotal } from '@/features/receipts/receiptTotals'
import type { Session } from '@/features/session/types'
import { computeBalances } from '@/features/settlement/computeBalances'
import { computeSettlements } from '@/features/settlement/computeSettlements'
import { prorateExtras } from '@/features/settlement/prorateExtras'
import { centsToDollars, splitEvenly } from '@/shared/utils/money'

export type ExportItemRow = {
  Receipt: string
  Item: string
  Person: string
  'Unit Price': string
  Qty: number
  'Item Share': string
  'Tax Share': string
  'Tip Share': string
  Total: string
}

export type ExportPersonRow = {
  Person: string
  Paid: string
  Owed: string
  Net: string
}

export type ExportSettlementRow = {
  From: string
  To: string
  Amount: string
}

export type ExportData = {
  itemRows: ExportItemRow[]
  personRows: ExportPersonRow[]
  settlementRows: ExportSettlementRow[]
}

const NO_ONE = 'Unassigned'

function formatDollars(cents: number): string {
  return centsToDollars(cents)
}

export function buildExportData(session: Session): ExportData {
  const peopleById = new Map(session.people.map((p) => [p.id, p]))
  const itemRows: ExportItemRow[] = []

  for (const receipt of session.receipts) {
    const subtotal = receiptSubtotal(receipt)
    const itemSubtotalsByPerson = new Map<string, number>()
    for (const item of receipt.items) {
      if (item.assignedTo.length === 0) continue
      const lineTotal = item.priceCents * item.quantity
      const parts = splitEvenly(lineTotal, item.assignedTo.length)
      item.assignedTo.forEach((personId, i) => {
        itemSubtotalsByPerson.set(
          personId,
          (itemSubtotalsByPerson.get(personId) ?? 0) + parts[i],
        )
      })
    }
    const taxByPerson = prorateExtras(itemSubtotalsByPerson, receipt.taxCents)
    const tipByPerson = prorateExtras(itemSubtotalsByPerson, receipt.tipCents)
    const personItemTotals = new Map<string, number>()

    for (const item of receipt.items) {
      const lineTotal = item.priceCents * item.quantity
      if (item.assignedTo.length === 0) {
        itemRows.push({
          Receipt: receipt.label,
          Item: item.name || 'Untitled item',
          Person: NO_ONE,
          'Unit Price': formatDollars(item.priceCents),
          Qty: item.quantity,
          'Item Share': formatDollars(lineTotal),
          'Tax Share': '0.00',
          'Tip Share': '0.00',
          Total: formatDollars(lineTotal),
        })
        continue
      }
      const parts = splitEvenly(lineTotal, item.assignedTo.length)
      item.assignedTo.forEach((personId, i) => {
        const person = peopleById.get(personId)
        const share = parts[i]
        personItemTotals.set(personId, (personItemTotals.get(personId) ?? 0) + share)
        itemRows.push({
          Receipt: receipt.label,
          Item: item.name || 'Untitled item',
          Person: person?.name ?? '(unknown)',
          'Unit Price': formatDollars(item.priceCents),
          Qty: item.quantity,
          'Item Share': formatDollars(share),
          'Tax Share': '',
          'Tip Share': '',
          Total: '',
        })
      })
    }

    // Append per-person tax/tip allocation row(s) for the receipt.
    for (const personId of itemSubtotalsByPerson.keys()) {
      const person = peopleById.get(personId)
      if (!person) continue
      const tax = taxByPerson.get(personId) ?? 0
      const tip = tipByPerson.get(personId) ?? 0
      const items = personItemTotals.get(personId) ?? 0
      itemRows.push({
        Receipt: receipt.label,
        Item: '— receipt total —',
        Person: person.name,
        'Unit Price': '',
        Qty: 0,
        'Item Share': formatDollars(items),
        'Tax Share': formatDollars(tax),
        'Tip Share': formatDollars(tip),
        Total: formatDollars(items + tax + tip),
      })
    }

    if (subtotal === 0 && receipt.items.length > 0) {
      // No-op: nothing to allocate.
    }
  }

  const balances = computeBalances(session)
  const personRows: ExportPersonRow[] = balances.map((b) => {
    const person = peopleById.get(b.personId)
    const sign = b.netCents > 0 ? '+' : ''
    return {
      Person: person?.name ?? '(unknown)',
      Paid: formatDollars(b.paidCents),
      Owed: formatDollars(b.owedCents),
      Net: `${sign}${formatDollars(b.netCents)}`,
    }
  })

  const settlements = computeSettlements(balances)
  const settlementRows: ExportSettlementRow[] = settlements.map((s) => ({
    From: peopleById.get(s.fromPersonId)?.name ?? '(unknown)',
    To: peopleById.get(s.toPersonId)?.name ?? '(unknown)',
    Amount: formatDollars(s.amountCents),
  }))

  return { itemRows, personRows, settlementRows }
}

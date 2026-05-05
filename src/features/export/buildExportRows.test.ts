import { describe, expect, it } from 'vitest'

import type { Session } from '@/features/session/types'

import { buildExportData } from './buildExportRows'

const session: Session = {
  id: 'sess',
  createdAt: new Date(0).toISOString(),
  people: [
    { id: 'a', name: 'Alex' },
    { id: 'b', name: 'Jordan' },
  ],
  receipts: [
    {
      id: 'r1',
      label: 'Dinner',
      items: [
        {
          id: 'i1',
          receiptId: 'r1',
          name: 'Burger',
          priceCents: 1000,
          quantity: 1,
          assignedTo: ['a'],
        },
        {
          id: 'i2',
          receiptId: 'r1',
          name: 'Salad',
          priceCents: 800,
          quantity: 1,
          assignedTo: ['b'],
        },
      ],
      taxCents: 200,
      tipCents: 0,
      payments: [{ personId: 'a', amountCents: 2000 }],
    },
  ],
}

describe('buildExportData', () => {
  it('emits a row per person per item', () => {
    const data = buildExportData(session)
    const itemOnly = data.itemRows.filter((r) => r.Item !== '— receipt total —')
    expect(itemOnly).toHaveLength(2)
    expect(itemOnly[0].Person).toBe('Alex')
  })

  it('produces a person totals row with paid/owed/net', () => {
    const data = buildExportData(session)
    expect(data.personRows).toHaveLength(2)
    const alex = data.personRows.find((r) => r.Person === 'Alex')!
    expect(alex.Paid).toBe('20.00')
  })

  it('lists settlements when balances are non-zero', () => {
    const data = buildExportData(session)
    expect(data.settlementRows.length).toBeGreaterThan(0)
    expect(data.settlementRows[0].From).toBe('Jordan')
    expect(data.settlementRows[0].To).toBe('Alex')
  })

  it('allocates tax using on-bill items only for receipt totals row', () => {
    const sessionOffBill: Session = {
      id: 'sess',
      createdAt: new Date(0).toISOString(),
      people: [
        { id: 'a', name: 'Alex' },
        { id: 'b', name: 'Jordan' },
      ],
      receipts: [
        {
          id: 'r1',
          label: 'Dinner',
          items: [
            {
              id: 'i1',
              receiptId: 'r1',
              name: 'Burger',
              priceCents: 6000,
              quantity: 1,
              assignedTo: ['a'],
            },
            {
              id: 'i2',
              receiptId: 'r1',
              name: 'Side deal',
              priceCents: 4000,
              quantity: 1,
              assignedTo: ['b'],
              excludeFromTaxTip: true,
            },
          ],
          taxCents: 1000,
          tipCents: 0,
          payments: [],
        },
      ],
    }
    const data = buildExportData(sessionOffBill)
    const totals = data.itemRows.filter((r) => r.Item === '— receipt total —')
    const alex = totals.find((r) => r.Person === 'Alex')!
    const jordan = totals.find((r) => r.Person === 'Jordan')!
    expect(alex['Tax Share']).toBe('10.00')
    expect(jordan['Tax Share']).toBe('0.00')
  })
})

import { describe, expect, it } from 'vitest'

import type { Person, Session } from '@/features/session/types'

import { computeBalances } from './computeBalances'
import { computeSettlements } from './computeSettlements'
import { prorateExtras } from './prorateExtras'

function makePeople(...names: string[]): Person[] {
  return names.map((name) => ({ id: `id-${name}`, name }))
}

function buildSession(people: Person[], receipts: Session['receipts']): Session {
  return {
    id: 'test-session',
    people,
    receipts,
    createdAt: new Date(0).toISOString(),
  }
}

describe('prorateExtras', () => {
  it('splits proportionally to subtotals', () => {
    const subs = new Map([
      ['a', 6000],
      ['b', 4000],
    ])
    const result = prorateExtras(subs, 1000)
    expect(result.get('a')).toBe(600)
    expect(result.get('b')).toBe(400)
  })

  it('reconciles rounding remainder so the parts sum exactly', () => {
    const subs = new Map([
      ['a', 1000],
      ['b', 1000],
      ['c', 1000],
    ])
    const result = prorateExtras(subs, 100)
    const total = Array.from(result.values()).reduce((a, b) => a + b, 0)
    expect(total).toBe(100)
  })

  it('splits evenly when all subtotals are zero', () => {
    const subs = new Map([
      ['a', 0],
      ['b', 0],
    ])
    const result = prorateExtras(subs, 99)
    expect(result.get('a')).toBe(50)
    expect(result.get('b')).toBe(49)
  })

  it('returns zeros when extras are zero', () => {
    const subs = new Map([['a', 1000]])
    expect(prorateExtras(subs, 0).get('a')).toBe(0)
  })
})

describe('computeBalances + computeSettlements', () => {
  it('matches the spec example', () => {
    const [alex, jordan, sam] = makePeople('Alex', 'Jordan', 'Sam')
    // Alex paid $80, Jordan paid $0, Sam paid $40 — items shared so totals are:
    //   Alex owes 4500, Jordan owes 3800, Sam owes 3700 (cents)
    // We construct a receipt that produces those owed values.
    // Items: $45 (Alex only), $38 (Jordan only), $37 (Sam only) = $120 total.
    // Payments: Alex $80, Sam $40 (Alex paid for Jordan).
    const session = buildSession(
      [alex, jordan, sam],
      [
        {
          id: 'r1',
          label: 'Trip',
          items: [
            {
              id: 'i1',
              receiptId: 'r1',
              name: 'Alex item',
              priceCents: 4500,
              quantity: 1,
              assignedTo: [alex.id],
            },
            {
              id: 'i2',
              receiptId: 'r1',
              name: 'Jordan item',
              priceCents: 3800,
              quantity: 1,
              assignedTo: [jordan.id],
            },
            {
              id: 'i3',
              receiptId: 'r1',
              name: 'Sam item',
              priceCents: 3700,
              quantity: 1,
              assignedTo: [sam.id],
            },
          ],
          taxCents: 0,
          tipCents: 0,
          payments: [
            { personId: alex.id, amountCents: 8000 },
            { personId: sam.id, amountCents: 4000 },
          ],
        },
      ],
    )

    const balances = computeBalances(session)
    const byId = (id: string) => balances.find((b) => b.personId === id)!
    expect(byId(alex.id).netCents).toBe(3500)
    expect(byId(jordan.id).netCents).toBe(-3800)
    expect(byId(sam.id).netCents).toBe(300)

    const settlements = computeSettlements(balances)
    expect(settlements).toHaveLength(2)
    // Largest debtor (Jordan) pays largest creditor (Alex) first.
    expect(settlements[0]).toEqual({
      fromPersonId: jordan.id,
      toPersonId: alex.id,
      amountCents: 3500,
    })
    expect(settlements[1]).toEqual({
      fromPersonId: jordan.id,
      toPersonId: sam.id,
      amountCents: 300,
    })
  })

  it('splits a shared item evenly across people', () => {
    const [a, b, c] = makePeople('A', 'B', 'C')
    const session = buildSession(
      [a, b, c],
      [
        {
          id: 'r',
          label: 'Pizza',
          items: [
            {
              id: 'i',
              receiptId: 'r',
              name: 'Large pizza',
              priceCents: 1000,
              quantity: 1,
              assignedTo: [a.id, b.id, c.id],
            },
          ],
          taxCents: 0,
          tipCents: 0,
          payments: [{ personId: a.id, amountCents: 1000 }],
        },
      ],
    )
    const balances = computeBalances(session)
    expect(balances.find((x) => x.personId === a.id)!.owedCents).toBe(334)
    expect(balances.find((x) => x.personId === b.id)!.owedCents).toBe(333)
    expect(balances.find((x) => x.personId === c.id)!.owedCents).toBe(333)
    const sum = balances.reduce((acc, x) => acc + x.netCents, 0)
    expect(sum).toBe(0)
  })

  it('prorates tax and tip in proportion to item subtotals', () => {
    const [a, b] = makePeople('A', 'B')
    const session = buildSession(
      [a, b],
      [
        {
          id: 'r',
          label: 'Dinner',
          items: [
            {
              id: 'i1',
              receiptId: 'r',
              name: "A's burger",
              priceCents: 6000,
              quantity: 1,
              assignedTo: [a.id],
            },
            {
              id: 'i2',
              receiptId: 'r',
              name: "B's salad",
              priceCents: 4000,
              quantity: 1,
              assignedTo: [b.id],
            },
          ],
          taxCents: 1000,
          tipCents: 0,
          payments: [{ personId: a.id, amountCents: 11000 }],
        },
      ],
    )
    const balances = computeBalances(session)
    expect(balances.find((x) => x.personId === a.id)!.owedCents).toBe(6600)
    expect(balances.find((x) => x.personId === b.id)!.owedCents).toBe(4400)
  })

  it('returns no settlements for an empty or balanced session', () => {
    const [a, b] = makePeople('A', 'B')
    const session = buildSession([a, b], [])
    const balances = computeBalances(session)
    expect(computeSettlements(balances)).toEqual([])
  })

  it('handles a single person', () => {
    const [a] = makePeople('A')
    const session = buildSession(
      [a],
      [
        {
          id: 'r',
          label: 'Solo',
          items: [
            {
              id: 'i',
              receiptId: 'r',
              name: 'Coffee',
              priceCents: 500,
              quantity: 1,
              assignedTo: [a.id],
            },
          ],
          taxCents: 0,
          tipCents: 0,
          payments: [{ personId: a.id, amountCents: 500 }],
        },
      ],
    )
    const balances = computeBalances(session)
    expect(balances[0].netCents).toBe(0)
    expect(computeSettlements(balances)).toEqual([])
  })

  it('settlement count is at most N - 1', () => {
    const [a, b, c, d] = makePeople('A', 'B', 'C', 'D')
    const session = buildSession(
      [a, b, c, d],
      [
        {
          id: 'r',
          label: 'Big',
          items: [
            {
              id: 'i',
              receiptId: 'r',
              name: 'Group meal',
              priceCents: 4000,
              quantity: 1,
              assignedTo: [a.id, b.id, c.id, d.id],
            },
          ],
          taxCents: 0,
          tipCents: 0,
          payments: [{ personId: a.id, amountCents: 4000 }],
        },
      ],
    )
    const settlements = computeSettlements(computeBalances(session))
    expect(settlements.length).toBeLessThanOrEqual(3)
  })
})

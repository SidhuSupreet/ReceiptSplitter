import { describe, expect, it } from 'vitest'

import { createEmptySession, sessionReducer } from './sessionReducer'
import type { Session } from './types'

function seedSession(): Session {
  let s = createEmptySession()
  s = sessionReducer(s, { type: 'ADD_PERSON', name: 'Alex' })
  s = sessionReducer(s, { type: 'ADD_PERSON', name: 'Jordan' })
  s = sessionReducer(s, { type: 'ADD_RECEIPT' })
  return s
}

describe('sessionReducer — people', () => {
  it('adds a trimmed person', () => {
    const s = sessionReducer(createEmptySession(), {
      type: 'ADD_PERSON',
      name: '  Alex  ',
    })
    expect(s.people).toHaveLength(1)
    expect(s.people[0].name).toBe('Alex')
  })

  it('ignores empty names', () => {
    const s = sessionReducer(createEmptySession(), { type: 'ADD_PERSON', name: '   ' })
    expect(s.people).toHaveLength(0)
  })

  it('adds multiple people in one action', () => {
    const s = sessionReducer(createEmptySession(), {
      type: 'ADD_PEOPLE',
      names: ['Alex', '', 'Jordan', 'Sam'],
    })
    expect(s.people.map((p) => p.name)).toEqual(['Alex', 'Jordan', 'Sam'])
  })

  it('renames a person', () => {
    const seeded = seedSession()
    const target = seeded.people[0]
    const s = sessionReducer(seeded, {
      type: 'RENAME_PERSON',
      personId: target.id,
      name: 'Alexandra',
    })
    expect(s.people[0].name).toBe('Alexandra')
  })

  it('removes person and clears their assignments and payments', () => {
    let s = seedSession()
    const [alex, jordan] = s.people
    const receipt = s.receipts[0]
    s = sessionReducer(s, { type: 'ADD_ITEM', receiptId: receipt.id })
    const item = s.receipts[0].items[0]
    s = sessionReducer(s, {
      type: 'TOGGLE_ASSIGNMENT',
      receiptId: receipt.id,
      itemId: item.id,
      personId: alex.id,
    })
    s = sessionReducer(s, {
      type: 'TOGGLE_ASSIGNMENT',
      receiptId: receipt.id,
      itemId: item.id,
      personId: jordan.id,
    })
    s = sessionReducer(s, {
      type: 'UPSERT_PAYMENT',
      receiptId: receipt.id,
      personId: alex.id,
      amountCents: 5000,
    })

    s = sessionReducer(s, { type: 'REMOVE_PERSON', personId: alex.id })

    expect(s.people).toHaveLength(1)
    expect(s.receipts[0].items[0].assignedTo).toEqual([jordan.id])
    expect(s.receipts[0].payments).toHaveLength(0)
  })
})

describe('sessionReducer — receipts and items', () => {
  it('auto-labels new receipts incrementally', () => {
    let s = createEmptySession()
    s = sessionReducer(s, { type: 'ADD_RECEIPT' })
    s = sessionReducer(s, { type: 'ADD_RECEIPT' })
    expect(s.receipts.map((r) => r.label)).toEqual(['Receipt 1', 'Receipt 2'])
  })

  it('renames a receipt', () => {
    let s = seedSession()
    const id = s.receipts[0].id
    s = sessionReducer(s, {
      type: 'RENAME_RECEIPT',
      receiptId: id,
      label: 'Friday Dinner',
    })
    expect(s.receipts[0].label).toBe('Friday Dinner')
  })

  it('updates an item with patch fields', () => {
    let s = seedSession()
    const receiptId = s.receipts[0].id
    s = sessionReducer(s, { type: 'ADD_ITEM', receiptId })
    const itemId = s.receipts[0].items[0].id
    s = sessionReducer(s, {
      type: 'UPDATE_ITEM',
      receiptId,
      itemId,
      patch: { name: 'Pizza', priceCents: 1599, quantity: 2 },
    })
    expect(s.receipts[0].items[0]).toMatchObject({
      name: 'Pizza',
      priceCents: 1599,
      quantity: 2,
    })
  })

  it('toggles assignment on and off', () => {
    let s = seedSession()
    const receiptId = s.receipts[0].id
    s = sessionReducer(s, { type: 'ADD_ITEM', receiptId })
    const itemId = s.receipts[0].items[0].id
    const personId = s.people[0].id

    s = sessionReducer(s, { type: 'TOGGLE_ASSIGNMENT', receiptId, itemId, personId })
    expect(s.receipts[0].items[0].assignedTo).toEqual([personId])

    s = sessionReducer(s, { type: 'TOGGLE_ASSIGNMENT', receiptId, itemId, personId })
    expect(s.receipts[0].items[0].assignedTo).toEqual([])
  })

  it('assigns to all people', () => {
    let s = seedSession()
    const receiptId = s.receipts[0].id
    s = sessionReducer(s, { type: 'ADD_ITEM', receiptId })
    const itemId = s.receipts[0].items[0].id

    s = sessionReducer(s, { type: 'ASSIGN_ALL', receiptId, itemId })
    expect(s.receipts[0].items[0].assignedTo).toEqual(s.people.map((p) => p.id))
  })

  it('clamps tax and tip to non-negative integers', () => {
    let s = seedSession()
    const receiptId = s.receipts[0].id
    s = sessionReducer(s, { type: 'SET_TAX', receiptId, taxCents: -500 })
    s = sessionReducer(s, { type: 'SET_TIP', receiptId, tipCents: 199.6 })
    expect(s.receipts[0].taxCents).toBe(0)
    expect(s.receipts[0].tipCents).toBe(200)
  })
})

describe('sessionReducer — payments', () => {
  it('upserts a payment then updates it', () => {
    let s = seedSession()
    const receiptId = s.receipts[0].id
    const personId = s.people[0].id
    s = sessionReducer(s, {
      type: 'UPSERT_PAYMENT',
      receiptId,
      personId,
      amountCents: 1000,
    })
    s = sessionReducer(s, {
      type: 'UPSERT_PAYMENT',
      receiptId,
      personId,
      amountCents: 2500,
    })
    expect(s.receipts[0].payments).toEqual([{ personId, amountCents: 2500 }])
  })

  it('removes a payment when amount is set to 0', () => {
    let s = seedSession()
    const receiptId = s.receipts[0].id
    const personId = s.people[0].id
    s = sessionReducer(s, {
      type: 'UPSERT_PAYMENT',
      receiptId,
      personId,
      amountCents: 1000,
    })
    s = sessionReducer(s, {
      type: 'UPSERT_PAYMENT',
      receiptId,
      personId,
      amountCents: 0,
    })
    expect(s.receipts[0].payments).toHaveLength(0)
  })
})

describe('sessionReducer — load and reset', () => {
  it('replaces state with LOAD_SESSION', () => {
    const s = sessionReducer(seedSession(), {
      type: 'LOAD_SESSION',
      session: createEmptySession(),
    })
    expect(s.people).toHaveLength(0)
    expect(s.receipts).toHaveLength(0)
  })

  it('resets to a fresh empty session', () => {
    const original = seedSession()
    const s = sessionReducer(original, { type: 'RESET' })
    expect(s.id).not.toBe(original.id)
    expect(s.people).toEqual([])
    expect(s.receipts).toEqual([])
  })
})

import { generateId } from '@/shared/utils/id'

import type { LineItem, Payment, Person, Receipt, Session } from './types'

export type SessionAction =
  | { type: 'ADD_PERSON'; name: string }
  | { type: 'ADD_PEOPLE'; names: string[] }
  | { type: 'REMOVE_PERSON'; personId: string }
  | { type: 'RENAME_PERSON'; personId: string; name: string }
  | { type: 'ADD_RECEIPT'; receipt?: Partial<Receipt> }
  | { type: 'REMOVE_RECEIPT'; receiptId: string }
  | { type: 'RENAME_RECEIPT'; receiptId: string; label: string }
  | { type: 'SET_RECEIPT_IMAGE'; receiptId: string; imageDataUrl: string | undefined }
  | { type: 'REPLACE_RECEIPT_ITEMS'; receiptId: string; items: LineItem[] }
  | { type: 'ADD_ITEM'; receiptId: string; item?: Partial<LineItem> }
  | {
      type: 'UPDATE_ITEM'
      receiptId: string
      itemId: string
      patch: Partial<Omit<LineItem, 'id' | 'receiptId'>>
    }
  | { type: 'REMOVE_ITEM'; receiptId: string; itemId: string }
  | {
      type: 'TOGGLE_ASSIGNMENT'
      receiptId: string
      itemId: string
      personId: string
    }
  | {
      type: 'ASSIGN_ALL'
      receiptId: string
      itemId: string
    }
  | { type: 'SET_TAX'; receiptId: string; taxCents: number }
  | { type: 'SET_TIP'; receiptId: string; tipCents: number }
  | {
      type: 'UPSERT_PAYMENT'
      receiptId: string
      personId: string
      amountCents: number
    }
  | { type: 'REMOVE_PAYMENT'; receiptId: string; personId: string }
  | { type: 'LOAD_SESSION'; session: Session }
  | { type: 'RESET' }

export function createEmptySession(): Session {
  return {
    id: generateId(),
    people: [],
    receipts: [],
    createdAt: new Date().toISOString(),
  }
}

function createEmptyReceipt(
  input: Partial<Receipt> = {},
  fallbackIndex: number,
): Receipt {
  const id = input.id || generateId()
  const items = (input.items ?? []).map<LineItem>((item) => ({
    id: item.id || generateId(),
    receiptId: id,
    name: item.name ?? '',
    priceCents: item.priceCents ?? 0,
    quantity: item.quantity ?? 1,
    assignedTo: item.assignedTo ?? [],
  }))
  return {
    id,
    label: input.label ?? `Receipt ${fallbackIndex}`,
    imageDataUrl: input.imageDataUrl,
    items,
    taxCents: input.taxCents ?? 0,
    tipCents: input.tipCents ?? 0,
    payments: input.payments ?? [],
  }
}

function createEmptyItem(receiptId: string, input: Partial<LineItem> = {}): LineItem {
  return {
    id: input.id ?? generateId(),
    receiptId,
    name: input.name ?? '',
    priceCents: input.priceCents ?? 0,
    quantity: input.quantity ?? 1,
    assignedTo: input.assignedTo ?? [],
  }
}

function mapReceipt(
  state: Session,
  receiptId: string,
  updater: (r: Receipt) => Receipt,
): Session {
  return {
    ...state,
    receipts: state.receipts.map((r) => (r.id === receiptId ? updater(r) : r)),
  }
}

function mapItem(
  receipt: Receipt,
  itemId: string,
  updater: (i: LineItem) => LineItem,
): Receipt {
  return {
    ...receipt,
    items: receipt.items.map((i) => (i.id === itemId ? updater(i) : i)),
  }
}

function upsertPayment(
  payments: Payment[],
  personId: string,
  amountCents: number,
): Payment[] {
  const existing = payments.findIndex((p) => p.personId === personId)
  if (existing === -1) return [...payments, { personId, amountCents }]
  const next = payments.slice()
  next[existing] = { personId, amountCents }
  return next
}

export function sessionReducer(state: Session, action: SessionAction): Session {
  switch (action.type) {
    case 'ADD_PERSON': {
      const trimmed = action.name.trim()
      if (!trimmed) return state
      const person: Person = { id: generateId(), name: trimmed }
      return { ...state, people: [...state.people, person] }
    }

    case 'ADD_PEOPLE': {
      const newPeople: Person[] = action.names
        .map((n) => n.trim())
        .filter(Boolean)
        .map((name) => ({ id: generateId(), name }))
      if (newPeople.length === 0) return state
      return { ...state, people: [...state.people, ...newPeople] }
    }

    case 'REMOVE_PERSON': {
      return {
        ...state,
        people: state.people.filter((p) => p.id !== action.personId),
        receipts: state.receipts.map((r) => ({
          ...r,
          items: r.items.map((i) => ({
            ...i,
            assignedTo: i.assignedTo.filter((id) => id !== action.personId),
          })),
          payments: r.payments.filter((p) => p.personId !== action.personId),
        })),
      }
    }

    case 'RENAME_PERSON': {
      const trimmed = action.name.trim()
      if (!trimmed) return state
      return {
        ...state,
        people: state.people.map((p) =>
          p.id === action.personId ? { ...p, name: trimmed } : p,
        ),
      }
    }

    case 'ADD_RECEIPT': {
      const receipt = createEmptyReceipt(action.receipt, state.receipts.length + 1)
      return { ...state, receipts: [...state.receipts, receipt] }
    }

    case 'REMOVE_RECEIPT': {
      return {
        ...state,
        receipts: state.receipts.filter((r) => r.id !== action.receiptId),
      }
    }

    case 'RENAME_RECEIPT': {
      const trimmed = action.label.trim()
      if (!trimmed) return state
      return mapReceipt(state, action.receiptId, (r) => ({ ...r, label: trimmed }))
    }

    case 'SET_RECEIPT_IMAGE': {
      return mapReceipt(state, action.receiptId, (r) => ({
        ...r,
        imageDataUrl: action.imageDataUrl,
      }))
    }

    case 'REPLACE_RECEIPT_ITEMS': {
      return mapReceipt(state, action.receiptId, (r) => ({
        ...r,
        items: action.items,
      }))
    }

    case 'ADD_ITEM': {
      const item = createEmptyItem(action.receiptId, action.item)
      return mapReceipt(state, action.receiptId, (r) => ({
        ...r,
        items: [...r.items, item],
      }))
    }

    case 'UPDATE_ITEM': {
      return mapReceipt(state, action.receiptId, (r) =>
        mapItem(r, action.itemId, (i) => ({ ...i, ...action.patch })),
      )
    }

    case 'REMOVE_ITEM': {
      return mapReceipt(state, action.receiptId, (r) => ({
        ...r,
        items: r.items.filter((i) => i.id !== action.itemId),
      }))
    }

    case 'TOGGLE_ASSIGNMENT': {
      return mapReceipt(state, action.receiptId, (r) =>
        mapItem(r, action.itemId, (i) => {
          const has = i.assignedTo.includes(action.personId)
          return {
            ...i,
            assignedTo: has
              ? i.assignedTo.filter((id) => id !== action.personId)
              : [...i.assignedTo, action.personId],
          }
        }),
      )
    }

    case 'ASSIGN_ALL': {
      return mapReceipt(state, action.receiptId, (r) =>
        mapItem(r, action.itemId, (i) => ({
          ...i,
          assignedTo: state.people.map((p) => p.id),
        })),
      )
    }

    case 'SET_TAX': {
      return mapReceipt(state, action.receiptId, (r) => ({
        ...r,
        taxCents: Math.max(0, Math.round(action.taxCents)),
      }))
    }

    case 'SET_TIP': {
      return mapReceipt(state, action.receiptId, (r) => ({
        ...r,
        tipCents: Math.max(0, Math.round(action.tipCents)),
      }))
    }

    case 'UPSERT_PAYMENT': {
      const amount = Math.max(0, Math.round(action.amountCents))
      return mapReceipt(state, action.receiptId, (r) => ({
        ...r,
        payments:
          amount === 0
            ? r.payments.filter((p) => p.personId !== action.personId)
            : upsertPayment(r.payments, action.personId, amount),
      }))
    }

    case 'REMOVE_PAYMENT': {
      return mapReceipt(state, action.receiptId, (r) => ({
        ...r,
        payments: r.payments.filter((p) => p.personId !== action.personId),
      }))
    }

    case 'LOAD_SESSION': {
      return action.session
    }

    case 'RESET': {
      return createEmptySession()
    }
  }
}

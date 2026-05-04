export type Person = {
  id: string
  name: string
}

export type LineItem = {
  id: string
  receiptId: string
  name: string
  priceCents: number
  quantity: number
  assignedTo: string[]
}

export type Payment = {
  personId: string
  amountCents: number
}

export type Receipt = {
  id: string
  label: string
  imageDataUrl?: string
  items: LineItem[]
  taxCents: number
  tipCents: number
  payments: Payment[]
}

export type Session = {
  id: string
  people: Person[]
  receipts: Receipt[]
  createdAt: string
}

export type PersonBalance = {
  personId: string
  owedCents: number
  paidCents: number
  netCents: number
}

export type Settlement = {
  fromPersonId: string
  toPersonId: string
  amountCents: number
}

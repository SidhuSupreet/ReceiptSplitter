const CENTS_PER_DOLLAR = 100

export function formatCents(cents: number, opts: { signed?: boolean } = {}): string {
  const sign = opts.signed && cents > 0 ? '+' : cents < 0 ? '-' : ''
  const absDollars = Math.abs(cents) / CENTS_PER_DOLLAR
  return `${sign}$${absDollars.toFixed(2)}`
}

export function dollarsToCents(input: string | number): number {
  if (typeof input === 'number') return Math.round(input * CENTS_PER_DOLLAR)
  const cleaned = input.replace(/[^0-9.-]/g, '').trim()
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return 0
  const parsed = Number.parseFloat(cleaned)
  if (Number.isNaN(parsed)) return 0
  return Math.round(parsed * CENTS_PER_DOLLAR)
}

export function centsToDollars(cents: number): string {
  return (cents / CENTS_PER_DOLLAR).toFixed(2)
}

/**
 * Splits `cents` into `count` integer parts that sum exactly to `cents`.
 * Remainder cents (1 each) are distributed to the first elements.
 *
 * splitEvenly(100, 3) => [34, 33, 33]
 * splitEvenly(101, 3) => [34, 34, 33]
 */
export function splitEvenly(cents: number, count: number): number[] {
  if (count <= 0) return []
  const base = Math.trunc(cents / count)
  const remainder = cents - base * count
  const remainderSign = remainder >= 0 ? 1 : -1
  const absRemainder = Math.abs(remainder)
  return Array.from({ length: count }, (_, i) =>
    i < absRemainder ? base + remainderSign : base,
  )
}

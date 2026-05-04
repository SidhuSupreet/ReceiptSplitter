import { describe, expect, it } from 'vitest'

import { centsToDollars, dollarsToCents, formatCents, splitEvenly } from './money'

describe('formatCents', () => {
  it('formats positive amounts as dollars', () => {
    expect(formatCents(1234)).toBe('$12.34')
  })

  it('formats zero', () => {
    expect(formatCents(0)).toBe('$0.00')
  })

  it('formats negative amounts with a leading minus', () => {
    expect(formatCents(-500)).toBe('-$5.00')
  })

  it('adds a leading + when signed is requested for positive amounts', () => {
    expect(formatCents(2500, { signed: true })).toBe('+$25.00')
    expect(formatCents(-2500, { signed: true })).toBe('-$25.00')
    expect(formatCents(0, { signed: true })).toBe('$0.00')
  })
})

describe('dollarsToCents', () => {
  it('rounds floats to nearest cent', () => {
    expect(dollarsToCents('12.345')).toBe(1235)
    expect(dollarsToCents('12.344')).toBe(1234)
  })

  it('handles strings with currency symbols', () => {
    expect(dollarsToCents('$12.50')).toBe(1250)
  })

  it('returns 0 for empty or non-numeric input', () => {
    expect(dollarsToCents('')).toBe(0)
    expect(dollarsToCents('abc')).toBe(0)
  })

  it('accepts numeric input', () => {
    expect(dollarsToCents(7.25)).toBe(725)
  })
})

describe('centsToDollars', () => {
  it('returns a fixed two-decimal string', () => {
    expect(centsToDollars(1234)).toBe('12.34')
    expect(centsToDollars(0)).toBe('0.00')
  })
})

describe('splitEvenly', () => {
  it('splits evenly when divisible', () => {
    expect(splitEvenly(900, 3)).toEqual([300, 300, 300])
  })

  it('distributes remainder to first elements', () => {
    expect(splitEvenly(100, 3)).toEqual([34, 33, 33])
    expect(splitEvenly(101, 3)).toEqual([34, 34, 33])
  })

  it('returns empty array for zero count', () => {
    expect(splitEvenly(100, 0)).toEqual([])
  })

  it('handles negative totals', () => {
    expect(splitEvenly(-100, 3)).toEqual([-34, -33, -33])
  })

  it('always sums back to the input', () => {
    for (const total of [1, 99, 100, 101, 333, 1000, 1234]) {
      for (const count of [1, 2, 3, 4, 5, 7]) {
        const parts = splitEvenly(total, count)
        expect(parts.reduce((a, b) => a + b, 0)).toBe(total)
      }
    }
  })
})

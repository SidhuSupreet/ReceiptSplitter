import { splitEvenly } from '@/shared/utils/money'

/**
 * Distributes `extrasCents` (tax + tip) across people in proportion to their
 * `subtotalsByPerson`. Uses integer math; any rounding remainder is added to
 * (or subtracted from) the first person to ensure the parts sum exactly to
 * `extrasCents`.
 *
 * If everyone's subtotal is zero, the extras are split evenly.
 */
export function prorateExtras(
  subtotalsByPerson: Map<string, number>,
  extrasCents: number,
): Map<string, number> {
  const result = new Map<string, number>()
  if (subtotalsByPerson.size === 0 || extrasCents === 0) {
    for (const personId of subtotalsByPerson.keys()) result.set(personId, 0)
    return result
  }

  const ids = Array.from(subtotalsByPerson.keys())
  const subtotals = ids.map((id) => subtotalsByPerson.get(id) ?? 0)
  const totalSubtotal = subtotals.reduce((a, b) => a + b, 0)

  if (totalSubtotal === 0) {
    const parts = splitEvenly(extrasCents, ids.length)
    ids.forEach((id, i) => result.set(id, parts[i]))
    return result
  }

  const exact = subtotals.map((s) => Math.trunc((s * extrasCents) / totalSubtotal))
  const distributed = exact.reduce((a, b) => a + b, 0)
  let remainder = extrasCents - distributed
  const remainderSign = remainder >= 0 ? 1 : -1
  let i = 0
  while (remainder !== 0 && i < ids.length * 2) {
    exact[i % ids.length] += remainderSign
    remainder -= remainderSign
    i += 1
  }

  ids.forEach((id, idx) => result.set(id, exact[idx]))
  return result
}

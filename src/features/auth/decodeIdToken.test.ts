import { describe, expect, it } from 'vitest'

import { decodeIdToken, isExpired } from './decodeIdToken'

function makeIdToken(claims: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify(claims))
  return `${header}.${payload}.signature-not-verified`
}

describe('decodeIdToken', () => {
  it('extracts email, name, picture, and exp from the payload', () => {
    const token = makeIdToken({
      email: 'user@example.com',
      name: 'Real Name',
      picture: 'https://example.com/avatar.png',
      exp: 1_900_000_000,
    })
    const user = decodeIdToken(token)
    expect(user).toEqual({
      email: 'user@example.com',
      name: 'Real Name',
      picture: 'https://example.com/avatar.png',
      exp: 1_900_000_000,
    })
  })

  it('returns null when required claims are missing', () => {
    const token = makeIdToken({ name: 'No Email' })
    expect(decodeIdToken(token)).toBeNull()
  })

  it('returns null for malformed tokens', () => {
    expect(decodeIdToken('not.a.valid.jwt')).toBeNull()
    expect(decodeIdToken('not-a-jwt')).toBeNull()
  })

  it('isExpired flips at the exp boundary', () => {
    const user = { email: 'a@b.com', exp: 1000 }
    expect(isExpired(user, 999)).toBe(false)
    expect(isExpired(user, 1000)).toBe(true)
    expect(isExpired(user, 1001)).toBe(true)
  })
})

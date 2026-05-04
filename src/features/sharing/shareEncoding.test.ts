import { describe, expect, it } from 'vitest'

import type { Session } from '@/features/session/types'

import { buildShareUrl, decodeSessionParam, encodeSessionParam } from './shareEncoding'

const baseSession: Session = {
  id: 'abc-123',
  createdAt: '2026-05-04T18:00:00.000Z',
  people: [
    { id: 'p1', name: 'Alex' },
    { id: 'p2', name: 'Jordan' },
  ],
  receipts: [
    {
      id: 'r1',
      label: 'Friday dinner',
      items: [
        {
          id: 'i1',
          receiptId: 'r1',
          name: 'Pizza',
          priceCents: 1500,
          quantity: 1,
          assignedTo: ['p1', 'p2'],
        },
      ],
      taxCents: 100,
      tipCents: 200,
      payments: [{ personId: 'p1', amountCents: 1800 }],
    },
  ],
}

describe('shareEncoding', () => {
  it('round-trips a session through encode/decode', () => {
    const encoded = encodeSessionParam(baseSession)
    const decoded = decodeSessionParam(encoded)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.session.id).toBe(baseSession.id)
    expect(decoded.session.people).toEqual(baseSession.people)
    expect(decoded.session.receipts[0].items[0].name).toBe('Pizza')
  })

  it('strips image data urls from the encoded payload', () => {
    const heavy: Session = {
      ...baseSession,
      receipts: [
        {
          ...baseSession.receipts[0],
          imageDataUrl: 'data:image/png;base64,' + 'A'.repeat(10_000),
        },
      ],
    }
    const param = encodeSessionParam(heavy)
    expect(param.length).toBeLessThan(2000)
  })

  it('builds a full share URL with the session id (hash routed)', () => {
    const url = buildShareUrl(baseSession, 'https://example.com')
    expect(url.startsWith('https://example.com/#/session/abc-123?data=')).toBe(true)
  })

  it('returns a typed error for malformed base64', () => {
    const result = decodeSessionParam('!!!not base64!!!')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(['malformed', 'invalid']).toContain(result.error.type)
  })

  it('returns invalid for valid base64 that is not a session', () => {
    const param = btoa(encodeURIComponent(JSON.stringify({ foo: 'bar' })))
    const result = decodeSessionParam(param)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.type).toBe('invalid')
  })
})

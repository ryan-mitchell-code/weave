// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { touchRecency } from './recency'

describe('touchRecency', () => {
  it('records id at now and preserves other entries', () => {
    const base = { a: 10, b: 20 }
    const next = touchRecency(base, 'c', 100)
    expect(next.c).toBe(100)
    expect(next.a).toBe(10)
    expect(next.b).toBe(20)
  })
})

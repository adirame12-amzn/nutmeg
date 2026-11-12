import { describe, expect, it } from 'vitest'
import { canGuessPaperTrail, paperTrailRevealCount, paperTrailScore } from './paperTrail'

describe('Paper Trail rules', () => {
  it('reveals one club initially and one after each wrong guess', () => {
    expect([0, 1, 2, 3, 4, 5].map(guesses => paperTrailRevealCount(guesses, 5))).toEqual([1, 2, 3, 4, 5, 5])
    expect(paperTrailRevealCount(4, 3)).toBe(3)
  })

  it('scores successful guesses deterministically', () => {
    expect([1, 2, 3, 4, 5, 6].map(guess => paperTrailScore(guess, true))).toEqual([100, 85, 70, 55, 40, 25])
    expect(paperTrailScore(6, false)).toBe(0)
  })

  it('rejects duplicate and seventh guesses', () => {
    expect(canGuessPaperTrail(['one'], 'one')).toBe(false)
    expect(canGuessPaperTrail(['1', '2', '3', '4', '5', '6'], '7')).toBe(false)
    expect(canGuessPaperTrail(['one'], 'two')).toBe(true)
  })
})

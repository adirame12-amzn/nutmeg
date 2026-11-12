import { describe, expect, it } from 'vitest'
import { shouldRequestIdentity } from './App'

describe('ranked identity boundary', () => {
  it('asks only for ranked play and the leaderboard', () => {
    expect(shouldRequestIdentity('lineup', false, true, false)).toBe(true)
    expect(shouldRequestIdentity('leaderboard', false, true, false)).toBe(true)
    expect(shouldRequestIdentity('ranked-paper-trail', false, true, false)).toBe(true)
    expect(shouldRequestIdentity('lineup', true, true, false)).toBe(false)
    expect(shouldRequestIdentity('paper-trail', false, true, false)).toBe(false)
    expect(shouldRequestIdentity('redacted', false, true, false)).toBe(false)
    expect(shouldRequestIdentity('wire-preview', false, true, false)).toBe(false)
  })
})

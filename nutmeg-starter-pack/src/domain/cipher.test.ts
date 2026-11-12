import { describe, expect, it } from 'vitest'
import { cipherScore, isCipherAnswer, scrambleCipherName } from './cipher'
import { toRedactedCase } from './redacted'
import type { Player } from './types'

const player = { id: 'kevin-de-bruyne', displayName: 'Kevin De Bruyne' } as Player
const caseFile = toRedactedCase(player)!

describe('The Cipher rules', () => {
  it('scrambles the answer without changing its letters', () => {
    const scrambled = scrambleCipherName(caseFile.displayAnswer, () => 0)
    expect(scrambled.join('')).not.toBe(caseFile.normalizedAnswer)
    expect(scrambled.sort()).toEqual(caseFile.normalizedAnswer.split('').sort())
  })

  it('accepts the case name or full player name without accents or spacing', () => {
    expect(isCipherAnswer(caseFile, 'de bruyne')).toBe(true)
    expect(isCipherAnswer(caseFile, 'Kevin De Bruyne')).toBe(true)
    expect(isCipherAnswer(caseFile, 'wrong player')).toBe(false)
  })

  it('reduces the score across four attempts', () => {
    expect([1, 2, 3, 4].map(attempt => cipherScore(attempt, true))).toEqual([100, 75, 50, 25])
    expect(cipherScore(4, false)).toBe(0)
  })
})

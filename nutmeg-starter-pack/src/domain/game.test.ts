import { describe, expect, it } from 'vitest'
import { lineupTarget, players } from '../data/players'
import { canSubmitGuess, comparePlayers, lineupScore, mysteryScore, revealCount } from './game'

describe('Lineup comparisons', () => {
  it('matches exact attributes and points age arrows toward the target', () => {
    const youngerGuess = players.find(player => player.id === 'theo-bell')!
    const result = comparePlayers(youngerGuess, lineupTarget)

    expect(result.isCorrect).toBe(false)
    expect(result.comparisons.find(item => item.label === 'League')?.status).toBe('match')
    expect(result.comparisons.find(item => item.label === 'Age')).toMatchObject({ status: 'higher', hint: 'Target is older' })
  })

  it('wins only on canonical player id', () => {
    expect(comparePlayers(lineupTarget, lineupTarget).isCorrect).toBe(true)
  })

  it('blocks duplicate guesses and guesses beyond the limit', () => {
    expect(canSubmitGuess(['theo-bell'], 'theo-bell', 6)).toBe(false)
    expect(canSubmitGuess(['a', 'b', 'c'], 'd', 3)).toBe(false)
    expect(canSubmitGuess(['a'], 'b', 3)).toBe(true)
  })
})

describe('reveal and scoring rules', () => {
  it('never reveals more than three clues', () => {
    expect(revealCount(1)).toBe(2)
    expect(revealCount(3)).toBe(3)
  })

  it('calculates deterministic Lineup scores', () => {
    expect(lineupScore(1, true)).toBe(110)
    expect(lineupScore(6, true)).toBe(35)
    expect(lineupScore(1, false)).toBe(0)
  })

  it('uses the documented Mystery formula', () => {
    expect(mysteryScore(1, 0, 1, true)).toBe(100)
    expect(mysteryScore(2, 1, 2, true)).toBe(55)
    expect(mysteryScore(1, 0, 1, false)).toBe(0)
  })
})

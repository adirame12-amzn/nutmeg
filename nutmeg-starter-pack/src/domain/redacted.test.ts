import { describe, expect, it } from 'vitest'
import type { Player } from './types'
import {
  EMPTY_REDACTED_STATS,
  isCorrectRedactedLetter,
  isRedactedSolved,
  normalizeRedactedText,
  parseRedactedStats,
  recordRedactedResult,
  redactedEvidenceAvailable,
  redactedScore,
  revealRedactedName,
  selectRedactedCase,
  toRedactedCase,
} from './redacted'

const player = (id: string, displayName: string): Player => ({ id, displayName, aliases: [], currentClub: 'Test FC', league: 'Test League', nationalTeam: 'France', position: 'Forward', age: 25, dominantFoot: 'Right', shirtNumber: 9 })

describe('Redacted rules', () => {
  it('normalizes accents and selected football-name characters', () => {
    expect(normalizeRedactedText('Mbappé')).toBe('MBAPPE')
    expect(normalizeRedactedText('Ødegaard')).toBe('ODEGAARD')
    expect(normalizeRedactedText('Çalhanoğlu')).toBe('CALHANOGLU')
  })

  it('reveals every duplicate letter and preserves word boundaries', () => {
    const caseFile = toRedactedCase(player('kevin-de-bruyne', 'Kevin De Bruyne'))!
    expect(revealRedactedName(caseFile, ['E'])).toBe('_ E   _ _ _ _ _ E')
    expect(isCorrectRedactedLetter(caseFile, 'e')).toBe(true)
  })

  it('recognizes a solved name and rejects missing letters', () => {
    const caseFile = toRedactedCase(player('kylian-mbappe', 'Kylian Mbappé'))!
    expect(isRedactedSolved(caseFile, 'MBAPE'.split(''))).toBe(true)
    expect(isRedactedSolved(caseFile, 'MBAE'.split(''))).toBe(false)
  })

  it('selects deterministically and avoids the previous player', () => {
    const pool = [player('a-one', 'Alex Kane'), player('b-two', 'Bo Messi')]
    expect(selectRedactedCase(pool, undefined, () => 0).player.id).toBe('a-one')
    expect(selectRedactedCase(pool, 'a-one', () => 0).player.id).toBe('b-two')
  })

  it('unlocks evidence and scores successful cases', () => {
    expect(redactedEvidenceAvailable(0, 1)).toBe(false)
    expect(redactedEvidenceAvailable(0, 2)).toBe(true)
    expect(redactedEvidenceAvailable(1, 4)).toBe(true)
    expect(redactedScore(true, 2, 1)).toBe(66)
    expect(redactedScore(true, 6, 2)).toBe(10)
    expect(redactedScore(false, 1, 0)).toBe(0)
  })

  it('defensively parses and updates local statistics', () => {
    expect(parseRedactedStats('{bad')).toEqual(EMPTY_REDACTED_STATS)
    const win = recordRedactedResult(EMPTY_REDACTED_STATS, true, 2, 76)
    expect(win).toMatchObject({ gamesPlayed: 1, wins: 1, totalWrongOnWins: 2, bestScore: 76, currentWinStreak: 1 })
    expect(recordRedactedResult(win, false, 6, 0).currentWinStreak).toBe(0)
  })
})

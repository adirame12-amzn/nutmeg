import { describe, expect, it } from 'vitest'
import { compareRankedPlayers, rankedLineupScore, validateUsername, weekStartUtc } from './rules'
import type { PlayerRow } from './types'

const player = (overrides: Partial<PlayerRow> = {}): PlayerRow => ({
  id: 'one', display_name: 'One Player', club: 'North FC', league: 'League A', nation: 'England',
  position: 'Forward', age: 25, fc_overall: 86, portrait_url: null,
  portrait_editorial_url: null, portrait_cutout_editorial_url: null, ...overrides,
})

describe('ranked daily rules', () => {
  it('awards a fixed server score by successful guess number', () => {
    expect([1, 2, 3, 4, 5, 6].map(number => rankedLineupScore(number, true))).toEqual([100, 80, 65, 50, 35, 20])
    expect(rankedLineupScore(6, false)).toBe(0)
    expect(rankedLineupScore(7, true)).toBe(0)
  })

  it('starts the leaderboard week on Monday UTC', () => {
    expect(weekStartUtc('2026-11-12')).toBe('2026-11-09')
    expect(weekStartUtc('2026-11-09')).toBe('2026-11-09')
  })

  it('normalises and validates unique-name input', () => {
    expect(validateUsername(' PitchScout_7 ')).toMatchObject({ ok: true, username: 'PitchScout_7', key: 'pitchscout_7' })
    expect(validateUsername('7bad')).toMatchObject({ ok: false })
    expect(validateUsername('ab')).toMatchObject({ ok: false })
  })

  it('returns comparison evidence without exposing the target', () => {
    const result = compareRankedPlayers(player(), player({ id: 'two', club: 'South FC', age: 29, fc_overall: 88 }))
    expect(result.find(item => item.label === 'Club')).toMatchObject({ status: 'miss' })
    expect(result.find(item => item.label === 'Age')).toMatchObject({ status: 'higher', hint: 'Target is older' })
    expect(result.find(item => item.label === 'FC 27 OVR')).toMatchObject({ status: 'higher' })
  })
})

import { describe, expect, it } from 'vitest'
import { evaluateAchievements, type AchievementAttempt } from './achievements'

const attempt = (overrides: Partial<AchievementAttempt> = {}): AchievementAttempt => ({ mode: 'lineup', date: '2026-11-10', status: 'won', score: 100, attemptsUsed: 1, evidenceOpened: 0, matches: 0, ...overrides })

describe('achievement evaluation', () => {
  it('unlocks perfect daily awards from deterministic attempt history', () => {
    const attempts = [
      attempt(), attempt({ mode: 'paper-trail' }), attempt({ mode: 'redacted', attemptsUsed: 0 }),
      attempt({ mode: 'cipher' }), attempt({ mode: 'overlap', matches: 3 }),
    ]
    const result = evaluateAchievements(attempts)
    expect(result.unlocked).toEqual(expect.arrayContaining(['debutant', 'full-90', 'clean-sheet', 'hat-trick', 'perfect-xi', 'prime-detective', 'wordsmith', 'codebreaker', 'globetrotter', 'venn-diagram']))
  })

  it('tracks consecutive distinct days without counting duplicate games twice', () => {
    const result = evaluateAchievements([
      attempt({ date: '2026-11-10' }), attempt({ date: '2026-11-10', mode: 'cipher' }),
      attempt({ date: '2026-11-11' }), attempt({ date: '2026-11-12' }),
    ])
    expect(result.progress['on-form']).toBe(3)
    expect(result.unlocked).toContain('on-form')
    expect(result.unlocked).not.toContain('first-team-regular')
  })

  it('only awards final-attempt drama for supported solved games', () => {
    expect(evaluateAchievements([attempt({ attemptsUsed: 6, score: 20 })]).unlocked).toContain('fergie-time')
    expect(evaluateAchievements([attempt({ mode: 'overlap', matches: 3 })]).unlocked).not.toContain('fergie-time')
  })
})

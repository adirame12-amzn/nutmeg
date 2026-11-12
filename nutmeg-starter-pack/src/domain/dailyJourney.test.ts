import { describe, expect, it } from 'vitest'
import { completedDailyCount, nextDailyScreen } from './dailyJourney'

describe('daily edition journey', () => {
  it('starts at Prime Suspect and resumes the first unfinished case', () => {
    expect(nextDailyScreen({})).toBe('lineup')
    expect(nextDailyScreen({ lineup: 'won', 'paper-trail': 'playing' })).toBe('ranked-paper-trail')
  })

  it('continues forward after a completed case without forcing the whole session', () => {
    const statuses = { lineup: 'won', 'paper-trail': 'lost', redacted: 'not_started' } as const
    expect(nextDailyScreen(statuses, 'ranked-paper-trail')).toBe('ranked-redacted')
    expect(completedDailyCount(statuses)).toBe(2)
  })

  it('returns no destination when the edition is complete', () => {
    expect(nextDailyScreen({ lineup: 'won', 'paper-trail': 'lost', redacted: 'won', cipher: 'lost', overlap: 'won' })).toBeNull()
  })
})

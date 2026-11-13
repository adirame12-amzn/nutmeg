import { describe, expect, it } from 'vitest'
import { completedDailyCount, fallbackDailyStatus, nextDailyScreen } from './dailyJourney'

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

  it('keeps moving forward when an individual status refresh fails', () => {
    const statuses = {
      lineup: fallbackDailyStatus('lineup', 'ranked-cipher'),
      'paper-trail': fallbackDailyStatus('ranked-paper-trail', 'ranked-cipher'),
      redacted: fallbackDailyStatus('ranked-redacted', 'ranked-cipher'),
      cipher: fallbackDailyStatus('ranked-cipher', 'ranked-cipher'),
      overlap: fallbackDailyStatus('ranked-overlap', 'ranked-cipher'),
    } as const
    expect(nextDailyScreen(statuses, 'ranked-cipher')).toBe('ranked-overlap')
  })
})

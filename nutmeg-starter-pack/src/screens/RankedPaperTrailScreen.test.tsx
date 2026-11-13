import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { startDailyPaperTrail, submitDailyPaperTrailGuess, type RankedPaperTrailState } from '../api/ranked'
import { fc27Players } from '../data/fc27Players'
import { RankedPaperTrailScreen } from './RankedPaperTrailScreen'

vi.mock('../api/ranked', async importOriginal => {
  const actual = await importOriginal<typeof import('../api/ranked')>()
  return { ...actual, startDailyPaperTrail: vi.fn(), submitDailyPaperTrailGuess: vi.fn() }
})

const club = (id: string, name: string) => ({
  id, wikidataId: `Q-${id}`, name, start: '2020', end: '2022', appearances: 20,
  crestUrl: null, crestStatus: 'fallback', sourceUrl: `https://example.com/${id}`,
})

const initial: RankedPaperTrailState = {
  date: '2026-11-12', status: 'not_started', guesses: [], guessesUsed: 0, score: 0,
  clubs: [club('one', 'First FC')], clubCount: 5, sourceSnapshot: '2026-11-11',
}

describe('ranked Paper Trail', () => {
  beforeEach(() => vi.clearAllMocks())

  it('keeps future clubs server-hidden and reveals the next club after a wrong guess', async () => {
    const user = userEvent.setup()
    const wrong = fc27Players[0]
    vi.mocked(startDailyPaperTrail).mockResolvedValue(initial)
    vi.mocked(submitDailyPaperTrailGuess).mockResolvedValue({
      ...initial, status: 'playing', guesses: [wrong], guessesUsed: 1,
      clubs: [club('one', 'First FC'), club('two', 'Second FC')],
    })

    render(<RankedPaperTrailScreen
      identity={{ user: { id: 'u1', username: 'GoalScout' }, token: 'token' }}
      onPractice={vi.fn()}
      onNext={vi.fn()}
      onHome={vi.fn()}
      onBadges={vi.fn()}
    />)

    expect(await screen.findByLabelText('Club 1: First FC')).toBeInTheDocument()
    expect(screen.getByLabelText('Club 2 locked')).toBeInTheDocument()
    expect(screen.getAllByText('LOCKED')).toHaveLength(4)

    await user.type(screen.getByRole('textbox'), wrong.displayName)
    await user.click(screen.getByRole('option', { name: new RegExp(wrong.displayName, 'i') }))

    expect(await screen.findByLabelText('Club 2: Second FC')).toBeInTheDocument()
    expect(submitDailyPaperTrailGuess).toHaveBeenCalledWith(expect.objectContaining({ token: 'token' }), wrong.id)
  })
})

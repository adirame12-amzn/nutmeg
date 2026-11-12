import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { getDailyLineup } from '../api/ranked'
import { fc27Players } from '../data/fc27Players'
import { RankedLineupScreen } from './RankedLineupScreen'

vi.mock('../api/ranked', async importOriginal => {
  const actual = await importOriginal<typeof import('../api/ranked')>()
  return { ...actual, getDailyLineup: vi.fn() }
})

describe('ranked Prime Suspect result', () => {
  it('uses the player reveal as the direct handoff to the next daily case', async () => {
    const user = userEvent.setup()
    const onNext = vi.fn()
    vi.mocked(getDailyLineup).mockResolvedValue({
      date: '2026-11-13', status: 'lost', guesses: [], guessesUsed: 6, score: 0,
      answer: fc27Players[0],
    })

    render(<RankedLineupScreen
      identity={{ user: { id: 'u1', username: 'GoalScout' }, token: 'token' }}
      onQuickCase={vi.fn()}
      onNext={onNext}
      onHome={vi.fn()}
    />)

    const next = await screen.findByRole('button', { name: /1\/5 complete next: paper trail/i })
    expect(screen.getByRole('dialog')).toHaveClass('lost-reveal')
    expect(screen.queryByRole('button', { name: /view case report/i })).not.toBeInTheDocument()
    await user.click(next)
    expect(onNext).toHaveBeenCalledOnce()
  })
})

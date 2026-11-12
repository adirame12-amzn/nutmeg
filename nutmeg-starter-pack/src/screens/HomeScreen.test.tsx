import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import * as rankedApi from '../api/ranked'
import { HomeScreen } from './HomeScreen'

describe('Home case desks', () => {
  it('keeps ranked and practice play as explicit independent choices', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    const onOpenPracticeLineup = vi.fn()

    render(<HomeScreen onNavigate={onNavigate} onOpenPracticeLineup={onOpenPracticeLineup} ranked identity={null} />)

    expect(screen.getByRole('button', { name: /ranked case/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: 'Today’s Cases' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /casebook.*№ 001/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Cold Cases' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^cold cases/i }))
    expect(screen.getByRole('button', { name: /^cold cases/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: 'Cold Cases' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Today’s Cases' })).not.toBeInTheDocument()
    expect(screen.queryByText('Question the evidence.')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /random player prime suspect/i }))
    expect(onOpenPracticeLineup).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('button', { name: /paper trail/i }))
    expect(onNavigate).toHaveBeenCalledWith('paper-trail')

    await user.click(screen.getByRole('button', { name: /redacted/i }))
    expect(onNavigate).toHaveBeenCalledWith('redacted')

    await user.click(screen.getByRole('button', { name: /the cipher/i }))
    expect(onNavigate).toHaveBeenCalledWith('cipher')

    await user.click(screen.getByRole('button', { name: /the overlap/i }))
    expect(onNavigate).toHaveBeenCalledWith('overlap')

    await user.click(screen.getByRole('button', { name: /the wire/i }))
    expect(onNavigate).toHaveBeenCalledWith('wire-preview')
  })

  it('opens the shared Prime Suspect from the daily desk', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()

    render(<HomeScreen onNavigate={onNavigate} onOpenPracticeLineup={vi.fn()} ranked identity={null} />)
    await user.click(screen.getByRole('button', { name: /daily case.*prime suspect/i }))

    expect(onNavigate).toHaveBeenCalledWith('lineup')
  })

  it('opens the shared ranked Paper Trail from the daily desk', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()

    render(<HomeScreen onNavigate={onNavigate} onOpenPracticeLineup={vi.fn()} ranked identity={null} />)
    await user.click(screen.getByRole('button', { name: /daily case 02.*paper trail/i }))

    expect(onNavigate).toHaveBeenCalledWith('ranked-paper-trail')
  })

  it('removes the redundant offline control while retaining the weekly table', () => {
    render(<HomeScreen onNavigate={vi.fn()} onOpenPracticeLineup={vi.fn()} ranked={false} identity={null} />)

    expect(screen.queryByText('Ranked desk offline')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open weekly leaderboard' })).toBeInTheDocument()
  })

  it('keeps the saved detective identity visible even when ranked play is locally unavailable', () => {
    render(<HomeScreen
      onNavigate={vi.fn()}
      onOpenPracticeLineup={vi.fn()}
      ranked={false}
      identity={{ user: { id: 'detective-1', username: 'TouchlineFox' }, token: 'browser-token' }}
    />)

    expect(screen.getByRole('button', { name: /signed in as @touchlinefox/i })).toBeInTheDocument()
    expect(screen.queryByText('Ranked desk offline')).not.toBeInTheDocument()
  })

  it('shows authoritative completion states for a signed-in daily desk', async () => {
    vi.spyOn(rankedApi, 'getDailyLineup').mockResolvedValue({ date: '2026-11-12', status: 'won', guesses: [], guessesUsed: 2, score: 80 })
    vi.spyOn(rankedApi, 'getDailyPaperTrail').mockResolvedValue({ date: '2026-11-12', status: 'playing', guesses: [], guessesUsed: 1, score: 0, clubs: [], clubCount: 4, sourceSnapshot: '2026-11-11' })

    render(<HomeScreen
      onNavigate={vi.fn()}
      onOpenPracticeLineup={vi.fn()}
      ranked
      identity={{ user: { id: 'detective-1', username: 'TouchlineFox' }, token: 'browser-token' }}
    />)

    expect(await screen.findByText('SOLVED · +80')).toBeInTheDocument()
    expect(await screen.findByText('IN PROGRESS')).toBeInTheDocument()
  })

  it('turns completed local files green without involving ranked state', async () => {
    localStorage.setItem('player-press-practice-completed-v1', JSON.stringify(['cipher']))
    const user = userEvent.setup()
    render(<HomeScreen onNavigate={vi.fn()} onOpenPracticeLineup={vi.fn()} ranked={false} identity={null} />)
    await user.click(screen.getByRole('button', { name: /^cold cases/i }))

    expect(screen.getByRole('button', { name: /the cipher/i })).toHaveClass('completed')
    expect(screen.getByRole('button', { name: /paper trail/i })).not.toHaveClass('completed')
    localStorage.removeItem('player-press-practice-completed-v1')
  })
})

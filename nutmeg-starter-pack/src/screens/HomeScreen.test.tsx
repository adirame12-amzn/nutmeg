import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HomeScreen } from './HomeScreen'

describe('Home case desks', () => {
  it('keeps ranked and practice play as explicit independent choices', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    const onOpenPracticeLineup = vi.fn()

    render(<HomeScreen onNavigate={onNavigate} onOpenPracticeLineup={onOpenPracticeLineup} ranked identity={null} />)

    expect(screen.getByRole('button', { name: /ranked case/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Today’s Investigation')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Cold Cases' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^cold cases/i }))
    expect(screen.getByRole('button', { name: /^cold cases/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: 'Cold Cases' })).toBeInTheDocument()
    expect(screen.queryByText('Today’s Investigation')).not.toBeInTheDocument()
    expect(screen.queryByText('Question the evidence.')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /random player prime suspect/i }))
    expect(onOpenPracticeLineup).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('button', { name: /paper trail/i }))
    expect(onNavigate).toHaveBeenCalledWith('paper-trail')
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
})

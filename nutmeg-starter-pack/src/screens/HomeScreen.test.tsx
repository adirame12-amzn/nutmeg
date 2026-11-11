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

    expect(screen.getByRole('button', { name: /daily ranked/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Today’s Dossier')).toBeInTheDocument()
    expect(screen.queryByText('The Archives')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /practice files/i }))
    expect(screen.getByRole('button', { name: /practice files/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('The Archives')).toBeInTheDocument()
    expect(screen.queryByText('Today’s Dossier')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /random player prime suspect/i }))
    expect(onOpenPracticeLineup).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('button', { name: /cold case/i }))
    expect(onNavigate).toHaveBeenCalledWith('mystery')
  })

  it('opens the shared Prime Suspect from the daily desk', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()

    render(<HomeScreen onNavigate={onNavigate} onOpenPracticeLineup={vi.fn()} ranked identity={null} />)
    await user.click(screen.getByRole('button', { name: /daily case.*prime suspect/i }))

    expect(onNavigate).toHaveBeenCalledWith('lineup')
  })
})

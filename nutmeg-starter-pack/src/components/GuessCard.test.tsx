import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { lineupTarget, players } from '../data/players'
import { comparePlayers } from '../domain/game'
import { GuessCard } from './GuessCard'

describe('GuessCard history interaction', () => {
  it('lets a player reopen a compact comparison card', async () => {
    const user = userEvent.setup()
    render(<GuessCard guess={comparePlayers(players[1], lineupTarget)} index={0} compact />)

    expect(screen.queryByText('Harbour Athletic')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Expand comparison for Theo Bell/i }))
    expect(screen.getByText('Harbour Athletic')).toBeVisible()
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')
  })
})

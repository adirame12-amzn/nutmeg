import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getRandomRedactedCase } from '../data/redacted'
import { CipherScreen } from './CipherScreen'

describe('The Cipher interaction', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })
  afterEach(() => vi.restoreAllMocks())

  it('reveals clues after misses and accepts the player name', async () => {
    const user = userEvent.setup()
    const answer = getRandomRedactedCase(undefined, () => 0)
    render(<CipherScreen onNavigate={vi.fn()}/>)

    await user.type(screen.getByRole('textbox', { name: /unscrambled player name/i }), 'wrong')
    await user.click(screen.getByRole('button', { name: /submit/i }))
    expect(screen.getByText(answer.player.nationalTeam)).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: /unscrambled player name/i }), answer.player.displayName)
    await user.click(screen.getByRole('button', { name: /submit/i }))
    expect(screen.getByText('CIPHER CRACKED')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: answer.displayAnswer })).toBeInTheDocument()
  })
})

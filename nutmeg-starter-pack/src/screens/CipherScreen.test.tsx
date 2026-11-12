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

  it('unlocks paid clues after misses without revealing them automatically', async () => {
    const user = userEvent.setup()
    const answer = getRandomRedactedCase(undefined, () => 0)
    render(<CipherScreen onNavigate={vi.fn()}/>)
    expect(screen.queryByLabelText(/scrambled name/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /open the file/i }))
    expect(screen.getByRole('timer')).toHaveTextContent('60')

    await user.type(screen.getByRole('textbox', { name: /unscrambled player name/i }), 'wrong')
    await user.click(screen.getByRole('button', { name: /submit/i }))
    expect(screen.queryByText(answer.player.nationalTeam)).not.toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: /unscrambled player name/i }), 'still wrong')
    await user.click(screen.getByRole('button', { name: /submit/i }))
    expect(screen.queryByText(answer.player.nationalTeam)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /nation unseal/i }))
    expect(screen.getByText(answer.player.nationalTeam)).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: /unscrambled player name/i }), answer.player.displayName)
    await user.click(screen.getByRole('button', { name: /submit/i }))
    expect(screen.getByText('CIPHER CRACKED')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: answer.displayAnswer })).toBeInTheDocument()
  })
})

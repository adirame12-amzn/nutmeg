import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getRandomRedactedCase } from '../data/redacted'
import { RedactedScreen } from './RedactedScreen'

describe('Redacted interaction', () => {
  beforeEach(() => {
    window.localStorage.clear()
    sessionStorage.clear()
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })
  afterEach(() => vi.restoreAllMocks())

  it('reveals correct letters, prevents duplicates and unlocks evidence after two strikes', async () => {
    const user = userEvent.setup()
    const answer = getRandomRedactedCase(undefined, () => 0)
    render(<RedactedScreen onNavigate={vi.fn()} />)

    const correct = answer.normalizedAnswer[0]
    const wrong = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(letter => !answer.normalizedAnswer.includes(letter)).slice(0, 2)
    await user.click(screen.getByRole('button', { name: `Guess ${correct}` }))
    expect(screen.getByRole('button', { name: `Guess ${correct}` })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: `Guess ${wrong[0]}` }))
    await user.click(screen.getByRole('button', { name: `Guess ${wrong[1]}` }))
    expect(screen.getByLabelText('2 of 6 strikes used')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open −10 file 01 tap to unseal/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /4 strikes file 02 sealed/i })).toBeDisabled()
  })

  it('solves immediately from the full-player search and stores a local record', async () => {
    const user = userEvent.setup()
    const answer = getRandomRedactedCase(undefined, () => 0)
    render(<RedactedScreen onNavigate={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /name the suspect/i }))
    await user.type(screen.getByRole('textbox'), answer.player.displayName)
    await user.click(screen.getByRole('option', { name: new RegExp(answer.player.displayName, 'i') }))

    expect(screen.getByText('CASE SOLVED')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: answer.player.displayName })).toBeInTheDocument()
    expect(window.localStorage.getItem('player-press-redacted-stats-v1')).toContain('"gamesPlayed":1')
  })

  it('closes after six wrong letters', async () => {
    const user = userEvent.setup()
    const answer = getRandomRedactedCase(undefined, () => 0)
    const wrong = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(letter => !answer.normalizedAnswer.includes(letter)).slice(0, 6)
    render(<RedactedScreen onNavigate={vi.fn()} />)

    for (const letter of wrong) await user.click(screen.getByRole('button', { name: `Guess ${letter}` }))
    expect(screen.getByText('CASE CLOSED')).toBeInTheDocument()
    expect(screen.getByText(/concealed name was/i)).toBeInTheDocument()
  })
})

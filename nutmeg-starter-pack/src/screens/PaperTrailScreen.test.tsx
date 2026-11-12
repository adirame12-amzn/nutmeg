import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fc27Players } from '../data/fc27Players'
import { getRandomPaperTrailPuzzle } from '../data/paperTrail'
import { PaperTrailScreen } from './PaperTrailScreen'

describe('Paper Trail interaction', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })
  afterEach(() => vi.restoreAllMocks())

  it('keeps a stable five-card grid and reveals one club per wrong guess', async () => {
    const user = userEvent.setup()
    const puzzle = getRandomPaperTrailPuzzle(undefined, () => 0)
    const wrong = fc27Players.find(player => player.id !== puzzle.answer.id)!
    const { container } = render(<PaperTrailScreen onResult={vi.fn()} />)
    expect(container.querySelectorAll('.career-grid .club-card')).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: /open paper trail/i }))

    const cards = container.querySelectorAll('.career-grid .club-card')
    expect(cards).toHaveLength(5)
    expect(cards[3]).toHaveClass('slot-4')
    expect(cards[4]).toHaveClass('slot-5')
    expect(screen.getByLabelText(`Club 1: ${puzzle.clubs[0].name}`)).toBeInTheDocument()
    expect(screen.getByLabelText('Club 2 locked')).toBeInTheDocument()

    await user.type(screen.getByRole('textbox'), wrong.displayName)
    await user.click(screen.getByRole('option', { name: new RegExp(wrong.displayName, 'i') }))

    expect(screen.getByLabelText(`Club 1: ${puzzle.clubs[0].name}`)).toBeInTheDocument()
    expect(screen.getByLabelText(`Club 2: ${puzzle.clubs[1].name}`)).toBeInTheDocument()
    expect(screen.getByText('1 of 6 suspects')).toBeInTheDocument()
    expect(within(screen.getByLabelText('Incorrect suspects')).getByText(wrong.displayName)).toBeInTheDocument()

    await user.type(screen.getByRole('textbox'), wrong.displayName)
    expect(screen.queryByRole('option', { name: new RegExp(wrong.displayName, 'i') })).not.toBeInTheDocument()
  })

  it('ends immediately with first-guess score when the player is correct', async () => {
    const user = userEvent.setup()
    const onResult = vi.fn()
    const answer = getRandomPaperTrailPuzzle(undefined, () => 0).answer
    render(<PaperTrailScreen onResult={onResult} />)
    await user.click(screen.getByRole('button', { name: /open paper trail/i }))

    await user.type(screen.getByRole('textbox'), answer.displayName)
    await user.click(screen.getByRole('option', { name: new RegExp(answer.displayName, 'i') }))

    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ mode: 'paper-trail', won: true, guesses: 1, score: 100, answer: answer.displayName }))
  })

  it('ends unsolved after six distinct incorrect guesses', async () => {
    const user = userEvent.setup()
    const onResult = vi.fn()
    const answer = getRandomPaperTrailPuzzle(undefined, () => 0).answer
    const wrongPlayers = fc27Players.filter(player => player.id !== answer.id).slice(0, 6)
    render(<PaperTrailScreen onResult={onResult} />)
    await user.click(screen.getByRole('button', { name: /open paper trail/i }))

    for (const player of wrongPlayers) {
      await user.type(screen.getByRole('textbox'), player.displayName)
      await user.click(screen.getByRole('option', { name: new RegExp(player.displayName, 'i') }))
    }

    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ mode: 'paper-trail', won: false, guesses: 6, score: 0, answer: answer.displayName }))
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fc27Players } from '../data/fc27Players'
import { LineupScreen } from './LineupScreen'

describe('Lineup mobile interaction', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })
  afterEach(() => vi.restoreAllMocks())

  it('adds stacked player cards and prevents repeat suggestions', async () => {
    const user = userEvent.setup()
    const target = fc27Players[0]
    const guess = fc27Players.find(player => player.id !== target.id)!
    render(<LineupScreen onResult={vi.fn()} />)

    const search = screen.getByRole('textbox', { name: /search the suspect pool/i })
    await user.type(search, guess.displayName)
    await user.click(screen.getByRole('option', { name: new RegExp(guess.displayName, 'i') }))

    expect(screen.getByRole('article', { name: new RegExp(`Suspect 1: ${guess.displayName}`, 'i') })).toBeInTheDocument()
    expect(screen.getByText('1 of 6 suspects tried')).toBeInTheDocument()

    await user.type(search, guess.displayName)
    expect(screen.queryByRole('option', { name: new RegExp(guess.displayName, 'i') })).not.toBeInTheDocument()
  })

  it('ends immediately when the randomly selected target is guessed', async () => {
    const user = userEvent.setup()
    const target = fc27Players[0]
    render(<LineupScreen onResult={vi.fn()} />)

    await user.type(screen.getByRole('textbox'), target.displayName)
    await user.click(screen.getByRole('option', { name: new RegExp(target.displayName, 'i') }))

    const reveal = screen.getByRole('dialog', { name: new RegExp(target.displayName, 'i') })
    expect(reveal).toBeInTheDocument()
    expect(screen.getAllByText('CASE CLOSED').length).toBeGreaterThan(0)
    expect(screen.getByText('+110')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /View case report/i })).toHaveFocus()
  })

  it('advances to a different answer when playing again', async () => {
    const user = userEvent.setup()
    const firstTarget = fc27Players[0]
    const nextTarget = fc27Players[1]
    render(<LineupScreen onResult={vi.fn()} />)

    await user.type(screen.getByRole('textbox'), firstTarget.displayName)
    await user.click(screen.getByRole('option', { name: new RegExp(firstTarget.displayName, 'i') }))
    await user.click(screen.getByRole('button', { name: /open another case/i }))
    await user.type(screen.getByRole('textbox'), nextTarget.displayName)
    await user.click(screen.getByRole('option', { name: new RegExp(nextTarget.displayName, 'i') }))

    expect(screen.getByRole('dialog', { name: new RegExp(nextTarget.displayName, 'i') })).toBeInTheDocument()
  })

  it('reveals the answer in a dialog after the sixth failed guess', async () => {
    const user = userEvent.setup()
    const target = fc27Players[0]
    render(<LineupScreen onResult={vi.fn()} />)

    for (const player of fc27Players.slice(1, 7)) {
      await user.type(screen.getByRole('textbox'), player.displayName)
      await user.click(screen.getByRole('option', { name: new RegExp(player.displayName, 'i') }))
    }

    const reveal = screen.getByRole('dialog', { name: new RegExp(target.displayName, 'i') })
    expect(reveal).toHaveTextContent('CASE UNSOLVED')
    expect(reveal).toHaveTextContent('+0')
    expect(screen.getByRole('button', { name: /View case report/i })).toHaveFocus()
  })
})

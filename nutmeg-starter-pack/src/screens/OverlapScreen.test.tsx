import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fc27Players } from '../data/fc27Players'
import { overlapPuzzles } from '../data/overlap'
import { OverlapScreen } from './OverlapScreen'

describe('The Overlap interaction', () => {
  afterEach(() => vi.restoreAllMocks())

  it('starts on demand, keeps matches sealed until lock-in and accepts one perfect answer', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const user = userEvent.setup()
    const puzzle = overlapPuzzles[0]
    const perfect = fc27Players.find(player => puzzle.perfectPlayerIds.includes(player.id))!
    render(<OverlapScreen onNavigate={vi.fn()}/>)

    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
    expect(screen.queryByText(puzzle.clubA.name)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /open the file/i }))
    expect(screen.getByRole('timer')).toHaveTextContent('60')
    expect(screen.getByText(puzzle.clubA.name)).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: /search the suspect pool/i }), perfect.displayName)
    await user.click(screen.getByRole('option', { name: new RegExp(perfect.displayName, 'i') }))
    expect(screen.queryByText('MATCH')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /lock in answer/i }))

    expect(screen.getByText('FULL HOUSE — 3/3')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getAllByText('MATCH')).toHaveLength(3)
  })
})

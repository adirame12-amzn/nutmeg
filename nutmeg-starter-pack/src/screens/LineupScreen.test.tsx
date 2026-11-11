import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LineupScreen } from './LineupScreen'

describe('Lineup mobile interaction', () => {
  it('adds stacked player cards and prevents repeat suggestions', async () => {
    const user = userEvent.setup()
    render(<LineupScreen onResult={vi.fn()} />)

    const search = screen.getByRole('textbox', { name: /search the demo player pool/i })
    await user.type(search, 'Theo')
    await user.click(screen.getByRole('option', { name: /Theo Bell/i }))

    expect(screen.getByRole('article', { name: /Guess 1: Theo Bell/i })).toBeInTheDocument()
    expect(screen.getByText('Attempt 2 of 6')).toBeInTheDocument()

    await user.type(search, 'Theo')
    expect(screen.queryByRole('option', { name: /Theo Bell/i })).not.toBeInTheDocument()
  })

  it('ends immediately when the canonical target is selected', async () => {
    const user = userEvent.setup()
    render(<LineupScreen onResult={vi.fn()} />)

    await user.type(screen.getByRole('textbox'), 'Mara')
    await user.click(screen.getByRole('option', { name: /Mara Voss/i }))

    expect(screen.getByText('Solved!')).toBeInTheDocument()
    expect(screen.getByText(/Solved in 1 guess/)).toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WirePreviewScreen } from './WirePreviewScreen'

describe('The Wire preview', () => {
  it('marks only the current club pair as active and labels itself as a mockup', () => {
    render(<WirePreviewScreen />)
    expect(screen.getByText('Mockup only')).toBeInTheDocument()
    expect(screen.getAllByText('ACTIVE')).toHaveLength(2)
    expect(screen.getByLabelText('Barcelona: active source')).toBeInTheDocument()
    expect(screen.getByLabelText('PSG: active target')).toBeInTheDocument()
    expect(screen.getByLabelText('Arsenal: completed')).toBeInTheDocument()
    expect(screen.getByLabelText('Real Madrid: upcoming')).toBeInTheDocument()
  })
})

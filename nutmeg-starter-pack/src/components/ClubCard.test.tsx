import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ClubCard } from './ClubCard'

describe('ClubCard', () => {
  it('preserves the original crest colours by using the clean asset', () => {
    render(<ClubCard sequence={1} revealed club={{
      id: 'test-club', wikidataId: 'Q1', name: 'Test Club', start: '2020', end: null,
      appearances: 10, crestUrl: '/nutmeg/clubs/test-club.webp',
      crestEditorialUrl: '/nutmeg/clubs/test-club-editorial.webp', crestStatus: 'approved', sourceUrl: 'https://example.com',
    }} />)

    expect(screen.getByRole('article', { name: 'Club 1: Test Club' }).querySelector('img'))
      .toHaveAttribute('src', '/nutmeg/clubs/test-club.webp')
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import * as rankedApi from '../api/ranked'
import { BadgeCollectionScreen } from './BadgeCollectionScreen'

describe('Badge Cabinet', () => {
  it('separates earned honours from locked progress and features an earned badge', async () => {
    vi.spyOn(rankedApi, 'getAchievements').mockResolvedValue({
      earned: [{ badgeId: 'debutant', earnedAt: '2026-11-13T00:00:00Z' }],
      progress: { debutant: 1, 'full-90': 3 }, featuredBadgeId: null,
    })
    vi.spyOn(rankedApi, 'setFeaturedBadge').mockResolvedValue({ featuredBadgeId: 'debutant' })
    const user = userEvent.setup()
    render(<BadgeCollectionScreen identity={{ user: { id: 'u1', username: 'TouchlineFox' }, token: 'token' }} onBack={vi.fn()}/>)

    expect(await screen.findByText((_content, element) => Boolean(element?.classList.contains('cabinet-count') && element.textContent?.replace(/\s+/g, ' ').trim() === '1 of 15 collected'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /full 90/i })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /debutant/i }))
    expect(await screen.findByText('PINNED TO PROFILE')).toBeInTheDocument()
    expect(rankedApi.setFeaturedBadge).toHaveBeenCalledWith(expect.objectContaining({ token: 'token' }), 'debutant')
  })
})

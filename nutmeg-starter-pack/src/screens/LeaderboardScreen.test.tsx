import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import * as rankedApi from '../api/ranked'
import { LeaderboardScreen } from './LeaderboardScreen'

describe('weekly championship stars', () => {
  it('shows current points and the permanent star cabinet separately', async () => {
    vi.spyOn(rankedApi, 'getWeeklyLeaderboard').mockResolvedValue({
      weekStart: '2026-11-09',
      leaders: [{ rank: 1, username: 'TouchlineFox', points: 180, solved: 2, played: 2, stars: 2, isCurrentUser: true }],
      currentUser: { rank: 1, username: 'TouchlineFox', points: 180, solved: 2, played: 2, stars: 2, isCurrentUser: true },
      starLeaders: [{ rank: 1, username: 'TouchlineFox', stars: 2, latestWeek: '2026-11-02', isCurrentUser: true }],
    })

    render(<LeaderboardScreen identity={{ user: { id: 'detective-1', username: 'TouchlineFox' }, token: 'browser-token' }} />)

    expect(await screen.findByRole('heading', { name: 'The Star Cabinet' })).toBeInTheDocument()
    expect(screen.getAllByText('TouchlineFox')).toHaveLength(2)
    expect(screen.getByText(/leader earns a permanent championship star/i)).toBeInTheDocument()
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createIdentity, getDailyLineup, RankedApiError, type RankedIdentity } from './ranked'

const identity: RankedIdentity = { user: { id: 'user-1', username: 'GoalScout' }, token: 'secret-token' }

afterEach(() => vi.restoreAllMocks())

describe('ranked API client', () => {
  it('surfaces a taken username and alternatives', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'That detective name is already taken.', suggestions: ['PitchAgent'] }), { status: 409, headers: { 'content-type': 'application/json' } }))
    const error = await createIdentity('GoalScout').catch(caught => caught)
    expect(error).toBeInstanceOf(RankedApiError)
    expect((error as RankedApiError).status).toBe(409)
    expect((error as RankedApiError).details.suggestions).toEqual(['PitchAgent'])
  })

  it('hydrates server guesses into playable player cards', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      date: '2026-11-12', status: 'playing', guessesUsed: 1, score: 0,
      guesses: [{ player: { id: 'p1', displayName: 'One Player', currentClub: 'Club', league: 'League', nationalTeam: 'Nation', position: 'Forward', age: 25, fcOverall: 86 }, comparisons: [], isCorrect: false }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }))
    const state = await getDailyLineup(identity)
    expect(state.guesses[0].player).toMatchObject({ displayName: 'One Player', aliases: [], dominantFoot: 'Unknown' })
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/daily/lineup'), expect.objectContaining({ headers: expect.objectContaining({ authorization: 'Bearer secret-token' }) }))
  })
})

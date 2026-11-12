import { afterEach, describe, expect, it, vi } from 'vitest'
import { createIdentity, getDailyLineup, getDailyPaperTrail, RankedApiError, type RankedIdentity } from './ranked'

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

  it('hydrates only the Paper Trail clubs revealed by the server', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      date: '2026-11-12', status: 'playing', guessesUsed: 1, score: 0, clubCount: 5, sourceSnapshot: '2026-11-11',
      guesses: [{ id: 'p1', displayName: 'One Player', currentClub: 'Club', league: 'League', nationalTeam: 'Nation', position: 'Forward', age: 25, fcOverall: 86 }],
      clubs: [{ clubId: 'club-one', wikidataClubId: 'Q1', name: 'Club One', start: '2020', end: '2022', appearances: 30, crestUrl: null, crestStatus: 'fallback', sourceUrl: 'https://example.com/Q1' }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }))

    const state = await getDailyPaperTrail(identity)
    expect(state.clubCount).toBe(5)
    expect(state.clubs).toEqual([expect.objectContaining({ id: 'club-one', name: 'Club One' })])
    expect(state.guesses[0]).toMatchObject({ displayName: 'One Player', aliases: [] })
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/daily/paper-trail'), expect.objectContaining({ headers: expect.objectContaining({ authorization: 'Bearer secret-token' }) }))
  })
})

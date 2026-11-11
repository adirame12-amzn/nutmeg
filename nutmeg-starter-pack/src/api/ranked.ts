import type { Comparison, GameStatus, LineupGuess, Player } from '../domain/types'

const productionApiUrl = 'https://player-press-ranked.adirame12.workers.dev'
const configuredUrl = (
  (import.meta.env.VITE_API_URL as string | undefined)
  || (import.meta.env.PROD ? productionApiUrl : undefined)
)?.replace(/\/$/, '')
export const rankedApiEnabled = Boolean(configuredUrl)
const IDENTITY_KEY = 'player-press-ranked-identity-v1'

export interface RankedIdentity {
  user: { id: string; username: string }
  token: string
}

interface ApiPlayer {
  id: string
  displayName: string
  currentClub: string
  league: string
  nationalTeam: string
  position: Player['position']
  age: number
  fcOverall?: number
  portraitUrl?: string
  portraitEditorialUrl?: string
  portraitCutoutEditorialUrl?: string
}

interface ApiGuess {
  player: ApiPlayer
  comparisons: Comparison[]
  isCorrect: boolean
}

export interface RankedDailyState {
  date: string
  status: 'not_started' | GameStatus
  guesses: LineupGuess[]
  guessesUsed: number
  score: number
  answer?: Player
}

export interface WeeklyLeader {
  rank: number
  username: string
  points: number
  solved: number
  played: number
  isCurrentUser: boolean
}

export interface WeeklyLeaderboard {
  weekStart: string
  leaders: WeeklyLeader[]
  currentUser: WeeklyLeader | null
}

export class RankedApiError extends Error {
  status: number
  details: Record<string, unknown>
  constructor(status: number, details: Record<string, unknown>) {
    super(String(details.error || 'The case desk is unavailable.'))
    this.status = status
    this.details = details
  }
}

const toPlayer = (player: ApiPlayer): Player => ({
  ...player,
  aliases: [],
  dominantFoot: 'Unknown',
  shirtNumber: 0,
  portraitStatus: player.portraitUrl ? 'approved' : 'fallback',
})

const toDailyState = (state: Omit<RankedDailyState, 'guesses' | 'answer'> & { guesses: ApiGuess[]; answer?: ApiPlayer }): RankedDailyState => ({
  ...state,
  guesses: state.guesses.map(guess => ({ ...guess, player: toPlayer(guess.player) })),
  answer: state.answer ? toPlayer(state.answer) : undefined,
})

async function request<T>(path: string, options: RequestInit = {}, identity?: RankedIdentity): Promise<T> {
  if (!configuredUrl) throw new Error('Ranked play is not configured.')
  const response = await fetch(`${configuredUrl}/api${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(identity ? { authorization: `Bearer ${identity.token}` } : {}),
      ...options.headers,
    },
  })
  const body = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok) throw new RankedApiError(response.status, body)
  return body as T
}

export function loadRankedIdentity(): RankedIdentity | null {
  try {
    const value = localStorage.getItem(IDENTITY_KEY)
    return value ? JSON.parse(value) as RankedIdentity : null
  } catch {
    return null
  }
}

export function saveRankedIdentity(identity: RankedIdentity) {
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity))
}

export async function getUsernameSuggestions() {
  return request<{ suggestions: string[] }>('/username/suggestions')
}

export async function createIdentity(username: string) {
  return request<RankedIdentity>('/identity', { method: 'POST', body: JSON.stringify({ username }) })
}

export async function getDailyLineup(identity: RankedIdentity) {
  return toDailyState(await request<Parameters<typeof toDailyState>[0]>('/daily/lineup', {}, identity))
}

export async function submitDailyGuess(identity: RankedIdentity, playerId: string) {
  return toDailyState(await request<Parameters<typeof toDailyState>[0]>('/daily/lineup/guess', { method: 'POST', body: JSON.stringify({ playerId }) }, identity))
}

export function getWeeklyLeaderboard(identity: RankedIdentity) {
  return request<WeeklyLeaderboard>('/leaderboard/weekly', {}, identity)
}

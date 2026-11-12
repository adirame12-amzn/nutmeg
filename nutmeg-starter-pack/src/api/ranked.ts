import type { Comparison, GameStatus, LineupGuess, Player } from '../domain/types'
import type { ClubEvidence } from '../domain/paperTrail'

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

interface ApiPaperTrailClub {
  clubId: string
  wikidataClubId: string
  name: string
  start: string | null
  end: string | null
  appearances: number
  crestUrl?: string | null
  crestStatus: string
  sourceUrl: string
}

export interface RankedDailyState {
  date: string
  status: 'not_started' | GameStatus
  guesses: LineupGuess[]
  guessesUsed: number
  score: number
  answer?: Player
}

export interface RankedPaperTrailState {
  date: string
  status: 'not_started' | GameStatus
  guesses: Player[]
  guessesUsed: number
  score: number
  clubs: ClubEvidence[]
  clubCount: number
  sourceSnapshot: string
  answer?: Player
}

export interface RankedRedactedState {
  date: string
  status: 'not_started' | GameStatus
  attemptsUsed: number
  wrongAttempts: number
  score: number
  guessedLetters: string[]
  guesses: string[]
  slots: Array<{ id: string; kind: 'letter' | 'separator'; character: string; revealed: boolean }>
  evidence: Array<{ open: boolean; available: boolean; value?: string }>
  answer?: Player
  displayAnswer?: string
}

export interface RankedCipherState {
  date: string
  status: 'not_started' | GameStatus
  attemptsUsed: number
  score: number
  guesses: string[]
  guessedLetters: string[]
  scrambled: string[]
  hints: Array<{ open: boolean; available: boolean; value?: string }>
  nation?: string
  club?: string
  answer?: Player
  displayAnswer?: string
}

export interface WeeklyLeader {
  rank: number
  username: string
  points: number
  solved: number
  played: number
  stars: number
  isCurrentUser: boolean
}

export interface StarLeader {
  rank: number
  username: string
  stars: number
  latestWeek: string
  isCurrentUser: boolean
}

export interface WeeklyLeaderboard {
  weekStart: string
  leaders: WeeklyLeader[]
  currentUser: WeeklyLeader | null
  starLeaders: StarLeader[]
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

const toPaperTrailState = (state: Omit<RankedPaperTrailState, 'guesses' | 'clubs' | 'answer'> & { guesses: ApiPlayer[]; clubs: ApiPaperTrailClub[]; answer?: ApiPlayer }): RankedPaperTrailState => ({
  ...state,
  guesses: state.guesses.map(toPlayer),
  clubs: state.clubs.map(club => ({
    id: club.clubId,
    wikidataId: club.wikidataClubId,
    name: club.name,
    start: club.start,
    end: club.end,
    appearances: club.appearances,
    crestUrl: club.crestUrl,
    crestStatus: club.crestStatus,
    sourceUrl: club.sourceUrl,
  })),
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

export async function getDailyPaperTrail(identity: RankedIdentity) {
  return toPaperTrailState(await request<Parameters<typeof toPaperTrailState>[0]>('/daily/paper-trail', {}, identity))
}

export async function submitDailyPaperTrailGuess(identity: RankedIdentity, playerId: string) {
  return toPaperTrailState(await request<Parameters<typeof toPaperTrailState>[0]>('/daily/paper-trail/guess', { method: 'POST', body: JSON.stringify({ playerId }) }, identity))
}

const wordState = <T extends { answer?: ApiPlayer }>(state: T) => ({ ...state, answer: state.answer ? toPlayer(state.answer) : undefined })

export async function getDailyRedacted(identity: RankedIdentity) {
  return wordState(await request<Omit<RankedRedactedState, 'answer'> & { answer?: ApiPlayer }>('/daily/redacted', {}, identity)) as RankedRedactedState
}

export async function submitDailyRedactedLetter(identity: RankedIdentity, letter: string) {
  return wordState(await request<Omit<RankedRedactedState, 'answer'> & { answer?: ApiPlayer }>('/daily/redacted/letter', { method: 'POST', body: JSON.stringify({ letter }) }, identity)) as RankedRedactedState
}

export async function openDailyRedactedEvidence(identity: RankedIdentity, index: number) {
  return wordState(await request<Omit<RankedRedactedState, 'answer'> & { answer?: ApiPlayer }>('/daily/redacted/evidence', { method: 'POST', body: JSON.stringify({ index }) }, identity)) as RankedRedactedState
}

export async function submitDailyRedactedGuess(identity: RankedIdentity, playerId: string) {
  return wordState(await request<Omit<RankedRedactedState, 'answer'> & { answer?: ApiPlayer }>('/daily/redacted/guess', { method: 'POST', body: JSON.stringify({ playerId }) }, identity)) as RankedRedactedState
}

export async function getDailyCipher(identity: RankedIdentity) {
  return wordState(await request<Omit<RankedCipherState, 'answer'> & { answer?: ApiPlayer }>('/daily/cipher', {}, identity)) as RankedCipherState
}

export async function submitDailyCipherGuess(identity: RankedIdentity, guess: string) {
  return wordState(await request<Omit<RankedCipherState, 'answer'> & { answer?: ApiPlayer }>('/daily/cipher/guess', { method: 'POST', body: JSON.stringify({ guess }) }, identity)) as RankedCipherState
}

export async function openDailyCipherHint(identity: RankedIdentity, index: number) {
  return wordState(await request<Omit<RankedCipherState, 'answer'> & { answer?: ApiPlayer }>('/daily/cipher/hint', { method: 'POST', body: JSON.stringify({ index }) }, identity)) as RankedCipherState
}

export function getWeeklyLeaderboard(identity: RankedIdentity) {
  return request<WeeklyLeaderboard>('/leaderboard/weekly', {}, identity)
}

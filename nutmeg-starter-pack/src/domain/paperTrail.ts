import type { Player } from './types'

export const PAPER_TRAIL_GUESS_LIMIT = 6
export const PAPER_TRAIL_SCORING_VERSION = 'paper-trail-v1'
export const PAPER_TRAIL_SCORE_TABLE = [100, 85, 70, 55, 40, 25] as const

export interface ClubEvidence {
  id: string
  wikidataId: string
  name: string
  start: string | null
  end: string | null
  appearances: number
  crestUrl?: string | null
  crestEditorialUrl?: string | null
  crestStatus: string
  sourceUrl: string
}

export interface PaperTrailPuzzle {
  id: string
  answer: Player
  clubs: ClubEvidence[]
  sourceSnapshot: string
  sourceUrl: string
  scoringVersion: typeof PAPER_TRAIL_SCORING_VERSION
}

export function paperTrailScore(guessesUsed: number, won: boolean) {
  if (!won || guessesUsed < 1 || guessesUsed > PAPER_TRAIL_GUESS_LIMIT) return 0
  return PAPER_TRAIL_SCORE_TABLE[guessesUsed - 1]
}

export function paperTrailRevealCount(incorrectGuesses: number, availableClubs: number) {
  if (availableClubs <= 0) return 0
  return Math.min(availableClubs, Math.max(1, incorrectGuesses + 1))
}

export function canGuessPaperTrail(previousIds: string[], playerId: string) {
  return previousIds.length < PAPER_TRAIL_GUESS_LIMIT && !previousIds.includes(playerId)
}

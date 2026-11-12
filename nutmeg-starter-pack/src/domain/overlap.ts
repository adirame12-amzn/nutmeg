import type { Player } from './types'

export const OVERLAP_DURATION_MS = 30_000
export const OVERLAP_SCORE_TABLE = [0, 10, 40, 100] as const

export interface OverlapEvidence {
  id: string
  name: string
  kind: 'club' | 'country'
  crestUrl?: string | null
  flag?: string
}

export interface OverlapPuzzle {
  id: string
  clubA: OverlapEvidence
  clubB: OverlapEvidence
  country: OverlapEvidence
  perfectPlayerIds: string[]
  twoMatchPlayerIds: string[]
  sourceSnapshot: string
}

export interface OverlapVerdict {
  evidence: OverlapEvidence
  match: boolean
}

export interface OverlapResult {
  player: Player | null
  verdicts: OverlapVerdict[]
  matches: number
  points: number
  timedOut: boolean
  elapsedMs: number
}

export function overlapScore(matches: number) {
  return OVERLAP_SCORE_TABLE[Math.max(0, Math.min(3, matches))]
}

export function evaluateOverlap(puzzle: OverlapPuzzle, player: Player | null, clubIds: ReadonlySet<string>): OverlapResult {
  const verdicts = [
    { evidence: puzzle.clubA, match: Boolean(player && clubIds.has(puzzle.clubA.id)) },
    { evidence: puzzle.clubB, match: Boolean(player && clubIds.has(puzzle.clubB.id)) },
    { evidence: puzzle.country, match: Boolean(player && canonicalCountryId(player.nationalTeam) === puzzle.country.id) },
  ]
  const matches = verdicts.filter(verdict => verdict.match).length
  return { player, verdicts, matches, points: overlapScore(matches), timedOut: !player, elapsedMs: 0 }
}

export function canonicalCountryId(country: string) {
  return country.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

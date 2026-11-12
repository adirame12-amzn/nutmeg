import type { PlayerRow } from './types'

export const RANKED_GUESS_LIMIT = 6
export const RANKED_LINEUP_POINTS = [100, 80, 65, 50, 35, 20] as const
export const RANKED_PAPER_TRAIL_POINTS = [100, 85, 70, 55, 40, 25] as const

export type RankedStatus = 'match' | 'miss' | 'higher' | 'lower'

export interface RankedComparison {
  label: string
  value: string
  status: RankedStatus
  hint: string
}

const exact = (label: string, value: string, target: string): RankedComparison => ({
  label,
  value,
  status: value === target ? 'match' : 'miss',
  hint: value === target ? 'Exact match' : 'Not a match',
})

const directed = (label: string, value: number, target: number, age = false): RankedComparison => ({
  label,
  value: String(value),
  status: value === target ? 'match' : target > value ? 'higher' : 'lower',
  hint: value === target
    ? `Exact ${age ? 'age' : label}`
    : age ? `Target is ${target > value ? 'older' : 'younger'}` : `Target is ${target > value ? 'higher' : 'lower'}`,
})

export function compareRankedPlayers(guess: PlayerRow, target: PlayerRow): RankedComparison[] {
  const comparisons = [
    exact('Club', guess.club, target.club),
    exact('League', guess.league, target.league),
    exact('Nation', guess.nation, target.nation),
    exact('Position', guess.position, target.position),
    directed('Age', guess.age, target.age, true),
  ]
  if (guess.fc_overall !== null && target.fc_overall !== null) comparisons.push(directed('FC 27 OVR', guess.fc_overall, target.fc_overall))
  return comparisons
}

export function rankedLineupScore(guessNumber: number, won: boolean) {
  return won && guessNumber >= 1 && guessNumber <= RANKED_GUESS_LIMIT ? RANKED_LINEUP_POINTS[guessNumber - 1] : 0
}

export function rankedPaperTrailScore(guessNumber: number, won: boolean) {
  return won && guessNumber >= 1 && guessNumber <= RANKED_GUESS_LIMIT ? RANKED_PAPER_TRAIL_POINTS[guessNumber - 1] : 0
}

export function utcDate(value = new Date()) {
  return value.toISOString().slice(0, 10)
}

export function weekStartUtc(dateString: string) {
  const date = new Date(`${dateString}T00:00:00.000Z`)
  const mondayOffset = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - mondayOffset)
  return utcDate(date)
}

export function normaliseUsername(value: string) {
  return value.normalize('NFKC').trim().toLocaleLowerCase('en-US')
}

export function validateUsername(value: string) {
  const trimmed = value.normalize('NFKC').trim()
  if (!/^[A-Za-z][A-Za-z0-9_]{2,19}$/.test(trimmed)) {
    return { ok: false as const, error: 'Use 3–20 letters, numbers or underscores, starting with a letter.' }
  }
  return { ok: true as const, username: trimmed, key: normaliseUsername(trimmed) }
}

import type { Comparison, LineupGuess, Player } from './types'

export const LINEUP_GUESS_LIMIT = 6
export const MYSTERY_GUESS_LIMIT = 3
export const MYSTERY_QUESTION_LIMIT = 3
export const MYSTERY_CLUE_LIMIT = 3

const exactComparison = (label: string, value: string, targetValue: string): Comparison => {
  const isMatch = value === targetValue
  return {
    label,
    value,
    status: value === 'Unknown' ? 'unknown' : isMatch ? 'match' : 'miss',
    hint: value === 'Unknown' ? 'Not scored' : isMatch ? 'Exact match' : 'Not a match'
  }
}

export function comparePlayers(guess: Player, target: Player): LineupGuess {
  const ageStatus = guess.age === target.age ? 'match' : target.age > guess.age ? 'higher' : 'lower'
  const ageHint = guess.age === target.age
    ? 'Exact age'
    : target.age > guess.age
      ? 'Target is older'
      : 'Target is younger'

  return {
    player: guess,
    isCorrect: guess.id === target.id,
    comparisons: [
      exactComparison('Club', guess.currentClub, target.currentClub),
      exactComparison('League', guess.league, target.league),
      exactComparison('Nation', guess.nationalTeam, target.nationalTeam),
      exactComparison('Position', guess.position, target.position),
      { label: 'Age', value: String(guess.age), status: ageStatus, hint: ageHint },
      exactComparison('Foot', guess.dominantFoot, target.dominantFoot)
    ]
  }
}

export function canSubmitGuess(previousIds: string[], playerId: string, limit: number) {
  return previousIds.length < limit && !previousIds.includes(playerId)
}

export function lineupScore(guessesUsed: number, won: boolean) {
  if (!won) return 0
  return Math.max(25, 125 - guessesUsed * 15)
}

export function mysteryScore(cluesSeen: number, questionsUsed: number, guessesUsed: number, won: boolean) {
  if (!won) return 0
  return Math.max(0, 100 - 20 * (cluesSeen - 1) - 10 * questionsUsed - 15 * (guessesUsed - 1))
}

export function revealCount(current: number, limit = MYSTERY_CLUE_LIMIT) {
  return Math.min(current + 1, limit)
}

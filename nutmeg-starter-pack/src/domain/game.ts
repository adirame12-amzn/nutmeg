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

const directedNumberComparison = (label: string, value: number, targetValue: number): Comparison => ({
  label,
  value: String(value),
  status: value === targetValue ? 'match' : targetValue > value ? 'higher' : 'lower',
  hint: value === targetValue ? `Exact ${label}` : `Target is ${targetValue > value ? 'higher' : 'lower'}`
})

export function comparePlayers(guess: Player, target: Player): LineupGuess {
  const ageComparison = directedNumberComparison('Age', guess.age, target.age)
  ageComparison.hint = guess.age === target.age ? 'Exact age' : `Target is ${target.age > guess.age ? 'older' : 'younger'}`

  return {
    player: guess,
    isCorrect: guess.id === target.id,
    comparisons: [
      exactComparison('Club', guess.currentClub, target.currentClub),
      exactComparison('League', guess.league, target.league),
      exactComparison('Nation', guess.nationalTeam, target.nationalTeam),
      exactComparison('Position', guess.position, target.position),
      ageComparison,
      guess.fcOverall !== undefined && target.fcOverall !== undefined
        ? directedNumberComparison('FC 27 OVR', guess.fcOverall, target.fcOverall)
        : exactComparison('Foot', guess.dominantFoot, target.dominantFoot)
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

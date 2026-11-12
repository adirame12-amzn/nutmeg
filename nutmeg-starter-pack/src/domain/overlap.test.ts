import { describe, expect, it } from 'vitest'
import { evaluateOverlap, overlapScore } from './overlap'
import { overlapClubIdsByPlayer, overlapCoverage, overlapPuzzles } from '../data/overlap'
import { fc27Players } from '../data/fc27Players'

describe('The Overlap rules', () => {
  it('keeps only covered combinations with perfect and useful alternative answers', () => {
    expect(overlapCoverage.eligiblePlayers).toBeGreaterThan(0)
    expect(overlapCoverage.usefulCombinations).toBe(overlapPuzzles.length)
    expect(overlapPuzzles.every(puzzle => puzzle.clubA.id !== puzzle.clubB.id)).toBe(true)
    expect(overlapPuzzles.every(puzzle => puzzle.perfectPlayerIds.length > 0 && puzzle.twoMatchPlayerIds.length > 0)).toBe(true)
  })

  it('scores zero, one, two and three matches deterministically', () => {
    expect([0, 1, 2, 3].map(overlapScore)).toEqual([0, 10, 40, 100])
    const puzzle = overlapPuzzles[0]
    const perfect = fc27Players.find(player => puzzle.perfectPlayerIds.includes(player.id))!
    const result = evaluateOverlap(puzzle, perfect, overlapClubIdsByPlayer.get(perfect.id)!)
    expect(result.matches).toBe(3)
    expect(result.points).toBe(100)
  })
})

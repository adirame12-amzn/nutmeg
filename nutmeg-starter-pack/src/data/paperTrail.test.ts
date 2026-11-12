import { describe, expect, it } from 'vitest'
import { getRandomPaperTrailPuzzle, historyToPuzzle, paperTrailHistories } from './paperTrail'

describe('Paper Trail catalogue', () => {
  it('covers the eligible current player pool and selects deterministically', () => {
    expect(paperTrailHistories.length).toBe(87)
    expect(getRandomPaperTrailPuzzle(undefined, () => 0).clubs).toHaveLength(5)
    expect(getRandomPaperTrailPuzzle(undefined, () => .95).clubs.length).toBeLessThan(5)
  })

  it('excludes the previous answer and retains crest fallbacks', () => {
    const first = getRandomPaperTrailPuzzle(undefined, () => 0)
    const next = getRandomPaperTrailPuzzle(first.answer.id, () => 0)
    const puzzles = paperTrailHistories.map(historyToPuzzle)
    expect(next.answer.id).not.toBe(first.answer.id)
    expect(paperTrailHistories.some(history => history.clubs.length < 5)).toBe(true)
    expect(puzzles.some(puzzle => puzzle.clubs.some(club => Boolean(club.crestUrl)))).toBe(true)
    expect(puzzles.some(puzzle => puzzle.clubs.some(club => !club.crestUrl))).toBe(true)
  })
})

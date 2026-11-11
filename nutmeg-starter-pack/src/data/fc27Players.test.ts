import { describe, expect, it } from 'vitest'
import { searchPlayers } from './players'
import { fc27Players, getRandomLineupTarget } from './fc27Players'

describe('playable Lineup catalogue', () => {
  it('contains all 96 unique men rated 85+', () => {
    expect(fc27Players).toHaveLength(96)
    expect(new Set(fc27Players.map(player => player.id)).size).toBe(96)
    expect(Math.min(...fc27Players.map(player => player.fcOverall ?? 0))).toBe(85)
    expect(Math.max(...fc27Players.map(player => player.fcOverall ?? 0))).toBe(91)
  })

  it('can select across the full pool and excludes the previous answer', () => {
    expect(getRandomLineupTarget(undefined, () => 0)).toBe(fc27Players[0])
    expect(getRandomLineupTarget(undefined, () => 0.999_999)).toBe(fc27Players.at(-1))
    expect(getRandomLineupTarget(fc27Players[0].id, () => 0)).toBe(fc27Players[1])
  })

  it('finds Vini Jr. and Lautaro under common unaccented spellings', () => {
    expect(searchPlayers('vinicius', [], fc27Players).map(player => player.id)).toContain('vini-jr')
    expect(searchPlayers('vini jr', [], fc27Players).map(player => player.id)).toContain('vini-jr')
    expect(searchPlayers('lautaro martinez', [], fc27Players).map(player => player.id)).toContain('lautaro-martinez')
  })
})

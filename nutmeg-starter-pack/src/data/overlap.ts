import { canonicalCountryId, type OverlapEvidence, type OverlapPuzzle } from '../domain/overlap'
import { fc27Players } from './fc27Players'
import { paperTrailHistories } from './paperTrail'

const flagByCountry: Record<string, string> = {
  Argentina: '🇦🇷', Austria: '🇦🇹', Belgium: '🇧🇪', Brazil: '🇧🇷', Colombia: '🇨🇴', Croatia: '🇭🇷', Ecuador: '🇪🇨', Egypt: '🇪🇬', England: '🏴', France: '🇫🇷', Georgia: '🇬🇪', Germany: '🇩🇪', Ghana: '🇬🇭', Guinea: '🇬🇳', Holland: '🇳🇱', Hungary: '🇭🇺', Italy: '🇮🇹', Morocco: '🇲🇦', Nigeria: '🇳🇬', Norway: '🇳🇴', Portugal: '🇵🇹', Scotland: '🏴', Serbia: '🇷🇸', Slovenia: '🇸🇮', Spain: '🇪🇸', Sweden: '🇸🇪', Switzerland: '🇨🇭', Turkey: '🇹🇷', Uruguay: '🇺🇾',
}

const playersById = new Map(fc27Players.map(player => [player.id, player]))
export const overlapClubIdsByPlayer = new Map<string, Set<string>>()
const clubsById = new Map<string, OverlapEvidence>()

for (const history of paperTrailHistories) {
  const clubIds = new Set<string>()
  for (const club of history.clubs) {
    clubIds.add(club.wikidataClubId)
    if (!clubsById.has(club.wikidataClubId)) clubsById.set(club.wikidataClubId, {
      id: club.wikidataClubId,
      name: club.name,
      kind: 'club',
      crestUrl: club.crestUrl,
    })
  }
  overlapClubIdsByPlayer.set(history.playerId, clubIds)
}

const combinations = new Map<string, { clubAId: string; clubBId: string; countryId: string; perfectPlayerIds: Set<string>; snapshot: string }>()
for (const history of paperTrailHistories) {
  const player = playersById.get(history.playerId)
  if (!player) continue
  const clubIds = [...new Set(history.clubs.map(club => club.wikidataClubId))].sort()
  const countryId = canonicalCountryId(player.nationalTeam)
  for (let first = 0; first < clubIds.length; first += 1) {
    for (let second = first + 1; second < clubIds.length; second += 1) {
      const key = `${clubIds[first]}:${clubIds[second]}:${countryId}`
      const combination = combinations.get(key) || { clubAId: clubIds[first], clubBId: clubIds[second], countryId, perfectPlayerIds: new Set<string>(), snapshot: history.sourceSnapshot }
      combination.perfectPlayerIds.add(player.id)
      combinations.set(key, combination)
    }
  }
}

const matchCount = (playerId: string, clubAId: string, clubBId: string, countryId: string) => {
  const player = playersById.get(playerId)
  if (!player) return 0
  const clubs = overlapClubIdsByPlayer.get(playerId) || new Set<string>()
  return Number(clubs.has(clubAId)) + Number(clubs.has(clubBId)) + Number(canonicalCountryId(player.nationalTeam) === countryId)
}

export const overlapPuzzles: OverlapPuzzle[] = [...combinations.entries()].flatMap(([key, combination]) => {
  const twoMatchPlayerIds = fc27Players.filter(player => !combination.perfectPlayerIds.has(player.id) && matchCount(player.id, combination.clubAId, combination.clubBId, combination.countryId) === 2).map(player => player.id)
  const clubA = clubsById.get(combination.clubAId)
  const clubB = clubsById.get(combination.clubBId)
  const perfectPlayer = playersById.get([...combination.perfectPlayerIds][0])
  if (!clubA || !clubB || !perfectPlayer || twoMatchPlayerIds.length === 0) return []
  return [{
    id: `overlap-${key}`,
    clubA,
    clubB,
    country: { id: combination.countryId, name: perfectPlayer.nationalTeam, kind: 'country', flag: flagByCountry[perfectPlayer.nationalTeam] || '⚑' },
    perfectPlayerIds: [...combination.perfectPlayerIds],
    twoMatchPlayerIds,
    sourceSnapshot: combination.snapshot,
  }]
})

export const overlapCoverage = {
  eligiblePlayers: paperTrailHistories.length,
  uniqueClubs: clubsById.size,
  countries: new Set(paperTrailHistories.map(history => playersById.get(history.playerId)?.nationalTeam).filter(Boolean)).size,
  verifiedPlayerClubRelationships: [...overlapClubIdsByPlayer.values()].reduce((total, clubs) => total + clubs.size, 0),
  threeMatchCombinations: combinations.size,
  usefulCombinations: overlapPuzzles.length,
  excludedWithoutUsefulAlternative: combinations.size - overlapPuzzles.length,
}

export function getRandomOverlapPuzzle(excludeId?: string, random: () => number = Math.random) {
  const candidates = overlapPuzzles.filter(puzzle => puzzle.id !== excludeId)
  const pool = candidates.length ? candidates : overlapPuzzles
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]
}

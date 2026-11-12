import puzzlesJson from '../../data/generated/paper-trail/puzzles.json'
import { PAPER_TRAIL_SCORING_VERSION, type ClubEvidence, type PaperTrailPuzzle } from '../domain/paperTrail'
import { fc27Players } from './fc27Players'

interface GeneratedStint {
  clubId: string
  wikidataClubId: string
  name: string
  start: string | null
  end: string | null
  appearances: number
  crestUrl?: string | null
  crestEditorialUrl?: string | null
  crestStatus: string
  sourceUrl: string
}

interface GeneratedHistory {
  playerId: string
  sourceSnapshot: string
  sourceUrl: string
  clubs: GeneratedStint[]
}

const playersById = new Map(fc27Players.map(player => [player.id, player]))

export const paperTrailHistories = (puzzlesJson as GeneratedHistory[])
  .filter(history => history.clubs.length >= 2 && playersById.has(history.playerId))

export function historyToPuzzle(history: GeneratedHistory): PaperTrailPuzzle {
  const answer = playersById.get(history.playerId)
  if (!answer) throw new Error(`Paper Trail player is missing from the catalogue: ${history.playerId}`)
  const clubs: ClubEvidence[] = history.clubs.slice(0, 5).map(stint => ({
      id: stint.clubId,
      wikidataId: stint.wikidataClubId,
      name: stint.name,
      start: stint.start,
      end: stint.end,
      appearances: stint.appearances,
      crestUrl: stint.crestUrl,
      crestEditorialUrl: stint.crestEditorialUrl,
      crestStatus: stint.crestStatus || 'fallback',
      sourceUrl: stint.sourceUrl || `https://www.wikidata.org/wiki/${stint.wikidataClubId}`,
    }))
  return {
    id: `practice-${history.sourceSnapshot}-${history.playerId}`,
    answer,
    clubs,
    sourceSnapshot: history.sourceSnapshot,
    sourceUrl: history.sourceUrl,
    scoringVersion: PAPER_TRAIL_SCORING_VERSION,
  }
}

export function getRandomPaperTrailPuzzle(excludePlayerId?: string, random: () => number = Math.random) {
  const candidates = excludePlayerId
    ? paperTrailHistories.filter(history => history.playerId !== excludePlayerId)
    : paperTrailHistories
  const fullFive = candidates.filter(history => history.clubs.length >= 5)
  const shorter = candidates.filter(history => history.clubs.length < 5)
  const roll = random()
  const selectedPool = roll < .8 && fullFive.length ? fullFive : shorter.length ? shorter : fullFive
  const normalizedRoll = roll < .8 ? roll / .8 : (roll - .8) / .2
  const index = Math.min(selectedPool.length - 1, Math.floor(normalizedRoll * selectedPool.length))
  return historyToPuzzle(selectedPool[index])
}

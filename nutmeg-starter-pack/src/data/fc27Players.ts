import previewPlayers from '../../data/generated/players.json'
import rating85PlusPlayers from '../../data/generated/rating-85-plus/players.json'
import type { Player } from '../domain/types'

type GeneratedPlayer = Omit<Player, 'shirtNumber' | 'portraitStatus'> & {
  shirtNumber?: number
  portraitStatus?: string
}

const toPlayablePlayer = (player: GeneratedPlayer): Player => ({
  ...player,
  shirtNumber: player.shirtNumber ?? 0,
  portraitStatus: player.portraitStatus === 'fallback' ? 'fallback' : 'approved',
})

const combinedPlayers = [
  ...(previewPlayers as GeneratedPlayer[]),
  ...(rating85PlusPlayers as GeneratedPlayer[]),
].map(toPlayablePlayer)

/** All reviewed prototype records currently available to Prime Suspect. */
export const fc27Players = Array.from(
  new Map(combinedPlayers.map(player => [player.id, player])).values(),
)

/** Pick a fresh answer, optionally excluding the answer from the previous round. */
export const getRandomLineupTarget = (excludeId?: string, random: () => number = Math.random) => {
  const candidates = excludeId
    ? fc27Players.filter(player => player.id !== excludeId)
    : fc27Players
  const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length))
  return candidates[index]
}

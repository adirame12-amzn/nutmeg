import type { Player } from '../domain/types'

// Synthetic people and clubs for UI/gameplay testing only. No real-world claims.
export const players: Player[] = [
  { id: 'mara-voss', displayName: 'Mara Voss', aliases: ['M Voss'], currentClub: 'Northbank FC', league: 'Crown League', nationalTeam: 'Netherlands', position: 'Midfielder', age: 27, dominantFoot: 'Left', shirtNumber: 8 },
  { id: 'theo-bell', displayName: 'Theo Bell', aliases: ['T Bell'], currentClub: 'Harbour Athletic', league: 'Crown League', nationalTeam: 'England', position: 'Forward', age: 24, dominantFoot: 'Right', shirtNumber: 9 },
  { id: 'imani-kone', displayName: 'Imani Koné', aliases: ['I Kone'], currentClub: 'AS Lumière', league: 'Hexagon One', nationalTeam: 'France', position: 'Midfielder', age: 29, dominantFoot: 'Right', shirtNumber: 6 },
  { id: 'lucas-serra', displayName: 'Lucas Serra', aliases: ['L Serra'], currentClub: 'Puerto Real', league: 'Liga Sol', nationalTeam: 'Spain', position: 'Defender', age: 31, dominantFoot: 'Left', shirtNumber: 4 },
  { id: 'nia-calder', displayName: 'Nia Calder', aliases: ['N Calder'], currentClub: 'Northbank FC', league: 'Crown League', nationalTeam: 'Scotland', position: 'Forward', age: 22, dominantFoot: 'Right', shirtNumber: 11 },
  { id: 'rafa-okoro', displayName: 'Rafa Okoro', aliases: ['R Okoro'], currentClub: 'Cobalt City', league: 'Crown League', nationalTeam: 'Nigeria', position: 'Defender', age: 27, dominantFoot: 'Right', shirtNumber: 2 },
  { id: 'elio-marin', displayName: 'Elio Marín', aliases: ['E Marin'], currentClub: 'Puerto Real', league: 'Liga Sol', nationalTeam: 'Argentina', position: 'Forward', age: 26, dominantFoot: 'Left', shirtNumber: 10 },
  { id: 'sana-diallo', displayName: 'Sana Diallo', aliases: ['S Diallo'], currentClub: 'AS Lumière', league: 'Hexagon One', nationalTeam: 'Senegal', position: 'Goalkeeper', age: 30, dominantFoot: 'Right', shirtNumber: 1 },
  { id: 'otto-reed', displayName: 'Otto Reed', aliases: ['O Reed'], currentClub: 'Harbour Athletic', league: 'Crown League', nationalTeam: 'Wales', position: 'Midfielder', age: 27, dominantFoot: 'Left', shirtNumber: 18 },
  { id: 'cass-mori', displayName: 'Cass Mori', aliases: ['C Mori'], currentClub: 'Torino Verde', league: 'Serie Prima', nationalTeam: 'Japan', position: 'Defender', age: 25, dominantFoot: 'Unknown', shirtNumber: 5 }
]

export const lineupTarget = players[0]
export const mysteryTarget = players[4]

const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()

export function searchPlayers(query: string, excludedIds: string[] = [], pool: Player[] = players) {
  const normalized = normalizeSearch(query.trim())
  if (!normalized) return []
  return pool
    .filter(player => !excludedIds.includes(player.id))
    .filter(player => [player.displayName, ...player.aliases].some(name => normalizeSearch(name).includes(normalized)))
    .slice(0, 5)
}

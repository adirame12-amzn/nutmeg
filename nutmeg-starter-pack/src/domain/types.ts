export type Position = 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward'
export type Foot = 'Left' | 'Right' | 'Unknown'

export interface Player {
  id: string
  displayName: string
  aliases: string[]
  currentClub: string
  league: string
  nationalTeam: string
  position: Position
  age: number
  dominantFoot: Foot
  shirtNumber: number
  fcOverall?: number
  portraitUrl?: string
  portraitEditorialUrl?: string
  portraitCutoutUrl?: string | null
  portraitCutoutEditorialUrl?: string | null
  portraitCutoutStatus?: 'reviewed' | 'unavailable'
  portraitStatus?: 'approved' | 'fallback'
  sourceSnapshot?: string
  dataStatus?: string
  wikidataId?: string | null
}

export type MatchStatus = 'match' | 'miss' | 'higher' | 'lower' | 'unknown'

export interface Comparison {
  label: string
  value: string
  status: MatchStatus
  hint: string
}

export interface LineupGuess {
  player: Player
  comparisons: Comparison[]
  isCorrect: boolean
}

export interface MysteryFact {
  id: string
  text: string
}

export interface MysteryQuestion {
  id: string
  text: string
  answer: 'Yes' | 'No'
}

export type GameStatus = 'playing' | 'won' | 'lost'

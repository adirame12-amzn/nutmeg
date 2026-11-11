export interface D1Result<T = unknown> {
  results?: T[]
  success: boolean
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = Record<string, unknown>>(): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>
}

export interface Env {
  DB: D1Database
  ALLOWED_ORIGINS?: string
}

export interface PlayerRow {
  id: string
  display_name: string
  club: string
  league: string
  nation: string
  position: string
  age: number
  fc_overall: number | null
  portrait_url: string | null
  portrait_editorial_url: string | null
  portrait_cutout_editorial_url: string | null
}

export interface PuzzleRow {
  id: string
  puzzle_date: string
  target_player_id: string
}

export interface UserRow {
  id: string
  username: string
}

export interface AttemptRow {
  id: string
  status: 'playing' | 'won' | 'lost'
  guesses_used: number
  score: number
}


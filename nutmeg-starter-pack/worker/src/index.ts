import { compareRankedPlayers, normaliseUsername, rankedLineupScore, rankedPaperTrailScore, RANKED_GUESS_LIMIT, utcDate, validateUsername, weekStartUtc } from './rules'
import type { AttemptRow, Env, PaperTrailPuzzleRow, PlayerRow, PuzzleRow, UserRow } from './types'

const DEFAULT_ORIGINS = [
  'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:5175', 'http://127.0.0.1:5176', 'http://127.0.0.1:5177',
  'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177',
  'https://adirame12-amzn.github.io',
]

const json = (payload: unknown, status = 200, headers: HeadersInit = {}) => new Response(JSON.stringify(payload), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
})

const allowedOrigin = (request: Request, env: Env) => {
  const origin = request.headers.get('origin') || ''
  const configured = env.ALLOWED_ORIGINS?.split(',').map(value => value.trim()).filter(Boolean) || []
  return [...DEFAULT_ORIGINS, ...configured].includes(origin) ? origin : ''
}

const cors = (origin: string): Record<string, string> => origin ? {
  'access-control-allow-origin': origin,
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'vary': 'Origin',
} : {}

const randomToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

const bearer = (request: Request) => request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1]

async function authenticate(request: Request, env: Env) {
  const token = bearer(request)
  if (!token) return null
  const hash = await sha256(token)
  const user = await env.DB.prepare('SELECT id, username FROM users WHERE token_hash = ?').bind(hash).first<UserRow>()
  if (user) env.DB.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').bind(new Date().toISOString(), user.id).run().catch(() => undefined)
  return user
}

const playerPublic = (player: PlayerRow) => ({
  id: player.id,
  displayName: player.display_name,
  currentClub: player.club,
  league: player.league,
  nationalTeam: player.nation,
  position: player.position,
  age: player.age,
  fcOverall: player.fc_overall,
  portraitUrl: player.portrait_url,
  portraitEditorialUrl: player.portrait_editorial_url,
  portraitCutoutEditorialUrl: player.portrait_cutout_editorial_url,
})

async function ensureDailyPuzzle(env: Env, date = utcDate()): Promise<PuzzleRow> {
  const existing = await env.DB.prepare("SELECT id, puzzle_date, target_player_id FROM daily_puzzles WHERE puzzle_date = ? AND mode = 'lineup'").bind(date).first<PuzzleRow>()
  if (existing) return existing
  const target = await env.DB.prepare('SELECT id FROM players WHERE eligible_answer = 1 ORDER BY RANDOM() LIMIT 1').first<{ id: string }>()
  if (!target) throw new Error('The ranked player pool has not been seeded.')
  await env.DB.prepare("INSERT OR IGNORE INTO daily_puzzles (id, puzzle_date, mode, target_player_id, created_at) VALUES (?, ?, 'lineup', ?, ?)")
    .bind(`lineup:${date}`, date, target.id, new Date().toISOString()).run()
  const puzzle = await env.DB.prepare("SELECT id, puzzle_date, target_player_id FROM daily_puzzles WHERE puzzle_date = ? AND mode = 'lineup'").bind(date).first<PuzzleRow>()
  if (!puzzle) throw new Error('Unable to create the daily puzzle.')
  return puzzle
}

async function getAttemptState(env: Env, userId: string, puzzle: PuzzleRow) {
  const attempt = await env.DB.prepare('SELECT id, status, guesses_used, score FROM attempts WHERE user_id = ? AND puzzle_id = ?')
    .bind(userId, puzzle.id).first<AttemptRow>()
  if (!attempt) return { date: puzzle.puzzle_date, status: 'not_started', guesses: [], guessesUsed: 0, score: 0 }
  const rows = await env.DB.prepare('SELECT response_json FROM attempt_guesses WHERE attempt_id = ? ORDER BY guess_number').bind(attempt.id).all<{ response_json: string }>()
  const guesses = (rows.results || []).map(row => JSON.parse(row.response_json))
  let answer
  if (attempt.status !== 'playing') {
    const target = await env.DB.prepare('SELECT * FROM players WHERE id = ?').bind(puzzle.target_player_id).first<PlayerRow>()
    answer = target ? playerPublic(target) : undefined
  }
  return { date: puzzle.puzzle_date, status: attempt.status, guesses, guessesUsed: attempt.guesses_used, score: attempt.score, answer }
}

interface PaperTrailClub {
  clubId: string
  wikidataClubId: string
  name: string
  start: string | null
  end: string | null
  appearances: number
  crestUrl?: string | null
  crestStatus: string
  sourceUrl: string
}

const parsePaperTrailClubs = (value: string): PaperTrailClub[] => {
  const parsed = JSON.parse(value) as unknown
  if (!Array.isArray(parsed) || parsed.length < 2 || parsed.length > 5) throw new Error('The Paper Trail path is invalid.')
  return parsed as PaperTrailClub[]
}

async function ensureDailyPaperTrailPuzzle(env: Env, date = utcDate()): Promise<PaperTrailPuzzleRow> {
  const existing = await env.DB.prepare('SELECT id, puzzle_date, target_player_id, clubs_json, source_snapshot FROM paper_trail_daily_puzzles WHERE puzzle_date = ?')
    .bind(date).first<PaperTrailPuzzleRow>()
  if (existing) return existing
  const target = await env.DB.prepare('SELECT player_id, clubs_json, source_snapshot FROM paper_trail_paths ORDER BY RANDOM() LIMIT 1')
    .first<{ player_id: string; clubs_json: string; source_snapshot: string }>()
  if (!target) throw new Error('The ranked Paper Trail pool has not been seeded.')
  parsePaperTrailClubs(target.clubs_json)
  await env.DB.prepare('INSERT OR IGNORE INTO paper_trail_daily_puzzles (id, puzzle_date, target_player_id, clubs_json, source_snapshot, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(`paper-trail:${date}`, date, target.player_id, target.clubs_json, target.source_snapshot, new Date().toISOString()).run()
  const puzzle = await env.DB.prepare('SELECT id, puzzle_date, target_player_id, clubs_json, source_snapshot FROM paper_trail_daily_puzzles WHERE puzzle_date = ?')
    .bind(date).first<PaperTrailPuzzleRow>()
  if (!puzzle) throw new Error('Unable to create the daily Paper Trail puzzle.')
  return puzzle
}

async function getPaperTrailAttemptState(env: Env, userId: string, puzzle: PaperTrailPuzzleRow) {
  const clubs = parsePaperTrailClubs(puzzle.clubs_json)
  const attempt = await env.DB.prepare('SELECT id, status, guesses_used, score FROM paper_trail_attempts WHERE user_id = ? AND puzzle_id = ?')
    .bind(userId, puzzle.id).first<AttemptRow>()
  if (!attempt) return {
    date: puzzle.puzzle_date, status: 'not_started', guesses: [], guessesUsed: 0, score: 0,
    clubs: clubs.slice(0, 1), clubCount: clubs.length, sourceSnapshot: puzzle.source_snapshot,
  }
  const rows = await env.DB.prepare('SELECT response_json FROM paper_trail_guesses WHERE attempt_id = ? ORDER BY guess_number')
    .bind(attempt.id).all<{ response_json: string }>()
  const guesses = (rows.results || []).map(row => JSON.parse(row.response_json).player)
  const complete = attempt.status !== 'playing'
  let answer
  if (complete) {
    const target = await env.DB.prepare('SELECT * FROM players WHERE id = ?').bind(puzzle.target_player_id).first<PlayerRow>()
    answer = target ? playerPublic(target) : undefined
  }
  const revealedCount = complete ? clubs.length : Math.min(clubs.length, attempt.guesses_used + 1)
  return {
    date: puzzle.puzzle_date, status: attempt.status, guesses, guessesUsed: attempt.guesses_used,
    score: attempt.score, clubs: clubs.slice(0, revealedCount), clubCount: clubs.length,
    sourceSnapshot: puzzle.source_snapshot, answer,
  }
}

const suggestionParts = {
  first: ['Goal', 'Press', 'Pitch', 'Final', 'Sharp', 'Match', 'Boot', 'Tackle'],
  second: ['Sleuth', 'Agent', 'Scout', 'Detective', 'Witness', 'Inspector', 'Reader', 'Whistle'],
}

async function suggestions(env: Env) {
  const candidates = Array.from({ length: 12 }, () => {
    const first = suggestionParts.first[Math.floor(Math.random() * suggestionParts.first.length)]
    const second = suggestionParts.second[Math.floor(Math.random() * suggestionParts.second.length)]
    return `${first}${second}${Math.floor(10 + Math.random() * 90)}`
  })
  const available: string[] = []
  for (const candidate of candidates) {
    const found = await env.DB.prepare('SELECT 1 AS found FROM users WHERE username_key = ?').bind(normaliseUsername(candidate)).first()
    if (!found && !available.includes(candidate)) available.push(candidate)
    if (available.length === 3) break
  }
  return available
}

async function route(request: Request, env: Env) {
  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/api/, '')

  if (request.method === 'GET' && path === '/health') return json({ ok: true, service: 'player-press-ranked' })

  if (request.method === 'GET' && path === '/username/suggestions') return json({ suggestions: await suggestions(env) })

  if (request.method === 'POST' && path === '/identity') {
    const body = await request.json().catch(() => ({})) as { username?: string }
    const validated = validateUsername(body.username || '')
    if (!validated.ok) return json({ error: validated.error }, 400)
    const token = randomToken()
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    try {
      await env.DB.prepare('INSERT INTO users (id, username, username_key, token_hash, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(id, validated.username, validated.key, await sha256(token), now, now).run()
    } catch (error) {
      if (String(error).toLowerCase().includes('unique')) return json({ error: 'That detective name is already taken.', code: 'USERNAME_TAKEN', suggestions: await suggestions(env) }, 409)
      throw error
    }
    return json({ user: { id, username: validated.username }, token }, 201)
  }

  const user = await authenticate(request, env)
  if (!user) return json({ error: 'This browser is not registered. Choose a detective name first.' }, 401)
  if (request.method === 'GET' && path === '/me') return json({ user })

  if (request.method === 'GET' && path === '/daily/lineup') {
    const puzzle = await ensureDailyPuzzle(env)
    return json(await getAttemptState(env, user.id, puzzle))
  }

  if (request.method === 'POST' && path === '/daily/lineup/guess') {
    const body = await request.json().catch(() => ({})) as { playerId?: string }
    if (!body.playerId) return json({ error: 'Choose a valid suspect.' }, 400)
    const puzzle = await ensureDailyPuzzle(env)
    let attempt = await env.DB.prepare('SELECT id, status, guesses_used, score FROM attempts WHERE user_id = ? AND puzzle_id = ?')
      .bind(user.id, puzzle.id).first<AttemptRow>()
    if (!attempt) {
      const now = new Date().toISOString()
      await env.DB.prepare("INSERT OR IGNORE INTO attempts (id, user_id, puzzle_id, status, guesses_used, score, started_at) VALUES (?, ?, ?, 'playing', 0, 0, ?)")
        .bind(crypto.randomUUID(), user.id, puzzle.id, now).run()
      attempt = await env.DB.prepare('SELECT id, status, guesses_used, score FROM attempts WHERE user_id = ? AND puzzle_id = ?')
        .bind(user.id, puzzle.id).first<AttemptRow>()
    }
    if (!attempt) throw new Error('Unable to start the ranked attempt.')
    if (attempt.status !== 'playing') return json({ error: 'Today’s ranked case is already complete.', state: await getAttemptState(env, user.id, puzzle) }, 409)
    if (attempt.guesses_used >= RANKED_GUESS_LIMIT) return json({ error: 'No ranked guesses remain.' }, 409)
    const duplicate = await env.DB.prepare('SELECT 1 AS found FROM attempt_guesses WHERE attempt_id = ? AND player_id = ?').bind(attempt.id, body.playerId).first()
    if (duplicate) return json({ error: 'That suspect is already in your case file.' }, 409)
    const [guess, target] = await Promise.all([
      env.DB.prepare('SELECT * FROM players WHERE id = ?').bind(body.playerId).first<PlayerRow>(),
      env.DB.prepare('SELECT * FROM players WHERE id = ?').bind(puzzle.target_player_id).first<PlayerRow>(),
    ])
    if (!guess || !target) return json({ error: 'That player is not in the ranked pool.' }, 400)
    const guessNumber = attempt.guesses_used + 1
    const correct = guess.id === target.id
    const status = correct ? 'won' : guessNumber >= RANKED_GUESS_LIMIT ? 'lost' : 'playing'
    const score = rankedLineupScore(guessNumber, correct)
    const response = { player: playerPublic(guess), comparisons: compareRankedPlayers(guess, target), isCorrect: correct }
    const completedAt = status === 'playing' ? null : new Date().toISOString()
    try {
      await env.DB.batch([
        env.DB.prepare('INSERT INTO attempt_guesses (id, attempt_id, guess_number, player_id, response_json, is_correct, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .bind(crypto.randomUUID(), attempt.id, guessNumber, guess.id, JSON.stringify(response), correct ? 1 : 0, new Date().toISOString()),
        env.DB.prepare('UPDATE attempts SET status = ?, guesses_used = ?, score = ?, completed_at = ? WHERE id = ? AND status = \'playing\'')
          .bind(status, guessNumber, score, completedAt, attempt.id),
      ])
    } catch (error) {
      if (String(error).toLowerCase().includes('unique')) return json({ error: 'That guess was already recorded. Refreshing your case file.', state: await getAttemptState(env, user.id, puzzle) }, 409)
      throw error
    }
    return json(await getAttemptState(env, user.id, puzzle))
  }

  if (request.method === 'GET' && path === '/daily/paper-trail') {
    const puzzle = await ensureDailyPaperTrailPuzzle(env)
    return json(await getPaperTrailAttemptState(env, user.id, puzzle))
  }

  if (request.method === 'POST' && path === '/daily/paper-trail/guess') {
    const body = await request.json().catch(() => ({})) as { playerId?: string }
    if (!body.playerId) return json({ error: 'Choose a valid suspect.' }, 400)
    const puzzle = await ensureDailyPaperTrailPuzzle(env)
    let attempt = await env.DB.prepare('SELECT id, status, guesses_used, score FROM paper_trail_attempts WHERE user_id = ? AND puzzle_id = ?')
      .bind(user.id, puzzle.id).first<AttemptRow>()
    if (!attempt) {
      await env.DB.prepare("INSERT OR IGNORE INTO paper_trail_attempts (id, user_id, puzzle_id, status, guesses_used, score, started_at) VALUES (?, ?, ?, 'playing', 0, 0, ?)")
        .bind(crypto.randomUUID(), user.id, puzzle.id, new Date().toISOString()).run()
      attempt = await env.DB.prepare('SELECT id, status, guesses_used, score FROM paper_trail_attempts WHERE user_id = ? AND puzzle_id = ?')
        .bind(user.id, puzzle.id).first<AttemptRow>()
    }
    if (!attempt) throw new Error('Unable to start the ranked Paper Trail attempt.')
    if (attempt.status !== 'playing') return json({ error: 'Today’s ranked Paper Trail is already complete.', state: await getPaperTrailAttemptState(env, user.id, puzzle) }, 409)
    if (attempt.guesses_used >= RANKED_GUESS_LIMIT) return json({ error: 'No ranked guesses remain.' }, 409)
    const duplicate = await env.DB.prepare('SELECT 1 AS found FROM paper_trail_guesses WHERE attempt_id = ? AND player_id = ?')
      .bind(attempt.id, body.playerId).first()
    if (duplicate) return json({ error: 'That suspect is already in your case file.' }, 409)
    const [guess, target] = await Promise.all([
      env.DB.prepare('SELECT * FROM players WHERE id = ?').bind(body.playerId).first<PlayerRow>(),
      env.DB.prepare('SELECT * FROM players WHERE id = ?').bind(puzzle.target_player_id).first<PlayerRow>(),
    ])
    if (!guess || !target) return json({ error: 'That player is not in the ranked pool.' }, 400)
    const guessNumber = attempt.guesses_used + 1
    const correct = guess.id === target.id
    const status = correct ? 'won' : guessNumber >= RANKED_GUESS_LIMIT ? 'lost' : 'playing'
    const score = rankedPaperTrailScore(guessNumber, correct)
    const response = { player: playerPublic(guess), isCorrect: correct }
    const completedAt = status === 'playing' ? null : new Date().toISOString()
    try {
      await env.DB.batch([
        env.DB.prepare('INSERT INTO paper_trail_guesses (id, attempt_id, guess_number, player_id, response_json, is_correct, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .bind(crypto.randomUUID(), attempt.id, guessNumber, guess.id, JSON.stringify(response), correct ? 1 : 0, new Date().toISOString()),
        env.DB.prepare("UPDATE paper_trail_attempts SET status = ?, guesses_used = ?, score = ?, completed_at = ? WHERE id = ? AND status = 'playing'")
          .bind(status, guessNumber, score, completedAt, attempt.id),
      ])
    } catch (error) {
      if (String(error).toLowerCase().includes('unique')) return json({ error: 'That guess was already recorded. Refreshing your case file.', state: await getPaperTrailAttemptState(env, user.id, puzzle) }, 409)
      throw error
    }
    return json(await getPaperTrailAttemptState(env, user.id, puzzle))
  }

  if (request.method === 'GET' && path === '/leaderboard/weekly') {
    const today = utcDate()
    const start = weekStartUtc(today)
    const rows = await env.DB.prepare(`
      WITH scored_cases AS (
        SELECT a.user_id, a.status, a.score, p.puzzle_date
        FROM attempts a JOIN daily_puzzles p ON p.id = a.puzzle_id
        WHERE a.status IN ('won', 'lost')
        UNION ALL
        SELECT a.user_id, a.status, a.score, p.puzzle_date
        FROM paper_trail_attempts a JOIN paper_trail_daily_puzzles p ON p.id = a.puzzle_id
        WHERE a.status IN ('won', 'lost')
      )
      SELECT u.id AS user_id, u.username, COALESCE(SUM(c.score), 0) AS points,
             SUM(CASE WHEN c.status = 'won' THEN 1 ELSE 0 END) AS solved,
             COUNT(*) AS played
      FROM scored_cases c
      JOIN users u ON u.id = c.user_id
      WHERE c.puzzle_date >= ? AND c.puzzle_date <= ?
      GROUP BY u.id, u.username
      ORDER BY points DESC, solved DESC, played ASC, u.created_at ASC
      LIMIT 100
    `).bind(start, today).all<{ user_id: string; username: string; points: number; solved: number; played: number }>()
    const leaders = (rows.results || []).map((row, index) => ({ rank: index + 1, username: row.username, points: Number(row.points), solved: Number(row.solved), played: Number(row.played), isCurrentUser: row.user_id === user.id }))
    return json({ weekStart: start, leaders, currentUser: leaders.find(row => row.isCurrentUser) || null })
  }

  return json({ error: 'Not found.' }, 404)
}

export default {
  async fetch(request: Request, env: Env) {
    const origin = allowedOrigin(request, env)
    if (request.method === 'OPTIONS') return new Response(null, { status: origin ? 204 : 403, headers: cors(origin) })
    if (request.headers.has('origin') && !origin) return json({ error: 'Origin not allowed.' }, 403)
    try {
      const response = await route(request, env)
      const headers = new Headers(response.headers)
      Object.entries(cors(origin)).forEach(([key, value]) => headers.set(key, String(value)))
      headers.set('cache-control', 'no-store')
      return new Response(response.body, { status: response.status, headers })
    } catch (error) {
      console.error(error)
      return json({ error: 'The case desk is temporarily unavailable.' }, 500, cors(origin))
    }
  },
  async scheduled(_controller: unknown, env: Env) {
    await Promise.all([ensureDailyPuzzle(env), ensureDailyPaperTrailPuzzle(env)])
  },
}

import { compareRankedPlayers, normaliseUsername, previousWeekUtc, rankedCipherScore, rankedLineupScore, rankedOverlapScore, rankedPaperTrailScore, RANKED_GUESS_LIMIT, RANKED_TIMED_SECONDS, utcDate, validateUsername, weekStartUtc } from './rules'
import type { AttemptRow, Env, PaperTrailPuzzleRow, PlayerRow, PuzzleRow, UserRow } from './types'
import { ACHIEVEMENTS, syncAchievements } from './achievements'

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

const withNewAchievements = async <T extends Record<string, unknown>>(env: Env, userId: string, state: T) => {
  const collection = await syncAchievements(env.DB, userId)
  return { ...state, newBadgeIds: collection.newlyEarned }
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

type WordMode = 'redacted' | 'cipher'
interface WordPuzzleRow extends PuzzleRow { mode: WordMode; display_answer: string; scrambled_answer: string | null }
interface WordAttemptRow extends AttemptRow { attempts_used: number; guessed_letters: string; evidence_opened: number; guesses_json: string; deadline_at: string | null }
interface TimedAttemptRow extends AttemptRow { deadline_at: string | null }

const deadlineFrom = (date = new Date()) => new Date(date.getTime() + RANKED_TIMED_SECONDS * 1000).toISOString()
const isExpired = (deadline: string | null) => Boolean(deadline && Date.parse(deadline) <= Date.now())

const wordNames: Record<string, string> = {
  'vini-jr': 'Vini Jr.', 'virgil-van-dijk': 'Van Dijk', 'kevin-de-bruyne': 'De Bruyne',
  'frenkie-de-jong': 'De Jong',
}
const wordTransliteration: Record<string, string> = { Ø: 'O', ø: 'o', Ł: 'L', ł: 'l', Đ: 'D', đ: 'd', Ð: 'D', ð: 'd', Þ: 'TH', þ: 'th', Æ: 'AE', æ: 'ae', Œ: 'OE', œ: 'oe', ß: 'SS' }
const normalizeWord = (value: string) => value.replace(/[ØøŁłĐđÐðÞþÆæŒœß]/g, character => wordTransliteration[character] || character).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleUpperCase('en-US').replace(/[^A-Z]/g, '')
const displayWord = (player: PlayerRow) => wordNames[player.id] || player.display_name.trim().split(/\s+/).at(-1) || player.display_name
const scrambleWord = (value: string) => {
  const letters = normalizeWord(value).split('')
  for (let index = letters.length - 1; index > 0; index -= 1) {
    const random = crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000
    const swap = Math.floor(random * (index + 1)); [letters[index], letters[swap]] = [letters[swap], letters[index]]
  }
  if (letters.join('') === normalizeWord(value) && letters.length > 1) letters.push(letters.shift()!)
  return letters.join('')
}

async function ensureDailyWordPuzzle(env: Env, mode: WordMode, date = utcDate()): Promise<WordPuzzleRow> {
  const existing = await env.DB.prepare('SELECT id, puzzle_date, mode, target_player_id, display_answer, scrambled_answer FROM word_daily_puzzles WHERE puzzle_date = ? AND mode = ?').bind(date, mode).first<WordPuzzleRow>()
  if (existing) return existing
  const rows = await env.DB.prepare('SELECT * FROM players WHERE eligible_answer = 1').all<PlayerRow>()
  const candidates = (rows.results || []).filter(candidate => {
    const length = normalizeWord(displayWord(candidate)).length
    return length >= 4 && length <= 12
  })
  const random = crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000
  const player = candidates[Math.floor(random * candidates.length)]
  if (!player) throw new Error('The ranked word-game pool has not been seeded.')
  const answer = displayWord(player)
  await env.DB.prepare('INSERT OR IGNORE INTO word_daily_puzzles (id, puzzle_date, mode, target_player_id, display_answer, scrambled_answer, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(`${mode}:${date}`, date, mode, player.id, answer, mode === 'cipher' ? scrambleWord(answer) : null, new Date().toISOString()).run()
  const puzzle = await env.DB.prepare('SELECT id, puzzle_date, mode, target_player_id, display_answer, scrambled_answer FROM word_daily_puzzles WHERE puzzle_date = ? AND mode = ?').bind(date, mode).first<WordPuzzleRow>()
  if (!puzzle) throw new Error('Unable to create the daily word puzzle.')
  return puzzle
}

async function ensureWordAttempt(env: Env, userId: string, puzzle: WordPuzzleRow) {
  let attempt = await env.DB.prepare('SELECT id, status, attempts_used, score, guessed_letters, evidence_opened, guesses_json, deadline_at FROM word_attempts WHERE user_id = ? AND puzzle_id = ?').bind(userId, puzzle.id).first<WordAttemptRow>()
  if (!attempt) {
    const now = new Date()
    await env.DB.prepare("INSERT OR IGNORE INTO word_attempts (id, user_id, puzzle_id, status, started_at, deadline_at) VALUES (?, ?, ?, 'playing', ?, ?)").bind(crypto.randomUUID(), userId, puzzle.id, now.toISOString(), deadlineFrom(now)).run()
    attempt = await env.DB.prepare('SELECT id, status, attempts_used, score, guessed_letters, evidence_opened, guesses_json, deadline_at FROM word_attempts WHERE user_id = ? AND puzzle_id = ?').bind(userId, puzzle.id).first<WordAttemptRow>()
  } else if (attempt.status === 'playing' && !attempt.deadline_at) {
    const deadline = deadlineFrom()
    await env.DB.prepare('UPDATE word_attempts SET deadline_at = ? WHERE id = ?').bind(deadline, attempt.id).run()
    attempt.deadline_at = deadline
  }
  if (!attempt) throw new Error('Unable to start the daily word case.')
  if (attempt.status === 'playing' && isExpired(attempt.deadline_at)) {
    await env.DB.prepare("UPDATE word_attempts SET status = 'lost', score = 0, completed_at = ? WHERE id = ? AND status = 'playing'").bind(new Date().toISOString(), attempt.id).run()
    attempt.status = 'lost'; attempt.score = 0
  }
  return attempt
}

async function getWordState(env: Env, userId: string, puzzle: WordPuzzleRow) {
  let attempt = await env.DB.prepare('SELECT id, status, attempts_used, score, guessed_letters, evidence_opened, guesses_json, deadline_at FROM word_attempts WHERE user_id = ? AND puzzle_id = ?').bind(userId, puzzle.id).first<WordAttemptRow>()
  if (attempt?.status === 'playing' && isExpired(attempt.deadline_at)) {
    await env.DB.prepare("UPDATE word_attempts SET status = 'lost', score = 0, completed_at = ? WHERE id = ? AND status = 'playing'").bind(new Date().toISOString(), attempt.id).run()
    attempt = { ...attempt, status: 'lost', score: 0 }
  }
  const guessedLetters = attempt ? JSON.parse(attempt.guessed_letters) as string[] : []
  const guesses = attempt ? JSON.parse(attempt.guesses_json) as string[] : []
  const complete = attempt && attempt.status !== 'playing'
  const target = complete || (attempt && attempt.evidence_opened) ? await env.DB.prepare('SELECT * FROM players WHERE id = ?').bind(puzzle.target_player_id).first<PlayerRow>() : null
  const base = { date: puzzle.puzzle_date, status: attempt?.status || 'not_started', attemptsUsed: attempt?.attempts_used || 0, score: attempt?.score || 0, guesses, guessedLetters, deadlineAt: attempt?.deadline_at || undefined, durationSeconds: RANKED_TIMED_SECONDS }
  if (puzzle.mode === 'cipher') {
    const attemptsUsed = attempt?.attempts_used || 0
    const nationOpen = Boolean((attempt?.evidence_opened || 0) & 1)
    const clubOpen = Boolean((attempt?.evidence_opened || 0) & 2)
    return { ...base, scrambled: (puzzle.scrambled_answer || '').split(''), hints: [
      { open: nationOpen, available: attemptsUsed >= 2, value: nationOpen ? target?.nation : undefined },
      { open: clubOpen, available: attemptsUsed >= 3, value: clubOpen ? target?.club : undefined },
    ], nation: nationOpen ? target?.nation : undefined, club: clubOpen ? target?.club : undefined, answer: complete && target ? playerPublic(target) : undefined, displayAnswer: complete ? puzzle.display_answer : undefined }
  }
  const guessed = new Set(guessedLetters)
  const slots = Array.from(puzzle.display_answer).map((character, index) => {
    const normalized = normalizeWord(character)
    return normalized ? { id: `${index}-${normalized}`, kind: 'letter', character: guessed.has(normalized) || complete ? character.toLocaleUpperCase('en-US') : '', revealed: guessed.has(normalized) || Boolean(complete) } : { id: `${index}-${character}`, kind: 'separator', character, revealed: true }
  })
  const evidence = [0, 1].map(index => ({ open: Boolean((attempt?.evidence_opened || 0) & (1 << index)), available: (attempt?.attempts_used || 0) >= (index ? 4 : 2), value: attempt && ((attempt.evidence_opened || 0) & (1 << index)) && target ? index === 0 ? `${target.nation} · ${target.position}` : `${target.club} · FC ${target.fc_overall ?? '—'}` : undefined }))
  return { ...base, wrongAttempts: attempt?.attempts_used || 0, slots, evidence, answer: complete && target ? playerPublic(target) : undefined, displayAnswer: complete ? puzzle.display_answer : undefined }
}

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

interface OverlapPuzzleRow extends PuzzleRow {
  club_a_json: string
  club_b_json: string
  country: string
  source_snapshot: string
}
interface OverlapAttemptRow extends AttemptRow {
  selected_player_id: string | null
  matches: number
  deadline_at: string
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
  let attempt = await env.DB.prepare('SELECT id, status, guesses_used, score, deadline_at FROM paper_trail_attempts WHERE user_id = ? AND puzzle_id = ?')
    .bind(userId, puzzle.id).first<TimedAttemptRow>()
  if (attempt?.status === 'playing' && isExpired(attempt.deadline_at)) {
    await env.DB.prepare("UPDATE paper_trail_attempts SET status = 'lost', score = 0, completed_at = ? WHERE id = ? AND status = 'playing'").bind(new Date().toISOString(), attempt.id).run()
    attempt = { ...attempt, status: 'lost', score: 0 }
  }
  if (!attempt) return {
    date: puzzle.puzzle_date, status: 'not_started', guesses: [], guessesUsed: 0, score: 0,
    clubs: clubs.slice(0, 1), clubCount: clubs.length, sourceSnapshot: puzzle.source_snapshot, durationSeconds: RANKED_TIMED_SECONDS,
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
    sourceSnapshot: puzzle.source_snapshot, answer, deadlineAt: attempt.deadline_at || undefined, durationSeconds: RANKED_TIMED_SECONDS,
  }
}

async function ensurePaperTrailAttempt(env: Env, userId: string, puzzle: PaperTrailPuzzleRow) {
  let attempt = await env.DB.prepare('SELECT id, status, guesses_used, score, deadline_at FROM paper_trail_attempts WHERE user_id = ? AND puzzle_id = ?')
    .bind(userId, puzzle.id).first<TimedAttemptRow>()
  if (!attempt) {
    const now = new Date()
    await env.DB.prepare("INSERT OR IGNORE INTO paper_trail_attempts (id, user_id, puzzle_id, status, guesses_used, score, started_at, deadline_at) VALUES (?, ?, ?, 'playing', 0, 0, ?, ?)")
      .bind(crypto.randomUUID(), userId, puzzle.id, now.toISOString(), deadlineFrom(now)).run()
    attempt = await env.DB.prepare('SELECT id, status, guesses_used, score, deadline_at FROM paper_trail_attempts WHERE user_id = ? AND puzzle_id = ?')
      .bind(userId, puzzle.id).first<TimedAttemptRow>()
  } else if (attempt.status === 'playing' && !attempt.deadline_at) {
    attempt.deadline_at = deadlineFrom()
    await env.DB.prepare('UPDATE paper_trail_attempts SET deadline_at = ? WHERE id = ?').bind(attempt.deadline_at, attempt.id).run()
  }
  if (!attempt) throw new Error('Unable to start the ranked Paper Trail attempt.')
  if (attempt.status === 'playing' && isExpired(attempt.deadline_at)) {
    await env.DB.prepare("UPDATE paper_trail_attempts SET status = 'lost', score = 0, completed_at = ? WHERE id = ? AND status = 'playing'").bind(new Date().toISOString(), attempt.id).run()
    attempt.status = 'lost'; attempt.score = 0
  }
  return attempt
}

async function ensureDailyOverlapPuzzle(env: Env, date = utcDate()): Promise<OverlapPuzzleRow> {
  const existing = await env.DB.prepare('SELECT id, puzzle_date, target_player_id, club_a_json, club_b_json, country, source_snapshot FROM overlap_daily_puzzles WHERE puzzle_date = ?')
    .bind(date).first<OverlapPuzzleRow>()
  if (existing) return existing
  const rows = await env.DB.prepare(`
    SELECT path.player_id, path.clubs_json, path.source_snapshot, players.nation
    FROM paper_trail_paths path JOIN players ON players.id = path.player_id
    ORDER BY RANDOM() LIMIT 20
  `).all<{ player_id: string; clubs_json: string; source_snapshot: string; nation: string }>()
  const candidate = (rows.results || []).map(row => ({ ...row, clubs: parsePaperTrailClubs(row.clubs_json) }))
    .find(row => new Set(row.clubs.map(club => club.wikidataClubId)).size >= 2)
  if (!candidate) throw new Error('The ranked Overlap pool has not been seeded.')
  const clubs = candidate.clubs.filter((club, index, all) => all.findIndex(item => item.wikidataClubId === club.wikidataClubId) === index)
  await env.DB.prepare('INSERT OR IGNORE INTO overlap_daily_puzzles (id, puzzle_date, club_a_json, club_b_json, country, target_player_id, source_snapshot, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(`overlap:${date}`, date, JSON.stringify(clubs[0]), JSON.stringify(clubs[1]), candidate.nation, candidate.player_id, candidate.source_snapshot, new Date().toISOString()).run()
  const puzzle = await env.DB.prepare('SELECT id, puzzle_date, target_player_id, club_a_json, club_b_json, country, source_snapshot FROM overlap_daily_puzzles WHERE puzzle_date = ?')
    .bind(date).first<OverlapPuzzleRow>()
  if (!puzzle) throw new Error('Unable to create the daily Overlap puzzle.')
  return puzzle
}

async function getOverlapState(env: Env, userId: string, puzzle: OverlapPuzzleRow) {
  let attempt = await env.DB.prepare('SELECT id, status, score, selected_player_id, matches, deadline_at FROM overlap_attempts WHERE user_id = ? AND puzzle_id = ?')
    .bind(userId, puzzle.id).first<OverlapAttemptRow>()
  if (attempt?.status === 'playing' && isExpired(attempt.deadline_at)) {
    await env.DB.prepare("UPDATE overlap_attempts SET status = 'lost', score = 0, completed_at = ? WHERE id = ? AND status = 'playing'").bind(new Date().toISOString(), attempt.id).run()
    attempt = { ...attempt, status: 'lost', score: 0 }
  }
  const complete = attempt && attempt.status !== 'playing'
  const selected = complete && attempt?.selected_player_id ? await env.DB.prepare('SELECT * FROM players WHERE id = ?').bind(attempt.selected_player_id).first<PlayerRow>() : null
  const selectedPath = selected ? await env.DB.prepare('SELECT clubs_json FROM paper_trail_paths WHERE player_id = ?').bind(selected.id).first<{ clubs_json: string }>() : null
  const answer = complete ? await env.DB.prepare('SELECT * FROM players WHERE id = ?').bind(puzzle.target_player_id).first<PlayerRow>() : null
  const clubA = JSON.parse(puzzle.club_a_json) as PaperTrailClub
  const clubB = JSON.parse(puzzle.club_b_json) as PaperTrailClub
  const selectedClubIds = new Set(selectedPath ? parsePaperTrailClubs(selectedPath.clubs_json).map(club => club.wikidataClubId) : [])
  return {
    date: puzzle.puzzle_date,
    status: attempt?.status || 'not_started',
    score: attempt?.score || 0,
    matches: attempt?.matches || 0,
    deadlineAt: attempt?.deadline_at,
    durationSeconds: RANKED_TIMED_SECONDS,
    clues: [JSON.parse(puzzle.club_a_json), { name: puzzle.country, kind: 'country' }, JSON.parse(puzzle.club_b_json)],
    selected: selected ? playerPublic(selected) : undefined,
    verdicts: selected ? [selectedClubIds.has(clubA.wikidataClubId), selected.nation === puzzle.country, selectedClubIds.has(clubB.wikidataClubId)] : undefined,
    answer: answer ? playerPublic(answer) : undefined,
    sourceSnapshot: puzzle.source_snapshot,
  }
}

async function ensureOverlapAttempt(env: Env, userId: string, puzzle: OverlapPuzzleRow) {
  let attempt = await env.DB.prepare('SELECT id, status, score, selected_player_id, matches, deadline_at FROM overlap_attempts WHERE user_id = ? AND puzzle_id = ?')
    .bind(userId, puzzle.id).first<OverlapAttemptRow>()
  if (!attempt) {
    const now = new Date()
    await env.DB.prepare("INSERT OR IGNORE INTO overlap_attempts (id, user_id, puzzle_id, status, started_at, deadline_at) VALUES (?, ?, ?, 'playing', ?, ?)")
      .bind(crypto.randomUUID(), userId, puzzle.id, now.toISOString(), deadlineFrom(now)).run()
    attempt = await env.DB.prepare('SELECT id, status, score, selected_player_id, matches, deadline_at FROM overlap_attempts WHERE user_id = ? AND puzzle_id = ?')
      .bind(userId, puzzle.id).first<OverlapAttemptRow>()
  }
  if (!attempt) throw new Error('Unable to start the daily Overlap case.')
  if (attempt.status === 'playing' && isExpired(attempt.deadline_at)) {
    await env.DB.prepare("UPDATE overlap_attempts SET status = 'lost', score = 0, completed_at = ? WHERE id = ? AND status = 'playing'").bind(new Date().toISOString(), attempt.id).run()
    attempt.status = 'lost'; attempt.score = 0
  }
  return attempt
}

async function ensurePreviousWeekChampion(env: Env, date = utcDate()) {
  const { start, end } = previousWeekUtc(date)
  const existing = await env.DB.prepare('SELECT week_start FROM weekly_champions WHERE week_start = ?').bind(start).first()
  if (existing) return
  await env.DB.prepare(`
    INSERT OR IGNORE INTO weekly_champions (week_start, user_id, points, solved, played, awarded_at)
    SELECT ?, ranked.user_id, ranked.points, ranked.solved, ranked.played, ?
    FROM (
      SELECT u.id AS user_id, COALESCE(SUM(c.score), 0) AS points,
             SUM(CASE WHEN c.status = 'won' THEN 1 ELSE 0 END) AS solved,
             COUNT(*) AS played, u.created_at
      FROM (
        SELECT a.user_id, a.status, a.score, p.puzzle_date
        FROM attempts a JOIN daily_puzzles p ON p.id = a.puzzle_id
        WHERE a.status IN ('won', 'lost') AND p.puzzle_date BETWEEN ? AND ?
        UNION ALL
        SELECT a.user_id, a.status, a.score, p.puzzle_date
        FROM paper_trail_attempts a JOIN paper_trail_daily_puzzles p ON p.id = a.puzzle_id
        WHERE a.status IN ('won', 'lost') AND p.puzzle_date BETWEEN ? AND ?
        UNION ALL
        SELECT a.user_id, a.status, a.score, p.puzzle_date
        FROM word_attempts a JOIN word_daily_puzzles p ON p.id = a.puzzle_id
        WHERE a.status IN ('won', 'lost') AND p.puzzle_date BETWEEN ? AND ?
        UNION ALL
        SELECT a.user_id, a.status, a.score, p.puzzle_date
        FROM overlap_attempts a JOIN overlap_daily_puzzles p ON p.id = a.puzzle_id
        WHERE a.status IN ('won', 'lost') AND p.puzzle_date BETWEEN ? AND ?
      ) c
      JOIN users u ON u.id = c.user_id
      GROUP BY u.id, u.created_at
      ORDER BY points DESC, solved DESC, played ASC, u.created_at ASC
      LIMIT 1
    ) ranked
  `).bind(start, new Date().toISOString(), start, end, start, end, start, end, start, end).run()
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

  if (request.method === 'GET' && path === '/achievements') {
    const collection = await syncAchievements(env.DB, user.id)
    return json({ ...collection, newlyEarned: undefined, badges: ACHIEVEMENTS })
  }

  if (request.method === 'POST' && path === '/achievements/featured') {
    const body = await request.json().catch(() => ({})) as { badgeId?: string | null }
    if (body.badgeId && !ACHIEVEMENTS.some(badge => badge.id === body.badgeId)) return json({ error: 'Choose a recognised badge.' }, 400)
    if (body.badgeId) {
      const earned = await env.DB.prepare('SELECT 1 AS found FROM user_badges WHERE user_id = ? AND badge_id = ?').bind(user.id, body.badgeId).first()
      if (!earned) return json({ error: 'Earn that badge before featuring it.' }, 409)
    }
    await env.DB.prepare(`INSERT INTO user_profiles (user_id, featured_badge_id, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET featured_badge_id = excluded.featured_badge_id, updated_at = excluded.updated_at`)
      .bind(user.id, body.badgeId || null, new Date().toISOString()).run()
    return json({ featuredBadgeId: body.badgeId || null })
  }

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
    const state = await getAttemptState(env, user.id, puzzle)
    return json(status === 'playing' ? state : await withNewAchievements(env, user.id, state))
  }

  if (request.method === 'GET' && path === '/daily/paper-trail') {
    const puzzle = await ensureDailyPaperTrailPuzzle(env)
    return json(await getPaperTrailAttemptState(env, user.id, puzzle))
  }

  if (request.method === 'POST' && path === '/daily/paper-trail/start') {
    const puzzle = await ensureDailyPaperTrailPuzzle(env)
    await ensurePaperTrailAttempt(env, user.id, puzzle)
    return json(await getPaperTrailAttemptState(env, user.id, puzzle))
  }

  if (request.method === 'POST' && path === '/daily/paper-trail/guess') {
    const body = await request.json().catch(() => ({})) as { playerId?: string }
    if (!body.playerId) return json({ error: 'Choose a valid suspect.' }, 400)
    const puzzle = await ensureDailyPaperTrailPuzzle(env)
    const attempt = await ensurePaperTrailAttempt(env, user.id, puzzle)
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
    const state = await getPaperTrailAttemptState(env, user.id, puzzle)
    return json(status === 'playing' ? state : await withNewAchievements(env, user.id, state))
  }

  const wordMatch = path.match(/^\/daily\/(redacted|cipher)$/)
  if (request.method === 'GET' && wordMatch) {
    const puzzle = await ensureDailyWordPuzzle(env, wordMatch[1] as WordMode)
    return json(await getWordState(env, user.id, puzzle))
  }

  const wordStartMatch = path.match(/^\/daily\/(redacted|cipher)\/start$/)
  if (request.method === 'POST' && wordStartMatch) {
    const puzzle = await ensureDailyWordPuzzle(env, wordStartMatch[1] as WordMode)
    await ensureWordAttempt(env, user.id, puzzle)
    return json(await getWordState(env, user.id, puzzle))
  }

  if (request.method === 'POST' && path === '/daily/cipher/hint') {
    const body = await request.json().catch(() => ({})) as { index?: number }
    if (body.index !== 0 && body.index !== 1) return json({ error: 'Choose a valid evidence seal.' }, 400)
    const puzzle = await ensureDailyWordPuzzle(env, 'cipher')
    const attempt = await ensureWordAttempt(env, user.id, puzzle)
    if (attempt.status !== 'playing') return json({ error: 'Today’s Cipher is already complete.', state: await getWordState(env, user.id, puzzle) }, 409)
    const threshold = body.index === 0 ? 2 : 3
    if (attempt.attempts_used < threshold) return json({ error: `That evidence opens after ${threshold} misses.` }, 409)
    const opened = attempt.evidence_opened | (1 << body.index)
    await env.DB.prepare('UPDATE word_attempts SET evidence_opened = ? WHERE id = ?').bind(opened, attempt.id).run()
    return json(await getWordState(env, user.id, puzzle))
  }

  if (request.method === 'POST' && path === '/daily/cipher/guess') {
    const body = await request.json().catch(() => ({})) as { guess?: string }
    if (!body.guess?.trim()) return json({ error: 'Enter a player name.' }, 400)
    const puzzle = await ensureDailyWordPuzzle(env, 'cipher')
    const attempt = await ensureWordAttempt(env, user.id, puzzle)
    if (attempt.status !== 'playing') return json({ error: 'Today’s Cipher is already complete.', state: await getWordState(env, user.id, puzzle) }, 409)
    const guesses = JSON.parse(attempt.guesses_json) as string[]
    if (guesses.some(value => normalizeWord(value) === normalizeWord(body.guess!))) return json({ error: 'That reading is already in the file.' }, 409)
    const target = await env.DB.prepare('SELECT * FROM players WHERE id = ?').bind(puzzle.target_player_id).first<PlayerRow>()
    if (!target) throw new Error('The daily Cipher answer is missing.')
    const attempts = attempt.attempts_used + 1
    const correct = normalizeWord(body.guess) === normalizeWord(puzzle.display_answer) || normalizeWord(body.guess) === normalizeWord(target.display_name)
    const status = correct ? 'won' : attempts >= 4 ? 'lost' : 'playing'
    const evidenceCount = ((attempt.evidence_opened & 1) ? 1 : 0) + ((attempt.evidence_opened & 2) ? 1 : 0)
    const score = rankedCipherScore(attempts, correct, evidenceCount)
    await env.DB.prepare('UPDATE word_attempts SET status = ?, attempts_used = ?, score = ?, guesses_json = ?, completed_at = ? WHERE id = ? AND status = \'playing\'')
      .bind(status, attempts, score, JSON.stringify([...guesses, body.guess.trim()]), status === 'playing' ? null : new Date().toISOString(), attempt.id).run()
    const state = await getWordState(env, user.id, puzzle)
    return json(status === 'playing' ? state : await withNewAchievements(env, user.id, state))
  }

  if (request.method === 'POST' && path === '/daily/redacted/letter') {
    const body = await request.json().catch(() => ({})) as { letter?: string }
    const letter = normalizeWord(body.letter || '')
    if (letter.length !== 1) return json({ error: 'Choose one letter.' }, 400)
    const puzzle = await ensureDailyWordPuzzle(env, 'redacted')
    const attempt = await ensureWordAttempt(env, user.id, puzzle)
    if (attempt.status !== 'playing') return json({ error: 'Today’s Redacted case is already complete.', state: await getWordState(env, user.id, puzzle) }, 409)
    const guessed = JSON.parse(attempt.guessed_letters) as string[]
    if (guessed.includes(letter)) return json(await getWordState(env, user.id, puzzle))
    const nextGuessed = [...guessed, letter]
    const correctLetter = normalizeWord(puzzle.display_answer).includes(letter)
    const wrong = attempt.attempts_used + (correctLetter ? 0 : 1)
    const solved = Array.from(new Set(normalizeWord(puzzle.display_answer))).every(value => nextGuessed.includes(value))
    const status = solved ? 'won' : wrong >= 6 ? 'lost' : 'playing'
    const evidenceCount = ((attempt.evidence_opened & 1) ? 1 : 0) + ((attempt.evidence_opened & 2) ? 1 : 0)
    const score = solved ? Math.max(10, 100 - wrong * 12 - evidenceCount * 10) : 0
    await env.DB.prepare('UPDATE word_attempts SET status = ?, attempts_used = ?, score = ?, guessed_letters = ?, completed_at = ? WHERE id = ? AND status = \'playing\'')
      .bind(status, wrong, score, JSON.stringify(nextGuessed), status === 'playing' ? null : new Date().toISOString(), attempt.id).run()
    const state = await getWordState(env, user.id, puzzle)
    return json(status === 'playing' ? state : await withNewAchievements(env, user.id, state))
  }

  if (request.method === 'POST' && path === '/daily/redacted/evidence') {
    const body = await request.json().catch(() => ({})) as { index?: number }
    if (body.index !== 0 && body.index !== 1) return json({ error: 'Choose a valid evidence seal.' }, 400)
    const puzzle = await ensureDailyWordPuzzle(env, 'redacted')
    const attempt = await ensureWordAttempt(env, user.id, puzzle)
    if (attempt.status !== 'playing') return json({ error: 'Today’s Redacted case is already complete.', state: await getWordState(env, user.id, puzzle) }, 409)
    const threshold = body.index === 0 ? 2 : 4
    if (attempt.attempts_used < threshold) return json({ error: `That seal opens after ${threshold} strikes.` }, 409)
    const opened = attempt.evidence_opened | (1 << body.index)
    await env.DB.prepare('UPDATE word_attempts SET evidence_opened = ? WHERE id = ?').bind(opened, attempt.id).run()
    return json(await getWordState(env, user.id, puzzle))
  }

  if (request.method === 'POST' && path === '/daily/redacted/guess') {
    const body = await request.json().catch(() => ({})) as { playerId?: string }
    if (!body.playerId) return json({ error: 'Choose a valid suspect.' }, 400)
    const puzzle = await ensureDailyWordPuzzle(env, 'redacted')
    const attempt = await ensureWordAttempt(env, user.id, puzzle)
    if (attempt.status !== 'playing') return json({ error: 'Today’s Redacted case is already complete.', state: await getWordState(env, user.id, puzzle) }, 409)
    const wrong = attempt.attempts_used + (body.playerId === puzzle.target_player_id ? 0 : 1)
    const won = body.playerId === puzzle.target_player_id
    const status = won ? 'won' : wrong >= 6 ? 'lost' : 'playing'
    const evidenceCount = ((attempt.evidence_opened & 1) ? 1 : 0) + ((attempt.evidence_opened & 2) ? 1 : 0)
    const score = won ? Math.max(10, 100 - wrong * 12 - evidenceCount * 10) : 0
    const guesses = JSON.parse(attempt.guesses_json) as string[]
    await env.DB.prepare('UPDATE word_attempts SET status = ?, attempts_used = ?, score = ?, guesses_json = ?, completed_at = ? WHERE id = ? AND status = \'playing\'')
      .bind(status, wrong, score, JSON.stringify([...guesses, body.playerId]), status === 'playing' ? null : new Date().toISOString(), attempt.id).run()
    const state = await getWordState(env, user.id, puzzle)
    return json(status === 'playing' ? state : await withNewAchievements(env, user.id, state))
  }

  if (request.method === 'GET' && path === '/daily/overlap') {
    const puzzle = await ensureDailyOverlapPuzzle(env)
    return json(await getOverlapState(env, user.id, puzzle))
  }

  if (request.method === 'POST' && path === '/daily/overlap/start') {
    const puzzle = await ensureDailyOverlapPuzzle(env)
    await ensureOverlapAttempt(env, user.id, puzzle)
    return json(await getOverlapState(env, user.id, puzzle))
  }

  if (request.method === 'POST' && path === '/daily/overlap/guess') {
    const body = await request.json().catch(() => ({})) as { playerId?: string }
    if (!body.playerId) return json({ error: 'Choose a valid suspect.' }, 400)
    const puzzle = await ensureDailyOverlapPuzzle(env)
    const attempt = await ensureOverlapAttempt(env, user.id, puzzle)
    if (attempt.status !== 'playing') return json({ error: 'Today’s Overlap is already complete.', state: await getOverlapState(env, user.id, puzzle) }, 409)
    const [player, path] = await Promise.all([
      env.DB.prepare('SELECT * FROM players WHERE id = ?').bind(body.playerId).first<PlayerRow>(),
      env.DB.prepare('SELECT clubs_json FROM paper_trail_paths WHERE player_id = ?').bind(body.playerId).first<{ clubs_json: string }>(),
    ])
    if (!player) return json({ error: 'That player is not in the ranked pool.' }, 400)
    const clubIds = new Set(path ? parsePaperTrailClubs(path.clubs_json).map(club => club.wikidataClubId) : [])
    const clubA = JSON.parse(puzzle.club_a_json) as PaperTrailClub
    const clubB = JSON.parse(puzzle.club_b_json) as PaperTrailClub
    const matches = Number(clubIds.has(clubA.wikidataClubId)) + Number(player.nation === puzzle.country) + Number(clubIds.has(clubB.wikidataClubId))
    const score = rankedOverlapScore(matches)
    await env.DB.prepare("UPDATE overlap_attempts SET status = ?, selected_player_id = ?, matches = ?, score = ?, completed_at = ? WHERE id = ? AND status = 'playing'")
      .bind(matches === 3 ? 'won' : 'lost', player.id, matches, score, new Date().toISOString(), attempt.id).run()
    return json(await withNewAchievements(env, user.id, await getOverlapState(env, user.id, puzzle)))
  }

  if (request.method === 'GET' && path === '/leaderboard/weekly') {
    const today = utcDate()
    const start = weekStartUtc(today)
    await ensurePreviousWeekChampion(env, today)
    const rows = await env.DB.prepare(`
      WITH scored_cases AS (
        SELECT a.user_id, a.status, a.score, p.puzzle_date
        FROM attempts a JOIN daily_puzzles p ON p.id = a.puzzle_id
        WHERE a.status IN ('won', 'lost')
        UNION ALL
        SELECT a.user_id, a.status, a.score, p.puzzle_date
        FROM paper_trail_attempts a JOIN paper_trail_daily_puzzles p ON p.id = a.puzzle_id
        WHERE a.status IN ('won', 'lost')
        UNION ALL
        SELECT a.user_id, a.status, a.score, p.puzzle_date
        FROM word_attempts a JOIN word_daily_puzzles p ON p.id = a.puzzle_id
        WHERE a.status IN ('won', 'lost')
        UNION ALL
        SELECT a.user_id, a.status, a.score, p.puzzle_date
        FROM overlap_attempts a JOIN overlap_daily_puzzles p ON p.id = a.puzzle_id
        WHERE a.status IN ('won', 'lost')
      ), star_totals AS (
        SELECT user_id, COUNT(*) AS stars FROM weekly_champions GROUP BY user_id
      )
      SELECT u.id AS user_id, u.username, COALESCE(SUM(c.score), 0) AS points,
             SUM(CASE WHEN c.status = 'won' THEN 1 ELSE 0 END) AS solved,
             COUNT(c.user_id) AS played, COALESCE(MAX(s.stars), 0) AS stars, MAX(up.featured_badge_id) AS featured_badge_id
      FROM users u
      LEFT JOIN scored_cases c ON c.user_id = u.id AND c.puzzle_date >= ? AND c.puzzle_date <= ?
      LEFT JOIN star_totals s ON s.user_id = u.id
      LEFT JOIN user_profiles up ON up.user_id = u.id
      GROUP BY u.id, u.username
      ORDER BY points DESC, solved DESC, played ASC, u.created_at ASC
    `).bind(start, today).all<{ user_id: string; username: string; points: number; solved: number; played: number; stars: number; featured_badge_id: string | null }>()
    const leaders = (rows.results || []).map((row, index) => ({ rank: index + 1, username: row.username, points: Number(row.points), solved: Number(row.solved), played: Number(row.played), stars: Number(row.stars), featuredBadgeId: row.featured_badge_id, isCurrentUser: row.user_id === user.id }))
    const starRows = await env.DB.prepare(`
      SELECT u.id AS user_id, u.username, COUNT(*) AS stars, MAX(w.week_start) AS latest_week
      FROM weekly_champions w JOIN users u ON u.id = w.user_id
      GROUP BY u.id, u.username
      ORDER BY stars DESC, latest_week DESC, u.created_at ASC
    `).all<{ user_id: string; username: string; stars: number; latest_week: string }>()
    const starLeaders = (starRows.results || []).map((row, index) => ({ rank: index + 1, username: row.username, stars: Number(row.stars), latestWeek: row.latest_week, isCurrentUser: row.user_id === user.id }))
    return json({ weekStart: start, leaders, currentUser: leaders.find(row => row.isCurrentUser) || null, starLeaders })
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
    await Promise.all([ensureDailyPuzzle(env), ensureDailyPaperTrailPuzzle(env), ensureDailyWordPuzzle(env, 'redacted'), ensureDailyWordPuzzle(env, 'cipher'), ensureDailyOverlapPuzzle(env), ensurePreviousWeekChampion(env)])
  },
}

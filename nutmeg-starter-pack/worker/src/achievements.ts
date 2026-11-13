import type { D1Database } from './types'

export type AchievementCategory = 'matchday' | 'consistency' | 'detective' | 'game'

export interface AchievementDefinition {
  id: string
  name: string
  category: AchievementCategory
  target: number
}

export interface AchievementAttempt {
  mode: 'lineup' | 'paper-trail' | 'redacted' | 'cipher' | 'overlap'
  date: string
  status: 'won' | 'lost'
  score: number
  attemptsUsed: number
  evidenceOpened: number
  matches: number
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: 'debutant', name: 'Debutant', category: 'matchday', target: 1 },
  { id: 'full-90', name: 'Full 90', category: 'matchday', target: 5 },
  { id: 'clean-sheet', name: 'Clean Sheet', category: 'matchday', target: 1 },
  { id: 'hat-trick', name: 'Hat-Trick', category: 'matchday', target: 3 },
  { id: 'perfect-xi', name: 'Perfect XI', category: 'matchday', target: 500 },
  { id: 'fergie-time', name: 'Fergie Time', category: 'matchday', target: 1 },
  { id: 'on-form', name: 'On Form', category: 'consistency', target: 3 },
  { id: 'first-team-regular', name: 'First Team Regular', category: 'consistency', target: 7 },
  { id: 'season-ticket-holder', name: 'Season Ticket Holder', category: 'consistency', target: 30 },
  { id: 'club-legend', name: 'Club Legend', category: 'consistency', target: 100 },
  { id: 'prime-detective', name: 'Prime Detective', category: 'detective', target: 1 },
  { id: 'wordsmith', name: 'Wordsmith', category: 'game', target: 1 },
  { id: 'codebreaker', name: 'Codebreaker', category: 'game', target: 1 },
  { id: 'globetrotter', name: 'Globetrotter', category: 'game', target: 1 },
  { id: 'venn-diagram', name: 'Venn Diagram', category: 'game', target: 1 },
]

const perfectAttempt = (attempt: AchievementAttempt) => attempt.status === 'won' && (
  attempt.mode === 'overlap' ? attempt.matches === 3
    : attempt.mode === 'redacted' ? attempt.attemptsUsed === 0 && attempt.evidenceOpened === 0
      : attempt.attemptsUsed === 1 && attempt.evidenceOpened === 0
)

const maximumStreak = (dates: string[]) => {
  let best = 0
  let current = 0
  let previous = -1
  for (const date of [...new Set(dates)].sort()) {
    const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000)
    current = day === previous + 1 ? current + 1 : 1
    best = Math.max(best, current)
    previous = day
  }
  return best
}

export function evaluateAchievements(attempts: AchievementAttempt[]) {
  const byDate = new Map<string, AchievementAttempt[]>()
  for (const attempt of attempts) byDate.set(attempt.date, [...(byDate.get(attempt.date) || []), attempt])
  const completedModes = [...byDate.values()].map(day => new Set(day.map(item => item.mode)).size)
  const perfectPerDay = [...byDate.values()].map(day => day.filter(perfectAttempt).length)
  const dailyScores = [...byDate.values()].map(day => day.reduce((sum, item) => sum + item.score, 0))
  const fullDays = completedModes.filter(count => count === 5).length
  const streak = maximumStreak([...byDate.keys()])
  const won = (mode: AchievementAttempt['mode'], predicate: (attempt: AchievementAttempt) => boolean = () => true) => attempts.some(attempt => attempt.mode === mode && attempt.status === 'won' && predicate(attempt))
  const progress: Record<string, number> = {
    'debutant': attempts.length,
    'full-90': Math.max(0, ...completedModes),
    'clean-sheet': attempts.some(perfectAttempt) ? 1 : 0,
    'hat-trick': Math.max(0, ...perfectPerDay),
    'perfect-xi': Math.max(0, ...dailyScores),
    'fergie-time': attempts.some(attempt => attempt.status === 'won' && ((attempt.mode === 'lineup' || attempt.mode === 'paper-trail') ? attempt.attemptsUsed === 6 : attempt.mode === 'cipher' ? attempt.attemptsUsed === 4 : attempt.mode === 'redacted' ? attempt.attemptsUsed === 5 : false)) ? 1 : 0,
    'on-form': streak,
    'first-team-regular': streak,
    'season-ticket-holder': byDate.size,
    'club-legend': fullDays,
    'prime-detective': won('lineup') ? 1 : 0,
    'wordsmith': won('redacted', item => item.attemptsUsed === 0 && item.evidenceOpened === 0) ? 1 : 0,
    'codebreaker': won('cipher', item => item.attemptsUsed === 1 && item.evidenceOpened === 0) ? 1 : 0,
    'globetrotter': won('paper-trail', item => item.attemptsUsed === 1) ? 1 : 0,
    'venn-diagram': won('overlap', item => item.matches === 3) ? 1 : 0,
  }
  return { unlocked: ACHIEVEMENTS.filter(badge => progress[badge.id] >= badge.target).map(badge => badge.id), progress }
}

async function loadAttempts(db: D1Database, userId: string) {
  const rows = await db.prepare(`
    SELECT 'lineup' AS mode, p.puzzle_date AS date, a.status, a.score, a.guesses_used AS attempts_used, 0 AS evidence_opened, 0 AS matches
    FROM attempts a JOIN daily_puzzles p ON p.id = a.puzzle_id WHERE a.user_id = ? AND a.status IN ('won','lost')
    UNION ALL
    SELECT 'paper-trail', p.puzzle_date, a.status, a.score, a.guesses_used, 0, 0
    FROM paper_trail_attempts a JOIN paper_trail_daily_puzzles p ON p.id = a.puzzle_id WHERE a.user_id = ? AND a.status IN ('won','lost')
    UNION ALL
    SELECT p.mode, p.puzzle_date, a.status, a.score, a.attempts_used, a.evidence_opened, 0
    FROM word_attempts a JOIN word_daily_puzzles p ON p.id = a.puzzle_id WHERE a.user_id = ? AND a.status IN ('won','lost')
    UNION ALL
    SELECT 'overlap', p.puzzle_date, a.status, a.score, 1, 0, a.matches
    FROM overlap_attempts a JOIN overlap_daily_puzzles p ON p.id = a.puzzle_id WHERE a.user_id = ? AND a.status IN ('won','lost')
  `).bind(userId, userId, userId, userId).all<{ mode: AchievementAttempt['mode']; date: string; status: 'won' | 'lost'; score: number; attempts_used: number; evidence_opened: number; matches: number }>()
  return (rows.results || []).map(row => ({ mode: row.mode, date: row.date, status: row.status, score: Number(row.score), attemptsUsed: Number(row.attempts_used), evidenceOpened: Number(row.evidence_opened), matches: Number(row.matches) }))
}

export async function syncAchievements(db: D1Database, userId: string) {
  const attempts = await loadAttempts(db, userId)
  const evaluation = evaluateAchievements(attempts)
  const existing = await db.prepare('SELECT badge_id, earned_at FROM user_badges WHERE user_id = ?').bind(userId).all<{ badge_id: string; earned_at: string }>()
  const existingIds = new Set((existing.results || []).map(row => row.badge_id))
  const newlyEarned = evaluation.unlocked.filter(id => !existingIds.has(id))
  const now = new Date().toISOString()
  if (newlyEarned.length) await db.batch(newlyEarned.map(id => db.prepare('INSERT OR IGNORE INTO user_badges (user_id, badge_id, earned_at) VALUES (?, ?, ?)').bind(userId, id, now)))
  const earned = await db.prepare('SELECT badge_id, earned_at FROM user_badges WHERE user_id = ? ORDER BY earned_at DESC, badge_id').bind(userId).all<{ badge_id: string; earned_at: string }>()
  const profile = await db.prepare('SELECT featured_badge_id FROM user_profiles WHERE user_id = ?').bind(userId).first<{ featured_badge_id: string | null }>()
  return {
    earned: (earned.results || []).map(row => ({ badgeId: row.badge_id, earnedAt: row.earned_at })),
    progress: evaluation.progress,
    newlyEarned,
    featuredBadgeId: profile?.featured_badge_id || null,
  }
}

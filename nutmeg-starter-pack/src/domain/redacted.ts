import type { Player } from './types'

export const REDACTED_STRIKE_LIMIT = 6
export const REDACTED_STATS_KEY = 'player-press-redacted-stats-v1'

export interface RedactedCase {
  player: Player
  displayAnswer: string
  normalizedAnswer: string
}

export interface RedactedStats {
  version: 1
  gamesPlayed: number
  wins: number
  totalWrongOnWins: number
  bestScore: number
  currentWinStreak: number
}

export const EMPTY_REDACTED_STATS: RedactedStats = {
  version: 1,
  gamesPlayed: 0,
  wins: 0,
  totalWrongOnWins: 0,
  bestScore: 0,
  currentWinStreak: 0,
}

const transliteration: Record<string, string> = {
  Ø: 'O', ø: 'o', Ł: 'L', ł: 'l', Đ: 'D', đ: 'd', Ð: 'D', ð: 'd', Þ: 'TH', þ: 'th', Æ: 'AE', æ: 'ae', Œ: 'OE', œ: 'oe', ß: 'SS',
}

export function normalizeRedactedText(value: string) {
  return value
    .replace(/[ØøŁłĐđÐðÞþÆæŒœß]/g, character => transliteration[character] ?? character)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase('en-US')
    .replace(/[^A-Z]/g, '')
}

const explicitNames: Record<string, string> = {
  'vini-jr': 'Vini Jr.',
  'virgil-van-dijk': 'Van Dijk',
  'kevin-de-bruyne': 'De Bruyne',
  'frenkie-de-jong': 'De Jong',
}

export function redactedNameFor(player: Player) {
  if (explicitNames[player.id]) return explicitNames[player.id]
  const parts = player.displayName.trim().split(/\s+/)
  return parts.length === 1 ? parts[0] : parts.at(-1)!
}

export function toRedactedCase(player: Player): RedactedCase | null {
  const displayAnswer = redactedNameFor(player)
  const normalizedAnswer = normalizeRedactedText(displayAnswer)
  if (normalizedAnswer.length < 4 || normalizedAnswer.length > 12) return null
  return { player, displayAnswer, normalizedAnswer }
}

export function eligibleRedactedCases(players: Player[]) {
  return players.map(toRedactedCase).filter((entry): entry is RedactedCase => Boolean(entry))
}

export function selectRedactedCase(players: Player[], previousId?: string, random: () => number = Math.random) {
  const eligible = eligibleRedactedCases(players)
  const candidates = previousId ? eligible.filter(entry => entry.player.id !== previousId) : eligible
  const pool = candidates.length ? candidates : eligible
  if (!pool.length) throw new Error('Redacted requires at least one eligible player')
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]
}

export function revealRedactedName(caseFile: RedactedCase, guessedLetters: string[]) {
  const guessed = new Set(guessedLetters.map(normalizeRedactedText))
  return Array.from(caseFile.displayAnswer).map(character => {
    const normalized = normalizeRedactedText(character)
    if (!normalized) return character
    return normalized.split('').every(letter => guessed.has(letter)) ? character.toLocaleUpperCase('en-US') : '_'
  }).join(' ')
}

export function redactedNameSlots(caseFile: RedactedCase, guessedLetters: string[]) {
  const guessed = new Set(guessedLetters.map(normalizeRedactedText))
  return Array.from(caseFile.displayAnswer).map((character, index) => {
    const normalized = normalizeRedactedText(character)
    if (!normalized) return { id: `${index}-${character}`, kind: 'separator' as const, character }
    const revealed = normalized.split('').every(letter => guessed.has(letter))
    return { id: `${index}-${normalized}`, kind: 'letter' as const, character: revealed ? character.toLocaleUpperCase('en-US') : '', normalized, revealed }
  })
}

export function isCorrectRedactedLetter(caseFile: RedactedCase, letter: string) {
  const normalized = normalizeRedactedText(letter)
  return normalized.length === 1 && caseFile.normalizedAnswer.includes(normalized)
}

export function isRedactedSolved(caseFile: RedactedCase, guessedLetters: string[]) {
  const guessed = new Set(guessedLetters.map(normalizeRedactedText))
  return Array.from(new Set(caseFile.normalizedAnswer)).every(letter => guessed.has(letter))
}

export function redactedEvidenceAvailable(index: number, wrongAttempts: number) {
  return wrongAttempts >= (index === 0 ? 2 : 4)
}

export function redactedScore(won: boolean, wrongAttempts: number, evidenceOpened: number) {
  return won ? Math.max(10, 100 - wrongAttempts * 12 - evidenceOpened * 10) : 0
}

export function parseRedactedStats(raw: string | null): RedactedStats {
  if (!raw) return { ...EMPTY_REDACTED_STATS }
  try {
    const value = JSON.parse(raw) as Partial<RedactedStats>
    if (value.version !== 1) return { ...EMPTY_REDACTED_STATS }
    const fields = ['gamesPlayed', 'wins', 'totalWrongOnWins', 'bestScore', 'currentWinStreak'] as const
    if (fields.some(field => !Number.isFinite(value[field]) || Number(value[field]) < 0)) return { ...EMPTY_REDACTED_STATS }
    return value as RedactedStats
  } catch {
    return { ...EMPTY_REDACTED_STATS }
  }
}

export function recordRedactedResult(stats: RedactedStats, won: boolean, wrongAttempts: number, score: number): RedactedStats {
  return {
    version: 1,
    gamesPlayed: stats.gamesPlayed + 1,
    wins: stats.wins + (won ? 1 : 0),
    totalWrongOnWins: stats.totalWrongOnWins + (won ? wrongAttempts : 0),
    bestScore: Math.max(stats.bestScore, score),
    currentWinStreak: won ? stats.currentWinStreak + 1 : 0,
  }
}

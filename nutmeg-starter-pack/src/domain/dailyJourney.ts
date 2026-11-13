import type { Screen } from '../components/Chrome'

export const DAILY_CASES = [
  { id: 'lineup', label: 'Prime Suspect', screen: 'lineup' },
  { id: 'paper-trail', label: 'Paper Trail', screen: 'ranked-paper-trail' },
  { id: 'redacted', label: 'Redacted', screen: 'ranked-redacted' },
  { id: 'cipher', label: 'Cipher', screen: 'ranked-cipher' },
  { id: 'overlap', label: 'Overlap', screen: 'ranked-overlap' },
] as const satisfies ReadonlyArray<{ id: string; label: string; screen: Screen }>

export type DailyCaseId = typeof DAILY_CASES[number]['id']
export type DailyCaseStatus = 'not_started' | 'playing' | 'won' | 'lost'

export function nextDailyScreen(statuses: Partial<Record<DailyCaseId, DailyCaseStatus>>, after?: Screen): Screen | null {
  const start = after ? Math.max(0, DAILY_CASES.findIndex(item => item.screen === after) + 1) : 0
  const ordered = [...DAILY_CASES.slice(start), ...DAILY_CASES.slice(0, start)]
  return ordered.find(item => !['won', 'lost'].includes(statuses[item.id] || 'not_started'))?.screen || null
}

export function completedDailyCount(statuses: Partial<Record<DailyCaseId, DailyCaseStatus>>) {
  return DAILY_CASES.filter(item => ['won', 'lost'].includes(statuses[item.id] || 'not_started')).length
}

export function fallbackDailyStatus(caseScreen: Screen, after?: Screen): DailyCaseStatus {
  if (!after) return 'not_started'
  const caseIndex = DAILY_CASES.findIndex(item => item.screen === caseScreen)
  const afterIndex = DAILY_CASES.findIndex(item => item.screen === after)
  return caseIndex >= 0 && afterIndex >= caseIndex ? 'won' : 'not_started'
}

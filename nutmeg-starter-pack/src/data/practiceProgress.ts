export type PracticeGame = 'lineup' | 'paper-trail' | 'redacted' | 'cipher' | 'overlap'

const KEY = 'player-press-practice-completed-v1'
export const PRACTICE_PROGRESS_EVENT = 'player-press-practice-progress'

export function loadPracticeCompletions(): Set<PracticeGame> {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]')
    return new Set(Array.isArray(value) ? value : [])
  } catch {
    return new Set()
  }
}

export function markPracticeComplete(game: PracticeGame) {
  const completed = loadPracticeCompletions()
  completed.add(game)
  localStorage.setItem(KEY, JSON.stringify([...completed]))
  window.dispatchEvent(new Event(PRACTICE_PROGRESS_EVENT))
}

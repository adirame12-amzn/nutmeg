import { useCallback, useEffect, useRef, useState } from 'react'

export const PRACTICE_SECONDS = 60
export const PRACTICE_DURATION_MS = PRACTICE_SECONDS * 1000

export function usePracticeTimer(active: boolean, onExpire: () => void) {
  const [timeLeft, setTimeLeft] = useState(PRACTICE_SECONDS)
  const deadlineRef = useRef<number | null>(null)
  const expireRef = useRef(onExpire)
  expireRef.current = onExpire

  const start = useCallback(() => {
    deadlineRef.current = performance.now() + PRACTICE_DURATION_MS
    setTimeLeft(PRACTICE_SECONDS)
  }, [])

  const reset = useCallback(() => {
    deadlineRef.current = null
    setTimeLeft(PRACTICE_SECONDS)
  }, [])

  const expired = useCallback(() => deadlineRef.current !== null && performance.now() >= deadlineRef.current, [])

  useEffect(() => {
    if (!active || deadlineRef.current === null) return
    const update = () => {
      if (deadlineRef.current === null) return
      const remaining = Math.max(0, deadlineRef.current - performance.now())
      setTimeLeft(Math.ceil(remaining / 1000))
      if (remaining <= 0) {
        deadlineRef.current = null
        expireRef.current()
      }
    }
    const interval = window.setInterval(update, 200)
    document.addEventListener('visibilitychange', update)
    update()
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', update) }
  }, [active])

  return { timeLeft, start, reset, expired }
}

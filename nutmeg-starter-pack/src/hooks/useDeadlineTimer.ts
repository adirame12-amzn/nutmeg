import { useEffect, useRef, useState } from 'react'

export function useDeadlineTimer(deadlineAt: string | undefined, onExpire: () => void) {
  const [timeLeft, setTimeLeft] = useState(() => deadlineAt ? Math.max(0, Math.ceil((Date.parse(deadlineAt) - Date.now()) / 1000)) : 60)
  const expireRef = useRef(onExpire)
  const firedRef = useRef(false)
  expireRef.current = onExpire

  useEffect(() => {
    firedRef.current = false
    if (!deadlineAt) { setTimeLeft(60); return }
    const update = () => {
      const remaining = Math.max(0, Date.parse(deadlineAt) - Date.now())
      setTimeLeft(Math.ceil(remaining / 1000))
      if (remaining <= 0 && !firedRef.current) {
        firedRef.current = true
        expireRef.current()
      }
    }
    const interval = window.setInterval(update, 200)
    document.addEventListener('visibilitychange', update)
    update()
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', update) }
  }, [deadlineAt])

  return timeLeft
}

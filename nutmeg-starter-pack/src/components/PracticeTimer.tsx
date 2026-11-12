import { Clock3, Timer } from 'lucide-react'
import { PRACTICE_SECONDS } from '../hooks/usePracticeTimer'

export function PracticeStartGate({ onStart, label = 'OPEN THE FILE' }: { onStart: () => void; label?: string }) {
  return <section className="practice-start">
    <span><Timer/><strong>{PRACTICE_SECONDS} seconds</strong><small>The evidence appears when the clock starts.</small></span>
    <button onClick={onStart}>{label}</button>
  </section>
}

export function PracticeTimer({ timeLeft }: { timeLeft: number }) {
  return <div className={`practice-timer ${timeLeft <= 5 ? 'urgent' : ''}`} role="timer" aria-live={timeLeft <= 5 ? 'assertive' : 'off'}>
    <Clock3/><span><strong>{timeLeft}</strong><small>SECONDS LEFT</small></span>
    <i style={{ width: `${(timeLeft / PRACTICE_SECONDS) * 100}%` }}/>
  </div>
}

import { ArrowRight, CalendarDays, Home, LoaderCircle, WifiOff } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getDailyPaperTrail, startDailyPaperTrail, submitDailyPaperTrailGuess, type RankedIdentity, type RankedPaperTrailState } from '../api/ranked'
import { CareerGrid } from '../components/CareerGrid'
import { AchievementNotice } from '../components/AchievementNotice'
import { PaperTrailGuessHistory } from '../components/PaperTrailGuessHistory'
import { PlayerSearch } from '../components/PlayerSearch'
import { PracticeTimer } from '../components/PracticeTimer'
import { fc27Players } from '../data/fc27Players'
import { PAPER_TRAIL_GUESS_LIMIT } from '../domain/paperTrail'
import type { Player } from '../domain/types'
import { useDeadlineTimer } from '../hooks/useDeadlineTimer'

export function RankedPaperTrailScreen({ identity, onPractice, onNext, onHome, onBadges }: {
  identity: RankedIdentity
  onPractice: () => void
  onNext: () => void
  onHome: () => void
  onBadges: () => void
}) {
  const [daily, setDaily] = useState<RankedPaperTrailState | null>(null)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('One club is on file. Name the player.')
  const [busy, setBusy] = useState(false)
  const [showReveal, setShowReveal] = useState(false)
  const revealButtonRef = useRef<HTMLButtonElement>(null)
  const usedIds = useMemo(() => daily?.guesses.map(player => player.id) || [], [daily])

  useEffect(() => {
    startDailyPaperTrail(identity).then(state => {
      setDaily(state)
      setShowReveal(state.status === 'won' || state.status === 'lost')
    }).catch(caught => setError(caught instanceof Error ? caught.message : 'The ranked Paper Trail desk is unavailable.'))
  }, [identity])
  const timeLeft = useDeadlineTimer(daily?.status === 'playing' ? daily.deadlineAt : undefined, () => {
    getDailyPaperTrail(identity).then(state => { setDaily(state); setShowReveal(state.status === 'won' || state.status === 'lost') }).catch(() => undefined)
  })
  useEffect(() => { if (showReveal) revealButtonRef.current?.focus() }, [showReveal])

  const submit = async (player: Player) => {
    if (!daily || busy || (daily.status !== 'playing' && daily.status !== 'not_started')) return
    setBusy(true)
    setError('')
    try {
      const previousReveals = daily.clubs.length
      const next = await submitDailyPaperTrailGuess(identity, player.id)
      setDaily(next)
      if (next.status === 'won' || next.status === 'lost') setShowReveal(true)
      else setFeedback(next.clubs.length > previousReveals ? `Not our player. Club ${next.clubs.length} has been uncovered.` : 'Not our player. The complete verified trail is already visible.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That guess could not be recorded.')
    } finally {
      setBusy(false)
    }
  }

  if (error && !daily) return <section className="ranked-unavailable"><WifiOff/><p className="eyebrow">CASE DESK OFFLINE</p><h1>Today’s trail won’t open.</h1><p>{error}</p><button className="primary" onClick={onPractice}>Open an unranked trail</button></section>
  if (!daily) return <div className="ranked-loading"><LoaderCircle className="spin"/><strong>Opening today’s Paper Trail…</strong></div>

  const complete = daily.status === 'won' || daily.status === 'lost'
  const answer = daily.answer
  const portrait = answer && (answer.portraitCutoutEditorialUrl || answer.portraitEditorialUrl || answer.portraitUrl)
  return (
    <div className="game-page paper-trail-page ranked-paper-trail-page">
      <div className="game-heading"><p className="eyebrow trail">TODAY’S PAPER TRAIL</p><p className="ranked-pill">RANKED</p></div>
      <h1>Follow the Clubs</h1>
      <p className="game-intro">Trace today’s badges, one wrong suspect at a time. Every detective gets the same trail.</p>
      <aside className="daily-case-note"><CalendarDays size={17}/><span><strong>{daily.date} · UTC case</strong><small>Playing as @{identity.user.username} · snapshot {daily.sourceSnapshot}</small></span></aside>
      {!complete && <PracticeTimer timeLeft={timeLeft}/>}

      <CareerGrid clubs={daily.clubs} revealedCount={daily.clubs.length} totalClubs={daily.clubCount} />
      <div className="trail-attempt-row">
        <strong>{complete ? daily.status === 'won' ? 'Case closed!' : 'Case unsolved' : `${daily.guessesUsed} of ${PAPER_TRAIL_GUESS_LIMIT} suspects`}</strong>
        <div className="attempts" aria-label={`${PAPER_TRAIL_GUESS_LIMIT - daily.guessesUsed} guesses remaining`}>
          {Array.from({ length: PAPER_TRAIL_GUESS_LIMIT }, (_, index) => <span className={index < daily.guessesUsed ? daily.status === 'won' && index === daily.guessesUsed - 1 ? 'won' : 'used' : ''} key={index}/>) }
        </div>
      </div>
      <p className="trail-feedback" aria-live="polite">{feedback}</p>
      <PlayerSearch excludedIds={usedIds} onSelect={submit} disabled={complete || busy} pool={fc27Players}/>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <PaperTrailGuessHistory guesses={daily.guesses}/>

      {showReveal && answer && createPortal(
        <section className={`correct-reveal ${daily.status === 'lost' ? 'lost-reveal' : ''}`} role="dialog" aria-modal="true" aria-labelledby="ranked-trail-revealed-name">
          <div className={`reveal-art ${answer.portraitCutoutEditorialUrl ? 'has-cutout' : ''}`} aria-hidden="true"><span className="reveal-paint"/>{portrait && <img src={portrait} alt=""/>}</div>
          <div className="reveal-content"><p className="reveal-stamp">{daily.status === 'won' ? 'TRAIL CLOSED' : 'TRAIL WENT COLD'}</p><h2 id="ranked-trail-revealed-name">{answer.displayName}</h2><p className="reveal-message">{daily.status === 'won' ? 'Career confirmed. Your score is on the weekly table.' : 'The complete career trail has now been released.'}</p><div className="reveal-stats"><span><b>{daily.guessesUsed}</b><small>suspects</small></span><span><b>+{daily.score}</b><small>points</small></span></div><AchievementNotice badgeIds={daily.newBadgeIds} onView={onBadges}/><button ref={revealButtonRef} className="reveal-primary daily-next-action" onClick={onNext}><span><small>2/5 COMPLETE</small>Next: Redacted</span><ArrowRight size={17}/></button><button className="reveal-secondary" onClick={onHome}><Home size={17}/> Finish later / Return home</button></div>
        </section>, document.body)}
    </div>
  )
}

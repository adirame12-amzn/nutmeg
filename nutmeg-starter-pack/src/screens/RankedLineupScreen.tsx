import { CalendarDays, LoaderCircle, RotateCcw, WifiOff } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getDailyLineup, submitDailyGuess, type RankedDailyState, type RankedIdentity } from '../api/ranked'
import { GuessCard } from '../components/GuessCard'
import { PlayerSearch } from '../components/PlayerSearch'
import { fc27Players } from '../data/fc27Players'
import { LINEUP_GUESS_LIMIT } from '../domain/game'
import type { Player } from '../domain/types'
import type { ResultPayload } from './LineupScreen'

export function RankedLineupScreen({ identity, onResult, onQuickCase }: { identity: RankedIdentity; onResult: (payload: ResultPayload) => void; onQuickCase: () => void }) {
  const [daily, setDaily] = useState<RankedDailyState | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showReveal, setShowReveal] = useState(false)
  const latestRef = useRef<HTMLDivElement>(null)
  const revealButtonRef = useRef<HTMLButtonElement>(null)
  const usedIds = useMemo(() => daily?.guesses.map(guess => guess.player.id) || [], [daily])

  useEffect(() => {
    getDailyLineup(identity).then(state => {
      setDaily(state)
      setShowReveal(state.status === 'won' || state.status === 'lost')
    }).catch(caught => setError(caught instanceof Error ? caught.message : 'The ranked desk is unavailable.'))
  }, [identity])
  useEffect(() => { if (showReveal) revealButtonRef.current?.focus() }, [showReveal])

  const submit = async (player: Player) => {
    if (!daily || busy || (daily.status !== 'playing' && daily.status !== 'not_started')) return
    setBusy(true)
    setError('')
    try {
      const next = await submitDailyGuess(identity, player.id)
      setDaily(next)
      if (next.status === 'won' || next.status === 'lost') setShowReveal(true)
      else requestAnimationFrame(() => latestRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That guess could not be recorded.')
    } finally {
      setBusy(false)
    }
  }

  if (error && !daily) return <RankedUnavailable message={error} onQuickCase={onQuickCase} />
  if (!daily) return <div className="ranked-loading"><LoaderCircle className="spin"/><strong>Opening today’s case file…</strong></div>

  const complete = daily.status === 'won' || daily.status === 'lost'
  const answer = daily.answer
  const portrait = answer && (answer.portraitCutoutEditorialUrl || answer.portraitEditorialUrl || answer.portraitUrl)
  const dots = Array.from({ length: LINEUP_GUESS_LIMIT }, (_, index) => index)
  const showResult = () => answer && onResult({ mode: 'lineup', ranked: true, date: daily.date, won: daily.status === 'won', score: daily.score, answer: answer.displayName, guesses: daily.guessesUsed, portraitUrl: portrait })

  return (
    <div className="game-page lineup-page">
      <div className="game-heading"><p className="eyebrow">TODAY’S PRIME SUSPECT</p><p className="ranked-pill">RANKED</p></div>
      <h1>Find the Player</h1>
      <p className="game-intro">One hidden player. The same case for every detective today.</p>
      <aside className="daily-case-note"><CalendarDays size={17}/><span><strong>{daily.date} · UTC case</strong><small>Playing as @{identity.user.username}</small></span></aside>
      <div className="attempt-row">
        <strong>{complete ? daily.status === 'won' ? 'Case closed!' : 'Case unsolved' : `${daily.guessesUsed} of ${LINEUP_GUESS_LIMIT} suspects tried`}</strong>
        <div className="attempts" aria-label={`${LINEUP_GUESS_LIMIT - daily.guessesUsed} suspects remaining`}>{dots.map(index => <span className={index < daily.guessesUsed ? daily.guesses[index]?.isCorrect ? 'won' : 'used' : ''} key={index}/>)}</div>
      </div>
      <PlayerSearch excludedIds={usedIds} onSelect={submit} disabled={complete || busy} pool={fc27Players}/>
      {error && <p className="inline-error" role="alert">{error}</p>}
      {!daily.guesses.length && <div className="how-to-card"><span className="big-number">6</span><div><small>DAILY CASE BRIEFING</small><h2>Name your first suspect.</h2><p>Green evidence is exact. Arrows point toward the server-hidden target. Your first solve is worth 100 points.</p></div></div>}
      <div className="guess-stack">{daily.guesses.map((guess, index) => <div ref={index === daily.guesses.length - 1 ? latestRef : undefined} key={guess.player.id}><GuessCard guess={guess} index={index} compact={index < daily.guesses.length - 1}/></div>)}</div>
      <a className="credits-link" href="#credits">Image credits &amp; data notes</a>
      {showReveal && answer && createPortal(
        <section className={`correct-reveal ${daily.status === 'lost' ? 'lost-reveal' : ''}`} role="dialog" aria-modal="true" aria-labelledby="ranked-revealed-name">
          <div className={`reveal-art ${answer.portraitCutoutEditorialUrl ? 'has-cutout' : ''}`} aria-hidden="true"><span className="reveal-paint"/>{portrait && <img src={portrait} alt=""/>}</div>
          <div className="reveal-content"><p className="reveal-stamp">{daily.status === 'won' ? 'CASE CLOSED' : 'CASE UNSOLVED'}</p><h2 id="ranked-revealed-name">{answer.displayName}</h2><p className="reveal-message">{daily.status === 'won' ? 'Evidence confirmed. Your score is on the weekly table.' : 'The trail went cold. The prime suspect was:'}</p><div className="reveal-stats"><span><b>{daily.guessesUsed}</b><small>suspects</small></span><span><b>+{daily.score}</b><small>points</small></span></div><button ref={revealButtonRef} className="reveal-primary" onClick={showResult}>View case report</button><button className="reveal-secondary" onClick={() => setShowReveal(false)}><RotateCcw size={17}/> Review evidence</button></div>
        </section>, document.body)}
    </div>
  )
}

function RankedUnavailable({ message, onQuickCase }: { message: string; onQuickCase: () => void }) {
  return <section className="ranked-unavailable"><WifiOff/><p className="eyebrow">CASE DESK OFFLINE</p><h1>Today’s file won’t open.</h1><p>{message}</p><button className="primary" onClick={onQuickCase}>Play an unranked quick case</button></section>
}

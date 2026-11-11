import { RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { GuessCard } from '../components/GuessCard'
import { PlayerSearch } from '../components/PlayerSearch'
import { fc27Players, getRandomLineupTarget } from '../data/fc27Players'
import { canSubmitGuess, comparePlayers, LINEUP_GUESS_LIMIT, lineupScore } from '../domain/game'
import type { GameStatus, LineupGuess, Player } from '../domain/types'

export interface ResultPayload {
  mode: 'lineup' | 'mystery'
  won: boolean
  score: number
  answer: string
  guesses: number
  clues?: number
  questions?: number
  portraitUrl?: string
}

const LAST_TARGET_KEY = 'nutmeg-last-lineup-target'
const previousTargetId = () => typeof sessionStorage === 'undefined' ? undefined : sessionStorage.getItem(LAST_TARGET_KEY) ?? undefined

export function LineupScreen({ onResult }: { onResult: (payload: ResultPayload) => void }) {
  const [lineupTarget, setLineupTarget] = useState(() => getRandomLineupTarget(previousTargetId()))
  const [guesses, setGuesses] = useState<LineupGuess[]>([])
  const [status, setStatus] = useState<GameStatus>('playing')
  const [showReveal, setShowReveal] = useState(false)
  const latestRef = useRef<HTMLDivElement>(null)
  const revealButtonRef = useRef<HTMLButtonElement>(null)
  const usedIds = useMemo(() => guesses.map(guess => guess.player.id), [guesses])

  const submitGuess = (player: Player) => {
    if (status !== 'playing' || !canSubmitGuess(usedIds, player.id, LINEUP_GUESS_LIMIT)) return
    const nextGuess = comparePlayers(player, lineupTarget)
    const next = [...guesses, nextGuess]
    const nextStatus: GameStatus = nextGuess.isCorrect ? 'won' : next.length >= LINEUP_GUESS_LIMIT ? 'lost' : 'playing'
    setGuesses(next)
    setStatus(nextStatus)
    if (nextStatus !== 'playing') setShowReveal(true)
    if (!nextGuess.isCorrect) requestAnimationFrame(() => latestRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  useEffect(() => { if (showReveal) revealButtonRef.current?.focus() }, [showReveal])
  useEffect(() => { sessionStorage.setItem(LAST_TARGET_KEY, lineupTarget.id) }, [lineupTarget.id])

  const reset = () => {
    setLineupTarget(getRandomLineupTarget(lineupTarget.id))
    setGuesses([])
    setStatus('playing')
    setShowReveal(false)
  }
  const showResult = () => {
    const won = status === 'won'
    onResult({
    mode: 'lineup', won, score: lineupScore(guesses.length, won), answer: lineupTarget.displayName,
    guesses: guesses.length, portraitUrl: lineupTarget.portraitCutoutEditorialUrl || lineupTarget.portraitEditorialUrl || lineupTarget.portraitUrl
    })
  }
  const dots = Array.from({ length: LINEUP_GUESS_LIMIT }, (_, index) => index)

  return (
    <div className="game-page lineup-page">
      <div className="game-heading"><p className="eyebrow">THE LINEUP</p><p className="demo-pill">MEN'S 96-PLAYER POOL</p></div>
      <h1>Guess the Player</h1>
      <p className="game-intro">Compare real FC 27 snapshot attributes. Arrows point toward the hidden player.</p>
      <aside className="data-preview-note"><strong>Prototype data · 12 Sep 2026</strong><span>FC source licence and 2026 eligibility still require publication review.</span></aside>
      <div className="attempt-row">
        <strong>{status === 'playing' ? `Attempt ${guesses.length + 1} of ${LINEUP_GUESS_LIMIT}` : status === 'won' ? 'Solved!' : 'Full time'}</strong>
        <div className="attempts" aria-label={`${LINEUP_GUESS_LIMIT - guesses.length} guesses remaining`}>
          {dots.map(index => <span className={index < guesses.length ? guesses[index].isCorrect ? 'won' : 'used' : ''} key={index} />)}
        </div>
      </div>

      <PlayerSearch excludedIds={usedIds} onSelect={submitGuess} disabled={status !== 'playing'} pool={fc27Players} />
      {guesses.length === 0 && (
        <div className="how-to-card">
          <span className="big-number">6</span><div><small>HOW TO PLAY</small><h2>One guess at a time.</h2><p>Green means an exact match. Age and FC 27 rating arrows point toward the answer.</p><p className="try-names">Try: <strong>Haaland</strong>, <strong>Rodri</strong>, or <strong>Mbappé</strong>.</p></div>
        </div>
      )}
      <div className="guess-stack">
        {guesses.map((guess, index) => <div ref={index === guesses.length - 1 ? latestRef : undefined} key={guess.player.id}><GuessCard guess={guess} index={index} compact={index < guesses.length - 1} /></div>)}
      </div>
      <a className="credits-link" href="#credits">Image credits &amp; data notes</a>
      {showReveal && createPortal(
        <section className={`correct-reveal ${status === 'lost' ? 'lost-reveal' : ''}`} role="dialog" aria-modal="true" aria-labelledby="revealed-player-name">
          <div className={`reveal-art ${lineupTarget.portraitCutoutEditorialUrl ? 'has-cutout' : ''}`} aria-hidden="true"><span className="reveal-paint"/><img src={lineupTarget.portraitCutoutEditorialUrl || lineupTarget.portraitEditorialUrl || lineupTarget.portraitUrl} alt="" /></div>
          <div className="reveal-content">
            <p className="reveal-stamp">{status === 'won' ? 'CORRECT!' : 'ANSWER REVEALED'}</p>
            <h2 id="revealed-player-name">{lineupTarget.displayName}</h2>
            {status === 'lost' && <p className="reveal-message">No points this round — have another go.</p>}
            <div className="reveal-stats"><span><b>{guesses.length}</b><small>{guesses.length === 1 ? 'guess' : 'guesses'}</small></span><span><b>+{lineupScore(guesses.length, status === 'won')}</b><small>points</small></span></div>
            <button ref={revealButtonRef} className="reveal-primary" onClick={showResult}>{status === 'won' ? 'View match card' : 'View result'}</button>
            <button className="reveal-secondary" onClick={reset}><RotateCcw size={17}/> Play another player</button>
          </div>
        </section>
      , document.body)}
    </div>
  )
}

import { RotateCcw, Share2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { GuessCard } from '../components/GuessCard'
import { PlayerSearch } from '../components/PlayerSearch'
import { lineupTarget } from '../data/players'
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
}

export function LineupScreen({ onResult }: { onResult: (payload: ResultPayload) => void }) {
  const [guesses, setGuesses] = useState<LineupGuess[]>([])
  const [status, setStatus] = useState<GameStatus>('playing')
  const latestRef = useRef<HTMLDivElement>(null)
  const usedIds = useMemo(() => guesses.map(guess => guess.player.id), [guesses])

  const submitGuess = (player: Player) => {
    if (status !== 'playing' || !canSubmitGuess(usedIds, player.id, LINEUP_GUESS_LIMIT)) return
    const nextGuess = comparePlayers(player, lineupTarget)
    const next = [...guesses, nextGuess]
    const nextStatus: GameStatus = nextGuess.isCorrect ? 'won' : next.length >= LINEUP_GUESS_LIMIT ? 'lost' : 'playing'
    setGuesses(next)
    setStatus(nextStatus)
    requestAnimationFrame(() => latestRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const reset = () => { setGuesses([]); setStatus('playing') }
  const dots = Array.from({ length: LINEUP_GUESS_LIMIT }, (_, index) => index)

  return (
    <div className="game-page lineup-page">
      <div className="game-heading"><p className="eyebrow">THE LINEUP</p><p className="demo-pill">SYNTHETIC DATA</p></div>
      <h1>Guess the Player</h1>
      <p className="game-intro">Compare the profile. Arrows point toward today’s hidden player.</p>
      <div className="attempt-row">
        <strong>{status === 'playing' ? `Attempt ${guesses.length + 1} of ${LINEUP_GUESS_LIMIT}` : status === 'won' ? 'Solved!' : 'Full time'}</strong>
        <div className="attempts" aria-label={`${LINEUP_GUESS_LIMIT - guesses.length} guesses remaining`}>
          {dots.map(index => <span className={index < guesses.length ? guesses[index].isCorrect ? 'won' : 'used' : ''} key={index} />)}
        </div>
      </div>

      <PlayerSearch excludedIds={usedIds} onSelect={submitGuess} disabled={status !== 'playing'} />
      {guesses.length === 0 && (
        <div className="how-to-card">
          <span className="big-number">6</span><div><small>HOW TO PLAY</small><h2>One guess at a time.</h2><p>Search the fictional player pool. Green means an exact match; age arrows tell you older or younger.</p><p className="try-names">Try: <strong>Theo Bell</strong>, <strong>Otto Reed</strong>, or <strong>Mara Voss</strong>.</p></div>
        </div>
      )}
      <div className="guess-stack">
        {guesses.map((guess, index) => <div ref={index === guesses.length - 1 ? latestRef : undefined} key={guess.player.id}><GuessCard guess={guess} index={index} compact={index < guesses.length - 1} /></div>)}
      </div>
      {status !== 'playing' && (
        <section className={`game-over-card ${status}`}>
          <small>{status === 'won' ? 'BACK OF THE NET' : 'ANSWER REVEALED'}</small>
          <h2>{lineupTarget.displayName}</h2>
          <p>{status === 'won' ? `Solved in ${guesses.length} ${guesses.length === 1 ? 'guess' : 'guesses'} · ${lineupScore(guesses.length, true)} points` : 'No points this round — have another go.'}</p>
          <div className="button-pair">
            <button className="primary" onClick={() => onResult({ mode: 'lineup', won: status === 'won', score: lineupScore(guesses.length, status === 'won'), answer: lineupTarget.displayName, guesses: guesses.length })}><Share2 size={18}/> Result</button>
            <button onClick={reset}><RotateCcw size={18}/> Replay demo</button>
          </div>
        </section>
      )}
    </div>
  )
}

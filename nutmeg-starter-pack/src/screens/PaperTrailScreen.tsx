import { FileSearch, Link as LinkIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CareerGrid } from '../components/CareerGrid'
import { PaperTrailGuessHistory } from '../components/PaperTrailGuessHistory'
import { PlayerSearch } from '../components/PlayerSearch'
import { fc27Players } from '../data/fc27Players'
import { getRandomPaperTrailPuzzle } from '../data/paperTrail'
import { canGuessPaperTrail, PAPER_TRAIL_GUESS_LIMIT, paperTrailRevealCount, paperTrailScore, type PaperTrailPuzzle } from '../domain/paperTrail'
import type { Player } from '../domain/types'
import type { ResultPayload } from './LineupScreen'

const LAST_TRAIL_KEY = 'player-press-last-paper-trail-target'
const previousTarget = () => typeof sessionStorage === 'undefined' ? undefined : sessionStorage.getItem(LAST_TRAIL_KEY) || undefined

export function PaperTrailScreen({ onResult }: { onResult: (payload: ResultPayload) => void }) {
  const [puzzle] = useState<PaperTrailPuzzle>(() => getRandomPaperTrailPuzzle(previousTarget()))
  const [guesses, setGuesses] = useState<Player[]>([])
  const [feedback, setFeedback] = useState('One club is on file. Name the player.')
  const guessIds = useMemo(() => guesses.map(player => player.id), [guesses])
  const revealCount = paperTrailRevealCount(guesses.length, puzzle.clubs.length)

  useEffect(() => { sessionStorage.setItem(LAST_TRAIL_KEY, puzzle.answer.id) }, [puzzle.answer.id])

  const finish = (won: boolean, nextGuesses: Player[]) => {
    onResult({
      mode: 'paper-trail', won, score: paperTrailScore(nextGuesses.length, won),
      answer: puzzle.answer.displayName, nationality: puzzle.answer.nationalTeam,
      guesses: nextGuesses.length, clubs: puzzle.clubs, puzzleId: puzzle.id,
      portraitUrl: puzzle.answer.portraitCutoutEditorialUrl || puzzle.answer.portraitEditorialUrl || puzzle.answer.portraitUrl,
    })
  }

  const submitGuess = (player: Player) => {
    if (!canGuessPaperTrail(guessIds, player.id)) return
    const next = [...guesses, player]
    if (player.id === puzzle.answer.id) {
      finish(true, next)
      return
    }
    if (next.length >= PAPER_TRAIL_GUESS_LIMIT) {
      finish(false, next)
      return
    }
    setGuesses(next)
    const nextReveal = paperTrailRevealCount(next.length, puzzle.clubs.length)
    setFeedback(nextReveal > revealCount ? `Not our player. Club ${nextReveal} has been uncovered.` : 'Not our player. The complete available trail is already visible.')
  }

  return (
    <div className="game-page paper-trail-page">
      <div className="game-heading"><p className="eyebrow trail">PAPER TRAIL</p><p className="demo-pill">CASE 03 · PRACTICE</p></div>
      <h1>Follow the Clubs</h1>
      <p className="game-intro">Trace the badges through a senior career. Name the player before six suspects run out.</p>
      <aside className="trail-source-note"><FileSearch/><span><strong>Local practice file · unscored leaderboard</strong><small>Wikidata club statements snapshot {puzzle.sourceSnapshot} · editorial completeness review pending.</small></span></aside>

      <CareerGrid clubs={puzzle.clubs} revealedCount={revealCount} />

      <div className="trail-attempt-row">
        <strong>{guesses.length} of {PAPER_TRAIL_GUESS_LIMIT} suspects</strong>
        <div className="attempts" aria-label={`${PAPER_TRAIL_GUESS_LIMIT - guesses.length} guesses remaining`}>
          {Array.from({ length: PAPER_TRAIL_GUESS_LIMIT }, (_, index) => <span className={index < guesses.length ? 'used' : ''} key={index}/>) }
        </div>
      </div>
      <p className="trail-feedback" aria-live="polite">{feedback}</p>
      <PlayerSearch excludedIds={guessIds} onSelect={submitGuess} pool={fc27Players} />
      <PaperTrailGuessHistory guesses={guesses} />
      <div className="trail-method-links">
        <a href={puzzle.sourceUrl} target="_blank" rel="noreferrer"><LinkIcon/> Career-source record</a>
        <a href="#credits">Crest and portrait credits</a>
      </div>
    </div>
  )
}

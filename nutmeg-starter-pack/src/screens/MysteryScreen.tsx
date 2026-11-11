import { Check, ChevronDown, ChevronUp, LockKeyhole, MessageCircleQuestion, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PlayerSearch } from '../components/PlayerSearch'
import { mysteryFacts, mysteryQuestions } from '../data/mystery'
import { mysteryTarget } from '../data/players'
import { canSubmitGuess, MYSTERY_GUESS_LIMIT, MYSTERY_QUESTION_LIMIT, mysteryScore, revealCount } from '../domain/game'
import type { GameStatus, MysteryQuestion, Player } from '../domain/types'
import type { ResultPayload } from './LineupScreen'

export function MysteryScreen({ onResult }: { onResult: (payload: ResultPayload) => void }) {
  const [cluesSeen, setCluesSeen] = useState(1)
  const [asked, setAsked] = useState<MysteryQuestion[]>([])
  const [guessIds, setGuessIds] = useState<string[]>([])
  const [status, setStatus] = useState<GameStatus>('playing')
  const [panel, setPanel] = useState<'questions' | 'guess' | null>(null)
  const askedIds = useMemo(() => asked.map(question => question.id), [asked])

  const ask = (question: MysteryQuestion) => {
    if (asked.length >= MYSTERY_QUESTION_LIMIT || askedIds.includes(question.id)) return
    setAsked([...asked, question]); setPanel(null)
  }
  const guess = (player: Player) => {
    if (status !== 'playing' || !canSubmitGuess(guessIds, player.id, MYSTERY_GUESS_LIMIT)) return
    const nextIds = [...guessIds, player.id]
    const won = player.id === mysteryTarget.id
    const nextStatus = won ? 'won' : nextIds.length >= MYSTERY_GUESS_LIMIT ? 'lost' : 'playing'
    setGuessIds(nextIds); setStatus(nextStatus); setPanel(null)
  }
  const finish = () => onResult({ mode: 'mystery', won: status === 'won', score: mysteryScore(cluesSeen, asked.length, guessIds.length, status === 'won'), answer: mysteryTarget.displayName, guesses: guessIds.length, clues: cluesSeen, questions: asked.length })

  return (
    <div className="game-page mystery-page">
      <div className="game-heading"><p className="eyebrow">THE MYSTERY</p><p className="demo-pill">FICTIONAL CLUES</p></div>
      <h1>Who Am I?</h1>
      <p className="game-intro">Reveal up to three clues. Ask three fixed questions. Make three guesses.</p>
      <div className="clue-stack">
        {mysteryFacts.map((fact, index) => index < cluesSeen ? (
          <article className="clue-card" key={fact.id}><small>CLUE {index + 1} OF 3</small><p>{fact.text}</p><span>FICTIONAL DEMO FACT</span></article>
        ) : (
          <button className="locked-clue" key={fact.id} onClick={() => setCluesSeen(revealCount(cluesSeen))} disabled={status !== 'playing'}><LockKeyhole size={19}/> Reveal clue {index + 1}</button>
        ))}
      </div>

      <div className="mystery-counters"><span><MessageCircleQuestion/> Questions <strong>{asked.length}/{MYSTERY_QUESTION_LIMIT}</strong></span><span><Search/> Guesses <strong>{guessIds.length}/{MYSTERY_GUESS_LIMIT}</strong></span></div>

      {asked.length > 0 && <div className="answers-list">{asked.map(question => <div key={question.id}><span>{question.text}</span><strong className={question.answer === 'Yes' ? 'yes' : 'no'}>{question.answer === 'Yes' ? <Check/> : <X/>}{question.answer}</strong></div>)}</div>}

      {status === 'playing' ? (
        <div className="mystery-actions">
          <button className="primary mystery-primary" onClick={() => setPanel(panel === 'questions' ? null : 'questions')} disabled={asked.length >= MYSTERY_QUESTION_LIMIT}><MessageCircleQuestion/> Ask a question {panel === 'questions' ? <ChevronUp/> : <ChevronDown/>}</button>
          {panel === 'questions' && <div className="question-menu">{mysteryQuestions.filter(question => !askedIds.includes(question.id)).map(question => <button key={question.id} onClick={() => ask(question)}>{question.text}<span>Ask</span></button>)}</div>}
          <button onClick={() => setPanel(panel === 'guess' ? null : 'guess')}><Search/> Guess the player {panel === 'guess' ? <ChevronUp/> : <ChevronDown/>}</button>
          {panel === 'guess' && <PlayerSearch excludedIds={guessIds} onSelect={guess} />}
        </div>
      ) : (
        <section className={`game-over-card ${status}`}><small>{status === 'won' ? 'MYSTERY SOLVED' : 'THE REVEAL'}</small><h2>{mysteryTarget.displayName}</h2><p>{status === 'won' ? `${mysteryScore(cluesSeen, asked.length, guessIds.length, true)} points` : 'Not this time — the answer was fictional, too.'}</p><button className="primary mystery-primary" onClick={finish}>See result</button></section>
      )}
    </div>
  )
}

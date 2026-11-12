import { Eye, FileLock2, Home, RotateCcw, Search, ShieldCheck, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { Screen } from '../components/Chrome'
import { PlayerPortrait } from '../components/PlayerPortrait'
import { PlayerSearch } from '../components/PlayerSearch'
import { RedactedKeyboard } from '../components/RedactedKeyboard'
import { fc27Players } from '../data/fc27Players'
import { getRandomRedactedCase } from '../data/redacted'
import {
  EMPTY_REDACTED_STATS,
  isCorrectRedactedLetter,
  isRedactedSolved,
  parseRedactedStats,
  recordRedactedResult,
  redactedEvidenceAvailable,
  redactedNameSlots,
  REDACTED_STATS_KEY,
  redactedScore,
  revealRedactedName,
  REDACTED_STRIKE_LIMIT,
  type RedactedStats,
} from '../domain/redacted'
import type { GameStatus, Player } from '../domain/types'

const LAST_TARGET_KEY = 'player-press-last-redacted-target'
const previousTarget = () => typeof sessionStorage === 'undefined' ? undefined : sessionStorage.getItem(LAST_TARGET_KEY) || undefined

function loadStats() {
  return typeof window === 'undefined' ? { ...EMPTY_REDACTED_STATS } : parseRedactedStats(window.localStorage?.getItem(REDACTED_STATS_KEY) ?? null)
}

export function RedactedScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [caseFile, setCaseFile] = useState(() => getRandomRedactedCase(previousTarget()))
  const [guessedLetters, setGuessedLetters] = useState<string[]>([])
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [fullGuessIds, setFullGuessIds] = useState<string[]>([])
  const [openedEvidence, setOpenedEvidence] = useState<boolean[]>([false, false])
  const [showSearch, setShowSearch] = useState(false)
  const [status, setStatus] = useState<GameStatus>('playing')
  const [feedback, setFeedback] = useState('The name is under black ink. Start with a letter.')
  const [stats, setStats] = useState<RedactedStats>(loadStats)

  const score = redactedScore(status === 'won', wrongAttempts, openedEvidence.filter(Boolean).length)
  const redactedName = useMemo(() => revealRedactedName(caseFile, guessedLetters), [caseFile, guessedLetters])
  const nameSlots = useMemo(() => redactedNameSlots(caseFile, guessedLetters), [caseFile, guessedLetters])
  const correctLetters = useMemo(() => guessedLetters.filter(letter => isCorrectRedactedLetter(caseFile, letter)), [caseFile, guessedLetters])

  useEffect(() => { sessionStorage.setItem(LAST_TARGET_KEY, caseFile.player.id) }, [caseFile.player.id])

  const finish = (won: boolean, nextWrong: number, nextOpened = openedEvidence) => {
    const nextScore = redactedScore(won, nextWrong, nextOpened.filter(Boolean).length)
    const nextStats = recordRedactedResult(stats, won, nextWrong, nextScore)
    setStats(nextStats)
    window.localStorage?.setItem(REDACTED_STATS_KEY, JSON.stringify(nextStats))
    setStatus(won ? 'won' : 'lost')
    setShowSearch(false)
  }

  const guessLetter = (letter: string) => {
    if (status !== 'playing' || guessedLetters.includes(letter)) return
    const nextLetters = [...guessedLetters, letter]
    setGuessedLetters(nextLetters)
    if (isCorrectRedactedLetter(caseFile, letter)) {
      setFeedback(`${letter} is in the file.`)
      if (isRedactedSolved(caseFile, nextLetters)) finish(true, wrongAttempts)
      return
    }
    const nextWrong = wrongAttempts + 1
    setWrongAttempts(nextWrong)
    setFeedback(nextWrong >= REDACTED_STRIKE_LIMIT ? 'Six strikes. The file is closing.' : `${letter} is not in the name.`)
    if (nextWrong >= REDACTED_STRIKE_LIMIT) finish(false, nextWrong)
  }

  const submitFullGuess = (player: Player) => {
    if (status !== 'playing' || fullGuessIds.includes(player.id)) return
    setFullGuessIds(ids => [...ids, player.id])
    if (player.id === caseFile.player.id) {
      finish(true, wrongAttempts)
      return
    }
    const nextWrong = wrongAttempts + 1
    setWrongAttempts(nextWrong)
    setFeedback(`${player.displayName} is not the suspect. One strike added.`)
    if (nextWrong >= REDACTED_STRIKE_LIMIT) finish(false, nextWrong)
  }

  const openEvidence = (index: number) => {
    if (!redactedEvidenceAvailable(index, wrongAttempts) || openedEvidence[index]) return
    const next = openedEvidence.map((open, evidenceIndex) => evidenceIndex === index ? true : open)
    setOpenedEvidence(next)
  }

  const reset = () => {
    const next = getRandomRedactedCase(caseFile.player.id)
    sessionStorage.setItem(LAST_TARGET_KEY, next.player.id)
    setCaseFile(next)
    setGuessedLetters([])
    setWrongAttempts(0)
    setFullGuessIds([])
    setOpenedEvidence([false, false])
    setShowSearch(false)
    setStatus('playing')
    setFeedback('The name is under black ink. Start with a letter.')
  }

  if (status !== 'playing') {
    const winRate = stats.gamesPlayed ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0
    return (
      <div className={`redacted-result ${status}`}>
        <div className="redacted-result-art"><span/><PlayerPortrait player={caseFile.player} size="hero" /></div>
        <p className="result-stamp">{status === 'won' ? 'CASE SOLVED' : 'CASE CLOSED'}</p>
        <small>REDACTED · PRACTICE REPORT</small>
        <h1>{caseFile.player.displayName}</h1>
        <p>{status === 'won' ? 'The ink came off. Identity confirmed.' : `The concealed name was ${caseFile.displayAnswer.toLocaleUpperCase('en-US')}.`}</p>
        <div className="redacted-result-stats">
          <span><b>{wrongAttempts}</b><small>strikes</small></span>
          <span><b>{openedEvidence.filter(Boolean).length}</b><small>evidence</small></span>
          <span><b>{score}</b><small>points</small></span>
        </div>
        <div className="redacted-record"><span>{stats.gamesPlayed} played</span><span>{winRate}% solved</span><span>{stats.bestScore} best</span><span>{stats.currentWinStreak} streak</span></div>
        <button className="primary dark" onClick={reset}><RotateCcw/> Play another case</button>
        <button onClick={() => onNavigate('home')}><Home/> Back to Cold Cases</button>
      </div>
    )
  }

  return (
    <div className="game-page redacted-page">
      <div className="game-heading"><p className="eyebrow redacted">REDACTED</p><p className="demo-pill">CASE 04 · PRACTICE</p></div>
      <div className="redacted-scorekey" aria-label="Scoring rules"><span><b>100</b> start</span><i/><span><b>−12</b> strike</span><i/><span><b>−10</b> evidence</span></div>
      <h1>Uncover the Name</h1>
      <p className="game-intro">Lift the black ink before six wrong letters close the file.</p>

      <section className="redacted-evidence" aria-labelledby="redacted-evidence-title">
        <div className="evidence-heading"><span><Eye/></span><div><h2 id="redacted-evidence-title">Evidence</h2><small>UNLOCKS AT 2 / 4 STRIKES · −10 TO OPEN</small></div></div>
        {[0, 1].map(index => {
          const available = redactedEvidenceAvailable(index, wrongAttempts)
          const open = openedEvidence[index]
          const evidenceState = open ? 'open' : available ? 'available' : 'locked'
          return <button key={index} disabled={!available} className={evidenceState} onClick={() => openEvidence(index)}>
            <span className="evidence-status">{open ? <ShieldCheck/> : available ? <Eye/> : <FileLock2/>}<b>{open ? 'OPENED' : available ? 'OPEN −10' : `${index === 0 ? 2 : 4} STRIKES`}</b></span>
            <span><small>FILE 0{index + 1}</small><strong>{open ? index === 0 ? `${caseFile.player.nationalTeam} · ${caseFile.player.position}` : `${caseFile.player.currentClub} · FC ${caseFile.player.fcOverall ?? '—'}` : available ? 'TAP TO UNSEAL' : 'SEALED'}</strong></span>
          </button>
        })}
      </section>

      <section className="redacted-dossier" aria-label="Confidential player name">
        <div className="confidential-row"><FileLock2/><span>CONFIDENTIAL</span><small>PP–004</small></div>
        <div className="redacted-nameplate" aria-label={`Redacted name: ${redactedName}`}>
          {nameSlots.map(slot => slot.kind === 'separator'
            ? <span className="name-separator" key={slot.id}>{slot.character}</span>
            : <span className={`name-letter ${slot.revealed ? 'revealed' : ''}`} key={slot.id}>{slot.character}</span>)}
        </div>
        <div className="strike-heading"><span><b>STRIKE LEDGER</b><small>Wrong letter or suspect = 1 strike</small></span><strong>{REDACTED_STRIKE_LIMIT - wrongAttempts} LEFT</strong></div>
        <div className="strike-row" aria-label={`${wrongAttempts} of ${REDACTED_STRIKE_LIMIT} strikes used`}>
          {Array.from({ length: REDACTED_STRIKE_LIMIT }, (_, index) => <span className={index < wrongAttempts ? 'used' : ''} key={index}><small>{index + 1}</small>{index < wrongAttempts ? <X/> : <i/>}</span>)}
        </div>
      </section>

      <p className="redacted-feedback" aria-live="polite">{feedback}</p>
      <RedactedKeyboard guessedLetters={guessedLetters} correctLetters={correctLetters} disabled={false} onGuess={guessLetter} />
      <button className="redacted-search-toggle" onClick={() => setShowSearch(show => !show)} aria-expanded={showSearch}><Search/> Name the Suspect</button>
      {showSearch && <PlayerSearch excludedIds={fullGuessIds} onSelect={submitFullGuess} pool={fc27Players} />}
      <p className="redacted-rule-note">Full-player misses also use one strike. Accents are optional.</p>
    </div>
  )
}

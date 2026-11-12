import { Fingerprint, Home, Lightbulb, LockKeyhole, RotateCcw, Send, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Screen } from '../components/Chrome'
import { PlayerPortrait } from '../components/PlayerPortrait'
import { getRandomRedactedCase } from '../data/redacted'
import { CIPHER_ATTEMPT_LIMIT, CIPHER_HINT_COST, cipherScore, isCipherAnswer, scrambleCipherName } from '../domain/cipher'
import type { GameStatus } from '../domain/types'

const LAST_CIPHER_KEY = 'player-press-last-cipher-target'
const previousTarget = () => typeof sessionStorage === 'undefined' ? undefined : sessionStorage.getItem(LAST_CIPHER_KEY) || undefined

export function CipherScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [caseFile, setCaseFile] = useState(() => getRandomRedactedCase(previousTarget()))
  const [scrambled, setScrambled] = useState(() => scrambleCipherName(caseFile.displayAnswer))
  const [guess, setGuess] = useState('')
  const [attempts, setAttempts] = useState<string[]>([])
  const [openedHints, setOpenedHints] = useState([false, false])
  const [status, setStatus] = useState<GameStatus>('playing')
  const [feedback, setFeedback] = useState('The letters are all here. Put the name back together.')
  const score = cipherScore(attempts.length, status === 'won', openedHints.filter(Boolean).length)
  const nationAvailable = attempts.length >= 2
  const clubAvailable = attempts.length >= 3
  const tileRotations = useMemo(() => scrambled.map((_, index) => `${index % 2 ? 1.5 : -1.5}deg`), [scrambled])
  useEffect(() => { sessionStorage.setItem(LAST_CIPHER_KEY, caseFile.player.id) }, [caseFile.player.id])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = guess.trim()
    if (!trimmed || status !== 'playing') return
    const next = [...attempts, trimmed]
    setAttempts(next)
    setGuess('')
    ;(document.activeElement as HTMLElement | null)?.blur()
    if (isCipherAnswer(caseFile, trimmed)) {
      setStatus('won')
      return
    }
    if (next.length >= CIPHER_ATTEMPT_LIMIT) {
      setStatus('lost')
      return
    }
    setFeedback(next.length === 1 ? 'Not cracked. Read the tiles again.' : next.length === 2 ? 'Nation evidence is ready to unseal.' : 'Club evidence is ready to unseal. One last attempt.')
  }

  const openHint = (index: 0 | 1) => {
    const available = index === 0 ? nationAvailable : clubAvailable
    if (!available || openedHints[index]) return
    setOpenedHints(current => current.map((open, hintIndex) => hintIndex === index ? true : open))
    setFeedback(`${index === 0 ? 'Nation' : 'Club'} evidence opened. −${CIPHER_HINT_COST} points.`)
  }

  const reset = () => {
    const next = getRandomRedactedCase(caseFile.player.id)
    sessionStorage.setItem(LAST_CIPHER_KEY, next.player.id)
    setCaseFile(next)
    setScrambled(scrambleCipherName(next.displayAnswer))
    setGuess('')
    setAttempts([])
    setOpenedHints([false, false])
    setStatus('playing')
    setFeedback('The letters are all here. Put the name back together.')
  }

  if (status !== 'playing') return <div className={`cipher-result ${status}`}>
    <div className="cipher-result-art"><PlayerPortrait player={caseFile.player} size="hero"/></div>
    <p className="result-stamp">{status === 'won' ? 'CIPHER CRACKED' : 'CODE UNBROKEN'}</p>
    <small>THE CIPHER · PRACTICE REPORT</small>
    <h1>{caseFile.displayAnswer}</h1>
    <p>{status === 'won' ? 'Letters restored. Identity confirmed.' : `The scrambled player was ${caseFile.player.displayName}.`}</p>
    <strong className="points">+{score} pts</strong>
    <button className="primary dark" onClick={reset}><RotateCcw/> Crack another name</button>
    <button onClick={() => onNavigate('home')}><Home/> Back to Cold Cases</button>
  </div>

  return <div className="game-page cipher-page">
    <div className="game-heading"><p className="eyebrow cipher">THE CIPHER</p><p className="demo-pill">CASE 05 · PRACTICE</p></div>
    <h1>Unscramble the Name</h1>
    <p className="game-intro">Every letter belongs to one player. Rebuild the name in four attempts; optional evidence costs {CIPHER_HINT_COST} points.</p>
    <section className="cipher-board" aria-label={`Scrambled name with ${scrambled.length} letters`}>
      <div className="cipher-file"><Fingerprint/><span>INTERCEPTED NAME</span><small>PP–005</small></div>
      <div className="cipher-tiles">{scrambled.map((letter, index) => <span style={{ transform: `rotate(${tileRotations[index]})` }} key={`${letter}-${index}`}>{letter}</span>)}</div>
      <small>{scrambled.length} LETTERS · SPACES REMOVED</small>
    </section>
    <div className="cipher-clues" aria-label="Optional evidence">
      <button className={openedHints[0] ? 'revealed' : nationAvailable ? 'available' : 'locked'} disabled={!nationAvailable || openedHints[0]} onClick={() => openHint(0)}>{openedHints[0] ? <ShieldCheck/> : nationAvailable ? <Lightbulb/> : <LockKeyhole/>}<small>NATION</small><b>{openedHints[0] ? caseFile.player.nationalTeam : nationAvailable ? `UNSEAL · −${CIPHER_HINT_COST}` : 'AFTER 2 MISSES'}</b></button>
      <button className={openedHints[1] ? 'revealed' : clubAvailable ? 'available' : 'locked'} disabled={!clubAvailable || openedHints[1]} onClick={() => openHint(1)}>{openedHints[1] ? <ShieldCheck/> : clubAvailable ? <Lightbulb/> : <LockKeyhole/>}<small>CLUB</small><b>{openedHints[1] ? caseFile.player.currentClub : clubAvailable ? `UNSEAL · −${CIPHER_HINT_COST}` : 'AFTER 3 MISSES'}</b></button>
    </div>
    <div className="cipher-attempts"><span>{CIPHER_ATTEMPT_LIMIT - attempts.length} attempts left</span><div>{Array.from({ length: CIPHER_ATTEMPT_LIMIT }, (_, index) => <i className={index < attempts.length ? 'used' : ''} key={index}/>)}</div></div>
    <p className="cipher-feedback" aria-live="polite">{feedback}</p>
    <form className="cipher-form" onSubmit={submit}>
      <label><span className="sr-only">Unscrambled player name</span><input value={guess} onChange={event => setGuess(event.target.value)} autoComplete="off" placeholder="Type the player name…"/></label>
      <button type="submit" disabled={!guess.trim()}><Send/> Submit</button>
    </form>
    {attempts.length > 0 && <div className="cipher-misses"><small>REJECTED READS</small>{attempts.map(value => <span key={value}>{value}</span>)}</div>}
  </div>
}

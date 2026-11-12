import { ArrowRight, Eye, FileLock2, Home, LoaderCircle, Search, ShieldCheck, WifiOff, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getDailyRedacted, openDailyRedactedEvidence, startDailyRedacted, submitDailyRedactedGuess, submitDailyRedactedLetter, type RankedIdentity, type RankedRedactedState } from '../api/ranked'
import { PracticeTimer } from '../components/PracticeTimer'
import { PlayerPortrait } from '../components/PlayerPortrait'
import { PlayerSearch } from '../components/PlayerSearch'
import { RedactedKeyboard } from '../components/RedactedKeyboard'
import { fc27Players } from '../data/fc27Players'
import { useDeadlineTimer } from '../hooks/useDeadlineTimer'

export function RankedRedactedScreen({ identity, onNext, onHome }: { identity: RankedIdentity; onNext: () => void; onHome: () => void }) {
  const [daily, setDaily] = useState<RankedRedactedState | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  useEffect(() => { startDailyRedacted(identity).then(setDaily).catch(caught => setError(caught instanceof Error ? caught.message : 'Daily Redacted is unavailable.')) }, [identity])
  const timeLeft = useDeadlineTimer(daily?.status === 'playing' ? daily.deadlineAt : undefined, () => { getDailyRedacted(identity).then(setDaily).catch(() => undefined) })

  const run = async (action: () => Promise<RankedRedactedState>) => {
    if (busy) return
    setBusy(true); setError('')
    try { setDaily(await action()) } catch (caught) { setError(caught instanceof Error ? caught.message : 'The case desk rejected that move.') } finally { setBusy(false) }
  }
  if (error && !daily) return <section className="ranked-unavailable"><WifiOff/><h1>Today’s ink is still drying.</h1><p>{error}</p></section>
  if (!daily) return <div className="ranked-loading"><LoaderCircle className="spin"/> Opening today’s Redacted file…</div>
  const complete = daily.status === 'won' || daily.status === 'lost'
  if (complete && daily.answer) return <div className={`redacted-result ${daily.status}`}>
    <div className="redacted-result-art"><span/><PlayerPortrait player={daily.answer} size="hero"/></div>
    <p className="result-stamp">{daily.status === 'won' ? 'CASE SOLVED' : 'CASE CLOSED'}</p><small>DAILY REDACTED · RANKED</small>
    <h1>{daily.displayAnswer}</h1><p>{daily.status === 'won' ? 'Identity confirmed. The points are on the weekly board.' : `The concealed player was ${daily.answer.displayName}.`}</p>
    <strong className="points">+{daily.score} pts</strong>
    <div className="daily-result-actions"><button className="primary dark" onClick={onNext}>Play next daily game <ArrowRight/></button><button onClick={onHome}><Home/> Finish later / Return home</button></div>
  </div>

  return <div className="game-page redacted-page">
    <div className="game-heading"><p className="eyebrow redacted">TODAY’S REDACTED</p><p className="ranked-pill">RANKED</p></div>
    <div className="redacted-scorekey"><span><b>100</b> start</span><i/><span><b>−12</b> strike</span><i/><span><b>−10</b> evidence</span></div>
    <h1>Uncover the Name</h1><p className="game-intro">Everyone gets the same blacked-out player. Lift the ink before six strikes.</p>
    <PracticeTimer timeLeft={timeLeft}/>
    <section className="redacted-evidence" aria-label="Daily evidence">
      <div className="evidence-heading"><span><Eye/></span><div><h2>Evidence</h2><small>UNLOCKS AT 2 / 4 STRIKES · −10 TO OPEN</small></div></div>
      {daily.evidence.map((evidence, index) => <button key={index} disabled={!evidence.available || busy} className={evidence.open ? 'open' : evidence.available ? 'available' : 'locked'} onClick={() => run(() => openDailyRedactedEvidence(identity, index))}>
        <span className="evidence-seal">{evidence.open ? <ShieldCheck/> : evidence.available ? <Eye/> : <FileLock2/>}</span>
        <span className="evidence-copy"><small>FILE 0{index + 1}</small><strong>{evidence.value || (evidence.available ? 'UNSEAL EVIDENCE' : 'SEALED')}</strong><em>{evidence.open ? 'Verified clue' : evidence.available ? 'Tap to open · −10' : `${index ? 4 : 2} strikes to unlock`}</em></span>
      </button>)}
    </section>
    <section className="redacted-dossier"><div className="confidential-row"><FileLock2/><span>CONFIDENTIAL</span><small>{daily.date}</small></div>
      <div className="redacted-nameplate">{daily.slots.map(slot => slot.kind === 'separator' ? <span className="name-separator" key={slot.id}>{slot.character}</span> : <span className={`name-letter ${slot.revealed ? 'revealed' : ''}`} key={slot.id}>{slot.character}</span>)}</div>
      <div className="strike-heading"><span><b>STRIKE LEDGER</b><small>Wrong letter or suspect = 1 strike</small></span><strong>{6 - daily.wrongAttempts} LEFT</strong></div>
      <div className="strike-row">{Array.from({ length: 6 }, (_, index) => <span className={index < daily.wrongAttempts ? 'used' : ''} key={index}><small>{index + 1}</small>{index < daily.wrongAttempts ? <X/> : <i/>}</span>)}</div>
    </section>
    {error && <p className="inline-error">{error}</p>}
    <RedactedKeyboard guessedLetters={daily.guessedLetters} correctLetters={daily.guessedLetters.filter(letter => daily.slots.some(slot => slot.character === letter))} disabled={busy} onGuess={letter => run(() => submitDailyRedactedLetter(identity, letter))}/>
    <button className="redacted-search-toggle" onClick={() => setShowSearch(value => !value)}><Search/> Name the Suspect</button>
    {showSearch && <PlayerSearch excludedIds={daily.guesses} onSelect={player => run(() => submitDailyRedactedGuess(identity, player.id))} pool={fc27Players}/>} 
  </div>
}

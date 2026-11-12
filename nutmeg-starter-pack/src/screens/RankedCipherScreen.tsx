import { ArrowRight, Fingerprint, Home, Lightbulb, LoaderCircle, LockKeyhole, Send, ShieldCheck, WifiOff } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { getDailyCipher, openDailyCipherHint, startDailyCipher, submitDailyCipherGuess, type RankedCipherState, type RankedIdentity } from '../api/ranked'
import { PlayerPortrait } from '../components/PlayerPortrait'
import { PracticeTimer } from '../components/PracticeTimer'
import { useDeadlineTimer } from '../hooks/useDeadlineTimer'

export function RankedCipherScreen({ identity, onNext, onHome }: { identity: RankedIdentity; onNext: () => void; onHome: () => void }) {
  const [daily, setDaily] = useState<RankedCipherState | null>(null)
  const [guess, setGuess] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { startDailyCipher(identity).then(setDaily).catch(caught => setError(caught instanceof Error ? caught.message : 'Daily Cipher is unavailable.')) }, [identity])
  const timeLeft = useDeadlineTimer(daily?.status === 'playing' ? daily.deadlineAt : undefined, () => { getDailyCipher(identity).then(setDaily).catch(() => undefined) })
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!guess.trim() || busy) return
    setBusy(true); setError('')
    try { setDaily(await submitDailyCipherGuess(identity, guess)); setGuess(''); (document.activeElement as HTMLElement | null)?.blur() } catch (caught) { setError(caught instanceof Error ? caught.message : 'That reading was rejected.') } finally { setBusy(false) }
  }
  const openHint = async (index: number) => {
    if (busy) return
    setBusy(true); setError('')
    try { setDaily(await openDailyCipherHint(identity, index)) } catch (caught) { setError(caught instanceof Error ? caught.message : 'That evidence seal would not open.') } finally { setBusy(false) }
  }
  if (error && !daily) return <section className="ranked-unavailable"><WifiOff/><h1>Today’s cipher is jammed.</h1><p>{error}</p></section>
  if (!daily) return <div className="ranked-loading"><LoaderCircle className="spin"/> Intercepting today’s name…</div>
  const complete = daily.status === 'won' || daily.status === 'lost'
  if (complete && daily.answer) return <div className={`cipher-result ${daily.status}`}><div className="cipher-result-art"><PlayerPortrait player={daily.answer} size="hero"/></div><p className="result-stamp">{daily.status === 'won' ? 'CIPHER CRACKED' : 'CODE UNBROKEN'}</p><small>DAILY CIPHER · RANKED</small><h1>{daily.displayAnswer}</h1><p>{daily.status === 'won' ? 'Identity confirmed. Your points are on the weekly board.' : `The scrambled player was ${daily.answer.displayName}.`}</p><strong className="points">+{daily.score} pts</strong><div className="daily-result-actions"><button className="primary dark" onClick={onNext}>Play next daily game <ArrowRight/></button><button onClick={onHome}><Home/> Finish later / Return home</button></div></div>
  return <div className="game-page cipher-page">
    <div className="game-heading"><p className="eyebrow cipher">TODAY’S CIPHER</p><p className="ranked-pill">RANKED</p></div><h1>Unscramble the Name</h1><p className="game-intro">One shared name. Four attempts. Optional evidence unlocks after misses and costs 10 points to open.</p><PracticeTimer timeLeft={timeLeft}/>
    <section className="cipher-board"><div className="cipher-file"><Fingerprint/><span>INTERCEPTED NAME</span><small>{daily.date}</small></div><div className="cipher-tiles">{daily.scrambled.map((letter, index) => <span key={`${letter}-${index}`}>{letter}</span>)}</div><small>{daily.scrambled.length} LETTERS · SPACES REMOVED</small></section>
    <div className="cipher-clues" aria-label="Optional evidence">{daily.hints.map((hint, index) => <button key={index} className={hint.open ? 'revealed' : hint.available ? 'available' : 'locked'} disabled={!hint.available || hint.open || busy} onClick={() => openHint(index)}>{hint.open ? <ShieldCheck/> : hint.available ? <Lightbulb/> : <LockKeyhole/>}<small>{index === 0 ? 'NATION' : 'CLUB'}</small><b>{hint.value || (hint.available ? 'UNSEAL · −10' : `AFTER ${index === 0 ? 2 : 3} MISSES`)}</b></button>)}</div>
    <div className="cipher-attempts"><span>{4 - daily.attemptsUsed} attempts left</span><div>{Array.from({ length: 4 }, (_, index) => <i className={index < daily.attemptsUsed ? 'used' : ''} key={index}/>)}</div></div>
    {error && <p className="inline-error">{error}</p>}
    <form className="cipher-form" onSubmit={submit}><label><span className="sr-only">Unscrambled player name</span><input value={guess} onChange={event => setGuess(event.target.value)} placeholder="Type the player name…"/></label><button disabled={!guess.trim() || busy}><Send/> Submit</button></form>
    {daily.guesses.length > 0 && <div className="cipher-misses"><small>REJECTED READS</small>{daily.guesses.map(value => <span key={value}>{value}</span>)}</div>}
  </div>
}

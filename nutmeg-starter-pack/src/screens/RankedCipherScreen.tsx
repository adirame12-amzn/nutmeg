import { Fingerprint, Lightbulb, LoaderCircle, Send, ShieldCheck, WifiOff } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { getDailyCipher, submitDailyCipherGuess, type RankedCipherState, type RankedIdentity } from '../api/ranked'
import { PlayerPortrait } from '../components/PlayerPortrait'

export function RankedCipherScreen({ identity }: { identity: RankedIdentity }) {
  const [daily, setDaily] = useState<RankedCipherState | null>(null)
  const [guess, setGuess] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { getDailyCipher(identity).then(setDaily).catch(caught => setError(caught instanceof Error ? caught.message : 'Daily Cipher is unavailable.')) }, [identity])
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!guess.trim() || busy) return
    setBusy(true); setError('')
    try { setDaily(await submitDailyCipherGuess(identity, guess)); setGuess(''); (document.activeElement as HTMLElement | null)?.blur() } catch (caught) { setError(caught instanceof Error ? caught.message : 'That reading was rejected.') } finally { setBusy(false) }
  }
  if (error && !daily) return <section className="ranked-unavailable"><WifiOff/><h1>Today’s cipher is jammed.</h1><p>{error}</p></section>
  if (!daily) return <div className="ranked-loading"><LoaderCircle className="spin"/> Intercepting today’s name…</div>
  const complete = daily.status === 'won' || daily.status === 'lost'
  if (complete && daily.answer) return <div className={`cipher-result ${daily.status}`}><div className="cipher-result-art"><PlayerPortrait player={daily.answer} size="hero"/></div><p className="result-stamp">{daily.status === 'won' ? 'CIPHER CRACKED' : 'CODE UNBROKEN'}</p><small>DAILY CIPHER · RANKED</small><h1>{daily.displayAnswer}</h1><p>{daily.status === 'won' ? 'Identity confirmed. Your points are on the weekly board.' : `The scrambled player was ${daily.answer.displayName}.`}</p><strong className="points">+{daily.score} pts</strong></div>
  return <div className="game-page cipher-page">
    <div className="game-heading"><p className="eyebrow cipher">TODAY’S CIPHER</p><p className="ranked-pill">RANKED</p></div><h1>Unscramble the Name</h1><p className="game-intro">One shared name. Four attempts. Nation appears after two misses; club after three.</p>
    <section className="cipher-board"><div className="cipher-file"><Fingerprint/><span>INTERCEPTED NAME</span><small>{daily.date}</small></div><div className="cipher-tiles">{daily.scrambled.map((letter, index) => <span key={`${letter}-${index}`}>{letter}</span>)}</div><small>{daily.scrambled.length} LETTERS · SPACES REMOVED</small></section>
    <div className="cipher-clues"><span className={daily.nation ? 'revealed' : ''}>{daily.nation ? <ShieldCheck/> : <Lightbulb/>}<small>NATION</small><b>{daily.nation || 'AFTER 2 MISSES'}</b></span><span className={daily.club ? 'revealed' : ''}>{daily.club ? <ShieldCheck/> : <Lightbulb/>}<small>CLUB</small><b>{daily.club || 'AFTER 3 MISSES'}</b></span></div>
    <div className="cipher-attempts"><span>{4 - daily.attemptsUsed} attempts left</span><div>{Array.from({ length: 4 }, (_, index) => <i className={index < daily.attemptsUsed ? 'used' : ''} key={index}/>)}</div></div>
    {error && <p className="inline-error">{error}</p>}
    <form className="cipher-form" onSubmit={submit}><label><span className="sr-only">Unscrambled player name</span><input value={guess} onChange={event => setGuess(event.target.value)} placeholder="Type the player name…"/></label><button disabled={!guess.trim() || busy}><Send/> Submit</button></form>
    {daily.guesses.length > 0 && <div className="cipher-misses"><small>REJECTED READS</small>{daily.guesses.map(value => <span key={value}>{value}</span>)}</div>}
  </div>
}

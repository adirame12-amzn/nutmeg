import { ArrowRight, Home, LoaderCircle, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getDailyOverlap, startDailyOverlap, submitDailyOverlapGuess, type RankedIdentity, type RankedOverlapState } from '../api/ranked'
import { PlayerPortrait } from '../components/PlayerPortrait'
import { PlayerSearch } from '../components/PlayerSearch'
import { PracticeTimer } from '../components/PracticeTimer'
import { fc27Players } from '../data/fc27Players'
import { canonicalCountryId, type OverlapEvidence } from '../domain/overlap'
import type { Player } from '../domain/types'
import { useDeadlineTimer } from '../hooks/useDeadlineTimer'
import { EvidenceCard } from './OverlapScreen'

export function RankedOverlapScreen({ identity, onNext, onHome }: { identity: RankedIdentity; onNext: () => void; onHome: () => void }) {
  const [daily, setDaily] = useState<RankedOverlapState | null>(null)
  const [selected, setSelected] = useState<Player | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { startDailyOverlap(identity).then(setDaily).catch(caught => setError(caught instanceof Error ? caught.message : 'Daily Overlap is unavailable.')) }, [identity])
  const timeLeft = useDeadlineTimer(daily?.status === 'playing' ? daily.deadlineAt : undefined, () => { getDailyOverlap(identity).then(setDaily).catch(() => undefined) })
  const evidence = useMemo<OverlapEvidence[]>(() => (daily?.clues || []).map((clue, index) => ({
    id: clue.wikidataClubId || clue.clubId || canonicalCountryId(clue.name), name: clue.name,
    kind: index === 1 ? 'country' : 'club', crestUrl: clue.crestUrl, flag: index === 1 ? '⚑' : undefined,
  })), [daily])

  if (error && !daily) return <section className="ranked-unavailable"><h1>Today’s connections are offline.</h1><p>{error}</p><button onClick={onHome}>Return home</button></section>
  if (!daily) return <div className="ranked-loading"><LoaderCircle className="spin"/> Opening today’s Overlap…</div>
  const complete = daily.status === 'won' || daily.status === 'lost'
  if (complete) return <div className={`overlap-result ${daily.status === 'won' ? 'perfect' : ''}`}>
    <p className="result-stamp">{daily.status === 'won' ? 'FULL HOUSE' : daily.selected ? 'CASE CLOSED' : 'TIME’S UP'}</p>
    {daily.selected && <div className="overlap-result-player"><PlayerPortrait player={daily.selected} size="hero"/><span><small>YOUR ONE SHOT</small><h1>{daily.selected.displayName}</h1></span></div>}
    <div className="overlap-evidence-grid result">{evidence.map((item, index) => <EvidenceCard key={item.id} evidence={item} verdict={daily.verdicts?.[index]}/>)}</div>
    <div className="overlap-score"><strong>{daily.matches}/3 CONNECTIONS</strong><b>{daily.score}</b><small>POINTS</small></div>
    {daily.answer && <p className="overlap-reveal">Perfect fit: <strong>{daily.answer.displayName}</strong> · verified club snapshot {daily.sourceSnapshot}</p>}
    <div className="daily-result-actions"><button className="primary dark" onClick={onNext}>Complete today’s edition <ArrowRight/></button><button onClick={onHome}><Home/> Finish later / Return home</button></div>
  </div>

  const lockIn = async () => {
    if (!selected || busy) return
    setBusy(true); setError('')
    try { setDaily(await submitDailyOverlapGuess(identity, selected.id)) } catch (caught) { setError(caught instanceof Error ? caught.message : 'That answer could not be filed.') } finally { setBusy(false) }
  }
  return <div className="game-page overlap-page">
    <div className="game-heading"><p className="eyebrow overlap">TODAY’S OVERLAP</p><p className="ranked-pill">RANKED</p></div>
    <h1>Three clues. One shot.</h1><p className="game-intro">Two clubs. One country in the centre. Find the footballer who connects as many as possible.</p>
    <div className="overlap-venn" aria-hidden="true"><i/><i/><i/><b>?</b></div>
    <div className="overlap-evidence-grid">{evidence.map(item => <EvidenceCard key={item.id} evidence={item}/>)}</div>
    <PracticeTimer timeLeft={timeLeft}/>
    <p className="overlap-scorekey"><b>0</b> none <i/> <b>10</b> one <i/> <b>40</b> two <i/> <b>100</b> full house</p>
    <PlayerSearch excludedIds={[]} onSelect={setSelected} pool={fc27Players}/>
    {selected ? <div className="overlap-selected"><PlayerPortrait player={selected} size="card"/><span><small>SELECTED — MATCHES STILL SEALED</small><strong>{selected.displayName}</strong><em>{selected.currentClub} · {selected.nationalTeam}</em></span><button onClick={() => setSelected(null)} aria-label="Clear selected player"><X/></button></div> : <p className="overlap-empty">Search the case-file catalogue, then make your one shot count.</p>}
    {error && <p className="inline-error">{error}</p>}<button className="overlap-lock" disabled={!selected || busy} onClick={lockIn}>LOCK IN ANSWER</button>
  </div>
}

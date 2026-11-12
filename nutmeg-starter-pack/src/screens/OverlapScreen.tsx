import { Check, Home, RotateCcw, Share2, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import type { Screen } from '../components/Chrome'
import { PlayerPortrait } from '../components/PlayerPortrait'
import { PlayerSearch } from '../components/PlayerSearch'
import { PracticeStartGate, PracticeTimer } from '../components/PracticeTimer'
import { fc27Players } from '../data/fc27Players'
import { getRandomOverlapPuzzle, overlapClubIdsByPlayer } from '../data/overlap'
import { markPracticeComplete } from '../data/practiceProgress'
import { evaluateOverlap, type OverlapEvidence, type OverlapResult } from '../domain/overlap'
import type { Player } from '../domain/types'
import { PRACTICE_DURATION_MS, usePracticeTimer } from '../hooks/usePracticeTimer'

const LAST_OVERLAP_KEY = 'player-press-last-overlap-puzzle'

export function EvidenceCard({ evidence, verdict }: { evidence: OverlapEvidence; verdict?: boolean }) {
  return <article className={`overlap-evidence ${verdict === undefined ? '' : verdict ? 'match' : 'miss'}`}>
    <span className="overlap-evidence-mark">{evidence.kind === 'club' && evidence.crestUrl ? <img src={evidence.crestUrl} alt=""/> : <b>{evidence.flag || '⚑'}</b>}</span>
    <small>{evidence.kind === 'club' ? 'PLAYED FOR' : 'REPRESENTS'}</small>
    <strong>{evidence.name}</strong>
    {verdict !== undefined && <em>{verdict ? <Check/> : <X/>}{verdict ? 'MATCH' : 'NO MATCH'}</em>}
  </article>
}

export function OverlapScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [puzzle, setPuzzle] = useState(() => getRandomOverlapPuzzle(sessionStorage.getItem(LAST_OVERLAP_KEY) || undefined))
  const [phase, setPhase] = useState<'ready' | 'playing' | 'result'>('ready')
  const [selected, setSelected] = useState<Player | null>(null)
  const [result, setResult] = useState<OverlapResult | null>(null)
  const startedRef = useRef(0)
  const evidence = useMemo(() => [puzzle.clubA, puzzle.country, puzzle.clubB], [puzzle])
  const expire = () => {
    const timedOut = evaluateOverlap(puzzle, null, new Set())
    setResult({ ...timedOut, elapsedMs: PRACTICE_DURATION_MS })
    markPracticeComplete('overlap')
    setPhase('result')
  }
  const timer = usePracticeTimer(phase === 'playing', expire)

  const start = () => {
    const now = performance.now()
    startedRef.current = now
    timer.start()
    setSelected(null); setResult(null); setPhase('playing')
  }

  const lockIn = () => {
    if (!selected || phase !== 'playing') return
    const now = performance.now()
    if (timer.expired()) { expire(); return }
    const evaluated = evaluateOverlap(puzzle, selected, overlapClubIdsByPlayer.get(selected.id) || new Set())
    setResult({ ...evaluated, elapsedMs: now - startedRef.current })
    markPracticeComplete('overlap')
    setPhase('result')
  }

  const playAgain = () => {
    const next = getRandomOverlapPuzzle(puzzle.id)
    sessionStorage.setItem(LAST_OVERLAP_KEY, next.id)
    timer.reset()
    setPuzzle(next); setPhase('ready'); setSelected(null); setResult(null)
  }

  const share = async () => {
    if (!result) return
    const text = `Player Press — The Overlap\n${result.timedOut ? 'Time’s up' : `${result.matches}/3 · ${result.points} points`}\n⬤ ⬤ ⬤`
    if (navigator.share) await navigator.share({ text }).catch(() => undefined)
    else await navigator.clipboard?.writeText(text)
  }

  if (phase === 'result' && result) {
    const perfect = fc27Players.find(player => puzzle.perfectPlayerIds.includes(player.id))
    return <div className={`overlap-result ${result.matches === 3 ? 'perfect' : ''}`}>
      <p className="result-stamp">{result.timedOut ? 'TIME’S UP — NO ANSWER FILED' : 'CASE CLOSED'}</p>
      {result.player && <div className="overlap-result-player"><PlayerPortrait player={result.player} size="hero"/><span><small>YOUR ONE SHOT</small><h1>{result.player.displayName}</h1></span></div>}
      <div className="overlap-evidence-grid result">{result.verdicts.map(verdict => <EvidenceCard key={verdict.evidence.id} evidence={verdict.evidence} verdict={verdict.match}/>)}</div>
      <div className="overlap-score"><strong>{result.timedOut ? 'NO FILE' : result.matches === 3 ? 'FULL HOUSE — 3/3' : `${result.matches}/3 CONNECTIONS`}</strong><b>{result.points}</b><small>POINTS</small></div>
      {perfect && <p className="overlap-reveal">Perfect fit: <strong>{perfect.displayName}</strong> · verified club snapshot {puzzle.sourceSnapshot}</p>}
      <button className="primary dark" onClick={playAgain}><RotateCcw/> Play again</button>
      <button onClick={share}><Share2/> Share result</button>
      <button onClick={() => onNavigate('home')}><Home/> Return to Cold Cases</button>
    </div>
  }

  return <div className="game-page overlap-page">
    <div className="game-heading"><p className="eyebrow overlap">THE OVERLAP</p><p className="demo-pill">COLD CASE · PRACTICE</p></div>
    <h1>Three clues. One shot.</h1>
    <p className="game-intro">Two clubs. One country. Find the footballer who connects as many as possible.</p>
    <div className="overlap-venn" aria-hidden="true"><i/><i/><i/><b>?</b></div>
    {phase === 'ready' ? <PracticeStartGate onStart={start}/> : <>
      <div className="overlap-evidence-grid">{evidence.map(item => <EvidenceCard key={item.id} evidence={item}/>)}</div>
      <PracticeTimer timeLeft={timer.timeLeft}/>
      <p className="overlap-scorekey"><b>0</b> none <i/> <b>10</b> one <i/> <b>40</b> two <i/> <b>100</b> full house</p>
      <PlayerSearch excludedIds={[]} onSelect={setSelected} pool={fc27Players}/>
      {selected ? <div className="overlap-selected"><PlayerPortrait player={selected} size="card"/><span><small>SELECTED — MATCHES STILL SEALED</small><strong>{selected.displayName}</strong><em>{selected.currentClub} · {selected.nationalTeam}</em></span><button onClick={() => setSelected(null)} aria-label="Clear selected player"><X/></button></div> : <p className="overlap-empty">Search the full case-file catalogue, then make your one shot count.</p>}
      <button className="overlap-lock" disabled={!selected} onClick={lockIn}>LOCK IN ANSWER</button>
    </>}
  </div>
}

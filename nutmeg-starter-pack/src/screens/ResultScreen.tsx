import { Home, RotateCcw, Share2, Trophy } from 'lucide-react'
import { useEffect } from 'react'
import type { Screen } from '../components/Chrome'
import { CareerGrid } from '../components/CareerGrid'
import type { ResultPayload } from './LineupScreen'

export function ResultScreen({ result, onNavigate }: { result: ResultPayload | null, onNavigate: (screen: Screen) => void }) {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }) }, [result])
  if (!result) return <div className="result-page empty"><Trophy/><h1>No case report yet</h1><p>Open a case to build your report.</p><button className="primary" onClick={() => onNavigate('lineup')}>Play Prime Suspect</button></div>

  const share = async () => {
    const guessLimit = result.mode === 'mystery' ? 3 : 6
    const gameName = result.mode === 'lineup' ? 'PRIME SUSPECT' : result.mode === 'mystery' ? 'COLD CASE' : 'PAPER TRAIL · CASE 03'
    const text = `PLAYER PRESS // ${gameName}${result.date ? ` // ${result.date}` : ''}\n${result.won ? 'Case closed' : 'Case unsolved'} · ${result.guesses}/${guessLimit} suspects · ${result.score} pts\n${result.ranked ? 'Daily ranked case' : 'Practice file'} — no spoilers.`
    if (navigator.share) await navigator.share({ title: 'My Player Press case report', text })
    else await navigator.clipboard?.writeText(text)
  }
  const replayScreen: Screen = result.ranked && result.mode === 'paper-trail' ? 'ranked-paper-trail' : result.mode

  return (
    <div className={`result-page ${result.won ? 'won' : 'lost'} ${result.mode === 'paper-trail' ? 'paper-trail-result' : ''}`}>
      {result.portraitUrl && (result.won || result.mode === 'paper-trail') ? <div className={`result-player-art ${result.portraitUrl.includes('/cutouts-editorial/') ? 'has-cutout' : ''}`} aria-hidden="true"><span/><img src={result.portraitUrl} alt="" /></div> : <div className="result-burst" aria-hidden="true"><span>{result.won ? '✓' : '×'}</span></div>}
      <p className="result-stamp">{result.won ? 'CASE CLOSED' : 'CASE UNSOLVED'}</p>
      <small>{result.mode === 'lineup' ? 'PRIME SUSPECT' : result.mode === 'mystery' ? 'COLD CASE' : 'PAPER TRAIL'} · CASE REPORT</small>
      <h1>{result.answer}</h1>
      {result.nationality && <p className="result-nationality">{result.nationality}</p>}
      {result.clubs && <div className="result-career-grid"><CareerGrid clubs={result.clubs} revealedCount={result.clubs.length} revealAll /></div>}
      <div className="result-stats">
        {result.clues !== undefined && <span><b>{result.clues}</b><small>clues</small></span>}
        {result.questions !== undefined && <span><b>{result.questions}</b><small>questions</small></span>}
        <span><b>{result.guesses}</b><small>suspects</small></span>
      </div>
      <strong className="points">+{result.score} pts</strong>
      <button className="primary dark" onClick={share}><Share2/> Share without spoilers</button>
      <button onClick={() => onNavigate(replayScreen)}><RotateCcw/> {result.ranked ? 'Review today’s case' : result.mode === 'paper-trail' ? 'Open another trail' : 'Reopen this case'}</button>
      <button className="text-button" onClick={() => onNavigate('home')}><Home/> Back to today’s cases</button>
    </div>
  )
}

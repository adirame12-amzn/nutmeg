import { Home, RotateCcw, Share2, Trophy } from 'lucide-react'
import type { Screen } from '../components/Chrome'
import type { ResultPayload } from './LineupScreen'

export function ResultScreen({ result, onNavigate }: { result: ResultPayload | null, onNavigate: (screen: Screen) => void }) {
  if (!result) return <div className="result-page empty"><Trophy/><h1>No case report yet</h1><p>Open a case to build your report.</p><button className="primary" onClick={() => onNavigate('lineup')}>Play Prime Suspect</button></div>

  const share = async () => {
    const guessLimit = result.mode === 'lineup' ? 6 : 3
    const text = `PLAYER PRESS // ${result.mode === 'lineup' ? 'PRIME SUSPECT' : 'COLD CASE'}${result.date ? ` // ${result.date}` : ''}\n${result.won ? 'Case closed' : 'Case unsolved'} · ${result.guesses}/${guessLimit} suspects · ${result.score} pts\n${result.ranked ? 'Daily ranked case' : 'Quick case'} — no spoilers.`
    if (navigator.share) await navigator.share({ title: 'My Player Press case report', text })
    else await navigator.clipboard?.writeText(text)
  }

  return (
    <div className={`result-page ${result.won ? 'won' : 'lost'}`}>
      {result.portraitUrl && result.won ? <div className={`result-player-art ${result.portraitUrl.includes('/cutouts-editorial/') ? 'has-cutout' : ''}`} aria-hidden="true"><span/><img src={result.portraitUrl} alt="" /></div> : <div className="result-burst" aria-hidden="true"><span>{result.won ? '✓' : '×'}</span></div>}
      <p className="result-stamp">{result.won ? 'CASE CLOSED' : 'CASE UNSOLVED'}</p>
      <small>{result.mode === 'lineup' ? 'PRIME SUSPECT' : 'COLD CASE'} · CASE REPORT</small>
      <h1>{result.answer}</h1>
      <div className="result-stats">
        {result.clues !== undefined && <span><b>{result.clues}</b><small>clues</small></span>}
        {result.questions !== undefined && <span><b>{result.questions}</b><small>questions</small></span>}
        <span><b>{result.guesses}</b><small>suspects</small></span>
      </div>
      <strong className="points">+{result.score} pts</strong>
      <button className="primary dark" onClick={share}><Share2/> Share without spoilers</button>
      <button onClick={() => onNavigate(result.mode)}><RotateCcw/> {result.ranked ? 'Review today’s case' : 'Reopen this case'}</button>
      <button className="text-button" onClick={() => onNavigate('home')}><Home/> Back to today’s cases</button>
    </div>
  )
}

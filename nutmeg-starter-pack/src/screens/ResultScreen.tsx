import { Home, RotateCcw, Share2, Trophy } from 'lucide-react'
import type { Screen } from '../components/Chrome'
import type { ResultPayload } from './LineupScreen'

export function ResultScreen({ result, onNavigate }: { result: ResultPayload | null, onNavigate: (screen: Screen) => void }) {
  if (!result) return <div className="result-page empty"><Trophy/><h1>No result yet</h1><p>Play a game to make your matchday card.</p><button className="primary" onClick={() => onNavigate('lineup')}>Play The Lineup</button></div>

  const share = async () => {
    const guessLimit = result.mode === 'lineup' ? 6 : 3
    const text = `NUTMEG // ${result.mode === 'lineup' ? 'THE LINEUP' : 'THE MYSTERY'}\n${result.won ? 'Solved' : 'Unsolved'} · ${result.guesses}/${guessLimit} guesses · ${result.score} pts\nDemo puzzle — no spoilers.`
    if (navigator.share) await navigator.share({ title: 'My Nutmeg result', text })
    else await navigator.clipboard?.writeText(text)
  }

  return (
    <div className={`result-page ${result.won ? 'won' : 'lost'}`}>
      {result.portraitUrl && result.won ? <div className={`result-player-art ${result.portraitUrl.includes('/cutouts-editorial/') ? 'has-cutout' : ''}`} aria-hidden="true"><span/><img src={result.portraitUrl} alt="" /></div> : <div className="result-burst" aria-hidden="true"><span>{result.won ? '✓' : '×'}</span></div>}
      <p className="result-stamp">{result.won ? 'CORRECT!' : 'FULL TIME'}</p>
      <small>{result.mode === 'lineup' ? 'THE LINEUP' : 'THE MYSTERY'} · DEMO</small>
      <h1>{result.answer}</h1>
      <div className="result-stats">
        {result.clues !== undefined && <span><b>{result.clues}</b><small>clues</small></span>}
        {result.questions !== undefined && <span><b>{result.questions}</b><small>questions</small></span>}
        <span><b>{result.guesses}</b><small>guesses</small></span>
      </div>
      <strong className="points">+{result.score} pts</strong>
      <button className="primary dark" onClick={share}><Share2/> Share without spoilers</button>
      <button onClick={() => onNavigate(result.mode)}><RotateCcw/> Replay demo</button>
      <button className="text-button" onClick={() => onNavigate('home')}><Home/> Back to today’s games</button>
    </div>
  )
}

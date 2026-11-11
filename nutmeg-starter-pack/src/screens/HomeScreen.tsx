import { ArrowRight, Flame, LockKeyhole, Sparkles } from 'lucide-react'
import type { Screen } from '../components/Chrome'

function GameTicket({ mystery = false }: { mystery?: boolean }) {
  return (
    <span className={`ticket-icon ${mystery ? 'mystery-ticket' : 'lineup-ticket'}`} aria-hidden="true">
      <span className="ticket-sheet">
        {mystery ? <b>?</b> : (
          <svg viewBox="0 0 48 58"><path d="M10 9h28v40H10z"/><circle cx="18" cy="19" r="2.5"/><circle cx="31" cy="16" r="2.5"/><circle cx="24" cy="30" r="2.5"/><circle cx="16" cy="41" r="2.5"/><circle cx="34" cy="40" r="2.5"/><path d="m19 20 4 8m3-1 4-9m-5 14-7 7m9-7 6 6"/></svg>
        )}
      </span>
    </span>
  )
}

export function HomeScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  return (
    <div className="home-page">
      <section className="home-hero">
        <div><p className="edition">EDITION № 001 · DEMO</p><h1>Today’s<br/><em>Games</em></h1><p>Pick your challenge. Trust your football instincts.</p></div>
        <div className="hero-player" aria-hidden="true"><span>10</span></div>
      </section>

      <section className="game-tiles" aria-label="Daily games">
        <button className="game-tile orange" onClick={() => onNavigate('lineup')}>
          <GameTicket />
          <span><small>GAME 01 · 6 GUESSES</small><strong>THE LINEUP</strong><em>Guess. Compare the cards. Close in on the hidden footballer.</em></span>
          <ArrowRight className="tile-arrow" />
        </button>
        <button className="game-tile blue" onClick={() => onNavigate('mystery')}>
          <GameTicket mystery />
          <span><small>GAME 02 · 3 CLUES</small><strong>THE MYSTERY</strong><em>Three clues. Three questions. One player to unmask.</em></span>
          <ArrowRight className="tile-arrow" />
        </button>
      </section>

      <section className="streak-strip">
        <span><Flame size={21} /> <strong>4 day streak</strong></span><span>Local demo <ArrowRight size={16} /></span>
      </section>
      <aside className="demo-note pool-note">
        <Sparkles size={18}/>
        <div>
          <strong>96-player prototype pool · FC 27 OVR 85–91</strong>
          <p>EA FC Analysis source snapshot · 12 Sep 2026. Licence and 2026 eligibility review pending.</p>
          <button onClick={() => onNavigate('credits')}>Sources, methodology &amp; portrait credits <ArrowRight size={14}/></button>
        </div>
      </aside>
      <p className="local-note">The Mystery uses fictional demo clues. Progress stays on this device.</p>
      <div className="coming-soon"><LockKeyhole size={18} /><span><strong>Friends league</strong> is a visual demo for now. Shared scores come after server validation.</span></div>
    </div>
  )
}

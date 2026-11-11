import { ArrowRight, Flame, HelpCircle, Layers3, LockKeyhole, Sparkles } from 'lucide-react'
import type { Screen } from '../components/Chrome'

export function HomeScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  return (
    <div className="home-page">
      <section className="home-hero">
        <div><p className="edition">EDITION № 001 · DEMO</p><h1>Today’s<br/><em>Games</em></h1><p>Two quick ways to prove your football brain.</p></div>
        <div className="hero-player" aria-hidden="true"><span>10</span></div>
      </section>

      <section className="game-tiles" aria-label="Daily games">
        <button className="game-tile orange" onClick={() => onNavigate('lineup')}>
          <span className="ticket-icon"><Layers3 /></span>
          <span><small>GAME 01 · PLAYABLE</small><strong>THE LINEUP</strong><em>Find today’s player from their profile.</em></span>
          <ArrowRight className="tile-arrow" />
        </button>
        <button className="game-tile blue" onClick={() => onNavigate('mystery')}>
          <span className="ticket-icon"><HelpCircle /></span>
          <span><small>GAME 02 · PLAYABLE</small><strong>THE MYSTERY</strong><em>A player, three clues, three questions.</em></span>
          <ArrowRight className="tile-arrow" />
        </button>
      </section>

      <section className="streak-strip">
        <span><Flame size={21} /> <strong>4 day streak</strong></span><span>Local demo <ArrowRight size={16} /></span>
      </section>
      <aside className="demo-note"><Sparkles size={18}/><p><strong>Prototype edition.</strong> Every player and club here is fictional. Your progress stays on this device.</p></aside>
      <div className="coming-soon"><LockKeyhole size={18} /><span><strong>Friends league</strong> is a visual demo for now. Shared scores come after server validation.</span></div>
    </div>
  )
}

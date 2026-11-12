import { ArrowLeftRight, Check, Clock3, LockKeyhole, Search, Zap } from 'lucide-react'

const clubs = [
  { name: 'Arsenal', crest: '/nutmeg/clubs/arsenal-f-c.svg', state: 'completed' },
  { name: 'Barcelona', crest: '/nutmeg/clubs/fc-barcelona.webp', state: 'active source' },
  { name: 'PSG', crest: '/nutmeg/clubs/paris-saint-germain-fc.svg', state: 'active target' },
  { name: 'Real Madrid', crest: '/nutmeg/clubs/real-madrid-club-de-futbol.svg', state: 'upcoming' },
] as const

export function WirePreviewScreen() {
  return (
    <div className="game-page wire-preview-page">
      <div className="game-heading"><p className="eyebrow wire">THE WIRE</p><p className="demo-pill">CONCEPT FILE · PRACTICE</p></div>
      <h1>Connect the Clubs</h1>
      <p className="game-intro">A first look at the 90-second connection game. Gameplay and route data are not active yet.</p>
      <aside className="wire-preview-note"><LockKeyhole/><span><strong>Mockup only</strong><small>No timer, score, answers or records are running on this screen.</small></span></aside>

      <div className="wire-scoreboard" aria-label="Example scoreboard"><span><b>00:58</b><small>TIME</small></span><span><b>1,450</b><small>SCORE</small></span><span><b>×4</b><small>COMBO</small></span></div>
      <section className="wire-graph" aria-label="Example vertical club connection">
        {clubs.map((club, index) => <div className="wire-step" key={club.name}>
          <article className={`wire-node ${club.state.replace(' ', '-')}`} aria-label={`${club.name}: ${club.state}`}>
            <img src={club.crest} alt=""/><strong>{club.name}</strong>
            {club.state === 'completed' && <span><Check/> DONE</span>}
            {club.state.startsWith('active') && <span><Zap/> ACTIVE</span>}
          </article>
          {index < clubs.length - 1 && <div className={`wire-edge ${index === 1 ? 'active' : index === 0 ? 'complete' : ''}`} aria-hidden="true">{index === 0 ? <Check/> : index === 1 ? <span>FIND LINK</span> : <i/>}</div>}
        </div>)}
      </section>

      <div className="wire-connect"><ArrowLeftRight/><span><small>CONNECT</small><strong>BARCELONA ↔ PSG</strong></span></div>
      <div className="wire-disabled-search"><Search/><span>Search a player…</span></div>
      <button className="wire-skip" disabled><Clock3/> SKIP · −10 SECONDS</button>
      <p className="wire-next-note">Next milestone: validate every route from the reviewed Paper Trail club graph before this becomes playable.</p>
    </div>
  )
}

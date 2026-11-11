import { ArrowRight, CalendarCheck, Flame, Sparkles, UserRoundCheck } from 'lucide-react'
import type { RankedIdentity } from '../api/ranked'
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

export function HomeScreen({ onNavigate, ranked, identity }: { onNavigate: (screen: Screen) => void; ranked: boolean; identity: RankedIdentity | null }) {
  return (
    <div className="home-page">
      <section className="home-hero">
        <div><p className="edition">CASEBOOK № 001 · DAILY</p><h1>Today’s<br/><em>Cases</em></h1><p>Every player leaves clues. Follow the evidence.</p></div>
        <div className="hero-player" aria-hidden="true"><span>10</span></div>
      </section>

      <section className="game-tiles" aria-label="Daily games">
        <button className="game-tile orange" onClick={() => onNavigate('lineup')}>
          <GameTicket />
          <span><small>CASE 01 · 6 SUSPECTS · {ranked ? 'RANKED' : 'QUICK CASE'}</small><strong>PRIME SUSPECT</strong><em>{ranked ? 'The same hidden player for everyone. Close the case in six.' : 'Name a suspect. Compare profiles. Track down the hidden player.'}</em></span>
          <ArrowRight className="tile-arrow" />
        </button>
        <button className="game-tile blue" onClick={() => onNavigate('mystery')}>
          <GameTicket mystery />
          <span><small>CASE 02 · 3 CLUES</small><strong>COLD CASE</strong><em>Study the evidence. Ask three questions. Crack the case.</em></span>
          <ArrowRight className="tile-arrow" />
        </button>
      </section>

      <section className="streak-strip">
        <span><Flame size={21} /> <strong>Daily case</strong></span><span>{ranked ? 'Resets 00:00 UTC' : 'Local quick play'} <ArrowRight size={16} /></span>
      </section>
      <aside className="demo-note pool-note">
        <Sparkles size={18}/>
        <div>
          <strong>96-player prototype pool · FC 27 OVR 85–91</strong>
          <p>EA FC Analysis source snapshot · 12 Sep 2026. Licence and 2026 eligibility review pending.</p>
          <button onClick={() => onNavigate('credits')}>Sources, methodology &amp; portrait credits <ArrowRight size={14}/></button>
        </div>
      </aside>
      <p className="local-note">Cold Case uses fictional demo evidence. Prime Suspect’s prototype data remains under publication review.</p>
      <button className="friends-status" onClick={() => onNavigate('leaderboard')}><span>{identity ? <UserRoundCheck/> : <CalendarCheck/>}<span><strong>{identity ? `@${identity.user.username}` : ranked ? 'Claim your detective name' : 'Ranked case desk not connected'}</strong><small>{ranked ? 'Server-validated points · weekly table' : 'Local games are unranked'}</small></span></span><ArrowRight/></button>
    </div>
  )
}

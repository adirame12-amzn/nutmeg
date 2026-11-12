import { ArrowRight, CalendarCheck, Clock3, Fingerprint, FolderOpen, Sparkles, Trophy, UserRoundCheck } from 'lucide-react'
import { useState } from 'react'
import type { RankedIdentity } from '../api/ranked'
import type { Screen } from '../components/Chrome'

function GameTicket({ mystery = false, trail = false }: { mystery?: boolean; trail?: boolean }) {
  return (
    <span className={`ticket-icon ${mystery ? 'mystery-ticket' : trail ? 'trail-ticket' : 'lineup-ticket'}`} aria-hidden="true">
      <span className="ticket-sheet">
        {mystery ? <b>?</b> : trail ? <b>03</b> : (
          <svg viewBox="0 0 48 58"><path d="M10 9h28v40H10z"/><circle cx="18" cy="19" r="2.5"/><circle cx="31" cy="16" r="2.5"/><circle cx="24" cy="30" r="2.5"/><circle cx="16" cy="41" r="2.5"/><circle cx="34" cy="40" r="2.5"/><path d="m19 20 4 8m3-1 4-9m-5 14-7 7m9-7 6 6"/></svg>
        )}
      </span>
    </span>
  )
}

export function HomeScreen({ onNavigate, onOpenPracticeLineup, ranked, identity }: { onNavigate: (screen: Screen) => void; onOpenPracticeLineup: () => void; ranked: boolean; identity: RankedIdentity | null }) {
  const [desk, setDesk] = useState<'daily' | 'practice'>('daily')

  return (
    <div className="home-page">
      <section className="home-hero">
        <div><p className="edition">CASEBOOK № 001 · DAILY</p><h1>Today’s<br/><em>Cases</em></h1><p>Every player leaves clues. Follow the evidence.</p></div>
        <div className="hero-player" aria-hidden="true"><span>10</span></div>
      </section>

      <div className="desk-switch" role="group" aria-label="Choose a case desk">
        <button className={desk === 'daily' ? 'active' : ''} onClick={() => setDesk('daily')} aria-pressed={desk === 'daily'}><CalendarCheck/><span><strong>Ranked Case</strong><small>Daily · shared</small></span></button>
        <button className={desk === 'practice' ? 'active' : ''} onClick={() => setDesk('practice')} aria-pressed={desk === 'practice'}><FolderOpen/><span><strong>Cold Cases</strong><small>Unlimited · unscored</small></span></button>
      </div>

      {desk === 'daily' ? <section className="case-desk daily-desk" aria-labelledby="daily-investigation-title">
        <div className="desk-heading">
          <span className="desk-seal"><CalendarCheck /></span>
          <span><small>ONE SHARED FILE · SCORED</small><h2 id="daily-investigation-title">Today’s Investigation</h2></span>
          <span className="mode-chip">RANKED</span>
        </div>
        <p>Everyone investigates the same player. Your best detective work goes onto the weekly table.</p>
        <button className="game-tile orange ranked-case" onClick={() => onNavigate('lineup')}>
          <GameTicket />
          <span><small>DAILY CASE · 6 SUSPECTS</small><strong>PRIME SUSPECT</strong><em>Close today’s shared case before the trail resets.</em></span>
          <ArrowRight className="tile-arrow" />
        </button>
        <div className={`desk-meta ${ranked ? '' : 'single'}`}>
          {ranked && <button onClick={() => onNavigate('lineup')}><Fingerprint /> <span><strong>{identity ? `Playing as @${identity.user.username}` : 'Claim your detective name'}</strong><small>{identity ? 'Identity saved in this browser' : 'No email or password needed'}</small></span></button>}
          <button onClick={() => onNavigate('leaderboard')} aria-label="Open weekly leaderboard"><Trophy /><span><strong>Weekly table</strong><small>Server-validated points</small></span><ArrowRight /></button>
        </div>
      </section> : null}

      {desk === 'practice' ? <section className="case-desk archive-desk" aria-labelledby="cold-cases-title">
        <div className="desk-heading">
          <span className="desk-seal"><FolderOpen /></span>
          <span><small>UNLIMITED · UNSCORED · LOCAL FILES</small><h2 id="cold-cases-title">Cold Cases</h2></span>
          <span className="mode-chip practice">PRACTICE</span>
        </div>
        <p>Reopen old files and sharpen your instincts. These local rounds never affect the leaderboard.</p>
        <div className="archive-games">
          <button className="archive-game orange" onClick={onOpenPracticeLineup}>
            <GameTicket /><span><small>RANDOM PLAYER</small><strong>Prime Suspect</strong><em>A fresh suspect every round.</em></span><ArrowRight />
          </button>
          <button className="archive-game" onClick={() => onNavigate('paper-trail')}>
            <GameTicket trail /><span><small>CASE 03 · 6 SUSPECTS</small><strong>Paper Trail</strong><em>Follow the clubs. Find the player.</em></span><ArrowRight />
          </button>
        </div>
        <div className="archive-foot"><Clock3 size={15}/><span>Play again whenever you like · no points recorded</span></div>
      </section> : null}
      <aside className="demo-note pool-note">
        <Sparkles size={18}/>
        <div>
          <strong>96-player prototype pool · FC 27 OVR 85–91</strong>
          <p>EA FC Analysis source snapshot · 12 Sep 2026. Licence and 2026 eligibility review pending.</p>
          <button onClick={() => onNavigate('credits')}>Sources, methodology &amp; portrait credits <ArrowRight size={14}/></button>
        </div>
      </aside>
      <p className="local-note">Cold Cases stay in your browser: no detective name, Worker request or leaderboard submission. Prototype data remains under publication review.</p>
      {identity && <button className="friends-status" onClick={() => onNavigate('leaderboard')}><span><UserRoundCheck/><span><strong>@{identity.user.username}</strong><small>View your weekly standing</small></span></span><ArrowRight/></button>}
    </div>
  )
}

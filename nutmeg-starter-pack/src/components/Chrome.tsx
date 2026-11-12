import { ArrowLeft, BarChart3, CircleUserRound, FileSearch, Home, Menu, ScanText, Trophy, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'

export type Screen = 'home' | 'lineup' | 'mystery' | 'paper-trail' | 'ranked-paper-trail' | 'redacted' | 'wire-preview' | 'leaderboard' | 'credits' | 'result'

export function AppHeader({ screen, onNavigate }: { screen: Screen, onNavigate: (screen: Screen) => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = (next: Screen) => { setMenuOpen(false); onNavigate(next) }

  return (
    <header className={`masthead ${screen === 'home' ? 'home-masthead' : ''}`}>
      <button className="icon-button" onClick={() => screen === 'home' ? setMenuOpen(open => !open) : navigate('home')} aria-label={screen === 'home' ? (menuOpen ? 'Close game menu' : 'Open game menu') : 'Back to home'} aria-expanded={screen === 'home' ? menuOpen : undefined}>
        {screen === 'home' ? menuOpen ? <X size={23} /> : <Menu size={24} /> : <ArrowLeft size={23} />}
      </button>
      <button className="wordmark" onClick={() => navigate('home')} aria-label="Player Press home"><span>PLAYER PRESS <i>//</i></span>{screen === 'home' && <small>EVERY PLAYER LEAVES CLUES</small>}</button>
      <button className="icon-button" onClick={() => navigate('leaderboard')} aria-label={screen === 'home' ? 'Open friends profile' : 'Demo leaderboard'}>{screen === 'home' ? <CircleUserRound size={24} /> : <BarChart3 size={22} />}</button>
      {screen === 'home' && menuOpen && (
        <nav className="masthead-menu" aria-label="Game menu">
          <button onClick={() => navigate('home')}><Home size={18}/> Today’s cases</button>
          <button onClick={() => navigate('lineup')}><span className="menu-ticket">6</span> Prime Suspect</button>
          <button onClick={() => navigate('paper-trail')}><FileSearch size={18}/> Paper Trail</button>
          <button onClick={() => navigate('redacted')}><ScanText size={18}/> Redacted</button>
          <button onClick={() => navigate('leaderboard')}><Trophy size={18}/> Friends league</button>
        </nav>
      )}
    </header>
  )
}

export function BottomNav({ active, onNavigate }: { active: Screen, onNavigate: (screen: Screen) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      <button className={active === 'home' ? 'active' : ''} onClick={() => onNavigate('home')}><Home size={19} /><span>Home</span></button>
      <button className={active === 'lineup' ? 'active' : ''} onClick={() => onNavigate('lineup')}><span className="nav-num">6</span><span>Suspect</span></button>
      <button className={active === 'paper-trail' || active === 'ranked-paper-trail' ? 'active' : ''} onClick={() => onNavigate('paper-trail')}><FileSearch size={19}/><span>Paper Trail</span></button>
      <button className={active === 'leaderboard' ? 'active' : ''} onClick={() => onNavigate('leaderboard')}><Trophy size={19} /><span>Friends</span></button>
    </nav>
  )
}

export function ScreenFrame({ screen, onNavigate, children, noNav = false }: { screen: Screen, onNavigate: (screen: Screen) => void, children: ReactNode, noNav?: boolean }) {
  return (
    <main className="app-shell">
      <AppHeader screen={screen} onNavigate={onNavigate} />
      <div className={noNav ? 'screen no-nav' : 'screen'}>{children}</div>
    </main>
  )
}

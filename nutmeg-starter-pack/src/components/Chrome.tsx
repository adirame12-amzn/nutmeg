import { ArrowLeft, BarChart3, CircleUserRound, Home, Menu, Trophy, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'

export type Screen = 'home' | 'lineup' | 'mystery' | 'leaderboard' | 'credits' | 'result'

export function AppHeader({ screen, onNavigate }: { screen: Screen, onNavigate: (screen: Screen) => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = (next: Screen) => { setMenuOpen(false); onNavigate(next) }

  return (
    <header className={`masthead ${screen === 'home' ? 'home-masthead' : ''}`}>
      <button className="icon-button" onClick={() => screen === 'home' ? setMenuOpen(open => !open) : navigate('home')} aria-label={screen === 'home' ? (menuOpen ? 'Close game menu' : 'Open game menu') : 'Back to home'} aria-expanded={screen === 'home' ? menuOpen : undefined}>
        {screen === 'home' ? menuOpen ? <X size={23} /> : <Menu size={24} /> : <ArrowLeft size={23} />}
      </button>
      <button className="wordmark" onClick={() => navigate('home')} aria-label="Nutmeg home"><span>NUTMEG <i>//</i></span>{screen === 'home' && <small>FOOTBALL TRIVIA DAILY</small>}</button>
      <button className="icon-button" onClick={() => navigate('leaderboard')} aria-label={screen === 'home' ? 'Open friends profile' : 'Demo leaderboard'}>{screen === 'home' ? <CircleUserRound size={24} /> : <BarChart3 size={22} />}</button>
      {screen === 'home' && menuOpen && (
        <nav className="masthead-menu" aria-label="Game menu">
          <button onClick={() => navigate('home')}><Home size={18}/> Today’s games</button>
          <button onClick={() => navigate('lineup')}><span className="menu-ticket">6</span> The Lineup</button>
          <button onClick={() => navigate('mystery')}><span className="menu-ticket">?</span> The Mystery</button>
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
      <button className={active === 'lineup' ? 'active' : ''} onClick={() => onNavigate('lineup')}><span className="nav-num">6</span><span>Lineup</span></button>
      <button className={active === 'mystery' ? 'active' : ''} onClick={() => onNavigate('mystery')}><span className="nav-num">?</span><span>Mystery</span></button>
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

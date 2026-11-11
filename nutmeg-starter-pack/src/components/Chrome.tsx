import { ArrowLeft, BarChart3, Home, Trophy } from 'lucide-react'
import type { ReactNode } from 'react'

export type Screen = 'home' | 'lineup' | 'mystery' | 'leaderboard' | 'result'

export function AppHeader({ screen, onNavigate }: { screen: Screen, onNavigate: (screen: Screen) => void }) {
  return (
    <header className="masthead">
      <button className="icon-button" onClick={() => onNavigate(screen === 'home' ? 'leaderboard' : 'home')} aria-label={screen === 'home' ? 'Open leaderboard' : 'Back to home'}>
        {screen === 'home' ? <Trophy size={21} /> : <ArrowLeft size={23} />}
      </button>
      <button className="wordmark" onClick={() => onNavigate('home')} aria-label="Nutmeg home"><span>NUTMEG</span><i>//</i></button>
      <button className="icon-button" onClick={() => onNavigate('leaderboard')} aria-label="Demo leaderboard"><BarChart3 size={22} /></button>
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
      {!noNav && <BottomNav active={screen} onNavigate={onNavigate} />}
    </main>
  )
}

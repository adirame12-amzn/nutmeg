import { useEffect, useState } from 'react'
import { ScreenFrame, type Screen } from './components/Chrome'
import { HomeScreen } from './screens/HomeScreen'
import { LeaderboardScreen } from './screens/LeaderboardScreen'
import { LineupScreen, type ResultPayload } from './screens/LineupScreen'
import { MysteryScreen } from './screens/MysteryScreen'
import { ResultScreen } from './screens/ResultScreen'
import { CreditsScreen } from './screens/CreditsScreen'

const screens: Screen[] = ['home', 'lineup', 'mystery', 'leaderboard', 'credits', 'result']

function screenFromHash(): Screen {
  const value = window.location.hash.replace('#', '') as Screen
  return screens.includes(value) ? value : 'home'
}

export function App() {
  const [screen, setScreen] = useState<Screen>(screenFromHash)
  const [result, setResult] = useState<ResultPayload | null>(null)

  useEffect(() => {
    const sync = () => setScreen(screenFromHash())
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const navigate = (next: Screen) => {
    window.location.hash = next
    setScreen(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const showResult = (payload: ResultPayload) => { setResult(payload); navigate('result') }

  return (
    <ScreenFrame screen={screen} onNavigate={navigate} noNav={screen === 'result'}>
      {screen === 'home' && <HomeScreen onNavigate={navigate} />}
      {screen === 'lineup' && <LineupScreen onResult={showResult} />}
      {screen === 'mystery' && <MysteryScreen onResult={showResult} />}
      {screen === 'leaderboard' && <LeaderboardScreen />}
      {screen === 'credits' && <CreditsScreen />}
      {screen === 'result' && <ResultScreen result={result} onNavigate={navigate} />}
    </ScreenFrame>
  )
}

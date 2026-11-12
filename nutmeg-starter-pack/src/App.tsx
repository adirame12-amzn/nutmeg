import { useEffect, useState } from 'react'
import { loadRankedIdentity, rankedApiEnabled, type RankedIdentity } from './api/ranked'
import { ScreenFrame, type Screen } from './components/Chrome'
import { UsernameOnboarding } from './components/UsernameOnboarding'
import { HomeScreen } from './screens/HomeScreen'
import { LeaderboardDemo, LeaderboardScreen } from './screens/LeaderboardScreen'
import { LineupScreen, type ResultPayload } from './screens/LineupScreen'
import { MysteryScreen } from './screens/MysteryScreen'
import { ResultScreen } from './screens/ResultScreen'
import { CreditsScreen } from './screens/CreditsScreen'
import { RankedLineupScreen } from './screens/RankedLineupScreen'
import { PaperTrailScreen } from './screens/PaperTrailScreen'
import { RankedPaperTrailScreen } from './screens/RankedPaperTrailScreen'
import { RedactedScreen } from './screens/RedactedScreen'
import { WirePreviewScreen } from './screens/WirePreviewScreen'
import { CipherScreen } from './screens/CipherScreen'

const screens: Screen[] = ['home', 'lineup', 'mystery', 'paper-trail', 'ranked-paper-trail', 'redacted', 'cipher', 'wire-preview', 'leaderboard', 'credits', 'result']

function screenFromHash(): Screen {
  const value = window.location.hash.replace('#', '') as Screen
  return screens.includes(value) ? value : 'home'
}

export function shouldRequestIdentity(screen: Screen, quickCase: boolean, apiEnabled: boolean, hasIdentity: boolean) {
  return apiEnabled && !hasIdentity && (screen === 'leaderboard' || screen === 'ranked-paper-trail' || (screen === 'lineup' && !quickCase))
}

export function App() {
  const [screen, setScreen] = useState<Screen>(screenFromHash)
  const [result, setResult] = useState<ResultPayload | null>(null)
  const [identity, setIdentity] = useState<RankedIdentity | null>(() => loadRankedIdentity())
  const [quickCase, setQuickCase] = useState(false)

  useEffect(() => {
    const sync = () => setScreen(screenFromHash())
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const navigate = (next: Screen) => {
    if (next === 'lineup' && screen !== 'result') setQuickCase(false)
    window.location.hash = next
    setScreen(next)
    window.scrollTo({ top: 0, behavior: next === 'result' ? 'auto' : 'smooth' })
  }

  const openPracticeLineup = () => {
    setQuickCase(true)
    window.location.hash = 'lineup'
    setScreen('lineup')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const showResult = (payload: ResultPayload) => { setResult(payload); navigate('result') }
  const needsIdentity = shouldRequestIdentity(screen, quickCase, rankedApiEnabled, Boolean(identity))

  return (
    <ScreenFrame screen={screen} onNavigate={navigate} noNav={screen === 'result'}>
      {screen === 'home' && <HomeScreen onNavigate={navigate} onOpenPracticeLineup={openPracticeLineup} ranked={rankedApiEnabled} identity={identity} />}
      {needsIdentity && <UsernameOnboarding onComplete={setIdentity} />}
      {screen === 'lineup' && !needsIdentity && (rankedApiEnabled && identity && !quickCase ? <RankedLineupScreen identity={identity} onResult={showResult} onQuickCase={() => setQuickCase(true)} /> : <LineupScreen onResult={showResult} />)}
      {screen === 'mystery' && <MysteryScreen onResult={showResult} />}
      {screen === 'paper-trail' && <PaperTrailScreen onResult={showResult} />}
      {screen === 'redacted' && <RedactedScreen onNavigate={navigate} />}
      {screen === 'cipher' && <CipherScreen onNavigate={navigate} />}
      {screen === 'wire-preview' && <WirePreviewScreen />}
      {screen === 'ranked-paper-trail' && rankedApiEnabled && !needsIdentity && identity && <RankedPaperTrailScreen identity={identity} onResult={showResult} onPractice={() => navigate('paper-trail')} />}
      {screen === 'ranked-paper-trail' && !rankedApiEnabled && <PaperTrailScreen onResult={showResult} />}
      {screen === 'leaderboard' && !needsIdentity && (rankedApiEnabled && identity ? <LeaderboardScreen identity={identity} /> : <LeaderboardDemo />)}
      {screen === 'credits' && <CreditsScreen />}
      {screen === 'result' && <ResultScreen result={result} onNavigate={navigate} />}
    </ScreenFrame>
  )
}

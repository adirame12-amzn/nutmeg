import { useEffect, useState } from 'react'
import { getDailyCipher, getDailyLineup, getDailyOverlap, getDailyPaperTrail, getDailyRedacted, loadRankedIdentity, rankedApiEnabled, type RankedIdentity } from './api/ranked'
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
import { RankedRedactedScreen } from './screens/RankedRedactedScreen'
import { RankedCipherScreen } from './screens/RankedCipherScreen'
import { OverlapScreen } from './screens/OverlapScreen'
import { markPracticeComplete } from './data/practiceProgress'
import { DAILY_CASES, fallbackDailyStatus, nextDailyScreen, type DailyCaseStatus } from './domain/dailyJourney'
import { RankedOverlapScreen } from './screens/RankedOverlapScreen'
import { BadgeCollectionScreen } from './screens/BadgeCollectionScreen'

const screens: Screen[] = ['home', 'lineup', 'mystery', 'paper-trail', 'ranked-paper-trail', 'redacted', 'ranked-redacted', 'cipher', 'ranked-cipher', 'overlap', 'ranked-overlap', 'wire-preview', 'leaderboard', 'badges', 'credits', 'result']

function screenFromHash(): Screen {
  const value = window.location.hash.replace('#', '') as Screen
  return screens.includes(value) ? value : 'home'
}

export function shouldRequestIdentity(screen: Screen, quickCase: boolean, apiEnabled: boolean, hasIdentity: boolean) {
  return apiEnabled && !hasIdentity && (screen === 'leaderboard' || screen === 'badges' || screen === 'ranked-paper-trail' || screen === 'ranked-redacted' || screen === 'ranked-cipher' || screen === 'ranked-overlap' || (screen === 'lineup' && !quickCase))
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
    ;(document.activeElement as HTMLElement | null)?.blur()
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

  const showResult = (payload: ResultPayload) => {
    if (!payload.ranked && payload.mode === 'lineup' && quickCase) markPracticeComplete('lineup')
    setResult(payload); navigate('result')
  }
  const continueDaily = async (after?: Screen) => {
    if (!identity || !rankedApiEnabled) { navigate('lineup'); return }
    try {
      const results = await Promise.allSettled([
        getDailyLineup(identity), getDailyPaperTrail(identity), getDailyRedacted(identity), getDailyCipher(identity), getDailyOverlap(identity),
      ])
      const statuses = Object.fromEntries(DAILY_CASES.map((item, index) => {
        const result = results[index]
        return [item.id, result.status === 'fulfilled' ? result.value.status : fallbackDailyStatus(item.screen, after)]
      })) as Record<string, DailyCaseStatus>
      navigate(nextDailyScreen(statuses, after) || 'home')
    } catch { navigate('home') }
  }
  const needsIdentity = shouldRequestIdentity(screen, quickCase, rankedApiEnabled, Boolean(identity))

  return (
    <ScreenFrame screen={screen} onNavigate={navigate} noNav={screen === 'result'}>
      {screen === 'home' && <HomeScreen onNavigate={navigate} onOpenPracticeLineup={openPracticeLineup} ranked={rankedApiEnabled} identity={identity} />}
      {needsIdentity && <UsernameOnboarding onComplete={setIdentity} />}
      {screen === 'lineup' && !needsIdentity && (rankedApiEnabled && identity && !quickCase ? <RankedLineupScreen identity={identity} onQuickCase={() => setQuickCase(true)} onNext={() => continueDaily('lineup')} onHome={() => navigate('home')} onBadges={() => navigate('badges')} /> : <LineupScreen onResult={showResult} />)}
      {screen === 'mystery' && <MysteryScreen onResult={showResult} />}
      {screen === 'paper-trail' && <PaperTrailScreen onResult={showResult} />}
      {screen === 'redacted' && <RedactedScreen onNavigate={navigate} />}
      {screen === 'ranked-redacted' && rankedApiEnabled && !needsIdentity && identity && (
        <RankedRedactedScreen identity={identity} onNext={() => continueDaily('ranked-redacted')} onHome={() => navigate('home')} onBadges={() => navigate('badges')}/>
      )}
      {screen === 'ranked-redacted' && !rankedApiEnabled && (
        <RedactedScreen onNavigate={navigate}/>
      )}
      {screen === 'cipher' && <CipherScreen onNavigate={navigate} />}
      {screen === 'ranked-cipher' && rankedApiEnabled && !needsIdentity && identity && (
        <RankedCipherScreen identity={identity} onNext={() => continueDaily('ranked-cipher')} onHome={() => navigate('home')} onBadges={() => navigate('badges')}/>
      )}
      {screen === 'ranked-cipher' && !rankedApiEnabled && (
        <CipherScreen onNavigate={navigate}/>
      )}
      {screen === 'overlap' && <OverlapScreen onNavigate={navigate} />}
      {screen === 'ranked-overlap' && rankedApiEnabled && !needsIdentity && identity && <RankedOverlapScreen identity={identity} onNext={() => continueDaily('ranked-overlap')} onHome={() => navigate('home')} onBadges={() => navigate('badges')}/>}
      {screen === 'ranked-overlap' && !rankedApiEnabled && <OverlapScreen onNavigate={navigate}/>}
      {screen === 'wire-preview' && <WirePreviewScreen />}
      {screen === 'ranked-paper-trail' && rankedApiEnabled && !needsIdentity && identity && <RankedPaperTrailScreen identity={identity} onPractice={() => navigate('paper-trail')} onNext={() => continueDaily('ranked-paper-trail')} onHome={() => navigate('home')} onBadges={() => navigate('badges')} />}
      {screen === 'ranked-paper-trail' && !rankedApiEnabled && <PaperTrailScreen onResult={showResult} />}
      {screen === 'leaderboard' && !needsIdentity && (rankedApiEnabled && identity ? <LeaderboardScreen identity={identity} onBadges={() => navigate('badges')} /> : <LeaderboardDemo />)}
      {screen === 'badges' && !needsIdentity && rankedApiEnabled && identity && <BadgeCollectionScreen identity={identity} onBack={() => navigate('leaderboard')}/>}
      {screen === 'credits' && <CreditsScreen />}
      {screen === 'result' && <ResultScreen result={result} onNavigate={navigate} onNextDaily={() => continueDaily(result?.mode === 'lineup' ? 'lineup' : result?.mode === 'paper-trail' ? 'ranked-paper-trail' : undefined)} />}
    </ScreenFrame>
  )
}

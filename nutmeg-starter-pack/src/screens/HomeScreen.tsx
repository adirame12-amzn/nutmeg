import { ArrowRight, CalendarCheck, Check, Clock3, Fingerprint, FolderOpen, Play, Sparkles, Trophy, UserRoundCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getDailyCipher, getDailyLineup, getDailyOverlap, getDailyPaperTrail, getDailyRedacted, type RankedIdentity } from '../api/ranked'
import type { Screen } from '../components/Chrome'
import { loadPracticeCompletions, PRACTICE_PROGRESS_EVENT, type PracticeGame } from '../data/practiceProgress'
import { completedDailyCount, DAILY_CASES, nextDailyScreen, type DailyCaseId, type DailyCaseStatus } from '../domain/dailyJourney'

type CaseProgress = { status: 'checking' | 'open' | 'playing' | 'won' | 'lost'; score?: number }

function CaseProgressChip({ progress }: { progress: CaseProgress }) {
  const label = progress.status === 'checking' ? 'CHECKING'
    : progress.status === 'won' ? `SOLVED · +${progress.score ?? 0}`
      : progress.status === 'lost' ? 'CLOSED · 0'
        : progress.status === 'playing' ? 'IN PROGRESS' : 'NOT STARTED'
  return <span className={`case-progress ${progress.status}`}>{label}</span>
}

type GameMark = 'suspect' | 'trail' | 'redacted' | 'cipher' | 'overlap' | 'wire'

function GameGlyph({ game }: { game: GameMark }) {
  if (game === 'trail') return <svg viewBox="0 0 48 58"><circle cx="14" cy="14" r="6"/><circle cx="34" cy="28" r="6"/><circle cx="15" cy="45" r="6"/><path d="m19 17 10 8m0 7-9 9"/><path d="M11 14h6M31 28h6M12 45h6"/></svg>
  if (game === 'redacted') return <svg viewBox="0 0 48 58"><path d="M10 8h28v42H10z"/><path d="M15 17h18M15 24h10M15 33h18M15 40h14"/><path className="redaction" d="M12 14h25v7H12zm0 16h25v7H12z"/></svg>
  if (game === 'cipher') return <svg viewBox="0 0 48 58"><path d="M8 10h32v38H8z"/><rect x="13" y="16" width="9" height="10" rx="2"/><rect x="26" y="16" width="9" height="10" rx="2"/><rect x="13" y="31" width="9" height="10" rx="2"/><rect x="26" y="31" width="9" height="10" rx="2"/><path d="m17 19 14 19m0-19L17 38"/></svg>
  if (game === 'overlap') return <svg viewBox="0 0 48 58"><circle cx="18" cy="24" r="11"/><circle cx="30" cy="24" r="11"/><circle cx="24" cy="36" r="11"/><path d="M24 24v8m0 5v1"/></svg>
  if (game === 'wire') return <svg viewBox="0 0 48 58"><circle cx="12" cy="13" r="5"/><circle cx="36" cy="45" r="5"/><path d="M16 16c18 4 1 14 14 18 7 2 7 5 6 6"/><path d="M8 13h8M32 45h8"/><path className="spark" d="m24 24 4 4-5 2 3 5"/></svg>
  return <svg viewBox="0 0 48 58"><path d="M10 9h28v40H10z"/><circle cx="24" cy="22" r="7"/><path d="M14 42c2-8 18-8 20 0"/><path d="M16 13c5-5 12-5 17 0M13 17c-2 8 1 17 7 22M35 17c2 8-1 17-7 22"/></svg>
}

function GameTicket({ game = 'suspect' }: { game?: GameMark }) {
  return (
    <span className={`ticket-icon ${game}-ticket`} aria-hidden="true">
      <span className="ticket-sheet">
        <GameGlyph game={game}/>
      </span>
    </span>
  )
}

export function HomeScreen({ onNavigate, onOpenPracticeLineup, ranked, identity }: { onNavigate: (screen: Screen) => void; onOpenPracticeLineup: () => void; ranked: boolean; identity: RankedIdentity | null }) {
  const [desk, setDesk] = useState<'daily' | 'practice'>('daily')
  const [lineupProgress, setLineupProgress] = useState<CaseProgress>({ status: identity && ranked ? 'checking' : 'open' })
  const [trailProgress, setTrailProgress] = useState<CaseProgress>({ status: identity && ranked ? 'checking' : 'open' })
  const [redactedProgress, setRedactedProgress] = useState<CaseProgress>({ status: identity && ranked ? 'checking' : 'open' })
  const [cipherProgress, setCipherProgress] = useState<CaseProgress>({ status: identity && ranked ? 'checking' : 'open' })
  const [overlapProgress, setOverlapProgress] = useState<CaseProgress>({ status: identity && ranked ? 'checking' : 'open' })
  const [practiceCompleted, setPracticeCompleted] = useState<Set<PracticeGame>>(loadPracticeCompletions)

  useEffect(() => {
    const refresh = () => setPracticeCompleted(loadPracticeCompletions())
    window.addEventListener(PRACTICE_PROGRESS_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => { window.removeEventListener(PRACTICE_PROGRESS_EVENT, refresh); window.removeEventListener('storage', refresh) }
  }, [])

  useEffect(() => {
    if (!ranked || !identity) return
    Promise.allSettled([getDailyLineup(identity), getDailyPaperTrail(identity), getDailyRedacted(identity), getDailyCipher(identity), getDailyOverlap(identity)]).then(([lineup, trail, redacted, cipher, overlap]) => {
      if (lineup.status === 'fulfilled') setLineupProgress({ status: lineup.value.status === 'not_started' ? 'open' : lineup.value.status, score: lineup.value.score })
      else setLineupProgress({ status: 'open' })
      if (trail.status === 'fulfilled') setTrailProgress({ status: trail.value.status === 'not_started' ? 'open' : trail.value.status, score: trail.value.score })
      else setTrailProgress({ status: 'open' })
      if (redacted.status === 'fulfilled') setRedactedProgress({ status: redacted.value.status === 'not_started' ? 'open' : redacted.value.status, score: redacted.value.score })
      else setRedactedProgress({ status: 'open' })
      if (cipher.status === 'fulfilled') setCipherProgress({ status: cipher.value.status === 'not_started' ? 'open' : cipher.value.status, score: cipher.value.score })
      else setCipherProgress({ status: 'open' })
      if (overlap.status === 'fulfilled') setOverlapProgress({ status: overlap.value.status === 'not_started' ? 'open' : overlap.value.status, score: overlap.value.score })
      else setOverlapProgress({ status: 'open' })
    })
  }, [identity, ranked])

  const progressById: Record<DailyCaseId, CaseProgress> = { lineup: lineupProgress, 'paper-trail': trailProgress, redacted: redactedProgress, cipher: cipherProgress, overlap: overlapProgress }
  const statuses = Object.fromEntries(Object.entries(progressById).map(([id, progress]) => [id, progress.status === 'open' || progress.status === 'checking' ? 'not_started' : progress.status])) as Record<DailyCaseId, DailyCaseStatus>
  const completed = completedDailyCount(statuses)
  const checking = Object.values(progressById).some(progress => progress.status === 'checking')
  const allComplete = completed === DAILY_CASES.length
  const dailyLabel = checking ? 'Checking today’s files…' : allComplete ? 'Today’s Edition Complete' : completed ? 'Continue Today’s Cases' : 'Play Today’s Cases'
  const openDaily = () => {
    if (allComplete) { onNavigate('leaderboard'); return }
    onNavigate(nextDailyScreen(statuses) || 'lineup')
  }

  return (
    <div className="home-page">
      <section className="home-hero">
        <div><p className="edition">DAILY FOOTBALL CASE FILE</p><h1><span>Casebook</span><br/><em>№ 001</em></h1><p>Every player leaves clues. Follow the evidence.</p></div>
        <div className="hero-player" aria-hidden="true"><span>55</span></div>
      </section>

      <div className="desk-switch" role="group" aria-label="Choose a case desk">
        <button className={desk === 'daily' ? 'active' : ''} onClick={() => setDesk('daily')} aria-pressed={desk === 'daily'}><CalendarCheck/><span><strong>Daily Edition</strong><small>5 cases · shared daily</small></span></button>
        <button className={desk === 'practice' ? 'active' : ''} onClick={() => setDesk('practice')} aria-pressed={desk === 'practice'}><FolderOpen/><span><strong>Cold Cases</strong><small>Unlimited · unscored</small></span></button>
      </div>

      {desk === 'daily' ? <section className="case-desk daily-desk" aria-labelledby="daily-cases-title">
        <div className="desk-heading">
          <span className="desk-seal"><CalendarCheck /></span>
          <span><small>ONE SHARED FILE · SCORED</small><h2 id="daily-cases-title">Today’s Cases</h2></span>
          <span className="mode-chip">RANKED</span>
        </div>
        <p>One football edition. Five different investigations. Your progress waits if you need a break.</p>
        <button className={`daily-edition-cta ${allComplete ? 'complete' : completed ? 'continue' : ''}`} onClick={openDaily} disabled={checking}>
          <span className="daily-ball" aria-hidden="true"><i/><b>{allComplete ? <Check/> : <Play/>}</b></span>
          <span className="daily-cta-copy"><small>{allComplete ? 'ALL FILES CLOSED' : 'TODAY’S FOOTBALL EDITION'}</small><strong>{dailyLabel}</strong><em>{checking ? 'Reading the case desk' : allComplete ? 'See where you stand this week' : completed ? `Next: ${DAILY_CASES.find(item => item.screen === nextDailyScreen(statuses))?.label}` : 'Tap to open Case 01'}</em></span>
          <ArrowRight className="daily-cta-arrow"/>
        </button>
        <div className="daily-edition-progress" aria-label={`${completed} of ${DAILY_CASES.length} daily cases completed`}>
          <div>{DAILY_CASES.map((item, index) => <span key={item.id} className={['won', 'lost'].includes(statuses[item.id]) ? 'done' : statuses[item.id] === 'playing' ? 'current' : ''}><i>{['won', 'lost'].includes(statuses[item.id]) ? <Check/> : index + 1}</i><small>{item.label}</small></span>)}</div>
          <strong>{completed}/{DAILY_CASES.length} complete</strong>
        </div>
        <div className={`desk-meta ${ranked || identity ? '' : 'single'}`}>
          {(ranked || identity) && <button onClick={() => onNavigate('lineup')}><Fingerprint /> <span><strong>{identity ? `Signed in as @${identity.user.username}` : 'Claim your detective name'}</strong><small>{identity ? 'Identity saved in this browser' : 'No email or password needed'}</small></span></button>}
          <button onClick={() => onNavigate('leaderboard')} aria-label="Open weekly leaderboard"><Trophy /><span><strong>Weekly table</strong><small>Server-validated points</small></span><ArrowRight /></button>
        </div>
      </section> : null}

      {desk === 'practice' ? <section className="case-desk archive-desk" aria-labelledby="cold-cases-title" data-file="ARCHIVE DRAWER">
        <div className="desk-heading">
          <span className="desk-seal"><FolderOpen /></span>
          <span><small>UNLIMITED · UNSCORED · LOCAL FILES</small><h2 id="cold-cases-title">Cold Cases</h2></span>
          <span className="mode-chip practice">PRACTICE</span>
        </div>
        <p>Reopen old files and sharpen your instincts. These local rounds never affect the leaderboard.</p>
        <div className="archive-games">
          <button className={`archive-game orange ${practiceCompleted.has('lineup') ? 'completed' : ''}`} data-file="FILE 01" onClick={onOpenPracticeLineup}>
            <GameTicket /><span><small>RANDOM PLAYER</small><strong>Prime Suspect</strong><em>Compare clues. Catch a new player every round.</em></span><ArrowRight />
          </button>
          <button className={`archive-game ${practiceCompleted.has('paper-trail') ? 'completed' : ''}`} data-file="FILE 03" onClick={() => onNavigate('paper-trail')}>
            <GameTicket game="trail" /><span><small>CASE 03 · 6 SUSPECTS</small><strong>Paper Trail</strong><em>Club by club, hunt down the traveller.</em></span><ArrowRight />
          </button>
          <button className={`archive-game redacted-archive ${practiceCompleted.has('redacted') ? 'completed' : ''}`} data-file="FILE 04" onClick={() => onNavigate('redacted')}>
            <GameTicket game="redacted" /><span><small>CASE 04 · 6 STRIKES</small><strong>Redacted</strong><em>Pick letters. Strip the ink. Name the player.</em></span><ArrowRight />
          </button>
          <button className={`archive-game cipher-archive ${practiceCompleted.has('cipher') ? 'completed' : ''}`} data-file="FILE 05" onClick={() => onNavigate('cipher')}>
            <GameTicket game="cipher" /><span><small>CASE 05 · 4 ATTEMPTS</small><strong>Cipher</strong><em>Unscramble the name before the trail goes cold.</em></span><ArrowRight />
          </button>
          <button className={`archive-game overlap-archive ${practiceCompleted.has('overlap') ? 'completed' : ''}`} data-file="FILE 06" onClick={() => onNavigate('overlap')}>
            <GameTicket game="overlap" /><span><small>CASE 06 · 60 SECONDS</small><strong>The Overlap</strong><em>Two clubs. One country. One shot.</em></span><ArrowRight />
          </button>
        </div>
        <div className="archive-foot"><Clock3 size={15}/><span>Play again whenever you like · no points recorded</span></div>
      </section> : null}
      {desk === 'practice' ? <section className="coming-soon-shelf" aria-label="Coming soon games">
        <span className="coming-soon-label">COMING SOON</span>
        <button onClick={() => onNavigate('wire-preview')}>
          <GameTicket game="wire"/><span><small>IN THE CONNECTION LAB</small><strong>The Wire</strong><em>Link clubs through the players they share.</em></span><ArrowRight/>
        </button>
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

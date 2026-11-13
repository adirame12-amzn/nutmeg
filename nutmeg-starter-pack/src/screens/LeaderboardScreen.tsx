import { Award, Crown, LoaderCircle, RefreshCw, Star, Trophy, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { getWeeklyLeaderboard, type RankedIdentity, type WeeklyLeaderboard } from '../api/ranked'
import { FeaturedBadge } from '../components/BadgeMark'

function ChampionBadge({ stars, cabinet = false }: { stars: number; cabinet?: boolean }) {
  if (stars < 1) return null
  const title = `${stars} weekly championship ${stars === 1 ? 'badge' : 'badges'}`
  return <span className={`champion-badge ${cabinet ? 'cabinet' : ''}`} aria-label={title} title={title}><Star/><b>{stars}</b></span>
}

export function LeaderboardScreen({ identity, onBadges }: { identity: RankedIdentity; onBadges: () => void }) {
  const [table, setTable] = useState<WeeklyLeaderboard | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const load = useCallback(() => {
    setLoading(true)
    setError('')
    getWeeklyLeaderboard(identity).then(setTable).catch(caught => setError(caught instanceof Error ? caught.message : 'Could not load the table.')).finally(() => setLoading(false))
  }, [identity])
  useEffect(load, [load])

  return (
    <div className="leaderboard-page">
      <p className="eyebrow">LIVE FRIENDS TABLE</p><h1>The Weekly<br/>Caseboard</h1>
      <div className="notice"><Users size={17}/><span>Scores are validated by the case desk. The leader earns a permanent championship star when the week closes Monday at 00:00 UTC.</span></div>
      <div className="leader-tabs" aria-label="Leaderboard period"><button className="active">This week</button></div>
      {loading && <div className="leader-state"><LoaderCircle className="spin"/> Reading the caseboard…</div>}
      {error && <div className="leader-state error"><span>{error}</span><button onClick={load}><RefreshCw size={15}/> Retry</button></div>}
      {!loading && !error && table && table.leaders.length === 0 && <div className="empty-leader"><Trophy/><h2>No closed cases yet.</h2><p>Be the first detective on this week’s board.</p></div>}
      {table && table.leaders.length > 0 && <ol className="leader-list">
        {table.leaders.map(leader => <li className={leader.isCurrentUser ? 'you' : ''} key={leader.username}><span className="rank">{leader.rank <= 3 ? <Crown size={22}/> : leader.rank}</span><span><span className="leader-name-line"><strong>{leader.username}</strong><ChampionBadge stars={leader.stars}/></span><FeaturedBadge badgeId={leader.featuredBadgeId}/><small>{leader.solved} solved · {leader.played} played</small></span><b className="leader-points">{leader.points}</b></li>)}
      </ol>}
      <button className="open-badge-cabinet" onClick={onBadges}><Award/><span><strong>Your Badge Cabinet</strong><small>See honours, progress and feature a collectible</small></span></button>
      {table && <section className="star-board" aria-labelledby="star-board-title">
        <div className="star-board-heading"><span><Star/></span><div><small>WEEKLY CHAMPIONS</small><h2 id="star-board-title">The Star Cabinet</h2></div></div>
        {table.starLeaders.length === 0
          ? <p className="star-empty">The first star will be awarded when this week closes.</p>
          : <ol>{table.starLeaders.map(champion => <li className={champion.isCurrentUser ? 'you' : ''} key={champion.username}><span>{champion.rank}</span><strong>{champion.username}</strong><ChampionBadge stars={champion.stars} cabinet/></li>)}</ol>}
      </section>}
      <div className="identity-ticket"><span className="identity-name"><span>@{identity.user.username}</span>{table?.currentUser && <><ChampionBadge stars={table.currentUser.stars}/><FeaturedBadge badgeId={table.currentUser.featuredBadgeId}/></>}</span><small>Your detective name is tied to this browser.</small></div>
    </div>
  )
}

export function LeaderboardDemo() {
  return <div className="leaderboard-page"><p className="eyebrow">RANKED MODE</p><h1>The Weekly<br/>Caseboard</h1><div className="empty-leader"><Trophy/><h2>Case desk not connected.</h2><p>Deploy the Cloudflare Worker and set VITE_API_URL to enable shared scores.</p></div></div>
}

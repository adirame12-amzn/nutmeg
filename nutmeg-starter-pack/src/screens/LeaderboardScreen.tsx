import { Crown, LoaderCircle, RefreshCw, Trophy, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { getWeeklyLeaderboard, type RankedIdentity, type WeeklyLeaderboard } from '../api/ranked'

export function LeaderboardScreen({ identity }: { identity: RankedIdentity }) {
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
      <div className="notice"><Users size={17}/><span>Scores are validated by the case desk. The week resets every Monday at 00:00 UTC.</span></div>
      <div className="leader-tabs" aria-label="Leaderboard period"><button className="active">This week</button></div>
      {loading && <div className="leader-state"><LoaderCircle className="spin"/> Reading the caseboard…</div>}
      {error && <div className="leader-state error"><span>{error}</span><button onClick={load}><RefreshCw size={15}/> Retry</button></div>}
      {!loading && !error && table && table.leaders.length === 0 && <div className="empty-leader"><Trophy/><h2>No closed cases yet.</h2><p>Be the first detective on this week’s board.</p></div>}
      {table && table.leaders.length > 0 && <ol className="leader-list">
        {table.leaders.map(leader => <li className={leader.isCurrentUser ? 'you' : ''} key={leader.username}><span className="rank">{leader.rank <= 3 ? <Crown size={22}/> : leader.rank}</span><span><strong>{leader.username}</strong><small>{leader.solved} solved · {leader.played} played</small></span><b>{leader.points}</b></li>)}
      </ol>}
      <div className="identity-ticket"><span>@{identity.user.username}</span><small>Your detective name is tied to this browser.</small></div>
    </div>
  )
}

export function LeaderboardDemo() {
  return <div className="leaderboard-page"><p className="eyebrow">RANKED MODE</p><h1>The Weekly<br/>Caseboard</h1><div className="empty-leader"><Trophy/><h2>Case desk not connected.</h2><p>Deploy the Cloudflare Worker and set VITE_API_URL to enable shared scores.</p></div></div>
}

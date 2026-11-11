import { Crown, LockKeyhole, Share2, Users } from 'lucide-react'

const leaders = [
  { name: 'Rinku', score: 280 }, { name: 'Priya', score: 260 }, { name: 'Hardik', score: 245 },
  { name: 'You', score: 230 }, { name: 'Rajat', score: 210 }, { name: 'Aditi', score: 200 }, { name: 'Karan', score: 185 }
]

export function LeaderboardScreen() {
  return (
    <div className="leaderboard-page">
      <p className="eyebrow">FRIENDS DEMO</p><h1>The Sunday<br/>League</h1>
      <div className="notice"><LockKeyhole size={17}/><span>Sample scores only — no accounts, sharing or persistence yet.</span></div>
      <div className="leader-tabs" aria-label="Leaderboard period"><button className="active">Today</button><button>This week</button><button>All time</button></div>
      <ol className="leader-list">
        {leaders.map((leader, index) => <li className={leader.name === 'You' ? 'you' : ''} key={leader.name}><span className="rank">{index < 3 ? <Crown size={22}/> : index + 1}</span><strong>{leader.name}</strong><b>{leader.score}</b></li>)}
      </ol>
      <button className="invite" disabled><Users/><span><strong>Invite friends</strong><small>Coming with the server-backed alpha</small></span><Share2/></button>
    </div>
  )
}

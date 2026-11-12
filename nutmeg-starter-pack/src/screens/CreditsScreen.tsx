import { ExternalLink, ImageOff } from 'lucide-react'
import previewAttributions from '../../data/generated/attributions.json'
import clubAttributions from '../../data/generated/paper-trail/attributions.json'
import rating85PlusAttributions from '../../data/generated/rating-85-plus/attributions.json'
import { fc27Players } from '../data/fc27Players'
import { paperTrailHistories } from '../data/paperTrail'
import { PlayerPortrait } from '../components/PlayerPortrait'

export function CreditsScreen() {
  const attributions = Array.from(new Map(
    [...previewAttributions, ...rating85PlusAttributions].map(item => [item.playerId, item]),
  ).values())
  const creditedPlayers = [...fc27Players].sort((left, right) => left.displayName.localeCompare(right.displayName))
  const clubNames = new Map(paperTrailHistories.flatMap(history => history.clubs.map(club => [club.clubId, club.name] as const)))
  const publishedClubCredits = clubAttributions
    .filter(credit => credit.status === 'approved' && clubNames.has(credit.clubId))
    .sort((left, right) => (clubNames.get(left.clubId) || left.clubId).localeCompare(clubNames.get(right.clubId) || right.clubId))
  return (
    <div className="credits-page game-page">
      <div className="game-heading"><p className="eyebrow">OPEN CREDITS</p><p className="demo-pill">96 PLAYERS</p></div>
      <h1>Sources &amp;<br/>portraits</h1>
      <p className="game-intro">Every published portrait below was matched through Wikidata and carries its Wikimedia Commons attribution.</p>
      <section className="credits-list" aria-label="Player image credits">
        {creditedPlayers.map(player => {
          const credit = attributions.find(item => item.playerId === player.id)
          return (
            <article key={player.id}>
              <PlayerPortrait player={player} size="search" treatment="clean" />
              <div><strong>{player.displayName}</strong>{credit ? <><span>{credit.creator} · {credit.license}</span><a href={credit.sourcePage} target="_blank" rel="noreferrer">View source <ExternalLink size={12}/></a></> : <span><ImageOff size={12}/> Neutral fallback · no portrait published</span>}</div>
            </article>
          )
        })}
      </section>
      <details className="club-credits">
        <summary>Paper Trail crest credits ({publishedClubCredits.length})</summary>
        <p>Published crests keep their original club colours. Commons assets use their file-level licence; repository backfills use the pinned MIT source recorded below. Club marks remain the trademarks of their respective owners and appear only for identification. Seven unavailable marks use clearly labelled Player Press editorial monograms.</p>
        <div>
          {publishedClubCredits.map(credit => <article key={credit.clubId}>
            <strong>{clubNames.get(credit.clubId) || credit.clubId}</strong>
            <span>{credit.creator} · {credit.license}</span>
            <a href={credit.sourcePage} target="_blank" rel="noreferrer">View source <ExternalLink size={12}/></a>
          </article>)}
        </div>
      </details>
      <section className="data-notes">
        <h2>Data note</h2>
        <p>Attributes cover all 96 men's records rated 85–91 in the EA FC Analysis repository’s 12 September 2026 snapshot. That repository currently exposes no redistribution licence, so Player Press marks these records as review-required and does not treat them as production data.</p>
        <p>Wikidata identifiers are used for identity resolution. Wikimedia Commons images are resized to 400 × 500 WebP; approved CC BY-SA derivatives remain under their source licence. Gameplay uses separately reviewed transparent cutouts where available and falls back to the editorial crop when extraction is unavailable.</p>
        <p>Paper Trail club histories come from Wikidata P54 statements with a positive senior appearance count (P1350). Youth, reserve and national-team claims are excluded conservatively. The 2026-11-11 snapshot has 87 locally playable player histories and remains under editorial completeness review.</p>
        <p>Club-art coverage combines 59 Wikimedia Commons assets, 113 reviewed SVG matches from the pinned MIT-licensed football-logos repository snapshot, and seven generated editorial fallback badges where no reviewed crest asset was available.</p>
      </section>
    </div>
  )
}

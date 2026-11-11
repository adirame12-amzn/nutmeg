import type { Player } from '../domain/types'

export function PlayerPortrait({ player, size = 'card', treatment = 'cutout' }: { player: Player, size?: 'card' | 'search' | 'hero', treatment?: 'cutout' | 'editorial' | 'clean' }) {
  if (!player.portraitUrl) return <span className="player-disc">{player.shirtNumber || '?'}</span>
  const source = treatment === 'cutout'
    ? player.portraitCutoutEditorialUrl || player.portraitEditorialUrl || player.portraitUrl
    : treatment === 'editorial' ? player.portraitEditorialUrl || player.portraitUrl : player.portraitUrl
  return (
    <span className={`player-portrait ${size} ${player.portraitStatus === 'fallback' ? 'fallback' : ''} ${treatment === 'cutout' && player.portraitCutoutUrl ? 'has-cutout' : ''}`}>
      <img src={source} alt="" width="400" height="500" loading="lazy" />
    </span>
  )
}

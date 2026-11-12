import { X } from 'lucide-react'
import type { Player } from '../domain/types'
import { PlayerPortrait } from './PlayerPortrait'

export function PaperTrailGuessHistory({ guesses }: { guesses: Player[] }) {
  if (!guesses.length) return null
  return (
    <section className="trail-guess-history" aria-label="Incorrect suspects">
      <small>RULED OUT</small>
      {guesses.map((player, index) => (
        <article key={player.id}>
          <PlayerPortrait player={player} size="search" />
          <span><b>{player.displayName}</b><small>Suspect {index + 1}</small></span>
          <span className="wrong-stamp"><X /> NO</span>
        </article>
      ))}
    </section>
  )
}

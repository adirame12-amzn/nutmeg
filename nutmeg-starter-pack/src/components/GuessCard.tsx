import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { LineupGuess } from '../domain/types'
import { AttributeTile } from './AttributeTile'
import { PlayerPortrait } from './PlayerPortrait'

export function GuessCard({ guess, index, compact = false }: { guess: LineupGuess, index: number, compact?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const showDetails = !compact || expanded

  const headerContent = (
    <>
      <PlayerPortrait player={guess.player} />
      <div><small>SUSPECT {String(index + 1).padStart(2, '0')}</small><h2>{guess.player.displayName}</h2></div>
      <span className="card-verdict">
        {guess.isCorrect ? 'CASE CLOSED' : compact ? 'FILED' : 'CLEARED'}
        {compact && <ChevronDown className="expand-chevron" size={14} aria-hidden="true" />}
      </span>
    </>
  )

  return (
    <article className={`guess-card ${guess.isCorrect ? 'correct' : ''} ${compact ? 'compact' : ''} ${expanded ? 'expanded' : ''}`} aria-label={`Suspect ${index + 1}: ${guess.player.displayName}`}>
      {compact ? (
        <button className="card-header card-toggle" type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} aria-label={`${expanded ? 'Collapse' : 'Expand'} comparison for ${guess.player.displayName}`}>
          {headerContent}
        </button>
      ) : <header className="card-header">{headerContent}</header>}
      {showDetails && <div className="attribute-grid">
        {guess.comparisons.map(comparison => <AttributeTile comparison={comparison} key={comparison.label} />)}
      </div>}
    </article>
  )
}

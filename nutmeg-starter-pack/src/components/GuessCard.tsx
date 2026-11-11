import { ArrowDown, ArrowUp, Check, ChevronDown, HelpCircle, X } from 'lucide-react'
import { useState } from 'react'
import type { LineupGuess, MatchStatus } from '../domain/types'

function StatusIcon({ status }: { status: MatchStatus }) {
  if (status === 'match') return <Check size={16} aria-hidden="true" />
  if (status === 'higher') return <ArrowUp size={16} aria-hidden="true" />
  if (status === 'lower') return <ArrowDown size={16} aria-hidden="true" />
  if (status === 'unknown') return <HelpCircle size={15} aria-hidden="true" />
  return <X size={15} aria-hidden="true" />
}

export function GuessCard({ guess, index, compact = false }: { guess: LineupGuess, index: number, compact?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const showDetails = !compact || expanded

  const headerContent = (
    <>
      <span className="player-disc">{guess.player.shirtNumber}</span>
      <div><small>GUESS {String(index + 1).padStart(2, '0')}</small><h2>{guess.player.displayName}</h2></div>
      <span className="card-verdict">
        {guess.isCorrect ? 'CORRECT' : compact ? 'REVIEW' : 'CHECKED'}
        {compact && <ChevronDown className="expand-chevron" size={14} aria-hidden="true" />}
      </span>
    </>
  )

  return (
    <article className={`guess-card ${guess.isCorrect ? 'correct' : ''} ${compact ? 'compact' : ''} ${expanded ? 'expanded' : ''}`} aria-label={`Guess ${index + 1}: ${guess.player.displayName}`}>
      {compact ? (
        <button className="card-header card-toggle" type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} aria-label={`${expanded ? 'Collapse' : 'Expand'} comparison for ${guess.player.displayName}`}>
          {headerContent}
        </button>
      ) : <header className="card-header">{headerContent}</header>}
      {showDetails && <div className="attribute-grid">
        {guess.comparisons.map(comparison => (
          <div className={`attribute ${comparison.status}`} key={comparison.label}>
            <small>{comparison.label}</small>
            <span>{comparison.value}<StatusIcon status={comparison.status} /></span>
            <em>{comparison.hint}</em>
          </div>
        ))}
      </div>}
    </article>
  )
}

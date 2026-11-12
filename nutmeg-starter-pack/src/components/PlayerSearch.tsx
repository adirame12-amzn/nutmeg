import { Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { searchPlayers } from '../data/players'
import type { Player } from '../domain/types'
import { PlayerPortrait } from './PlayerPortrait'

export function PlayerSearch({ excludedIds, onSelect, disabled = false, accent = 'orange', pool }: {
  excludedIds: string[]
  onSelect: (player: Player) => void
  disabled?: boolean
  accent?: 'orange' | 'blue'
  pool?: Player[]
}) {
  const [query, setQuery] = useState('')
  const results = useMemo(() => searchPlayers(query, excludedIds, pool), [query, excludedIds, pool])

  const choose = (player: Player) => {
    ;(document.activeElement as HTMLElement | null)?.blur()
    onSelect(player)
    setQuery('')
  }

  return (
    <div className={`player-search ${accent}`}>
      <label className="search-box">
        <Search size={20} aria-hidden="true" />
        <span className="sr-only">Search the suspect pool</span>
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder={disabled ? 'Case complete' : 'Search for a suspect…'}
          autoComplete="off"
          disabled={disabled}
        />
        {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X size={18} /></button>}
      </label>
      {query && !disabled && (
        <div className="search-results" role="listbox" aria-label="Player suggestions">
          {results.length ? results.map(player => (
            <button type="button" role="option" aria-selected="false" key={player.id} onClick={() => choose(player)}>
              {player.portraitUrl ? <PlayerPortrait player={player} size="search" /> : <span className="mini-shirt">{player.shirtNumber}</span>}
              <span><strong>{player.displayName}</strong><small>{player.currentClub} · {player.position}</small></span>
            </button>
          )) : <p>No matching suspects in this player pool.</p>}
        </div>
      )}
    </div>
  )
}

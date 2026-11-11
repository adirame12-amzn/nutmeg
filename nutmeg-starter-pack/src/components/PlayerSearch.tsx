import { Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { searchPlayers } from '../data/players'
import type { Player } from '../domain/types'

export function PlayerSearch({ excludedIds, onSelect, disabled = false, accent = 'orange' }: {
  excludedIds: string[]
  onSelect: (player: Player) => void
  disabled?: boolean
  accent?: 'orange' | 'blue'
}) {
  const [query, setQuery] = useState('')
  const results = useMemo(() => searchPlayers(query, excludedIds), [query, excludedIds])

  const choose = (player: Player) => {
    onSelect(player)
    setQuery('')
  }

  return (
    <div className={`player-search ${accent}`}>
      <label className="search-box">
        <Search size={20} aria-hidden="true" />
        <span className="sr-only">Search the demo player pool</span>
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder={disabled ? 'Game complete' : 'Search a demo player…'}
          autoComplete="off"
          disabled={disabled}
        />
        {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X size={18} /></button>}
      </label>
      {query && !disabled && (
        <div className="search-results" role="listbox" aria-label="Player suggestions">
          {results.length ? results.map(player => (
            <button type="button" role="option" aria-selected="false" key={player.id} onClick={() => choose(player)}>
              <span className="mini-shirt">{player.shirtNumber}</span>
              <span><strong>{player.displayName}</strong><small>{player.currentClub} · {player.position}</small></span>
            </button>
          )) : <p>No fresh matches. Try “Mara”, “Theo” or “Nia”.</p>}
        </div>
      )}
    </div>
  )
}

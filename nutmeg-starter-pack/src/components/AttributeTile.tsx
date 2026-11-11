import { ArrowDown, ArrowUp, Check, HelpCircle, X } from 'lucide-react'
import type { Comparison, MatchStatus } from '../domain/types'

function StatusIcon({ status }: { status: MatchStatus }) {
  if (status === 'match') return <Check size={16} aria-hidden="true" />
  if (status === 'higher') return <ArrowUp size={16} aria-hidden="true" />
  if (status === 'lower') return <ArrowDown size={16} aria-hidden="true" />
  if (status === 'unknown') return <HelpCircle size={15} aria-hidden="true" />
  return <X size={15} aria-hidden="true" />
}

export function AttributeTile({ comparison }: { comparison: Comparison }) {
  return (
    <div className={`attribute ${comparison.status}`}>
      <small>{comparison.label}</small>
      <span>{comparison.value}<StatusIcon status={comparison.status} /></span>
      <em>{comparison.hint}</em>
    </div>
  )
}

import { LockKeyhole, Minus } from 'lucide-react'
import type { ClubEvidence } from '../domain/paperTrail'

export function ClubCard({ club, sequence, revealed, newlyRevealed = false }: {
  club?: ClubEvidence
  sequence: number
  revealed: boolean
  newlyRevealed?: boolean
}) {
  if (!club) {
    return (
      <article className={`club-card slot-${sequence} unavailable`} aria-label={`Club ${sequence} unavailable`}>
        <small>CLUB {String(sequence).padStart(2, '0')}</small>
        <Minus aria-hidden="true" />
        <strong>NO FURTHER<br/>RECORD</strong>
      </article>
    )
  }
  if (!revealed) {
    return (
      <article className={`club-card slot-${sequence} locked`} aria-label={`Club ${sequence} locked`}>
        <small>CLUB {String(sequence).padStart(2, '0')}</small>
        <LockKeyhole aria-hidden="true" />
        <strong>LOCKED</strong>
      </article>
    )
  }
  const initials = club.name.split(/\s+/).filter(Boolean).slice(0, 3).map(word => word[0]).join('')
  return (
    <article className={`club-card slot-${sequence} revealed ${newlyRevealed ? 'newly-revealed' : ''}`} aria-label={`Club ${sequence}: ${club.name}`}>
      <small>CLUB {String(sequence).padStart(2, '0')}</small>
      <div className={`club-crest ${club.crestUrl ? 'has-image' : 'text-mark'}`}>
        {club.crestUrl ? <img src={club.crestUrl} alt="" width="160" height="160" loading="lazy" /> : <span>{initials}</span>}
      </div>
      <strong>{club.name}</strong>
    </article>
  )
}

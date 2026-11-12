import { CircleStop, LockKeyhole, Minus } from 'lucide-react'
import type { ClubEvidence } from '../domain/paperTrail'

export function ClubCard({ club, sequence, revealed, trailEnded = false, newlyRevealed = false }: {
  club?: ClubEvidence
  sequence: number
  revealed: boolean
  trailEnded?: boolean
  newlyRevealed?: boolean
}) {
  if (!club) {
    const endOfTrail = trailEnded
    return (
      <article className={`club-card slot-${sequence} unavailable ${endOfTrail ? 'trail-end' : 'after-trail'}`} aria-label={endOfTrail ? `Club ${sequence}: verified career trail ends here` : `Club ${sequence}: no club after the verified career trail`}>
        <small>CLUB {String(sequence).padStart(2, '0')}</small>
        {endOfTrail ? <CircleStop aria-hidden="true" /> : <Minus aria-hidden="true" />}
        <strong>{endOfTrail ? <>CAREER TRAIL <br/>ENDS HERE</> : <>NO CLUB <br/>IN THIS SLOT</>}</strong>
        <span>{endOfTrail ? 'No further verified senior club in this source' : 'Trail already ended'}</span>
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

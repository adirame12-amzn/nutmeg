import { Award, LockKeyhole } from 'lucide-react'
import { badgeById, type BadgeDefinition } from '../domain/achievements'

export function BadgeMark({ badge, locked = false, small = false }: { badge: BadgeDefinition; locked?: boolean; small?: boolean }) {
  return <span className={`badge-mark ${badge.tier} ${locked ? 'locked' : ''} ${small ? 'small' : ''}`} aria-hidden="true">
    <span>{locked ? <LockKeyhole/> : badge.mark}</span><Award className="badge-ribbon"/>
  </span>
}

export function FeaturedBadge({ badgeId }: { badgeId?: string | null }) {
  const badge = badgeId ? badgeById(badgeId) : undefined
  if (!badge) return null
  return <span className="featured-badge" title={`Featured badge: ${badge.name}`}><BadgeMark badge={badge} small/><span>{badge.name}</span></span>
}

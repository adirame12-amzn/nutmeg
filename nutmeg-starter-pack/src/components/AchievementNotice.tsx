import { ArrowRight, Sparkles } from 'lucide-react'
import { badgeById } from '../domain/achievements'
import { BadgeMark } from './BadgeMark'

export function AchievementNotice({ badgeIds, onView }: { badgeIds?: string[]; onView?: () => void }) {
  const badges = (badgeIds || []).map(badgeById).filter(Boolean)
  if (!badges.length) return null
  const badge = badges[0]!
  return <aside className="achievement-notice" aria-live="polite">
    <BadgeMark badge={badge}/><span><small><Sparkles/> ACHIEVEMENT UNLOCKED</small><strong>{badge.name}{badges.length > 1 ? ` +${badges.length - 1}` : ''}</strong><em>{badge.description}</em></span>
    {onView && <button onClick={onView} aria-label="View badge collection"><ArrowRight/></button>}
  </aside>
}

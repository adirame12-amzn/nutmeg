import type { ClubEvidence } from '../domain/paperTrail'
import { ClubCard } from './ClubCard'

export function CareerGrid({ clubs, revealedCount, revealAll = false, totalClubs = clubs.length }: { clubs: ClubEvidence[]; revealedCount: number; revealAll?: boolean; totalClubs?: number }) {
  return (
    <section className="career-grid" aria-label="Five-card club career trail">
      {Array.from({ length: 5 }, (_, index) => {
        const sequence = index + 1
        const club = clubs[index]
        const revealed = revealAll || index < revealedCount
        return <ClubCard
          key={club?.id || `empty-${sequence}`}
          club={club}
          sequence={sequence}
          revealed={revealed}
          hiddenClub={!club && index < totalClubs}
          trailEnded={!club && index === totalClubs}
          newlyRevealed={!revealAll && sequence === revealedCount && sequence > 1}
        />
      })}
    </section>
  )
}

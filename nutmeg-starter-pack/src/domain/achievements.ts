export type BadgeCategory = 'matchday' | 'consistency' | 'detective' | 'game'
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'rare'

export interface BadgeDefinition {
  id: string
  name: string
  description: string
  category: BadgeCategory
  target: number
  tier: BadgeTier
  mark: string
}

export const BADGES: BadgeDefinition[] = [
  { id: 'debutant', name: 'Debutant', description: 'File your first ranked daily case.', category: 'matchday', target: 1, tier: 'bronze', mark: '01' },
  { id: 'full-90', name: 'Full 90', description: 'Complete all five cases in one Daily Edition.', category: 'matchday', target: 5, tier: 'silver', mark: '90' },
  { id: 'clean-sheet', name: 'Clean Sheet', description: 'Close a case without one wrong move or paid clue.', category: 'matchday', target: 1, tier: 'silver', mark: 'CS' },
  { id: 'hat-trick', name: 'Hat-Trick', description: 'Close three cases perfectly in one day.', category: 'matchday', target: 3, tier: 'gold', mark: '×3' },
  { id: 'perfect-xi', name: 'Perfect XI', description: 'Take the maximum 500 points from a Daily Edition.', category: 'matchday', target: 500, tier: 'rare', mark: 'XI' },
  { id: 'fergie-time', name: 'Fergie Time', description: 'Solve a case with your final permitted attempt.', category: 'matchday', target: 1, tier: 'gold', mark: '90+' },
  { id: 'on-form', name: 'On Form', description: 'Play on three consecutive UTC matchdays.', category: 'consistency', target: 3, tier: 'bronze', mark: '3D' },
  { id: 'first-team-regular', name: 'First Team Regular', description: 'Play on seven consecutive UTC matchdays.', category: 'consistency', target: 7, tier: 'silver', mark: '7D' },
  { id: 'season-ticket-holder', name: 'Season Ticket Holder', description: 'Appear on 30 distinct ranked matchdays.', category: 'consistency', target: 30, tier: 'gold', mark: '30' },
  { id: 'club-legend', name: 'Club Legend', description: 'Complete 100 full five-case Daily Editions.', category: 'consistency', target: 100, tier: 'rare', mark: '100' },
  { id: 'prime-detective', name: 'Prime Detective', description: 'Close your first ranked Prime Suspect file.', category: 'detective', target: 1, tier: 'bronze', mark: 'PS' },
  { id: 'wordsmith', name: 'Wordsmith', description: 'Solve Redacted with no strike or opened evidence.', category: 'game', target: 1, tier: 'gold', mark: 'Aa' },
  { id: 'codebreaker', name: 'Codebreaker', description: 'Crack Cipher first time without assistance.', category: 'game', target: 1, tier: 'gold', mark: 'A↔' },
  { id: 'globetrotter', name: 'Globetrotter', description: 'Solve Paper Trail from the first club alone.', category: 'game', target: 1, tier: 'gold', mark: 'PT' },
  { id: 'venn-diagram', name: 'Venn Diagram', description: 'Find a perfect 3/3 Overlap on your one shot.', category: 'game', target: 1, tier: 'gold', mark: '3/3' },
]

export const badgeById = (id: string) => BADGES.find(badge => badge.id === id)

export const BADGE_CATEGORY_LABELS: Record<BadgeCategory, string> = {
  matchday: 'Matchday honours', consistency: 'Touchline regulars', detective: 'Detective desk', game: 'Case specialists',
}

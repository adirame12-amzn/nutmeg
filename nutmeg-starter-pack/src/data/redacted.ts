import { fc27Players } from './fc27Players'
import { eligibleRedactedCases, selectRedactedCase } from '../domain/redacted'

export const redactedCases = eligibleRedactedCases(fc27Players)

export function getRandomRedactedCase(previousId?: string, random: () => number = Math.random) {
  return selectRedactedCase(fc27Players, previousId, random)
}

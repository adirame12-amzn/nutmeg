import { normalizeRedactedText, type RedactedCase } from './redacted'

export const CIPHER_ATTEMPT_LIMIT = 4
export const CIPHER_POINTS = [100, 75, 50, 25] as const

export function scrambleCipherName(value: string, random: () => number = Math.random) {
  const letters = normalizeRedactedText(value).split('')
  for (let index = letters.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    ;[letters[index], letters[swap]] = [letters[swap], letters[index]]
  }
  if (letters.join('') === normalizeRedactedText(value) && letters.length > 1) letters.push(letters.shift()!)
  return letters
}

export function isCipherAnswer(caseFile: RedactedCase, guess: string) {
  const normalized = normalizeRedactedText(guess)
  return normalized === caseFile.normalizedAnswer || normalized === normalizeRedactedText(caseFile.player.displayName)
}

export function cipherScore(attempts: number, won: boolean) {
  return won && attempts >= 1 && attempts <= CIPHER_ATTEMPT_LIMIT ? CIPHER_POINTS[attempts - 1] : 0
}

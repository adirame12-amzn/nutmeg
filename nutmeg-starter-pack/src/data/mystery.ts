import type { MysteryFact, MysteryQuestion } from '../domain/types'

// Fictional demo puzzle. These facts do not describe a real footballer.
export const mysteryFacts: MysteryFact[] = [
  { id: 'academy', text: 'I was released by a city academy, then returned to the same city as a senior signing.' },
  { id: 'number', text: 'I wore three different shirt numbers before making number 11 my own.' },
  { id: 'final', text: 'My first cup-final goal came after I entered the match from the bench.' }
]

export const mysteryQuestions: MysteryQuestion[] = [
  { id: 'crown', text: 'Do they play in the Crown League?', answer: 'Yes' },
  { id: 'forward', text: 'Are they a forward?', answer: 'Yes' },
  { id: 'left', text: 'Are they left-footed?', answer: 'No' },
  { id: 'older', text: 'Are they older than 25?', answer: 'No' },
  { id: 'northbank', text: 'Do they play for Northbank FC?', answer: 'Yes' }
]

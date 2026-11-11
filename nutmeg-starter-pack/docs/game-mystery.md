# Game 2 — The Mystery

## Experience

One player, three interesting sourced facts, three fixed-menu yes/no questions and three player guesses. Reveal choices do not have to be ordered by easy/medium/hard; first should provoke curiosity, final should meaningfully allow deduction. A mystery must have a fair, unique answer among published eligible players.

## Rules

- Start with clue #1 displayed. User may reveal #2 and #3.
- Ask up to 3 distinct yes/no questions from a larger predefined menu. Answer from snapshot data; optional third response `Not verifiable` must not consume a question or be offered.
- Submit up to 3 unique valid player guesses; win on canonical player ID.
- End screen: correct answer, score or failure, `Why these clues?` provenance links.

## Candidate clue types

Dated club progression; less-obvious early career; overlapping teammates and managers (only with overlapping tenures); awards/records with source; career counts and multinational league histories. Distinctive off-field lore should be curated and verified manually.

## Puzzle content record

`MysteryPuzzle { id, dateUTC, playerId, clueFacts[3], questionSet[], sourceSnapshot, editorialReviewed }`.

Each fact: `text`, `sourceUrl`, `verifiedAt`, `predicateType`, optional `calculationProvenance`. Avoid AI-generated unsourced factual statements.

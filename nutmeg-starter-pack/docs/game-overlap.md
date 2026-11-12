# The Overlap — Cold Cases practice

The Overlap is a timed, browser-only association game. It does not require a detective identity, call the Worker, write to D1, contribute to the weekly table or affect future Press Pass progress.

## Rules

- Press **Open the File** to start a monotonic 30-second timer. Opening the route alone does not start it.
- Each case shows two distinct senior clubs and one national-team country. All three evidence cards have equal weight.
- Search the existing FC 27 prototype catalogue, select one player, then explicitly press **Lock In Answer**. Selecting an autocomplete result never submits it.
- The submitted player is evaluated once and cannot be changed. A timeout without a locked answer scores zero.
- Scores are 0, 10, 40 and 100 for zero, one, two and three matches respectively. Remaining time does not change the score.
- Practice rounds avoid repeating the immediately previous puzzle within the browser session.

## Data authority

Club membership uses the canonical Wikidata club IDs in Paper Trail’s 2026-11-11 senior-appearance snapshot. A player receives a club match only when that verified history contains the exact club ID. National-team country uses the existing `Player.nationalTeam` field as the authoritative prototype value and a normalized internal country ID; display strings are not used for club matching.

Only combinations with at least one verified 3/3 answer and at least one different 2/3 alternative are playable. See `data/generated/overlap/REPORT.md` for coverage and exclusions. This remains prototype data subject to the same source-licence and 2026 eligibility review as the existing catalogue.

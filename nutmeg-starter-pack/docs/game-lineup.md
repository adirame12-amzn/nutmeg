# Game 1 — The Lineup

## Rules

- Launch target: one daily player selected by the server from the eligible 100-player answer pool. The current local prototype instead starts each game with a random answer from its 96-player FC 85+ review pool, excluding the previous answer.
- Six unique valid guesses, searched with aliases/autocomplete from at least the same pool. Consider a broader allowed-guess pool later.
- After each guess, append an expandable **player profile card**, not a dense row or table. Use 2 columns or 3 compact columns of attributes depending on width.
- Compare: current club (as-of snapshot), league, national team/nationality, broad position, age at fixed puzzle date, preferred foot if verified.
- For age, arrow points toward **target**: if target older, ↑; if target younger, ↓. Add numeric or text label so color is not sole indicator.
- If foot/position unavailable, show `Unknown`/not scored rather than making it up.
- Win on exact player ID, not string name.

## UI

- Editorial masthead, `The Lineup`, attempt dots, sticky keyboard-safe search field.
- Search results with text, not necessarily portraits or club trademarks.
- Recent guess as a large elegant card; older cards can collapse. Each has a header and attribute chips.
- End screen shows answer, guesses used, points and shareable spoiler-free result.

## Data contract

`Player { id, displayName, aliases[], dateOfBirth?, nationalTeam?, position?, dominantFoot?, currentClubId?, leagueId?, sourceRefs[], snapshotAt }`.

No production puzzle answer in static frontend assets if score integrity matters. Start with local prototype only, then move answer and validation into Worker/D1.

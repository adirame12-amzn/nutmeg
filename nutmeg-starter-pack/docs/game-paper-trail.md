# Paper Trail — Cold Cases practice and daily ranked case

Paper Trail has two deliberately separate forms. **Cold Cases** is replayable, unranked and browser-only: it never requests a detective identity, calls the Worker, writes to D1 or contributes to the weekly leaderboard. **Ranked Case** stores one shared Paper Trail for each UTC date, validates guesses in the Worker and contributes server-calculated points to the combined weekly table.

## Rules

- Cold Cases selects a local eligible player at random and excludes the immediately previous answer for the browser session. Ranked Case stores one randomly chosen eligible path in D1 for the UTC date, shared by everyone.
- One senior club is visible at the start. Each incorrect player guess reveals the next available club, up to five clubs.
- The player has six distinct guesses. A correct guess scores 100, 85, 70, 55, 40 or 25 by attempt; a miss scores zero. Practice points stay local; ranked points are authoritative and join the weekly table.
- The result reveals the answer, nationality, portrait and complete available club trail.
- The five fixed evidence slots use a three-card first row and a centred two-card second row. The first missing slot clearly marks where the verified career trail ends; later slots remain visually secondary rather than stretching the layout.

In ranked play the Worker returns the first club before the attempt, then one additional club after each incorrect guess until the verified path ends. Future club names and the player answer are not included in the response while the case is still open.

## Data and verification

`python3 -m ingestion.club_history` reads the current 96-player catalogue and audits Wikidata P54 team statements. A stint is eligible only when it has a positive P1350 senior appearance count. National, youth, academy, reserve, B-team and similar claims are excluded conservatively. Repeat spells are deduplicated and ordered from P580/P582 qualifiers where available.

The 2026-11-11 snapshot contains 87 players with at least two eligible senior clubs, including 29 with a five-club trail. Wikidata can be incomplete, so the generated report is marked `editorial_review_required`; this is practice data, not a production claim of complete career history.

Club crests come from Wikidata P154 and Wikimedia Commons metadata. Only allowlisted public-domain, CC0 and CC BY assets are published automatically. The browser uses transparent clean WebP assets so each crest keeps its real colours; the surrounding evidence card carries the Player Press treatment. Missing or review-required art uses a text mark. Attribution is available on the in-app Credits screen.

## Regeneration

```bash
npm run ingest:paper-trail
npm run test:ingestion
```

Use the ingestion command's `--offline` mode to regenerate from the checked cache without network calls. Review `data/generated/paper-trail/REPORT.md` and the crest contact sheet before publishing a new snapshot.

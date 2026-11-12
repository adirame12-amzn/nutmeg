# Paper Trail — local Cold Case practice

Paper Trail is a replayable, unranked game inside the **Cold Case** practice desk. It never calls the ranked Worker, never writes to D1 and never contributes to the weekly leaderboard.

## Rules

- A local eligible player is selected at random; the immediately previous answer is excluded for the browser session.
- One senior club is visible at the start. Each incorrect player guess reveals the next available club, up to five clubs.
- The player has six distinct guesses. A correct guess scores 100, 85, 70, 55, 40 or 25 practice points by attempt; a miss scores zero.
- The result reveals the answer, nationality, portrait and complete available club trail.
- The five fixed evidence slots use a three-card first row and a centred two-card second row. Missing later records remain visibly unavailable rather than stretching the layout.

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

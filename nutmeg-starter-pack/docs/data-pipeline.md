# Player data and offline graph ingestion

## Eligibility and scope

Start with 100 recognizable footballers who have at least one **documented senior appearance in calendar year 2026**, with an explicit cutoff (e.g., 2026-11-11 for the first candidate build). Use both club and international appearances where source coverage is sufficiently reliable. Restrict answer players to the curated set, with popularity bands `star` (30), `regular` (45) and `cult` (25) as an initial editorial quota, not a hard requirement.

## Sources

- **Wikidata**: canonical QIDs, names, aliases, DOB, birthplace, positions, nationality/citizenship, some team affiliations. Claim qualifiers and completeness require inspection; do not assume 'current club' is current.
- **Transfermarkt-derived public dataset** (e.g., `dcaribou/transfermarkt-datasets`): historical appearances and stints; snapshot may stop in mid-2026. Confirm provenance and license before redistribution; availability on GitHub != license to redistribute/monetize.
- **Other permitted verification**: official clubs/leagues or licensed API when data missing. No scraped copyrighted images in initial POC.

## Pipeline

1. Acquire sources via manual download or explicitly rate-limited source API.
2. Normalize identifiers, timezones, dates, club names, aliases and stints.
3. Verify 2026 senior appearance with source, match/date, competition.
4. Curate 100 candidates, balancing recognizability/league/position/nationality.
5. Enrich QIDs and store immutable player snapshot with `asOf` date.
6. Build **offline** TinkerGraph (`Player`, `Club`, `Country`, `Manager`, `Appearance`, `Competition`, `Award`) and dated edges (`PLAYED_FOR`, `REPRESENTS`, `MANAGED`, `APPEARED_IN`, `WON`). Use Gremlin locally for experimental relationship queries.
7. Derive candidate facts and persist provenance. Editorial review before publication.
8. Export sanitized static public fields and restricted server-side answer keys.

## Important graph rule

Never call two footballers teammates solely because both have `PLAYED_FOR` edges to the same club: their tenure windows must overlap. Likewise, match manager tenure against the player's stint.

## Proposed storage

Source snapshots under `data/raw/` are ignored by git if rights or size are uncertain; processed minimal licensed/public data under `data/processed/`; generated puzzle payloads under `data/puzzles/` with secret/answer material in server-controlled storage only.

# Player data and offline graph ingestion

## Eligibility and scope

Start with 100 recognizable footballers who have at least one **documented senior appearance in calendar year 2026**, with an explicit cutoff (e.g., 2026-11-11 for the first candidate build). Use both club and international appearances where source coverage is sufficiently reliable. Restrict answer players to the curated set, with popularity bands `star` (30), `regular` (45) and `cult` (25) as an initial editorial quota, not a hard requirement.

## Sources

- **Wikidata**: canonical QIDs, names, aliases, DOB, birthplace, positions, nationality/citizenship, some team affiliations. Claim qualifiers and completeness require inspection; do not assume 'current club' is current.
- **Transfermarkt-derived public dataset** (e.g., `dcaribou/transfermarkt-datasets`): historical appearances and stints; snapshot may stop in mid-2026. Confirm provenance and license before redistribution; availability on GitHub != license to redistribute/monetize.
- **Other permitted verification**: official clubs/leagues or licensed API when data missing. No scraped copyrighted images in initial POC.

## Implemented playable catalogue

The current browser demo proves the import and card-rendering path with all 96 men rated 85–91 in the source snapshot. For the current product test only, ingestion rejects records outside the source dataset's `Men's Football` category. `ingestion/pipeline.py` retains the original hand-selected preview path; the exact-rating catalogue described below supplies the expanded playable pool. Both paths normalize dates, positions and ages, verify Wikidata identity using date of birth plus nationality (or a DOB-checked manual QID override), and query the official Commons API for the entity's `P18` image.

Portrait publication is allowlist-based. Public-domain, CC0 and CC BY assets can pass automatically; CC BY-SA assets require an explicit review state in the selection file. Published derivatives are 400 × 500 WebP and retain creator, licence and source-page attribution in `data/generated/attributions.json`. Each approved source produces a clean review crop and a non-generative Player Press editorial derivative using deterministic warm duotone, ink contrast and restrained halftone processing. A neutral local illustration is used when a portrait cannot be verified.

The original ten preview players may additionally use a separately reviewed transparent PNG cutout. These cutouts are AI-assisted edits rather than reproducible pipeline outputs, are never substituted automatically, and fall back to the deterministic editorial crop when absent or rejected. They remain attributed derivatives of the reviewed Commons source.

## Exact-rating catalogue

`ingestion/rating_catalog.py` builds a men's catalogue for an exact FC overall. Exact catalogues for ratings 85–91 contain 96 records; `ingestion/merge_catalogs.py` combines them into the playable Prime Suspect pool and a unified SQLite database. Every record can be guessed or selected as the hidden answer. The pipeline exports clean and editorial portraits, JSON, complete attribution metadata, SQLite databases with indexed `players` and `attributions` tables, contact sheets, HTML review galleries and human-readable reports. Identity resolution requires date of birth plus nationality, or date of birth plus an explicit Wikidata footballer description when national labels differ between sources.

This catalogue remains prototype data: its EA-derived source repository has no published redistribution licence, and the attributes have not completed the separate 2026 appearance-eligibility review.

The named FC source repository currently exposes no redistribution licence. Accordingly, the 96-player output is visibly labelled as a prototype with licence review pending; it is not the production candidate pool and does not replace the required 2026 appearance verification.

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

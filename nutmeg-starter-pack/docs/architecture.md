# Player Press architecture

## Phase 1: static proof of concept

- React + TypeScript + Vite, Tailwind CSS, PWA manifest/service-worker with careful caching.
- GitHub Pages from public repo, base path `/nutmeg/`, fallback for client routes or hash-based navigation.
- Local **synthetic** player fixtures; no production user identity or shared results yet.
- UI renders cards, clues and leaderboard mock with no claim of persistence.

## Phase 2: shared Prime Suspect alpha (implemented, deployment pending)

- The implemented Cloudflare Worker is authoritative for the UTC daily target, six-guess limit, comparisons, scoring and weekly results. The **Cold Case** practice desk remains entirely local; its Prime Suspect practice rounds and Paper Trail do not call the Worker or write to D1.
- D1 contains `players`, `users`, `daily_puzzles`, `attempts`, and `attempt_guesses`. A scheduled event creates one puzzle row at 00:00 UTC; the first request is an idempotent fallback.
- A user claims a case-insensitively unique detective name. A random bearer token stays in browser storage while D1 stores only its SHA-256 hash. No email, password, login screen, cross-device recovery, or recovery code is included.
- A unique `(user_id, puzzle_id)` attempt and unique guess rows enforce one ranked result per browser identity per day. Points are 100/80/65/50/35/20 for guesses one through six, and zero for a miss.
- Anonymous browser identities limit identity assurance and cannot stop determined users from creating multiple identities. Rate limiting and private friend groups remain future work.

## Offline graph

TinkerGraph + Gremlin run in a local or scheduled pipeline and export verified facts. No always-on graph server required. Hosted Neo4j is an optional future experiment but uses Cypher, not Gremlin.

## Cost discipline

Use free quotas only; check live service limits before deployment. Do not rely on a trial or paid APIs. Add alarms/usage checks and degrade gracefully if quotas are exceeded. GitHub Pages cannot itself securely validate competitive scores.

## Separation

`src/domain/` game rules; `src/data/` adapters; `src/api/` Worker client; `src/components/` UI; `worker/` ranked API and D1 migrations; `ingestion/` ETL+graph; `docs/` decision log and specifications.

Paper Trail is intentionally split from ranked play: generated club-history JSON and approved crest assets ship with the static frontend, while all attempt state is ephemeral React/session state. The earlier three-clue Mystery prototype remains in source for later editorial work but is not exposed in current navigation.

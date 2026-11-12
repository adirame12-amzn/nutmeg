# Player Press architecture

## Phase 1: static proof of concept

- React + TypeScript + Vite, Tailwind CSS, PWA manifest/service-worker with careful caching.
- GitHub Pages from public repo, base path `/nutmeg/`, fallback for client routes or hash-based navigation.
- Local **synthetic** player fixtures; no production user identity or shared results yet.
- UI renders cards, clues and leaderboard mock with no claim of persistence.

## Phase 2: shared daily cases alpha

- The Cloudflare Worker is authoritative for the UTC daily Prime Suspect and Paper Trail targets, six-guess limits, comparisons/reveals, scoring and combined weekly results. The **Cold Cases** practice desk remains entirely local; its replayable games do not call the Worker, request a detective identity or write to D1.
- Prime Suspect uses `players`, `daily_puzzles`, `attempts`, and `attempt_guesses`. Ranked Paper Trail adds `paper_trail_paths`, `paper_trail_daily_puzzles`, `paper_trail_attempts`, and `paper_trail_guesses`. `users` is shared. A scheduled event creates both puzzle rows at 00:00 UTC; each first request is an idempotent fallback.
- A user claims a case-insensitively unique detective name. A random bearer token stays in browser storage while D1 stores only its SHA-256 hash. No email, password, login screen, cross-device recovery, or recovery code is included.
- A unique `(user_id, puzzle_id)` attempt and unique guess rows enforce one result per mode, browser identity and day. Prime Suspect points are 100/80/65/50/35/20; Paper Trail points are 100/85/70/55/40/25. A miss scores zero. The weekly query unions completed attempts from both modes before aggregation.
- Anonymous browser identities limit identity assurance and cannot stop determined users from creating multiple identities. Rate limiting and private friend groups remain future work.

## Offline graph

TinkerGraph + Gremlin run in a local or scheduled pipeline and export verified facts. No always-on graph server required. Hosted Neo4j is an optional future experiment but uses Cypher, not Gremlin.

## Cost discipline

Use free quotas only; check live service limits before deployment. Do not rely on a trial or paid APIs. Add alarms/usage checks and degrade gracefully if quotas are exceeded. GitHub Pages cannot itself securely validate competitive scores.

## Separation

`src/domain/` game rules; `src/data/` adapters; `src/api/` Worker client; `src/components/` UI; `worker/` ranked API and D1 migrations; `ingestion/` ETL+graph; `docs/` decision log and specifications.

Paper Trail uses one reviewed history source in two isolated runtimes. Approved JSON and crest assets ship with the static frontend for ephemeral Cold Cases practice; the seed exporter writes reviewed paths into D1 for server-authoritative daily play. A ranked daily puzzle freezes its complete club path, returns only earned clues while playing, and reveals the answer only after completion. The earlier three-clue Mystery prototype remains in source for later editorial work but is not exposed in current navigation.

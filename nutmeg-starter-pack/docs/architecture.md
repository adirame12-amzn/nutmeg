# Player Press architecture

## Phase 1: static proof of concept

- React + TypeScript + Vite, Tailwind CSS, PWA manifest/service-worker with careful caching.
- GitHub Pages from public repo, base path `/nutmeg/`, fallback for client routes or hash-based navigation.
- Local **synthetic** player fixtures; no production user identity or shared results yet.
- UI renders cards, clues and leaderboard mock with no claim of persistence.

## Phase 2: shared games

- Cloudflare Worker is authoritative for session, daily target, guesses, yes/no Q&A, scoring and puzzle end.
- Cloudflare D1 contains `players`, `snapshots`, `puzzles`, `puzzle_attempts`, `sessions`, `groups`, `group_members`, `results`.
- Create server-issued random sessions; prefer secure HttpOnly cookies when same-site deployment permits, otherwise carefully design origin/CORS and token handling. `display_name` is presentation, not authentication.
- Restrict attempts per session/puzzle transactionally; enforce uniqueness of daily result; rate limit where available; tie private groups to opaque invitation tokens.
- Be clear: anonymous sessions limit identity assurance; prevent simple cheating but not determined Sybil users. Provide recovery codes later.

## Offline graph

TinkerGraph + Gremlin run in a local or scheduled pipeline and export verified facts. No always-on graph server required. Hosted Neo4j is an optional future experiment but uses Cypher, not Gremlin.

## Cost discipline

Use free quotas only; check live service limits before deployment. Do not rely on a trial or paid APIs. Add alarms/usage checks and degrade gracefully if quotas are exceeded. GitHub Pages cannot itself securely validate competitive scores.

## Separation

`src/domain/` game rules; `src/data/` adapters; `src/components/` UI; `worker/` future API; `ingestion/` ETL+graph; `docs/` decision log and specifications.

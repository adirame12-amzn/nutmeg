# Nutmeg

**Daily football trivia. Uncover stories. Compete with friends.**

Nutmeg is a mobile-first browser game with two modes: **The Lineup**, which uses player-attribute comparisons, and **The Mystery**, which reveals surprising verified football facts. Both use a shared, curated universe of approximately 100 recognizable footballers with documented senior appearances in 2026.

## Status

Product/design specification and starter references only. No playable app, API integration, database, authentication, or leaderboard has been implemented in this repository yet.

## Product rules

- **The Lineup**: find the daily player in up to 6 player guesses. After each valid guess, show a **player card**, not a table row, with club, league, nationality, position, age and preferred-foot comparisons. Show up/down arrows only on ordered attributes (e.g., age). All comparisons are against the target player's frozen puzzle snapshot.
- **The Mystery**: 3 editorial facts, up to 3 predefined yes/no questions, and up to 3 player guesses. Reveal facts by choice; facts must be sourced and reviewed before publication.
- **Difficulty**: based on the mystery player's popularity/obscurity (star, regular, cult), **not** generic easy/medium/hard clues.
- **Competition**: one puzzle per mode per UTC day; private friend groups and scoreboards. Anonymous identity can begin with a display name and server-issued session; names alone are not secure identity.

## Implementation approach

- Frontend: React + TypeScript + Vite + Tailwind; installable PWA; optimized for 390px mobile browsers.
- Hosting: GitHub Pages (public repository; Vite base path `/nutmeg/`) or Cloudflare Pages. No paid dependencies.
- Future backend: Cloudflare Workers + D1 for secured answers, attempts, anonymous sessions, and leaderboards. Validate on server, not in the browser.
- Data: inspect rights/terms for Transfermarkt-derived datasets; enrich factual fields using Wikidata; verify 2026 appearances and current club separately. TinkerPop TinkerGraph/Gremlin can run **offline**, not as a 24/7 server.

See [product specification](docs/product-requirements.md), [architecture](docs/architecture.md), [data plan](docs/data-pipeline.md), [game specifications](docs/game-lineup.md) and [Mystery](docs/game-mystery.md), [design system](docs/design-system.md), and [roadmap](docs/roadmap.md).

Reference images: [mobile cards](design/mobile-card-layout.png) and [original editorial direction](design/mobile-editorial-reference.png). These are concept mockups, **not** final player-data truth or licensed assets for production.

## Start with Codex

Open this repository in Codex and ask it to follow `AGENTS.md`. First milestone: responsive static frontend using synthetic fixture data and local-only gameplay; no secret puzzle answers should be shipped once shared competitive play is enabled.

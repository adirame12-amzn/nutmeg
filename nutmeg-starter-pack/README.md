# Nutmeg

**Daily football trivia. Uncover stories. Compete with friends.**

Nutmeg is a mobile-first browser game with two local demo modes: **The Lineup**, which uses stacked player comparison cards, and **The Mystery**, which combines three fictional clues with fixed yes/no questions. The visual direction is a warm football newspaper with high-energy orange and cobalt accents.

## Current implementation status

Milestone A is playable as a static proof of concept:

- Home, The Lineup, The Mystery, result, and friends-leaderboard demo screens.
- Six-guess Lineup with keyboard-friendly player search, duplicate prevention, deterministic comparisons, age directions, stacked player cards, scoring, and replay.
- Mystery with three explicitly fictional demo facts, three predetermined yes/no questions, three player guesses, deterministic scoring, and a result screen.
- Responsive mobile shell designed at 390px and adapted for 320px, 768px, and desktop.
- Installable PWA assets and offline shell generated at build time.
- GitHub Pages workflow using the repository base path `/nutmeg/`.
- Unit tests for comparisons, guess limits, reveal limits, scores, and the core Lineup interaction.

All player names, clubs, facts, and gameplay records in `src/data/` are **synthetic fixtures**. They are not real football claims and are not suitable for publishing as a factual daily puzzle.

The leaderboard is visual sample data only. There is no authentication, shared state, server score validation, anti-cheat, public leaderboard, or production puzzle secrecy in this static build.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The development URL includes `/nutmeg/` because the production site is configured for GitHub Pages at that base path.

## Test and build

```bash
npm test
npm run build
npm run preview
```

The production output is written to `dist/`. The build also generates the web app manifest and service worker.

## GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` tests and builds on pushes to `main`, then uploads `dist/` with GitHub's official Pages actions. In repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. The expected project URL shape is:

```text
https://<account>.github.io/nutmeg/
```

This repository has not been deployed by the implementation task, so no live URL is claimed here.

## Architecture

- `src/domain/`: framework-independent rules, comparisons, limits, and scoring.
- `src/data/`: replaceable synthetic fixture adapter.
- `src/components/`: reusable app chrome, search, and stacked guess cards.
- `src/screens/`: home and game experiences.
- `docs/`: product, design, data, and future backend specifications.

For shared play, move puzzle targets, attempt enforcement, and score calculation to the planned Cloudflare Worker/D1 backend before treating results as authoritative. See the [product specification](docs/product-requirements.md), [architecture](docs/architecture.md), [data plan](docs/data-pipeline.md), [Lineup rules](docs/game-lineup.md), [Mystery rules](docs/game-mystery.md), [design system](docs/design-system.md), and [roadmap](docs/roadmap.md).

Reference images: [mobile cards](design/mobile-card-layout.png) and [original editorial direction](design/mobile-editorial-reference.png). They are concept mockups, not production player-data truth or licensed player imagery.

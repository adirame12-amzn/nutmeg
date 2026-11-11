# Player Press

**Every player leaves clues.**

Player Press is a mobile-first football case-solving game with two local demo modes: **Prime Suspect**, which uses stacked player comparison cards, and **Cold Case**, which combines three fictional clues with fixed yes/no questions. The visual direction is a warm investigative football newspaper with high-energy orange and cobalt accents.

## Current implementation status

Milestone A is playable as a static proof of concept. Prime Suspect currently includes a 96-player real-data prototype pool:

- Home, Prime Suspect, Cold Case, case-report, and friends-leaderboard demo screens.
- Six-suspect Prime Suspect using 96 imported FC 27 snapshot records, accent-insensitive aliases, reviewed portraits, deterministic comparisons, age/OVR directions, stacked player cards, scoring, and replay.
- Cold Case with three explicitly fictional demo facts, three predetermined yes/no questions, three player guesses, deterministic scoring, and a case-report screen.
- Responsive mobile shell designed at 390px and adapted for 320px, 768px, and desktop.
- Installable PWA assets and offline shell generated at build time.
- GitHub Pages workflow using the repository base path `/nutmeg/`.
- Unit tests for comparisons, guess limits, reveal limits, scores, and the core Prime Suspect interaction.

The 96-player Prime Suspect prototype contains every men's record rated 85–91 in the source snapshot. Each new local case randomly selects an answer from the full pool; the previous answer is excluded from the next case. Ingestion is restricted to the source dataset's `Men's Football` category and rejects other categories. Records come from the [EA FC Analysis repository](https://github.com/LakshmiKanth11/EA_FC_ANALYSIS), snapshot 2026-09-12. That repository currently exposes no redistribution licence, so the app visibly marks this data as **prototype / licence review required**. These records also have not completed Player Press's separate 2026 senior-appearance eligibility review and are not production answer candidates.

The Cold Case names, clubs, and facts remain **synthetic fixtures**. They are not real football claims.

All 96 portraits were identity-matched with Wikidata and reviewed from Wikimedia Commons metadata. The pipeline publishes both a clean 400 × 500 WebP and a deterministic warm-duotone, ink-contrast and halftone editorial derivative. The clean crop is retained for review and credits. Image attribution is exposed on the in-app Credits screen. Player Press's original neutral fallback remains available whenever a future record lacks an approved image.

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

## Player ingestion pipeline

The raw FC CSV is intentionally ignored by git. Place it at `data/raw/players.csv`, or pass its local path explicitly. Python 3.11+ is recommended.

```bash
python3 -m pip install -r ingestion/requirements.txt
npm run ingest:players
# or: npm run ingest:players -- --source /absolute/path/to/players.csv
npm run ingest:rating-85 -- --source /absolute/path/to/players.csv
npm run test:ingestion
```

The importer reads `data/selected_players.csv`, resolves identity through the official Wikidata API, retrieves only the Wikidata `P18` file through the Wikimedia Commons API, records creator/licence/source URL, creates clean and editorial 400 × 500 WebP portraits, and emits public JSON plus a human-readable report under `data/generated/`. API responses are cached in ignored `data/cache/`; an existing reviewed portrait is not redownloaded or overwritten. Use `--offline` for cache-only runs and `--dry-run` to validate without publishing outputs.

The rating-catalogue command builds every men's record at one exact FC rating. Catalogues for ratings 85 through 91 contain 96 verified identities, 96 clean portraits, 96 newspaper-style derivatives, attribution metadata, browser-ready JSON, queryable SQLite databases, contact sheets and HTML review galleries. `npm run merge:rating-85-plus` creates the combined frontend JSON and `data/generated/rating-85-plus/players.sqlite`. All 96 records are valid guesses and possible answers. Assets live under `public/players/rating-*/`. To target another exact rating, run `python3 -m ingestion.rating_catalog --rating <number> --source <csv>`.

## GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` tests and builds on pushes to `main`, then uploads `dist/` with GitHub's official Pages actions. Pages uses **GitHub Actions** as its build source. The live prototype is available at:

```text
https://adirame12-amzn.github.io/nutmeg/
```

## Architecture

- `src/domain/`: framework-independent rules, comparisons, limits, and scoring.
- `src/data/`: separate synthetic Cold Case fixtures and generated Prime Suspect adapter.
- `ingestion/`: source adapter, identity resolution, Commons metadata/licence policy, image processing, and offline unit tests.
- `data/generated/`: public player JSON, mappings, attributions, SQLite catalogue, and ingestion reports.
- `src/components/`: reusable app chrome, search, and stacked guess cards.
- `src/screens/`: home and game experiences.
- `docs/`: product, design, data, and future backend specifications.

For shared play, move puzzle targets, attempt enforcement, and score calculation to the planned Cloudflare Worker/D1 backend before treating results as authoritative. See the [product specification](docs/product-requirements.md), [architecture](docs/architecture.md), [data plan](docs/data-pipeline.md), [Prime Suspect rules](docs/game-lineup.md), [Cold Case rules](docs/game-mystery.md), [design system](docs/design-system.md), and [roadmap](docs/roadmap.md).

Reference images: [mobile cards](design/mobile-card-layout.png) and [original editorial direction](design/mobile-editorial-reference.png). They are concept mockups, not production player-data truth or licensed player imagery.

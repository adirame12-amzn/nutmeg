# Player Press

**Every player leaves clues.**

Player Press is a mobile-first football case-solving game. **Prime Suspect** now supports a shared server-validated daily case and weekly leaderboard; **Cold Case** remains a local fictional demo with three clues and fixed yes/no questions. The visual direction is a warm investigative football newspaper with high-energy orange and cobalt accents.

## Current implementation status

Milestone A is playable and the shared Prime Suspect alpha is implemented locally. Production Cloudflare deployment still needs an account-owned D1 database:

- Home, Prime Suspect, Cold Case, case-report, unique-name onboarding, and weekly leaderboard screens.
- One server-stored Prime Suspect per UTC date for everyone, created by a 00:00 UTC cron with an idempotent first-request fallback.
- Browser-bound unique detective names without email/password login or recovery, and server-authoritative guesses and scores.
- Weekly Monday–Sunday UTC table. Prime Suspect awards 100, 80, 65, 50, 35, or 20 points by successful guess; an unsolved case scores zero.
- Six-suspect Prime Suspect using 96 imported FC 27 snapshot records, accent-insensitive aliases, reviewed portraits, deterministic comparisons, age/OVR directions, stacked player cards, scoring, and replay.
- Cold Case with three explicitly fictional demo facts, three predetermined yes/no questions, three player guesses, deterministic scoring, and a case-report screen.
- Responsive mobile shell designed at 390px and adapted for 320px, 768px, and desktop.
- Installable PWA assets and offline shell generated at build time.
- GitHub Pages workflow using the repository base path `/nutmeg/`.
- Unit tests for comparisons, guess limits, reveal limits, scores, and the core Prime Suspect interaction.

The 96-player Prime Suspect prototype contains every men's record rated 85–91 in the source snapshot. Ranked mode stores one randomly selected answer in D1 for each UTC date; the static fallback still opens random local quick cases. Ingestion is restricted to the source dataset's `Men's Football` category and rejects other categories. Records come from the [EA FC Analysis repository](https://github.com/LakshmiKanth11/EA_FC_ANALYSIS), snapshot 2026-09-12. That repository currently exposes no redistribution licence, so the app visibly marks this data as **prototype / licence review required**. These records also have not completed Player Press's separate 2026 senior-appearance eligibility review and are not production answer candidates.

The Cold Case names, clubs, and facts remain **synthetic fixtures**. They are not real football claims.

All 96 portraits were identity-matched with Wikidata and reviewed from Wikimedia Commons metadata. The pipeline publishes a clean 400 × 500 WebP, a transparent local U²-Net cutout, and deterministic warm-duotone, ink-contrast and halftone editorial derivatives. Automated cutouts are marked `auto_review_pending` until their generated contact sheet is visually approved; the underlying source crop is retained for review and credits. Image attribution is exposed on the in-app Credits screen. Player Press's original neutral fallback remains available whenever a future record lacks an approved image.

When `VITE_API_URL` is absent, the GitHub Pages build deliberately falls back to unranked local play and explains that the case desk is disconnected. The implemented Worker keeps the target secret until the attempt ends and validates scores, but anonymous browser identities are not strong authentication or full anti-cheat.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The development URL includes `/nutmeg/` because the production site is configured for GitHub Pages at that base path.

To run ranked mode locally after `npm install`:

```bash
npm run worker:seed
npm run worker:migrate:local
npm run worker:seed:local
npm run worker:dev
VITE_API_URL=http://127.0.0.1:8787 npm run dev
```

## Test and build

```bash
npm test
npm run build
npm run preview
```

The production output is written to `dist/`. The build also generates the web app manifest and service worker.

## Player ingestion pipeline

The raw FC CSV is intentionally ignored by git. Place it at `data/raw/players.csv`, or pass its local path explicitly. Python 3.11–3.13 is recommended.

```bash
python3 -m pip install -r ingestion/requirements.txt
npm run ingest:players
# or: npm run ingest:players -- --source /absolute/path/to/players.csv
npm run ingest:rating-85 -- --source /absolute/path/to/players.csv
npm run merge:rating-85-plus
npm run process:cutouts
npm run test:ingestion
```

The importer reads `data/selected_players.csv`, resolves identity through the official Wikidata API, retrieves only the Wikidata `P18` file through the Wikimedia Commons API, records creator/licence/source URL, creates clean and editorial 400 × 500 WebP portraits, and emits public JSON plus a human-readable report under `data/generated/`. API responses are cached in ignored `data/cache/`; an existing reviewed portrait is not redownloaded or overwritten. Use `--offline` for cache-only runs and `--dry-run` to validate without publishing outputs.

The rating-catalogue command builds every men's record at one exact FC rating. Catalogues for ratings 85 through 91 contain 96 verified identities, 96 clean portraits, 96 newspaper-style derivatives, attribution metadata, browser-ready JSON, queryable SQLite databases, contact sheets and HTML review galleries. `npm run merge:rating-85-plus` creates the combined frontend JSON and `data/generated/rating-85-plus/players.sqlite`. `npm run process:cutouts` runs the local U²-Net human-segmentation model, removes disconnected mask debris, creates transparent PNG plus alpha-preserving newspaper WebP assets, updates catalogue metadata and writes `cutouts-contact-sheet.jpg` for visual QA. Use Python 3.11–3.13 for that optional processing step. All 96 records are valid guesses and possible answers. Assets live under `public/players/rating-*/`. To target another exact rating, run `python3 -m ingestion.rating_catalog --rating <number> --source <csv>`.

## GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` tests and builds on pushes to `main`, then uploads `dist/` with GitHub's official Pages actions. Pages uses **GitHub Actions** as its build source. Add the deployed Worker origin (without `/api`) as the repository Actions variable `VITE_API_URL`; without it, Pages remains safely playable in unranked mode. The current static prototype is available at:

```text
https://adirame12-amzn.github.io/nutmeg/
```

## Architecture

- `src/domain/`: framework-independent rules, comparisons, limits, and scoring.
- `src/api/`: typed ranked Worker client and browser identity persistence.
- `src/data/`: separate synthetic Cold Case fixtures and generated Prime Suspect adapter.
- `ingestion/`: source adapter, identity resolution, Commons metadata/licence policy, image processing, and offline unit tests.
- `data/generated/`: public player JSON, mappings, attributions, SQLite catalogue, and ingestion reports.
- `src/components/`: reusable app chrome, search, and stacked guess cards.
- `src/screens/`: home and game experiences.
- `docs/`: product, design, data, and future backend specifications.
- `worker/`: Cloudflare Worker routes, D1 migration, generated player seed, UTC scheduler, and ranked rule tests.

For shared play, move puzzle targets, attempt enforcement, and score calculation to the planned Cloudflare Worker/D1 backend before treating results as authoritative. See the [product specification](docs/product-requirements.md), [architecture](docs/architecture.md), [data plan](docs/data-pipeline.md), [Prime Suspect rules](docs/game-lineup.md), [Cold Case rules](docs/game-mystery.md), [design system](docs/design-system.md), and [roadmap](docs/roadmap.md).

Reference images: [mobile cards](design/mobile-card-layout.png) and [original editorial direction](design/mobile-editorial-reference.png). They are concept mockups, not production player-data truth or licensed player imagery.

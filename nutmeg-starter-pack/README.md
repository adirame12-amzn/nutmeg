# Player Press

**Every player leaves clues.**

Player Press is a mobile-first football case-solving game. **Ranked Cases** serves shared server-validated daily Prime Suspect, Paper Trail, Redacted and Cipher cases plus a combined weekly leaderboard; **Cold Cases** is the local, unlimited practice desk for Prime Suspect, Paper Trail, Redacted, The Cipher and The Overlap, plus an early visual preview of The Wire. The visual direction is a warm investigative football newspaper with high-energy orange and cobalt accents.

## Current implementation status

Milestone A is playable and the shared ranked alpha is deployed with an account-owned Cloudflare Worker and D1 database:

- Home with explicit Ranked Case and Cold Cases practice desks, Prime Suspect, Paper Trail, case-report, unique-name onboarding, and weekly leaderboard screens.
- One server-stored puzzle per UTC date for Prime Suspect, Paper Trail, Redacted and The Cipher, created by a 00:00 UTC cron with an idempotent first-request fallback.
- Browser-bound unique detective names without email/password login or recovery, and server-authoritative guesses and scores.
- Weekly Monday–Sunday UTC table combining all four ranked cases. Scores and optional-evidence deductions are calculated by the Worker; an unsolved case scores zero.
- Six-suspect Prime Suspect using 96 imported FC 27 snapshot records, accent-insensitive aliases, reviewed portraits, deterministic comparisons, age/OVR directions, stacked player cards, scoring, and replay.
- Local and daily ranked Paper Trail with progressive senior-club reveals, six guesses, 87 eligible histories, clean-colour club crests and a complete case-report reveal. Ranked play keeps unrevealed clubs and the answer server-side.
- Browser-only Redacted practice with accent-safe letter matching, six strikes, optional full-player guesses, evidence unlocks, local scoring and versioned local statistics.
- Local and daily ranked Cipher with four attempts. Nation and club evidence become available after two and three misses, remain sealed until deliberately opened, and cost ten points each.
- Browser-only The Overlap with a monotonic 20-second timer, one locked answer, three equal evidence cards, deterministic 0/10/40/100 scoring and 156 audited club-pair/country puzzles. Cipher, Redacted and Paper Trail Cold Cases use the same evidence-gated 20-second practice clock; ranked daily cases remain untimed until their deadline can be server-authoritative.
- A clearly labelled, non-playable The Wire practice mockup demonstrating the intended vertical club graph and exactly two emphasized active clubs. Its verified route engine, timer and scoring are not implemented yet.
- Staggered deal-in, sheen and tactile hover/press motion for Cold Cases cards, with reduced-motion support.
- Responsive mobile shell designed at 390px and adapted for 320px, 768px, and desktop.
- Installable PWA assets and offline shell generated at build time.
- GitHub Pages workflow using the repository base path `/nutmeg/`.
- Unit tests for comparisons, guess limits, reveal limits, scores, and the core Prime Suspect interaction.

The 96-player Prime Suspect prototype contains every men's record rated 85–91 in the source snapshot. Ranked mode stores one randomly selected answer in D1 for each UTC date; the static fallback still opens random local quick cases. Ingestion is restricted to the source dataset's `Men's Football` category and rejects other categories. Records come from the [EA FC Analysis repository](https://github.com/LakshmiKanth11/EA_FC_ANALYSIS), snapshot 2026-09-12. That repository currently exposes no redistribution licence, so the app visibly marks this data as **prototype / licence review required**. These records also have not completed Player Press's separate 2026 senior-appearance eligibility review and are not production answer candidates.

The earlier three-clue Mystery prototype remains in source for later editorial work but is intentionally hidden from current navigation.

All 96 portraits were identity-matched with Wikidata and reviewed from Wikimedia Commons metadata. The pipeline publishes a clean 400 × 500 WebP, a transparent local U²-Net cutout, and deterministic warm-duotone, ink-contrast and halftone editorial derivatives. Automated cutouts are marked `auto_review_pending` until their generated contact sheet is visually approved; the underlying source crop is retained for review and credits. Image attribution is exposed on the in-app Credits screen. Player Press's original neutral fallback remains available whenever a future record lacks an approved image.

Production builds default to the deployed Player Press Worker; `VITE_API_URL` can override its origin. Local development without that variable deliberately falls back to unranked play. The Worker keeps the target secret until the attempt ends and validates scores, but anonymous browser identities are not strong authentication or full anti-cheat.

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
npm run ingest:paper-trail
# after checking out JoseArroyave/football-logos at the pinned commit:
npm run backfill:club-crests -- --source /absolute/path/to/football-logos
npm run test:ingestion
```

The importer reads `data/selected_players.csv`, resolves identity through the official Wikidata API, retrieves only the Wikidata `P18` file through the Wikimedia Commons API, records creator/licence/source URL, creates clean and editorial 400 × 500 WebP portraits, and emits public JSON plus a human-readable report under `data/generated/`. API responses are cached in ignored `data/cache/`; an existing reviewed portrait is not redownloaded or overwritten. Use `--offline` for cache-only runs and `--dry-run` to validate without publishing outputs.

The rating-catalogue command builds every men's record at one exact FC rating. Catalogues for ratings 85 through 91 contain 96 verified identities, 96 clean portraits, 96 newspaper-style derivatives, attribution metadata, browser-ready JSON, queryable SQLite databases, contact sheets and HTML review galleries. `npm run merge:rating-85-plus` creates the combined frontend JSON and `data/generated/rating-85-plus/players.sqlite`. `npm run process:cutouts` runs the local U²-Net human-segmentation model, removes disconnected mask debris, creates transparent PNG plus alpha-preserving newspaper WebP assets, updates catalogue metadata and writes `cutouts-contact-sheet.jpg` for visual QA. Use Python 3.11–3.13 for that optional processing step. All 96 records are valid guesses and possible answers. Assets live under `public/players/rating-*/`. To target another exact rating, run `python3 -m ingestion.rating_catalog --rating <number> --source <csv>`.

`npm run ingest:paper-trail` audits Wikidata P54 club statements for all 96 current players, requires a positive P1350 senior appearance count, and exports 87 eligible histories. It resolves P154 crests through Commons metadata and publishes only allowlisted assets. `npm run backfill:club-crests` fills reviewed gaps from the explicitly pinned MIT-licensed `JoseArroyave/football-logos` checkout, rejects executable/external SVG constructs, and records per-club provenance. Current coverage is 59 Commons crests, 113 repository backfills and seven clearly labelled generated editorial badges, so every one of the 179 club records has a visual asset. Club marks remain their owners’ trademarks and are used for identification. Generated outputs, attribution and the review report live under `data/generated/paper-trail/`; browser assets live under `public/clubs/`. `npm run worker:seed` exports the same reviewed histories into D1 seed SQL for ranked play, while Cold Cases continues to read the static browser copy and makes no Worker calls.

## GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` tests and builds on pushes to `main`, then uploads `dist/` with GitHub's official Pages actions. Pages uses **GitHub Actions** as its build source. Production builds use the deployed Worker below by default; the repository Actions variable `VITE_API_URL` can override that origin. The public app is available at:

```text
https://adirame12-amzn.github.io/nutmeg/
```

Ranked API health endpoint:

```text
https://player-press-ranked.adirame12.workers.dev/api/health
```

## Architecture

- `src/domain/`: framework-independent rules, comparisons, limits, and scoring, including Redacted, Cipher and The Overlap.
- `src/api/`: typed ranked Worker client and browser identity persistence.
- `src/data/`: generated player and Paper Trail adapters, The Overlap’s audited puzzle generator, plus the hidden legacy Mystery fixtures.
- `ingestion/`: source adapter, identity resolution, Commons metadata/licence policy, image processing, and offline unit tests.
- `data/generated/`: public player JSON, mappings, attributions, SQLite catalogue, and ingestion reports.
- `src/components/`: reusable app chrome, search, and stacked guess cards.
- `src/screens/`: home and game experiences.
- `docs/`: product, design, data, and future backend specifications.
- `worker/`: Cloudflare Worker routes, D1 migration, generated player seed, UTC scheduler, and ranked rule tests.

For shared play, keep puzzle targets, attempt enforcement, and score calculation in the Cloudflare Worker/D1 backend before treating results as authoritative. Cold Cases practice remains deliberately browser-only and unranked. See the [product specification](docs/product-requirements.md), [architecture](docs/architecture.md), [data plan](docs/data-pipeline.md), [Prime Suspect rules](docs/game-lineup.md), [Paper Trail rules](docs/game-paper-trail.md), [Redacted rules](docs/game-redacted.md), [Cipher rules](docs/game-cipher.md), [The Overlap rules](docs/game-overlap.md), [The Wire preview](docs/game-the-wire.md), [legacy Mystery rules](docs/game-mystery.md), [design system](docs/design-system.md), and [roadmap](docs/roadmap.md).

Reference images: [mobile cards](design/mobile-card-layout.png) and [original editorial direction](design/mobile-editorial-reference.png). They are concept mockups, not production player-data truth or licensed player imagery.

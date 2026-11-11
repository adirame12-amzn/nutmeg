# Codex working instructions — Nutmeg

Read `README.md` and all relevant files in `docs/` before implementing features. The repository is in a specification-first state; do not assume existing UI or backend code.

## Product commitments

- Nutmeg is a **mobile-first football trivia PWA**, playable in a browser. Build around a 390px viewport and test at 320px, 390px, 768px, and desktop.
- Two independent modes: **The Lineup** (six guesses, attribute comparisons as **stacked player cards**) and **The Mystery** (three facts, max three yes/no questions, max three player guesses).
- Candidate pool starts at 100 **curated recognizable players with verified senior appearances during calendar 2026 up to a documented snapshot cutoff**. Never fabricate player records, transfers, clubs, award facts, or citations.
- Obscurity belongs to the **answer player**, not to a fixed easy-to-hard clue ladder.
- The design is **newspaper/editorial + Ultra Club energy**: warm off-white paper, ink black, burnt orange, cobalt, sparing electric lime for reward; high-contrast oversized editorial typography, subtle grain, halftones, pitch markings and numbered ticket cards. Keep gameplay clear and accessible.
- Reference images in `design/`; gameplay **must use player cards, not a comparison table**.
- Budget target: $0 recurring hosting and infrastructure within published provider free tiers. Prefer no paid fonts, APIs, or image licenses.

## Engineering conventions

- Prefer React, TypeScript, Vite, Tailwind CSS, accessible semantic HTML and responsive layouts; use low-cost CSS/SVG animation, respect `prefers-reduced-motion`.
- Use type-safe domain models, deterministic comparison/scoring logic, unit tests for rules, and component tests for mobile interaction. Keep input controls >=44px high where practicable.
- Do not store API keys or user secrets in frontend builds. Never use purely client-supplied scores as authoritative.
- For early local UI tests synthetic fixtures are fine **if clearly labeled**. Keep data adapters modular so real Wikidata/curated datasets can replace mock data without UI rewrite.
- GitHub Pages serves static files only. Cloudflare Workers/D1 can supply an optional authenticated gameplay API when friends/competition launch.
- Current/2026 data and third-party licenses must be verified; do not assume a Kaggle or GitHub dataset is freely redistributable commercially.
- Deliver changes in small reviewable steps with tests, build instructions and screenshots at mobile width. Do not invent deployment success or test results.

## First implementation task

1. Scaffold Vite React/TS frontend and GitHub Pages deployment workflow using repository base `/nutmeg/`.
2. Implement mobile shell: Home, The Lineup, The Mystery, Friends leaderboard demo, Result, with navigation and polished styles.
3. Use illustrative mock data only; implement a six-guess playable Lineup comparison flow with stacked player cards, and a playable Mystery flow with fixed question options.
4. Add tests for comparison rules, guess limits, revealed clue counts, and score calculations.
5. Update README with commands and actual implementation status.

Do not build a persistent public leaderboard or pretend the sample game is cheat-resistant before the server validates answers.

# First Codex task (paste into Codex)

Read AGENTS.md and docs/* in the `nutmeg` repository. Implement Milestone A as a mobile-first React/TypeScript/Vite/Tailwind app, no backend dependencies or paid services. Use `design/mobile-card-layout.png` as the closest visual reference. Preserve the warm newspaper-paper UI, vivid orange editorials, bold ink typography, cobalt for Mystery, lime for rewards, and subtle motion. Implement:

1. Home with daily-game cards, names, streak display (mock).
2. The Lineup: up to six guesses from synthetic fixtures, autocomplete, correct deterministic comparisons and **stacked guessed-player profile cards**, no table.
3. The Mystery: three verified-*looking* but explicitly fictional/demo facts, three predetermined yes/no questions, three player guesses; avoid publishing fabricated real-player claims as facts.
4. Fake local leaderboard and result screen clearly labeled demo.
5. Mobile responsive behavior at 320/390/768px, accessible text, keyboard-friendly controls, reduced motion.
6. Unit tests of guess/scoring/reveal limits; GitHub Pages deployment targeting base `/nutmeg/`.

Keep modules separated so `src/data/` fixtures can later be replaced with a Worker API and curated 2026 data. Implement and run tests and build, then summarize outcomes and limitations. Do not imply backend leaderboard or anti-cheat is implemented.

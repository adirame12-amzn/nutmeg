# Product requirements — Nutmeg v0.1

## Audience and goal

Football fans who want short daily challenges, surprising football lore, and friendly competition. Mobile browsers and shared links are the primary distribution path.

## Modes

**The Lineup:** Identify a single mystery player from a fixed curated pool, up to six valid guesses. Show resulting **card for each previous guess**, with player display name and chips for club, league, nation, position, age and preferred foot. Green = exact match, grey = mismatch, amber arrows = target older/younger for age. A valid player can be submitted once. Input autocomplete must support common name aliases. Do not reveal the target until solve or exhausted attempts.

**The Mystery:** Initial interesting, verified fact shown at start; two further facts can be revealed; three predefined yes/no questions total, three distinct player guesses total. Questions are deterministic from a versioned fact snapshot, not free-form LLM responses. Explicitly show remaining budget. Unsolved puzzles reveal the answer and source links when over.

**Daily cadence:** Same puzzle per game for all users on a UTC date, with a versioned frozen snapshot. Allow local timezone display. Later add practice mode, archive and game variants.

**Scoring:** Use a documented deterministic formula and unit tests. A provisional Mystery formula is `max(0,100 - 20*(clues_seen-1) - 10*questions_used - 15*(guess_count-1))` for successful solves; failures = 0. Lineup scoring TBD: favor fewer guesses. Server decides scores in multiplayer mode.

**Community:** Lightweight display-name onboarding, private group invite code, daily/weekly/all-time leaderboard. Display names can collide; backend uses stable UUID plus session token. Add recovery mechanism before encouraging device changes. Prevent trivially forged scores using server-side game state.

## Acceptance criteria

- All game screens usable at 320–390px width without horizontal scrolling.
- Tappable controls, keyboard-safe input, visible focus, accessible comparison statuses beyond colors alone.
- No arbitrary user-authored answers to yes/no facts in initial launch.
- Facts used in production puzzles have a source URL, verification date and editorial review flag.
- All provider- or player-specific claims checked against data snapshot rather than guessed.

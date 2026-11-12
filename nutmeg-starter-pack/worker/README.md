# Player Press ranked API

This Worker is the authoritative service for daily Prime Suspect, Paper Trail, Redacted, Cipher and Overlap. D1 stores the player pool, reviewed club paths, anonymous browser identities, one shared puzzle per mode and UTC date, attempts, guesses, per-case deadlines and combined weekly scores. Answers remain hidden until an attempt ends.

## Local setup

```bash
npm run worker:migrate:local
npm run worker:seed:local
npm run worker:dev
```

The API runs on `http://127.0.0.1:8787`. Start Vite with `VITE_API_URL=http://127.0.0.1:8787 npm run dev` to enable ranked mode.

## Production setup

1. Run `npx wrangler login`.
2. Run `npx wrangler d1 create player-press-ranked`.
3. Replace the placeholder `database_id` in `worker/wrangler.jsonc` with the returned ID.
4. Run `npm run worker:migrate` and `npm run worker:seed:remote`.
5. Run `npm run worker:deploy`.
6. Add `VITE_API_URL=https://player-press-ranked.<account>.workers.dev` as a GitHub Actions repository variable, or use it when building locally.

The current production Worker is deployed at `https://player-press-ranked.adirame12.workers.dev` and is bound to the `player-press-ranked` D1 database. The frontend uses this address for production builds unless `VITE_API_URL` overrides it.

The cron runs at 00:00 UTC and creates all five daily cases. Each status route also creates its day’s puzzle row if the cron has not run, so every user still receives the same stored target for each mode. Status reads do not start a timer; timed modes start through their `/start` route.

## Ranked endpoints

- `GET /api/daily/lineup` and `POST /api/daily/lineup/guess`
- `GET /api/daily/paper-trail` and `POST /api/daily/paper-trail/guess`
- `POST /api/daily/{paper-trail|redacted|cipher|overlap}/start`
- `GET /api/daily/{redacted|cipher|overlap}` and their mode-specific action routes
- `GET /api/leaderboard/weekly`, aggregating completed attempts from both modes

Migration `0002_ranked_paper_trail.sql` adds the reviewed path catalogue, frozen daily Paper Trail puzzles, attempts and guesses without changing the existing Prime Suspect tables.
Migration `0005_timed_daily_overlap.sql` adds independent 60-second Paper Trail/word-game deadlines and the ranked Overlap puzzle and attempt tables.

Names are unique case-insensitively. The browser stores a random bearer token; the database stores only its SHA-256 hash. There is intentionally no login or recovery flow in this alpha, so clearing browser storage or changing devices means choosing another name.

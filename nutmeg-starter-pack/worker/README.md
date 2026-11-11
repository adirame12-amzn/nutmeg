# Player Press ranked API

This Worker is the authoritative daily Prime Suspect service. D1 stores the player pool, anonymous browser identities, one shared UTC puzzle per day, attempts and weekly scores. The target player is never returned until the attempt ends.

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

The cron runs at 00:00 UTC. `GET /daily/lineup` also creates the day’s row if the cron has not run, so every user still receives the same stored target.

Names are unique case-insensitively. The browser stores a random bearer token; the database stores only its SHA-256 hash. There is intentionally no login or recovery flow in this alpha, so clearing browser storage or changing devices means choosing another name.

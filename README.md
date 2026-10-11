# Clan Bingo

A points tracker for a clan bingo: four teams, each with a shared password, tick off tasks and watch their points. Runs on Cloudflare Pages + a Worker (static assets + API) + D1.

- **Teams** pick their tab, enter the team password, and tick tasks (optionally saying who got it). Progress is stored with timestamps, so the team page shows points over time and points by section. Teams only see their own scores.
- **Organiser** page (`/organiser/`) shows all team scores and awards PvP placements (3/2/1 points).
- **Scoring** (`shared/scoring.mjs`): standard 6, CHUNGUS 10, prestige 5 base + 3 prestige, incremental 1 per step. A prestige tick scores **0 until the base is ticked**.
- The board lives in `shared/tasks.mjs`.

Passwords are plain shared secrets sent in a header: fine for a clan bingo, not for anything sensitive.

## Deploy

Cloudflare Workers & Pages, connected to this GitHub repo (build command empty, deploy command `npx wrangler deploy`). `wrangler.toml` already holds the D1 binding. Then add five **secrets** under Settings, Variables and Secrets: `PASS_CRYSTAL`, `PASS_KIZZ`, `PASS_POPPERS`, `PASS_JOBCENTRE`, `PASS_ORGANISER`. Every push to `main` redeploys.

## Develop

```bash
npm install
printf 'PASS_CRYSTAL=a\nPASS_KIZZ=b\nPASS_POPPERS=c\nPASS_JOBCENTRE=d\nPASS_ORGANISER=boss\n' > .dev.vars
npx wrangler d1 migrations apply clan-bingo --local
npx wrangler dev
npm test
```

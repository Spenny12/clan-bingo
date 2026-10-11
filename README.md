# Clan Bingo

A points tracker for a clan bingo: four teams, each with a shared password, tick off tasks and watch their points. Runs on Cloudflare Pages + Pages Functions + D1.

- **Teams** pick their tab, enter the team password, and tick tasks (optionally saying who got it). Progress is stored with timestamps, so the team page shows points over time and points by section. Teams only see their own scores.
- **Organiser** page (`/organiser/`) shows all team scores and awards PvP placements (3/2/1 points).
- **Scoring** (`shared/scoring.mjs`): standard 6, CHUNGUS 10, prestige 5 base + 3 prestige, incremental 1 per step. A prestige tick scores **0 until the base is ticked**.
- The board lives in `shared/tasks.mjs`. Incremental step counts for *Autism in Progress* (4) and *Monkeys* (4) were not in the sheet, so check them.

Passwords are plain shared secrets sent in a header: fine for a clan bingo, not for anything sensitive.

## Deploy

1. Cloudflare dashboard, Workers & Pages, Create, Pages, **Connect to Git**, pick this repo. Build command empty, output directory `public`.
2. Settings, Bindings, add a **D1 database** binding named `DB` pointing at `clan-bingo`.
3. Settings, Variables and Secrets, add these as **secrets**: `PASS_CRYSTAL`, `PASS_KIZZ`, `PASS_POPPERS`, `PASS_JOBCENTRE`, `PASS_ORGANISER`.
4. Redeploy once so the bindings take effect.

## Develop

```bash
npm install
printf 'PASS_CRYSTAL=a\nPASS_KIZZ=b\nPASS_POPPERS=c\nPASS_JOBCENTRE=d\nPASS_ORGANISER=boss\n' > .dev.vars
npx wrangler d1 migrations apply clan-bingo --local
npx wrangler pages dev public
npm test
```

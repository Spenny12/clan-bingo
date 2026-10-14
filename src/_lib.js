import { TEAMS } from "../shared/tasks.mjs";
import { breakdown, scoreEvents, playerBreakdown } from "../shared/scoring.mjs";
import { leaderboard, BADGES } from "../shared/badges.mjs";

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export const teamById = (id) => TEAMS.find((t) => t.id === id);

/** The password for a role: a Cloudflare secret if one is set, otherwise the `passwords` table in D1. */
export async function passwordFor(env, varName) {
  if (env[varName]) return env[varName];
  const row = await env.DB.prepare("SELECT value FROM passwords WHERE name = ?").bind(varName).first().catch(() => null);
  return row?.value || null;
}

/** Returns a Response if the request is not allowed, otherwise null. Passwords are plain shared secrets. */
export async function checkPassword(request, env, varName) {
  const expected = await passwordFor(env, varName);
  if (!expected) return json({ error: `Not set up yet: no password for ${varName}.` }, 503);
  if (request.headers.get("x-password") !== expected) return json({ error: "Wrong password." }, 401);
  return null;
}

/** Whether teams may tick. No settings row (or no table yet) means open. */
export async function isOpen(env) {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE name = 'open'").first().catch(() => null);
  return row?.value !== "0";
}

export async function setOpen(env, open) {
  await env.DB.prepare("INSERT INTO settings (name, value) VALUES ('open', ?) ON CONFLICT(name) DO UPDATE SET value = excluded.value").bind(open ? "1" : "0").run();
}

/**
 * What every team may see about every other team: totals, points by section, a timeline of points
 * (times and amounts only) and the player leaderboard. Never which tasks were done.
 */
export async function scoreboard(env) {
  const [ticks, pvp, open] = await Promise.all([
    env.DB.prepare("SELECT team, key, at, by FROM ticks").all(),
    env.DB.prepare("SELECT team, task, place, at FROM pvp").all(),
    isOpen(env),
  ]);
  const teams = TEAMS.map((t) => {
    const mine = ticks.results.filter((r) => r.team === t.id), placed = pvp.results.filter((r) => r.team === t.id);
    return { id: t.id, name: t.name, players: t.players, events: scoreEvents(mine, placed), score: breakdown(mine, placed) };
  });
  return {
    open,
    teams: teams.map((t) => {
      let run = 0;
      return { id: t.id, name: t.name, score: t.score, ticks: t.events.length, timeline: t.events.map((e) => [e.at, (run += e.points)]) };
    }),
    players: leaderboard(teams),
    badges: BADGES,
  };
}

export async function teamState(env, team) {
  const [ticks, pvp, open] = await Promise.all([
    env.DB.prepare("SELECT key, at, by FROM ticks WHERE team = ?").bind(team.id).all(),
    env.DB.prepare("SELECT task, place, at FROM pvp WHERE team = ?").bind(team.id).all(),
    isOpen(env),
  ]);
  const events = scoreEvents(ticks.results, pvp.results);
  return {
    open,
    ticks: ticks.results,
    pvp: pvp.results,
    events,
    score: breakdown(ticks.results, pvp.results),
    byPlayer: playerBreakdown(events, team.players),
  };
}

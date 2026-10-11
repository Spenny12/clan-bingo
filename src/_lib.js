import { TEAMS } from "../shared/tasks.mjs";
import { breakdown, scoreEvents } from "../shared/scoring.mjs";

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

export async function teamState(env, team) {
  const [ticks, pvp] = await Promise.all([
    env.DB.prepare("SELECT key, at, by FROM ticks WHERE team = ?").bind(team.id).all(),
    env.DB.prepare("SELECT task, place, at FROM pvp WHERE team = ?").bind(team.id).all(),
  ]);
  return {
    ticks: ticks.results,
    pvp: pvp.results,
    events: scoreEvents(ticks.results, pvp.results),
    score: breakdown(ticks.results, pvp.results),
  };
}

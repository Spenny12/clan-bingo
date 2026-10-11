import { TEAMS } from "../shared/tasks.mjs";
import { breakdown, scoreEvents } from "../shared/scoring.mjs";

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export const teamById = (id) => TEAMS.find((t) => t.id === id);

/** Returns a Response if the request is not allowed, otherwise null. Passwords are plain shared secrets in env vars. */
export function checkPassword(request, env, varName) {
  const expected = env[varName];
  if (!expected) return json({ error: `Not set up yet: the ${varName} secret is missing.` }, 503);
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

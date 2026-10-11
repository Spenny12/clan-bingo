import { TEAMS, PVP } from "../../shared/tasks.mjs";
import { json, checkPassword, teamState } from "../_lib.js";

async function overview(env) {
  const teams = await Promise.all(TEAMS.map(async (t) => ({ id: t.id, name: t.name, players: t.players, ...(await teamState(env, t)) })));
  return { teams };
}

export async function onRequestGet({ request, env }) {
  const denied = checkPassword(request, env, "PASS_ORGANISER");
  if (denied) return denied;
  return json(await overview(env));
}

// Award (or clear) a PvP placement: { task: "pvp:lms-tourney", place: 1|2|3, team: "kizz" | null }
export async function onRequestPost({ request, env }) {
  const denied = checkPassword(request, env, "PASS_ORGANISER");
  if (denied) return denied;
  const b = await request.json().catch(() => null);
  const okTask = b && PVP.some((p) => p.id === b.task);
  const okTeam = b && (b.team === null || TEAMS.some((t) => t.id === b.team));
  if (!okTask || !okTeam || ![1, 2, 3].includes(b.place)) return json({ error: "Bad request." }, 400);

  const stmts = [env.DB.prepare("DELETE FROM pvp WHERE task = ? AND place = ?").bind(b.task, b.place)];
  if (b.team) {
    // One team can't take two places in the same event.
    stmts.push(env.DB.prepare("DELETE FROM pvp WHERE task = ? AND team = ?").bind(b.task, b.team));
    stmts.push(env.DB.prepare("INSERT INTO pvp (task, place, team, at) VALUES (?, ?, ?, ?)").bind(b.task, b.place, b.team, Date.now()));
  }
  await env.DB.batch(stmts);
  return json(await overview(env));
}

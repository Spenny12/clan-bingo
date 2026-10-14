import { TEAMS, PVP } from "../../shared/tasks.mjs";
import { json, checkPassword, teamState, isOpen, setOpen } from "../_lib.js";

async function overview(env) {
  const [teams, open] = await Promise.all([
    Promise.all(TEAMS.map(async (t) => ({ id: t.id, name: t.name, players: t.players, ...(await teamState(env, t)) }))),
    isOpen(env),
  ]);
  return { teams, open };
}

export async function onRequestGet({ request, env }) {
  const denied = await checkPassword(request, env, "PASS_ORGANISER");
  if (denied) return denied;
  return json(await overview(env));
}

// Open or close ticking: { open: true | false }
// Award (or clear) a PvP placement: { task: "pvp:lms-tourney", place: 1|2|3, team: "kizz" | null }
export async function onRequestPost({ request, env }) {
  const denied = await checkPassword(request, env, "PASS_ORGANISER");
  if (denied) return denied;
  const b = await request.json().catch(() => null);
  if (b && typeof b.open === "boolean") {
    try { await setOpen(env, b.open); }
    catch { return json({ error: "The settings table is missing: apply migrations/0003_settings.sql to D1." }, 500); }
    return json(await overview(env));
  }
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

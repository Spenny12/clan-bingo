import { validKeys } from "../../shared/tasks.mjs";
import { json, teamById, checkPassword, teamState, isOpen, logTick } from "../_lib.js";

const KEYS = validKeys();

export async function onRequestGet({ request, env, params }) {
  const team = teamById(params.id);
  if (!team) return json({ error: "No such team." }, 404);
  const denied = await checkPassword(request, env, team.env);
  if (denied) return denied;
  return json({ team: { id: team.id, name: team.name, players: team.players }, ...(await teamState(env, team)) });
}

export async function onRequestPost({ request, env, params }) {
  const team = teamById(params.id);
  if (!team) return json({ error: "No such team." }, 404);
  const denied = await checkPassword(request, env, team.env);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.key !== "string" || !KEYS.has(body.key) || typeof body.on !== "boolean") {
    return json({ error: "Bad request." }, 400);
  }
  if (!(await isOpen(env))) return json({ error: "Ticking is closed by the organiser." }, 423);
  let changed;
  const who = team.players.includes(body.by) ? body.by : null;
  if (body.on) {
    // Every tick needs a player, so per-player scores add up to the team's.
    if (!who) return json({ error: "Pick who got it in “Ticking as…” first." }, 400);
    // INSERT OR IGNORE keeps the original time if a box is ticked twice.
    const r = await env.DB.prepare("INSERT OR IGNORE INTO ticks (team, key, at, by) VALUES (?, ?, ?, ?)").bind(team.id, body.key, Date.now(), who).run();
    changed = r.meta?.changes > 0;
  } else {
    const r = await env.DB.prepare("DELETE FROM ticks WHERE team = ? AND key = ?").bind(team.id, body.key).run();
    changed = r.meta?.changes > 0;
  }
  if (changed) await logTick(env, team.id, body.key, body.on ? "tick" : "untick", who);
  return json({ team: { id: team.id, name: team.name, players: team.players }, ...(await teamState(env, team)) });
}

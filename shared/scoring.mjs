import { POINTS, STANDARD, CHUNGUS, PRESTIGE, INCREMENTAL, PVP } from "./tasks.mjs";

const byId = new Map([...STANDARD, ...CHUNGUS, ...PRESTIGE, ...INCREMENTAL, ...PVP].map((t) => [t.id, t]));

/**
 * Turn a team's ticks into scoring events.
 * @param {Array<{key:string, at:number, by?:string|null}>} ticks   at = unix ms the box was ticked, by = player who got it
 * @param {Array<{task:string, place:number, at:number}>} pvp  placements this team won (place 1..3)
 * @returns {Array<{at:number, points:number, label:string, section:string, task:string, by:string|null, bonus?:true}>} sorted by time.
 *   `by` is the player who ticked the box (the prestige part's ticker for the bonus); null if nobody was named or for PvP.
 */
export function scoreEvents(ticks, pvp = []) {
  const at = new Map(ticks.map((t) => [t.key, t.at]));
  const who = new Map(ticks.map((t) => [t.key, t.by || null]));
  const events = [];
  const add = (key, e) => events.push({ ...e, by: who.get(key) ?? null });
  for (const t of [...STANDARD, ...CHUNGUS]) {
    if (at.has(t.id)) add(t.id, { at: at.get(t.id), points: POINTS[t.kind], label: t.name, section: t.kind, task: t.id });
  }
  for (const t of PRESTIGE) {
    if (!at.has(t.id)) continue; // no base, no points: not even for a ticked prestige
    add(t.id, { at: at.get(t.id), points: POINTS.prestigeBase, label: t.name, section: "prestige", task: t.id });
    if (at.has(`${t.id}#p`)) {
      // The bonus is earned when both parts are done, whichever was ticked last.
      add(`${t.id}#p`, { at: Math.max(at.get(t.id), at.get(`${t.id}#p`)), points: POINTS.prestigeBonus, label: `${t.name} (prestige)`, section: "prestige", task: t.id, bonus: true });
    }
  }
  for (const t of INCREMENTAL) {
    for (let i = 1; i <= t.steps; i++) {
      const k = `${t.id}#${i}`;
      if (at.has(k)) add(k, { at: at.get(k), points: POINTS.step, label: `${t.name} ${i}/${t.steps}`, section: "incremental", task: t.id });
    }
  }
  for (const p of pvp) {
    const task = byId.get(p.task);
    if (task && POINTS.pvp[p.place - 1]) events.push({ at: p.at, points: POINTS.pvp[p.place - 1], label: `${task.name} (#${p.place})`, section: "pvp", task: p.task, by: null });
  }
  return events.sort((a, b) => a.at - b.at);
}

/**
 * Points per player from scoring events. Every listed player appears, in roster order, even on 0;
 * points nobody was named for go to a trailing `null` row (only if there are any).
 * @returns {Array<{player:string|null, total:number, ticks:number, last:number|null, sections:Record<string,number>}>}
 */
export function playerBreakdown(events, players) {
  const blank = (player) => ({ player, total: 0, ticks: 0, last: null, sections: { standard: 0, chungus: 0, prestige: 0, incremental: 0, pvp: 0 } });
  const rows = new Map(players.map((p) => [p, blank(p)]));
  const other = blank(null);
  for (const e of events) {
    const r = rows.get(e.by) || other;
    r.total += e.points;
    r.ticks += 1;
    r.sections[e.section] += e.points;
    r.last = Math.max(r.last ?? 0, e.at);
  }
  return [...rows.values(), ...(other.ticks ? [other] : [])];
}

export function breakdown(ticks, pvp = []) {
  const out = { standard: 0, chungus: 0, prestige: 0, incremental: 0, pvp: 0, total: 0 };
  const at = new Set(ticks.map((t) => t.key));
  for (const t of STANDARD) if (at.has(t.id)) out.standard += POINTS.standard;
  for (const t of CHUNGUS) if (at.has(t.id)) out.chungus += POINTS.chungus;
  for (const t of PRESTIGE) if (at.has(t.id)) out.prestige += POINTS.prestigeBase + (at.has(`${t.id}#p`) ? POINTS.prestigeBonus : 0);
  for (const t of INCREMENTAL) for (let i = 1; i <= t.steps; i++) if (at.has(`${t.id}#${i}`)) out.incremental += POINTS.step;
  for (const p of pvp) if (byId.has(p.task) && POINTS.pvp[p.place - 1]) out.pvp += POINTS.pvp[p.place - 1];
  out.total = out.standard + out.chungus + out.prestige + out.incremental + out.pvp;
  return out;
}

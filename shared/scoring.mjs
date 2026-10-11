import { POINTS, STANDARD, CHUNGUS, PRESTIGE, INCREMENTAL, PVP } from "./tasks.mjs";

const byId = new Map([...STANDARD, ...CHUNGUS, ...PRESTIGE, ...INCREMENTAL, ...PVP].map((t) => [t.id, t]));

/**
 * Turn a team's ticks into scoring events.
 * @param {Array<{key:string, at:number}>} ticks   at = unix ms the box was ticked
 * @param {Array<{task:string, place:number, at:number}>} pvp  placements this team won (place 1..3)
 * @returns {Array<{at:number, points:number, label:string}>} sorted by time
 */
export function scoreEvents(ticks, pvp = []) {
  const at = new Map(ticks.map((t) => [t.key, t.at]));
  const events = [];
  for (const t of [...STANDARD, ...CHUNGUS]) {
    if (at.has(t.id)) events.push({ at: at.get(t.id), points: POINTS[t.kind], label: t.name });
  }
  for (const t of PRESTIGE) {
    if (!at.has(t.id)) continue; // no base, no points: not even for a ticked prestige
    events.push({ at: at.get(t.id), points: POINTS.prestigeBase, label: t.name });
    if (at.has(`${t.id}#p`)) {
      // The bonus is earned when both parts are done, whichever was ticked last.
      events.push({ at: Math.max(at.get(t.id), at.get(`${t.id}#p`)), points: POINTS.prestigeBonus, label: `${t.name} (prestige)` });
    }
  }
  for (const t of INCREMENTAL) {
    for (let i = 1; i <= t.steps; i++) {
      const k = `${t.id}#${i}`;
      if (at.has(k)) events.push({ at: at.get(k), points: POINTS.step, label: `${t.name} ${i}/${t.steps}` });
    }
  }
  for (const p of pvp) {
    const task = byId.get(p.task);
    if (task && POINTS.pvp[p.place - 1]) events.push({ at: p.at, points: POINTS.pvp[p.place - 1], label: `${task.name} (#${p.place})` });
  }
  return events.sort((a, b) => a.at - b.at);
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

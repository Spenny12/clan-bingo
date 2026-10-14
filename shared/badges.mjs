// Streaks and badges for players, worked out from scoring events (see scoring.mjs).
// Days are counted in UK time so a late-night session doesn't split across two days at 1am BST.

const TZ = "Europe/London";
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const hourFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "numeric", hourCycle: "h23" });

/** "YYYY-MM-DD" in UK time. */
export const dayOf = (at) => dayFmt.format(at);
const nextDay = (d) => new Date(Date.parse(`${d}T12:00:00Z`) + 864e5).toISOString().slice(0, 10);

export const BADGES = {
  mvp: { icon: "🏆", name: "Team MVP", desc: "Top scorer on their team" },
  first: { icon: "🥇", name: "First blood", desc: "Scored the first points of the bingo" },
  chungus: { icon: "🐘", name: "Chungus", desc: "Got a CHUNGUS task" },
  prestige: { icon: "👑", name: "Prestigious", desc: "Finished a prestige" },
  grinder: { icon: "⛏️", name: "Grinder", desc: "10+ incremental steps" },
  hattrick: { icon: "🎩", name: "Hat-trick", desc: "3+ ticks in one day" },
  owl: { icon: "🦉", name: "Night owl", desc: "Ticked something between midnight and 5am" },
  streak3: { icon: "🔥", name: "On fire", desc: "Ticked on 3 days in a row" },
  streak7: { icon: "☄️", name: "Unstoppable", desc: "Ticked on 7 days in a row" },
};

/**
 * Day streaks from tick times. `best` is the longest run of consecutive days with a tick;
 * `current` is the run ending today, or yesterday (it's still alive until a full day is missed).
 */
export function streaks(times, now = Date.now()) {
  const days = [...new Set(times.map(dayOf))].sort();
  let best = 0, run = 0, prev = null;
  for (const d of days) {
    run = prev && nextDay(prev) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  const today = dayOf(now);
  const current = prev && (prev === today || nextDay(prev) === today) ? run : 0;
  return { current, best };
}

/**
 * Everyone on every roster, ranked by points, with streaks and badges.
 * @param {Array<{id:string, name:string, players:string[], events:Array<{at:number, points:number, section:string, by:string|null, bonus?:boolean}>}>} teams
 */
export function leaderboard(teams, now = Date.now()) {
  const named = teams.flatMap((t) => t.events.filter((e) => e.by && t.players.includes(e.by)).map((e) => ({ ...e, team: t.id })));
  const first = named.reduce((a, e) => (!a || e.at < a.at ? e : a), null);

  const rows = teams.flatMap((t) => t.players.map((player) => {
    const ev = named.filter((e) => e.team === t.id && e.by === player);
    const perDay = new Map();
    for (const e of ev) perDay.set(dayOf(e.at), (perDay.get(dayOf(e.at)) || 0) + 1);
    const streak = streaks(ev.map((e) => e.at), now);
    const badges = [];
    if (first && first.team === t.id && first.by === player) badges.push("first");
    if (ev.some((e) => e.section === "chungus")) badges.push("chungus");
    if (ev.some((e) => e.bonus)) badges.push("prestige");
    if (ev.filter((e) => e.section === "incremental").length >= 10) badges.push("grinder");
    if ([...perDay.values()].some((n) => n >= 3)) badges.push("hattrick");
    if (ev.some((e) => Number(hourFmt.format(e.at)) < 5)) badges.push("owl");
    if (streak.best >= 3) badges.push("streak3");
    if (streak.best >= 7) badges.push("streak7");
    return { player, team: t.id, teamName: t.name, total: ev.reduce((a, e) => a + e.points, 0), ticks: ev.length, last: ev.length ? Math.max(...ev.map((e) => e.at)) : null, streak, badges };
  }));

  // MVP: the top scorer on each team (ties share it), once they've scored anything.
  for (const t of teams) {
    const mine = rows.filter((r) => r.team === t.id);
    const top = Math.max(0, ...mine.map((r) => r.total));
    if (top > 0) for (const r of mine) if (r.total === top) r.badges.unshift("mvp");
  }
  return rows.sort((a, b) => b.total - a.total || a.player.localeCompare(b.player));
}

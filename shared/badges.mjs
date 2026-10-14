// Streaks and badges for players, worked out from scoring events (see scoring.mjs).
// Days are counted in UK time so a late-night session doesn't split across two days at 1am BST.
import { INCREMENTAL } from "./tasks.mjs";

const TZ = "Europe/London";
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const hourFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "numeric", hourCycle: "h23" });
const weekdayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short" });

/** "YYYY-MM-DD" in UK time. */
export const dayOf = (at) => dayFmt.format(at);
const hourOf = (at) => Number(hourFmt.format(at));
const nextDay = (d) => new Date(Date.parse(`${d}T12:00:00Z`) + 864e5).toISOString().slice(0, 10);

/**
 * Every badge, in display order. Badges sharing a `tier` are a ladder: a player only shows the
 * highest one they've reached (the last in this list), so "45 points" replaces "15" and "30".
 */
export const BADGES = {
  top: { icon: "🐐", name: "GOAT", desc: "Top of the overall player leaderboard", tier: "rank", group: "Standing" },
  podium: { icon: "🏅", name: "Podium", desc: "Top 3 on the overall player leaderboard", tier: "rank", group: "Standing" },
  mvp: { icon: "🏆", name: "Team MVP", desc: "Top scorer on their team", group: "Standing" },
  carry: { icon: "🎒", name: "Carry", desc: "Half or more of their team's points (once the team has 20+)", group: "Standing" },
  first: { icon: "🩸", name: "First blood", desc: "Scored the first points of the bingo", group: "Standing" },
  pts15: { icon: "🌱", name: "15 points", desc: "Scored 15 points", tier: "points", group: "Points milestones" },
  pts30: { icon: "🌿", name: "30 points", desc: "Scored 30 points", tier: "points", group: "Points milestones" },
  pts45: { icon: "🌳", name: "45 points", desc: "Scored 45 points", tier: "points", group: "Points milestones" },
  pts60: { icon: "⭐", name: "60 points", desc: "Scored 60 points", tier: "points", group: "Points milestones" },
  pts100: { icon: "🌟", name: "100 points", desc: "Scored 100 points", tier: "points", group: "Points milestones" },
  ticks1: { icon: "🎯", name: "Off the mark", desc: "First tick", tier: "ticks", group: "Tick milestones" },
  ticks5: { icon: "✋", name: "High five", desc: "5 ticks", tier: "ticks", group: "Tick milestones" },
  ticks10: { icon: "🔟", name: "Double digits", desc: "10 ticks", tier: "ticks", group: "Tick milestones" },
  ticks20: { icon: "🎰", name: "Twenty club", desc: "20 ticks", tier: "ticks", group: "Tick milestones" },
  ticks30: { icon: "🤖", name: "Machine", desc: "30 ticks", tier: "ticks", group: "Tick milestones" },
  streak3: { icon: "🔥", name: "On fire", desc: "Ticked on 3 days in a row", tier: "streak", group: "Consistency" },
  streak7: { icon: "☄️", name: "Unstoppable", desc: "Ticked on 7 days in a row", tier: "streak", group: "Consistency" },
  regular: { icon: "📅", name: "Regular", desc: "Ticked on 5 different days", group: "Consistency" },
  hattrick: { icon: "🎩", name: "Hat-trick", desc: "3+ ticks in one day", tier: "day", group: "Consistency" },
  bigday: { icon: "💥", name: "Big day", desc: "20+ points in one day", tier: "day", group: "Consistency" },
  chungus: { icon: "🐘", name: "Chungus", desc: "Got a CHUNGUS task", tier: "chungus", group: "Sections" },
  chungus3: { icon: "🦣", name: "Mega Chungus", desc: "Got 3 CHUNGUS tasks", tier: "chungus", group: "Sections" },
  prestige: { icon: "👑", name: "Prestigious", desc: "Finished a prestige", tier: "prestige", group: "Sections" },
  prestige3: { icon: "💎", name: "Prestige master", desc: "Finished 3 prestiges", tier: "prestige", group: "Sections" },
  tagteam: { icon: "🤝", name: "Tag team", desc: "Finished a prestige on a teammate's base", group: "Sections" },
  grinder: { icon: "⛏️", name: "Grinder", desc: "10+ incremental steps", group: "Sections" },
  complete: { icon: "✅", name: "Set complete", desc: "Ticked the last step of an incremental task", group: "Sections" },
  allround: { icon: "🧭", name: "All-rounder", desc: "Scored in Standard, Chungus, Prestige and Incremental", group: "Sections" },
  raider: { icon: "💜", name: "Raider", desc: "Got a raid purple", group: "Content" },
  clues: { icon: "📜", name: "Clue hunter", desc: "Did a clue task", group: "Content" },
  pets: { icon: "🐾", name: "Pet owner", desc: "Got a pet task", group: "Content" },
  early: { icon: "🐦", name: "Early bird", desc: "Ticked something between 5am and 8am", group: "Time of day" },
  owl: { icon: "🦉", name: "Night owl", desc: "Ticked something between midnight and 5am", group: "Time of day" },
  weekend: { icon: "🏖️", name: "Weekend warrior", desc: "Ticked on both a Saturday and a Sunday", group: "Time of day" },
  // Hall of shame. `bad` badges are styled differently. They only appear once the bingo has started (someone has ticked).
  anchor: { icon: "⚓", name: "Anchor", desc: "Lowest scorer on their team", tier: "bottom", group: "Hall of shame", bad: true },
  spoon: { icon: "🥄", name: "Wooden spoon", desc: "Lowest points on the whole leaderboard", tier: "bottom", group: "Hall of shame", bad: true },
  bench: { icon: "🪑", name: "Benchwarmer", desc: "Hasn't ticked anything yet", group: "Hall of shame", bad: true },
  slow: { icon: "🐌", name: "Slowcoach", desc: "Last player to tick their first task (once everyone has)", group: "Hall of shame", bad: true },
  nap: { icon: "😴", name: "Napping", desc: "3+ days since their last tick", tier: "idle", group: "Hall of shame", bad: true },
  hibernate: { icon: "💤", name: "Hibernating", desc: "7+ days since their last tick", tier: "idle", group: "Hall of shame", bad: true },
};

export const THEMES = {
  raider: ["standard:tob", "standard:cox", "standard:toa", "prestige:purples"],
  clues: ["standard:what-are-those", "standard:hawk-cluah", "standard:ez", "chungus:rare-clue"],
  pets: ["standard:boss-pet", "standard:skilling-pet"],
};
const POINT_STEPS = [[100, "pts100"], [60, "pts60"], [45, "pts45"], [30, "pts30"], [15, "pts15"]];
const TICK_STEPS = [[30, "ticks30"], [20, "ticks20"], [10, "ticks10"], [5, "ticks5"], [1, "ticks1"]];
const ORDER = Object.keys(BADGES);

/** Keep only the highest badge of each ladder, in display order. */
function tidy(ids) {
  const best = new Map();
  for (const id of ids) {
    const tier = BADGES[id].tier || id;
    if (!best.has(tier) || ORDER.indexOf(id) > ORDER.indexOf(best.get(tier))) best.set(tier, id);
  }
  return [...best.values()].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
}

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

/** Badges one player earned from their own events. `team` is all of their team's events. */
function ownBadges(ev, team) {
  const out = [];
  const total = ev.reduce((a, e) => a + e.points, 0);
  const tasks = new Set(ev.map((e) => e.task));
  const days = new Map();
  for (const e of ev) {
    const d = days.get(dayOf(e.at)) || { n: 0, pts: 0 };
    days.set(dayOf(e.at), { n: d.n + 1, pts: d.pts + e.points });
  }
  const streak = streaks(ev.map((e) => e.at));
  const count = (f) => ev.filter(f).length;

  for (const [n, id] of POINT_STEPS) if (total >= n) out.push(id);
  for (const [n, id] of TICK_STEPS) if (ev.length >= n) out.push(id);
  if (streak.best >= 3) out.push("streak3");
  if (streak.best >= 7) out.push("streak7");
  if (days.size >= 5) out.push("regular");
  if ([...days.values()].some((d) => d.n >= 3)) out.push("hattrick");
  if ([...days.values()].some((d) => d.pts >= 20)) out.push("bigday");

  const chungus = count((e) => e.section === "chungus");
  if (chungus >= 1) out.push("chungus");
  if (chungus >= 3) out.push("chungus3");
  const prestiges = ev.filter((e) => e.bonus);
  if (prestiges.length >= 1) out.push("prestige");
  if (prestiges.length >= 3) out.push("prestige3");
  if (prestiges.some((b) => team.some((e) => e.task === b.task && !e.bonus && e.by && e.by !== b.by))) out.push("tagteam");
  if (count((e) => e.section === "incremental") >= 10) out.push("grinder");
  if (["standard", "chungus", "prestige", "incremental"].every((s) => ev.some((e) => e.section === s))) out.push("allround");
  for (const [id, list] of Object.entries(THEMES)) if (list.some((t) => tasks.has(t))) out.push(id);

  if (ev.some((e) => hourOf(e.at) >= 5 && hourOf(e.at) < 8)) out.push("early");
  if (ev.some((e) => hourOf(e.at) < 5)) out.push("owl");
  const wd = new Set(ev.map((e) => weekdayFmt.format(e.at)));
  if (wd.has("Sat") && wd.has("Sun")) out.push("weekend");
  return { out, streak, total };
}

/** Who ticked the step that finished each completed incremental task (the latest step in time). */
function setFinishers(teamEvents) {
  const who = new Set();
  for (const t of INCREMENTAL) {
    const steps = teamEvents.filter((e) => e.task === t.id);
    if (steps.length === t.steps) who.add(steps.reduce((a, e) => (e.at >= a.at ? e : a)).by);
  }
  return who;
}

/**
 * Hall of shame, for a leaderboard already sorted by points. `start` is the first tick of the bingo:
 * idle time for someone who hasn't ticked yet counts from then.
 */
function shame(rows, start, now) {
  const low = Math.min(...rows.map((r) => r.total));
  if (rows.some((r) => r.total > low)) for (const r of rows) if (r.total === low) r.badges.push("spoon");
  for (const team of new Set(rows.map((r) => r.team))) {
    const mine = rows.filter((r) => r.team === team);
    const min = Math.min(...mine.map((r) => r.total));
    if (mine.some((r) => r.total > min)) for (const r of mine) if (r.total === min) r.badges.push("anchor");
  }
  for (const r of rows) {
    if (!r.ticks) r.badges.push("bench");
    const idle = now - (r.last ?? start);
    if (idle >= 3 * 864e5) r.badges.push("nap");
    if (idle >= 7 * 864e5) r.badges.push("hibernate");
  }
  if (rows.every((r) => r.ticks)) {
    const latest = Math.max(...rows.map((r) => r.firstAt));
    for (const r of rows) if (r.firstAt === latest) r.badges.push("slow");
  }
}

/**
 * Everyone on every roster, ranked by points, with streaks and badges.
 * @param {Array<{id:string, name:string, players:string[], events:Array<{at:number, points:number, section:string, task:string, by:string|null, bonus?:boolean}>}>} teams
 */
export function leaderboard(teams, now = Date.now()) {
  const named = teams.flatMap((t) => t.events.filter((e) => e.by && t.players.includes(e.by)).map((e) => ({ ...e, team: t.id })));
  const first = named.reduce((a, e) => (!a || e.at < a.at ? e : a), null);

  const rows = teams.flatMap((t) => {
    const finishers = setFinishers(t.events);
    const teamTotal = t.events.reduce((a, e) => a + e.points, 0);
    return t.players.map((player) => {
      const ev = named.filter((e) => e.team === t.id && e.by === player);
      const { out, total } = ownBadges(ev, t.events);
      if (first && first.team === t.id && first.by === player) out.push("first");
      if (finishers.has(player)) out.push("complete");
      if (teamTotal >= 20 && total * 2 >= teamTotal) out.push("carry");
      return { player, team: t.id, teamName: t.name, total, ticks: ev.length, last: ev.length ? Math.max(...ev.map((e) => e.at)) : null, firstAt: ev.length ? Math.min(...ev.map((e) => e.at)) : null, streak: streaks(ev.map((e) => e.at), now), badges: out };
    });
  });

  // MVP: the top scorer on each team (ties share it), once they've scored anything.
  for (const t of teams) {
    const mine = rows.filter((r) => r.team === t.id);
    const top = Math.max(0, ...mine.map((r) => r.total));
    if (top > 0) for (const r of mine) if (r.total === top) r.badges.push("mvp");
  }
  rows.sort((a, b) => b.total - a.total || a.player.localeCompare(b.player));
  // Overall standing: ties at a podium score share it.
  const scores = [...new Set(rows.map((r) => r.total))].filter((n) => n > 0);
  for (const r of rows) {
    if (r.total > 0 && r.total === scores[0]) r.badges.push("top");
    else if (r.total > 0 && rows.filter((x) => x.total > r.total).length < 3) r.badges.push("podium");
  }
  if (first) shame(rows, first.at, now);
  for (const r of rows) r.badges = tidy(r.badges);
  return rows;
}

// Pace projections and fun facts for the public scoreboard. Pure functions of the public data
// (each team's cumulative points timeline and the player leaderboard), so they never reveal which tasks anyone did.
import { dayOf } from "./badges.mjs";

const DAY = 864e5, HOUR = 36e5;
const TZ = "Europe/London";
const hourFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "numeric", hourCycle: "h23" });
const dateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });
const niceDay = (d) => dateFmt.format(Date.parse(`${d}T12:00:00Z`));
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

/** [at, running total] pairs to {at, pts} scoring events. */
export const eventsOf = (timeline) => timeline.map(([at, run], i) => ({ at, pts: run - (i ? timeline[i - 1][1] : 0) }));

const totalAt = (timeline, t) => { let n = 0; for (const [at, run] of timeline) { if (at <= t) n = run; else break; } return n; };

/**
 * A straight-line guess at the final score. `pace` is points per day since the start, `recent` is the same over the last 3 days,
 * and the projection runs at `pace`, with `low`/`high` using whichever of the two rates is slower/faster.
 */
export function projection(timeline, { start, end, now = Date.now() }) {
  const total = timeline.at(-1)?.[1] ?? 0;
  const from = start ?? timeline[0]?.[0] ?? now;
  const elapsed = Math.max(DAY, now - from); // under a day of data is too noisy to extrapolate from
  const daysLeft = Math.max(0, (end - now) / DAY);
  const pace = total / (elapsed / DAY);
  const window = Math.min(3 * DAY, elapsed);
  const recent = (total - totalAt(timeline, now - window)) / (window / DAY);
  const at = (rate) => Math.round(total + rate * daysLeft);
  return { total, pace: Math.round(pace * 10) / 10, recent: Math.round(recent * 10) / 10, daysLeft: Math.round(daysLeft * 10) / 10,
    projected: at(pace), low: at(Math.min(pace, recent)), high: at(Math.max(pace, recent)) };
}

/**
 * Little stories from the scoreboard data: [{icon, title, text}], only the ones there is something to say about.
 * @param teams   [{id, name, timeline}]
 * @param players leaderboard rows ({player, teamName, total, ticks, streak:{best}})
 */
export function funFacts(teams, players, now = Date.now()) {
  const facts = [];
  const evs = teams.map((t) => ({ t, e: eventsOf(t.timeline) }));
  const all = evs.flatMap(({ t, e }) => e.map((x) => ({ ...x, team: t })));
  if (!all.length) return facts;

  // Biggest single day.
  let day = null;
  for (const { t, e } of evs) {
    const by = new Map();
    for (const x of e) by.set(dayOf(x.at), (by.get(dayOf(x.at)) || 0) + x.pts);
    for (const [d, pts] of by) if (!day || pts > day.pts) day = { team: t.name, d, pts };
  }
  facts.push({ icon: "📈", title: "Biggest day", text: `${day.team} scored ${day.pts} points on ${niceDay(day.d)}.` });

  // Most points inside any 60 minutes.
  let burst = null;
  for (const { t, e } of evs) {
    let lo = 0, sum = 0;
    for (let hi = 0; hi < e.length; hi++) {
      sum += e[hi].pts;
      while (e[hi].at - e[lo].at > HOUR) sum -= e[lo++].pts;
      if (!burst || sum > burst.pts) burst = { team: t.name, pts: sum, at: e[lo].at };
    }
  }
  if (burst && burst.pts > 0) facts.push({ icon: "⚡", title: "Hottest hour", text: `${burst.team} took ${burst.pts} points inside one hour, starting ${dateFmt.format(burst.at)} at ${String(hourFmt.format(burst.at)).padStart(2, "0")}:${String(new Date(burst.at).getUTCMinutes()).padStart(2, "0")}.` });

  // Longest gap with no points (between scores, or since the last one).
  let drought = null;
  for (const { t, e } of evs) {
    for (let i = 0; i < e.length; i++) {
      const next = i + 1 < e.length ? e[i + 1].at : now;
      const gap = next - e[i].at;
      if (!drought || gap > drought.gap) drought = { team: t.name, gap, ongoing: i + 1 >= e.length };
    }
  }
  if (drought && drought.gap >= HOUR) {
    const d = Math.floor(drought.gap / DAY), h = Math.floor((drought.gap % DAY) / HOUR);
    facts.push({ icon: "🏜️", title: "Longest drought", text: `${drought.team} went ${d ? plural(d, "day") + " " : ""}${plural(h, "hour")} between scores${drought.ongoing ? " and it's still going" : ""}.` });
  }

  // Lead changes and the biggest comeback to take the lead.
  const run = new Map(teams.map((t) => [t.id, 0]));
  let leader = null, changes = 0, comeback = null;
  for (const x of [...all].sort((a, b) => a.at - b.at)) {
    const before = run.get(x.team.id);
    run.set(x.team.id, before + x.pts);
    const top = Math.max(...run.values()), leaders = [...run].filter(([, v]) => v === top);
    if (leaders.length !== 1) continue; // a tie for the lead doesn't count as a change
    const now1 = leaders[0][0];
    if (now1 !== leader) {
      if (leader !== null) {
        changes++;
        const deficit = run.get(leader) - before; // how far behind the old leader this team was, just before the scoring tick
        if (!comeback || deficit > comeback.deficit) comeback = { team: x.team.name, deficit };
      }
      leader = now1;
    }
  }
  if (changes) facts.push({ icon: "🔄", title: "Lead changes", text: `The lead has changed hands ${plural(changes, "time")}${comeback && comeback.deficit > 0 ? `. Biggest comeback: ${comeback.team}, from ${comeback.deficit} behind to first` : ""}.` });

  // When everyone scores.
  const hours = new Array(24).fill(0);
  for (const x of all) hours[Number(hourFmt.format(x.at))] += x.pts;
  const peak = hours.indexOf(Math.max(...hours));
  facts.push({ icon: "🕘", title: "Peak time", text: `${String(peak).padStart(2, "0")}:00 to ${String((peak + 1) % 24).padStart(2, "0")}:00 UK time is when most points go in (${hours[peak]} so far).` });

  // Players.
  const scored = players.filter((p) => p.ticks > 0);
  const streak = [...scored].sort((a, b) => b.streak.best - a.streak.best)[0];
  if (streak && streak.streak.best >= 2) facts.push({ icon: "🔥", title: "Longest streak", text: `${streak.player} (${streak.teamName}) has ticked on ${streak.streak.best} days in a row.` });
  const busy = [...scored].sort((a, b) => b.ticks - a.ticks)[0];
  if (busy) facts.push({ icon: "🛠️", title: "Busiest player", text: `${busy.player} (${busy.teamName}) has made ${plural(busy.ticks, "tick")}.` });
  const avg = scored.filter((p) => p.ticks >= 3).map((p) => ({ ...p, avg: p.total / p.ticks })).sort((a, b) => b.avg - a.avg)[0];
  if (avg) facts.push({ icon: "💰", title: "Big hitter", text: `${avg.player} (${avg.teamName}) averages ${avg.avg.toFixed(1)} points a tick.` });
  return facts;
}

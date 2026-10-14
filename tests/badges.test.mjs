import test from "node:test";
import assert from "node:assert/strict";
import { streaks, leaderboard, dayOf, BADGES, THEMES } from "../shared/badges.mjs";
import { validKeys } from "../shared/tasks.mjs";
import { scoreEvents } from "../shared/scoring.mjs";

// Noon UK time on a given October 2026 day (BST, UTC+1).
const oct = (d, h = 12) => Date.parse(`2026-10-${String(d).padStart(2, "0")}T${String(h).padStart(2, "0")}:00:00+01:00`);

test("days are counted in UK time", () => {
  assert.equal(dayOf(Date.parse("2026-10-14T23:30:00Z")), "2026-10-15"); // 00:30 BST
});

test("streaks: best run and a current run that survives until a day is missed", () => {
  const times = [oct(1), oct(2), oct(2, 20), oct(3), oct(6), oct(7)];
  assert.deepEqual(streaks(times, oct(7, 22)), { current: 2, best: 3 });
  assert.deepEqual(streaks(times, oct(8, 22)), { current: 2, best: 3 }, "yesterday still counts");
  assert.deepEqual(streaks(times, oct(9, 22)), { current: 0, best: 3 });
  assert.deepEqual(streaks([], oct(9)), { current: 0, best: 0 });
});

test("leaderboard ranks every rostered player and hands out badges", () => {
  const ticks = [
    { key: "standard:masks", at: oct(1), by: "Adam" },
    { key: "chungus:nightmare", at: oct(2), by: "Ryan" },
    { key: "prestige:blood-torva", at: oct(2), by: "Ryan" },
    { key: "prestige:blood-torva#p", at: oct(3, 2), by: "Ryan" }, // 2am: night owl
    { key: "standard:mining", at: oct(4, 10), by: "Adam" },
    { key: "standard:agility", at: oct(4, 11), by: "Adam" },
    { key: "standard:woodcutting", at: oct(4, 12), by: "Adam" },
    { key: "standard:runecrafting", at: oct(5), by: null }, // unnamed: counts for nobody
  ];
  const teams = [
    { id: "crystal", name: "Crystal", players: ["Adam", "Spenny", "Ryan"], events: scoreEvents(ticks) },
    { id: "kizz", name: "Kizz", players: ["Kier"], events: scoreEvents([{ key: "standard:masks", at: oct(3), by: "Kier" }]) },
  ];
  const rows = leaderboard(teams, oct(5));
  assert.deepEqual(rows.map((r) => [r.player, r.total]), [["Adam", 24], ["Ryan", 18], ["Kier", 6], ["Spenny", 0]]);
  const by = Object.fromEntries(rows.map((r) => [r.player, r.badges]));
  assert.deepEqual(by.Adam, ["top", "mvp", "carry", "first", "pts15", "ticks1", "hattrick"]);
  assert.deepEqual(by.Ryan, ["podium", "pts15", "ticks1", "chungus", "prestige", "owl"]);
  assert.deepEqual(by.Kier, ["podium", "mvp", "ticks1"]);
  assert.deepEqual(by.Spenny, ["spoon", "bench", "nap"], "lowest overall beats lowest on team; idle since the bingo started");
});

test("ladders show only the top step, plus tag team, set complete and time badges", () => {
  const ticks = [
    { key: "prestige:purples", at: oct(3), by: "B" }, // Saturday
    { key: "prestige:purples#p", at: oct(4, 6), by: "A" }, // Sunday 6am, on B's base
    ...[1, 2, 3, 4, 5].map((i) => ({ key: `inc:noob-weapons#${i}`, at: oct(4 + i), by: "A" })),
    { key: "chungus:nightmare", at: oct(10, 12), by: "A" },
    { key: "chungus:doom", at: oct(10, 13), by: "A" },
    { key: "chungus:voidwaker", at: oct(10, 14), by: "A" },
  ];
  const [a, b] = leaderboard([{ id: "t", name: "T", players: ["A", "B"], events: scoreEvents(ticks) }], oct(10, 20));
  assert.equal(a.total, 38);
  assert.deepEqual(a.badges, ["top", "mvp", "carry", "pts30", "ticks5", "streak7", "regular", "bigday", "chungus3", "prestige", "tagteam", "complete", "raider", "early", "weekend", "slow"]);
  assert.deepEqual(b.badges, ["podium", "first", "ticks1", "raider", "spoon", "hibernate"]);
});

test("every badge has an icon, name and description", () => {
  for (const [id, b] of Object.entries(BADGES)) assert.ok(b.icon && b.name && b.desc, id);
});

test("theme badges point at real tasks", () => {
  const keys = validKeys();
  for (const list of Object.values(THEMES)) for (const id of list) assert.ok(keys.has(id), id);
});

test("shame badges: idle time, and nothing before the bingo starts", () => {
  const team = (ticks) => [{ id: "t", name: "T", players: ["A", "B"], events: scoreEvents(ticks) }];
  assert.deepEqual(leaderboard(team([]), oct(10)).map((r) => r.badges), [[], []], "no shame before anyone ticks");
  const ticks = [{ key: "standard:masks", at: oct(1), by: "A" }, { key: "standard:mining", at: oct(2), by: "B" }];
  const idle = (now) => Object.fromEntries(leaderboard(team(ticks), now).map((r) => [r.player, r.badges.filter((b) => ["nap", "hibernate"].includes(b))]));
  assert.deepEqual(idle(oct(3, 13)), { A: [], B: [] });
  assert.deepEqual(idle(oct(4, 13)), { A: ["nap"], B: [] });
  assert.deepEqual(idle(oct(9, 13)), { A: ["hibernate"], B: ["hibernate"] });
});

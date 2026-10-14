import test from "node:test";
import assert from "node:assert/strict";
import { streaks, leaderboard, dayOf } from "../shared/badges.mjs";
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
  assert.deepEqual(by.Adam, ["mvp", "first", "hattrick"]);
  assert.deepEqual(by.Ryan, ["chungus", "prestige", "owl"]);
  assert.deepEqual(by.Kier, ["mvp"]);
  assert.deepEqual(by.Spenny, []);
});

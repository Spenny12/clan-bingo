import test from "node:test";
import assert from "node:assert/strict";
import { breakdown, scoreEvents, playerBreakdown } from "../shared/scoring.mjs";
import { validKeys, SECTIONS, STANDARD, CHUNGUS, PRESTIGE, INCREMENTAL, PVP } from "../shared/tasks.mjs";

const t = (key, at = 1) => ({ key, at });

test("board matches the sheet", () => {
  assert.equal(STANDARD.length, 41);
  assert.equal(CHUNGUS.length, 12);
  assert.equal(PRESTIGE.length, 15);
  assert.equal(INCREMENTAL.length, 7);
  assert.equal(PVP.length, 5);
  const ids = SECTIONS.flatMap((s) => s.tasks.map((x) => x.id));
  assert.equal(new Set(ids).size, ids.length, "task ids are unique");
});

test("standard and chungus points", () => {
  assert.equal(breakdown([t("standard:masks"), t("chungus:nightmare")]).total, 16);
});

test("prestige without the base scores nothing", () => {
  assert.equal(breakdown([t("prestige:blood-torva#p")]).total, 0);
  assert.deepEqual(scoreEvents([t("prestige:blood-torva#p")]), []);
});

test("prestige: base 5, base + prestige 8", () => {
  assert.equal(breakdown([t("prestige:blood-torva")]).total, 5);
  assert.equal(breakdown([t("prestige:blood-torva"), t("prestige:blood-torva#p")]).total, 8);
});

test("prestige bonus is dated when both parts are done", () => {
  const ev = scoreEvents([t("prestige:blood-torva", 50), t("prestige:blood-torva#p", 10)]);
  assert.deepEqual(ev.map((e) => [e.at, e.points]), [[50, 5], [50, 3]]);
});

test("incremental steps are 1 point each", () => {
  assert.equal(breakdown([t("inc:noob-weapons#1"), t("inc:noob-weapons#3"), t("inc:slops#2")]).total, 3);
});

test("pvp placements", () => {
  assert.equal(breakdown([], [{ task: "pvp:lms-tourney", place: 1 }, { task: "pvp:clan-wars-tourney", place: 3 }]).total, 4);
});

test("breakdown total equals the sum of events", () => {
  const ticks = [...validKeys()].map((key, i) => t(key, i));
  const pvp = [{ task: "pvp:lms-tourney", place: 2, at: 5 }];
  const sum = scoreEvents(ticks, pvp).reduce((s, e) => s + e.points, 0);
  assert.equal(sum, breakdown(ticks, pvp).total);
  // 41*6 + 12*10 + 15*8 + (5+5+4+4+3+7+6) + 2
  assert.equal(sum, 246 + 120 + 120 + 34 + 2);
});

test("player breakdown credits whoever ticked each box", () => {
  const ticks = [
    { key: "standard:masks", at: 1, by: "Adam" },
    { key: "prestige:blood-torva", at: 2, by: "Adam" },
    { key: "prestige:blood-torva#p", at: 3, by: "Ryan" },
    { key: "inc:slops#1", at: 4, by: null },
    { key: "chungus:nightmare", at: 5, by: "Ghost" }, // not on the roster
  ];
  const rows = playerBreakdown(scoreEvents(ticks, [{ task: "pvp:lms-tourney", place: 1, at: 6 }]), ["Adam", "Spenny", "Ryan"]);
  assert.deepEqual(rows.map((r) => [r.player, r.total, r.ticks]), [["Adam", 11, 2], ["Spenny", 0, 0], ["Ryan", 3, 1], [null, 14, 3]]);
  assert.equal(rows[0].sections.prestige, 5);
  assert.equal(rows[3].last, 6);
});

test("player breakdown has no unnamed row when everything is named", () => {
  const rows = playerBreakdown(scoreEvents([{ key: "standard:masks", at: 1, by: "Adam" }]), ["Adam"]);
  assert.deepEqual(rows.map((r) => r.player), ["Adam"]);
});

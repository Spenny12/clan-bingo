import test from "node:test";
import assert from "node:assert/strict";
import { projection, funFacts, eventsOf } from "../shared/insights.mjs";

const DAY = 864e5;
const t0 = Date.parse("2026-11-01T12:00:00Z");
const tl = (...pairs) => { let run = 0; return pairs.map(([at, pts]) => [at, (run += pts)]); };

test("eventsOf turns a running total back into scoring events", () => {
  assert.deepEqual(eventsOf(tl([1, 6], [2, 10])), [{ at: 1, pts: 6 }, { at: 2, pts: 10 }]);
});

test("projection extends the average pace to the end date", () => {
  // 30 points over 3 days = 10/day; 7 days left.
  const timeline = tl([t0 + DAY, 10], [t0 + 2 * DAY, 10], [t0 + 3 * DAY, 10]);
  const p = projection(timeline, { start: t0, end: t0 + 10 * DAY, now: t0 + 3 * DAY });
  assert.equal(p.total, 30);
  assert.equal(p.pace, 10);
  assert.equal(p.projected, 100);
  assert.equal(p.daysLeft, 7);
  assert.ok(p.low <= p.projected && p.projected <= p.high);
});

test("projection copes with no data and with the end date passed", () => {
  const p = projection([], { start: null, end: t0, now: t0 + DAY });
  assert.deepEqual([p.total, p.pace, p.projected], [0, 0, 0]);
  const done = projection(tl([t0, 6]), { start: t0 - 5 * DAY, end: t0 + DAY, now: t0 + 2 * DAY });
  assert.equal(done.projected, 6);
  assert.equal(done.daysLeft, 0);
});

test("a slowing team's low estimate follows its recent pace", () => {
  const timeline = tl([t0, 40], [t0 + 9 * DAY, 1]); // fast start, nothing lately
  const p = projection(timeline, { start: t0 - DAY, end: t0 + 20 * DAY, now: t0 + 10 * DAY });
  assert.ok(p.recent < p.pace);
  assert.ok(p.low < p.high);
});

test("fun facts: nothing to say before anyone scores", () => {
  assert.deepEqual(funFacts([{ id: "a", name: "A", timeline: [] }], []), []);
});

test("fun facts: lead changes, comeback, biggest day and burst", () => {
  // Alpha 10 (day 0), Bravo 6+6 inside a minute on day 1 (takes the lead from 4 behind), Alpha +10 (day 2, retakes it), Bravo +8 (day 3, ties 20-20).
  const a = { id: "a", name: "Alpha", timeline: tl([t0, 10], [t0 + 2 * DAY, 10]) };
  const b = { id: "b", name: "Bravo", timeline: tl([t0 + DAY, 6], [t0 + DAY + 1000, 6], [t0 + 3 * DAY, 8]) };
  const facts = funFacts([a, b], [{ player: "X", teamName: "Alpha", total: 20, ticks: 3, streak: { best: 2 } }], t0 + 4 * DAY);
  const by = Object.fromEntries(facts.map((f) => [f.title, f.text]));
  assert.match(by["Biggest day"], /Bravo scored 12/);
  assert.match(by["Hottest hour"], /Bravo took 12/);
  assert.match(by["Lead changes"], /2 times/);
  assert.match(by["Lead changes"], /Bravo, from 4 behind/);
  assert.match(by["Longest streak"], /X/);
  assert.match(by["Big hitter"], /6\.7/);
});

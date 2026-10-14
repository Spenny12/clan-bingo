import { cycleTheme, themeLabel } from "/theme.js";
const $ = (s, el = document) => el.querySelector(s);
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat()) e.append(k instanceof Node ? k : document.createTextNode(k));
  return e;
};
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
};

let board, current, state, scores, charts = {};
const SCOREBOARD = "scoreboard";
const ui = { tab: "overview", hideDone: false, q: "", player: null };
const api = async (path, opts = {}, pw) => {
  const res = await fetch(path, { ...opts, headers: { "content-type": "application/json", "x-password": pw || "" } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Error ${res.status}`), { status: res.status });
  return data;
};

async function init() {
  board = await (await fetch("/api/tasks")).json();
  const tabs = $("#tabs");
  tabs.append(el("button", { class: "tab", role: "tab", "data-team": SCOREBOARD, onclick: () => select(SCOREBOARD) }, "🏆 Scoreboard"));
  for (const t of board.teams) {
    tabs.append(el("button", { class: "tab", role: "tab", "data-team": t.id, onclick: () => select(t.id) }, t.name));
  }
  const last = store.get("bingo:team");
  select(last && board.teams.some((t) => t.id === last) ? last : SCOREBOARD);
}

function select(id) {
  store.set("bingo:team", id);
  for (const b of document.querySelectorAll(".tab")) b.setAttribute("aria-selected", String(b.dataset.team === id));
  state = null;
  for (const c of Object.values(charts)) c.destroy();
  charts = {};
  if (id === SCOREBOARD) { current = null; return showScoreboard(); }
  current = board.teams.find((t) => t.id === id);
  const pw = store.get(`bingo:pw:${id}`);
  if (pw) load(pw, true); else showLogin();
}

function showLogin(message = "") {
  const err = el("div", { class: "err" }, message);
  const pw = el("input", { type: "password", placeholder: "Team password", autocomplete: "current-password", required: true });
  const form = el("form", { class: "login", onsubmit: async (e) => {
    e.preventDefault();
    err.textContent = "";
    await load(pw.value, false, err);
  } }, pw, el("button", { class: "go" }, "Enter"));
  $("#view").replaceChildren(el("div", { class: "card" }, el("h2", {}, current.name), el("p", { class: "mute" }, current.players.join(", ")), form, err));
  pw.focus();
}

async function load(pw, quiet, errEl) {
  try {
    state = await api(`/api/team/${current.id}`, {}, pw);
    store.set(`bingo:pw:${current.id}`, pw);
    render(pw);
  } catch (e) {
    if (e.status === 401) store.set(`bingo:pw:${current.id}`, null);
    if (quiet || !errEl) showLogin(e.status === 401 ? "" : e.message);
    else errEl.textContent = e.message;
  }
}

const has = (key) => state.ticks.some((t) => t.key === key);
const $pts = (n) => `${n} pt${n === 1 ? "" : "s"}`;

const when = (at) => new Date(at).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const byOf = (key) => state.ticks.find((t) => t.key === key)?.by;
const byTag = (...keys) => {
  const names = [...new Set(keys.map(byOf).filter(Boolean))];
  return names.length ? el("div", { class: "by" }, `by ${names.join(", ")}`) : "";
};
const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/** [done, total] for a section, for the tab labels. */
function sectionCount(sec) {
  const n = (f) => sec.tasks.reduce((a, t) => a + f(t), 0);
  if (sec.id === "incremental") return [n((t) => Array.from({ length: t.steps }, (_, i) => has(`${t.id}#${i + 1}`)).filter(Boolean).length), n((t) => t.steps)];
  if (sec.id === "pvp") return [state.pvp.length, sec.tasks.length * 3];
  return [n((t) => (has(t.id) ? 1 : 0)), sec.tasks.length];
}
const isDone = (t) => {
  if (t.kind === "pvp") return state.pvp.some((p) => p.task === t.id);
  if (t.kind === "incremental") return Array.from({ length: t.steps }, (_, i) => has(`${t.id}#${i + 1}`)).every(Boolean);
  if (t.kind === "prestige") return has(t.id) && has(`${t.id}#p`);
  return has(t.id);
};

function render(pw) {
  const view = $("#view");
  for (const c of Object.values(charts)) c.destroy();
  charts = {};
  const s = state.score;
  const who = el("select", { "aria-label": "Ticking as" }, el("option", { value: "" }, "Ticking as…"), ...current.players.map((p) => el("option", { value: p }, p)));
  who.value = store.get(`bingo:who:${current.id}`) || "";
  who.addEventListener("change", () => store.set(`bingo:who:${current.id}`, who.value));

  const tabs = [["overview", "Overview"], ["players", "Players"], ...board.sections.map((sec) => [sec.id, sec.title])];
  const seg = el("div", { class: "seg", role: "tablist" }, ...tabs.map(([id, label]) => {
    const sec = board.sections.find((x) => x.id === id);
    const [d, t] = sec ? sectionCount(sec) : [null, null];
    return el("button", { role: "tab", "aria-selected": String(ui.tab === id), onclick: () => { ui.tab = id; window.scrollTo(0, 0); render(pw); } },
      label, sec ? el("small", {}, `${d}/${t}`) : "");
  }));

  const bar = el("div", { class: "bar" },
    el("span", { class: "name" }, current.name), el("span", { class: "pts" }, String(s.total)), el("span", { class: "mute" }, "pts"),
    el("span", { class: "spacer" }), who,
    el("button", { onclick: () => { store.set(`bingo:pw:${current.id}`, null); showLogin(); } }, "Log out"));

  const body = el("div", {});
  const closed = state.open ? "" : el("div", { class: "closed" }, "🔒 Ticking is closed by the organiser. You can look, but not tick or untick.");
  view.replaceChildren(el("div", { class: "sticky" }, bar, seg, closed), body);
  if (ui.tab === "overview") renderOverview(body);
  else if (ui.tab === "players") renderPlayers(body);
  else renderSection(body, board.sections.find((x) => x.id === ui.tab), pw);
}

function renderOverview(body) {
  const s = state.score;
  const recent = [...state.events].reverse().slice(0, 8);
  body.append(
    el("div", { class: "card" }, el("div", { class: "chips" },
      ...[["Standard", s.standard], ["Chungus", s.chungus], ["Prestige", s.prestige], ["Incremental", s.incremental], ["PvP", s.pvp]].map(([n, v]) => el("span", { class: "chip" }, `${n} ${v}`)))),
    el("div", { class: "charts" },
      el("div", { class: "card" }, el("h2", {}, "Points over time"), el("div", { class: "chart" }, el("canvas", { id: "line" }))),
      el("div", { class: "card" }, el("h2", {}, "Where the points came from"), el("div", { class: "chart" }, el("canvas", { id: "bars" })))),
    el("div", { class: "card" }, el("h2", {}, "Latest ticks"),
      recent.length ? el("ul", { class: "recent" }, ...recent.map((e) => el("li", {}, el("span", {}, e.label, e.by ? el("span", { class: "by" }, ` · ${e.by}`) : ""), el("span", { class: "mute" }, `+${e.points} · ${when(e.at)}`))))
        : el("div", { class: "empty" }, "Nothing ticked yet. Pick a tab above and get going.")));
  draw();
}

function renderSection(body, sec, pw) {
  const list = el("div", {});
  const paint = () => {
    const q = ui.q.trim().toLowerCase();
    const tasks = sec.tasks.filter((t) => (!ui.hideDone || !isDone(t)) && (!q || `${t.name} ${t.condition} ${t.prestige || ""}`.toLowerCase().includes(q)));
    list.replaceChildren(tasks.length ? el("div", { class: "grid" }, ...tasks.map((t) => taskCard(t, pw))) : el("div", { class: "empty" }, "Nothing to show here."));
  };
  const search = el("input", { type: "search", placeholder: "Search tasks…", value: ui.q, "aria-label": "Search tasks", oninput: (e) => { ui.q = e.target.value; paint(); } });
  const hide = el("input", { type: "checkbox", checked: ui.hideDone, onchange: (e) => { ui.hideDone = e.target.checked; paint(); } });
  body.append(el("p", { class: "mute", style: "margin:8px 0 0" }, sec.blurb), el("div", { class: "tools" }, search, el("label", { class: "row" }, hide, "Hide done")), list);
  paint();
}

async function toggle(key, on, pw) {
  let by = store.get(`bingo:who:${current.id}`);
  if (on && !current.players.includes(by)) {
    by = await askWho();
    if (!by) return render(pw); // cancelled: leave the box unticked
    store.set(`bingo:who:${current.id}`, by);
  }
  return api(`/api/team/${current.id}`, { method: "POST", body: JSON.stringify({ key, on, by }) }, pw)
    .then((s) => { state = s; render(pw); })
    .catch((e) => { alert(e.message); render(pw); });
}

/** Every tick needs a player. Resolves to the chosen name, or null if cancelled. Picking also sets "Ticking as…". */
function askWho() {
  return new Promise((resolve) => {
    const dlg = el("dialog", { class: "who-dlg" },
      el("h2", {}, "Who got this?"),
      el("p", { class: "mute" }, "This also sets “Ticking as…”, so you won't be asked again."),
      el("div", { class: "row" }, ...current.players.map((p) => el("button", { type: "button", class: "go", onclick: () => done(p) }, p))),
      el("div", { style: "margin-top:10px" }, el("button", { type: "button", onclick: () => done(null) }, "Cancel")));
    const done = (p) => { dlg.close(); dlg.remove(); resolve(p); };
    dlg.addEventListener("cancel", (e) => { e.preventDefault(); done(null); });
    document.body.append(dlg);
    dlg.showModal();
  });
}

const box = (key, pw, label) => {
  const input = el("input", { type: "checkbox", checked: has(key), disabled: !state.open, onchange: (e) => toggle(key, e.target.checked, pw) });
  return label ? el("label", {}, input, label) : input;
};

function taskCard(t, pw) {
  if (t.kind === "pvp") {
    const wins = state.pvp.filter((p) => p.task === t.id);
    return el("div", { class: "task" + (wins.length ? " done" : "") }, el("div", {}, el("div", { class: "nm" }, t.name),
      el("div", { class: "sub" }, wins.length ? `Placed ${["1st", "2nd", "3rd"][wins[0].place - 1]}: ${$pts(board.points.pvp[wins[0].place - 1])}` : "Awarded by the organiser")));
  }
  if (t.kind === "incremental") {
    const n = Array.from({ length: t.steps }, (_, i) => has(`${t.id}#${i + 1}`)).filter(Boolean).length;
    return el("div", { class: "task" + (n === t.steps ? " done" : "") }, el("div", {}, el("div", { class: "nm" }, `${t.name} (${n}/${t.steps})`),
      el("div", { class: "sub" }, t.condition),
      el("div", { class: "steps" }, ...Array.from({ length: t.steps }, (_, i) => box(`${t.id}#${i + 1}`, pw, String(i + 1)))),
      byTag(...Array.from({ length: t.steps }, (_, i) => `${t.id}#${i + 1}`))));
  }
  if (t.kind === "prestige") {
    const base = has(t.id), pres = has(`${t.id}#p`);
    return el("div", { class: "task" + (base && pres ? " done" : "") }, el("div", {},
      el("div", { class: "nm" }, t.name),
      el("label", {}, box(t.id, pw), ` Base (+5): ${t.condition}`),
      el("label", { style: "display:block;margin-top:4px" }, box(`${t.id}#p`, pw), ` Prestige (+3): ${t.prestige}`),
      pres && !base ? el("div", { class: "zero" }, "Prestige ticked but base isn't: 0 points until the base is done") : "",
      byTag(t.id, `${t.id}#p`)));
  }
  return el("div", { class: "task" + (has(t.id) ? " done" : "") }, box(t.id, pw),
    el("div", {}, el("div", { class: "nm" }, t.name), el("div", { class: "sub" }, t.condition), byTag(t.id)));
}

function draw() {
  const accent = cssVar("--acc"), mute = cssVar("--mute"), line = cssVar("--line");
  Chart.defaults.color = mute;
  Chart.defaults.borderColor = line;
  let run = 0;
  const pts = state.events.map((e) => ({ x: e.at, y: (run += e.points), label: e.label }));
  if (pts.length) { pts.unshift({ x: pts[0].x - 1, y: 0, label: "" }); pts.push({ x: Date.now(), y: run, label: "" }); }
  charts.line = new Chart($("#line"), {
    type: "line",
    data: { datasets: [{ data: pts, borderColor: accent, backgroundColor: accent + "33", fill: true, stepped: true, pointRadius: 2 }] },
    options: {
      parsing: false, animation: false, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { title: (i) => new Date(i[0].raw.x).toLocaleString(), label: (i) => `${i.raw.y} pts ${i.raw.label ? "· " + i.raw.label : ""}` } } },
      scales: { x: { type: "linear", ticks: { callback: (v) => new Date(v).toLocaleDateString(undefined, { day: "numeric", month: "short" }), maxTicksLimit: 5 } }, y: { beginAtZero: true } },
    },
  });
  const sum = (id, f) => board.sections.find((x) => x.id === id).tasks.reduce((a, t) => a + f(t), 0);
  const max = { Standard: sum("standard", () => board.points.standard), Chungus: sum("chungus", () => board.points.chungus),
    Prestige: sum("prestige", () => board.points.prestigeBase + board.points.prestigeBonus), Incremental: sum("incremental", (t) => t.steps * board.points.step),
    PvP: sum("pvp", () => board.points.pvp[0]) };
  const s = state.score;
  const mine = { Standard: s.standard, Chungus: s.chungus, Prestige: s.prestige, Incremental: s.incremental, PvP: s.pvp };
  charts.bars = new Chart($("#bars"), {
    type: "bar",
    data: { labels: Object.keys(mine), datasets: [{ label: "Earned", data: Object.values(mine), backgroundColor: accent }, { label: "Still available", data: Object.keys(mine).map((k) => Math.max(0, max[k] - mine[k])), backgroundColor: mute + "55" }] },
    options: { animation: false, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true } } },
  });
}

// ---- Scoreboard (public: totals and players, never which tasks) ----
const teamColour = (id) => cssVar(`--p${board.teams.findIndex((t) => t.id === id) + 1}`);
const medal = (i) => ["🥇", "🥈", "🥉"][i] || `${i + 1}`;

async function showScoreboard() {
  const view = $("#view");
  if (!scores) view.replaceChildren(el("div", { class: "empty" }, "Loading scores…"));
  try { scores = await api("/api/scoreboard"); }
  catch (e) { return view.replaceChildren(el("div", { class: "card err" }, e.message)); }
  if (current) return; // switched to a team while loading

  const ranked = [...scores.teams].sort((a, b) => b.score.total - a.score.total);
  const lead = ranked[0]?.score.total || 0;
  const secs = Object.keys(SECTION_NAMES);
  const ticked = scores.players.filter((p) => p.ticks > 0);

  view.replaceChildren(
    el("div", { class: "row", style: "margin-top:6px" }, el("span", { class: scores.open ? "pill ok" : "pill shut" }, scores.open ? "● Ticking is open" : "🔒 Ticking is closed"),
      el("span", { class: "mute" }, "Teams see each other's totals here, but not which tasks anyone has done.")),
    el("div", { class: "people" }, ...ranked.map((t, i) => el("div", { class: "person", style: "cursor:default" },
      el("div", { class: "who" }, el("span", { class: "sw", style: `background:${teamColour(t.id)}` }), `${medal(i)} ${t.name}`),
      el("div", { class: "big" }, String(t.score.total), el("span", { class: "mute" }, " pts")),
      el("div", { class: "share" }, el("i", { style: `width:${lead ? Math.round((t.score.total / lead) * 100) : 0}%;background:${teamColour(t.id)}` })),
      el("div", { class: "mute" }, i === 0 ? (lead ? "Leading" : "No points yet") : `${lead - t.score.total} behind 1st`),
      el("div", { class: "mute" }, `${t.ticks} scoring tick${t.ticks === 1 ? "" : "s"}`)))),
    el("div", { class: "card" }, el("h2", {}, "The race"), el("div", { class: "chart" }, el("canvas", { id: "race" }))),
    el("div", { class: "card" }, el("h2", {}, "Points by section"), el("div", { class: "tablewrap" }, el("table", {},
      el("tr", {}, el("th", {}, "Team"), ...secs.map((k) => el("th", { class: "n" }, SECTION_NAMES[k])), el("th", { class: "n" }, "Total")),
      ...ranked.map((t) => el("tr", {}, el("td", {}, el("span", { class: "sw", style: `background:${teamColour(t.id)};margin-right:6px` }), t.name),
        ...secs.map((k) => el("td", { class: "n" }, t.score[k] ? String(t.score[k]) : "–")), el("td", { class: "n" }, el("b", {}, String(t.score.total)))))))),
    el("div", { class: "card" }, el("h2", {}, "Player leaderboard"),
      el("p", { class: "mute", style: "margin-top:0" }, "Points go to whoever was picked in “Ticking as…”. PvP placements and unnamed ticks count for the team, not a player."),
      el("div", { class: "tablewrap" }, el("table", { class: "lb" },
        el("tr", {}, el("th", {}, "#"), el("th", {}, "Player"), el("th", {}, "Team"), el("th", { class: "n" }, "Pts"), el("th", { class: "n" }, "Ticks"), el("th", {}, "Streak"), el("th", {}, "Badges")),
        ...scores.players.map((p, i) => el("tr", {},
          el("td", {}, p.total ? medal(i) : "–"),
          el("td", {}, el("b", {}, p.player)),
          el("td", {}, el("span", { class: "sw", style: `background:${teamColour(p.team)};margin-right:6px` }), p.teamName),
          el("td", { class: "n" }, el("b", {}, String(p.total))), el("td", { class: "n" }, String(p.ticks)),
          el("td", {}, p.streak.current > 1 ? `🔥 ${p.streak.current}` : "", p.streak.best ? el("span", { class: "mute" }, ` best ${p.streak.best}`) : "–"),
          el("td", {}, badgeRow(p.badges)))))),
      ticked.length ? "" : el("div", { class: "empty" }, "Nobody has scored yet.")),
    badgeKey());
  drawRace();
}

/** Every badge, grouped, with how many players hold it. A higher step of a ladder counts as holding the lower ones. */
function badgeKey() {
  const order = Object.keys(scores.badges);
  const holders = (id) => {
    const { tier } = scores.badges[id];
    return scores.players.filter((p) => p.badges.some((b) => b === id || (tier && scores.badges[b].tier === tier && order.indexOf(b) > order.indexOf(id)))).length;
  };
  const groups = [...new Set(Object.values(scores.badges).map((b) => b.group))];
  return el("details", { class: "card" }, el("summary", {}, el("h2", { style: "display:inline" }, `Badges (${order.length})`), el("span", { class: "mute" }, " · tap to see them all")),
    ...groups.map((g) => el("div", {}, el("h3", { class: "kh" }, g), el("div", { class: "key" }, ...order.filter((id) => scores.badges[id].group === g).map((id) => {
      const b = scores.badges[id], n = holders(id);
      return el("div", { class: n ? "" : "locked" }, el("span", { class: b.bad ? "badge bad" : "badge" }, b.icon), el("b", {}, b.name), el("span", { class: "mute" }, ` ${b.desc}`),
        el("span", { class: "by" }, n ? ` · ${n} player${n === 1 ? "" : "s"}` : " · nobody yet"));
    })))));
}

function drawRace() {
  Chart.defaults.color = cssVar("--mute");
  Chart.defaults.borderColor = cssVar("--line");
  const surface = cssVar("--card");
  const all = scores.teams.flatMap((t) => t.timeline.map(([at]) => at));
  const start = all.length ? Math.min(...all) - 1 : Date.now();
  charts.race = new Chart($("#race"), {
    type: "line",
    data: { datasets: scores.teams.map((t) => ({
      label: t.name, borderColor: teamColour(t.id), backgroundColor: teamColour(t.id), borderWidth: 2, stepped: true,
      pointRadius: 0, pointHoverRadius: 5, pointBorderColor: surface,
      data: [{ x: start, y: 0 }, ...t.timeline.map(([x, y]) => ({ x, y })), { x: Date.now(), y: t.timeline.at(-1)?.[1] || 0 }],
    })) },
    options: {
      parsing: false, animation: false, maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: false },
      plugins: { legend: { position: "bottom", labels: { boxWidth: 10, boxHeight: 10 } },
        tooltip: { callbacks: { title: (i) => new Date(i[0].raw.x).toLocaleString(), label: (i) => `${i.dataset.label}: ${i.raw.y} pts` } } },
      scales: { x: { type: "linear", min: start, max: Date.now(), ticks: { callback: (v) => new Date(v).toLocaleDateString(undefined, { day: "numeric", month: "short" }), maxTicksLimit: 6 } }, y: { beginAtZero: true } },
    },
  });
}

// ---- Players tab ----
const SECTION_NAMES = { standard: "Standard", chungus: "Chungus", prestige: "Prestige", incremental: "Incremental", pvp: "PvP" };
const UNNAMED = "Unnamed / PvP";
const nameOf = (r) => r.player ?? UNNAMED;
/** A player's colour follows their roster slot, so it never changes with sorting or filtering. */
const colourOf = (name) => {
  const i = current.players.indexOf(name);
  return i >= 0 && i < 4 ? cssVar(`--p${i + 1}`) : cssVar("--pn");
};

function renderPlayers(body) {
  const rows = state.byPlayer;
  const total = state.score.total || 1;
  const named = rows.filter((r) => r.player !== null).sort((a, b) => b.total - a.total);
  const ordered = [...named, ...rows.filter((r) => r.player === null)];
  const pick = (name) => { ui.player = ui.player === name ? null : name; paint(); };

  const tiles = el("div", { class: "people" });
  const table = el("div", { class: "card" });
  const feed = el("div", { class: "card" });
  body.append(
    el("p", { class: "mute", style: "margin:8px 0 0" }, "Points go to whoever was picked in “Ticking as…” when the box was ticked. Click a player to see their ticks."),
    tiles,
    el("div", { class: "charts" },
      el("div", { class: "card" }, el("h2", {}, "Points over time, by player"), el("div", { class: "chart" }, el("canvas", { id: "pline" }))),
      el("div", { class: "card" }, el("h2", {}, "Points per day, by player"), el("div", { class: "chart" }, el("canvas", { id: "pday" })))),
    table, feed);

  function paint() {
    tiles.replaceChildren(...ordered.map((r) => {
      const pct = Math.round((r.total / total) * 100);
      const c = colourOf(r.player);
      const lb = scores?.players.find((p) => p.team === current.id && p.player === r.player);
      return el("button", { class: "person", type: "button", "aria-pressed": String(ui.player === nameOf(r)), onclick: () => pick(nameOf(r)) },
        el("div", { class: "who" }, el("span", { class: "sw", style: `background:${c}` }), nameOf(r)),
        el("div", { class: "big" }, String(r.total), el("span", { class: "mute" }, " pts")),
        el("div", { class: "share" }, el("i", { style: `width:${pct}%;background:${c}` })),
        el("div", { class: "mute" }, `${pct}% of team · ${r.ticks} tick${r.ticks === 1 ? "" : "s"}`),
        el("div", { class: "mute" }, r.last ? `Last: ${when(r.last)}` : "Nothing yet"),
        lb ? streakLine(lb.streak) : "", lb ? badgeRow(lb.badges) : "");
    }));

    const secs = Object.keys(SECTION_NAMES);
    const sum = (k) => rows.reduce((a, r) => a + r.sections[k], 0);
    table.replaceChildren(el("h2", {}, "Breakdown by section"), el("div", { class: "tablewrap" }, el("table", {},
      el("tr", {}, el("th", {}, "Player"), ...secs.map((k) => el("th", { class: "n" }, SECTION_NAMES[k])), el("th", { class: "n" }, "Ticks"), el("th", { class: "n" }, "Total")),
      ...ordered.map((r) => el("tr", {},
        el("td", {}, el("span", { class: "sw", style: `background:${colourOf(r.player)};margin-right:6px` }), nameOf(r)),
        ...secs.map((k) => el("td", { class: "n" }, r.sections[k] ? String(r.sections[k]) : "–")),
        el("td", { class: "n" }, String(r.ticks)), el("td", { class: "n" }, el("b", {}, String(r.total))))),
      el("tr", { class: "tot" }, el("td", {}, "Team"), ...secs.map((k) => el("td", { class: "n" }, String(sum(k)))),
        el("td", { class: "n" }, String(state.events.length)), el("td", { class: "n" }, String(state.score.total))))));

    const list = [...state.events].reverse().filter((e) => !ui.player || (e.by ?? UNNAMED) === ui.player);
    feed.replaceChildren(
      el("div", { class: "row", style: "justify-content:space-between" }, el("h2", { style: "margin:0" }, ui.player ? `${ui.player}: ticks` : "All ticks"),
        ui.player ? el("button", { type: "button", onclick: () => pick(null) }, "Show everyone") : ""),
      list.length ? el("ul", { class: "recent" }, ...list.slice(0, 50).map((e) => el("li", {},
        el("span", {}, e.label, !ui.player && e.by ? el("span", { class: "by" }, ` · ${e.by}`) : ""),
        el("span", { class: "mute" }, `+${e.points} · ${when(e.at)}`))))
        : el("div", { class: "empty" }, "Nothing ticked yet."));
  }
  paint();
  drawPlayers();
  // Badges and streaks come from the public scoreboard (First blood needs every team's ticks).
  const team = current.id;
  api("/api/scoreboard").then((s) => { scores = s; if (current?.id === team && ui.tab === "players") paint(); }, () => {});
}

const streakLine = (s) => (s.best ? el("div", { class: "mute" }, s.current > 1 ? `🔥 ${s.current}-day streak (best ${s.best})` : `Best streak: ${s.best} day${s.best === 1 ? "" : "s"}`) : "");
const badgeRow = (ids) => (ids.length ? el("div", { class: "badges" }, ...ids.map((id) => {
  const b = scores.badges[id];
  return el("span", { class: b.bad ? "badge bad" : "badge", title: `${b.name}: ${b.desc}` }, b.icon);
})) : "");

function drawPlayers() {
  Chart.defaults.color = cssVar("--mute");
  Chart.defaults.borderColor = cssVar("--line");
  const surface = cssVar("--card");
  const names = state.byPlayer.map(nameOf);
  const evOf = (name) => state.events.filter((e) => (e.by ?? UNNAMED) === name);
  const colourFor = (name) => colourOf(name === UNNAMED ? null : name);
  const start = state.events.length ? state.events[0].at - 1 : Date.now();
  const legend = { position: "bottom", labels: { boxWidth: 10, boxHeight: 10 } };

  // Running total per player: one stepped line each, all starting from 0 together and running to now.
  charts.pline = new Chart($("#pline"), {
    type: "line",
    data: { datasets: names.map((name) => {
      let run = 0;
      const pts = [{ x: start, y: 0, label: "" }, ...evOf(name).map((e) => ({ x: e.at, y: (run += e.points), label: e.label })), { x: Date.now(), y: run, label: "" }];
      return { label: name, data: pts, borderColor: colourFor(name), backgroundColor: colourFor(name), borderWidth: 2, stepped: true,
        pointRadius: (c) => (c.raw?.label ? 3 : 0), pointHoverRadius: 5, pointBorderColor: surface, pointBorderWidth: 1, borderDash: name === UNNAMED ? [4, 3] : [] };
    }) },
    options: {
      parsing: false, animation: false, maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: false },
      plugins: { legend, tooltip: { callbacks: { title: (i) => new Date(i[0].raw.x).toLocaleString(), label: (i) => `${i.dataset.label}: ${i.raw.y} pts${i.raw.label ? " · " + i.raw.label : ""}` } } },
      scales: { x: { type: "linear", min: start, max: Date.now(), ticks: { callback: (v) => new Date(v).toLocaleDateString(undefined, { day: "numeric", month: "short" }), maxTicksLimit: 5 } }, y: { beginAtZero: true } },
    },
  });

  // Points per calendar day, stacked by player.
  const dayOf = (at) => { const d = new Date(at); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
  const days = [];
  if (state.events.length) for (let d = dayOf(state.events[0].at); d <= dayOf(Date.now()); d = dayOf(d + 36 * 3600e3)) days.push(d);
  charts.pday = new Chart($("#pday"), {
    type: "bar",
    data: { labels: days.map((d) => new Date(d).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })),
      datasets: names.map((name) => ({ label: name, backgroundColor: colourFor(name), borderColor: surface, borderWidth: { top: 2 }, borderSkipped: "bottom",
        data: days.map((d) => evOf(name).filter((e) => dayOf(e.at) === d).reduce((a, e) => a + e.points, 0)) })) },
    options: { animation: false, maintainAspectRatio: false,
      plugins: { legend, tooltip: { mode: "index", filter: (i) => i.raw > 0, callbacks: { label: (i) => `${i.dataset.label}: ${i.raw} pts` } } },
      scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true } } },
  });
}

const themeBtn = $("#theme");
themeBtn.textContent = themeLabel();
themeBtn.onclick = () => { cycleTheme(); themeBtn.textContent = themeLabel(); };
window.addEventListener("themechange", () => {
  const redraw = !current ? scores && drawRace : state && { overview: draw, players: drawPlayers }[ui.tab];
  if (!redraw) return;
  for (const c of Object.values(charts)) c.destroy();
  charts = {};
  redraw();
});

init();

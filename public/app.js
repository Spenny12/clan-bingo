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
const ui = { tab: "overview", hideDone: false, q: "", player: null, rulesOpen: false };
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

  const tabs = [["overview", "Overview"], ["players", "Players"], ["left", "What's left"], ...board.sections.map((sec) => [sec.id, sec.title])];
  const seg = el("div", { class: "seg", role: "tablist" }, ...tabs.map(([id, label]) => {
    const sec = board.sections.find((x) => x.id === id);
    const [d, t] = sec ? sectionCount(sec) : [null, null];
    return el("button", { role: "tab", "aria-selected": String(ui.tab === id), onclick: () => { ui.tab = id; window.scrollTo(0, 0); render(pw); } },
      label, sec ? el("small", {}, `${d}/${t}`) : id === "left" ? el("small", {}, `${leftTotal()} pts`) : "");
  }));

  const bar = el("div", { class: "bar" },
    el("span", { class: "name" }, current.name), el("span", { class: "pts" }, String(s.total)), el("span", { class: "mute" }, "pts"),
    el("span", { class: "spacer" }), who,
    el("button", { onclick: () => { store.set(`bingo:pw:${current.id}`, null); showLogin(); } }, "Log out"));

  const body = el("div", {});
  const closed = state.open ? "" : el("div", { class: "closed" }, "🔒 Ticking is closed by the organiser. You can look, but not tick or untick.");
  const rules = el("details", { class: "card rules" }, el("summary", {}, el("b", {}, "General rules"), el("span", { class: "mute" }, " · hover a task's ⓘ for its own rule")),
    el("ul", {}, ...board.generalRules.map((r) => el("li", {}, r))));
  rules.open = ui.rulesOpen; // render() rebuilds the page on every tick, so remember whether it was open
  rules.addEventListener("toggle", () => { ui.rulesOpen = rules.open; });
  view.replaceChildren(el("div", { class: "sticky" }, bar, seg, closed), rules, body);
  if (ui.tab === "overview") renderOverview(body);
  else if (ui.tab === "players") renderPlayers(body);
  else if (ui.tab === "left") renderLeft(body, pw);
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

/** Points this team can still earn on a task (PvP is awarded by the organiser, so it isn't counted). A prestige bonus only scores once the base is ticked. */
function pointsLeft(t) {
  const p = board.points;
  if (t.kind === "incremental") return Array.from({ length: t.steps }, (_, i) => (has(`${t.id}#${i + 1}`) ? 0 : p.step)).reduce((a, b) => a + b, 0);
  if (t.kind === "prestige") return (has(t.id) ? 0 : p.prestigeBase) + (has(t.id) && has(`${t.id}#p`) ? 0 : p.prestigeBonus);
  return has(t.id) ? 0 : p[t.kind];
}
const leftSections = () => board.sections.filter((s) => s.id !== "pvp");
const leftTotal = () => leftSections().reduce((a, s) => a + s.tasks.reduce((b, t) => b + pointsLeft(t), 0), 0);

/** Everything still open, biggest prizes first, so a team can see where its next points are. */
function renderLeft(body, pw) {
  const secs = leftSections();
  const rows = secs.flatMap((sec) => sec.tasks.map((t) => ({ t, sec, left: pointsLeft(t) }))).filter((r) => r.left > 0);
  const total = rows.reduce((a, r) => a + r.left, 0);
  const list = el("div", {});
  const paint = () => {
    const q = ui.q.trim().toLowerCase();
    const shown = rows.filter((r) => !q || `${r.t.name} ${r.t.condition} ${r.t.prestige || ""}`.toLowerCase().includes(q));
    const tiers = [...new Set(shown.map((r) => r.left))].sort((a, b) => b - a);
    list.replaceChildren(...(tiers.length ? tiers.map((n) => {
      const group = shown.filter((r) => r.left === n);
      return el("div", {}, el("h3", { class: "kh" }, `${$pts(n)} left · ${group.length} task${group.length === 1 ? "" : "s"}`),
        el("div", { class: "grid" }, ...group.map((r) => el("div", {}, el("div", { class: "by", style: "margin:0 2px 2px" }, r.sec.title), taskCard(r.t, pw)))));
    }) : [el("div", { class: "empty" }, rows.length ? "Nothing matches." : "Everything is done. Nothing left to tick.")]));
  };
  const search = el("input", { type: "search", placeholder: "Search what's left…", value: ui.q, "aria-label": "Search what's left", oninput: (e) => { ui.q = e.target.value; paint(); } });
  body.append(
    el("div", { class: "card" }, el("h2", {}, `${$pts(total)} still to win`),
      el("div", { class: "chips" }, ...secs.map((sec) => el("span", { class: "chip" }, `${sec.title.replace(/ tasks$/, "")} ${sec.tasks.reduce((a, t) => a + pointsLeft(t), 0)}`))),
      el("p", { class: "mute", style: "margin:8px 0 0" }, "Open tasks grouped by the points still on them (a half-done incremental counts only its remaining steps). PvP placements are awarded by the organiser, so they aren't counted.")),
    el("div", { class: "tools" }, search), list);
  paint();
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

/** A small ⓘ next to a task's name, with the Sheet2 ruling as its hover title — same idiom as the badge icons. */
const ruleTip = (rule) => (rule ? el("span", { class: "info", title: rule }, "ⓘ") : "");

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
    return el("div", { class: "task" + (n === t.steps ? " done" : "") }, el("div", {}, el("div", { class: "nm" }, `${t.name} (${n}/${t.steps})`, ruleTip(t.rule)),
      el("div", { class: "sub" }, t.condition),
      el("div", { class: "steps" }, ...Array.from({ length: t.steps }, (_, i) => box(`${t.id}#${i + 1}`, pw, String(i + 1)))),
      byTag(...Array.from({ length: t.steps }, (_, i) => `${t.id}#${i + 1}`))));
  }
  if (t.kind === "prestige") {
    const base = has(t.id), pres = has(`${t.id}#p`);
    return el("div", { class: "task" + (base && pres ? " done" : "") }, el("div", {},
      el("div", { class: "nm" }, t.name, ruleTip(t.rule)),
      el("label", {}, box(t.id, pw), ` Base (+5): ${t.condition}`),
      el("label", { style: "display:block;margin-top:4px" }, box(`${t.id}#p`, pw), ` Prestige (+3): ${t.prestige}`),
      pres && !base ? el("div", { class: "zero" }, "Prestige ticked but base isn't: 0 points until the base is done") : "",
      byTag(t.id, `${t.id}#p`)));
  }
  return el("div", { class: "task" + (has(t.id) ? " done" : "") }, box(t.id, pw),
    el("div", {}, el("div", { class: "nm" }, t.name, ruleTip(t.rule)), el("div", { class: "sub" }, t.condition), byTag(t.id)));
}

/** The most points a team could earn in each section (PvP assumes a 1st place in every event). */
function sectionMax() {
  const sum = (id, f) => board.sections.find((x) => x.id === id).tasks.reduce((a, t) => a + f(t), 0);
  return { standard: sum("standard", () => board.points.standard), chungus: sum("chungus", () => board.points.chungus),
    prestige: sum("prestige", () => board.points.prestigeBase + board.points.prestigeBonus), incremental: sum("incremental", (t) => t.steps * board.points.step),
    pvp: sum("pvp", () => board.points.pvp[0]) };
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
  const m = sectionMax();
  const max = { Standard: m.standard, Chungus: m.chungus, Prestige: m.prestige, Incremental: m.incremental, PvP: m.pvp };
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
    projectionCard(ranked),
    sectionHeat(ranked),
    factsCard(),
    el("div", { class: "charts" },
      el("div", { class: "card" }, el("h2", {}, "Points per day"), el("div", { class: "chart" }, el("canvas", { id: "tday" }))),
      el("div", { class: "card" }, el("h2", {}, "When teams score"), el("p", { class: "mute", style: "margin:0" }, "Points by hour of the day (UK time)."), el("div", { class: "chart" }, el("canvas", { id: "thour" })))),
    el("div", { class: "card" }, el("h2", {}, "Who's carrying?"), el("p", { class: "mute", style: "margin:0" }, "Each team's points split by player, biggest scorer first. Hover a segment for the name."), el("div", { class: "chart" }, el("canvas", { id: "carry" }))),
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
  drawScoreboard();
}

const fmtDate = (at) => new Date(at).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

/** Where each team is heading if it keeps its pace to the end date. */
function projectionCard(ranked) {
  const b = scores.bingo, byId = Object.fromEntries(scores.teams.map((t) => [t.id, t]));
  const rows = ranked.map((t) => byId[t.id]).sort((x, y) => y.projection.projected - x.projection.projected);
  const range = (p) => (p.low === p.high ? "" : el("span", { class: "mute" }, ` (${p.low} to ${p.high})`));
  return el("div", { class: "card" }, el("h2", {}, "Where it's heading"),
    el("p", { class: "mute", style: "margin:0 0 6px" }, `A straight-line guess at the final score if each team keeps up its pace until the end on ${fmtDate(b.end)}. Early on it swings a lot.`),
    el("div", { class: "chart" }, el("canvas", { id: "proj" })),
    el("div", { class: "tablewrap" }, el("table", {},
      el("tr", {}, el("th", {}, "Team"), ...["Now", "Per day", "Last 3 days", "Projected finish"].map((h) => el("th", { class: "n" }, h))),
      ...rows.map((t) => el("tr", {}, el("td", {}, el("span", { class: "sw", style: `background:${teamColour(t.id)};margin-right:6px` }), t.name),
        el("td", { class: "n" }, String(t.projection.total)), el("td", { class: "n" }, String(t.projection.pace)), el("td", { class: "n" }, String(t.projection.recent)),
        el("td", { class: "n" }, el("b", {}, String(t.projection.projected)), range(t.projection)))))),
    el("p", { class: "mute", style: "margin:6px 0 0" }, `${Math.max(0, Math.round((b.end - b.now) / 864e5))} days left. ${b.startIsFirstTick ? "Pace counts from the first tick anyone made." : `Pace counts from ${fmtDate(b.start)}.`}`));
}

/** Little stories from the scores. Public: only times and totals, never which tasks. */
function factsCard() {
  if (!scores.facts.length) return "";
  return el("div", { class: "card" }, el("h2", {}, "Fun facts"),
    el("div", { class: "facts" }, ...scores.facts.map((f) => el("div", { class: "fact" }, el("span", { class: "ico" }, f.icon), el("div", {}, el("b", {}, f.title), el("div", { class: "mute" }, f.text))))));
}

/** Teams by section: how much of the available points each team has taken, as shaded cells. */
function sectionHeat(ranked) {
  const max = sectionMax(), secs = Object.keys(SECTION_NAMES);
  const total = secs.reduce((a, k) => a + max[k], 0);
  const cell = (n, of) => { const pct = of ? Math.round((n / of) * 100) : 0;
    return el("td", { class: "n", style: `background:color-mix(in srgb,var(--acc) ${Math.round(pct * 0.7)}%,var(--card))` }, `${pct}%`); };
  return el("div", { class: "card" }, el("h2", {}, "How much of the board each team has taken"),
    el("p", { class: "mute", style: "margin:0 0 6px" }, "Share of the points available in each section."),
    el("div", { class: "tablewrap" }, el("table", {},
      el("tr", {}, el("th", {}, "Team"), ...secs.map((k) => el("th", { class: "n" }, SECTION_NAMES[k])), el("th", { class: "n" }, "Overall")),
      ...ranked.map((t) => el("tr", {}, el("td", {}, el("span", { class: "sw", style: `background:${teamColour(t.id)};margin-right:6px` }), t.name),
        ...secs.map((k) => cell(t.score[k], max[k])), cell(t.score.total, total))))));
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

const UK_HOUR = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "numeric", hourCycle: "h23" });
/** A team's scoring events as {at, pts}, worked out from the public cumulative timeline. */
const teamEvents = (t) => t.timeline.map(([at, run], i) => ({ at, pts: run - (i ? t.timeline[i - 1][1] : 0) }));

function drawScoreboard() {
  drawRace(); // also sets the chart text and grid colours
  const surface = cssVar("--card");
  const legend = { position: "bottom", labels: { boxWidth: 10, boxHeight: 10 } };
  const localDay = (at) => { const d = new Date(at); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
  const evs = scores.teams.map((t) => [t, teamEvents(t)]);
  const all = evs.flatMap(([, e]) => e);

  // Solid line so far, dashed line to the projected finish.
  const b = scores.bingo, xmin = b.start ?? b.now - 864e5;
  charts.proj = new Chart($("#proj"), {
    type: "line",
    data: { datasets: scores.teams.flatMap((t) => [
      { label: t.name, borderColor: teamColour(t.id), backgroundColor: teamColour(t.id), borderWidth: 2, stepped: true, pointRadius: 0,
        data: [{ x: xmin, y: 0 }, ...t.timeline.map(([x, y]) => ({ x, y })), { x: b.now, y: t.projection.total }] },
      { label: `${t.name} (projected)`, proj: true, borderColor: teamColour(t.id), backgroundColor: teamColour(t.id), borderWidth: 2, borderDash: [6, 4], pointRadius: [0, 4], pointStyle: "circle",
        data: [{ x: b.now, y: t.projection.total }, { x: b.end, y: t.projection.projected }] },
    ]) },
    options: {
      parsing: false, animation: false, maintainAspectRatio: false, interaction: { mode: "nearest", intersect: false },
      plugins: { legend: { position: "bottom", labels: { boxWidth: 10, boxHeight: 10, filter: (i, d) => !d.datasets[i.datasetIndex].proj } },
        tooltip: { callbacks: { title: (i) => new Date(i[0].raw.x).toLocaleString(), label: (i) => `${i.dataset.label}: ${i.raw.y} pts` } } },
      scales: { x: { type: "linear", min: xmin, max: b.end, ticks: { callback: (v) => new Date(v).toLocaleDateString(undefined, { day: "numeric", month: "short" }), maxTicksLimit: 8 } }, y: { beginAtZero: true } },
    },
  });

  const days = [];
  if (all.length) for (let d = localDay(Math.min(...all.map((e) => e.at))); d <= localDay(Date.now()); d = localDay(d + 36 * 3600e3)) days.push(d);
  charts.tday = new Chart($("#tday"), {
    type: "bar",
    data: { labels: days.map((d) => new Date(d).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })),
      datasets: evs.map(([t, e]) => ({ label: t.name, backgroundColor: teamColour(t.id), data: days.map((d) => e.filter((x) => localDay(x.at) === d).reduce((a, x) => a + x.pts, 0)) })) },
    options: { animation: false, maintainAspectRatio: false, plugins: { legend }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true } } },
  });

  charts.thour = new Chart($("#thour"), {
    type: "line",
    data: { labels: Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0")),
      datasets: evs.map(([t, e]) => ({ label: t.name, borderColor: teamColour(t.id), backgroundColor: teamColour(t.id), borderWidth: 2, tension: 0.3, pointRadius: 0, pointHoverRadius: 4, pointBorderColor: surface,
        data: Array.from({ length: 24 }, (_, h) => e.filter((x) => Number(UK_HOUR.format(x.at)) === h).reduce((a, x) => a + x.pts, 0)) })) },
    options: { animation: false, maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, plugins: { legend }, scales: { y: { beginAtZero: true } } },
  });

  // One bar per team, split into its players (biggest first). Same hue per team, fading with rank.
  const ranked = [...scores.teams].sort((a, b) => b.score.total - a.score.total);
  const rows = ranked.map((t) => ({ t, ps: scores.players.filter((p) => p.team === t.id).sort((a, b) => b.total - a.total) }));
  const alpha = ["ff", "bb", "88", "55"];
  charts.carry = new Chart($("#carry"), {
    type: "bar",
    data: { labels: rows.map((r) => r.t.name),
      datasets: Array.from({ length: Math.max(...rows.map((r) => r.ps.length)) }, (_, i) => ({
        label: `#${i + 1} scorer`, names: rows.map((r) => r.ps[i]?.player || ""), data: rows.map((r) => r.ps[i]?.total || 0),
        backgroundColor: rows.map((r) => teamColour(r.t.id) + alpha[Math.min(i, 3)]), borderColor: surface, borderWidth: 1 })) },
    options: { indexAxis: "y", animation: false, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { filter: (i) => i.raw > 0, callbacks: { label: (i) => `${i.dataset.names[i.dataIndex]}: ${i.raw} pts` } } },
      scales: { x: { stacked: true, beginAtZero: true }, y: { stacked: true, grid: { display: false } } } },
  });
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
      el("div", { class: "card" }, el("h2", {}, "Points per day, by player"), el("div", { class: "chart" }, el("canvas", { id: "pday" }))),
      el("div", { class: "card" }, el("h2", {}, "Where each player scores"), el("p", { class: "mute", style: "margin:0" }, "Points by section: spot who is the clue person, the skiller, the PvMer."), el("div", { class: "chart" }, el("canvas", { id: "pradar" })))),
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

  // Section profile per player: a radar of points in each section.
  const secKeys = Object.keys(SECTION_NAMES);
  charts.pradar = new Chart($("#pradar"), {
    type: "radar",
    data: { labels: secKeys.map((k) => SECTION_NAMES[k]),
      datasets: state.byPlayer.filter((r) => r.total > 0).map((r) => ({ label: nameOf(r), data: secKeys.map((k) => r.sections[k]), borderColor: colourFor(nameOf(r)), backgroundColor: colourFor(nameOf(r)) + "33", borderWidth: 2, pointRadius: 2 })) },
    options: { animation: false, maintainAspectRatio: false, plugins: { legend }, scales: { r: { beginAtZero: true, ticks: { backdropColor: "transparent", precision: 0 } } } },
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
  const redraw = !current ? scores && drawScoreboard : state && { overview: draw, players: drawPlayers }[ui.tab];
  if (!redraw) return;
  for (const c of Object.values(charts)) c.destroy();
  charts = {};
  redraw();
});

init();

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

let board, current, state, charts = {};
const ui = { tab: "overview", hideDone: false, q: "" };
const api = async (path, opts = {}, pw) => {
  const res = await fetch(path, { ...opts, headers: { "content-type": "application/json", "x-password": pw || "" } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Error ${res.status}`), { status: res.status });
  return data;
};

async function init() {
  board = await (await fetch("/api/tasks")).json();
  const tabs = $("#tabs");
  for (const t of board.teams) {
    tabs.append(el("button", { class: "tab", role: "tab", "data-team": t.id, onclick: () => select(t.id) }, t.name));
  }
  const last = store.get("bingo:team");
  if (last && board.teams.some((t) => t.id === last)) select(last);
}

function select(id) {
  current = board.teams.find((t) => t.id === id);
  store.set("bingo:team", id);
  for (const b of document.querySelectorAll(".tab")) b.setAttribute("aria-selected", String(b.dataset.team === id));
  state = null;
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

  const tabs = [["overview", "Overview"], ...board.sections.map((sec) => [sec.id, sec.title])];
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
  view.replaceChildren(el("div", { class: "sticky" }, bar, seg), body);
  if (ui.tab === "overview") renderOverview(body);
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
      recent.length ? el("ul", { class: "recent" }, ...recent.map((e) => el("li", {}, el("span", {}, e.label), el("span", { class: "mute" }, `+${e.points} · ${new Date(e.at).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`))))
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

function toggle(key, on, pw) {
  const by = store.get(`bingo:who:${current.id}`) || undefined;
  return api(`/api/team/${current.id}`, { method: "POST", body: JSON.stringify({ key, on, by }) }, pw)
    .then((s) => { state = s; render(pw); })
    .catch((e) => { alert(e.message); render(pw); });
}

const box = (key, pw, label) => {
  const input = el("input", { type: "checkbox", checked: has(key), onchange: (e) => toggle(key, e.target.checked, pw) });
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
      el("div", { class: "steps" }, ...Array.from({ length: t.steps }, (_, i) => box(`${t.id}#${i + 1}`, pw, String(i + 1))))));
  }
  if (t.kind === "prestige") {
    const base = has(t.id), pres = has(`${t.id}#p`);
    return el("div", { class: "task" + (base && pres ? " done" : "") }, el("div", {},
      el("div", { class: "nm" }, t.name),
      el("label", {}, box(t.id, pw), ` Base (+5): ${t.condition}`),
      el("label", { style: "display:block;margin-top:4px" }, box(`${t.id}#p`, pw), ` Prestige (+3): ${t.prestige}`),
      pres && !base ? el("div", { class: "zero" }, "Prestige ticked but base isn't: 0 points until the base is done") : ""));
  }
  return el("div", { class: "task" + (has(t.id) ? " done" : "") }, box(t.id, pw),
    el("div", {}, el("div", { class: "nm" }, t.name), el("div", { class: "sub" }, t.condition)));
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

const themeBtn = $("#theme");
themeBtn.textContent = themeLabel();
themeBtn.onclick = () => { cycleTheme(); themeBtn.textContent = themeLabel(); };
window.addEventListener("themechange", () => { if (state && ui.tab === "overview") { for (const c of Object.values(charts)) c.destroy(); charts = {}; draw(); } });

init();

import { cycleTheme, themeLabel } from "/theme.js";
const $ = (s) => document.querySelector(s);
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) k.startsWith("on") ? e.addEventListener(k.slice(2), v) : e.setAttribute(k, v);
  for (const k of kids.flat()) e.append(k instanceof Node ? k : document.createTextNode(k));
  return e;
};
const store = {
  get: () => { try { return localStorage.getItem("bingo:organiser"); } catch { return null; } },
  set: (v) => { try { v == null ? localStorage.removeItem("bingo:organiser") : localStorage.setItem("bingo:organiser", v); } catch {} },
};
let pw = store.get(), data, board;

async function call(opts) {
  const res = await fetch("/api/admin", { ...opts, headers: { "content-type": "application/json", "x-password": pw || "" } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error || `Error ${res.status}`), { status: res.status });
  return body;
}

function login(message = "") {
  const err = el("div", { class: "err" }, message);
  const input = el("input", { type: "password", placeholder: "Organiser password", required: "" });
  $("#view").replaceChildren(el("form", { class: "card login", onsubmit: async (e) => {
    e.preventDefault(); pw = input.value; err.textContent = "";
    try { data = await call({}); store.set(pw); render(); } catch (x) { err.textContent = x.message; }
  } }, input, el("button", { class: "go" }, "Enter"), err));
}

async function award(task, place, team) {
  try { data = await call({ method: "POST", body: JSON.stringify({ task, place, team: team || null }) }); render(); }
  catch (e) { alert(e.message); }
}

async function setOpen(open) {
  try { data = await call({ method: "POST", body: JSON.stringify({ open }) }); }
  catch (e) { alert(e.message); }
  render();
}

/** Every ruling in one place: the general rules, then each task that has its own, searchable. Open state survives re-renders. */
let rulesOpen = false, rulesQ = "";
function rulesCard() {
  const tasks = board.sections.flatMap((s) => s.tasks.filter((t) => t.rule).map((t) => ({ ...t, section: s.title })));
  const list = el("div", { class: "tablewrap" });
  const paint = () => {
    const q = rulesQ.trim().toLowerCase();
    const rows = tasks.filter((t) => !q || `${t.name} ${t.condition} ${t.rule}`.toLowerCase().includes(q));
    list.replaceChildren(rows.length ? el("table", {}, el("tr", {}, ...["Task", "Section", "Condition", "Rule"].map((h) => el("th", {}, h))),
      ...rows.map((t) => el("tr", {}, el("td", {}, el("b", {}, t.name)), el("td", { class: "mute" }, t.section), el("td", { class: "mute" }, t.condition), el("td", {}, t.rule))))
      : el("div", { class: "empty" }, "No rules match."));
  };
  const search = el("input", { type: "search", placeholder: "Search rules…", value: rulesQ, oninput: (e) => { rulesQ = e.target.value; paint(); } });
  const d = el("details", { class: "card" }, el("summary", {}, el("h2", { style: "display:inline" }, `Rules (${board.generalRules.length} general, ${tasks.length} task rulings)`)),
    el("h3", { class: "kh" }, "General"), el("ul", {}, ...board.generalRules.map((r) => el("li", {}, r))),
    el("h3", { class: "kh" }, "Per task"), search, list);
  d.open = rulesOpen;
  d.addEventListener("toggle", () => { rulesOpen = d.open; });
  paint();
  return d;
}

async function render() {
  board ||= await (await fetch("/api/tasks")).json();
  const pvpTasks = board.sections.find((s) => s.id === "pvp").tasks;
  const rank = [...data.teams].sort((a, b) => b.score.total - a.score.total);
  const table = el("table", {}, el("tr", {}, ...["Team", "Total", "Standard", "Chungus", "Prestige", "Incr.", "PvP"].map((h) => el("th", {}, h))),
    ...rank.map((t) => el("tr", {}, el("td", {}, t.name), el("td", {}, String(t.score.total)), ...["standard", "chungus", "prestige", "incremental", "pvp"].map((k) => el("td", {}, String(t.score[k]))))));

  const pvp = pvpTasks.map((task) => el("div", { class: "card" }, el("div", { class: "nm" }, task.name),
    el("div", { class: "row" }, ...[1, 2, 3].map((place) => {
      const holder = data.teams.find((t) => t.pvp.some((p) => p.task === task.id && p.place === place));
      const sel = el("select", { "aria-label": `${task.name} place ${place}`, onchange: (e) => award(task.id, place, e.target.value) },
        el("option", { value: "" }, "—"), ...data.teams.map((t) => el("option", { value: t.id }, t.name)));
      sel.value = holder ? holder.id : "";
      return el("label", {}, `${["1st", "2nd", "3rd"][place - 1]} `, sel);
    }))));

  const open = el("input", { type: "checkbox", onchange: (e) => { e.target.disabled = true; setOpen(e.target.checked); } });
  open.checked = data.open;
  const gate = el("div", { class: "card" }, el("label", { class: "row", style: "font-weight:600" }, open, "Teams can tick and untick tasks"),
    el("div", { class: data.open ? "mute" : "err" }, data.open ? "The board is open." : "🔒 The board is locked: teams can look but not change anything. PvP placements still work."));

  $("#view").replaceChildren(gate, el("div", { class: "card" }, el("h2", { style: "margin-top:0" }, "Scores"), table),
    el("h2", {}, "PvP placements"), ...pvp, rulesCard());
}

(async () => {
  if (!pw) return login();
  try { data = await call({}); render(); } catch (e) { login(e.status === 401 ? "" : e.message); }
})();

const tb = document.getElementById("theme"); tb.textContent = themeLabel(); tb.onclick = () => { cycleTheme(); tb.textContent = themeLabel(); };

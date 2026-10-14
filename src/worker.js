import { onRequestGet as tasksGet } from "./api/tasks.js";
import { onRequestGet as teamGet, onRequestPost as teamPost } from "./api/team.js";
import { onRequestGet as adminGet, onRequestPost as adminPost } from "./api/admin.js";
import { json, passwordFor, scoreboard } from "./_lib.js";
import { TEAMS } from "../shared/tasks.mjs";

// Only /api/* reaches this Worker (see run_worker_first in wrangler.toml); everything else is a static file.
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const method = request.method;
    const team = pathname.match(/^\/api\/team\/([a-z]+)\/?$/);
    try {
      if (pathname === "/api/health" && method === "GET") {
        // Booleans only, never values: shows whether the secrets and database are wired up.
        const names = [...TEAMS.map((t) => t.env), "PASS_ORGANISER"];
        const db = await env.DB?.prepare("SELECT COUNT(*) AS n FROM ticks").first().then(() => true, () => false);
        return json({ passwords: Object.fromEntries(await Promise.all(names.map(async (n) => [n, Boolean(await passwordFor(env, n))]))), db: Boolean(db) });
      }
      if (pathname === "/api/tasks" && method === "GET") return tasksGet();
      // Public: every team's totals and the player leaderboard, but not which tasks anyone has done.
      if (pathname === "/api/scoreboard" && method === "GET") return json(await scoreboard(env));
      if (team && method === "GET") return await teamGet({ request, env, params: { id: team[1] } });
      if (team && method === "POST") return await teamPost({ request, env, params: { id: team[1] } });
      if (pathname === "/api/admin" && method === "GET") return await adminGet({ request, env });
      if (pathname === "/api/admin" && method === "POST") return await adminPost({ request, env });
    } catch (e) {
      console.error(e);
      return json({ error: "Server error." }, 500);
    }
    return json({ error: "Not found." }, 404);
  },
};

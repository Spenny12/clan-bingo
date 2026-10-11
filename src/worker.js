import { onRequestGet as tasksGet } from "./api/tasks.js";
import { onRequestGet as teamGet, onRequestPost as teamPost } from "./api/team.js";
import { onRequestGet as adminGet, onRequestPost as adminPost } from "./api/admin.js";
import { json } from "./_lib.js";

// Only /api/* reaches this Worker (see run_worker_first in wrangler.toml); everything else is a static file.
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const method = request.method;
    const team = pathname.match(/^\/api\/team\/([a-z]+)\/?$/);
    try {
      if (pathname === "/api/tasks" && method === "GET") return tasksGet();
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

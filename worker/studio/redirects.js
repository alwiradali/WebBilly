/* Megacity Studio — the "Redirects & 404s" screen's data: which missing
   addresses visitors (and crawlers) hit, grouped, plus the redirects the
   team has added in Settings. The redirects themselves are a settings blob
   (settings.js validates them; host.js applies them on the live host). */

import { json, toInt } from "./db.js";
import { readAll } from "./settings.js";

export async function list404s(c) {
  const days = toInt(c.url.searchParams.get("days")) === 30 ? 30 : 7;
  const limit = Math.min(200, Math.max(1, toInt(c.url.searchParams.get("limit")) || 50));
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const rs = await c.db.prepare(
    `SELECT json_extract(meta_json,'$.path') p, MAX(json_extract(meta_json,'$.kind')) kind, COUNT(*) n, MAX(at) last,
            MAX(json_extract(meta_json,'$.ref')) ref,
            SUM(CASE WHEN json_extract(meta_json,'$.ua')='bot' THEN 1 ELSE 0 END) bots
       FROM events WHERE name='not_found' AND at>=?1 GROUP BY p ORDER BY n DESC, last DESC LIMIT ?2`
  ).bind(since, limit).all();
  const settings = await readAll(c.db);
  return json({
    days, since,
    items: (rs.results || []).filter((r) => r.p).map((r) => ({ path: r.p, kind: r.kind || "page", count: Number(r.n) || 0, lastSeen: r.last, referrer: r.ref || null, bots: Number(r.bots) || 0 })),
    redirects: Array.isArray(settings.redirects) ? settings.redirects : [],
  });
}

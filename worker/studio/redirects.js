/* Megacity Studio — the "Redirects & 404s" screen's data: which missing
   addresses visitors (and crawlers) hit, grouped, plus the redirects the
   team has added in Settings. The redirects themselves are a settings blob
   (settings.js validates them; host.js applies them on the live host). */

import { json, toInt } from "./db.js";
import { readAll } from "./settings.js";
import { notFoundKindOf as kindOf, selfReferred } from "./urls.js";

export async function list404s(c) {
  const days = toInt(c.url.searchParams.get("days")) === 30 ? 30 : 7;
  const limit = Math.min(200, Math.max(1, toInt(c.url.searchParams.get("limit")) || 50));
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const rs = await c.db.prepare(
    `SELECT json_extract(meta_json,'$.path') p, MAX(json_extract(meta_json,'$.kind')) kind, json_extract(meta_json,'$.ref') ref, COUNT(*) n, MAX(at) last,
            SUM(CASE WHEN json_extract(meta_json,'$.ua')='bot' THEN 1 ELSE 0 END) bots
       FROM events WHERE name='not_found' AND at>=?1 GROUP BY p, ref LIMIT 5000`
  ).bind(since).all();
  const settings = await readAll(c.db);
  /* One row per address and referrer, folded back to one per address. Hits
     whose referrer is the missing address itself are a scanner's (see
     selfReferred), so they are not counted; an address with nothing else
     is a probe. */
  const by = new Map();
  for (const r of rs.results || []) {
    if (!r.p) continue;
    let a = by.get(r.p);
    if (!a) by.set(r.p, (a = { path: r.p, kind: kindOf(r.p, r.kind), count: 0, lastSeen: null, referrer: null, bots: 0, refHits: 0, selfHits: 0, selfLast: null }));
    const n = Number(r.n) || 0;
    if (selfReferred(r.p, r.ref)) { a.selfHits += n; if (!a.selfLast || r.last > a.selfLast) a.selfLast = r.last; continue; }
    a.count += n;
    a.bots += Number(r.bots) || 0;
    if (!a.lastSeen || r.last > a.lastSeen) a.lastSeen = r.last;
    if (r.ref && n > a.refHits) { a.referrer = r.ref; a.refHits = n; }
  }
  /* probes are left out before the limit, or a week of scanners would push
     every real address off the list */
  const all = [...by.values()]
    .map((a) => a.count
      ? { path: a.path, kind: a.kind, count: a.count, lastSeen: a.lastSeen, referrer: a.referrer, bots: a.bots }
      : { path: a.path, kind: "probe", count: a.selfHits, lastSeen: a.selfLast, referrer: null, bots: 0 })
    .sort((x, y) => y.count - x.count || String(y.lastSeen).localeCompare(String(x.lastSeen)));
  const probes = all.filter((r) => r.kind === "probe");
  return json({
    days, since,
    items: all.filter((r) => r.kind !== "probe").slice(0, limit),
    probes: { addresses: probes.length, hits: probes.reduce((a, r) => a + r.count, 0) },
    redirects: Array.isArray(settings.redirects) ? settings.redirects : [],
  });
}

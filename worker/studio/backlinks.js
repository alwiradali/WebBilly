/* Megacity Studio — backlinks tracker.
   Links are earned by asking; nothing here creates one. The Studio keeps the
   list of links asked for and won, and the Worker checks whether each source
   page still links to the site. */

import { uid, nowIso, HttpError, json, readJsonBody, clampStr, audit, bump } from "./db.js";

const STATUSES = ["planned", "requested", "live", "lost"];

/* the checker fetches staff-supplied addresses: never our own hosts, never
   bare addresses or local names, and only a handful of checks per person */
function checkable(env, url, source) {
  let h;
  try { h = new URL(source).hostname.toLowerCase(); } catch { return false; }
  if (!/\./.test(h) || /^\d+\.\d+\.\d+\.\d+$/.test(h) || /^\[/.test(h) || /(^|\.)(localhost|local|internal|lan)$/.test(h)) return false;
  const own = [url.hostname, "billydigitals.com", "www.billydigitals.com"].concat(String(env.MEGACITY_HOST || "").split(",")).map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !own.includes(h);
}
async function allow(c) {
  const rl = await bump(c.db, "backlink:user:" + c.user.id, 3600e3, 40);
  if (!rl.ok) throw new HttpError(429, "That is enough link checks for now; try again later.", { retryAfter: rl.retryAfter });
}

function toJson(r) {
  return { id: r.id, sourceUrl: r.source_url, targetPath: r.target_path, anchor: r.anchor, contact: r.contact, notes: r.notes, status: r.status, lastCheckedAt: r.last_checked_at, lastResult: r.last_result, createdAt: r.created_at };
}
function url(v, field) {
  const s = clampStr(v, 500);
  if (!s || !/^https?:\/\/[^\s]+$/i.test(s)) throw new HttpError(400, `${field} must be a full address starting with https://`);
  return s;
}

export async function list(c) {
  const rows = (await c.db.prepare(`SELECT * FROM backlinks ORDER BY CASE status WHEN 'live' THEN 0 WHEN 'requested' THEN 1 WHEN 'planned' THEN 2 ELSE 3 END, created_at DESC`).all()).results || [];
  const counts = { planned: 0, requested: 0, live: 0, lost: 0 };
  rows.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
  return json({ items: rows.map(toJson), counts });
}

export async function create(c) {
  const body = await readJsonBody(c.request);
  const row = {
    id: uid("b"), source_url: url(body.sourceUrl, "The source page"), target_path: clampStr(body.targetPath, 300) || "/",
    anchor: clampStr(body.anchor, 200), contact: clampStr(body.contact, 200), notes: clampStr(body.notes, 2000),
    status: STATUSES.includes(body.status) ? body.status : "planned", created_at: nowIso(),
  };
  await c.db.prepare(`INSERT INTO backlinks (id, source_url, target_path, anchor, contact, notes, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`)
    .bind(row.id, row.source_url, row.target_path, row.anchor, row.contact, row.notes, row.status, row.created_at).run();
  await audit(c.db, { userId: c.user.id, action: "backlink.added", entity: "backlink", entityId: row.id, detail: { source: row.source_url } });
  return json(toJson(row), 201);
}

export async function patch(c) {
  const r = await c.db.prepare(`SELECT * FROM backlinks WHERE id=?1`).bind(c.params.id).first();
  if (!r) throw new HttpError(404, "No such link.");
  const body = await readJsonBody(c.request);
  const sets = {};
  if ("sourceUrl" in body) sets.source_url = url(body.sourceUrl, "The source page");
  if ("targetPath" in body) sets.target_path = clampStr(body.targetPath, 300) || "/";
  for (const [k, col, n] of [["anchor", "anchor", 200], ["contact", "contact", 200], ["notes", "notes", 2000]]) if (k in body) sets[col] = clampStr(body[k], n);
  if ("status" in body) { if (!STATUSES.includes(body.status)) throw new HttpError(400, "Unknown status."); sets.status = body.status; }
  const keys = Object.keys(sets);
  if (keys.length) await c.db.prepare(`UPDATE backlinks SET ${keys.map((k, i) => `${k}=?${i + 1}`).join(", ")} WHERE id=?${keys.length + 1}`).bind(...keys.map((k) => sets[k]), r.id).run();
  return json(toJson(await c.db.prepare(`SELECT * FROM backlinks WHERE id=?1`).bind(r.id).first()));
}

export async function remove(c) {
  await c.db.prepare(`DELETE FROM backlinks WHERE id=?1`).bind(c.params.id).run();
  return json({ ok: true });
}

/* Does the source page link to us? Looks for the site's host and, when a
   target path is set, that path. */
async function probe(env, url, r) {
  const base = (env.MEGACITY_PUBLIC_BASE || (url.origin + "/templates/")).replace(/\/?$/, "/");
  const host = new URL(base).host.replace(/^www\./, "");
  if (!checkable(env, url, r.source_url)) return { status: r.status === "planned" ? "planned" : "lost", result: "That address cannot be checked from here." };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10000);
  try {
    const res = await fetch(r.source_url, { signal: ctl.signal, redirect: "manual", headers: { "user-agent": "Mozilla/5.0 (compatible; MegacityLinkCheck/1.0; +https://megacityproperties.co.uk)", accept: "text/html" } });
    if (res.status >= 300 && res.status < 400) return { status: "lost", result: `The page redirects (${res.status}) — check the address and try again.` };
    if (!res.ok) return { status: "lost", result: `The page answered ${res.status}.` };
    const html = (await res.text()).slice(0, 2_000_000);
    const hrefs = [...html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
    const ours = hrefs.filter((h) => h.replace(/^https?:\/\/(www\.)?/, "").toLowerCase().startsWith(host.toLowerCase()));
    if (!ours.length) return { status: "lost", result: "The page does not link to the site." };
    const target = (r.target_path || "/").replace(/\/+$/, "");
    const hit = target && target !== "" ? ours.find((h) => h.replace(/\/+$/, "").endsWith(target)) : ours[0];
    if (target && !hit) return { status: "live", result: `Links to the site (${ours.length}), but not to ${r.target_path}: ${ours[0]}` };
    return { status: "live", result: `Link found: ${hit || ours[0]}` };
  } catch (e) {
    return { status: "lost", result: e.name === "AbortError" ? "The page took too long to answer." : "Could not fetch the page (" + (e.message || "error") + ")." };
  } finally { clearTimeout(timer); }
}

export async function check(c) {
  const r = await c.db.prepare(`SELECT * FROM backlinks WHERE id=?1`).bind(c.params.id).first();
  if (!r) throw new HttpError(404, "No such link.");
  await allow(c);
  const p = await probe(c.env, c.url, r);
  await c.db.prepare(`UPDATE backlinks SET status=?1, last_checked_at=?2, last_result=?3 WHERE id=?4`).bind(p.status, nowIso(), p.result, r.id).run();
  return json(toJson(await c.db.prepare(`SELECT * FROM backlinks WHERE id=?1`).bind(r.id).first()));
}

export async function checkAll(c) {
  await allow(c);
  const rows = (await c.db.prepare(`SELECT * FROM backlinks WHERE status IN ('requested','live','lost') ORDER BY last_checked_at ASC LIMIT 12`).all()).results || [];
  c.ctx.waitUntil((async () => {
    for (const r of rows) {
      const p = await probe(c.env, c.url, r);
      await c.db.prepare(`UPDATE backlinks SET status=?1, last_checked_at=?2, last_result=?3 WHERE id=?4`).bind(p.status, nowIso(), p.result, r.id).run().catch(() => {});
    }
  })());
  return json({ ok: true, checking: rows.length });
}

/* Megacity Studio — enquiries and first-party events.

   Every public form still emails the office exactly as before; this module
   also writes the enquiry to D1 so the Studio has an inbox, raises a
   notification, and records the site's own events (listing views, tour
   opens, enquiries) without any third-party tracking. */

import { officeDb, uid, nowIso, json, HttpError, readJsonBody, clampStr, isEmail, clientIp, bump, audit, getSetting, parseJson, sha256Hex } from "./db.js";
import { valid, label } from "./options.js";
import { sendEmail, layout, esc } from "./email.js";

export const FALLBACK_TO = "hello@billydigitals.com";

/* where office notifications go: Settings → Notifications, else the demo inbox */
export async function notifyTo(env) {
  const db = officeDb(env);
  if (!db) return [FALLBACK_TO];
  try {
    const list = await getSetting(db, "notifyEmails", []);
    return Array.isArray(list) && list.length ? list : [FALLBACK_TO];
  } catch { return [FALLBACK_TO]; }
}

function sourceFrom(topic, fallback) {
  const t = String(topic || "").toLowerCase();
  if (/valuation/.test(t)) return "valuation";
  if (/register/.test(t)) return "register";
  return fallback;
}

/* Best-effort: never throws, never blocks the email. */
export async function recordEnquiry(env, e) {
  const db = officeDb(env);
  if (!db) return null;
  try {
    const id = uid("q");
    const now = nowIso();
    const attr = e.attr && typeof e.attr === "object" ? e.attr : {};
    const source = valid("enquirySource", e.source) && e.source ? e.source : sourceFrom(e.topic, "contact");
    await db.prepare(
      `INSERT INTO enquiries (id, created_at, source, status, name, email, phone, listing_id, message, preferred_day,
         utm_source, utm_medium, utm_campaign, referrer, landing_url)
       VALUES (?1, ?2, ?3, 'new', ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`
    ).bind(id, now, source, clampStr(e.name, 120) || "Unknown", clampStr(e.email, 160), clampStr(e.phone, 60), clampStr(e.listingId, 80),
      clampStr(e.message, 4000), clampStr(e.preferredDay, 80),
      clampStr(attr.utm_source, 80), clampStr(attr.utm_medium, 80), clampStr(attr.utm_campaign, 120), clampStr(attr.referrer, 300), clampStr(attr.landing, 300)).run();
    const title = label("enquirySource", source) + (e.property ? " — " + String(e.property).slice(0, 80) : "") + ": " + (clampStr(e.name, 60) || "Unknown");
    await db.prepare(`INSERT INTO notifications (id, at, kind, title, body, link) VALUES (?1, ?2, 'enquiry', ?3, ?4, ?5)`)
      .bind(uid("n"), now, title, clampStr(e.message, 200), "#/enquiries/" + id).run();
    await db.prepare(`INSERT INTO events (id, at, name, listing_id, session_hash, meta_json) VALUES (?1, ?2, 'enquiry', ?3, NULL, ?4)`)
      .bind(uid("e"), now, clampStr(e.listingId, 80), JSON.stringify({ source })).run();
    return id;
  } catch (err) {
    console.error("recordEnquiry", err);
    return null;
  }
}

/* ── studio inbox ──────────────────────────────────────────────────────── */
function row(r) {
  return {
    id: r.id, createdAt: r.created_at, source: r.source, sourceLabel: label("enquirySource", r.source), status: r.status,
    name: r.name, email: r.email, phone: r.phone, listingId: r.listing_id, listingTitle: r.listing_title || null,
    message: r.message, preferredDay: r.preferred_day,
    attribution: { utmSource: r.utm_source, utmMedium: r.utm_medium, utmCampaign: r.utm_campaign, referrer: r.referrer, landingUrl: r.landing_url },
    handledBy: r.handled_by_name || null, handledAt: r.handled_at, note: r.note,
  };
}

export async function list(c) {
  const p = c.url.searchParams;
  const where = [], binds = [];
  const status = p.get("status");
  if (status && ["new", "handled", "spam"].includes(status)) { binds.push(status); where.push(`e.status=?${binds.length}`); }
  const source = p.get("source");
  if (source && valid("enquirySource", source)) { binds.push(source); where.push(`e.source=?${binds.length}`); }
  if (p.get("listingId")) { binds.push(p.get("listingId")); where.push(`e.listing_id=?${binds.length}`); }
  const limit = Math.min(300, Math.max(1, Number(p.get("limit")) || 100));
  binds.push(limit);
  const rs = await c.db.prepare(
    `SELECT e.*, l.title AS listing_title, u.name AS handled_by_name FROM enquiries e
       LEFT JOIN listings l ON l.id=e.listing_id LEFT JOIN users u ON u.id=e.handled_by
      ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY e.created_at DESC LIMIT ?${binds.length}`
  ).bind(...binds).all();
  const counts = { new: 0, handled: 0, spam: 0 };
  for (const r of (await c.db.prepare(`SELECT status, COUNT(*) n FROM enquiries GROUP BY status`).all()).results || []) counts[r.status] = Number(r.n);
  return json({ items: (rs.results || []).map(row), counts });
}

export async function get(c) {
  const r = await c.db.prepare(`SELECT e.*, l.title AS listing_title, u.name AS handled_by_name FROM enquiries e LEFT JOIN listings l ON l.id=e.listing_id LEFT JOIN users u ON u.id=e.handled_by WHERE e.id=?1`).bind(c.params.id).first();
  if (!r) throw new HttpError(404, "No such enquiry.");
  return json(row(r));
}

export async function patch(c) {
  const r = await c.db.prepare(`SELECT * FROM enquiries WHERE id=?1`).bind(c.params.id).first();
  if (!r) throw new HttpError(404, "No such enquiry.");
  const body = await readJsonBody(c.request);
  const sets = {};
  if ("status" in body) {
    if (!["new", "handled", "spam"].includes(body.status)) throw new HttpError(400, "Unknown status.");
    sets.status = body.status;
    sets.handled_by = body.status === "new" ? null : c.user.id;
    sets.handled_at = body.status === "new" ? null : nowIso();
  }
  if ("note" in body) sets.note = clampStr(body.note, 2000);
  const keys = Object.keys(sets);
  if (keys.length) {
    await c.db.prepare(`UPDATE enquiries SET ${keys.map((k, i) => `${k}=?${i + 1}`).join(", ")} WHERE id=?${keys.length + 1}`).bind(...keys.map((k) => sets[k]), r.id).run();
    await audit(c.db, { userId: c.user.id, action: "enquiry.updated", entity: "enquiry", entityId: r.id, detail: sets });
  }
  return get(c);
}

/* ── notifications ─────────────────────────────────────────────────────── */
export async function notifications(c) {
  const rows = (await c.db.prepare(`SELECT * FROM notifications WHERE user_id IS NULL OR user_id=?1 ORDER BY at DESC LIMIT 50`).bind(c.user.id).all()).results || [];
  const unread = rows.filter((n) => !n.read_at).length;
  return json({ items: rows.map((n) => ({ id: n.id, at: n.at, kind: n.kind, title: n.title, body: n.body, link: n.link, read: !!n.read_at })), unread });
}

export async function markRead(c) {
  const body = await readJsonBody(c.request);
  const ids = Array.isArray(body.ids) ? body.ids.map(String).slice(0, 200) : null;
  if (ids && ids.length) await c.db.batch(ids.map((id) => c.db.prepare(`UPDATE notifications SET read_at=?1 WHERE id=?2 AND read_at IS NULL`).bind(nowIso(), id)));
  else await c.db.prepare(`UPDATE notifications SET read_at=?1 WHERE read_at IS NULL AND (user_id IS NULL OR user_id=?2)`).bind(nowIso(), c.user.id).run();
  return json({ ok: true });
}

/* ── public: first-party events (sendBeacon) and billy360's lead form ──── */
const EVENT_NAMES = new Set(["listing_view", "tour_open", "tour_room", "tour_hotspot", "tour_cta", "gallery", "share", "apply_click", "call_click", "whatsapp_click"]);
const BILLY_MAP = { open: "tour_open", room: "tour_room", hotspot: "tour_hotspot", cta: "tour_cta", gallery: "gallery" };

export async function publicEvent(request, env) {
  const db = officeDb(env);
  if (!db) return json({ ok: false, connected: false }, 503);
  const rl = await bump(db, "event:ip:" + clientIp(request), 60e3, 120);
  if (!rl.ok) return json({ ok: false }, 429);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false }, 400); }
  const name = BILLY_MAP[body.ev] || body.name;
  if (!EVENT_NAMES.has(name)) return json({ ok: false }, 400);
  const listingId = clampStr(body.listingId || body.site, 80);
  const day = new Date().toISOString().slice(0, 10);
  const session = (await sha256Hex(clientIp(request) + "|" + (request.headers.get("user-agent") || "") + "|" + day)).slice(0, 24);
  const meta = {};
  for (const k of ["room", "kind", "view", "embed"]) if (body[k] != null) meta[k] = String(body[k]).slice(0, 80);
  try {
    await db.prepare(`INSERT INTO events (id, at, name, listing_id, session_hash, meta_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`)
      .bind(uid("e"), nowIso(), name, listingId, session, JSON.stringify(meta)).run();
    if (Math.random() < 0.01) await db.prepare(`DELETE FROM events WHERE at < ?1`).bind(new Date(Date.now() - 90 * 864e5).toISOString()).run();
  } catch (e) { console.error("event", e); }
  return json({ ok: true });
}

export async function publicLead(request, env, ctx) {
  const db = officeDb(env);
  if (!db) return json({ error: "Not connected" }, 503);
  const rl = await bump(db, "lead:ip:" + clientIp(request), 3600e3, 20);
  if (!rl.ok) return json({ error: "Too many requests. Please ring the office." }, 429);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  const name = clampStr(body.name, 120), email = clampStr(body.email, 160), phone = clampStr(body.phone, 60);
  if (!name || !isEmail(email)) return json({ error: "A name and a valid email are needed so the agent can reply." }, 400);
  const property = clampStr(body.property, 160) || clampStr(body.site, 80) || "a property";
  const message = [body.date ? "Preferred date: " + clampStr(body.date, 40) : null, clampStr(body.message, 2000)].filter(Boolean).join("\n");
  const id = await recordEnquiry(env, { source: "tour", name, email, phone, listingId: body.site, property, message, preferredDay: body.date, attr: { landing: body.url } });
  const to = await notifyTo(env);
  const html = layout("Viewing request from the 360° tour",
    `<p><b>${esc(name)}</b> asked to view <b>${esc(property)}</b> while walking the virtual tour${body.room ? " (they were in " + esc(body.room) + ")" : ""}.</p>` +
    `<p>Email: ${esc(email)}<br>Phone: ${esc(phone || "—")}<br>Preferred date: ${esc(body.date || "any")}</p>` +
    (body.message ? `<p>${esc(body.message)}</p>` : "") +
    `<p style="margin-top:14px;font-size:13px;color:#5A617D;">Reply to this email to answer them directly. It is also in the Studio inbox.</p>`);
  const text = `${name} asked to view ${property} from the 360° tour.\nEmail: ${email}\nPhone: ${phone || "—"}\nPreferred date: ${body.date || "any"}\n\n${body.message || ""}`;
  ctx.waitUntil(sendEmail(env, { to, subject: "Viewing request (360° tour) — " + property, html, text, replyTo: email }));
  return json({ ok: true, id });
}

/* ── dashboard numbers ─────────────────────────────────────────────────── */
export async function stats(db) {
  const since7 = new Date(Date.now() - 7 * 864e5).toISOString();
  const since30 = new Date(Date.now() - 30 * 864e5).toISOString();
  const bySource = {};
  for (const r of (await db.prepare(`SELECT source, COUNT(*) n FROM enquiries WHERE created_at >= ?1 GROUP BY source`).bind(since7).all()).results || []) bySource[r.source] = Number(r.n);
  const newCount = Number((await db.prepare(`SELECT COUNT(*) n FROM enquiries WHERE status='new'`).first()).n) || 0;
  const daily = (await db.prepare(`SELECT substr(created_at,1,10) d, COUNT(*) n FROM enquiries WHERE created_at >= ?1 GROUP BY d ORDER BY d`).bind(since30).all()).results || [];
  const ev = {};
  for (const r of (await db.prepare(`SELECT name, COUNT(*) n FROM events WHERE at >= ?1 AND name IN ('listing_view','tour_open','enquiry') GROUP BY name`).bind(since7).all()).results || []) ev[r.name] = Number(r.n);
  return { enquiries: { new: newCount, last7: Object.values(bySource).reduce((a, b) => a + b, 0), bySource, daily: daily.map((d) => [d.d, Number(d.n)]) }, events7: ev };
}

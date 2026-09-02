/* Megacity Studio — listings. The mirror of what the agency lets: manual
   records now, 10ninety-synced records later (Phase 3). Wire format is
   camelCase; the table is snake_case. Blank means "not stated" and is never
   rendered. */

import { uid, nowIso, HttpError, json, readJsonBody, clampStr, toInt, toNum, toBool, parseJson, slugify, audit } from "./db.js";
import { valid } from "./options.js";
import { listForListing, deleteAllForListing, mediaUrl } from "./media.js";

/* camelCase → column, with the coercion to apply. */
const FIELDS = {
  ref: ["ref", (v) => clampStr(v, 40)],
  hidden: ["hidden", (v) => toBool(v) ?? 0],
  title: ["title", (v) => clampStr(v, 160)],
  headline: ["headline", (v) => clampStr(v, 160)],
  type: ["type", (v) => opt("type", v)],
  letType: ["let_type", (v) => opt("letType", v)],
  furnishing: ["furnishing", (v) => opt("furnishing", v)],
  rentPcm: ["rent_pcm", (v) => nonNeg(toInt(v))],
  deposit: ["deposit", (v) => nonNeg(toInt(v))],
  bills: ["bills", (v) => opt("bills", v)],
  billsNote: ["bills_note", (v) => clampStr(v, 200)],
  availability: ["availability", (v) => opt("availability", v)],
  availableFrom: ["available_from", (v) => date(v)],
  minTerm: ["min_term", (v) => opt("minTerm", v)],
  councilTaxBand: ["council_tax_band", (v) => opt("councilTaxBand", v)],
  epcRating: ["epc_rating", (v) => opt("epcRating", v)],
  bedrooms: ["bedrooms", (v) => range(toInt(v), 0, 20)],
  parkingSpaces: ["parking_spaces", (v) => range(toInt(v), 0, 20)],
  parkingNote: ["parking_note", (v) => clampStr(v, 240)],
  pets: ["pets", (v) => opt("pets", v)],
  hmoLicensed: ["hmo_licensed", (v) => toBool(v)],
  floorAreaSqft: ["floor_area_sqft", (v) => range(toInt(v), 0, 100000)],
  summary: ["summary", (v) => clampStr(v, 600)],
  description: ["description", (v) => clampStr(v, 8000)],
  seoTitle: ["seo_title", (v) => clampStr(v, 120)],
  seoDescription: ["seo_description", (v) => clampStr(v, 320)],
  coverMediaId: ["cover_media_id", (v) => clampStr(v, 40)],
};
const ADDRESS = { line1: "address_1", line2: "address_2", town: "town", postcode: "postcode", area: "area" };

function opt(list, v) {
  if (v == null || v === "") return null;
  if (!valid(list, v)) throw new HttpError(400, `"${v}" is not a valid ${list}.`);
  return String(v);
}
function nonNeg(n) { return n == null ? null : Math.max(0, n); }
function range(n, lo, hi) { return n == null ? null : Math.min(hi, Math.max(lo, n)); }
function date(v) {
  const s = clampStr(v, 10);
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new HttpError(400, "Dates must be YYYY-MM-DD.");
  return s;
}

/* The "home" block: bathrooms/receptions arrays, kitchen/garden/driveway singles. */
function normaliseHome(h) {
  const home = { bathrooms: [], receptions: [], kitchen: null, garden: null, driveway: null };
  if (!h || typeof h !== "object") return home;
  const arr = (list, xs) => (Array.isArray(xs) ? xs : []).slice(0, 12).map((x) => ({ subtype: opt(list, x && x.subtype) || null, notes: clampStr(x && x.notes, 120) }));
  const one = (list, x) => (x && typeof x === "object" && (x.subtype || x.notes)) ? { subtype: opt(list, x.subtype) || null, notes: clampStr(x.notes, 120) } : null;
  home.bathrooms = arr("bathroom", h.bathrooms);
  home.receptions = arr("reception", h.receptions);
  home.kitchen = one("kitchen", h.kitchen);
  home.garden = one("garden", h.garden);
  home.driveway = one("driveway", h.driveway);
  return home;
}

function normaliseFeatures(f) {
  const list = Array.isArray(f) ? f : String(f || "").split(/\n/);
  return list.map((s) => String(s).trim()).filter(Boolean).slice(0, 40).map((s) => s.slice(0, 160));
}

/* Turn a wire body into {cols, home, features} ready to write. Only keys
   present in the body are touched (PATCH semantics). */
function toColumns(body) {
  const cols = {};
  for (const [k, [col, coerce]] of Object.entries(FIELDS)) if (k in body) cols[col] = coerce(body[k]);
  if (body.address && typeof body.address === "object") {
    for (const [k, col] of Object.entries(ADDRESS)) if (k in body.address) cols[col] = k === "area" ? opt("area", body.address[k]) : clampStr(body.address[k], k === "postcode" ? 12 : 120);
    if ("lat" in body.address) cols.lat = toNum(body.address.lat);
    if ("lng" in body.address) cols.lng = toNum(body.address.lng);
  }
  if ("home" in body) {
    const home = normaliseHome(body.home);
    cols.home_json = JSON.stringify(home);
    cols.bathrooms = home.bathrooms.length;
    cols.receptions = home.receptions.length;
  }
  if ("features" in body) cols.features_json = JSON.stringify(normaliseFeatures(body.features));
  if (cols.title === null) throw new HttpError(400, "A title is required.");
  if (cols.parking_spaces != null && cols.parking_spaces > 0) cols.parking_note = cols.parking_note ?? null;
  return cols;
}

export function rowToListing(r, media, tour) {
  const home = { bathrooms: [], receptions: [], kitchen: null, garden: null, driveway: null, ...parseJson(r.home_json, {}) };
  return {
    id: r.id, source: r.source, externalId: r.external_id, ref: r.ref, status: r.status, hidden: !!r.hidden,
    title: r.title, headline: r.headline, type: r.type, letType: r.let_type, furnishing: r.furnishing,
    rentPcm: r.rent_pcm, deposit: r.deposit, bills: r.bills, billsNote: r.bills_note,
    availability: r.availability, availableFrom: r.available_from, minTerm: r.min_term,
    councilTaxBand: r.council_tax_band, epcRating: r.epc_rating,
    bedrooms: r.bedrooms, home,
    parkingSpaces: r.parking_spaces, parkingNote: r.parking_note, pets: r.pets,
    hmoLicensed: r.hmo_licensed == null ? null : !!r.hmo_licensed, floorAreaSqft: r.floor_area_sqft,
    address: { line1: r.address_1, line2: r.address_2, town: r.town, postcode: r.postcode, area: r.area, lat: r.lat, lng: r.lng },
    summary: r.summary, description: r.description, features: parseJson(r.features_json, []),
    coverMediaId: r.cover_media_id, seoTitle: r.seo_title, seoDescription: r.seo_description,
    extras: parseJson(r.external_json, null),
    media: media || [], tour: tour || null,
    syncedAt: r.synced_at, publishedAt: r.published_at, deletedAt: r.deleted_at,
    createdAt: r.created_at, updatedAt: r.updated_at, updatedBy: r.updated_by,
  };
}

function summaryRow(r) {
  return {
    id: r.id, source: r.source, ref: r.ref, status: r.status, hidden: !!r.hidden, title: r.title,
    area: r.area, town: r.town, rentPcm: r.rent_pcm, bedrooms: r.bedrooms, bathrooms: r.bathrooms, type: r.type, letType: r.let_type,
    cover: r.cover_thumb || r.first_thumb ? { thumb: mediaUrl(r.cover_thumb || r.first_thumb) } : null,
    mediaCount: Number(r.media_count) || 0,
    tour: r.tour_status ? { status: r.tour_status, health: r.tour_health } : null,
    updatedAt: r.updated_at, publishedAt: r.published_at, deletedAt: r.deleted_at,
  };
}

async function tourSummary(db, id) {
  const t = await db.prepare(`SELECT status, version, health_score, room_count, live_at, updated_at FROM tours WHERE listing_id=?1`).bind(id).first();
  return t ? { status: t.status, version: t.version, health: t.health_score, roomCount: t.room_count, liveAt: t.live_at, updatedAt: t.updated_at } : null;
}

export async function getFull(db, id) {
  const r = await db.prepare(`SELECT * FROM listings WHERE id=?1`).bind(id).first();
  if (!r) return null;
  return rowToListing(r, await listForListing(db, id), await tourSummary(db, id));
}

async function mustGet(db, id, { allowDeleted = false } = {}) {
  const r = await db.prepare(`SELECT * FROM listings WHERE id=?1`).bind(id).first();
  if (!r || (r.deleted_at && !allowDeleted)) throw new HttpError(404, "No such listing.");
  return r;
}

async function uniqueId(db, base) {
  let id = slugify(base) || "listing";
  let i = 1;
  while (await db.prepare(`SELECT id FROM listings WHERE id=?1`).bind(id).first()) id = `${slugify(base) || "listing"}-${++i}`;
  return id;
}

/* ── handlers ──────────────────────────────────────────────────────────── */

export async function list(c) {
  const p = c.url.searchParams;
  const bin = p.get("bin") === "1";
  const status = p.get("status") || "";
  const area = p.get("area") || "";
  const q = (p.get("q") || "").trim().slice(0, 80);
  const sort = { rent: "l.rent_pcm DESC", title: "l.title COLLATE NOCASE ASC", updated: "l.updated_at DESC" }[p.get("sort")] || "l.updated_at DESC";
  const where = [bin ? "l.deleted_at IS NOT NULL" : "l.deleted_at IS NULL"];
  const binds = [];
  if (status && valid("status", status)) { binds.push(status); where.push(`l.status=?${binds.length}`); }
  if (area && valid("area", area)) { binds.push(area); where.push(`l.area=?${binds.length}`); }
  if (q) { binds.push(`%${q}%`); where.push(`(l.title LIKE ?${binds.length} OR l.ref LIKE ?${binds.length} OR l.town LIKE ?${binds.length} OR l.postcode LIKE ?${binds.length} OR l.address_1 LIKE ?${binds.length})`); }
  const rs = await c.db.prepare(
    `SELECT l.*, t.status AS tour_status, t.health_score AS tour_health,
            (SELECT COUNT(*) FROM media m WHERE m.listing_id=l.id) AS media_count,
            (SELECT key_thumb FROM media m WHERE m.id=l.cover_media_id) AS cover_thumb,
            (SELECT key_thumb FROM media m WHERE m.listing_id=l.id AND m.kind IN ('photo','pano') ORDER BY m.sort LIMIT 1) AS first_thumb
       FROM listings l LEFT JOIN tours t ON t.listing_id=l.id
      WHERE ${where.join(" AND ")} ORDER BY ${sort} LIMIT 500`
  ).bind(...binds).all();
  const counts = { draft: 0, live: 0, let_agreed: 0, let: 0, withdrawn: 0, bin: 0, total: 0 };
  for (const row of (await c.db.prepare(`SELECT status, COUNT(*) n FROM listings WHERE deleted_at IS NULL GROUP BY status`).all()).results || []) {
    counts[row.status] = Number(row.n); counts.total += Number(row.n);
  }
  const b = await c.db.prepare(`SELECT COUNT(*) n FROM listings WHERE deleted_at IS NOT NULL`).first();
  counts.bin = Number(b.n) || 0;
  return json({ items: (rs.results || []).map(summaryRow), counts });
}

export async function create(c) {
  const body = await readJsonBody(c.request);
  const cols = toColumns(body);
  if (!cols.title) throw new HttpError(400, "Give the listing a title.");
  const id = body.id && /^[a-z0-9-]{2,80}$/.test(body.id) ? await uniqueId(c.db, body.id) : await uniqueId(c.db, cols.title);
  const now = nowIso();
  const base = { id, source: "manual", status: valid("status", body.status) && body.status ? body.status : "draft", created_at: now, updated_at: now, created_by: c.user.id, updated_by: c.user.id, ...cols };
  const keys = Object.keys(base);
  await c.db.prepare(`INSERT INTO listings (${keys.join(", ")}) VALUES (${keys.map((_, i) => "?" + (i + 1)).join(", ")})`).bind(...keys.map((k) => base[k])).run();
  await audit(c.db, { userId: c.user.id, action: "listing.created", entity: "listing", entityId: id, detail: { title: base.title } });
  return json(await getFull(c.db, id), 201);
}

export async function get(c) {
  const l = await getFull(c.db, c.params.id);
  if (!l) throw new HttpError(404, "No such listing.");
  return json(l);
}

export async function patch(c) {
  const row = await mustGet(c.db, c.params.id);
  const body = await readJsonBody(c.request);
  if (body.updatedAt && row.updated_at && body.updatedAt !== row.updated_at) {
    throw new HttpError(409, "Someone else saved this listing since you opened it.", { listing: await getFull(c.db, row.id) });
  }
  if (row.source === "tenninety") {
    // Synced listings: only the website "extras" may change here; the rest lives in 10ninety.
    const allowed = ["hidden", "parkingSpaces", "parkingNote", "seoTitle", "seoDescription", "coverMediaId", "headline", "home", "pets"];
    for (const k of Object.keys(body)) if (!allowed.includes(k) && k !== "updatedAt") throw new HttpError(400, `"${k}" is managed in 10ninety for this listing.`);
  }
  const cols = toColumns(body);
  if ("status" in body) {
    if (!valid("status", body.status) || !body.status) throw new HttpError(400, "Unknown status.");
    cols.status = body.status;
  }
  if (cols.cover_media_id) {
    const m = await c.db.prepare(`SELECT id FROM media WHERE id=?1 AND listing_id=?2`).bind(cols.cover_media_id, row.id).first();
    if (!m) throw new HttpError(400, "That photo does not belong to this listing.");
  }
  cols.updated_at = nowIso();
  cols.updated_by = c.user.id;
  const keys = Object.keys(cols);
  await c.db.prepare(`UPDATE listings SET ${keys.map((k, i) => `${k}=?${i + 1}`).join(", ")} WHERE id=?${keys.length + 1}`).bind(...keys.map((k) => cols[k]), row.id).run();
  await audit(c.db, { userId: c.user.id, action: "listing.updated", entity: "listing", entityId: row.id, detail: { fields: keys.filter((k) => !/^updated_/.test(k)) } });
  return json(await getFull(c.db, row.id));
}

export async function remove(c) {
  const row = await mustGet(c.db, c.params.id, { allowDeleted: true });
  if (c.url.searchParams.get("hard") === "1") {
    if (c.user.role !== "owner") throw new HttpError(403, "Only an owner can delete a listing for good.");
    await deleteAllForListing(c.env, c.db, row.id);
    await c.db.prepare(`DELETE FROM listings WHERE id=?1`).bind(row.id).run();
    await audit(c.db, { userId: c.user.id, action: "listing.deleted", entity: "listing", entityId: row.id, detail: { title: row.title } });
    return json({ ok: true, deleted: true });
  }
  await c.db.prepare(`UPDATE listings SET deleted_at=?1, updated_at=?1, updated_by=?2, status=CASE WHEN status='live' THEN 'withdrawn' ELSE status END WHERE id=?3`).bind(nowIso(), c.user.id, row.id).run();
  await audit(c.db, { userId: c.user.id, action: "listing.binned", entity: "listing", entityId: row.id, detail: { title: row.title } });
  return json({ ok: true, binned: true });
}

export async function restore(c) {
  const row = await mustGet(c.db, c.params.id, { allowDeleted: true });
  await c.db.prepare(`UPDATE listings SET deleted_at=NULL, updated_at=?1, updated_by=?2 WHERE id=?3`).bind(nowIso(), c.user.id, row.id).run();
  await audit(c.db, { userId: c.user.id, action: "listing.restored", entity: "listing", entityId: row.id });
  return json(await getFull(c.db, row.id));
}

export async function duplicate(c) {
  const row = await mustGet(c.db, c.params.id);
  const id = await uniqueId(c.db, row.id + "-copy");
  const skip = new Set(["id", "status", "hidden", "deleted_at", "cover_media_id", "external_id", "source", "synced_at", "published_at", "created_at", "updated_at", "created_by", "updated_by", "ref", "external_json"]);
  const cols = {};
  for (const k of Object.keys(row)) if (!skip.has(k)) cols[k] = row[k];
  const now = nowIso();
  const base = { id, source: "manual", status: "draft", hidden: 0, title: (row.title || "Listing") + " (copy)", created_at: now, updated_at: now, created_by: c.user.id, updated_by: c.user.id, ...cols, title: (row.title || "Listing") + " (copy)" };
  const keys = Object.keys(base);
  await c.db.prepare(`INSERT INTO listings (${keys.join(", ")}) VALUES (${keys.map((_, i) => "?" + (i + 1)).join(", ")})`).bind(...keys.map((k) => base[k])).run();
  await audit(c.db, { userId: c.user.id, action: "listing.duplicated", entity: "listing", entityId: id, detail: { from: row.id } });
  return json(await getFull(c.db, id), 201);
}

/* What must be true before a listing goes on the website. */
export async function problemsFor(db, l) {
  const problems = [];
  if (!l.title) problems.push("Give the listing a title.");
  if (!l.type) problems.push("Choose the property type.");
  if (!(l.rentPcm > 0)) problems.push("Enter the monthly rent.");
  if (!l.address || !l.address.area) problems.push("Choose the area.");
  if (l.letType !== "room" && !(l.bedrooms >= 0 && l.bedrooms != null)) problems.push("Enter the number of bedrooms.");
  const photos = (l.media || []).filter((m) => m.kind === "photo" || m.kind === "pano");
  if (!photos.length) problems.push("Add at least one photo.");
  if (!l.summary && !l.description) problems.push("Write a summary or description.");
  return problems;
}

export async function publish(c) {
  const row = await mustGet(c.db, c.params.id);
  const l = await getFull(c.db, row.id);
  const problems = await problemsFor(c.db, l);
  if (problems.length) return json({ ok: false, problems });
  if (!l.coverMediaId) {
    const first = l.media.find((m) => m.kind === "photo" || m.kind === "pano");
    if (first) await c.db.prepare(`UPDATE listings SET cover_media_id=?1 WHERE id=?2`).bind(first.id, row.id).run();
  }
  const now = nowIso();
  await c.db.prepare(`UPDATE listings SET status='live', hidden=0, published_at=COALESCE(published_at, ?1), updated_at=?1, updated_by=?2 WHERE id=?3`).bind(now, c.user.id, row.id).run();
  await c.db.prepare(`INSERT INTO events (id, at, name, listing_id, session_hash, meta_json) VALUES (?1, ?2, 'published', ?3, NULL, NULL)`).bind(uid("e"), now, row.id).run().catch(() => {});
  await audit(c.db, { userId: c.user.id, action: "listing.published", entity: "listing", entityId: row.id, detail: { title: row.title } });
  return json({ ok: true, listing: await getFull(c.db, row.id) });
}

export async function unpublish(c) {
  const row = await mustGet(c.db, c.params.id);
  await c.db.prepare(`UPDATE listings SET status='draft', updated_at=?1, updated_by=?2 WHERE id=?3`).bind(nowIso(), c.user.id, row.id).run();
  await audit(c.db, { userId: c.user.id, action: "listing.unpublished", entity: "listing", entityId: row.id });
  return json({ ok: true, listing: await getFull(c.db, row.id) });
}

export async function setStatus(c) {
  const row = await mustGet(c.db, c.params.id);
  const body = await readJsonBody(c.request);
  if (!valid("status", body.status) || !body.status) throw new HttpError(400, "Unknown status.");
  if (body.status === "live") return publish(c);
  await c.db.prepare(`UPDATE listings SET status=?1, updated_at=?2, updated_by=?3 WHERE id=?4`).bind(body.status, nowIso(), c.user.id, row.id).run();
  await audit(c.db, { userId: c.user.id, action: "listing.status", entity: "listing", entityId: row.id, detail: { status: body.status } });
  return json({ ok: true, listing: await getFull(c.db, row.id) });
}

export async function orderMedia(c) {
  const row = await mustGet(c.db, c.params.id);
  const body = await readJsonBody(c.request);
  const ids = Array.isArray(body.ids) ? body.ids.map(String).slice(0, 300) : [];
  const stmts = ids.map((id, i) => c.db.prepare(`UPDATE media SET sort=?1 WHERE id=?2 AND listing_id=?3`).bind(i, id, row.id));
  if (stmts.length) await c.db.batch(stmts);
  await c.db.prepare(`UPDATE listings SET updated_at=?1, updated_by=?2 WHERE id=?3`).bind(nowIso(), c.user.id, row.id).run();
  return json({ ok: true });
}

/* One-off import of the hand-built listings (seed JSON). Upsert by id;
   photos are uploaded separately by the browser through the normal route. */
export async function importLegacy(c) {
  const body = await readJsonBody(c.request, 4_000_000);
  const items = Array.isArray(body.listings) ? body.listings.slice(0, 50) : [];
  let imported = 0;
  for (const item of items) {
    if (!item || !/^[a-z0-9-]{2,80}$/.test(String(item.id || ""))) continue;
    const cols = toColumns(item);
    if (!cols.title) continue;
    const extras = {};
    for (const k of ["depositNote", "services", "links"]) if (item[k] != null) extras[k] = item[k];
    const now = nowIso();
    const exists = await c.db.prepare(`SELECT id FROM listings WHERE id=?1`).bind(item.id).first();
    const base = { ...cols, status: valid("status", item.status) && item.status ? item.status : "draft", external_json: Object.keys(extras).length ? JSON.stringify({ extras }) : null, updated_at: now, updated_by: c.user.id };
    if (exists) {
      const keys = Object.keys(base);
      await c.db.prepare(`UPDATE listings SET ${keys.map((k, i) => `${k}=?${i + 1}`).join(", ")}, deleted_at=NULL WHERE id=?${keys.length + 1}`).bind(...keys.map((k) => base[k]), item.id).run();
    } else {
      const full = { id: item.id, source: "manual", created_at: now, created_by: c.user.id, ...base };
      const keys = Object.keys(full);
      await c.db.prepare(`INSERT INTO listings (${keys.join(", ")}) VALUES (${keys.map((_, i) => "?" + (i + 1)).join(", ")})`).bind(...keys.map((k) => full[k])).run();
    }
    imported++;
  }
  await audit(c.db, { userId: c.user.id, action: "listing.imported", entity: "listing", entityId: null, detail: { count: imported } });
  return json({ ok: true, imported });
}

export async function dashboard(c) {
  const counts = { listings: { live: 0, draft: 0, let_agreed: 0, let: 0, withdrawn: 0, total: 0 }, media: 0, tours: { live: 0, draft: 0 } };
  for (const r of (await c.db.prepare(`SELECT status, COUNT(*) n FROM listings WHERE deleted_at IS NULL GROUP BY status`).all()).results || []) {
    counts.listings[r.status] = Number(r.n); counts.listings.total += Number(r.n);
  }
  counts.media = Number((await c.db.prepare(`SELECT COUNT(*) n FROM media`).first()).n) || 0;
  for (const r of (await c.db.prepare(`SELECT status, COUNT(*) n FROM tours GROUP BY status`).all()).results || []) counts.tours[r.status] = Number(r.n);
  const recent = (await c.db.prepare(
    `SELECT a.at, a.action, a.entity, a.entity_id, a.detail_json, u.name AS user_name FROM audit a LEFT JOIN users u ON u.id=a.user_id
      WHERE a.action NOT IN ('login','login.failed') ORDER BY a.at DESC LIMIT 20`
  ).all()).results || [];
  let activity = null;
  try { activity = await (await import("./enquiries.js")).stats(c.db); } catch (e) { console.error("dashboard stats", e); }
  return json({
    counts,
    enquiries: activity ? activity.enquiries : null,
    events7: activity ? activity.events7 : null,
    recent: recent.map((r) => ({ at: r.at, action: r.action, entity: r.entity, entityId: r.entity_id, user: r.user_name || "System", detail: parseJson(r.detail_json, null) })),
  });
}

export async function auditList(c) {
  const limit = Math.min(200, Math.max(1, Number(c.url.searchParams.get("limit")) || 50));
  const rows = (await c.db.prepare(
    `SELECT a.*, u.name AS user_name FROM audit a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.at DESC LIMIT ?1`
  ).bind(limit).all()).results || [];
  return json({ items: rows.map((r) => ({ id: r.id, at: r.at, action: r.action, entity: r.entity, entityId: r.entity_id, user: r.user_name || "System", detail: parseJson(r.detail_json, null) })) });
}

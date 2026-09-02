/* Megacity Studio — 360° tours.

   The tour JSON is billy360's own shape (docs/billy360.md), stored per
   listing: a draft the Studio edits and a live copy the public viewer reads.
   Panoramas and photos are R2 URLs (/media/…), never base64 — a PUT that
   still carries data: URIs is refused so the rows stay small. */

import { nowIso, HttpError, json, jsonCached, readJsonBody, parseJson, getSetting, audit, uid } from "./db.js";
import { label } from "./options.js";
import { getFull } from "./listings.js";

const MAX_TOUR_BYTES = 1_500_000;
const MAX_DATA_URI = 4096;

/* ── validation ────────────────────────────────────────────────────────── */
function findDataUri(v, path = "$") {
  if (typeof v === "string") return v.startsWith("data:") && v.length > MAX_DATA_URI ? path : null;
  if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) { const p = findDataUri(v[i], `${path}[${i}]`); if (p) return p; } return null; }
  if (v && typeof v === "object") { for (const k of Object.keys(v)) { const p = findDataUri(v[k], `${path}.${k}`); if (p) return p; } }
  return null;
}

function checkTour(tour, listingId) {
  if (!tour || typeof tour !== "object") throw new HttpError(400, "Expected a tour object.");
  if (!Array.isArray(tour.rooms) || !tour.rooms.length) throw new HttpError(400, "A tour needs at least one room.");
  const text = JSON.stringify(tour);
  if (text.length > MAX_TOUR_BYTES) throw new HttpError(413, "The tour is too large to store. Panoramas must be uploaded, not embedded.");
  const bad = findDataUri(tour);
  if (bad) throw new HttpError(413, `The tour still embeds an image at ${bad}. Upload it first.`, { path: bad });
  const ids = new Set();
  for (const r of tour.rooms) {
    if (!r || typeof r.id !== "string" || !r.id) throw new HttpError(400, "Every room needs an id.");
    if (ids.has(r.id)) throw new HttpError(400, `Room id "${r.id}" appears twice.`);
    ids.add(r.id);
  }
  tour.id = listingId;
  return text;
}

function summary(t) {
  return t ? { status: t.status, version: t.version, health: t.health_score, roomCount: t.room_count, liveAt: t.live_at, updatedAt: t.updated_at, updatedBy: t.updated_by } : null;
}

/* ── skeleton: the listing tells us which rooms exist ──────────────────── */
const BLANK_PLAN =
  '<rect class="fp-out" x="6" y="6" width="108" height="68" rx="2"/>' +
  '<rect class="fp-rm" x="6" y="6" width="108" height="68"/>' +
  '<path class="fp-glaze" d="M6 74h108"/>';
const LAYOUT_SPACE = {
  2: { w: 12.5, h: 3.4, d: 10.5, cam: [0.4, 1.9] },
  6: { w: 6.6, h: 3.0, d: 7.8, cam: [0, 2.2] },
  8: { w: 15, h: 3.1, d: 9.5, cam: [0, 1.6], open: true, glaze2: "+x", warm: 1 },
  9: { w: 3.4, h: 2.9, d: 16, cam: [0, 1.2] },
  10: { w: 9, h: 3.2, d: 8.5, cam: [0, 2.2], warm: 0.35 },
};
const LAYOUT_KIND = { 2: "Café", 6: "Meeting room", 8: "Terrace (open roof)", 9: "Hallway", 10: "Lounge" };
const PALETTE = { wall: "#e2e6ec", floor: "#87837c", accent: "#176B99", light: "#ffe8c8", wood: "#b78448", fabric: "#42536b" };

function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "room"; }
function rid() { return Math.random().toString(36).slice(2, 5); }

function newRoom(name, floorId, layout, kind) {
  const base = LAYOUT_SPACE[layout] || LAYOUT_SPACE[10];
  return {
    id: slug(name) + "-" + rid(), name, short: name, kind: kind || LAYOUT_KIND[layout] || "Lounge", floor: floorId,
    area: "", capacity: "", ceiling: "", description: "",
    plan: [60, 40], north: -90,
    view: { yaw: 0, pitch: -6, fov: 80 },
    pano: null,
    space: {
      w: base.w, h: base.h, d: base.d, eye: 1.62, cam: base.cam.slice(),
      layout, glaze: "+z", glaze2: base.glaze2 || "+x", open: !!base.open,
      seed: +(Math.random() * 30).toFixed(1), exposure: 1.04, city: 1, warm: base.warm || 0,
      palette: { ...PALETTE },
    },
    hotspots: [],
  };
}

export function buildSkeleton(listing, brand, agent) {
  const home = listing.home || {};
  const type = listing.type || "";
  const isRoomLet = listing.letType === "room" || type === "room_in_share";
  const stairs = /^house_|maisonette/.test(type);
  const floors = [{ id: "g", name: "Ground Floor", short: "G", plan: BLANK_PLAN }];
  if (stairs) floors.push({ id: "f1", name: "First Floor", short: "1", plan: BLANK_PLAN });
  const rooms = [];
  const add = (name, floorId, layout, kind) => { const r = newRoom(name, floorId, layout, kind); rooms.push(r); return r; };

  const driveway = home.driveway ? add(home.driveway.subtype === "garage" ? "Garage" : "Driveway", "g", 8, "Outside") : null;
  const hall = add("Hallway", "g", 9, "Hallway");
  const livings = (home.receptions || []).map((r, i, arr) => add(arr.length > 1 && !r.subtype ? `Living space ${i + 1}` : (label("reception", r.subtype) || "Living room"), "g", 10, "Living"));
  const kitchen = home.kitchen ? add(home.kitchen.subtype === "kitchen_diner" ? "Kitchen / diner" : "Kitchen", "g", 2, "Kitchen") : null;
  const landing = stairs ? add("Landing", "f1", 9, "Hallway") : null;
  const up = stairs ? "f1" : "g";
  const beds = [];
  const bedCount = isRoomLet ? 1 : Math.max(0, Number(listing.bedrooms) || 0);
  for (let i = 1; i <= bedCount; i++) beds.push(add(isRoomLet ? "The room" : bedCount === 1 ? "Bedroom" : `Bedroom ${i}`, up, 6, "Bedroom"));
  const baths = (home.bathrooms || []).map((b, i, arr) => add(b.subtype ? label("bathroom", b.subtype).replace(/^Bathroom, shower over bath$/, "Bathroom") : arr.length === 1 ? "Bathroom" : `Bathroom ${i + 1}`, up, 6, "Bathroom"));
  const garden = home.garden ? add(label("garden", home.garden.subtype) || "Garden", "g", 8, "Outside") : null;

  const doorYaw = (r) => -70 + ((r.hotspots || []).length * 55) % 320;
  const hasNav = (a, b) => (a.hotspots || []).some((h) => h.type === "nav" && h.to === b.id);
  const link = (a, b) => {
    if (!a || !b) return;
    if (!hasNav(a, b)) a.hotspots.push({ id: "h" + rid() + rid(), type: "nav", to: b.id, yaw: doorYaw(a), pitch: -4, label: "To " + b.name, auto: true });
    if (!hasNav(b, a)) b.hotspots.push({ id: "h" + rid() + rid(), type: "nav", to: a.id, yaw: doorYaw(b), pitch: -4, label: "To " + a.name, auto: true });
  };
  link(driveway, hall);
  livings.forEach((l) => link(hall, l));
  link(hall, kitchen);
  if (kitchen && garden) link(kitchen, garden); else link(hall, garden);
  if (landing) link(hall, landing);
  const hub = landing || hall;
  beds.forEach((r) => link(hub, r));
  baths.forEach((r) => link(hub, r));
  floors.forEach((f) => rooms.filter((r) => r.floor === f.id).forEach((r, idx) => { r.plan = [18 + (idx % 4) * 28, 18 + Math.floor(idx / 4) * 22]; }));

  const a = listing.address || {};
  const location = [a.line1, a.line2, a.town].filter(Boolean).join(", ");
  const price = listing.rentPcm ? "£" + Number(listing.rentPcm).toLocaleString("en-GB") + " pcm" : "";
  return {
    id: listing.id, version: 1,
    brand: brand || {},
    project: {
      name: listing.title || listing.id, slug: listing.id, location, area: label("area", a.area) || "",
      floors: floors.length, duration: "2 min", captured: "", summary: listing.summary || "",
      price, status: "To let", beds: isRoomLet ? 1 : (listing.bedrooms ?? null), baths: (home.bathrooms || []).length || null,
      propertyType: label("type", listing.type) || "", tenure: "", epc: listing.epcRating || "", ref: listing.ref || "",
      cover: rooms[0].id, hidden: true, agent: agent || {}, facts: [],
    },
    guided: { dwell: 9000, order: rooms.map((r) => r.id) },
    floors, rooms,
  };
}

/* ── handlers ──────────────────────────────────────────────────────────── */
async function row(db, id) {
  return db.prepare(`SELECT * FROM tours WHERE listing_id=?1`).bind(id).first();
}

export async function get(c) {
  const t = await row(c.db, c.params.id);
  if (!t) {
    const l = await c.db.prepare(`SELECT id, title FROM listings WHERE id=?1 AND deleted_at IS NULL`).bind(c.params.id).first();
    if (!l) throw new HttpError(404, "No such listing.");
    throw new HttpError(404, "No tour yet for this listing.", { canCreate: true, listing: { id: l.id, title: l.title } });
  }
  return json({ tour: parseJson(t.draft_json, null), ...summary(t) });
}

export async function create(c) {
  const listing = await getFull(c.db, c.params.id);
  if (!listing || listing.deletedAt) throw new HttpError(404, "No such listing.");
  if (await row(c.db, listing.id)) throw new HttpError(409, "This listing already has a tour.");
  const body = await readJsonBody(c.request, 2_000_000);
  let tour;
  if (body.tour) { checkTour(body.tour, listing.id); tour = body.tour; }
  else tour = buildSkeleton(listing, body.brand, body.agent);
  const now = nowIso();
  await c.db.prepare(
    `INSERT INTO tours (listing_id, draft_json, live_json, version, status, health_score, room_count, updated_at, updated_by, live_at)
     VALUES (?1, ?2, NULL, 1, 'draft', NULL, ?3, ?4, ?5, NULL)`
  ).bind(listing.id, JSON.stringify(tour), tour.rooms.length, now, c.user.id).run();
  await audit(c.db, { userId: c.user.id, action: "tour.created", entity: "listing", entityId: listing.id, detail: { rooms: tour.rooms.length, from: body.tour ? "upload" : "listing" } });
  return json({ tour, status: "draft", version: 1, health: null, roomCount: tour.rooms.length, liveAt: null, updatedAt: now }, 201);
}

export async function put(c) {
  const t = await row(c.db, c.params.id);
  if (!t) throw new HttpError(404, "No tour yet for this listing. Create it first.", { canCreate: true });
  const body = await readJsonBody(c.request, 2_000_000);
  const text = checkTour(body.tour, c.params.id);
  if (body.version != null && Number(body.version) !== Number(t.version)) {
    throw new HttpError(409, "Someone else saved this tour since you opened it. Reload to see their changes.", { version: t.version });
  }
  const health = body.health == null ? t.health_score : Math.max(0, Math.min(100, Number(body.health) || 0));
  const version = Number(t.version) + 1;
  const now = nowIso();
  await c.db.prepare(
    `UPDATE tours SET draft_json=?1, version=?2, health_score=?3, room_count=?4, updated_at=?5, updated_by=?6 WHERE listing_id=?7`
  ).bind(text, version, health, body.tour.rooms.length, now, c.user.id, c.params.id).run();
  return json({ ok: true, version, updatedAt: now, health });
}

export async function publish(c) {
  const t = await row(c.db, c.params.id);
  if (!t) throw new HttpError(404, "No tour yet for this listing.");
  const body = await readJsonBody(c.request);
  const health = body.health == null ? t.health_score : Math.max(0, Math.min(100, Number(body.health) || 0));
  const gate = await getSetting(c.db, "tourGateScore", 70);
  const draft = parseJson(t.draft_json, null);
  const problems = [];
  if (!draft || !draft.rooms || !draft.rooms.length) problems.push("The tour has no rooms.");
  const withPano = draft ? draft.rooms.filter((r) => r.pano).length : 0;
  if (!withPano) problems.push("No room has a 360° capture yet.");
  if (health != null && health < gate) problems.push(`The quality score is ${health}; it needs at least ${gate} to go live.`);
  if (problems.length) return json({ ok: false, problems, health, gate });
  draft.project = draft.project || {};
  draft.project.hidden = false;
  const now = nowIso();
  await c.db.prepare(
    `UPDATE tours SET live_json=?1, status='live', health_score=?2, live_at=?3, updated_at=?3, updated_by=?4 WHERE listing_id=?5`
  ).bind(JSON.stringify(draft), health, now, c.user.id, c.params.id).run();
  await c.db.prepare(`INSERT INTO events (id, at, name, listing_id, session_hash, meta_json) VALUES (?1, ?2, 'tour_published', ?3, NULL, NULL)`).bind(uid("e"), now, c.params.id).run().catch(() => {});
  await audit(c.db, { userId: c.user.id, action: "tour.published", entity: "listing", entityId: c.params.id, detail: { health, rooms: draft.rooms.length, withPano } });
  try { await caches.default.delete(new Request(c.url.origin + "/api/public/tours/" + c.params.id)); } catch {}
  return json({ ok: true, status: "live", liveAt: now, health, url: `/billy360/?site=${encodeURIComponent(c.params.id)}` });
}

export async function unpublish(c) {
  const t = await row(c.db, c.params.id);
  if (!t) throw new HttpError(404, "No tour yet for this listing.");
  await c.db.prepare(`UPDATE tours SET status='draft', updated_at=?1, updated_by=?2 WHERE listing_id=?3`).bind(nowIso(), c.user.id, c.params.id).run();
  await audit(c.db, { userId: c.user.id, action: "tour.unpublished", entity: "listing", entityId: c.params.id });
  try { await caches.default.delete(new Request(c.url.origin + "/api/public/tours/" + c.params.id)); } catch {}
  return json({ ok: true, status: "draft" });
}

export async function remove(c) {
  const t = await row(c.db, c.params.id);
  if (!t) throw new HttpError(404, "No tour for this listing.");
  await c.db.prepare(`DELETE FROM tours WHERE listing_id=?1`).bind(c.params.id).run();
  await audit(c.db, { userId: c.user.id, action: "tour.deleted", entity: "listing", entityId: c.params.id });
  return json({ ok: true });
}

/* Bring tours saved in a browser (billy360:tour:<id>) onto the server.
   Only ids that match a listing are accepted; data: URIs are refused. */
export async function importTours(c) {
  const body = await readJsonBody(c.request, 8_000_000);
  const items = Array.isArray(body.tours) ? body.tours.slice(0, 40) : [];
  const imported = [], skipped = [];
  for (const tour of items) {
    const id = tour && typeof tour.id === "string" ? tour.id : null;
    if (!id) { skipped.push({ id: null, reason: "no id" }); continue; }
    const l = await c.db.prepare(`SELECT id FROM listings WHERE id=?1 AND deleted_at IS NULL`).bind(id).first();
    if (!l) { skipped.push({ id, reason: "no listing with this id" }); continue; }
    try { checkTour(tour, id); } catch (e) { skipped.push({ id, reason: e.message }); continue; }
    const existing = await row(c.db, id);
    if (existing && body.overwrite !== true) { skipped.push({ id, reason: "a tour already exists on the server" }); continue; }
    const now = nowIso();
    if (existing) {
      await c.db.prepare(`UPDATE tours SET draft_json=?1, version=version+1, room_count=?2, updated_at=?3, updated_by=?4 WHERE listing_id=?5`).bind(JSON.stringify(tour), tour.rooms.length, now, c.user.id, id).run();
    } else {
      await c.db.prepare(`INSERT INTO tours (listing_id, draft_json, version, status, room_count, updated_at, updated_by) VALUES (?1, ?2, 1, 'draft', ?3, ?4, ?5)`).bind(id, JSON.stringify(tour), tour.rooms.length, now, c.user.id).run();
    }
    imported.push(id);
  }
  if (imported.length) await audit(c.db, { userId: c.user.id, action: "tour.imported", entity: "listing", entityId: imported.join(","), detail: { count: imported.length } });
  return json({ ok: true, imported, skipped });
}

/* ── public ────────────────────────────────────────────────────────────── */
export async function publicTour(db, id) {
  const t = await db.prepare(`SELECT live_json FROM tours WHERE listing_id=?1 AND status='live'`).bind(id).first();
  if (!t || !t.live_json) return json({ error: "No live tour for this listing." }, 404, { "cache-control": "public, max-age=60" });
  return new Response(t.live_json, { status: 200, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=60, s-maxage=120" } });
}

export async function publicManifest(db) {
  const rows = (await db.prepare(
    `SELECT t.listing_id, l.title, l.rent_pcm, l.bedrooms, l.area, t.live_at, t.room_count FROM tours t JOIN listings l ON l.id=t.listing_id
      WHERE t.status='live' AND l.deleted_at IS NULL AND l.hidden=0 ORDER BY t.live_at DESC`
  ).all()).results || [];
  return jsonCached({ items: rows.map((r) => ({ id: r.listing_id, title: r.title, rentPcm: r.rent_pcm, bedrooms: r.bedrooms, area: r.area, liveAt: r.live_at, roomCount: r.room_count })) }, 120);
}

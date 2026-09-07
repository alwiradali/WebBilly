/* Megacity Studio — 360° tours.

   The tour JSON is billy360's own shape (docs/billy360.md), stored per
   listing: a draft the Studio edits and a live copy the public viewer reads.
   Panoramas and photos are R2 URLs (/media/…), never base64 — a PUT that
   still carries data: URIs is refused so the rows stay small. */

import { nowIso, HttpError, json, jsonCached, readJsonBody, parseJson, getSetting, audit, uid, safeHref } from "./db.js";
import { label } from "./options.js";
import { getFull } from "./listings.js";
import { DEFAULTS as SETTINGS_DEFAULTS } from "./settings.js";
import * as urls from "./urls.js";

const MAX_TOUR_BYTES = 1_500_000;
const MAX_DATA_URI = 4096;

/* The agency's branding, worn by every Studio-created tour (the shipped demo
   tours carry their own). creditHref is filled per listing. */
export const MEGACITY_BRAND = {
  name: "Megacity Properties", mark: "MEGACITY", markAccent: "", sub: "PROPERTIES", tagline: "See it before you visit",
  logo: "/templates/assets/mcr/logo.png",
  accent: "#2b7fff", accent2: "#38bdf8", bg: "#060b1a", ink: "#eaf2ff",
  credit: "Megacity Properties", creditHref: "",
};

/* ── validation ────────────────────────────────────────────────────────── */
/* a whole-string data: URI, or one buried inside markup/CSS (F237) */
const DATA_IN_TEXT = /data:[a-z0-9.+\/-]{0,64};base64,[A-Za-z0-9+\/=]{4096,}/i;
function findDataUri(v, path = "$") {
  if (typeof v === "string") {
    if (v.startsWith("data:") && v.length > MAX_DATA_URI) return path;
    return v.length > MAX_DATA_URI && DATA_IN_TEXT.test(v) ? path : null;
  }
  if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) { const p = findDataUri(v[i], `${path}[${i}]`); if (p) return p; } return null; }
  if (v && typeof v === "object") { for (const k of Object.keys(v)) { const p = findDataUri(v[k], `${path}.${k}`); if (p) return p; } }
  return null;
}

/* ids end up in element ids, hash routes and attribute selectors on the client */
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/;
const idOk = (v) => typeof v === "string" && ID_RE.test(v);

/* Floor plans are SVG markup the client drops into the page. Only drawing
   elements and geometry/paint attributes survive; the only link allowed is an
   uploaded image under /media/ (the client-side BILLY360Plan mirrors this). */
const PLAN_ELEMENTS = new Set(["rect", "path", "circle", "ellipse", "line", "polyline", "polygon", "g", "text", "tspan", "image"]);
const PLAN_ATTRS = new Set(["class", "x", "y", "width", "height", "rx", "ry", "cx", "cy", "r", "d", "points", "transform", "fill", "stroke", "stroke-width", "opacity", "font-size", "font-family", "text-anchor"]);
const PLAN_HREF = /^\/media\/[A-Za-z0-9._\/-]+$/;
const DATA_IN_MARKUP = /data:\s*[a-z]+\/[a-z0-9.+-]*\s*[;,]/i;

async function sanitisePlan(markup) {
  const src = String(markup);
  if (!src.trim()) return "";
  const res = new HTMLRewriter()
    .onDocument({ comments(c) { c.remove(); }, doctype(d) { d.remove(); } })
    .on("*", {
      element(e) {
        const tag = e.tagName.toLowerCase();
        if (tag === "svg") { e.removeAndKeepContent(); return; }         // a pasted whole document: keep its drawing
        if (!PLAN_ELEMENTS.has(tag)) { e.remove(); return; }              // script, foreignObject, use, a, set, animate*, style, …
        for (const [name, value] of [...e.attributes]) {
          const n = name.toLowerCase();
          if (n === "href") { if (!PLAN_HREF.test(String(value))) e.removeAttribute(name); continue; }
          if (!PLAN_ATTRS.has(n)) e.removeAttribute(name);                // on*, style, xlink:href, id, …
        }
      },
    })
    .transform(new Response(src));
  return await res.text();
}

/* drop a link field unless it is a plain https/site/mailto/tel address (F232) */
function keepSafeHref(obj, key) {
  if (!obj || typeof obj !== "object" || obj[key] == null) return;
  const s = typeof obj[key] === "string" ? safeHref(obj[key]) : null;
  if (s) obj[key] = s; else delete obj[key];
}

async function checkTour(tour, listingId) {
  if (!tour || typeof tour !== "object") throw new HttpError(400, "Expected a tour object.");
  if (!Array.isArray(tour.rooms) || !tour.rooms.length) throw new HttpError(400, "A tour needs at least one room.");
  tour.id = listingId;
  if (JSON.stringify(tour).length > MAX_TOUR_BYTES) throw new HttpError(413, "The tour is too large to store. Panoramas must be uploaded, not embedded.");
  const bad = findDataUri(tour);
  if (bad) throw new HttpError(413, `The tour still embeds an image at ${bad}. Upload it first.`, { path: bad });

  if (tour.floors != null && !Array.isArray(tour.floors)) throw new HttpError(400, "floors must be a list.");
  const floorIds = new Set();
  for (let i = 0; i < (tour.floors || []).length; i++) {
    const f = tour.floors[i];
    if (!f || typeof f !== "object" || !idOk(f.id)) throw new HttpError(400, "Every floor needs a plain id (letters, digits, - _ .).");
    if (floorIds.has(f.id)) throw new HttpError(400, `Floor id "${f.id}" appears twice.`);
    floorIds.add(f.id);
    if (f.plan == null || f.plan === "") continue;
    if (typeof f.plan !== "string") throw new HttpError(400, "A floor plan must be SVG markup.");
    if (DATA_IN_MARKUP.test(f.plan)) throw new HttpError(413, `The floor plan "${f.name || f.id}" embeds an image. Upload it first.`, { path: `$.floors[${i}].plan` });
    f.plan = await sanitisePlan(f.plan);
  }

  const ids = new Set();
  for (const r of tour.rooms) {
    if (!r || typeof r !== "object" || !idOk(r.id)) throw new HttpError(400, "Every room needs a plain id (letters, digits, - _ .).");
    if (ids.has(r.id)) throw new HttpError(400, `Room id "${r.id}" appears twice.`);
    ids.add(r.id);
    if (r.floor != null && !idOk(r.floor)) throw new HttpError(400, `Room "${r.id}" points at a floor with an invalid id.`);
    if (r.hotspots != null && !Array.isArray(r.hotspots)) throw new HttpError(400, `Room "${r.id}": hotspots must be a list.`);
    for (const h of r.hotspots || []) {
      if (!h || typeof h !== "object") throw new HttpError(400, `Room "${r.id}" has a malformed hotspot.`);
      if (h.id != null && !idOk(h.id)) throw new HttpError(400, `Room "${r.id}" has a hotspot with an invalid id.`);
      if (h.to != null && !idOk(h.to)) throw new HttpError(400, `Room "${r.id}" has a door to an invalid room id.`);
      keepSafeHref(h, "href");
      keepSafeHref(h, "url");
    }
  }
  if (tour.brand && typeof tour.brand === "object") { keepSafeHref(tour.brand, "creditHref"); keepSafeHref(tour.brand, "logo"); }
  if (tour.project && typeof tour.project === "object") keepSafeHref(tour.project.agent, "url");
  return JSON.stringify(tour);
}

/* brand and agent blocks come from the browser; only known string fields survive */
const BRAND_KEYS = ["name", "mark", "markAccent", "sub", "tagline", "logo", "accent", "accent2", "bg", "ink", "fontDisplay", "fontBody", "credit", "creditHref"];
const AGENT_KEYS = ["name", "phone", "whatsapp", "email", "url"];
function pick(obj, keys) {
  const out = {};
  if (obj && typeof obj === "object") for (const k of keys) if (typeof obj[k] === "string" && obj[k].length <= 300) out[k] = obj[k];
  return out;
}

/* ── links, brand, listing facts ───────────────────────────────────────── */
/* The permanent tour link and the origin the embed code should use: the
   client domain once MEGACITY_HOST is set, the demo host until then (G26). */
export function tourUrls(env, url, id) {
  const root = urls.mode(env, url && url.hostname) === "root";
  const origin = root ? "https://" + urls.canonicalHost(env) : new URL(urls.publicBase(env, url)).origin;
  const site = encodeURIComponent(id);
  return { publicUrl: root ? `${origin}/tour/${site}` : `${origin}/billy360/?site=${site}`, embedOrigin: origin };
}

function brandFor(c, listingId, custom) {
  const creditHref = safeHref(urls.absUrl(c.env, c.url, "listing", listingId)) || "";
  return { ...MEGACITY_BRAND, ...(custom || {}), creditHref };
}

/* the office contact block from Settings → Brand, plus a way home */
async function agentFromSettings(c) {
  const b = { ...SETTINGS_DEFAULTS.brand, ...((await getSetting(c.db, "brand", null)) || {}) };
  const out = {};
  for (const k of ["name", "phone", "whatsapp", "email"]) if (typeof b[k] === "string" && b[k]) out[k] = b[k].slice(0, 300);
  out.url = safeHref(urls.absUrl(c.env, c.url, "page", "skyline")) || "";
  return out;
}

/* what the public tour and the office editor show comes from the listing row,
   so a rename or a rent change reaches the tour without re-creating it (F177) */
function overlayListing(tour, l) {
  if (!tour || typeof tour !== "object" || !l) return tour;
  const p = tour.project = tour.project && typeof tour.project === "object" ? tour.project : {};
  const isRoomLet = l.let_type === "room" || l.type === "room_in_share";
  if (l.title) p.name = l.title;
  if (l.rent_pcm) p.price = "£" + Number(l.rent_pcm).toLocaleString("en-GB") + " pcm";
  if (isRoomLet) p.beds = 1; else if (l.bedrooms != null) p.beds = l.bedrooms;
  if (l.epc_rating) p.epc = l.epc_rating;
  if (l.ref) p.ref = l.ref;
  return tour;
}

const LISTING_COLS = "id, title, status, hidden, deleted_at, type, let_type, rent_pcm, bedrooms, epc_rating, ref";
async function listingRow(db, id) {
  return db.prepare(`SELECT ${LISTING_COLS} FROM listings WHERE id=?1`).bind(id).first();
}
const listingLive = (l) => !!l && l.status === "live" && Number(l.hidden) === 0 && !l.deleted_at;
/* a listing in the Bin keeps its tour row but cannot be edited or published (F178) */
function refuseBinned(l) {
  if (l && l.deleted_at) throw new HttpError(410, "This listing is in the Bin — restore it to keep editing the tour.", { binned: true });
}
const gateScore = (db) => getSetting(db, "tourGateScore", SETTINGS_DEFAULTS.tourGateScore);

/* every summary carries the gate and the links so no client hard-codes them (G29, G26) */
async function summary(c, t, l) {
  return {
    status: t.status, version: t.version, health: t.health_score, roomCount: t.room_count, liveAt: t.live_at, updatedAt: t.updated_at, updatedBy: t.updated_by,
    liveVersion: t.live_version ?? null, listingLive: listingLive(l), gate: await gateScore(c.db), ...tourUrls(c.env, c.url, t.listing_id),
  };
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
/* room names for the option values (the option labels read as features, not rooms — G12) */
const BATH_NAMES = { bathroom: "Bathroom", bath_shower_over: "Bathroom", shower_room: "Shower room", en_suite: "En-suite", wc: "WC", wet_room: "Wet room", shared: "Shared bathroom" };
const GARDEN_NAMES = { private_rear: "Garden", private_front: "Front garden", shared: "Shared garden", communal: "Communal garden", yard: "Yard", balcony: "Balcony", terrace: "Terrace" };

function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "room"; }
function rid() { return uid("").slice(0, 6); }
function numberDuplicates(names) {
  const total = {}, seen = {};
  names.forEach((n) => { total[n] = (total[n] || 0) + 1; });
  return names.map((n) => (total[n] > 1 ? `${n} ${(seen[n] = (seen[n] || 0) + 1)}` : n));
}

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
  const stairs = /^house_|maisonette|hmo_whole/.test(type);
  /* one floor needs no label — a flat's "Ground Floor" was wrong for a fourth-floor flat (F194, G13) */
  const floors = [{ id: "g", name: stairs ? "Ground Floor" : "", short: stairs ? "G" : "", plan: BLANK_PLAN }];
  if (stairs) floors.push({ id: "f1", name: "First Floor", short: "1", plan: BLANK_PLAN });
  const rooms = [];
  const add = (name, floorId, layout, kind) => { const r = newRoom(name, floorId, layout, kind); rooms.push(r); return r; };

  const bedCount = isRoomLet ? 1 : type === "studio" ? 0 : Math.max(0, Number(listing.bedrooms) || 0);
  const isStudio = !isRoomLet && (type === "studio" || bedCount === 0);
  const driveway = home.driveway ? add(home.driveway.subtype === "garage" ? "Garage" : "Driveway", "g", 8, "Outside") : null;
  const hall = add("Hallway", "g", 9, "Hallway");
  const studio = isStudio ? add("Studio", "g", 10, "Living") : null;                 // the one room that is the home (G11)
  const livings = (home.receptions || []).map((r, i, arr) => add(arr.length > 1 && !r.subtype ? `Living space ${i + 1}` : (label("reception", r.subtype) || "Living room"), "g", 10, "Living"));
  const kitchen = home.kitchen ? add(home.kitchen.subtype === "kitchen_diner" ? "Kitchen / diner" : "Kitchen", "g", 2, "Kitchen") : null;
  const landing = stairs ? add("Landing", "f1", 9, "Hallway") : null;
  const up = stairs ? "f1" : "g";
  const beds = [];
  for (let i = 1; i <= bedCount; i++) beds.push(add(isRoomLet ? "The room" : bedCount === 1 ? "Bedroom" : `Bedroom ${i}`, up, 6, "Bedroom"));
  const bathSubs = (home.bathrooms || []).map((b) => (b && b.subtype) || "");
  const bathNames = numberDuplicates(bathSubs.map((s) => (s ? BATH_NAMES[s] || label("bathroom", s) || "Bathroom" : "Bathroom")));
  const baths = bathNames.map((n) => add(n, up, 6, "Bathroom"));
  const garden = home.garden ? add(GARDEN_NAMES[home.garden.subtype] || label("garden", home.garden.subtype) || "Garden", "g", 8, "Outside") : null;

  const doorYaw = (r) => -70 + ((r.hotspots || []).length * 55) % 320;
  const hasNav = (a, b) => (a.hotspots || []).some((h) => h.type === "nav" && h.to === b.id);
  const link = (a, b) => {
    if (!a || !b) return;
    if (!hasNav(a, b)) a.hotspots.push({ id: "h" + rid() + rid(), type: "nav", to: b.id, yaw: doorYaw(a), pitch: -4, label: "To " + b.name, auto: true });
    if (!hasNav(b, a)) b.hotspots.push({ id: "h" + rid() + rid(), type: "nav", to: a.id, yaw: doorYaw(b), pitch: -4, label: "To " + a.name, auto: true });
  };
  link(driveway, hall);
  link(hall, studio);
  livings.forEach((l) => link(hall, l));
  link(hall, kitchen);
  if (kitchen && garden) link(kitchen, garden); else link(hall, garden);
  if (landing) link(hall, landing);
  const hub = landing || hall;
  beds.forEach((r) => link(hub, r));
  let ensuite = 0;
  baths.forEach((r, i) => { if (bathSubs[i] === "en_suite" && beds[ensuite]) link(beds[ensuite++], r); else link(hub, r); });   // en-suites open off their bedroom (G12)
  rooms.forEach((r) => {
    /* a crowded hub spreads its doors evenly instead of wrapping onto each other (G8);
       small homes keep the familiar fan */
    const auto = r.hotspots.filter((h) => h.auto);
    if (auto.length > 6) auto.forEach((h, i) => { h.yaw = Math.round((-180 + (i * 360) / auto.length) * 10) / 10; });
    /* open every room facing its first door so the way on is never off-screen (F195) */
    const first = r.hotspots.find((h) => h.type === "nav");
    if (first) r.view.yaw = first.yaw;
  });
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
  const l = await listingRow(c.db, c.params.id);
  const t = await row(c.db, c.params.id);
  if (!t) {
    if (!l || l.deleted_at) throw new HttpError(404, "No such listing.");
    throw new HttpError(404, "No tour yet for this listing.", { canCreate: true, listing: { id: l.id, title: l.title } });
  }
  refuseBinned(l);
  return json({ tour: overlayListing(parseJson(t.draft_json, null), l), ...(await summary(c, t, l)) });
}

export async function create(c) {
  const listing = await getFull(c.db, c.params.id);
  if (!listing || listing.deletedAt) throw new HttpError(404, "No such listing.");
  if (await row(c.db, listing.id)) throw new HttpError(409, "This listing already has a tour.");
  const body = await readJsonBody(c.request, 2_000_000);
  const agent = { ...(await agentFromSettings(c)), ...pick(body.agent, AGENT_KEYS) };
  let tour;
  if (body.tour) {
    tour = body.tour;
    if (!Object.keys(pick(tour.brand, BRAND_KEYS)).length) tour.brand = brandFor(c, listing.id, null);   // F53 F190
    if (tour.project && typeof tour.project === "object" && !Object.keys(pick(tour.project.agent, AGENT_KEYS)).length) tour.project.agent = agent;
    await checkTour(tour, listing.id);
  } else {
    tour = buildSkeleton(listing, brandFor(c, listing.id, pick(body.brand, BRAND_KEYS)), agent);
    await checkTour(tour, listing.id);
  }
  const now = nowIso();
  await c.db.prepare(
    `INSERT INTO tours (listing_id, draft_json, live_json, version, status, health_score, room_count, updated_at, updated_by, live_at, live_version)
     VALUES (?1, ?2, NULL, 1, 'draft', NULL, ?3, ?4, ?5, NULL, NULL)`
  ).bind(listing.id, JSON.stringify(tour), tour.rooms.length, now, c.user.id).run();
  await audit(c.db, { userId: c.user.id, action: "tour.created", entity: "listing", entityId: listing.id, detail: { rooms: tour.rooms.length, from: body.tour ? "upload" : "listing" } });
  const t = { listing_id: listing.id, status: "draft", version: 1, health_score: null, room_count: tour.rooms.length, live_at: null, updated_at: now, updated_by: c.user.id, live_version: null };
  return json({ tour, ...(await summary(c, t, await listingRow(c.db, listing.id))) }, 201);
}

export async function put(c) {
  const l = await listingRow(c.db, c.params.id);
  refuseBinned(l);
  const t = await row(c.db, c.params.id);
  if (!t) throw new HttpError(404, "No tour yet for this listing. Create it first.", { canCreate: true });
  const body = await readJsonBody(c.request, 2_000_000);
  const text = await checkTour(body.tour, c.params.id);
  if (body.version != null && Number(body.version) !== Number(t.version)) {
    throw new HttpError(409, "Someone else saved this tour since you opened it. Reload to see their changes.", { version: t.version });
  }
  const health = body.health == null ? t.health_score : Math.max(0, Math.min(100, Number(body.health) || 0));
  const version = Number(t.version) + 1;
  const now = nowIso();
  /* the version in the WHERE clause makes two racing saves with the same version lose cleanly (F59) */
  const r = await c.db.prepare(
    `UPDATE tours SET draft_json=?1, version=?2, health_score=?3, room_count=?4, updated_at=?5, updated_by=?6 WHERE listing_id=?7 AND version=?8`
  ).bind(text, version, health, body.tour.rooms.length, now, c.user.id, c.params.id, t.version).run();
  if (!r.meta || !r.meta.changes) {
    const cur = await row(c.db, c.params.id);
    throw new HttpError(409, "Someone else saved this tour since you opened it. Reload to see their changes.", { version: cur ? cur.version : null });
  }
  return json({ ok: true, version, updatedAt: now, health, status: t.status, liveVersion: t.live_version ?? null, listingLive: listingLive(l), gate: await gateScore(c.db), ...tourUrls(c.env, c.url, c.params.id) });
}

async function purgePublic(c, id) {
  const path = "/api/public/tours/" + encodeURIComponent(id);
  for (const origin of new Set([c.url.origin, "https://" + urls.canonicalHost(c.env)])) {
    try { await caches.default.delete(new Request(origin + path)); } catch {}
  }
}

export async function publish(c) {
  const id = c.params.id;
  const l = await listingRow(c.db, id);
  refuseBinned(l);
  const t = await row(c.db, id);
  if (!t) throw new HttpError(404, "No tour yet for this listing.");
  await readJsonBody(c.request);                       // the body's health is not trusted: the gate uses the stored score (F58)
  const gate = await gateScore(c.db);
  const health = t.health_score;
  const draft = parseJson(t.draft_json, null);
  const links = tourUrls(c.env, c.url, id);
  const live = listingLive(l);
  const problems = [];
  if (!draft || !draft.rooms || !draft.rooms.length) problems.push("The tour has no rooms.");
  const withPano = draft && draft.rooms ? draft.rooms.filter((r) => r.pano).length : 0;
  if (!withPano) problems.push("No room has a 360° capture yet.");
  if (health == null) problems.push("The tour has not been scored yet — open it in the Studio once so it can be checked.");
  else if (health < gate) problems.push(`The quality score is ${health}; it needs at least ${gate} to go live.`);
  if (problems.length) return json({ ok: false, status: t.status, health, gate, problems, listingLive: live, liveVersion: t.live_version ?? null, ...links });
  draft.project = draft.project && typeof draft.project === "object" ? draft.project : {};
  draft.project.hidden = false;
  /* the live copy wears the agency brand, the office contacts and the listing's current facts (F53 F190 F177) */
  draft.brand = brandFor(c, id, pick(draft.brand, BRAND_KEYS));
  const agent = pick(draft.project.agent, AGENT_KEYS), office = await agentFromSettings(c);
  for (const k of Object.keys(office)) if (office[k]) agent[k] = office[k];
  draft.project.agent = agent;
  overlayListing(draft, l);
  const text = JSON.stringify(draft);
  const now = nowIso();
  /* the draft is written back too, so the editor stops offering "Make it live" (G5);
     live_at records the first publish and survives re-publishes (G6) */
  await c.db.prepare(
    `UPDATE tours SET live_json=?1, draft_json=?1, status='live', live_version=version,
       live_at=CASE WHEN status='live' AND live_at IS NOT NULL THEN live_at ELSE ?2 END, updated_by=?3
     WHERE listing_id=?4`
  ).bind(text, now, c.user.id, id).run();
  await c.db.prepare(`INSERT INTO events (id, at, name, listing_id, session_hash, meta_json) VALUES (?1, ?2, 'tour_published', ?3, NULL, NULL)`).bind(uid("e"), now, id).run().catch(() => {});
  await audit(c.db, { userId: c.user.id, action: "tour.published", entity: "listing", entityId: id, detail: { health, rooms: draft.rooms.length, withPano, listingLive: live } });
  await purgePublic(c, id);
  const liveAt = t.status === "live" && t.live_at ? t.live_at : now;
  return json({
    ok: true, status: "live", health, gate, problems: [], listingLive: live, version: t.version, liveVersion: t.version, liveAt,
    note: live ? null : "Published, but the listing is not live yet, so nobody can see it until the listing goes live.",
    url: `/billy360/?site=${encodeURIComponent(id)}`, ...links,
  });
}

export async function unpublish(c) {
  const t = await row(c.db, c.params.id);
  if (!t) throw new HttpError(404, "No tour yet for this listing.");
  await c.db.prepare(`UPDATE tours SET status='draft', live_at=NULL, updated_at=?1, updated_by=?2 WHERE listing_id=?3`).bind(nowIso(), c.user.id, c.params.id).run();
  await audit(c.db, { userId: c.user.id, action: "tour.unpublished", entity: "listing", entityId: c.params.id });
  await purgePublic(c, c.params.id);
  const l = await listingRow(c.db, c.params.id);
  return json({ ok: true, status: "draft", liveAt: null, liveVersion: t.live_version ?? null, listingLive: listingLive(l), gate: await gateScore(c.db), ...tourUrls(c.env, c.url, c.params.id) });
}

export async function remove(c) {
  const t = await row(c.db, c.params.id);
  if (!t) throw new HttpError(404, "No tour for this listing.");
  await c.db.prepare(`DELETE FROM tours WHERE listing_id=?1`).bind(c.params.id).run();
  await audit(c.db, { userId: c.user.id, action: "tour.deleted", entity: "listing", entityId: c.params.id });
  await purgePublic(c, c.params.id);
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
    try { await checkTour(tour, id); } catch (e) { skipped.push({ id, reason: e.message }); continue; }
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
/* env/url are optional (the router passes db and id today): they only decide
   which listing path the fail-closed card links back to. */
export async function publicTour(db, id, env, url) {
  const t = await db.prepare(
    `SELECT t.live_json, l.title, l.rent_pcm, l.bedrooms, l.epc_rating, l.ref, l.type, l.let_type FROM tours t JOIN listings l ON l.id=t.listing_id
      WHERE t.listing_id=?1 AND t.status='live' AND l.status='live' AND l.hidden=0 AND l.deleted_at IS NULL`
  ).bind(id).first();
  if (!t || !t.live_json) {
    /* never cached (F175 F76): the moment the tour goes live the next load must see it */
    const m = env ? urls.mode(env, url && url.hostname) : "demo";
    const l = await db.prepare(`SELECT id FROM listings WHERE id=?1 AND deleted_at IS NULL`).bind(id).first();
    const listingUrl = l ? urls.listingPath(m, id) : urls.pagePath(m, "skyline");
    return json({ error: "No live tour for this listing.", listingUrl }, 404, { "cache-control": "no-store" });
  }
  const tour = overlayListing(parseJson(t.live_json, null), t) || parseJson(t.live_json, null);
  return new Response(JSON.stringify(tour), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=0, stale-while-revalidate=60" },
  });
}

export async function publicManifest(db) {
  const rows = (await db.prepare(
    `SELECT t.listing_id, l.title, l.rent_pcm, l.bedrooms, l.area, t.live_at, t.room_count FROM tours t JOIN listings l ON l.id=t.listing_id
      WHERE t.status='live' AND l.status='live' AND l.deleted_at IS NULL AND l.hidden=0 ORDER BY t.live_at DESC`
  ).all()).results || [];
  return jsonCached({ items: rows.map((r) => ({ id: r.listing_id, title: r.title, rentPcm: r.rent_pcm, bedrooms: r.bedrooms, area: r.area, liveAt: r.live_at, roomCount: r.room_count })) }, 120);
}

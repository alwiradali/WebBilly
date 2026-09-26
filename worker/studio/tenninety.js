/* 10ninety Web API — reading Walid's properties, and turning them into
 * listings this site can serve.
 *
 * The website is a mirror of 10ninety. He adds a property there, it appears
 * here; he takes it off there, it goes from here. Nothing about a property is
 * edited on this side, which is why worker/studio/listings.js refuses changes
 * to a listing whose source is "tenninety" — there is one copy of the truth
 * and it is not this one.
 *
 * WHAT THE FEED IS, AND IS NOT
 *
 * It is not live. 10ninety's own documentation: "The API data is updated
 * whenever the agent runs the Portal Export from within their system, and by
 * the system automatically overnight." So polling faster than he exports
 * changes nothing — the data we would be re-reading has not moved. Speed comes
 * from him running the export, and from the Studio's refresh button, not from
 * a shorter cron.
 *
 * It is built on the Rightmove v3.5 BLM specification with additions, so the
 * field names here are BLM's.
 *
 * THE RULE THIS FILE KEEPS
 *
 * Blank means "not stated" and is never rendered. A field this mapper is not
 * certain of is left null rather than guessed at, because a letting agent's
 * website is the last place to publish a figure nobody supplied. The two
 * enumerations whose meaning has not been confirmed with 10ninety —
 * let_furn_id and let_type_id — are therefore deliberately NOT mapped, even
 * though guessing would look better on the page.
 */

import { slugify } from "./db.js";
import { feedText } from "./text.js";

const BASE = "https://webapi.10ninety.co.uk";
const AUTH_HEADER = "10ninety-webapi-key";

/* status_id, from 10ninety's FAQ. 0 is on the market, 6 is sold, 7 is let.
   In practice only 0 arrives: a property Walid marks Let or Sold comes off the
   market and therefore leaves the feed, which is the behaviour he has always
   had and asked to keep. Removal is driven by that absence — see
   tenninety-sync.js, which treats a short feed as a fault rather than as news.

   6 and 7 are kept anyway. They cost nothing, they are right if 10ninety ever
   sends them, and the alternative is a bare number falling through to "a
   status nobody explained" and dropping a real property. */
const STATUS = { 0: "live", 6: "let", 7: "let" };

/* trans_type_id: 1 = Sales, 2 = Lettings. The feed carries both; this site
   lets. A sales record reaching the listings table would be a property the
   site invites people to rent that is not for rent. */
const LETTINGS = 2;

/* let_rent_frequency: 1 is monthly, which is every record in Walid's feed and
   the only one this maps. Anything else is left unpriced rather than converted
   on an assumption about what the number means. */
const MONTHLY = 1;

const AREAS = [
  [/\bsalford\b|\bswinton\b|\beccles\b|\bworsley\b|\bpendleton\b/i, "salford"],
  [/\btrafford\b|\bstretford\b|\baltrincham\b|\bsale\b|\burmston\b/i, "trafford"],
  [/\bstockport\b|\bcheadle\b|\bbramhall\b/i, "stockport"],
  [/\bbury\b|\bradcliffe\b|\bprestwich\b|\bwhitefield\b/i, "bury"],
  [/\boldham\b|\bchadderton\b|\broyton\b/i, "oldham"],
  [/\bmanchester\b|\bhulme\b|\bardwick\b|\brusholme\b|\bmoss side\b/i, "manchester"],
];

const clean = (v) => (typeof v === "string" ? v.trim() : v);
const blank = (v) => v === null || v === undefined || (typeof v === "string" && !v.trim());
const str = (v, max) => (blank(v) ? null : String(v).trim().slice(0, max));
const num = (v) => (typeof v === "number" && isFinite(v) ? v : null);

/* ── addresses ───────────────────────────────────────────────────────────── */

/* Every property in the feed but one already has a hand-built page at a short
   address, and those addresses are in Google, in 10ninety's marketing emails
   and on whatever Walid has sent people. A slug derived from the full address
   would be a second URL for the same property and would quietly retire the
   first. Keyed on property_ref because that is what does not change. */
const SLUG_ALIASES = {
  RL0060: "carlton-road-5",
  RL0063: "carlton-road-9",
  RL0136: "adelphi-apartments",
  RL0093: "grove-house",
  RL0094: "anvil-place",
  RL0089: "drayton-street",
  RL0140: "ladywell-point",
  RL0142: "denmark-road",
  /* Not "83-manchester-road-manchester", which is what the address alone
     produced. The property is on Manchester Road in SWINTON, M27 — the old
     site had it at /property/227/3-bed-semi-detached-house-to-let-manchester-
     road-swinton-manchester, so this keeps the words Google already has. */
  RL0144: "manchester-road-swinton",
};

/* Anything not aliased is built from the address. Not from display_address,
   which is not unique: both Carlton Road rooms carry "Carlton Road, Salford",
   and a slug from that would have had one overwriting the other on every
   sync, alternately, for ever. */
function slugFor(p) {
  const alias = SLUG_ALIASES[String(p.property_ref || "").toUpperCase()];
  if (alias) return alias;
  const parts = [p.address_1, p.address_2, p.town].map(clean).filter(Boolean);
  const s = slugify(parts.join(" ")).slice(0, 60).replace(/-+$/, "");
  return s || slugify(p.property_ref || "") || null;
}

function postcode(p) {
  const a = str(p.postcode_1), b = str(p.postcode_2);
  return a && b ? `${a} ${b}` : a || b || null;
}

/* The POSTCODE decides, because the town field does not.
   83 Manchester Road arrives with town "Manchester" and postcode M27 5FX,
   which is Swinton, in Salford — and the feed's own display_address says
   "Manchester Road, Swinton, Manchester". Filing it under Manchester put a
   Salford property in the wrong borough on a site whose whole filter is
   borough, and it is exactly the kind of address the town field gets wrong:
   the street is called Manchester Road.

   Districts only where they are unambiguous. M3 straddles Manchester and
   Salford and M16 straddles Trafford and Manchester, so neither is listed and
   both fall through to the town. */
const POSTCODE_AREAS = [
  [/^M(5|6|7|27|28|30|44|50)$/i, "salford"],      /* incl. Swinton M27, Eccles M30 */
  [/^M(17|31|32|33|41)$/i, "trafford"],
  [/^WA1[45]$/i, "trafford"],
  [/^M(25|26|45)$/i, "bury"],
  [/^BL[89]$/i, "bury"],
  [/^SK[1-8]$/i, "stockport"],
  [/^OL[1-9]$/i, "oldham"],
  [/^M([124]|[89]|1[1-59]|2[0-4]|40)$/i, "manchester"],
];

function areaOf(p) {
  const out = clean(p.postcode_1) || "";
  for (const [re, area] of POSTCODE_AREAS) if (re.test(out)) return area;
  const town = clean(p.town) || "";
  for (const [re, area] of AREAS) if (re.test(town)) return area;
  const hay = [p.address_2, p.display_address, ...(p.searchable_areas || []).map((a) => a && a.name)]
    .filter(Boolean).join(" ");
  for (const [re, area] of AREAS) if (re.test(hay)) return area;
  return null;
}

/* ── the shape of the property ───────────────────────────────────────────── */

/* prop_sub_id is 10ninety's own property-type enumeration and its meaning
   comes from GET /property-types, so the caller passes that lookup in. With
   no lookup, the only claims made are ones the record states outright:
   a studio has no bedrooms, and an HMO room is let as a room. */
function typeOf(p, types) {
  const name = types && types[p.prop_sub_id];
  if (name) {
    const n = String(name).toLowerCase();
    if (/studio/.test(n)) return "studio";
    if (/\broom\b|house *share|hmo room/.test(n)) return "room_in_share";
    if (/terrace/.test(n)) return "house_terraced";
    if (/semi/.test(n)) return "house_semi";
    if (/detached/.test(n)) return "house_detached";
    if (/maisonette/.test(n)) return "maisonette";
    if (/bungalow/.test(n)) return "bungalow";
    if (/apartment|flat/.test(n)) return "apartment";
    if (/hmo/.test(n)) return "hmo_whole";
  }
  if (isRoom(p)) return "room_in_share";
  if (p.bedrooms === 0) return "studio";
  return null;
}

/* An HMO record with a single bedroom is one room in a shared house, not a
   one-bedroom flat. The distinction decides how the bathroom count is read. */
function isRoom(p) {
  return p.is_hmo === true && (p.bedrooms === 1 || p.bedrooms === 0);
}

/* On an HMO room, `bathrooms` is the HOUSE's bathroom count, not the room's.
   Carlton Road arrives as bedrooms 1, bathrooms 3. Printed on a room listing
   that reads as a room with three bathrooms, which is worse than saying
   nothing: the page already says "Shared bath" for a room, which is true. */
function bathroomsOf(p) {
  if (isRoom(p)) return null;
  const n = num(p.bathrooms);
  return n && n > 0 ? Math.round(n) : null;
}

/* ── availability ────────────────────────────────────────────────────────── */

/* A date in the past, or today, means it is available now — which is what a
   tenant needs to know. A date in the future is stated as a date. The dates
   in the feed are Walid's to maintain; this only decides how to phrase one. */
function availabilityOf(p, today) {
  const d = str(p.let_date_available);
  if (!d) return { availability: null, availableFrom: null };
  const iso = d.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return { availability: null, availableFrom: null };
  return iso <= today
    ? { availability: "available_now", availableFrom: null }
    : { availability: "from_date", availableFrom: iso };
}

/* ── bills ───────────────────────────────────────────────────────────────── */

/* Only from an explicit feature. "Bills Included" in the features list is
   Walid saying so; the absence of it is not him saying the opposite, so the
   negative case stays unstated rather than becoming "bills not included". */
function billsOf(p) {
  const f = (p.features || []).map((x) => String(x || "").trim().toLowerCase());
  if (f.some((x) => /^bills\s+included$/.test(x))) return "included";
  if (f.some((x) => /bills\s+included/.test(x))) return "included";
  if (f.some((x) => /some\s+bills/.test(x))) return "some";
  return null;
}

/* ── photographs ─────────────────────────────────────────────────────────── */

/* A stable key for a photograph that stays on 10ninety.
 *
 * Derived from the image's PATH, not the whole URL. Their addresses carry a
 * cache-busting "?at=<ticks>" that changes when the record is re-exported, so
 * hashing the whole thing would mint a new key for the same photograph every
 * time Walid runs an export — a new media row, a cold cache, and the old row
 * orphaned, on repeat.
 *
 * Not a cryptographic hash and not pretending to be one: this only has to be
 * stable and spread out. Nothing is authenticated by it, because the route
 * reads the URL back out of the database rather than out of the key. */
function hash10(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  let g = 0x2545f491;
  for (let i = s.length - 1; i >= 0; i--) {
    g ^= s.charCodeAt(i);
    g = Math.imul(g, 0x85ebca6b) >>> 0;
  }
  return (h.toString(36) + g.toString(36) + "0000000000").slice(0, 10);
}

export function feedMediaKey(listingId, url) {
  let path;
  try { path = new URL(url).pathname; } catch { path = String(url || ""); }
  return `l/${listingId}/m_${hash10(path)}/feed.jpg`;
}

/* ── one property ────────────────────────────────────────────────────────── */

export function toListing(p, opts = {}) {
  const types = opts.propertyTypes || null;
  const today = opts.today || new Date().toISOString().slice(0, 10);

  if (p.trans_type_id !== LETTINGS) return null;

  const id = slugFor(p);
  if (!id) return null;

  const status = STATUS[p.status_id] || null;
  if (!status) return null;              /* an id we have not been told about */

  const { availability, availableFrom } = availabilityOf(p, today);
  const rent = p.let_rent_frequency === MONTHLY ? num(p.price) : null;
  /* 9 Carlton Road arrives with let_bond 0.0. A zero deposit is not a figure
     Walid has given, it is a field he has not filled in, and "Deposit £0" on a
     tenancy advert is a claim. Blank means not stated and is never rendered. */
  const bond = num(p.let_bond);
  const deposit = bond && bond > 0 ? bond : null;

  const images = (p.images || [])
    .map((m) => (m && typeof m.url === "string" ? { url: m.url.trim(), text: str(m.text, 200) } : null))
    .filter((m) => m && /^https:\/\//i.test(m.url));

  return {
    id,
    source: "tenninety",
    externalId: str(p.property_ref, 40),
    ref: str(p.property_ref, 40),
    status,
    title: str(feedText(p.display_address), 160) || str(feedText([p.address_1, p.address_2].filter(Boolean).join(", ")), 160),
    headline: str(feedText(p.headline), 160),
    type: typeOf(p, types),
    letType: isRoom(p) ? "room" : "whole",
    /* furnishing is NOT mapped: let_furn_id's meaning is unconfirmed, and a
       wrong answer here is a wrong answer in a tenancy advert. */
    furnishing: null,
    rentPcm: rent === null ? null : Math.round(rent),
    deposit: deposit === null ? null : Math.round(deposit),
    bills: billsOf(p),
    availability,
    availableFrom,
    councilTaxBand: /^[A-H]$/.test(str(p.council_tax_band) || "") ? p.council_tax_band.trim() : null,
    /* The feed gives an EPC as a picture of the certificate, not a letter.
       The picture is shown; the rating is not invented from it. */
    epcRating: null,
    epcUrl: /^https:\/\//i.test(String(p.epc || "")) ? String(p.epc).trim() : null,
    brochureUrl: /^https:\/\//i.test(String(p.brochure || "")) ? String(p.brochure).trim() : null,
    tourUrl: /^https:\/\//i.test(String(p.virtual_tour_1 || "")) ? String(p.virtual_tour_1).trim() : null,
    bedrooms: Number.isInteger(p.bedrooms) && p.bedrooms >= 0 ? p.bedrooms : null,
    bathrooms: bathroomsOf(p),
    receptions: Number.isInteger(p.receptions) && p.receptions > 0 ? p.receptions : null,
    hmoLicensed: p.is_hmo === true ? 1 : p.is_hmo === false ? 0 : null,
    address1: str(p.address_1, 160),
    address2: str(p.address_2, 160),
    town: str(p.town, 80),
    postcode: postcode(p),
    area: areaOf(p),
    lat: num(parseFloat(p.latitude)),
    lng: num(parseFloat(p.longitude)),
    summary: str(feedText(p.summary), 600),
    description: str(feedText(p.description), 8000),
    features: (p.features || []).map((f) => str(feedText(f), 120)).filter(Boolean),
    images,
    floorplans: (p.floorplans || []).map((f) => (f && f.url ? String(f.url).trim() : null)).filter(Boolean),
    updatedAt: str(p.update_date),
  };
}

/* ── the whole feed ──────────────────────────────────────────────────────── */

/* Pages are 20 at a time. Nine properties fit in one today, which is exactly
   why paging has to be handled now rather than when the tenth arrives and a
   property silently stops appearing on the website. */
export async function fetchProperties(env, opts = {}) {
  const key = env && env.TENNINETY_API_KEY;
  if (!key) throw new Error("TENNINETY_API_KEY is not set on this Worker");
  const fetchImpl = opts.fetch || fetch;
  const out = [];
  let page = 1;

  for (;;) {
    const url = `${BASE}/properties?page=${page}`;
    const res = await fetchImpl(url, { headers: { [AUTH_HEADER]: key, Accept: "application/json" } });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      /* The two messages differ by one word and that word is the whole
         diagnosis: "missing" is the header name, "invalid" is the key. */
      throw new Error(`10ninety ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    const batch = Array.isArray(data) ? data : (data && data.properties) || [];
    out.push(...batch);

    const paging = (data && data.paging) || {};
    if (!paging.next || !batch.length || page > 50) break;
    page += 1;
  }
  return out;
}

export async function fetchPropertyTypes(env, opts = {}) {
  const key = env && env.TENNINETY_API_KEY;
  if (!key) return null;
  const fetchImpl = opts.fetch || fetch;
  try {
    const res = await fetchImpl(`${BASE}/property-types`, { headers: { [AUTH_HEADER]: key, Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    const rows = Array.isArray(data) ? data : (data && (data.property_types || data.propertyTypes)) || [];
    const map = {};
    for (const r of rows) if (r && r.id !== undefined) map[r.id] = r.name;
    return Object.keys(map).length ? map : null;
  } catch { return null; }
}

/* Map a whole feed, dropping what cannot be represented and keeping the count
   of what was dropped — a sync that quietly maps eight of nine properties
   looks identical to one that mapped nine. */
export function toListings(properties, opts = {}) {
  const kept = [], skipped = [];
  const seen = new Map();
  for (const p of properties || []) {
    const row = toListing(p, opts);
    if (!row) { skipped.push({ ref: p && p.property_ref, why: p && p.trans_type_id !== LETTINGS ? "not a letting" : "unmapped status or no address" }); continue; }
    /* Two properties resolving to one slug would mean one overwriting the
       other on every sync, alternately, for ever. */
    if (seen.has(row.id)) {
      row.id = `${row.id}-${String(row.ref || "").toLowerCase()}`.slice(0, 72);
    }
    seen.set(row.id, true);
    kept.push(row);
  }
  return { listings: kept, skipped };
}

export const _internals = { BASE, AUTH_HEADER, STATUS, SLUG_ALIASES, hash10, slugFor, areaOf, bathroomsOf, availabilityOf, billsOf, isRoom };

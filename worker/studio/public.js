/* Megacity Studio — the public, read-only listings feed the website uses.
   Only live, unhidden, undeleted listings ever leave here. Cached at the
   edge for two minutes. */

import { json, jsonCached, parseJson } from "./db.js";
import { label, valid } from "./options.js";
import { mediaUrl, listForListing } from "./media.js";
import * as urls from "./urls.js";

/* the listing page address for this host: /let/<id> on the client domain,
   /templates/megacity-let-<id> on the demo host */
export function pageUrl(env, url, id) {
  return urls.listingPath(urls.mode(env, url && url.hostname), id);
}

function rentLabel(n) {
  return n ? "£" + Number(n).toLocaleString("en-GB") + " pcm" : "";
}

function typeShort(r) {
  if (r.let_type === "room" || r.type === "room_in_share") return "room";
  if (/^house_|bungalow|maisonette/.test(r.type || "")) return "house";
  return "apartment";
}

/* the card shape megacity-properties.html renders */
function card(r, env, url) {
  const home = parseJson(r.home_json, {});
  const features = parseJson(r.features_json, []);
  const isRoom = r.let_type === "room" || r.type === "room_in_share";
  return {
    id: r.id,
    url: pageUrl(env, url, r.id),
    title: r.title,
    headline: r.headline || null,
    area: r.area, areaLabel: label("area", r.area), town: r.town, line1: r.address_1,
    rentPcm: r.rent_pcm, rentLabel: rentLabel(r.rent_pcm),
    bedrooms: isRoom ? 1 : r.bedrooms,
    bathrooms: r.bathrooms,
    type: r.type, typeLabel: label("type", r.type), typeShort: typeShort(r), letType: r.let_type,
    furnishing: r.furnishing, pets: r.pets, availability: r.availability,
    tag: r.headline ? null : (features[0] || null),
    cover: r.cover_key ? { url: mediaUrl(r.cover_large || r.cover_key), thumb: mediaUrl(r.cover_thumb || r.cover_key), alt: r.cover_alt || r.title } : null,
    tour: !!r.tour_live,
    publishedAt: r.published_at, updatedAt: r.updated_at,
  };
}

const BASE = `SELECT l.*, m.key_orig AS cover_key, m.key_large AS cover_large, m.key_thumb AS cover_thumb, m.alt AS cover_alt,
                     (SELECT 1 FROM tours t WHERE t.listing_id=l.id AND t.status='live') AS tour_live
                FROM listings l LEFT JOIN media m ON m.id=l.cover_media_id
               WHERE l.status='live' AND l.hidden=0 AND l.deleted_at IS NULL`;

export async function list(db, url, env) {
  const p = url.searchParams;
  const where = [], binds = [];
  const add = (sql, v) => { binds.push(v); where.push(sql.replace("?", "?" + binds.length)); };
  if (valid("area", p.get("area")) && p.get("area")) add("l.area=?", p.get("area"));
  const type = p.get("type");
  if (type === "room") where.push("(l.let_type='room' OR l.type='room_in_share')");
  else if (type === "house") where.push("l.type LIKE 'house_%'");
  else if (type === "apartment") where.push("l.type IN ('apartment','studio','maisonette','penthouse')");
  else if (valid("type", type) && type) add("l.type=?", type);
  const beds = Number(p.get("beds"));
  if (beds >= 1) { if (beds >= 4) where.push("l.bedrooms>=4"); else add("l.bedrooms=?", beds); }
  const minRent = Number(p.get("minRent")), maxRent = Number(p.get("maxRent"));
  if (minRent > 0) add("l.rent_pcm>=?", minRent);
  if (maxRent > 0) add("l.rent_pcm<=?", maxRent);
  if (valid("furnishing", p.get("furnishing")) && p.get("furnishing")) add("l.furnishing=?", p.get("furnishing"));
  if (p.get("pets") === "1") where.push("l.pets IN ('yes','considered')");
  const sort = { rent_asc: "l.rent_pcm ASC", rent_desc: "l.rent_pcm DESC", newest: "l.published_at DESC" }[p.get("sort")] || "l.published_at DESC";
  const rs = await db.prepare(`${BASE}${where.length ? " AND " + where.join(" AND ") : ""} ORDER BY ${sort} LIMIT 200`).bind(...binds).all();
  const rows = rs.results || [];

  if (p.get("view") === "search") {
    return jsonCached({
      items: rows.map((r) => ({
        t: r.title,
        d: [r.bedrooms ? r.bedrooms + " bed" : null, r.bathrooms ? r.bathrooms + " bath" : null, rentLabel(r.rent_pcm)].filter(Boolean).join(" · "),
        u: pageUrl(env, url, r.id),
        k: [r.area, r.town, r.postcode, r.type, r.let_type, r.address_1, label("type", r.type)].filter(Boolean).join(" ").toLowerCase(),
      })),
    }, 120);
  }

  const all = (await db.prepare(`SELECT area, type, let_type, bedrooms FROM listings WHERE status='live' AND hidden=0 AND deleted_at IS NULL`).all()).results || [];
  const areas = [...new Set(all.map((r) => r.area).filter(Boolean))].map((v) => ({ value: v, label: label("area", v) }));
  const types = [...new Set(all.map((r) => typeShort(r)))].map((v) => ({ value: v, label: v === "room" ? "Room in a share" : v === "house" ? "House" : "Apartment" }));
  const bedsOpts = [...new Set(all.map((r) => (r.let_type === "room" ? 1 : r.bedrooms)).filter((n) => n != null))].sort((a, b) => a - b).map((n) => ({ value: String(Math.min(n, 4)), label: n >= 4 ? "4+" : String(n) }));
  return jsonCached({ items: rows.map((r) => card(r, env, url)), count: rows.length, filters: { areas, types, beds: bedsOpts } }, 120);
}

export async function one(db, url, env, id) {
  const r = await db.prepare(`${BASE} AND l.id=?1`).bind(id).first();
  if (!r) return json({ error: "Not found" }, 404, { "cache-control": "public, max-age=60" });
  /* originals (EXIF and all) stay private; the web sizes are what the public gets */
  const media = (await listForListing(db, id)).filter((m) => m.role !== "og").map((m) => ({ ...m, orig: undefined }));
  const home = { bathrooms: [], receptions: [], kitchen: null, garden: null, driveway: null, ...parseJson(r.home_json, {}) };
  const extras = parseJson(r.external_json, {}) || {};
  const out = {
    ...card(r, env, url),
    ref: r.ref, deposit: r.deposit, bills: r.bills, billsNote: r.bills_note, availableFrom: r.available_from, minTerm: r.min_term,
    councilTaxBand: r.council_tax_band, epcRating: r.epc_rating, parkingSpaces: r.parking_spaces, parkingNote: r.parking_note,
    hmoLicensed: r.hmo_licensed == null ? null : !!r.hmo_licensed, floorAreaSqft: r.floor_area_sqft,
    address: { line1: r.address_1, line2: r.address_2, town: r.town, postcode: r.postcode, area: r.area, areaLabel: label("area", r.area), lat: r.lat, lng: r.lng },
    home: {
      bathrooms: home.bathrooms.map((b) => ({ ...b, label: label("bathroom", b.subtype) || "Bathroom" })),
      receptions: home.receptions.map((b) => ({ ...b, label: label("reception", b.subtype) || "Living room" })),
      kitchen: home.kitchen ? { ...home.kitchen, label: label("kitchen", home.kitchen.subtype) || "Kitchen" } : null,
      garden: home.garden ? { ...home.garden, label: label("garden", home.garden.subtype) || "Garden" } : null,
      driveway: home.driveway ? { ...home.driveway, label: label("driveway", home.driveway.subtype) || "Driveway" } : null,
    },
    labels: {
      furnishing: label("furnishing", r.furnishing), bills: label("bills", r.bills), availability: label("availability", r.availability),
      minTerm: label("minTerm", r.min_term), councilTaxBand: label("councilTaxBand", r.council_tax_band), pets: label("pets", r.pets),
      parking: r.parking_spaces == null ? null : label("parkingSpaces", String(r.parking_spaces)),
    },
    summary: r.summary, description: r.description ? r.description.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean) : [],
    features: parseJson(r.features_json, []),
    services: extras.extras && extras.extras.services || null,
    depositNote: extras.extras && extras.extras.depositNote || null,
    links: extras.extras && extras.extras.links || null,
    media,
    tour: r.tour_live ? { embedUrl: "/billy360/?site=" + encodeURIComponent(r.id) + "&embed=1", url: "/billy360/?site=" + encodeURIComponent(r.id) } : null,
    seoTitle: r.seo_title, seoDescription: r.seo_description,
  };
  return jsonCached(out, 120);
}

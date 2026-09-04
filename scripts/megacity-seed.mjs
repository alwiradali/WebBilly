#!/usr/bin/env node
/**
 * megacity-seed.mjs — builds templates/megacity-seed.json from the five
 * hand-built Megacity listing pages (templates/megacity-let-*.html).
 *
 *   node scripts/megacity-seed.mjs
 *
 * Node 22, no dependencies: node:fs + regex over the page markup.
 * Every value is read from the page; nothing is guessed or invented. Anything a
 * page does not state is null (or [] for lists). Idempotent — re-running with
 * unchanged pages leaves the file byte-identical (generatedAt is only bumped
 * when the listings actually change).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TPL = path.join(ROOT, "templates");
const OUT = path.join(TPL, "megacity-seed.json");
const SLUGS = ["ladywell-point", "denmark-road", "room-3", "room-5", "room-7"];

/* ── allowed option values ─────────────────────────────────────────────── */
const OPT = {
  type: ["apartment", "studio", "house_terraced", "house_semi", "house_detached", "maisonette", "bungalow", "room_in_share", "hmo_whole", "commercial"],
  bathroom: ["bathroom", "bath_shower_over", "shower_room", "en_suite", "wc", "wet_room", "shared"],
  reception: ["living", "lounge_diner", "open_plan", "reception", "dining", "conservatory"],
  kitchen: ["fitted", "fitted_integrated", "kitchen_diner", "open_plan", "shared"],
  garden: ["private_rear", "private_front", "shared", "communal", "yard", "balcony", "terrace"],
  area: ["manchester", "salford", "trafford", "stockport", "bury", "oldham", "tameside", "rochdale", "bolton", "wigan"],
  furnishing: ["furnished", "part", "unfurnished"],
  bills: ["included", "excluded", "some"],
  availability: ["available_now", "let_agreed", "coming_soon"],
  letType: ["whole", "room"],
};

const warnings = [];
const warn = (slug, msg) => warnings.push(`[${slug}] ${msg}`);

/* ── HTML helpers ──────────────────────────────────────────────────────── */
const NAMED = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", pound: "£", deg: "°",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", mdash: "—", ndash: "–",
  hellip: "…", rarr: "→", larr: "←", copy: "©", reg: "®", trade: "™",
  middot: "·", bull: "•", times: "×", eacute: "é", egrave: "è", frac12: "½",
  sup2: "²", euro: "€",
};
function decode(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (m, e) => {
    if (e[0] === "#") {
      const cp = /^#x/i.test(e) ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : m;
    }
    const v = NAMED[e.toLowerCase()];
    return v != null ? v : m;
  });
}
/* tags → plain text, entities decoded, whitespace (incl. nbsp) collapsed */
function text(html) {
  return decode(String(html || "").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ").trim();
}
function first(html, re) { const m = re.exec(html); return m ? m[1] : null; }
function all(html, re) {
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  const out = []; let m;
  while ((m = g.exec(html))) out.push(m);
  return out;
}
function attr(attrs, name) {
  const m = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i").exec(attrs || "");
  return m ? decode(m[1]) : null;
}
function imgOf(html) {
  const m = /<img\b([^>]*)>/i.exec(html || "");
  return m ? { src: attr(m[1], "src"), alt: text(attr(m[1], "alt") || "") } : null;
}
const liTexts = (ul) => all(ul || "", /<li\b[^>]*>([\s\S]*?)<\/li>/g).map((m) => text(m[1])).filter(Boolean);
const money = (s) => { const m = /£\s*([\d,]+(?:\.\d+)?)/.exec(s || ""); return m ? Math.round(Number(m[1].replace(/,/g, ""))) : null; };
const int = (s) => { const m = /\d+/.exec(s || ""); return m ? Number(m[0]) : null; };
const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const num = (w) => (/^\d+$/.test(w) ? Number(w) : WORDS[w.toLowerCase()] ?? null);

/* ── field mappers (only ever fire on wording the page actually uses) ─── */
function mapType(typeTxt, kicker, corpus, slug) {
  const t = `${typeTxt || ""} ${kicker || ""}`.toLowerCase();
  if (/\broom\b/.test(t)) return "room_in_share";
  if (/studio/.test(t)) return "studio";
  if (/apartment|\bflat\b/.test(t)) return "apartment";
  if (/maisonette/.test(t)) return "maisonette";
  if (/bungalow/.test(t)) return "bungalow";
  if (/commercial|office|retail|shop/.test(t)) return "commercial";
  if (/house|home/.test(t)) {
    const c = `${t} ${corpus}`.toLowerCase();
    if (/semi[- ]detached|\bsemi\b/.test(c)) return "house_semi";
    if (/detached/.test(c)) return "house_detached";
    if (/terrace/.test(c)) return "house_terraced";
    warn(slug, `Type "${typeTxt}" is a house but the page never says terraced/semi/detached — type left null`);
    return null;
  }
  if (typeTxt) warn(slug, `Type "${typeTxt}" not recognised — type left null`);
  return null;
}
function bathrooms(factTxt, corpus) {
  if (!factTxt) return [];
  if (/shared/i.test(factTxt)) return [{ subtype: "shared" }];
  const n = int(factTxt);
  if (n == null) return [];
  const out = Array.from({ length: n }, () => ({ subtype: "bathroom" }));
  if (out.length && /bath (?:and|&|with) (?:a )?shower over|shower over (?:the )?bath/i.test(corpus)) out[0].subtype = "bath_shower_over";
  if (/en[- ]?suite/i.test(corpus)) {
    if (out.length) out[out.length - 1].subtype = "en_suite";
    else out.push({ subtype: "en_suite" });
  }
  return out;
}
function receptions(corpus) {
  const c = corpus.toLowerCase();
  if (/open[- ]plan/.test(c)) return [{ subtype: "open_plan" }];
  if (/living room|living area|\blounge\b|sitting room|reception room/.test(c)) return [{ subtype: "living" }];
  return [];
}
function kitchen(corpus, isRoom) {
  const c = corpus.toLowerCase();
  if (!/kitchen/.test(c)) return null;
  if (isRoom) return { subtype: "shared" };
  if (/integrated appliances|\boven\b|\bhob\b|fridge|dishwasher|washing machine|washer/.test(c)) return { subtype: "fitted_integrated" };
  if (/open[- ]plan[^.]{0,40}kitchen|kitchen[^.]{0,40}open[- ]plan/.test(c)) return { subtype: "open_plan" };
  if (/kitchen[- /]diner|kitchen and dining|kitchen\/dining/.test(c)) return { subtype: "kitchen_diner" };
  return { subtype: "fitted" };
}
function garden(corpus) {
  const c = corpus.toLowerCase();
  if (/balcony/.test(c)) return { subtype: "balcony" };
  if (/rear garden|back garden|garden to the rear/.test(c)) return { subtype: "private_rear" };
  if (/front garden/.test(c)) return { subtype: "private_front" };
  if (/(?:roof|sun|private|outdoor) terrace\b/.test(c)) return { subtype: "terrace" };
  if (/communal garden/.test(c)) return { subtype: "communal" };
  if (/shared garden/.test(c)) return { subtype: "shared" };
  if (/\byard\b/.test(c)) return { subtype: "yard" };
  return null;
}
function parking(features, corpus) {
  const note = features.find((f) => /parking/i.test(f)) || null;
  const m = /\b(\d+|one|two|three|four|five|six)\b[^.]{0,20}?parking spaces?/i.exec(corpus)
    || /parking (?:for|space for) (\d+|one|two|three|four|five|six)\b/i.exec(corpus);
  return { parkingSpaces: m ? num(m[1]) : null, parkingNote: note };
}
function furnishing(corpus) {
  const c = corpus.toLowerCase();
  if (/unfurnished/.test(c)) return "unfurnished";
  if (/part(?:ly|-| )furnished/.test(c)) return "part";
  if (/\bfurnished\b/.test(c)) return "furnished";
  return null;
}
function bills(list, corpus) {
  const c = `${list.join(" ")} ${corpus}`.toLowerCase();
  let v = null;
  if (/bills? (?:not included|excluded|extra|on top)|excluding bills|exclusive of bills|plus bills/.test(c)) v = "excluded";
  else if (/some bills/.test(c)) v = "some";
  /* the "Bills & broadband" block on the room pages is the list of what the rent covers */
  else if (list.length || /all bills included|bills included|bills inc\b|inclusive of bills|including bills/.test(c)) v = "included";
  return { bills: v, billsNote: list.length ? list.join(", ") : null };
}
function availability(txt) {
  const c = (txt || "").toLowerCase();
  if (/available now|available immediately/.test(c)) return "available_now";
  if (/let agreed|under offer/.test(c)) return "let_agreed";
  if (/coming soon/.test(c)) return "coming_soon";
  return null;
}
const ROOMS = [
  [/\bliving room\b/, "Living room"], [/\blounge\b/, "Lounge"], [/\bhallway\b|\bhall\b/, "Hallway"],
  [/\bkitchen\b/, "Kitchen"], [/\bshower room\b/, "Shower room"], [/\bbathroom\b/, "Bathroom"],
  [/\ben-?suite\b/, "En-suite"], [/\bbedroom\b/, "Bedroom"], [/\bbalcony\b/, "Balcony"],
  [/\bgarden\b/, "Garden"], [/\bdining\b/, "Dining room"], [/\bexterior\b|\bfront of\b/, "Exterior"], [/\bwc\b/, "WC"],
];
function roomLabel(alt) {
  const a = (alt || "").toLowerCase();
  let best = null, at = Infinity;
  for (const [re, label] of ROOMS) {
    const m = re.exec(a);
    if (m && m.index < at) { at = m.index; best = label; }
  }
  return best;
}
function address(crumb, corpus) {
  const parts = (crumb || "").split(",").map((s) => s.trim()).filter(Boolean);
  const town = parts.length > 1 ? parts.pop() : null;
  const line1 = parts.shift() || null;
  const rest = parts.filter((p) => !/\b(hmo|house share|flat share|licensed)\b/i.test(p));
  const pc = /\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/.exec(`${corpus} ${crumb}`);
  const area = town && OPT.area.includes(town.toLowerCase()) ? town.toLowerCase() : null;
  return { line1, line2: rest.length ? rest.join(", ") : null, town, postcode: pc ? pc[1] : "", area, lat: null, lng: null };
}

/* ── one page → one listing ────────────────────────────────────────────── */
function parsePage(slug) {
  const file = path.join(TPL, `megacity-let-${slug}.html`);
  const html = fs.readFileSync(file, "utf8");
  const main = first(html, /<main\b[^>]*>([\s\S]*?)<\/main>/) ?? html;

  const hero = first(main, /<section class="pd-hero">([\s\S]*?)<\/section>/) || main;
  const title = text(first(hero, /<h1\b[^>]*>([\s\S]*?)<\/h1>/) || "");
  const kicker = text(first(hero, /<p class="no">([\s\S]*?)<\/p>/) || "");
  const price = text(first(hero, /<p class="pd-price">([\s\S]*?)<\/p>/) || "");
  const quick = liTexts(first(hero, /<ul class="pd-quick">([\s\S]*?)<\/ul>/));
  const cover = imgOf(first(hero, /<figure class="pd-main">([\s\S]*?)<\/figure>/));
  const crumb = text(first(main, /<nav class="pd-crumb"[\s\S]*?<b>([\s\S]*?)<\/b>/) || "");

  const gallery = all(main, /<button class="pg-thumb"[^>]*>\s*<img\b([^>]*)>/g)
    .map((m) => ({ src: attr(m[1], "src"), alt: text(attr(m[1], "alt") || "") }));

  const about = first(main, /<h2>\s*About this property\s*<\/h2>([\s\S]*?)<h3/) || "";
  const paras = all(about, /<p\b[^>]*>([\s\S]*?)<\/p>/g).map((m) => text(m[1])).filter(Boolean);
  const features = liTexts(first(main, /<h3>\s*Key features\s*<\/h3>\s*<ul[^>]*>([\s\S]*?)<\/ul>/));
  const billList = liTexts(first(main, /<h3>\s*Bills[^<]*<\/h3>\s*<ul[^>]*>([\s\S]*?)<\/ul>/));
  const servicesDl = first(main, /<h3>\s*Services\s*<\/h3>\s*<dl[^>]*>([\s\S]*?)<\/dl>/);
  const services = servicesDl
    ? all(servicesDl, /<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g).map((m) => [text(m[1]), text(m[2])])
    : null;

  const epcBlock = first(main, /<div class="pd-block" id="epc">([\s\S]*?)<\/div>/) || "";
  const epcImg = imgOf(first(epcBlock, /<figure class="pd-epc">([\s\S]*?)<\/figure>/));
  const epcTxt = text(epcBlock);
  const epcM = /current\s+\d+\s*\(([A-G])\)/i.exec(epcTxt) || /\bEPC(?: rating)?:?\s*([A-G])\b/.exec(epcTxt);

  const facts = {};
  for (const m of all(first(main, /<dl class="pd-facts">([\s\S]*?)<\/dl>/) || "", /<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g)) {
    facts[text(m[1]).toLowerCase()] = text(m[2]);
  }

  const apply = first(main, /<a\b[^>]*href="([^"]+)"[^>]*>\s*Apply for this property\s*<\/a>/);
  const tenninety = first(main, /href="(https?:\/\/(?:www\.)?megacityproperties\.co\.uk\/property\/[^"]+)"/);

  if (!title) warn(slug, "no <h1> found");
  if (!Object.keys(facts).length) warn(slug, "no <dl class=\"pd-facts\"> found");
  if (!paras.length) warn(slug, "no 'About this property' paragraphs found");

  /* the wording we are allowed to read facts from: what the page says about the home */
  const corpus = [title, ...paras, ...features, cover?.alt || "", ...gallery.map((g) => g.alt)].join("\n");

  const type = mapType(facts.type, kicker, corpus, slug);
  const isRoom = type === "room_in_share";
  const availTxt = facts.availability || quick.find((q) => /available|let agreed|coming soon/i.test(q)) || "";
  const availFrom = /available from\s+(.+)/i.exec(availTxt);
  const dep = facts.deposit || "";
  const ct = /\bband\s*([A-H])\b/i.exec(facts["council tax"] || "");
  const { bills: billsV, billsNote } = bills(billList, corpus);
  const park = parking(features, corpus);
  const minTerm = /minimum (?:term|tenancy|let)[^.]*?(\d+\s*(?:months?|years?))/i.exec(corpus);
  const sqft = /([\d,]+)\s*(?:sq\.?\s*ft|square feet|sqft)/i.exec(corpus);

  const media = [];
  const pushMedia = (img, role) => {
    if (!img || !img.src) return;
    if (!fs.existsSync(path.join(TPL, img.src))) { warn(slug, `media missing on disk, skipped: ${img.src}`); return; }
    media.push({ src: img.src, role, roomLabel: role === "epc" ? null : roomLabel(img.alt), alt: img.alt || null, kind: "photo" });
  };
  pushMedia(cover, "cover");
  gallery.forEach((g) => pushMedia(g, "gallery"));
  pushMedia(epcImg, "epc");

  return {
    id: slug,
    source: "manual",
    ref: facts.reference || null,
    status: "live",
    hidden: false,
    title,
    headline: null,
    type,
    letType: isRoom ? "room" : "whole",
    furnishing: furnishing(corpus),
    rentPcm: money(facts.rent) ?? money(price),
    deposit: money(dep),
    depositNote: /holding/i.test(dep) ? "Holding deposit" : null,
    bills: billsV,
    billsNote,
    availability: availability(availTxt),
    availableFrom: availFrom ? availFrom[1].trim() : null,
    minTerm: minTerm ? minTerm[1].replace(/\s+/g, " ") : null,
    councilTaxBand: ct ? ct[1].toUpperCase() : null,
    epcRating: epcM ? epcM[1].toUpperCase() : null,
    bedrooms: int(facts.bedrooms) ?? int(quick.find((q) => /bed/i.test(q))),
    home: {
      bathrooms: bathrooms(facts.bathrooms, corpus),
      receptions: receptions(corpus),
      kitchen: kitchen(corpus, isRoom),
      garden: garden(corpus),
      driveway: null,
    },
    parkingSpaces: park.parkingSpaces,
    parkingNote: park.parkingNote,
    pets: /\bno pets\b/i.test(corpus) ? false : /pets? (?:considered|welcome|allowed)|pet[- ]friendly/i.test(corpus) ? true : null,
    hmoLicensed: /licensed hmo|hmo licen[cs]ed?\b/i.test(corpus) ? true : null,
    floorAreaSqft: sqft ? Number(sqft[1].replace(/,/g, "")) : null,
    address: address(crumb, corpus),
    summary: paras[0] || null,
    description: paras.length ? paras.join("\n\n") : null,
    features,
    services: services && services.length ? services : null,
    media,
    /* only a hosted (https) application link is worth keeping; the site's own
       form is the default and needs no link */
    links: { apply: apply && /^https?:\/\//.test(apply) ? apply : null, tenninety: tenninety || null },
    /* the old website's /property/<id>/ number: that address redirects to this listing */
    legacyId: (tenninety && /\/property\/(\d+)(?:\/|$)/.exec(tenninety) || [])[1] || null,
  };
}

/* ── validation: every option value must come from the allowed lists ──── */
function validate(l) {
  const chk = (val, list, what) => {
    if (val != null && !list.includes(val)) throw new Error(`${l.id}: ${what} "${val}" is not an allowed value`);
  };
  chk(l.type, OPT.type, "type");
  chk(l.letType, OPT.letType, "letType");
  chk(l.furnishing, OPT.furnishing, "furnishing");
  chk(l.bills, OPT.bills, "bills");
  chk(l.availability, OPT.availability, "availability");
  chk(l.address.area, OPT.area, "address.area");
  l.home.bathrooms.forEach((b) => chk(b.subtype, OPT.bathroom, "bathroom subtype"));
  l.home.receptions.forEach((r) => chk(r.subtype, OPT.reception, "reception subtype"));
  if (l.home.kitchen) chk(l.home.kitchen.subtype, OPT.kitchen, "kitchen subtype");
  if (l.home.garden) chk(l.home.garden.subtype, OPT.garden, "garden subtype");
  for (const m of l.media) if (!["cover", "gallery", "epc"].includes(m.role)) throw new Error(`${l.id}: bad media role ${m.role}`);
}

/* ── run ───────────────────────────────────────────────────────────────── */
const listings = SLUGS.map(parsePage);
listings.forEach(validate);

let generatedAt = new Date().toISOString();
let unchanged = false;
try {
  const prev = JSON.parse(fs.readFileSync(OUT, "utf8"));
  if (JSON.stringify(prev.listings) === JSON.stringify(listings) && prev.generatedAt) {
    generatedAt = prev.generatedAt;
    unchanged = true;
  }
} catch { /* first run, or unreadable — write fresh */ }

fs.writeFileSync(OUT, JSON.stringify({ generatedAt, listings }, null, 2) + "\n");

/* summary table */
const rows = listings.map((l) => ({
  id: l.id,
  rent: l.rentPcm == null ? "-" : `£${l.rentPcm}`,
  beds: l.bedrooms ?? "-",
  baths: l.home.bathrooms.length === 1 && l.home.bathrooms[0].subtype === "shared" ? "shared" : String(l.home.bathrooms.length),
  media: String(l.media.length),
}));
const cols = ["id", "rent", "beds", "baths", "media"];
const width = Object.fromEntries(cols.map((c) => [c, Math.max(c.length, ...rows.map((r) => String(r[c]).length))]));
const line = (r) => cols.map((c) => String(r[c]).padEnd(width[c])).join("  ");
console.log(line(Object.fromEntries(cols.map((c) => [c, c]))));
console.log(cols.map((c) => "-".repeat(width[c])).join("  "));
rows.forEach((r) => console.log(line(r)));
console.log(`\n${listings.length} listings → ${path.relative(ROOT, OUT)}${unchanged ? " (unchanged)" : ""}`);
if (warnings.length) { console.error("\nWarnings:"); warnings.forEach((w) => console.error("  " + w)); }

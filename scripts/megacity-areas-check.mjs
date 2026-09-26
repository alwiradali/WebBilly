#!/usr/bin/env node
/* The area pages (Walid's SEO checklist: Manchester, Salford, Swinton, Old
   Trafford, Manchester City Centre), pinned. Run before a deploy:
     node scripts/megacity-areas-check.mjs
   Checks: every area is wired everywhere a page has to be (address, sitemap,
   Studio, footer, home page, search); each page's homes rule picks the right
   live listings; the pages do not repeat each other's local writing; titles
   and descriptions are unique and fit; every 8% says inc. VAT and first
   tenancy. The rendered grid itself is proven by megacity-smoke.js against a
   running Worker. */
import { readFileSync } from "node:fs";
import * as u from "../worker/studio/urls.js";
import { AREA_PAGES, AREA_SLUGS, areaPage, districtOf, areaForListing } from "../worker/studio/areas.js";
import { PAGES } from "./megacity-content-index.mjs";

let fails = 0;
const ok = (c, what) => { console.log((c ? "ok   " : "FAIL ") + what); if (!c) fails++; };
const read = (f) => readFileSync(new URL("../templates/" + f, import.meta.url), "utf8");
const text = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")
  .replace(/&rsquo;/g, "’").replace(/&amp;/g, "&").replace(/&pound;/g, "£").replace(/&middot;/g, "·").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();
const mainOf = (h) => h.slice(h.indexOf('<main id="main">'), h.indexOf("</main>"));

/* ── wiring ─────────────────────────────────────────────────────────── */
ok(AREA_PAGES.length === 5, "five area pages");
const WANT = {
  "area-manchester": "/letting-agents-manchester", "area-salford": "/letting-agents-salford",
  "area-swinton": "/letting-agents-swinton", "area-old-trafford": "/letting-agents-old-trafford",
  "area-city-centre": "/letting-agents-manchester-city-centre",
};
const home = read("megacity-skyline.html");
const search = read("megacity-skyline.js");
for (const a of AREA_PAGES) {
  ok(a.path === WANT[a.slug], `${a.slug} lives at ${WANT[a.slug]}`);
  ok(u.rewriteHref("megacity-" + a.slug, "root") === a.path, `${a.slug}: links in the templates become ${a.path}`);
  const r = u.resolveRoot(a.path);
  ok(r && r.kind === "page" && r.slug === a.slug, `${a.path} resolves to the ${a.slug} page`);
  ok(u.demoHref(a.path) === "/templates/megacity-" + a.slug, `${a.path} has a test address on billydigitals.com`);
  ok(u.PUBLIC_STATIC_SLUGS.includes(a.slug), `${a.slug} is in the sitemap`);
  ok(PAGES.some((p) => p[0] === a.slug), `${a.slug} is editable in the Studio`);
  ok(u.RESERVED_ROOT_SLUGS.includes(a.path.slice(1)), `a Studio page cannot take ${a.path}`);
  ok(home.includes(`href="megacity-${a.slug}"`), `the home page links to ${a.slug}`);
  ok(search.includes(`u: "megacity-${a.slug}"`), `site search finds ${a.slug}`);
}
ok(AREA_SLUGS.every((s) => areaPage(s)), "areaPage() knows every slug");
ok(areaPage("hmo") === null, "areaPage() does not claim ordinary pages");

/* every page with the site footer links to all five */
const withFooter = ["skyline", "properties", "for-landlords", "renting", "hmo", "valuation", "let-template", "page-template", "404", ...AREA_SLUGS];
for (const s of withFooter) {
  const h = read(`megacity-${s}.html`);
  ok(AREA_SLUGS.every((a) => h.includes(`<div class="foot-areas">`) && h.includes(`href="megacity-${a}"`)), `megacity-${s}.html footer links every area`);
}

/* ── which homes each page shows ─────────────────────────────────────── */
ok(districtOf("M16 0TR") === "M16" && districtOf("m27 5fx") === "M27" && districtOf("M3 6FZ") === "M3", "districtOf reads outward codes");
ok(districtOf("M1 1AA") === "M1" && districtOf("SK4 2AB") === "SK4" && districtOf("") === null && districtOf(null) === null && districtOf("Salford") === null, "districtOf copes with other shapes");
/* the seven live listings as the public feed describes them (26 Sep 2026) */
const LIVE = [
  { id: "carlton-road-5", area: "salford", district: "M6" }, { id: "carlton-road-9", area: "salford", district: "M6" },
  { id: "adelphi-apartments", area: "salford", district: "M3" }, { id: "grove-house", area: "manchester", district: "M16" },
  { id: "anvil-place", area: "manchester", district: "M15" }, { id: "ladywell-point", area: "salford", district: "M50" },
  { id: "denmark-road", area: "manchester", district: "M15" },
  { id: "manchester-road-swinton", area: "salford", district: "M27" },     /* the old Swinton house, if it returns */
];
const shown = (slug) => LIVE.filter(areaPage(slug).homes).map((c) => c.id).sort().join(",");
ok(shown("area-manchester") === "anvil-place,denmark-road,grove-house", "Manchester shows the Manchester-borough homes");
ok(shown("area-salford") === "adelphi-apartments,carlton-road-5,carlton-road-9,ladywell-point,manchester-road-swinton", "Salford shows every Salford home, Swinton included");
ok(shown("area-swinton") === "manchester-road-swinton", "Swinton shows M27 only");
ok(shown("area-old-trafford") === "grove-house", "Old Trafford shows M16 only");
ok(shown("area-city-centre") === "adelphi-apartments", "the city centre shows M1 to M4 (Adelphi Wharf, M3)");
ok(!areaPage("area-city-centre").homes({ area: "manchester", district: "M15" }), "Hulme (M15) is not called city centre");

/* a listing that is no longer live sends people to the most specific area page */
const gone = (row) => (areaForListing(row) || { path: "/lettings" }).path;
ok(gone({ area: "salford", postcode: "M27 5FX" }) === "/letting-agents-swinton", "the let Swinton house (M27) goes to Swinton, not Salford");
ok(gone({ area: "manchester", postcode: "M16 0TR" }) === "/letting-agents-old-trafford", "a let flat in M16 goes to Old Trafford");
ok(gone({ area: "salford", postcode: "M3 6FZ" }) === "/letting-agents-manchester-city-centre", "a let flat in M3 goes to the city centre");
ok(gone({ area: "manchester", postcode: "M15 6AZ" }) === "/letting-agents-manchester", "a let flat in Hulme goes to Manchester");
ok(gone({ area: "salford", postcode: "M6 7EW" }) === "/letting-agents-salford", "a let room in M6 goes to Salford");
ok(gone({ area: "stockport", postcode: "SK4 1AA" }) === "/lettings", "somewhere no area page covers goes to every property");
ok(gone({}) === "/lettings" && gone(null) === "/lettings", "no area, no postcode: every property");

/* ── the pages themselves ────────────────────────────────────────────── */
const pages = AREA_SLUGS.map((s) => ({ s, h: read(`megacity-${s}.html`) }));
const titles = new Set(), descs = new Set();
for (const { s, h } of pages) {
  const title = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
  const desc = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "";
  const t = text(title), d = text(desc);
  ok(t.length > 20 && t.length <= 60, `${s}: title fits (${t.length})`);
  ok(d.length > 100 && d.length <= 160, `${s}: description fits (${d.length})`);
  ok(!titles.has(t) && !descs.has(d), `${s}: title and description are its own`);
  titles.add(t); descs.add(d);
  ok((h.match(/<h1\b/g) || []).length === 1, `${s}: one h1`);
  ok(/id="areaGrid"/.test(h) && /id="areaNone"[^>]*hidden/.test(h) && /id="areaCount"[^>]*hidden/.test(h), `${s}: grid, hidden empty state and hidden count are there for the Worker`);
  const ld = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  let good = ld.length === 1;
  try { const g = JSON.parse(ld[0])["@graph"]; good = good && g.some((x) => x["@type"] === "BreadcrumbList") && g.some((x) => x["@type"] === "Service" && x.areaServed); } catch { good = false; }
  ok(good, `${s}: breadcrumb and service structured data parse`);
  const m = text(mainOf(h));
  /* a window round each 8%, not a sentence: "inc." has a full stop in it */
  for (const mm of m.matchAll(/\b8%/g)) {
    const w = m.slice(Math.max(0, mm.index - 60), mm.index + 80);
    ok(/inc\. VAT/.test(w) && /first tenancy/.test(w), `${s}: "…${w.trim().slice(0, 90)}…" says inc. VAT and first tenancy`);
  }
}

/* No local writing shared between two area pages. The fee cards and the
   links to the other areas are the same on purpose (they are prices and
   navigation); every paragraph and heading of the local writing is not. */
const own = (h) => {
  const main = mainOf(h);
  const bits = [...main.matchAll(/<(p|h1|h2|h3)\b[^>]*>([\s\S]*?)<\/\1>/g)]
    .filter((m) => !/class="(sv-fine|pl-offline|area-all)"/.test(m[0]))
    .map((m) => text(m[2])).filter((t) => t.split(" ").length >= 6);
  return new Set(bits);
};
const seen = new Map();
for (const { s, h } of pages) for (const b of own(h)) { if (!seen.has(b)) seen.set(b, []); seen.get(b).push(s); }
const dup = [...seen].filter(([, ss]) => ss.length > 1);
ok(dup.length === 0, "no paragraph or heading of local writing appears on two area pages" + (dup.length ? ": " + dup.map(([b, ss]) => `"${b.slice(0, 50)}…" on ${ss.join(", ")}`).join("; ") : ""));

console.log(fails ? `AREA PAGES: ${fails} FAILURE(S)` : "AREA PAGES: ALL PASS — five places, wired in everywhere, each written for itself.");
process.exit(fails ? 1 : 0);

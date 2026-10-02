#!/usr/bin/env node
/* The 404s, pinned (26 Sep: "can you fix these 404s", 693 in a week). Run
   before a deploy:
     node scripts/megacity-notfound-check.mjs
   Checks: every address in the Studio's list that day is either redirected
   somewhere useful or recognised as a bot probe; no real address of the site
   is ever called a probe; the old-page redirects only fill gaps (they never
   run before a real page); and the build no longer ships the two <script>
   tags that asked for demo tours his copy does not have. */
import { readFileSync, existsSync } from "node:fs";
import * as u from "../worker/studio/urls.js";

let fails = 0;
const ok = (c, what) => { console.log((c ? "ok   " : "FAIL ") + what); if (!c) fails++; };

/* ── what the Studio listed on 26 Sep ─────────────────────────────────── */
const PROBES = [
  "/.env", "/.git/config", "/config.json", "/this-does-not-exist", "/this-page-does-not-exist",
  "/.env.production", "/.env.backup", "/.env.local", "/.env.prod", "/.env.old", "/.env.bak",
  "/application/.env", "/.env.staging", "/.env.live", "/config.js", "/.env.stage", "/backend/.env",
  "/app/.env", "/config/.env", "/.env.save", "/.git/head", "/.env.test", "/.env.sample",
  "/.env.docker", "/.env.example", "/.well-known/ai-catalog.json", "/llms.txt", "/env",
  "/.aws/credentials", "/.env.txt", "/src/.env", "/.env.swp", "/core/.env", "/public/.env",
  "/frontend/.env", "/.env~", "/templates/vendor/lenis.min.js.map",
  /* and the usual others, probed live the same day */
  "/wp-login.php", "/wp-admin/", "/xmlrpc.php", "/admin", "/login", "/ads.txt", "/humans.txt",
  "/.well-known/security.txt", "/site.webmanifest", "/manifest.json", "/browserconfig.xml",
  "/apple-touch-icon-120x120.png", "/phpmyadmin/", "/cgi-bin/luci",
];
for (const p of PROBES) ok(u.notFoundKind(p) === "probe", `${p} is a bot probe`);

/* ── nothing real is ever called a probe ───────────────────────────────── */
const REAL = [
  ...Object.values(u.ROOT_MAP), "/", "/sitemap.xml", "/robots.txt", "/favicon.ico",
  "/apple-touch-icon.png", "/apple-touch-icon-precomposed.png", "/googlece50f0143b6662ac.html",
  "/billy360/", "/billy360/index.html", "/billy360/tour-megacity.js", "/billy360/engine.js",
  "/templates/megacity-skyline.css", "/templates/vendor/lenis.min.js", "/templates/assets/mcr/logo.png",
  "/media/abc123/photo.jpg", "/api/public/listings", "/api/studio/auth/me",
  u.listingPath("root", "carlton-road-5"), "/property/95", "/properties/MEG-1001", "/propertydet.asp",
  "/letting-agents-manchester-city-centre", "/landlord-login", "/settings-page", "/test", "/about-us",
  /* 2 Oct: the new rules' near misses, and the site's own files */
  "/old-trafford", "/rest-of-greater-manchester", "/files-and-forms", "/developers", "/temp-accommodation", "/storage-units",
  "/sitemap_index.xml", "/version.json", "/templates/assets/missing.json", "/media/abc/missing.json", "/api/public/missing.json",
  "/js/main.js", "/scripts/app.js", "/content/feed.xml",
];
const wrong = REAL.filter((p) => u.notFoundKind(p) === "probe");
ok(wrong.length === 0, `no real address is called a probe (${REAL.length} checked)` + (wrong.length ? ": " + wrong.join(", ") : ""));
ok(u.notFoundKind("/images/logo.png") === "legacy" && u.notFoundKind("/css/style.css") === "legacy", "old-site images and styles stay 'old-site files'");
ok(u.notFoundKind("/some-old-page") === null && u.notFoundKindOf("/some-old-page", "page") === "page", "an unknown page address is a page, and is counted");
ok(u.notFoundKindOf("/billy360/missing.js", "asset") === "asset", "a missing site file keeps its kind, and is counted");
ok(u.notFoundKindOf("/.env", "page") === "probe", "rows logged as pages before this are re-read as probes");

/* ── old page names go somewhere useful ────────────────────────────────── */
const GO = {
  "/properties-to-let": "/lettings", "/properties-to-let/x": "/lettings", "/property-search": "/lettings",
  "/search": "/lettings", "/to-let": "/lettings", "/PropertiesToLet": "/lettings",
  "/properties-for-sale": "/valuation", "/property-for-sale": "/valuation",
  "/news": "/journal", "/news-list": "/journal", "/news/some-post": "/journal",
  "/valuation/free": "/valuation", "/valuation/free/": "/valuation",
  "/lettings/manchester": "/letting-agents-manchester", "/lettings/salford": "/letting-agents-salford",
  "/lettings/swinton": "/letting-agents-swinton", "/lettings/old-trafford": "/letting-agents-old-trafford",
  "/lettings/city-centre": "/letting-agents-manchester-city-centre",
  "/lettings/manchester-city-centre": "/letting-agents-manchester-city-centre",
  "/lettings/bury": "/lettings", "/index.php": "/", "/index.htm": "/", "/favicon.png": "/apple-touch-icon.png",
  "/team": "/about-us", "/our-team/": "/about-us", "/meet-the-team": "/about-us",
};
for (const [from, to] of Object.entries(GO)) ok(u.fallbackRedirect(from) === to, `${from} -> ${to}`);
for (const [, to] of Object.entries(GO)) {
  if (to === "/" || to === "/apple-touch-icon.png") continue;
  const r = u.resolveRoot(to);
  ok(r && (r.kind === "page" || r.kind === "home"), `${to} is a real page`);
}
/* they fill gaps and never shadow: nothing on the site's own map matches one */
const shadow = [...Object.values(u.ROOT_MAP), "/lettings", "/valuation", "/journal", "/"].filter((p) => u.fallbackRedirect(p));
ok(shadow.length === 0, "no page of the site matches an old-page redirect" + (shadow.length ? ": " + shadow.join(", ") : ""));
ok(PROBES.every((p) => !u.fallbackRedirect(p) || p === "/favicon.png"), "no bot probe is redirected (a 404 is the right answer)");

const host = readFileSync(new URL("../worker/studio/host.js", import.meta.url), "utf8");
const nf = host.slice(host.indexOf("export async function notFoundResponse"));
ok(/urls\.fallbackRedirect\(path\)/.test(nf.slice(0, 600)) && nf.indexOf("fallbackRedirect") < nf.indexOf("logNotFound"), "host.js tries the old-page redirects only at the 404, before logging it");
ok(!/fallbackRedirect/.test(host.slice(0, host.indexOf("export async function notFoundResponse"))), "…and nowhere earlier, where it could hide a page made in the Studio");
const lg = host.slice(host.indexOf("export async function logNotFound"));
ok(/notFoundKind\(path\) === "probe"\) return/.test(lg.slice(0, 900)), "bot probes are not written to the database");

/* ── what the Studio listed on 2 Oct ("505 missing pages") ─────────────── */
const PROBES_OCT = [
  "/wp", "/wp/", "/_profiler/phpinfo", "/appsettings.production.json", "/meta.json", "/aws-exports.js",
  "/readme.html", "/files", "/uploads", "/rest/settings",
  /* and their usual cousins */
  "/license.txt", "/package.json", "/server.js", "/_next/static/chunks/main.js", "/_debugbar/open", "/upload/",
  "/backup/db", "/api-docs", "/swagger-ui/index.html", "/graphql", "/vendor/autoload.php", "/storage/logs/laravel.log",
  "/static/js/main.js", "/assets/config.json",
];
for (const p of PROBES_OCT) ok(u.notFoundKind(p) === "probe", `${p} is a bot probe`);
ok(u.notFoundKind("/js/main.js") === "legacy" && u.notFoundKind("/scripts/app.js") === "legacy", "the old site's own scripts stay 'old-site files'");

/* scanners name the address they ask for as where they came from */
ok(u.selfReferred("/team", "https://megacityproperties.co.uk/team"), "a hit that names its own address as where it came from is a scanner's");
ok(u.selfReferred("/wp", "https://www.megacityproperties.co.uk/wp/?rest_route=/wp/v2/users"), "  with or without a trailing slash and a query");
ok(u.selfReferred("/Some-Page", "https://www.megacityproperties.co.uk/some-page"), "  in any case");
ok(!u.selfReferred("/old-listing", "https://www.google.com/"), "a visitor from Google is not");
ok(!u.selfReferred("/old-listing", "https://www.megacityproperties.co.uk/lettings"), "nor one following a link on another page of the site");
ok(!u.selfReferred("/old-listing", null) && !u.selfReferred("/old-listing", "") && !u.selfReferred("/old-listing", "not a url"), "nor one with no referrer, or a broken one");

/* the Studio list, from a database holding a scanner, a real missing page
   reached three ways, and a probe */
{
  const { list404s } = await import("../worker/studio/redirects.js");
  const ROWS = [
    { p: "/team", kind: "page", ref: "https://megacityproperties.co.uk/team", n: 5, last: "2026-10-02T04:00:00.000Z", bots: 1 },
    { p: "/old-listing", kind: "page", ref: "https://www.google.com/", n: 3, last: "2026-10-01T10:00:00.000Z", bots: 0 },
    { p: "/old-listing", kind: "page", ref: "https://www.megacityproperties.co.uk/old-listing", n: 4, last: "2026-10-02T09:00:00.000Z", bots: 0 },
    { p: "/old-listing", kind: "page", ref: null, n: 1, last: "2026-09-30T10:00:00.000Z", bots: 1 },
    { p: "/another-page", kind: "page", ref: null, n: 2, last: "2026-10-02T08:00:00.000Z", bots: 0 },
    { p: "/.env", kind: "page", ref: null, n: 9, last: "2026-10-02T07:00:00.000Z", bots: 0 },
  ];
  const fakeDb = { prepare: (sql) => {
    const all = async () => ({ results: /not_found/.test(sql) ? ROWS : [] });
    return { all, bind: () => ({ all }) };
  } };
  const L = await (await list404s({ url: new URL("https://x.test/api?days=7"), db: fakeDb })).json();
  ok(JSON.stringify(L.items.map((r) => r.path)) === JSON.stringify(["/old-listing", "/another-page"]), `the list shows the real missing pages, most hits first (${L.items.map((r) => r.path).join(", ")})`);
  const o = L.items[0];
  ok(o.count === 4 && o.bots === 1 && o.lastSeen === "2026-10-01T10:00:00.000Z", `  counting only the hits that did not name themselves (${o.count}, last ${o.lastSeen})`);
  ok(o.referrer === "https://www.google.com/", "  and showing where people really came from");
  ok(L.probes.addresses === 2 && L.probes.hits === 14, `an address only ever 'referred' by itself joins the bot probes (${L.probes.addresses} addresses, ${L.probes.hits} hits)`);
}
const lgSelf = host.slice(host.indexOf("export async function logNotFound"));
ok(/urls\.selfReferred\(path, request\.headers\.get\("referer"\)\)\) return/.test(lgSelf.slice(0, 1000)), "a self-referred hit is not written to the database either");

/* ── the dashboard and the list agree ──────────────────────────────────── */
const enq = readFileSync(new URL("../worker/studio/enquiries.js", import.meta.url), "utf8");
const red = readFileSync(new URL("../worker/studio/redirects.js", import.meta.url), "utf8");
ok(/notFoundKindOf as kindOf/.test(enq) && /k === "probe" \|\| k === "legacy"/.test(enq), "the dashboard counts pages and site files, not probes or old-site files");
ok(/GROUP BY p, f LIMIT/.test(enq) && /selfReferred\(r\.p, r\.f\) \? "probe"/.test(enq), "  and the tile leaves out self-referred hits the same way the list does");
ok(/notFoundKindOf as kindOf/.test(red) && /r\.kind !== "probe"\)\.slice\(0, limit\)/.test(red), "the list leaves probes out before its limit");
const studio = readFileSync(new URL("../templates/megacity-studio.js", import.meta.url), "utf8");
ok(/tile\("Missing pages this week"/.test(studio) && /r\.kind !== "legacy"/.test(studio), "the Studio tile and list read the same kinds");

/* ── the viewer's page on his domain ───────────────────────────────────── */
const lenis = readFileSync(new URL("../templates/vendor/lenis.min.js", import.meta.url), "utf8");
ok(!/sourceMappingURL/.test(lenis), "lenis.min.js no longer points browsers at a source map that was never shipped");
const src = readFileSync(new URL("../billy360/index.html", import.meta.url), "utf8");
ok(/tour-ashby\.js/.test(src) && /tour-homes\.js/.test(src), "billydigitals.com's viewer still loads its demo tours");
const built = new URL("../dist/megacity/billy360/index.html", import.meta.url);
if (existsSync(built)) {
  const b = readFileSync(built, "utf8");
  ok(!/tour-(ashby|homes)\.js/.test(b), "his copy of the viewer asks for no tour file it does not have");
  ok(/tour-megacity\.js/.test(b) && /engine\.js/.test(b), "…and still loads his own tours and the engine");
  ok(!existsSync(new URL("../dist/megacity/billy360/tour-homes.js", import.meta.url)), "the demo tours themselves still stay behind");
} else console.log("skip dist/megacity not built (run node scripts/build-megacity.mjs)");

console.log(fails ? `404s: ${fails} FAILURE(S)` : "404s: ALL PASS — old addresses redirect, bot probes are left out, the viewer asks for nothing missing.");
process.exit(fails ? 1 : 0);

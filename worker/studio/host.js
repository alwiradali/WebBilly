/* Megacity — the site on its own domain ("root mode").

   worker.js hands every request for a host in MEGACITY_HOST here before
   anything else. The same files that serve the demo at
   /templates/megacity-<slug> are served at root paths (/, /lettings,
   /let/<id>, /studio …) with every relative link and asset rewritten on the
   way out; the old site's addresses are redirected; robots.txt and
   sitemap.xml are generated; unknown paths get a branded 404 that is logged
   for the Studio's "Redirects & 404s" screen. The slug <-> path table lives
   in urls.js.

   serveMegacityHost returns a Response, or null for an API path worker.js
   dispatches itself (/api/studio, /api/public, /api/billy360-verify,
   /api/megacity-*). */

import { officeDb, json, clientIp, sha256Hex, uid, nowIso } from "./db.js";
import * as urls from "./urls.js";
import * as media from "./media.js";
import * as render from "./render.js";
import * as pages from "./pages.js";
import * as pub from "./public.js";
import * as tracking from "./tracking.js";
import { readAll as readSettings, liveRedirects } from "./settings.js";
import { pruneEvents } from "./enquiries.js";

const ALLOW_API = /^\/api\/(studio\/|public\/|billy360-verify$|megacity-[a-z-]+$)/;
const PASS_ASSET = /^\/(billy360\/|templates\/assets\/mcr\/|templates\/vendor\/|templates\/megacity-[a-z0-9-]+\.(css|js|json|map)$)/;
const LEGACY_FILE = /^\/(images|css|js|content|scripts|styles|fonts)\/|\.(asp|aspx|php|cgi|jsp)$|\/wp-|^\/xmlrpc/;
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|fetch|monitor|headless|python|curl|wget/i;
const ONE_HOUR = 3600, FIVE_MIN = 300;

function redirect(to, status, maxAge) {
  return new Response(null, {
    status: status || 301,
    headers: { location: to, "cache-control": "public, max-age=" + (maxAge == null ? ONE_HOUR : maxAge), "x-mc-mode": "root" },
  });
}

export async function serveMegacityHost(request, env, ctx, url) {
  const canon = urls.canonicalHost(env);
  const origin = "https://" + canon;
  /* one host: the apex (and anything else listed) goes to the canonical one */
  if (url.hostname.toLowerCase() !== canon) return redirect(origin + url.pathname + url.search, 301, ONE_HOUR);

  let p;
  try { p = decodeURIComponent(url.pathname); } catch { return notFoundResponse(request, env, ctx, url, url.pathname, "page"); }
  p = p.replace(/\/{2,}/g, "/");

  /* the API and the media are the same on both hosts */
  if (p.startsWith("/api/")) return ALLOW_API.test(p) ? null : json({ error: "Not found" }, 404);
  if (p.startsWith("/media/")) return media.serve(request, env, url);
  if (PASS_ASSET.test(p)) {
    const res = await env.ASSETS.fetch(request);
    return res.status === 404 ? notFoundResponse(request, env, ctx, url, p, "asset") : res;
  }

  /* one address per page: lowercase, no trailing slash. The rules below run
     on the tidy form so an old address like /tenants/register/ reaches its
     destination in one hop; the tidy form itself is the redirect only when
     nothing else applies. */
  const raw = p;
  p = (p.length > 1 ? p.replace(/\/+$/, "") : p).toLowerCase();
  const tidy = () => (raw !== p ? redirect(origin + p + url.search, 301, ONE_HOUR) : null);

  if (p === "/favicon.ico" || p === "/apple-touch-icon.png" || p === "/apple-touch-icon-precomposed.png") return icon(env, url, p);
  if (p === "/robots.txt") return robotsTxt(env);
  const db = officeDb(env);
  if (p === "/sitemap.xml") return render.sitemap(env, url, db);
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD", "content-type": "text/plain; charset=utf-8" } });
  }

  /* demo-shaped addresses on the live host */
  const demo = demoShaped(p);
  if (demo) return redirect(origin + demo + url.search, 301, ONE_HOUR);
  if (p.startsWith("/templates/")) return notFoundResponse(request, env, ctx, url, raw, "legacy");

  /* redirects added in the Studio first, then the addresses we know about */
  const custom = await customRedirect(db, p);
  if (custom) return redirect(/^https?:\/\//i.test(custom.to) ? custom.to : origin + custom.to, custom.status, FIVE_MIN);
  const legacy = urls.legacyRedirect(p);
  if (legacy) return redirect(origin + legacy + url.search, 301, ONE_HOUR);
  const pm = /^\/property\/(\d+)(\/.*)?$/.exec(p);
  if (pm) return redirect(origin + (await legacyListingPath(db, pm[1])), 301, ONE_HOUR);
  if (/^\/property(\/.*)?$/.test(p)) return redirect(origin + "/lettings", 301, ONE_HOUR);
  if (LEGACY_FILE.test(p)) return notFoundResponse(request, env, ctx, url, raw, "legacy");

  const r = urls.resolveRoot(p);
  if (!r) return notFoundResponse(request, env, ctx, url, p, "page");
  const untidy = tidy();
  if (untidy) return untidy;
  let settings = null;
  if (db) { try { settings = await readSettings(db); } catch (e) { console.error("settings", e); } }
  const fin = (res, isPublic, how) => finish(res, { origin, path: p, isPublic, settings, how });
  const asset = (name) => env.ASSETS.fetch(new Request(url.origin + "/templates/" + name, request));

  try {
    if (r.kind === "studio") {
      const res = await asset("megacity-studio");
      return res.ok ? fin(res, false, "static") : notFoundResponse(request, env, ctx, url, p, "page");
    }
    if (r.kind === "home") {
      const res = await asset("megacity-skyline");
      return res.ok ? fin(res, true, "static") : notFoundResponse(request, env, ctx, url, p, "page");
    }
    if (r.kind === "page") {
      if (!urls.PUBLIC_STATIC_SLUGS.includes(r.slug)) return notFoundResponse(request, env, ctx, url, p, "page");
      if (r.slug === "properties" && db) {
        const feed = await pub.list(db, new URL(url.origin + "/api/public/listings"), env);
        const cards = await feed.json();
        const page = cards.items && cards.items.length ? await render.renderPropertiesPage(request, env, url, cards) : null;
        if (page) return fin(page, true, "d1");
      }
      const res = await asset("megacity-" + r.slug);
      return res.ok ? fin(res, true, "static") : notFoundResponse(request, env, ctx, url, p, "page");
    }
    if (r.kind === "listing") {
      if (db) {
        const live = await render.loadLive(db, r.slug);
        if (live) {
          const page = await render.renderListingPage(request, env, url, live, settings || {});
          if (page) return fin(page, true, "d1");
        }
      }
      if (urls.STATIC_LET_SLUGS.includes(r.slug)) {
        const res = await asset("megacity-let-" + r.slug);
        if (res.ok) return fin(res, true, "static");
      }
      if (db) {
        /* a listing that exists but is not live keeps passing people (and
           search engines) to the list rather than a dead end */
        const known = await db.prepare(`SELECT id FROM listings WHERE id=?1`).bind(r.slug).first().catch(() => null);
        if (known) return redirect(origin + "/lettings", 301, FIVE_MIN);
      }
      return notFoundResponse(request, env, ctx, url, p, "page");
    }
    if (r.kind === "cms" && db) {
      const live = await pages.loadLive(db, r.slug);
      if (live) {
        const page = await pages.renderPage(request, env, url, db, live);
        if (page) return fin(page, true, "d1");
      }
    }
  } catch (e) {
    console.error("root render", e && e.stack ? e.stack : e);
    return new Response("Something went wrong on our side. Please try again.", { status: 500, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  }
  return notFoundResponse(request, env, ctx, url, p, "page");
}

/* ── pieces ───────────────────────────────────────────────────────────── */
function demoShaped(p) {
  if (p === "/templates/megacity-sitemap.xml") return "/sitemap.xml";
  const m = /^\/templates\/(megacity-[a-z0-9-]+)(?:\.html)?$/.exec(p);
  return m ? urls.rewriteHref(m[1], "root") : null;
}

async function customRedirect(db, p) {
  for (const r of await liveRedirects(db)) if (r && r.from === p && r.to) return { to: r.to, status: r.status === 302 ? 302 : 301 };
  return null;
}

/* /property/<id>/… from the old site -> the listing, by its old id */
async function legacyListingPath(db, id) {
  if (db) {
    try {
      const row = await db.prepare(`SELECT id, status, hidden, deleted_at FROM listings WHERE legacy_id=?1 OR external_id=?1 ORDER BY (status='live') DESC LIMIT 1`).bind(id).first();
      if (row) {
        const live = row.status === "live" && !row.hidden && !row.deleted_at;
        /* a hand-built page for it still exists while the database copy is a draft */
        return live || urls.STATIC_LET_SLUGS.includes(row.id) ? urls.listingPath("root", row.id) : "/lettings";
      }
    } catch (e) { console.error("legacy lookup", e); }
  }
  const slug = urls.LEGACY_LISTINGS[id];
  return slug ? urls.listingPath("root", slug) : "/lettings";
}

async function icon(env, url, p) {
  const name = p === "/favicon.ico" ? "favicon.ico" : "apple-touch-icon.png";
  const res = await env.ASSETS.fetch(new Request(url.origin + "/templates/assets/mcr/" + name));
  if (!res.ok) return new Response("Not found", { status: 404, headers: { "cache-control": "public, max-age=3600" } });
  const h = new Headers(res.headers);
  h.set("cache-control", "public, max-age=2592000");
  h.delete("x-robots-tag");
  return new Response(res.body, { status: 200, headers: h });
}

export function robotsTxt(env) {
  const origin = "https://" + urls.canonicalHost(env);
  const body = ["User-agent: *", "Disallow: /studio", "Disallow: /api/", "Disallow: /templates/megacity-studio", "Allow: /", "", "Sitemap: " + origin + "/sitemap.xml", ""].join("\n");
  return new Response(body, { status: 200, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}

/* The agency, as structured data, on every public page that does not carry
   its own copy. Facts only: no ratings, no reviews, no invented history. */
export function orgJsonLd(origin) {
  const o = {
    "@context": "https://schema.org", "@type": "RealEstateAgent", "@id": origin + "/#agent",
    name: "Megacity Properties Ltd", legalName: "Megacity Properties Ltd", url: origin + "/",
    telephone: "+441612201763", email: "info@megacityproperties.co.uk",
    logo: origin + "/templates/assets/mcr/logo.png",
    address: { "@type": "PostalAddress", streetAddress: "Office 21, The Tube Business Centre, 86 North Street", addressLocality: "Manchester", postalCode: "M8 8RA", addressCountry: "GB" },
    areaServed: [{ "@type": "City", name: "Manchester" }, { "@type": "City", name: "Salford" }, { "@type": "AdministrativeArea", name: "Greater Manchester" }],
    sameAs: ["https://www.facebook.com/MegaCityPropertiesLTD", "https://www.linkedin.com/in/megacity-properties-0a6ba6241", "https://www.zoopla.co.uk/find-agents/branch/megacity-properties-salford-115884/"],
    memberOf: [{ "@type": "Organization", name: "ARLA Propertymark", url: "https://www.propertymark.co.uk/" }, { "@type": "Organization", name: "The Property Ombudsman", url: "https://www.tpos.co.uk/" }],
    identifier: [{ "@type": "PropertyValue", name: "Company number", value: "12321291" }, { "@type": "PropertyValue", name: "TPO membership", value: "T06217" }],
    openingHoursSpecification: { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "09:00", closes: "17:30" },
  };
  return JSON.stringify(o).replace(/</g, "\\u003c");
}

/* absolute demo-host URLs inside JSON-LD / og:image -> the live host */
function ldFix(text, origin) {
  return String(text)
    .replace(/https?:\/\/[a-z0-9.-]+(?::\d+)?\/templates\/([^"'\s<)\\]*)/gi, (all, rest) => origin + urls.rewriteHref(rest, "root"))
    .replace(/https?:\/\/(?:(?:www\.)?billydigitals\.com|localhost|127\.0\.0\.1)(?::\d+)?\/media\//gi, origin + "/media/");
}
function absFix(v, origin) {
  const m = /^https?:\/\/[^/]+\/templates\/(.*)$/i.exec(v);
  if (m) return origin + urls.rewriteHref(m[1], "root");
  if (/^\/(media|templates)\//.test(v)) return origin + v;
  return v;
}

/* The rewriter every root-mode HTML response goes through. */
export function rootRewriter(response, { origin, path, isPublic, settings }) {
  const canonical = origin + (path === "/" ? "/" : path);
  const fix = (v) => urls.rewriteHref(v, "root");
  const attr = (name, fn) => ({ element: (e) => { const v = e.getAttribute(name); if (v == null) return; const n = fn(v); if (n !== v) e.setAttribute(name, n); } });
  const apply = settings && settings.links10ninety && settings.links10ninety.apply;
  let sawOrg = false, ldBuf = "";
  return new HTMLRewriter()
    .on('meta[name="robots"]', { element: (e) => (isPublic ? e.remove() : e.setAttribute("content", "noindex,nofollow")) })
    .on('link[rel="canonical"]', { element: (e) => (isPublic ? e.setAttribute("href", canonical) : e.remove()) })
    .on('meta[property="og:url"]', { element: (e) => (isPublic ? e.setAttribute("content", canonical) : e.remove()) })
    .on('meta[property="og:image"], meta[name="twitter:image"]', attr("content", (v) => absFix(v, origin)))
    .on('link[rel="icon"]', { element: (e) => e.setAttribute("href", "/favicon.ico?v=mc1") })
    .on("a[href], area[href], link[href]", attr("href", fix))
    .on("form[action]", attr("action", fix))
    .on("script[src], img[src], source[src], video[src], audio[src], iframe[src], embed[src]", attr("src", fix))
    .on("video[poster]", attr("poster", fix))
    .on("img[srcset], source[srcset]", attr("srcset", (v) => urls.rewriteSrcset(v, "root")))
    .on("[style]", attr("style", (v) => urls.rewriteStyle(v, "root")))
    .on('script[type="application/ld+json"]', {
      text: (t) => {
        ldBuf += t.text;
        if (!t.lastInTextNode) { t.remove(); return; }
        const out = ldFix(ldBuf, origin);
        ldBuf = "";
        if (/"@type"\s*:\s*"RealEstateAgent"/.test(out)) sawOrg = true;
        t.replace(out, { html: true });
      },
    })
    .on('[data-slot="portal"]', { element: (e) => { if (apply) { e.setAttribute("href", apply); e.removeAttribute("hidden"); e.removeAttribute("data-slot"); } else e.remove(); } })
    .on("head", {
      element: (e) => {
        e.onEndTag((end) => {
          const extra = ['<link rel="apple-touch-icon" href="/templates/assets/mcr/apple-touch-icon.png">'];
          if (isPublic && !sawOrg) extra.push('<script type="application/ld+json">' + orgJsonLd(origin) + "</script>");
          end.before(extra.join("\n"), { html: true });
        });
      },
    })
    .transform(response);
}

function finish(res, { origin, path, isPublic, settings, how }) {
  let out = rootRewriter(res, { origin, path, isPublic, settings });
  if (isPublic) out = tracking.inject(out, settings, { mode: "root" });
  const h = new Headers(out.headers);
  h.set("x-mc-mode", "root");
  if (how && !h.has("x-mc-render")) h.set("x-mc-render", how);
  if (!isPublic) h.set("x-robots-tag", "noindex, nofollow, noarchive, nosnippet");
  h.delete("content-length"); h.delete("etag"); h.delete("last-modified");
  return new Response(out.body, { status: out.status, headers: h });
}

export async function notFoundResponse(request, env, ctx, url, path, kind) {
  if (ctx && request.method === "GET") ctx.waitUntil(logNotFound(env, request, path, kind));
  const origin = "https://" + urls.canonicalHost(env);
  let res = null;
  try { res = await env.ASSETS.fetch(new Request(url.origin + "/templates/megacity-404", { headers: { accept: "text/html" } })); } catch (e) { res = null; }
  if (!res || !res.ok) return new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  const out = rootRewriter(res, { origin, path, isPublic: false, settings: null });
  const h = new Headers(out.headers);
  h.set("content-type", "text/html; charset=utf-8");
  h.set("cache-control", "no-store");
  h.set("x-robots-tag", "noindex, nofollow");
  h.set("x-mc-mode", "root");
  h.delete("content-length"); h.delete("etag"); h.delete("last-modified");
  return new Response(out.body, { status: 404, headers: h });
}

/* One row per visitor per missing path per day, so the Studio can show
   which old links still bring people in. Bots are marked, never counted
   as visitors, and a scanner cannot fill the table. */
export async function logNotFound(env, request, path, kind) {
  const db = officeDb(env);
  if (!db) return;
  try {
    const ua = request.headers.get("user-agent") || "";
    const day = new Date().toISOString().slice(0, 10);
    const session = (await sha256Hex(clientIp(request) + "|" + ua + "|" + day)).slice(0, 24);
    const p = String(path).slice(0, 300);
    const since = day + "T00:00:00.000Z";
    const dup = await db.prepare(`SELECT 1 FROM events WHERE name='not_found' AND session_hash=?1 AND at>=?2 AND json_extract(meta_json,'$.path')=?3 LIMIT 1`).bind(session, since, p).first();
    if (dup) return;
    const n = await db.prepare(`SELECT COUNT(*) n FROM events WHERE name='not_found' AND session_hash=?1 AND at>=?2`).bind(session, since).first();
    if (Number(n && n.n) >= 60) return;
    const meta = { path: p, ref: (request.headers.get("referer") || "").slice(0, 300) || null, ua: BOT.test(ua) ? "bot" : "browser", kind: kind || "page" };
    await db.prepare(`INSERT INTO events (id, at, name, listing_id, session_hash, meta_json) VALUES (?1, ?2, 'not_found', NULL, ?3, ?4)`)
      .bind(uid("e"), nowIso(), session, JSON.stringify(meta)).run();
    if (Math.random() < 0.05) await pruneEvents(db);
  } catch (e) { console.error("not_found log", e); }
}

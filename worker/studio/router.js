/* Megacity Studio — the router. worker.js hands every Megacity-related
   request here: /api/studio/*, /api/public/*, /media/*, and the
   Worker-rendered pages (Phase 3). Everything is same-origin: the Studio page,
   the API and the media live on one host, so there is no CORS. */

import { officeDb, json, errorResponse, HttpError } from "./db.js";
import { asJson as optionsJson } from "./options.js";
import * as auth from "./auth.js";
import * as listings from "./listings.js";
import * as media from "./media.js";
import * as settings from "./settings.js";
import * as tours from "./tours.js";
import * as pub from "./public.js";
import * as render from "./render.js";
import * as enq from "./enquiries.js";
import * as tracking from "./tracking.js";
import * as ai from "./ai.js";
import * as pages from "./pages.js";
import * as backlinks from "./backlinks.js";
import { readAll as readSettings } from "./settings.js";
import * as urls from "./urls.js";
import * as redirects from "./redirects.js";

/* [method, pattern, handler, flags]  — flags: public (no session), owner */
const ROUTES = [
  ["GET", "/auth/me", auth.me, { public: true }],
  ["POST", "/auth/bootstrap", auth.bootstrap, { public: true }],
  ["POST", "/auth/login", auth.login, { public: true }],
  ["POST", "/auth/logout", auth.logout, { public: true }],
  ["POST", "/auth/forgot", auth.forgot, { public: true }],
  ["POST", "/auth/reset", auth.reset, { public: true }],
  ["POST", "/auth/accept-invite", auth.acceptInvite, { public: true }],
  ["POST", "/auth/change-password", auth.changePassword],

  ["GET", "/team", auth.teamList],
  ["POST", "/team/invite", auth.teamInvite, { owner: true }],
  ["POST", "/team/invite/resend", auth.teamResend, { owner: true }],
  ["PATCH", "/team/:id", auth.teamUpdate, { owner: true }],

  ["GET", "/options", (c) => json(optionsJson(), 200, { "cache-control": "private, max-age=3600" })],
  ["GET", "/settings", settings.get],
  ["PUT", "/settings", settings.put],
  ["GET", "/dashboard", listings.dashboard],
  ["GET", "/audit", listings.auditList, { owner: true }],

  ["GET", "/listings", listings.list],
  ["POST", "/listings", listings.create],
  ["POST", "/import/legacy", listings.importLegacy],
  ["GET", "/listings/:id", listings.get],
  ["PATCH", "/listings/:id", listings.patch],
  ["DELETE", "/listings/:id", listings.remove],
  ["POST", "/listings/:id/restore", listings.restore],
  ["POST", "/listings/:id/duplicate", listings.duplicate],
  ["POST", "/listings/:id/publish", listings.publish],
  ["POST", "/listings/:id/unpublish", listings.unpublish],
  ["POST", "/listings/:id/status", listings.setStatus],
  ["PUT", "/listings/:id/media/order", listings.orderMedia],

  ["GET", "/pages", pages.list],
  ["POST", "/pages", pages.create],
  ["GET", "/pages/:id", pages.get],
  ["PATCH", "/pages/:id", pages.patch],
  ["DELETE", "/pages/:id", pages.remove],
  ["POST", "/pages/:id/publish", pages.publish],
  ["POST", "/pages/:id/unpublish", pages.unpublish],

  ["GET", "/backlinks", backlinks.list],
  ["POST", "/backlinks", backlinks.create],
  ["POST", "/backlinks/check-all", backlinks.checkAll],
  ["PATCH", "/backlinks/:id", backlinks.patch],
  ["DELETE", "/backlinks/:id", backlinks.remove],
  ["POST", "/backlinks/:id/check", backlinks.check],

  ["POST", "/ai/listing-copy", ai.listingCopy],
  ["POST", "/ai/classify-room", ai.classifyRoom],
  ["POST", "/ai/alt-text", ai.altText],
  ["POST", "/ai/share-kit", ai.shareKit],
  ["POST", "/ai/page-draft", ai.pageDraft],
  ["GET", "/ai/usage", ai.usage],

  ["GET", "/enquiries", enq.list],
  ["GET", "/enquiries/:id", enq.get],
  ["PATCH", "/enquiries/:id", enq.patch],
  ["GET", "/notifications", enq.notifications],
  ["POST", "/notifications/read", enq.markRead],
  ["GET", "/notfound", redirects.list404s],

  ["POST", "/tours/import", tours.importTours],
  ["GET", "/tours/:id", tours.get],
  ["POST", "/tours/:id", tours.create],
  ["PUT", "/tours/:id", tours.put],
  ["DELETE", "/tours/:id", tours.remove],
  ["POST", "/tours/:id/publish", tours.publish],
  ["POST", "/tours/:id/unpublish", tours.unpublish],

  ["POST", "/media", media.upload],
  ["PUT", "/media/stream", media.stream],
  ["PATCH", "/media/:id", media.patch],
  ["DELETE", "/media/:id", media.remove],
];

function match(method, path) {
  const parts = path.split("/").filter(Boolean);
  for (const [m, pattern, handler, flags] of ROUTES) {
    if (m !== method) continue;
    const pp = pattern.split("/").filter(Boolean);
    if (pp.length !== parts.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < pp.length; i++) {
      if (pp[i][0] === ":") {
        if (!/^[A-Za-z0-9_.-]{1,80}$/.test(parts[i])) { ok = false; break; }
        params[pp[i].slice(1)] = parts[i];
      } else if (pp[i] !== parts[i]) { ok = false; break; }
    }
    if (ok) return { handler, params, flags: flags || {} };
  }
  return null;
}

/* Which paths worker.js should send here. Kept as a function so worker.js
   stays a one-liner. */
export function isMegacityPath(url) {
  const p = url.pathname;
  return p.startsWith("/api/studio/") || p.startsWith("/api/public/") || p.startsWith("/media/") || p === "/api/billy360-verify" ||
    p.startsWith("/templates/megacity-");
}

/* the Studio itself and any script/style/asset request: never touched */
function isPublicHtmlPath(p) {
  return /^\/templates\/megacity-[a-z0-9-]+$/.test(p) && !/^\/templates\/megacity-studio/.test(p);
}

/* Strict same-origin for anything that changes state. Browsers send Origin
   on every cross-site POST and Sec-Fetch-Site on all modern requests; an
   old client that sends neither is refused. */
function sameOrigin(request, url) {
  const origin = request.headers.get("origin");
  if (origin) return origin === url.origin;
  const sfs = request.headers.get("sec-fetch-site");
  return sfs === "same-origin";
}

export async function handleMegacity(request, env, ctx, url) {
  const p = url.pathname;
  if (p.startsWith("/media/")) return media.serve(request, env, url);

  /* ── Worker-rendered public pages (fall back to the static files) ──── */
  if (p === "/templates/megacity-let-template" || p === "/templates/megacity-page-template") return new Response("Not found", { status: 404 });
  /* once the client domain is live, the demo addresses on billydigitals.com
     send people (and search engines) to the real site; scripts, styles and
     pictures keep serving so nothing already on a page breaks */
  if (urls.megacityHosts(env).length && /^(www\.)?billydigitals\.com$/i.test(url.hostname) &&
      (isPublicHtmlPath(p) || p === "/templates/megacity-studio" || p === "/templates/megacity-sitemap.xml") &&
      (request.method === "GET" || request.method === "HEAD")) {
    const to = "https://" + urls.canonicalHost(env) + urls.rewriteHref(p.slice("/templates/".length), "root") + url.search;
    return new Response(null, { status: 301, headers: { location: to, "cache-control": "public, max-age=3600" } });
  }
  if (p.startsWith("/templates/megacity-")) {
    const db = officeDb(env);
    /* the sitemap is not an HTML page: answer it before the page gate (it
       works without the database too — the hand-built pages stand in) */
    if (p === "/templates/megacity-sitemap.xml") {
      try { return await render.sitemap(env, url, db); } catch (e) { console.error("sitemap", e); return env.ASSETS.fetch(request); }
    }
    const isHtml = isPublicHtmlPath(p);
    if (!db || !isHtml || (request.method !== "GET" && request.method !== "HEAD")) return env.ASSETS.fetch(request);
    let settings = null;
    try { settings = await readSettings(db); } catch (e) { console.error("settings", e); }
    const finish = (res, how) => {
      const h = new Headers(res.headers); h.set("x-mc-render", how);
      return tracking.inject(new Response(res.body, { status: res.status, headers: h }), settings, { mode: "demo" });
    };
    const passThrough = () => env.ASSETS.fetch(request).then((r) => finish(r, "static"));
    try {
      const m = /^\/templates\/megacity-let-([a-z0-9-]+)$/.exec(p);
      if (m) {
        const live = await render.loadLive(db, m[1]);
        if (!live) return passThrough();
        const page = await render.renderListingPage(request, env, url, live, settings || {});
        return page ? finish(page, "d1") : passThrough();
      }
      if (p === "/templates/megacity-properties") {
        const feed = await pub.list(db, new URL(url.origin + "/api/public/listings"), env);
        const cards = await feed.json();
        const page = cards.items && cards.items.length ? await render.renderPropertiesPage(request, env, url, cards) : null;
        return page ? finish(page, "d1") : passThrough();
      }
      const slug = p.slice("/templates/megacity-".length);
      const live = await pages.loadLive(db, slug);
      if (live) {
        const page = await pages.renderPage(request, env, url, db, live);
        if (page) return finish(page, "d1");
      }
    } catch (e) {
      console.error("render", e && e.stack ? e.stack : e);
    }
    return passThrough();
  }

  if (p.startsWith("/api/studio/")) return studioApi(request, env, ctx, url, p.slice("/api/studio".length));

  if (p === "/api/billy360-verify") {
    // billy360's Studio asks "is this person allowed in?" — the office cookie answers.
    const db = officeDb(env);
    if (!db) return json({ ok: false, connected: false }, 503);
    try {
      const s = await auth.getSession(request, db);
      return json({ ok: !!s });
    } catch (e) { return errorResponse(e); }
  }

  if (p.startsWith("/api/public/")) {
    const db = officeDb(env);
    if (!db) return json({ connected: false, items: [] }, 503);
    try {
      const m = /^\/api\/public\/tours(?:\/([A-Za-z0-9_.-]{1,80}))?$/.exec(p);
      if (m && request.method === "GET") return m[1] ? tours.publicTour(db, m[1]) : tours.publicManifest(db);
      const l = /^\/api\/public\/listings(?:\/([A-Za-z0-9_.-]{1,80}))?$/.exec(p);
      if (l && request.method === "GET") return l[1] ? pub.one(db, url, env, l[1]) : pub.list(db, url, env);
      if (p === "/api/public/event" && request.method === "POST") return enq.publicEvent(request, env);
      if (p === "/api/public/lead" && request.method === "POST") {
        if (!sameOrigin(request, url)) return json({ error: "Forbidden" }, 403);
        return enq.publicLead(request, env, ctx);
      }
      return json({ error: "Not found" }, 404);
    } catch (e) { return errorResponse(e); }
  }
  return env.ASSETS.fetch(request);
}

async function studioApi(request, env, ctx, url, path) {
  const method = request.method.toUpperCase();
  const db = officeDb(env);
  if (!db) {
    return json({ connected: false, error: "The Studio database is not connected yet. Create the D1 database and R2 bucket, add the bindings to wrangler.toml and redeploy." }, 503);
  }
  const route = match(method, path);
  if (!route) return json({ error: "Not found" }, 404);

  const c = { request, env, ctx, url, db, params: route.params, user: null, session: null };
  try {
    if (method !== "GET" && method !== "HEAD") {
      if (!sameOrigin(request, url)) throw new HttpError(403, "Cross-site request refused.");
      if (request.headers.get("x-studio") !== "1") throw new HttpError(403, "Missing X-Studio header.");
    }
    const session = await auth.getSession(request, db);
    if (session) { c.user = session.user; c.session = session; }
    if (!route.flags.public && !c.user) throw new HttpError(401, "Not signed in");
    if (route.flags.owner && c.user.role !== "owner") throw new HttpError(403, "Only an owner can do that.");
    return await route.handler(c);
  } catch (e) {
    return errorResponse(e);
  }
}

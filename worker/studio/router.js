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
  ["GET", "/audit", listings.auditList],

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
  return p.startsWith("/api/studio/") || p.startsWith("/api/public/") || p.startsWith("/media/") || p === "/api/billy360-verify";
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

  if (p.startsWith("/api/studio/")) return studioApi(request, env, ctx, url, p.slice("/api/studio".length));

  if (p === "/api/billy360-verify") {
    // Phase 2 wires this to the tour studio; until then it simply reports the session state.
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
    return json({ error: "Not found" }, 404);
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

/* Megacity Studio — shared helpers for the Worker modules.
   Nothing here knows about routes; it is ids, time, hashing, JSON, the D1
   handle, the rate limiter and the audit log. */

export function officeDb(env) {
  return env.MEGACITY_DB || null;
}

export function nowIso() {
  return new Date().toISOString();
}

const B36 = "0123456789abcdefghijklmnopqrstuvwxyz";
export function uid(prefix) {
  const a = new Uint8Array(10);
  crypto.getRandomValues(a);
  let s = "";
  for (const b of a) s += B36[b % 36];
  return (prefix ? prefix + "_" : "") + s;
}

export function randomToken(bytes = 32) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return b64url(a);
}

export function b64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromB64url(str) {
  const s = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return hex(new Uint8Array(buf));
}

export async function hmacB64url(secret, text) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return b64url(new Uint8Array(sig));
}

export function hex(bytes) {
  let s = "";
  for (const b of bytes) s += (b < 16 ? "0" : "") + b.toString(16);
  return s;
}

/* Constant-time string comparison (both sides are short ASCII). */
export function timingSafeEqual(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra || null;
  }
}

export function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

export function jsonCached(obj, seconds = 120) {
  return new Response(JSON.stringify(obj), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": `public, max-age=${Math.min(seconds, 60)}, s-maxage=${seconds}`,
    },
  });
}

export function errorResponse(e) {
  if (e instanceof HttpError) return json({ error: e.message, ...(e.extra || {}) }, e.status);
  console.error("studio error", e && e.stack ? e.stack : e);
  return json({ error: "Something went wrong on our side. Please try again." }, 500);
}

export async function readJsonBody(request, maxBytes = 1_000_000) {
  const len = Number(request.headers.get("content-length") || 0);
  if (len > maxBytes) throw new HttpError(413, "Request body too large.");
  let text;
  try { text = await request.text(); } catch { throw new HttpError(400, "Could not read the request body."); }
  if (text.length > maxBytes) throw new HttpError(413, "Request body too large.");
  if (!text.trim()) return {};
  let v;
  try { v = JSON.parse(text); } catch { throw new HttpError(400, "Invalid JSON body."); }
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

/* Only these link shapes may ever be rendered as an href. */
export function safeHref(v) {
  const s = clampStr(v, 500);
  if (!s) return null;
  if (/^https?:\/\/[^\s"'<>]+$/i.test(s)) return s;
  if (/^\/[a-z0-9\/#._?=&%-]*$/i.test(s)) return s;
  if (/^(mailto:[^\s"'<>]+|tel:\+?[0-9 ()-]+)$/i.test(s)) return s;
  if (/^[a-z0-9-]+(#[a-z0-9-]*)?$/i.test(s)) return s;          // a sibling Megacity page
  return null;
}

export function parseJson(text, fallback) {
  if (text == null || text === "") return fallback;
  try { return JSON.parse(text); } catch { return fallback; }
}

export function slugify(s) {
  return String(s || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export function clampStr(v, n) {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, n) : null;
}

export function toInt(v) {
  if (v === "" || v == null) return null;
  const n = Math.round(Number(String(v).replace(/[£,\s]/g, "")));
  return Number.isFinite(n) ? n : null;
}

export function toNum(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function toBool(v) {
  if (v == null || v === "") return null;
  return v === true || v === 1 || v === "1" || v === "true" ? 1 : 0;
}

export function clientIp(request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "0.0.0.0";
}

export function isEmail(s) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(s || ""));
}

/* Fixed-window rate limiter on the rate_limits table.
   Returns {ok:true} or {ok:false, retryAfter:seconds}. Never throws: a D1
   hiccup should not lock everyone out, so failures count as ok. */
export async function bump(db, key, windowMs, max) {
  const now = Date.now();
  try {
    const row = await db.prepare(`SELECT window_start, count FROM rate_limits WHERE key=?1`).bind(key).first();
    if (!row || now - Number(row.window_start) > windowMs) {
      await db.prepare(`INSERT OR REPLACE INTO rate_limits (key, window_start, count) VALUES (?1, ?2, 1)`).bind(key, now).run();
      if (Math.random() < 0.01) await db.prepare(`DELETE FROM rate_limits WHERE window_start < ?1`).bind(now - 864e5).run().catch(() => {});
      return { ok: true };
    }
    if (Number(row.count) >= max) {
      return { ok: false, retryAfter: Math.max(1, Math.ceil((windowMs - (now - Number(row.window_start))) / 1000)) };
    }
    await db.prepare(`UPDATE rate_limits SET count = count + 1 WHERE key=?1`).bind(key).run();
    return { ok: true };
  } catch (e) {
    console.error("rate limit", e);
    return { ok: true };
  }
}

export async function audit(db, { userId, action, entity, entityId, detail }) {
  try {
    await db.prepare(
      `INSERT INTO audit (id, at, user_id, action, entity, entity_id, detail_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
    ).bind(uid("a"), nowIso(), userId || null, action, entity || null, entityId || null, detail ? JSON.stringify(detail).slice(0, 4000) : null).run();
  } catch (e) {
    console.error("audit", e);
  }
}

/* Settings are JSON blobs keyed by name. */
export async function getSetting(db, key, fallback) {
  const row = await db.prepare(`SELECT value FROM settings WHERE key=?1`).bind(key).first();
  return row ? parseJson(row.value, fallback) : fallback;
}

export async function setSetting(db, key, value, userId) {
  await db.prepare(
    `INSERT INTO settings (key, value, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at, updated_by=excluded.updated_by`
  ).bind(key, JSON.stringify(value), nowIso(), userId || null).run();
}

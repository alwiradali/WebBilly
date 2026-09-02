/* Megacity Studio — accounts and sessions.

   Passwords: PBKDF2-SHA256 via WebCrypto, stored as pbkdf2$<iters>$<salt>$<hash>.
   Sessions:  cookie mc_studio = "<sessionId>.<secret>"; the database keeps
              sha256(secret). HttpOnly, Secure, SameSite=Lax, 14 days sliding.
   Roles:     owner | staff. The first account (bootstrap) is the owner.
   Invites and resets: single-use tokens, 48 h, emailed through Resend. */

import {
  uid, nowIso, randomToken, sha256Hex, b64url, fromB64url, timingSafeEqual, HttpError, json,
  readJsonBody, clampStr, clientIp, isEmail, bump, audit,
} from "./db.js";
import { sendEmail, inviteEmail, resetEmail } from "./email.js";

/* __Host- : the browser refuses the cookie unless it is Secure, Path=/ and has
   no Domain — so nothing on a sibling host can ever set or shadow it */
const COOKIE = "__Host-mc_studio";
/* a real hash to verify against when the email is unknown, so a wrong email
   costs the same time as a wrong password */
const DUMMY_HASH = "pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const SESSION_DAYS = 14;
const TOKEN_HOURS = 48;
const DENY = new Set(["password12", "1234567890", "qwertyuiop", "megacity2026", "megacityproperties", "manchester1", "walid12345"]);

/* ── passwords ─────────────────────────────────────────────────────────── */
function iters(env) {
  const n = Number(env.PBKDF2_ITERS || 100000);
  return Math.min(100000, Math.max(10000, Number.isFinite(n) ? n : 100000));
}

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password, env) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const n = iters(env);
  const h = await pbkdf2(password, salt, n);
  return `pbkdf2$${n}$${b64url(salt)}$${b64url(h)}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const n = Number(parts[1]);
  const salt = fromB64url(parts[2]);
  const h = await pbkdf2(password, salt, n);
  return timingSafeEqual(b64url(h), parts[3]);
}

function checkPassword(pw) {
  const s = String(pw || "");
  if (s.length < 10) throw new HttpError(400, "Use at least 10 characters for the password.");
  if (s.length > 200) throw new HttpError(400, "That password is too long.");
  if (DENY.has(s.toLowerCase())) throw new HttpError(400, "That password is too easy to guess. Pick something else.");
  return s;
}

/* ── sessions ──────────────────────────────────────────────────────────── */
function cookieHeader(value, maxAge) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export async function createSession(db, user, request) {
  const id = uid("s");
  const secret = randomToken(32);
  const now = new Date();
  const exp = new Date(now.getTime() + SESSION_DAYS * 864e5);
  await db.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at, last_seen_at, ip, ua)
     VALUES (?1, ?2, ?3, ?4, ?5, ?4, ?6, ?7)`
  ).bind(id, user.id, await sha256Hex(secret), now.toISOString(), exp.toISOString(), clientIp(request), (request.headers.get("user-agent") || "").slice(0, 200)).run();
  await db.prepare(`UPDATE users SET last_login_at=?1 WHERE id=?2`).bind(now.toISOString(), user.id).run();
  return { header: cookieHeader(`${id}.${secret}`, SESSION_DAYS * 86400) };
}

export function clearSessionHeader() {
  return cookieHeader("", 0);
}

function readCookie(request) {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === COOKIE) return part.slice(i + 1);
  }
  return null;
}

/* Resolve the signed-in user from the cookie, or null. Slides the expiry
   and stamps last_seen_at at most every ten minutes. */
export async function getSession(request, db) {
  const val = readCookie(request);
  if (!val) return null;
  const dot = val.indexOf(".");
  if (dot < 1) return null;
  const id = val.slice(0, dot), secret = val.slice(dot + 1);
  if (!/^s_[a-z0-9]{10}$/.test(id) || secret.length < 20) return null;
  const row = await db.prepare(
    `SELECT s.id AS sid, s.token_hash, s.expires_at, s.last_seen_at, u.id, u.email, u.name, u.role, u.disabled
       FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?1`
  ).bind(id).first();
  if (!row) return null;
  if (!timingSafeEqual(row.token_hash, await sha256Hex(secret))) return null;
  const now = Date.now();
  if (new Date(row.expires_at).getTime() < now || row.disabled) return null;
  if (!row.last_seen_at || now - new Date(row.last_seen_at).getTime() > 600e3) {
    const exp = new Date(now + SESSION_DAYS * 864e5).toISOString();
    await db.prepare(`UPDATE sessions SET last_seen_at=?1, expires_at=?2 WHERE id=?3`).bind(new Date(now).toISOString(), exp, id).run();
    if (Math.random() < 0.02) await db.prepare(`DELETE FROM sessions WHERE expires_at < ?1`).bind(new Date(now).toISOString()).run().catch(() => {});
  }
  return { sessionId: row.sid, user: { id: row.id, email: row.email, name: row.name, role: row.role } };
}

async function userCount(db) {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM users`).first();
  return Number(r && r.n) || 0;
}

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

function studioBase(c) {
  const base = c.env.MEGACITY_PUBLIC_BASE || (c.url.origin + "/templates/");
  return base.replace(/\/?$/, "/") + "megacity-studio";
}

async function issueToken(db, { kind, email, role, createdBy }) {
  const token = randomToken(32);
  const exp = new Date(Date.now() + TOKEN_HOURS * 3600e3).toISOString();
  await db.prepare(`UPDATE auth_tokens SET used_at=?1 WHERE email=?2 AND kind=?3 AND used_at IS NULL`).bind(nowIso(), email, kind).run();
  await db.prepare(
    `INSERT INTO auth_tokens (id, kind, email, role, token_hash, created_by, created_at, expires_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
  ).bind(uid("t"), kind, email, role || null, await sha256Hex(token), createdBy || null, nowIso(), exp).run();
  return token;
}

async function consumeToken(db, kind, token) {
  if (!token || String(token).length < 20) throw new HttpError(400, "That link is not valid.");
  const row = await db.prepare(`SELECT * FROM auth_tokens WHERE token_hash=?1 AND kind=?2`).bind(await sha256Hex(String(token)), kind).first();
  if (!row) throw new HttpError(400, "That link is not valid.");
  if (row.used_at) throw new HttpError(400, "That link has already been used.");
  if (new Date(row.expires_at).getTime() < Date.now()) throw new HttpError(400, "That link has expired. Ask for a new one.");
  await db.prepare(`UPDATE auth_tokens SET used_at=?1 WHERE id=?2`).bind(nowIso(), row.id).run();
  return row;
}

/* ── route handlers (c = {request, env, ctx, url, db, user, params}) ───── */

export async function me(c) {
  const needsOwner = (await userCount(c.db)) === 0;
  const features = { ai: !!c.env.ANTHROPIC_API_KEY, connected: true, email: !!c.env.RESEND_API_KEY };
  if (!c.user) return json({ error: "Not signed in", connected: true, setup: { needsOwner }, features }, 401);
  return json({ ok: true, user: publicUser(c.user), features, setup: { needsOwner: false } });
}

export async function bootstrap(c) {
  const rl = await bump(c.db, "bootstrap:ip:" + clientIp(c.request), 3600e3, 5);
  if (!rl.ok) throw new HttpError(429, "Too many attempts. Try again later.", { retryAfter: rl.retryAfter });
  if (!c.env.OFFICE_SETUP_TOKEN) throw new HttpError(503, "Set the OFFICE_SETUP_TOKEN secret on the Worker, then try again.");
  if ((await userCount(c.db)) > 0) throw new HttpError(409, "The owner account already exists. Sign in instead.");
  const body = await readJsonBody(c.request);
  if (!timingSafeEqual(String(body.setupToken || ""), c.env.OFFICE_SETUP_TOKEN)) throw new HttpError(403, "That setup token is not right.");
  const email = clampStr(body.email, 160);
  const name = clampStr(body.name, 80);
  if (!isEmail(email)) throw new HttpError(400, "Enter a valid email address.");
  if (!name) throw new HttpError(400, "Enter your name.");
  const password = checkPassword(body.password);
  const user = { id: uid("u"), email: email.toLowerCase(), name, role: "owner" };
  await c.db.prepare(`INSERT INTO users (id, email, name, role, pass_hash, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`)
    .bind(user.id, user.email, user.name, user.role, await hashPassword(password, c.env), nowIso()).run();
  await audit(c.db, { userId: user.id, action: "account.bootstrap", entity: "user", entityId: user.id });
  const s = await createSession(c.db, user, c.request);
  return json({ ok: true, user: publicUser(user) }, 200, { "set-cookie": s.header });
}

export async function login(c) {
  const body = await readJsonBody(c.request);
  const email = String(body.email || "").trim().toLowerCase().slice(0, 160);
  const password = String(body.password || "");
  const ip = clientIp(c.request);
  // An office shares one IP, so the per-address limit is loose; the per-email
  // limit is keyed on email+address so one stranger cannot lock the owner out.
  const a = await bump(c.db, "login:ip:" + ip, 900e3, 40);
  const b = await bump(c.db, "login:email:" + email + ":" + ip, 900e3, 10);
  if (!a.ok || !b.ok) throw new HttpError(429, "Too many sign-in attempts. Wait a few minutes and try again.", { retryAfter: (a.retryAfter || b.retryAfter) });
  const row = email ? await c.db.prepare(`SELECT * FROM users WHERE email=?1`).bind(email).first() : null;
  const verified = await verifyPassword(password, row ? row.pass_hash : DUMMY_HASH);
  const ok = row && !row.disabled && verified;
  if (!ok) {
    await audit(c.db, { userId: null, action: "login.failed", entity: "user", entityId: row ? row.id : null, detail: { email, ip } });
    throw new HttpError(401, "That email and password do not match.");
  }
  const s = await createSession(c.db, row, c.request);
  await audit(c.db, { userId: row.id, action: "login", entity: "user", entityId: row.id });
  return json({ ok: true, user: publicUser(row) }, 200, { "set-cookie": s.header });
}

export async function logout(c) {
  const val = readCookie(c.request);
  if (val) {
    const id = val.split(".")[0];
    await c.db.prepare(`DELETE FROM sessions WHERE id=?1`).bind(id).run().catch(() => {});
  }
  return json({ ok: true }, 200, { "set-cookie": clearSessionHeader() });
}

export async function forgot(c) {
  const rl = await bump(c.db, "forgot:ip:" + clientIp(c.request), 3600e3, 5);
  if (!rl.ok) throw new HttpError(429, "Too many requests. Try again later.");
  const body = await readJsonBody(c.request);
  const email = String(body.email || "").trim().toLowerCase().slice(0, 160);
  const row = isEmail(email) ? await c.db.prepare(`SELECT id, email, disabled FROM users WHERE email=?1`).bind(email).first() : null;
  if (row && !row.disabled) {
    const token = await issueToken(c.db, { kind: "reset", email: row.email });
    const link = `${studioBase(c)}#/reset/${token}`;
    const mail = resetEmail({ link });
    c.ctx.waitUntil(sendEmail(c.env, { to: row.email, ...mail }));
    await audit(c.db, { userId: row.id, action: "password.reset_requested", entity: "user", entityId: row.id });
  }
  return json({ ok: true });
}

export async function reset(c) {
  const body = await readJsonBody(c.request);
  const password = checkPassword(body.password);
  const t = await consumeToken(c.db, "reset", body.token);
  const row = await c.db.prepare(`SELECT * FROM users WHERE email=?1`).bind(t.email).first();
  if (!row) throw new HttpError(400, "That account no longer exists.");
  await c.db.prepare(`UPDATE users SET pass_hash=?1 WHERE id=?2`).bind(await hashPassword(password, c.env), row.id).run();
  await c.db.prepare(`DELETE FROM sessions WHERE user_id=?1`).bind(row.id).run();
  await audit(c.db, { userId: row.id, action: "password.reset", entity: "user", entityId: row.id });
  const s = await createSession(c.db, row, c.request);
  return json({ ok: true, user: publicUser(row) }, 200, { "set-cookie": s.header });
}

export async function changePassword(c) {
  const body = await readJsonBody(c.request);
  const row = await c.db.prepare(`SELECT * FROM users WHERE id=?1`).bind(c.user.id).first();
  if (!(await verifyPassword(String(body.current || ""), row.pass_hash))) throw new HttpError(400, "Your current password is not right.");
  const next = checkPassword(body.next);
  await c.db.prepare(`UPDATE users SET pass_hash=?1 WHERE id=?2`).bind(await hashPassword(next, c.env), row.id).run();
  await c.db.prepare(`DELETE FROM sessions WHERE user_id=?1 AND id<>?2`).bind(row.id, c.session.sessionId).run();
  await audit(c.db, { userId: row.id, action: "password.changed", entity: "user", entityId: row.id });
  return json({ ok: true });
}

export async function acceptInvite(c) {
  const body = await readJsonBody(c.request);
  const name = clampStr(body.name, 80);
  if (!name) throw new HttpError(400, "Enter your name.");
  const password = checkPassword(body.password);
  const t = await consumeToken(c.db, "invite", body.token);
  const exists = await c.db.prepare(`SELECT id FROM users WHERE email=?1`).bind(t.email).first();
  if (exists) throw new HttpError(409, "An account with that email already exists. Sign in instead.");
  const user = { id: uid("u"), email: t.email.toLowerCase(), name, role: t.role === "owner" ? "owner" : "staff" };
  await c.db.prepare(`INSERT INTO users (id, email, name, role, pass_hash, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`)
    .bind(user.id, user.email, user.name, user.role, await hashPassword(password, c.env), nowIso()).run();
  await audit(c.db, { userId: user.id, action: "account.accepted_invite", entity: "user", entityId: user.id, detail: { invitedBy: t.created_by } });
  const s = await createSession(c.db, user, c.request);
  return json({ ok: true, user: publicUser(user) }, 200, { "set-cookie": s.header });
}

/* ── team ──────────────────────────────────────────────────────────────── */
export async function teamList(c) {
  const users = (await c.db.prepare(`SELECT id, name, email, role, disabled, last_login_at, created_at FROM users ORDER BY created_at`).all()).results || [];
  const invites = (await c.db.prepare(
    `SELECT email, role, expires_at, created_at FROM auth_tokens WHERE kind='invite' AND used_at IS NULL AND expires_at > ?1 ORDER BY created_at DESC`
  ).bind(nowIso()).all()).results || [];
  return json({
    users: users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, disabled: !!u.disabled, lastLoginAt: u.last_login_at, createdAt: u.created_at })),
    invites: invites.map((i) => ({ email: i.email, role: i.role, expiresAt: i.expires_at, createdAt: i.created_at })),
  });
}

export async function teamInvite(c) {
  const body = await readJsonBody(c.request);
  const email = String(body.email || "").trim().toLowerCase().slice(0, 160);
  const role = body.role === "owner" ? "owner" : "staff";
  if (!isEmail(email)) throw new HttpError(400, "Enter a valid email address.");
  const exists = await c.db.prepare(`SELECT id FROM users WHERE email=?1`).bind(email).first();
  if (exists) throw new HttpError(409, "That person already has an account.");
  const token = await issueToken(c.db, { kind: "invite", email, role, createdBy: c.user.id });
  const link = `${studioBase(c)}#/accept/${token}`;
  const mail = inviteEmail({ inviterName: c.user.name, role, link });
  const sent = await sendEmail(c.env, { to: email, ...mail });
  await audit(c.db, { userId: c.user.id, action: "team.invited", entity: "user", entityId: email, detail: { role, emailed: sent.ok } });
  if (!sent.ok) return json({ ok: true, emailed: false, link, note: "Email could not be sent (" + sent.error + "). Share this link directly; it works for 48 hours." });
  return json({ ok: true, emailed: true });
}

export async function teamResend(c) {
  const body = await readJsonBody(c.request);
  const email = String(body.email || "").trim().toLowerCase();
  const pending = await c.db.prepare(`SELECT role FROM auth_tokens WHERE kind='invite' AND email=?1 AND used_at IS NULL ORDER BY created_at DESC LIMIT 1`).bind(email).first();
  if (!pending) throw new HttpError(404, "No pending invite for that address.");
  const token = await issueToken(c.db, { kind: "invite", email, role: pending.role, createdBy: c.user.id });
  const link = `${studioBase(c)}#/accept/${token}`;
  const sent = await sendEmail(c.env, { to: email, ...inviteEmail({ inviterName: c.user.name, role: pending.role, link }) });
  return sent.ok ? json({ ok: true, emailed: true }) : json({ ok: true, emailed: false, link });
}

export async function teamUpdate(c) {
  const body = await readJsonBody(c.request);
  const row = await c.db.prepare(`SELECT * FROM users WHERE id=?1`).bind(c.params.id).first();
  if (!row) throw new HttpError(404, "No such person.");
  const patch = {};
  if (body.role === "owner" || body.role === "staff") patch.role = body.role;
  if (typeof body.disabled === "boolean") patch.disabled = body.disabled ? 1 : 0;
  if (body.name != null) patch.name = clampStr(body.name, 80) || row.name;
  if ((patch.role === "staff" || patch.disabled === 1) && row.role === "owner") {
    const owners = await c.db.prepare(`SELECT COUNT(*) AS n FROM users WHERE role='owner' AND disabled=0 AND id<>?1`).bind(row.id).first();
    if (!Number(owners.n)) throw new HttpError(400, "There must always be at least one active owner.");
  }
  if (row.id === c.user.id && patch.disabled === 1) throw new HttpError(400, "You cannot disable your own account.");
  const sets = Object.keys(patch);
  if (sets.length) {
    await c.db.prepare(`UPDATE users SET ${sets.map((k, i) => `${k}=?${i + 1}`).join(", ")} WHERE id=?${sets.length + 1}`)
      .bind(...sets.map((k) => patch[k]), row.id).run();
    if (patch.disabled === 1) await c.db.prepare(`DELETE FROM sessions WHERE user_id=?1`).bind(row.id).run();
    await audit(c.db, { userId: c.user.id, action: "team.updated", entity: "user", entityId: row.id, detail: patch });
  }
  const u = await c.db.prepare(`SELECT id, name, email, role, disabled, last_login_at, created_at FROM users WHERE id=?1`).bind(row.id).first();
  return json({ ok: true, user: { id: u.id, name: u.name, email: u.email, role: u.role, disabled: !!u.disabled, lastLoginAt: u.last_login_at, createdAt: u.created_at } });
}

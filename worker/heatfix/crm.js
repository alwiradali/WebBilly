/* ============================================================
   HeatFix Mcr Limited — back office API
   ============================================================
   One engineer, one password, his own data. Everything lives in D1 so it
   survives a lost phone and follows him between the van and the laptop.

   Secrets (set with `wrangler secret put … --env heatfix`):
     HF_ADMIN_PASSWORD  — the one password that opens the back office
     HF_SESSION_SECRET  — any long random string; signs the session cookie
     RESEND_API_KEY     — already used by the review emails; sends invoices

   Money is handled in pence as integers throughout. Totals are worked out
   here, never trusted from the browser, and written onto the invoice at save
   time so a sent invoice cannot change because a rate changed afterwards.
   ============================================================ */

const COOKIE = "hf_session";
const SESSION_HOURS = 12;

/* ---------------------------------------------------------------- helpers */
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });

const enc = new TextEncoder();

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* Comparison that does not leak how much of the value matched. */
function safeEqual(a, b) {
  const A = enc.encode(String(a)), B = enc.encode(String(b));
  let diff = A.length ^ B.length;
  for (let i = 0; i < Math.max(A.length, B.length); i++) diff |= (A[i] ?? 0) ^ (B[i] ?? 0);
  return diff === 0;
}

const nowIso = () => new Date().toISOString();
const newId = () => crypto.randomUUID();

/* Pence in, pence out. Anything unparseable is zero rather than NaN. */
function pence(v) {
  const n = Math.round(Number(String(v ?? "").replace(/[^0-9.-]/g, "")) * 100);
  return Number.isFinite(n) ? n : 0;
}
function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
const clean = (v, max = 500) => String(v ?? "").trim().slice(0, max);

/* ------------------------------------------------------------------ auth */
async function issueSession(env) {
  const expires = Date.now() + SESSION_HOURS * 3600 * 1000;
  const body = `hf.${expires}`;
  return `${body}.${await hmac(env.HF_SESSION_SECRET, body)}`;
}

async function validSession(request, env) {
  if (!env.HF_SESSION_SECRET) return false;
  const raw = (request.headers.get("cookie") || "")
    .split(/;\s*/).find((c) => c.startsWith(COOKIE + "="));
  if (!raw) return false;
  const token = decodeURIComponent(raw.slice(COOKIE.length + 1));
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const body = parts[0] + "." + parts[1];
  if (!safeEqual(parts[2], await hmac(env.HF_SESSION_SECRET, body))) return false;
  return Number(parts[1]) > Date.now();
}

/* ------------------------------------------------------------- passwords
   PBKDF2-SHA256, a fresh 16-byte salt per password. Slow on purpose: the whole
   point is that guessing costs the attacker real time. Never store the
   password, only this.

   100,000 is not a preference, it is the ceiling. The Workers runtime refuses
   a PBKDF2 deriveBits above 100,000 iterations and throws a DOMException
   rather than doing the work. This was set to 150,000, so hashPassword threw
   every time it was called -- which meant setting a password ALWAYS failed,
   from the very first attempt, with an uncaught exception and a bare 500 on
   the "New password" screen. Nothing was ever stored, so there are no old
   150,000-round hashes to keep compatible with. */
const PBKDF2_ROUNDS = 100000;

function toHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function randomHex(bytes) {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)));
}

async function hashPassword(password, saltHex) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(String(password)), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(saltHex), iterations: PBKDF2_ROUNDS, hash: "SHA-256" },
    key, 256
  );
  return toHex(bits);
}

/* SHA-256 is right for the reset token and wrong for the password: the token
   is 32 random bytes, so there is nothing to guess and nothing to slow down. */
async function sha256Hex(s) {
  return toHex(await crypto.subtle.digest("SHA-256", enc.encode(String(s))));
}

/* His own password if he has set one. HF_ADMIN_PASSWORD keeps working as a
   recovery password so a forgotten password with no email configured is not a
   locked door -- the back office says as much, rather than leaving him to
   find out. */
/* ---- how many wrong guesses before the door shuts, and for how long ----
   Login is generous, because the person most likely to get it wrong repeatedly
   is Mohammad on a phone keyboard. Reset requests are tighter, because each one
   sends him an email and nobody needs three an hour legitimately. */
const LIMITS = {
  login:  { max: 8, windowMs: 15 * 60000, lockMs: 15 * 60000 },
  forgot: { max: 3, windowMs: 60 * 60000, lockMs: 60 * 60000 },
};

function callerIp(request) {
  return clean(request.headers.get("cf-connecting-ip"), 60) || "unknown";
}

/* Returns the number of seconds left on a lock, or 0 when the caller is free
   to try. An expired lock resets the count rather than lingering. */
async function lockedFor(env, scope, ip) {
  const row = await env.HF_DB.prepare(
    "SELECT fails, first_at, locked_until FROM hf_login_attempts WHERE id = ?"
  ).bind(scope + ":" + ip).first();
  if (!row || !row.locked_until) return 0;
  const left = Date.parse(row.locked_until) - Date.now();
  if (left > 0) return Math.ceil(left / 1000);
  await clearAttempts(env, scope, ip);
  return 0;
}

async function noteFailure(env, scope, ip) {
  const lim = LIMITS[scope];
  const id = scope + ":" + ip;
  const now = Date.now();
  const row = await env.HF_DB.prepare(
    "SELECT fails, first_at FROM hf_login_attempts WHERE id = ?"
  ).bind(id).first();

  /* Outside the window the count starts again, so an occasional typo weeks
     apart never accumulates into a lockout. */
  const fresh = !row || (now - Date.parse(row.first_at)) > lim.windowMs;
  const fails = fresh ? 1 : row.fails + 1;
  const firstAt = fresh ? new Date(now).toISOString() : row.first_at;
  const lockedUntil = fails >= lim.max ? new Date(now + lim.lockMs).toISOString() : null;

  await env.HF_DB.prepare(
    `INSERT INTO hf_login_attempts (id, scope, ip, fails, first_at, locked_until)
     VALUES (?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET fails = ?, first_at = ?, locked_until = ?`
  ).bind(id, scope, ip, fails, firstAt, lockedUntil, fails, firstAt, lockedUntil).run();

  /* Housekeeping, on the write rather than a timer: anything untouched for a
     day is of no further interest. */
  await env.HF_DB.prepare("DELETE FROM hf_login_attempts WHERE first_at < ?")
    .bind(new Date(now - 24 * 3600000).toISOString()).run();

  return lockedUntil ? Math.ceil(lim.lockMs / 1000) : 0;
}

async function clearAttempts(env, scope, ip) {
  await env.HF_DB.prepare("DELETE FROM hf_login_attempts WHERE id = ?")
    .bind(scope + ":" + ip).run();
}

async function passwordOk(env, s, attempt) {
  if (s && s.password_hash && s.password_salt) {
    if (safeEqual(await hashPassword(attempt, s.password_salt), s.password_hash)) return true;
  }
  if (env.HF_ADMIN_PASSWORD && safeEqual(attempt, env.HF_ADMIN_PASSWORD)) return true;
  return false;
}

async function setPassword(env, next) {
  const salt = randomHex(16);
  await env.HF_DB.prepare(
    `UPDATE hf_settings SET password_hash=?, password_salt=?, password_set_at=?,
      reset_hash=NULL, reset_expires=NULL WHERE id=1`
  ).bind(await hashPassword(next, salt), salt, nowIso()).run();
}

function cookieHeader(value, maxAge) {
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

/* --------------------------------------------------------------- settings */
async function getSettings(env) {
  const row = await env.HF_DB.prepare("SELECT * FROM hf_settings WHERE id = 1").first();
  return row || {};
}

/* Settings go to the browser and, for the business block, to anyone holding an
   invoice link. The password hash, its salt and a live reset token must not
   travel with them -- SELECT * would carry all three the moment they existed. */
const SECRET_SETTINGS = ["password_hash", "password_salt", "reset_hash", "reset_expires"];
function publicSettings(s) {
  const out = { ...s };
  for (const k of SECRET_SETTINGS) delete out[k];
  /* Useful to the office, harmless to leak: whether he has set one at all. */
  out.has_own_password = !!(s.password_hash && s.password_salt);
  return out;
}

const SETTING_FIELDS = [
  "business_name", "trading_name", "address", "postcode", "phone", "email",
  "website", "company_no", "vat_number", "gas_safe_no", "logo_data", "review_url",
  "bank_name", "bank_account", "bank_sort", "payment_terms", "invoice_prefix",
  "template", "accent",
];

async function saveSettings(env, body) {
  const sets = [], vals = [];
  for (const f of SETTING_FIELDS) {
    if (body[f] === undefined) continue;
    /* the logo is a data: URI and legitimately long; everything else is short */
    sets.push(`${f} = ?`);
    vals.push(clean(body[f], f === "logo_data" ? 400000 : 500));
  }
  if (body.vat_registered !== undefined) { sets.push("vat_registered = ?"); vals.push(body.vat_registered ? 1 : 0); }
  if (body.vat_rate !== undefined)       { sets.push("vat_rate = ?");       vals.push(Math.max(0, Math.round(num(body.vat_rate, 2000)))); }
  if (body.next_number !== undefined)    { sets.push("next_number = ?");    vals.push(Math.max(1, Math.round(num(body.next_number, 1001)))); }
  if (!sets.length) return getSettings(env);
  sets.push("updated_at = ?"); vals.push(nowIso());
  await env.HF_DB.prepare(`UPDATE hf_settings SET ${sets.join(", ")} WHERE id = 1`).bind(...vals).run();
  return getSettings(env);
}

/* -------------------------------------------------------------- customers */
async function listCustomers(env, q) {
  const like = `%${(q || "").trim()}%`;
  const sql = q
    ? `SELECT * FROM hf_customers WHERE name LIKE ? OR postcode LIKE ? OR phone LIKE ?
       ORDER BY name LIMIT 200`
    : `SELECT * FROM hf_customers ORDER BY name LIMIT 200`;
  const stmt = q ? env.HF_DB.prepare(sql).bind(like, like, like) : env.HF_DB.prepare(sql);
  return (await stmt.all()).results || [];
}

/* Reuse a customer when the name and postcode match, so the book does not
   fill up with the same person three times. */
async function upsertCustomer(env, c) {
  const name = clean(c.cust_name || c.name, 160);
  if (!name) return null;
  const postcode = clean(c.cust_postcode || c.postcode, 16).toUpperCase();
  const found = await env.HF_DB
    .prepare("SELECT id FROM hf_customers WHERE name = ? AND IFNULL(postcode,'') = ?")
    .bind(name, postcode).first();
  const fields = {
    email: clean(c.cust_email || c.email, 160),
    phone: clean(c.cust_phone || c.phone, 40),
    address: clean(c.cust_address || c.address, 400),
    postcode,
  };
  if (found) {
    await env.HF_DB.prepare(
      "UPDATE hf_customers SET email=?, phone=?, address=?, postcode=? WHERE id=?"
    ).bind(fields.email, fields.phone, fields.address, fields.postcode, found.id).run();
    return found.id;
  }
  const id = newId();
  await env.HF_DB.prepare(
    `INSERT INTO hf_customers (id, created_at, name, email, phone, address, postcode)
     VALUES (?,?,?,?,?,?,?)`
  ).bind(id, nowIso(), name, fields.email, fields.phone, fields.address, fields.postcode).run();
  return id;
}

/* --------------------------------------------------------------- invoices */
/* Worked out here so the browser cannot post its own totals. */
function totals(items, vatRateBp, vatRegistered) {
  let net = 0;
  const rows = items.map((it, i) => {
    const qty = Math.max(0, num(it.qty, 1));
    const unit = pence(it.unit);
    const line = Math.round(qty * unit);
    net += line;
    /* Anything not explicitly parts is labour: that is the commoner line, and
       an unrecognised value must not invent a third section on the document. */
    const kind = clean(it.kind, 12) === "parts" ? "parts" : "labour";
    return { position: i, description: clean(it.description, 400), qty, unit_pence: unit, line_pence: line, kind };
  }).filter((r) => r.description || r.line_pence);
  const vat = vatRegistered ? Math.round(net * vatRateBp / 10000) : 0;
  return { rows, net, vat, gross: net + vat };
}

/* Claim the next invoice number in ONE statement.
   This read the counter and wrote it back separately, with an await in the
   middle. Double-tapping "Send by email" on a phone fires two saves before
   either finishes: both read 1001, both try to insert HF-1001, one wins and
   the other comes back "UNIQUE constraint failed" — so he is told an invoice
   failed that in fact exists, taps again, and raises a duplicate for the same
   job. RETURNING makes the increment and the read the same operation, so two
   callers cannot be handed the same number. */
async function nextNumber(env) {
  const row = await env.HF_DB.prepare(
    `UPDATE hf_settings
        SET next_number = MAX(1, CAST(COALESCE(next_number, 1001) AS INTEGER)) + 1
      WHERE id = 1
      RETURNING next_number - 1 AS claimed, invoice_prefix`
  ).first();
  if (row && row.claimed != null) {
    return `${row.invoice_prefix || "HF-"}${row.claimed}`;
  }
  /* No settings row yet (a database that has not been seeded). Fall back
     rather than handing back "undefined" as an invoice number. */
  const s = await getSettings(env);
  const n = Math.max(1, Math.round(num(s.next_number, 1001)));
  await env.HF_DB.prepare("UPDATE hf_settings SET next_number = ? WHERE id = 1").bind(n + 1).run();
  return `${s.invoice_prefix || "HF-"}${n}`;
}

async function readInvoice(env, id) {
  const inv = await env.HF_DB.prepare("SELECT * FROM hf_invoices WHERE id = ?").bind(id).first();
  if (!inv) return null;
  const items = (await env.HF_DB
    .prepare("SELECT description, qty, unit_pence, line_pence, kind FROM hf_invoice_items WHERE invoice_id = ? ORDER BY position")
    .bind(id).all()).results || [];
  return { ...inv, items };
}

/* ------------------------------------------------------- photos of the work

   A job is worth more to the customer with the work shown than described, and
   worth more to him six months later when someone asks what was actually
   done. The photos hang off the invoice because the invoice is already the
   record of the job -- there is no second thing to keep in step.

   Nothing here ever selects `data` alongside the other columns. A dozen
   photos is a couple of megabytes, and a list endpoint that dragged the image
   bytes through it would make opening the invoice list slower every time he
   added a photo. The bytes come out one at a time, through the photo
   endpoint, and only when a browser actually asks for that image. */

const PHOTO_LIMIT = 12;              /* per invoice */
const PHOTO_MAX_BYTES = 900 * 1024;  /* per photo, after the browser shrinks it */

async function listPhotos(env, invoiceId) {
  return (await env.HF_DB.prepare(
    `SELECT id, caption, mime, bytes, created_at, position
       FROM hf_invoice_photos WHERE invoice_id = ? ORDER BY position, created_at`
  ).bind(invoiceId).all()).results || [];
}

async function addPhoto(env, invoiceId, body) {
  const inv = await env.HF_DB.prepare("SELECT id FROM hf_invoices WHERE id = ?").bind(invoiceId).first();
  if (!inv) return { error: "No such invoice", status: 404 };

  const count = await env.HF_DB.prepare(
    "SELECT COUNT(*) AS n FROM hf_invoice_photos WHERE invoice_id = ?").bind(invoiceId).first();
  if (Number(count?.n || 0) >= PHOTO_LIMIT) {
    return { error: `That job already has ${PHOTO_LIMIT} photos, which is the most an invoice can carry.`, status: 409 };
  }

  /* The browser sends a data URL because that is what a canvas produces.
     Split it here so the mime type is trusted from the prefix we can parse
     rather than from a field the page could set to anything. */
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(body.data || ""));
  if (!m) return { error: "That photo did not arrive as an image.", status: 400 };
  const mime = m[1];
  const b64 = m[2];

  /* base64 carries 3 bytes in every 4 characters. */
  const realBytes = Math.floor((b64.length * 3) / 4);
  if (realBytes > PHOTO_MAX_BYTES) {
    return { error: "That photo is too big even after shrinking. Try another one.", status: 413 };
  }

  const id = newId();
  await env.HF_DB.prepare(
    `INSERT INTO hf_invoice_photos (id, invoice_id, created_at, position, caption, mime, bytes, data)
     VALUES (?,?,?,?,?,?,?,?)`
  ).bind(
    id, invoiceId, nowIso(), Math.round(num(body.position, Number(count?.n || 0))),
    clean(body.caption, 120), mime, realBytes, b64
  ).run();

  return { ok: true, id, caption: clean(body.caption, 120), bytes: realBytes };
}

/* Public: the customer holds the invoice link, and the photos on that page
   have to load without a password. The id is a UUID, so it cannot be guessed
   or counted through -- the same reasoning that makes the invoice itself
   public. A draft's photos stay private, because a draft invoice is not
   readable either and half-finished work should not be on show. */
async function servePhoto(env, photoId, request) {
  const row = await env.HF_DB.prepare(
    `SELECT p.mime, p.data, i.status
       FROM hf_invoice_photos p JOIN hf_invoices i ON i.id = p.invoice_id
      WHERE p.id = ?`
  ).bind(photoId).first();
  if (!row || row.status === "draft") {
    return new Response("Not found", { status: 404 });
  }

  /* A photo never changes once uploaded -- a re-crop is a new row with a new
     id -- so the browser may keep it as long as it likes. The etag lets a
     revisit come back 304 instead of moving the bytes again. */
  const etag = `"${photoId}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { etag } });
  }

  const bin = atob(row.data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

  return new Response(bytes, {
    headers: {
      "content-type": row.mime,
      "cache-control": "public, max-age=31536000, immutable",
      etag,
      /* It is a photo of a boiler in someone's kitchen. Keep it off search
         engines and out of other people's pages. */
      "x-robots-tag": "noindex, noimageindex",
      "x-content-type-options": "nosniff",
    },
  });
}

/* Charging VAT takes BOTH the switch and a registration number.
   The switch alone used to decide it, and the schema defaulted it on, so a
   brand-new database charged 20% on invoices carrying no VAT number anywhere.
   HMRC requires the supplier's number on a VAT invoice, so that document is
   not a valid one: the customer cannot reclaim against it, and a business that
   is not registered is collecting money it has no right to. The number is what
   makes the charge legitimate, so it is what gates it. */
function vatIsChargeable(s) {
  return (s.vat_registered ? 1 : 0) && clean(s.vat_number, 40) ? 1 : 0;
}

async function saveInvoice(env, id, body) {
  const s = await getSettings(env);
  const vatRegistered = vatIsChargeable(s);
  const vatRate = Math.round(num(body.vat_rate, s.vat_rate ?? 2000));
  const t = totals(Array.isArray(body.items) ? body.items : [], vatRate, vatRegistered);

  const existing = id ? await env.HF_DB.prepare("SELECT number, status FROM hf_invoices WHERE id = ?").bind(id).first() : null;
  /* A sent invoice is a document the customer already holds. Editing the
     figures on one would change what they were told they owe. */
  if (existing && existing.status !== "draft") {
    return { error: "This invoice has already been sent. Void it and raise a new one to change the figures.", status: 409 };
  }

  const customerId = await upsertCustomer(env, body);
  const invId = id || newId();

  /* Copy the bank details onto the invoice rather than pointing at the
     account row. Pointing would rewrite every invoice he has ever sent the
     day he edits an account, and a customer holding a permanent link would
     see different details from the ones they paid into. */
  let bank = null;
  if (clean(body.bank_id, 60)) {
    bank = await env.HF_DB.prepare("SELECT * FROM hf_bank_accounts WHERE id = ?")
      .bind(clean(body.bank_id, 60)).first();
  }
  if (!bank) {
    bank = await env.HF_DB.prepare(
      "SELECT * FROM hf_bank_accounts ORDER BY is_default DESC, position, rowid LIMIT 1").first();
  }
  /* His own number wins if he typed one. A draft can be renumbered too --
     he asked to write his own, and a draft is not a document anyone holds
     yet. Uniqueness is enforced by the column, so check first and say
     something useful rather than letting a constraint error surface. */
  const wanted = clean(body.number, 40);
  let number;
  if (existing) {
    number = wanted && wanted !== existing.number ? wanted : existing.number;
  } else {
    number = wanted || await nextNumber(env);
  }
  if (number !== (existing && existing.number)) {
    const clash = await env.HF_DB
      .prepare("SELECT id FROM hf_invoices WHERE number = ? AND id <> ?")
      .bind(number, invId).first();
    if (clash) return { error: `Invoice number ${number} is already used.`, status: 409 };
  }

  const row = {
    id: invId,
    number,
    created_at: existing ? undefined : nowIso(),
    due_at: clean(body.due_at, 40),
    customer_id: customerId,
    cust_name: clean(body.cust_name, 160),
    cust_email: clean(body.cust_email, 160),
    cust_phone: clean(body.cust_phone, 40),
    cust_address: clean(body.cust_address, 400),
    cust_postcode: clean(body.cust_postcode, 16).toUpperCase(),
    work_summary: clean(body.work_summary, 600),
    notes: clean(body.notes, 2000),
    net_pence: t.net,
    vat_pence: t.vat,
    gross_pence: t.gross,
    paid_pence: pence(body.paid),
    vat_rate: vatRate,
    vat_number: clean(s.vat_number, 40),
    template: clean(body.template || s.template || "classic", 40),
    job_no: clean(body.job_no, 60),
    bank_label:        bank ? clean(bank.label, 60)        : "",
    bank_account_name: bank ? clean(bank.account_name, 120) : clean(s.business_name, 120),
    bank_name:         bank ? clean(bank.bank_name, 80)     : clean(s.bank_name, 80),
    bank_sort:         bank ? clean(bank.sort_code, 20)     : clean(s.bank_sort, 20),
    bank_account:      bank ? clean(bank.account_no, 30)    : clean(s.bank_account, 30),
    /* Defaults match the columns: a name and an address on, the phone off. */
    show_cust_name:    body.show_cust_name    === undefined ? 1 : (body.show_cust_name    ? 1 : 0),
    show_cust_address: body.show_cust_address === undefined ? 1 : (body.show_cust_address ? 1 : 0),
    show_cust_phone:   body.show_cust_phone   === undefined ? 0 : (body.show_cust_phone   ? 1 : 0),
  };

  if (existing) {
    await env.HF_DB.prepare(
      `UPDATE hf_invoices SET number=?, due_at=?, customer_id=?, cust_name=?, cust_email=?, cust_phone=?,
        cust_address=?, cust_postcode=?, work_summary=?, notes=?, net_pence=?, vat_pence=?,
        gross_pence=?, paid_pence=?, vat_rate=?, vat_number=?, template=?, job_no=?,
        bank_label=?, bank_account_name=?, bank_name=?, bank_sort=?, bank_account=?,
        show_cust_name=?, show_cust_address=?, show_cust_phone=? WHERE id=?`
    ).bind(row.number, row.due_at, row.customer_id, row.cust_name, row.cust_email, row.cust_phone,
      row.cust_address, row.cust_postcode, row.work_summary, row.notes, row.net_pence,
      row.vat_pence, row.gross_pence, row.paid_pence, row.vat_rate, row.vat_number,
      row.template, row.job_no, row.bank_label, row.bank_account_name, row.bank_name,
      row.bank_sort, row.bank_account, row.show_cust_name, row.show_cust_address,
      row.show_cust_phone, invId).run();
  } else {
    await env.HF_DB.prepare(
      `INSERT INTO hf_invoices (id, number, created_at, due_at, status, customer_id, cust_name,
        cust_email, cust_phone, cust_address, cust_postcode, work_summary, notes, net_pence,
        vat_pence, gross_pence, paid_pence, vat_rate, vat_number, template, job_no,
        bank_label, bank_account_name, bank_name, bank_sort, bank_account,
        show_cust_name, show_cust_address, show_cust_phone)
       VALUES (?,?,?,?, 'draft', ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(invId, row.number, row.created_at, row.due_at, row.customer_id, row.cust_name,
      row.cust_email, row.cust_phone, row.cust_address, row.cust_postcode, row.work_summary,
      row.notes, row.net_pence, row.vat_pence, row.gross_pence, row.paid_pence, row.vat_rate,
      row.vat_number, row.template, row.job_no, row.bank_label, row.bank_account_name,
      row.bank_name, row.bank_sort, row.bank_account, row.show_cust_name,
      row.show_cust_address, row.show_cust_phone).run();
  }

  await env.HF_DB.prepare("DELETE FROM hf_invoice_items WHERE invoice_id = ?").bind(invId).run();
  for (const r of t.rows) {
    await env.HF_DB.prepare(
      `INSERT INTO hf_invoice_items (invoice_id, position, description, qty, unit_pence, line_pence, kind)
       VALUES (?,?,?,?,?,?,?)`
    ).bind(invId, r.position, r.description, r.qty, r.unit_pence, r.line_pence, r.kind).run();
  }
  return { invoice: await readInvoice(env, invId) };
}

async function setStatus(env, id, status, via) {
  const allowed = ["draft", "sent", "paid", "void"];
  if (!allowed.includes(status)) return { error: "Unknown status", status: 400 };
  const now = nowIso();
  const sets = ["status = ?"], vals = [status];
  /* The tax point is the day it was issued, and it is set once. */
  if (status === "sent") {
    sets.push("sent_at = ?", "sent_via = ?", "issued_at = COALESCE(issued_at, ?)");
    vals.push(now, clean(via, 20) || "manual", now);
  }
  if (status === "paid") { sets.push("paid_at = ?"); vals.push(now); }
  vals.push(id);
  await env.HF_DB.prepare(`UPDATE hf_invoices SET ${sets.join(", ")} WHERE id = ?`).bind(...vals).run();
  return { invoice: await readInvoice(env, id) };
}

/* ------------------------------------------------------------------ email */
async function emailInvoice(env, id, origin, message) {
  if (!env.RESEND_API_KEY) {
    return { error: "Email is not switched on yet — the RESEND_API_KEY secret is not set.", status: 503 };
  }
  const inv = await readInvoice(env, id);
  if (!inv) return { error: "No such invoice", status: 404 };
  if (!inv.cust_email) return { error: "That customer has no email address on the invoice.", status: 400 };
  const s = await getSettings(env);
  const link = `${origin}/i/${inv.id}`;
  const money = (p) => "£" + (p / 100).toFixed(2);
  /* Named in the email so the customer knows to open the link. Photos are not
     attached: a mail with a dozen images is the one that lands in junk, and
     the invoice page shows them better than any inbox will. */
  const photoCount = (await listPhotos(env, id)).length;

  const html = `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;color:#0d1726;line-height:1.6">
    <p>Hello ${escape_(inv.cust_name)},</p>
    <p>${escape_(message || "Thanks very much for the work. Your invoice is below.")}</p>
    <p style="font-size:18px;margin:22px 0 6px"><b>Invoice ${escape_(inv.number)}</b></p>
    <p style="margin:0 0 18px">Total ${money(inv.gross_pence)}${inv.paid_pence ? ` &middot; already paid ${money(inv.paid_pence)}` : ""}
      &middot; <b>due ${money(inv.gross_pence - inv.paid_pence)}</b></p>
    ${photoCount ? `<p style="margin:0 0 18px">${photoCount === 1
      ? "There is a photo of the work on your invoice page."
      : `There are ${photoCount} photos of the work on your invoice page.`}</p>` : ""}
    <p><a href="${link}" style="display:inline-block;background:#0B2E63;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none">View your invoice${photoCount ? " and photos" : ""}</a></p>
    ${s.review_url ? `<p style="margin:26px 0 0;padding-top:20px;border-top:1px solid #e2e8f0">
      If you were happy with the work, a quick Google review really helps a small
      business like ours.<br>
      <a href="${escape_(s.review_url)}" style="color:#0B2E63;font-weight:600">Leave a review</a></p>` : ""}
    <p style="margin-top:24px;font-size:13px;color:#55657a">
      ${escape_(s.business_name || "HeatFix Mcr Limited")}${s.vat_number ? ` &middot; VAT ${escape_(s.vat_number)}` : ""}
      ${s.gas_safe_no ? ` &middot; Gas Safe ${escape_(s.gas_safe_no)}` : ""}<br>
      ${escape_(s.phone || "")} &middot; ${escape_(s.email || "")}
    </p></div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: `${s.business_name || "HeatFix Mcr Limited"} <${env.HF_MAIL_FROM || "invoices@heatfixmcrlimited.co.uk"}>`,
      reply_to: s.email || undefined,
      to: [inv.cust_email],
      /* A copy to himself, because the mail is sent by the server and so never
         appears in his own Sent items. Without this his only record is the
         "Sent" flag in the back office, and an invoice he cannot produce from
         his own inbox years later is a poor record of a debt. Blind, so the
         customer never sees his personal address. */
      bcc: s.email ? [s.email] : undefined,
      subject: `Invoice ${inv.number} from ${s.business_name || "HeatFix Mcr Limited"}`,
      html,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { error: "Resend refused the message: " + detail.slice(0, 300), status: 502 };
  }
  return await setStatus(env, id, "sent", "email");
}

function escape_(s) {
  return String(s ?? "").replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
}

/* Tell him a lead has come in.
 *
 * Sent from the Worker rather than from the page on purpose. A form that
 * carries its own access key puts that key in the page source of every
 * visitor, where scrapers collect them and spam the address behind it. From
 * here no key ever leaves Cloudflare.
 *
 * Resend first, because it is already carrying his invoices and is therefore
 * the path known to work; Web3Forms only if Resend is not configured. If
 * neither is, that is recorded too -- see below.
 *
 * This used to be Web3Forms alone, and it failed silently in three separate
 * ways at once: `if (!key) return` with no key set, a bare `catch {}` around
 * the fetch, and no check of the response (Web3Forms answers 200 with
 * {"success": false} when it rejects a key). All three meant a missing
 * notification looked exactly like a delivered one. The enquiry is committed
 * to the database before any of this runs, so a mail outage still costs a
 * notification and never the lead -- but the OUTCOME is now written to the
 * row, so the back office can say plainly that the email did not go.
 */
const ENQUIRY_LABELS = {
  name: "Name", phone: "Phone", email: "Email", address: "Address",
  town: "Town", postcode: "Postcode", job: "Job", slot: "Preferred time",
  details: "Details", source: "Came from",
};

function enquiryFields(enquiry) {
  const out = {};
  for (const [k, label] of Object.entries(ENQUIRY_LABELS)) {
    if (enquiry[k]) out[label] = enquiry[k];      /* blank rows read as broken */
  }
  return out;
}

async function sendEnquiryByResend(env, enquiry, to, fields) {
  const rows = Object.entries(fields).map(([k, v]) =>
    `<tr><td style="padding:6px 14px 6px 0;color:#55657a;vertical-align:top;white-space:nowrap">${escape_(k)}</td>` +
    `<td style="padding:6px 0"><b>${escape_(v)}</b></td></tr>`).join("");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: `HeatFix website <${env.HF_MAIL_FROM || "invoices@heatfixmcrlimited.co.uk"}>`,
      to: [to],
      /* So he can hit reply in his inbox and reach the customer directly. */
      reply_to: enquiry.email || undefined,
      subject: `New enquiry from ${enquiry.name} — HeatFix website`,
      html: `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;color:#0d1726;line-height:1.6">
        <p style="font-size:17px;margin:0 0 4px"><b>New enquiry from the website</b></p>
        <p style="margin:0 0 18px;color:#55657a">${escape_(enquiry.name)} is waiting to hear back.</p>
        <table style="border-collapse:collapse;font-size:15px">${rows}</table>
        <p style="margin:24px 0 0"><a href="https://heatfixmcrlimited.co.uk/office"
          style="display:inline-block;background:#0B2E63;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none">Open the back office</a></p>
      </div>`,
    }),
    /* The customer is waiting on this response, so the notification
       gets a short leash: the lead is already saved, and a slow mail
       provider must not become a slow booking form. */
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    throw new Error("Resend refused it: " + (await res.text().catch(() => "")).slice(0, 200));
  }
}

async function sendEnquiryByWeb3Forms(env, enquiry, key, fields) {
  const res = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      access_key: key,
      subject: `New enquiry from ${enquiry.name} — HeatFix website`,
      from_name: "HeatFix website",
      ...fields,
      "Open the back office": "https://heatfixmcrlimited.co.uk/office",
      ...(enquiry.email ? { replyto: enquiry.email } : {}),
    }),
    /* The customer is waiting on this response, so the notification
       gets a short leash: the lead is already saved, and a slow mail
       provider must not become a slow booking form. */
    signal: AbortSignal.timeout(5000),
  });
  /* A 200 is not success here. Web3Forms answers 200 with success:false when
     it rejects the key, which is exactly the case worth catching. */
  const out = await res.json().catch(() => ({}));
  if (!res.ok || out.success === false) {
    throw new Error("Web3Forms refused it: " + String(out.message || res.status).slice(0, 200));
  }
}

async function notifyEnquiry(env, enquiry) {
  const settings = await getSettings(env);
  const to = clean(settings.email, 160);
  const w3 = clean(env.HF_WEB3FORMS_KEY, 120);
  const fields = enquiryFields(enquiry);

  let via = "", error = "";
  try {
    if (env.RESEND_API_KEY && to) {
      via = "resend";
      await sendEnquiryByResend(env, enquiry, to, fields);
    } else if (w3) {
      via = "web3forms";
      await sendEnquiryByWeb3Forms(env, enquiry, w3, fields);
    } else {
      /* Nothing is configured to send with. That is a real state -- it is how
         the preview copy on billydigitals.com behaves, and it must not be able
         to mail him -- but on his own domain it means every lead arrives
         unannounced, so it is recorded rather than passed over in silence. */
      error = !to
        ? "No email address is saved in My details, so there is nowhere to send it."
        : "Neither RESEND_API_KEY nor HF_WEB3FORMS_KEY is set.";
    }
  } catch (err) {
    error = String(err && err.message || err).slice(0, 300);
  }

  /* Never let recording the outcome throw: the customer is waiting on the
     response to this request, and the lead is already saved. */
  try {
    await env.HF_DB.prepare(
      "UPDATE hf_enquiries SET notified = ?, notify_via = ?, notify_error = ? WHERE id = ?"
    ).bind(error ? "failed" : "sent", via || null, error || null, enquiry.id).run();
  } catch { /* the columns arrive with migration 0009 */ }

  if (error) console.error("HeatFix enquiry notification failed:", error);
}

/* ------------------------------------------------------------- the router */
export function isHfCrmPath(pathname) {
  return pathname.startsWith("/api/hf/");
}

/* Everything below the sign-in gate already runs inside a try/catch. The
   endpoints ABOVE it -- login, forgot, reset -- did not, so a throw in any of
   them reached the browser as a bare 500 with no JSON body, and the office
   could only say "Something went wrong (500)". That is the worst possible
   message to hand someone who is locked out of his own back office: it names
   nothing he can act on and nothing anyone can debug from. A failure here now
   says what actually broke. */
export async function handleHfCrm(request, env, url) {
  try {
    return await routeHfCrm(request, env, url);
  } catch (err) {
    return json({ error: "The back office hit an error: " + String(err && err.message || err).slice(0, 200) }, 500);
  }
}

async function routeHfCrm(request, env, url) {
  if (!env.HF_DB) return json({ error: "The back office database is not connected yet." }, 503);
  const path = url.pathname.replace(/^\/api\/hf\//, "");
  const method = request.method;

  /* login and logout are the only doors that open without a session */
  if (path === "login" && method === "POST") {
    const body = await request.json().catch(() => ({}));
    const s = await getSettings(env);
    const hasPassword = (s.password_hash && s.password_salt) || env.HF_ADMIN_PASSWORD;
    if (!hasPassword || !env.HF_SESSION_SECRET) {
      return json({ error: "No password is set for the back office yet." }, 503);
    }
    const ip = callerIp(request);
    const wait = await lockedFor(env, "login", ip);
    if (wait) {
      return json({ error: `Too many wrong passwords. Try again in ${Math.ceil(wait / 60)} minutes.` }, 429);
    }
    if (!(await passwordOk(env, s, body.password || ""))) {
      /* a beat, so the endpoint cannot be hammered quickly */
      await new Promise((r) => setTimeout(r, 600));
      const locked = await noteFailure(env, "login", ip);
      if (locked) {
        return json({ error: `Too many wrong passwords. Try again in ${Math.ceil(locked / 60)} minutes.` }, 429);
      }
      return json({ error: "That password is not right." }, 401);
    }
    await clearAttempts(env, "login", ip);
    return json({ ok: true }, 200, { "set-cookie": cookieHeader(await issueSession(env), SESSION_HOURS * 3600) });
  }

  /* ---- forgotten password: ask for a link, then use it ----
     Both of these are unauthenticated by necessity. Neither reveals anything:
     the request always answers the same way whether or not an email address is
     configured, so it cannot be used to find out. */
  if (path === "password/forgot" && method === "POST") {
    /* Each call sends him an email, so without a limit this is a way to bury
       his inbox — and to keep replacing a reset token he is trying to use. */
    const fip = callerIp(request);
    const fwait = await lockedFor(env, "forgot", fip);
    if (fwait) {
      return json({ error: `Too many reset requests. Try again in ${Math.ceil(fwait / 60)} minutes.` }, 429);
    }
    await noteFailure(env, "forgot", fip);   /* every request counts, not just failures */
    const s = await getSettings(env);
    const to = clean(s.email, 160);
    const same = json({ ok: true, sent: true });
    if (!to || !env.RESEND_API_KEY) {
      /* Say plainly that it cannot send, rather than pretending it did and
         leaving him waiting for an email that is never coming. */
      return json({ ok: false, cannot: true,
        error: !to
          ? "There is no email address saved in My details, so a reset link cannot be sent."
          : "Reset emails are not switched on yet." }, 503);
    }
    const token = randomHex(32);
    const expires = new Date(Date.now() + 45 * 60 * 1000).toISOString();
    await env.HF_DB.prepare("UPDATE hf_settings SET reset_hash=?, reset_expires=? WHERE id=1")
      .bind(await sha256Hex(token), expires).run();

    const link = `https://${url.hostname}/office?reset=${token}`;
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: `${s.business_name || "HeatFix Mcr Limited"} <${env.HF_MAIL_FROM || "invoices@heatfixmcrlimited.co.uk"}>`,
        to: [to],
        subject: "Reset your back office password",
        html: `<p>Someone asked to reset the password for your back office.</p>
<p><a href="${link}">Set a new password</a></p>
<p>The link works once and stops working in 45 minutes. If this was not you,
ignore it &mdash; nothing has changed.</p>`,
      }),
    }).catch(() => null);
    if (!r || !r.ok) return json({ error: "The reset email could not be sent." }, 502);
    return same;
  }

  if (path === "password/reset" && method === "POST") {
    const body = await request.json().catch(() => ({}));
    const next = String(body.password || "");
    if (next.length < 8) return json({ error: "Pick a password of at least 8 characters." }, 400);
    const s = await getSettings(env);
    if (!s.reset_hash || !s.reset_expires) {
      return json({ error: "That reset link is not valid any more." }, 400);
    }
    if (new Date(s.reset_expires).getTime() < Date.now()) {
      await env.HF_DB.prepare("UPDATE hf_settings SET reset_hash=NULL, reset_expires=NULL WHERE id=1").run();
      return json({ error: "That reset link has expired. Ask for a new one." }, 400);
    }
    if (!safeEqual(await sha256Hex(clean(body.token, 200)), s.reset_hash)) {
      await new Promise((r) => setTimeout(r, 600));
      return json({ error: "That reset link is not valid any more." }, 400);
    }
    /* A session cannot be signed without this, and issuing one below would
       throw on a zero-length key. Say so before changing the password, rather
       than after — resetting it and then failing to sign him in would leave
       him with a new password and no way to tell whether it saved. */
    if (!env.HF_SESSION_SECRET) {
      return json({ error: "The back office is missing its HF_SESSION_SECRET setting, so it cannot sign you in." }, 503);
    }
    await setPassword(env, next);      /* clears the token as it goes */
    /* He has just proved he holds the mailbox, so wipe both counters: locking
       him out immediately after a successful reset would be absurd. */
    const rip = callerIp(request);
    await clearAttempts(env, "login", rip);
    await clearAttempts(env, "forgot", rip);
    return json({ ok: true }, 200, { "set-cookie": cookieHeader(await issueSession(env), SESSION_HOURS * 3600) });
  }
  if (path === "logout") {
    return json({ ok: true }, 200, { "set-cookie": cookieHeader("", 0) });
  }
  if (path === "session") {
    return json({ signedIn: await validSession(request, env) });
  }
  /* The customer's own copy. No password: they were sent the link, and the
     id is a UUID so it cannot be guessed or counted through. A draft is not
     readable here, so nothing half-finished can leak. */
  if (path.startsWith("public/") && method === "GET") {
    const data = await readPublicInvoice(env, path.slice(7));
    return data ? json(data) : json({ error: "That invoice is not available." }, 404);
  }

  /* The image itself, for the <img> tags on that same customer page. */
  if (path.startsWith("photo/") && method === "GET") {
    return servePhoto(env, path.slice(6), request);
  }

  /* The booking form posts here before it opens WhatsApp, so a lead exists on
     his account whether or not the visitor ever presses send. Unauthenticated
     by necessity — the customer has no login — so everything is length-capped
     and the honeypot is honoured. It only ever inserts; nothing here can read
     the customer book back out. */
  if (path === "enquiry" && method === "POST") {
    const b = await request.json().catch(() => ({}));
    if (clean(b.botcheck, 40)) return json({ ok: true });   /* a bot: look successful, store nothing */

    const name = clean(b.name, 120);
    const phone = clean(b.phone, 40);
    if (!name || !phone) {
      return json({ error: "A name and a phone number are needed." }, 400);
    }
    const id = newId();
    await env.HF_DB.prepare(
      `INSERT INTO hf_enquiries
         (id, created_at, status, name, phone, email, address, town, postcode,
          job, slot, details, source, ua)
       VALUES (?,?,'new',?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      id, nowIso(), name, phone,
      clean(b.email, 160), clean(b.address, 200), clean(b.town, 80),
      clean(b.postcode, 16).toUpperCase(), clean(b.job, 120), clean(b.slot, 120),
      clean(b.details, 2000), clean(b.source, 80),
      clean(request.headers.get("user-agent"), 200)
    ).run();

    await notifyEnquiry(env, {
      id, name, phone,
      email: clean(b.email, 160), address: clean(b.address, 200),
      town: clean(b.town, 80), postcode: clean(b.postcode, 16).toUpperCase(),
      job: clean(b.job, 120), slot: clean(b.slot, 120),
      details: clean(b.details, 2000), source: clean(b.source, 80),
    });

    return json({ ok: true, id });
  }

  if (!(await validSession(request, env))) return json({ error: "Please sign in." }, 401);

  const body = ["POST", "PUT", "PATCH"].includes(method)
    ? await request.json().catch(() => ({})) : {};
  const seg = path.split("/").filter(Boolean);

  try {
    if (seg[0] === "settings") {
      if (method === "GET") return json({ settings: publicSettings(await getSettings(env)) });
      if (method === "PUT")  return json({ settings: publicSettings(await saveSettings(env, body)) });
    }

    if (seg[0] === "password" && method === "POST") {
      const s2 = await getSettings(env);
      const next = String(body.password || "");
      if (next.length < 8) return json({ error: "Pick a password of at least 8 characters." }, 400);
      /* Signed in is not enough: an unattended laptop should not be able to
         lock him out of his own back office. */
      if (!(await passwordOk(env, s2, String(body.current || "")))) {
        await new Promise((r) => setTimeout(r, 600));
        return json({ error: "That current password is not right." }, 401);
      }
      await setPassword(env, next);
      return json({ ok: true });
    }

    if (seg[0] === "banks") {
      if (method === "GET") {
        return json({ banks: (await env.HF_DB.prepare(
          "SELECT * FROM hf_bank_accounts ORDER BY is_default DESC, position, rowid").all()).results || [] });
      }
      if (method === "POST" || (method === "PUT" && seg[1])) {
        const bid = seg[1] || newId();
        const f = [
          clean(body.label, 60) || "Account",
          clean(body.account_name, 120),
          clean(body.bank_name, 80),
          clean(body.sort_code, 20),
          clean(body.account_no, 30),
          body.is_default ? 1 : 0,
          Math.round(num(body.position, 0)),
        ];
        if (seg[1]) {
          await env.HF_DB.prepare(
            `UPDATE hf_bank_accounts SET label=?, account_name=?, bank_name=?, sort_code=?,
              account_no=?, is_default=?, position=? WHERE id=?`).bind(...f, bid).run();
        } else {
          await env.HF_DB.prepare(
            `INSERT INTO hf_bank_accounts (label, account_name, bank_name, sort_code,
              account_no, is_default, position, id) VALUES (?,?,?,?,?,?,?,?)`).bind(...f, bid).run();
        }
        /* Only one default, or the dropdown picks a different account each
           time depending on row order. */
        if (f[5]) {
          await env.HF_DB.prepare("UPDATE hf_bank_accounts SET is_default = 0 WHERE id <> ?")
            .bind(bid).run();
        }
        return json({ ok: true, id: bid });
      }
      if (method === "DELETE" && seg[1]) {
        await env.HF_DB.prepare("DELETE FROM hf_bank_accounts WHERE id = ?").bind(seg[1]).run();
        return json({ ok: true });
      }
    }

    if (seg[0] === "enquiries") {
      if (method === "GET") {
        const rows = (await env.HF_DB.prepare(
          `SELECT * FROM hf_enquiries ORDER BY created_at DESC LIMIT 300`
        ).all()).results || [];
        return json({ enquiries: rows, new_count: rows.filter((r) => r.status === "new").length });
      }
      if (method === "PUT" && seg[1]) {
        const allowed = ["new", "contacted", "booked", "closed"];
        const status = allowed.includes(body.status) ? body.status : "new";
        await env.HF_DB.prepare("UPDATE hf_enquiries SET status = ? WHERE id = ?")
          .bind(status, seg[1]).run();
        return json({ ok: true });
      }
      if (method === "DELETE" && seg[1]) {
        await env.HF_DB.prepare("DELETE FROM hf_enquiries WHERE id = ?").bind(seg[1]).run();
        return json({ ok: true });
      }
    }

    if (seg[0] === "customers") {
      if (method === "GET") return json({ customers: await listCustomers(env, url.searchParams.get("q")) });
      if (method === "DELETE" && seg[1]) {
        await env.HF_DB.prepare("DELETE FROM hf_customers WHERE id = ?").bind(seg[1]).run();
        return json({ ok: true });
      }
    }

    if (seg[0] === "invoices") {
      /* Photos of the work, FIRST in this block and deliberately so. Every
         rule below matches on seg[1] alone — the invoice id — and would
         happily answer a request that was about a photo hanging off it.
         "GET /invoices/<id>/photos" would return the invoice, and worse,
         "DELETE /invoices/<id>/photos/<photo>" would delete the whole
         invoice rather than the one photograph. */
      if (seg[2] === "photos") {
        if (method === "GET")  return json({ photos: await listPhotos(env, seg[1]) });
        if (method === "POST") {
          const r = await addPhoto(env, seg[1], body);
          return r.error ? json({ error: r.error }, r.status) : json(r, 201);
        }
        if (method === "PUT" && seg[3]) {
          await env.HF_DB.prepare(
            "UPDATE hf_invoice_photos SET caption = ? WHERE id = ? AND invoice_id = ?")
            .bind(clean(body.caption, 120), seg[3], seg[1]).run();
          return json({ ok: true });
        }
        if (method === "DELETE" && seg[3]) {
          await env.HF_DB.prepare(
            "DELETE FROM hf_invoice_photos WHERE id = ? AND invoice_id = ?")
            .bind(seg[3], seg[1]).run();
          return json({ ok: true });
        }
        return json({ error: "Unknown photo request" }, 404);
      }

      if (method === "GET" && !seg[1]) {
        const status = url.searchParams.get("status");
        const sql = status
          ? `SELECT * FROM hf_invoices WHERE status = ? ORDER BY created_at DESC LIMIT 300`
          : `SELECT * FROM hf_invoices ORDER BY created_at DESC LIMIT 300`;
        const stmt = status ? env.HF_DB.prepare(sql).bind(status) : env.HF_DB.prepare(sql);
        const rows = (await stmt.all()).results || [];
        const owed = rows.filter((r) => r.status === "sent")
          .reduce((a, r) => a + (r.gross_pence - r.paid_pence), 0);
        return json({ invoices: rows, outstanding_pence: owed });
      }
      if (method === "GET" && seg[1]) {
        const inv = await readInvoice(env, seg[1]);
        return inv ? json({ invoice: inv }) : json({ error: "No such invoice" }, 404);
      }
      if (method === "POST" && !seg[1]) {
        const r = await saveInvoice(env, null, body);
        return r.error ? json({ error: r.error }, r.status) : json(r, 201);
      }
      if (method === "PUT" && seg[1]) {
        const r = await saveInvoice(env, seg[1], body);
        return r.error ? json({ error: r.error }, r.status) : json(r);
      }
      if (method === "POST" && seg[1] && seg[2] === "status") {
        const r = await setStatus(env, seg[1], body.status, body.via);
        return r.error ? json({ error: r.error }, r.status) : json(r);
      }
      if (method === "POST" && seg[1] && seg[2] === "email") {
        const r = await emailInvoice(env, seg[1], url.origin, body.message);
        return r.error ? json({ error: r.error }, r.status) : json(r);
      }
      if (method === "DELETE" && seg[1]) {
        const inv = await env.HF_DB.prepare("SELECT status FROM hf_invoices WHERE id = ?").bind(seg[1]).first();
        if (inv && inv.status !== "draft") return json({ error: "Only a draft can be deleted. Void a sent invoice instead." }, 409);
        await env.HF_DB.prepare("DELETE FROM hf_invoices WHERE id = ?").bind(seg[1]).run();
        return json({ ok: true });
      }
    }
  } catch (err) {
    return json({ error: "That did not save: " + String(err).slice(0, 200) }, 500);
  }

  return json({ error: "Unknown endpoint" }, 404);
}

/* The customer's copy is public but unguessable — the id is a UUID. */
export async function readPublicInvoice(env, id) {
  if (!env.HF_DB) return null;
  const full = await readInvoice(env, id);
  if (!full || full.status === "draft") return null;
  const s = await getSettings(env);

  /* Whatever he chose to keep off the invoice is REMOVED here, not merely
     hidden by the template. This response is public to anyone holding the
     link -- often the company he subcontracts for -- so a field the template
     does not draw would still be sitting in the JSON for anyone who looked.
     Hiding it in the markup would not be privacy, it would be the appearance
     of it. */
  const inv = { ...full };
  if (!Number(inv.show_cust_name))    inv.cust_name = "";
  if (!Number(inv.show_cust_address)) { inv.cust_address = ""; inv.cust_postcode = ""; }
  if (!Number(inv.show_cust_phone))   inv.cust_phone = "";
  /* The customer's email is never on the document either way. */
  delete inv.cust_email;
  delete inv.customer_id;

  /* Ids and captions only. The images come down one at a time from
     /api/hf/photo/<id>, so this payload stays the size of a text response
     however many photos are on the job. */
  const photos = (await listPhotos(env, id)).map((p) => ({ id: p.id, caption: p.caption || "" }));

  return { invoice: inv, photos, business: {
    name: s.business_name, address: s.address, postcode: s.postcode, phone: s.phone,
    email: s.email, website: s.website, vat_number: s.vat_number, company_no: s.company_no,
    gas_safe_no: s.gas_safe_no, logo_data: s.logo_data, review_url: s.review_url,
    /* The account this invoice was raised against, as it stood that day --
       not whatever is current in settings now. */
    bank_account_name: inv.bank_account_name || s.business_name,
    bank_name:    inv.bank_name    || s.bank_name,
    bank_account: inv.bank_account || s.bank_account,
    bank_sort:    inv.bank_sort    || s.bank_sort,
    payment_terms: s.payment_terms,
    template: s.template, accent: s.accent,
  } };
}

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

function cookieHeader(value, maxAge) {
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

/* --------------------------------------------------------------- settings */
async function getSettings(env) {
  const row = await env.HF_DB.prepare("SELECT * FROM hf_settings WHERE id = 1").first();
  return row || {};
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
    return { position: i, description: clean(it.description, 400), qty, unit_pence: unit, line_pence: line };
  }).filter((r) => r.description || r.line_pence);
  const vat = vatRegistered ? Math.round(net * vatRateBp / 10000) : 0;
  return { rows, net, vat, gross: net + vat };
}

async function nextNumber(env) {
  const s = await getSettings(env);
  const n = Math.max(1, Math.round(num(s.next_number, 1001)));
  await env.HF_DB.prepare("UPDATE hf_settings SET next_number = ? WHERE id = 1").bind(n + 1).run();
  return `${s.invoice_prefix || "HF-"}${n}`;
}

async function readInvoice(env, id) {
  const inv = await env.HF_DB.prepare("SELECT * FROM hf_invoices WHERE id = ?").bind(id).first();
  if (!inv) return null;
  const items = (await env.HF_DB
    .prepare("SELECT description, qty, unit_pence, line_pence FROM hf_invoice_items WHERE invoice_id = ? ORDER BY position")
    .bind(id).all()).results || [];
  return { ...inv, items };
}

async function saveInvoice(env, id, body) {
  const s = await getSettings(env);
  const vatRegistered = s.vat_registered ? 1 : 0;
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
  const number = existing ? existing.number : (clean(body.number, 40) || await nextNumber(env));

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
  };

  if (existing) {
    await env.HF_DB.prepare(
      `UPDATE hf_invoices SET due_at=?, customer_id=?, cust_name=?, cust_email=?, cust_phone=?,
        cust_address=?, cust_postcode=?, work_summary=?, notes=?, net_pence=?, vat_pence=?,
        gross_pence=?, paid_pence=?, vat_rate=?, vat_number=?, template=? WHERE id=?`
    ).bind(row.due_at, row.customer_id, row.cust_name, row.cust_email, row.cust_phone,
      row.cust_address, row.cust_postcode, row.work_summary, row.notes, row.net_pence,
      row.vat_pence, row.gross_pence, row.paid_pence, row.vat_rate, row.vat_number,
      row.template, invId).run();
  } else {
    await env.HF_DB.prepare(
      `INSERT INTO hf_invoices (id, number, created_at, due_at, status, customer_id, cust_name,
        cust_email, cust_phone, cust_address, cust_postcode, work_summary, notes, net_pence,
        vat_pence, gross_pence, paid_pence, vat_rate, vat_number, template)
       VALUES (?,?,?,?, 'draft', ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(invId, row.number, row.created_at, row.due_at, row.customer_id, row.cust_name,
      row.cust_email, row.cust_phone, row.cust_address, row.cust_postcode, row.work_summary,
      row.notes, row.net_pence, row.vat_pence, row.gross_pence, row.paid_pence, row.vat_rate,
      row.vat_number, row.template).run();
  }

  await env.HF_DB.prepare("DELETE FROM hf_invoice_items WHERE invoice_id = ?").bind(invId).run();
  for (const r of t.rows) {
    await env.HF_DB.prepare(
      `INSERT INTO hf_invoice_items (invoice_id, position, description, qty, unit_pence, line_pence)
       VALUES (?,?,?,?,?,?)`
    ).bind(invId, r.position, r.description, r.qty, r.unit_pence, r.line_pence).run();
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

  const html = `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;color:#0d1726;line-height:1.6">
    <p>Hello ${escape_(inv.cust_name)},</p>
    <p>${escape_(message || "Thanks very much for the work. Your invoice is below.")}</p>
    <p style="font-size:18px;margin:22px 0 6px"><b>Invoice ${escape_(inv.number)}</b></p>
    <p style="margin:0 0 18px">Total ${money(inv.gross_pence)}${inv.paid_pence ? ` &middot; already paid ${money(inv.paid_pence)}` : ""}
      &middot; <b>due ${money(inv.gross_pence - inv.paid_pence)}</b></p>
    <p><a href="${link}" style="display:inline-block;background:#0B2E63;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none">View your invoice</a></p>
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

/* ------------------------------------------------------------- the router */
export function isHfCrmPath(pathname) {
  return pathname.startsWith("/api/hf/");
}

export async function handleHfCrm(request, env, url) {
  if (!env.HF_DB) return json({ error: "The back office database is not connected yet." }, 503);
  const path = url.pathname.replace(/^\/api\/hf\//, "");
  const method = request.method;

  /* login and logout are the only doors that open without a session */
  if (path === "login" && method === "POST") {
    const body = await request.json().catch(() => ({}));
    if (!env.HF_ADMIN_PASSWORD || !env.HF_SESSION_SECRET) {
      return json({ error: "No password is set for the back office yet." }, 503);
    }
    if (!safeEqual(body.password || "", env.HF_ADMIN_PASSWORD)) {
      /* a beat, so the endpoint cannot be hammered quickly */
      await new Promise((r) => setTimeout(r, 600));
      return json({ error: "That password is not right." }, 401);
    }
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

  if (!(await validSession(request, env))) return json({ error: "Please sign in." }, 401);

  const body = ["POST", "PUT", "PATCH"].includes(method)
    ? await request.json().catch(() => ({})) : {};
  const seg = path.split("/").filter(Boolean);

  try {
    if (seg[0] === "settings") {
      if (method === "GET") return json({ settings: await getSettings(env) });
      if (method === "PUT")  return json({ settings: await saveSettings(env, body) });
    }

    if (seg[0] === "customers") {
      if (method === "GET") return json({ customers: await listCustomers(env, url.searchParams.get("q")) });
      if (method === "DELETE" && seg[1]) {
        await env.HF_DB.prepare("DELETE FROM hf_customers WHERE id = ?").bind(seg[1]).run();
        return json({ ok: true });
      }
    }

    if (seg[0] === "invoices") {
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
  const inv = await readInvoice(env, id);
  if (!inv || inv.status === "draft") return null;
  const s = await getSettings(env);
  return { invoice: inv, business: {
    name: s.business_name, address: s.address, postcode: s.postcode, phone: s.phone,
    email: s.email, website: s.website, vat_number: s.vat_number, company_no: s.company_no,
    gas_safe_no: s.gas_safe_no, logo_data: s.logo_data, review_url: s.review_url,
    bank_name: s.bank_name,
    bank_account: s.bank_account, bank_sort: s.bank_sort, payment_terms: s.payment_terms,
    template: s.template, accent: s.accent,
  } };
}

/* Lunera Ora — booking from her own website, straight into her Square.
 *
 * The owner's brief: customers book on her site and never have to go to
 * Square. Her calendar and her payments still live in Square, so everything
 * here is done with Square's official APIs and her token — the booking lands
 * in the same calendar her Square booking page fills, and the deposit in the
 * same Square balance. Nothing is double-booked because there is one calendar.
 *
 *   GET  /api/lunera/config        → { live, booking, appId, locationId, sdk }
 *   GET  /api/lunera/availability  ?variation=&from=YYYY-MM-DD&days=31
 *                                  → { live: true, slots: ["2026-10-03T15:00:00Z", …] }
 *   POST /api/lunera/book          → books a free time and takes the 20% deposit
 *   POST /api/lunera/request       → emails her a booking request (when Square
 *                                    isn't connected yet and LUNERA_REQUESTS_TO is set)
 *
 * Settings (Cloudflare → the Worker → Settings → Variables and secrets):
 *   LUNERA_SQUARE_TOKEN   secret  her Square access token. Reads her whole account,
 *                                 so it never reaches the page.
 *   LUNERA_SQUARE_APP_ID  plain   her Square application ID (sq0idp-…). Public by
 *                                 design: the card fields on the page need it.
 *   LUNERA_REQUESTS_TO    plain   where booking requests are emailed before Square is
 *                                 connected. Unset = nothing is emailed (the preview
 *                                 never writes to her inbox unless she asked).
 *   RESEND_API_KEY        secret  already set for the site's other forms.
 *
 * A Square token with full access is "seller-level": Square only lets it CREATE
 * bookings if she is on Appointments Plus or Premium. On the free plan the
 * booking call is refused, the held deposit is released, and the page says to
 * text her — see PROJECT-NOTES ("Lunera Ora") for the narrower OAuth route.
 *
 * Why not her Square booking page's own free-times endpoint: it only answers
 * requests whose Origin is Square's own site. Forging that header would be
 * getting round Square's check, not using an API.
 */

const API = "https://connect.squareup.com";
const SDK = "https://web.squarecdn.com/v1/square.js";
const SQUARE_VERSION = "2026-09-16";
const LOCATION = "L8EH27QVVN1GN";
const TZ = "America/Edmonton";
const CACHE_SECONDS = 60;
const DEPOSIT = 0.2;
const FROM = "Lunera Ora website <hello@billydigitals.com>";

// Her bookable services (variation ids from her Square booking page). The
// price here is only a fallback: the deposit is worked out from her live
// Square catalogue price whenever Square answers.
const SERVICES = {
  TF2UNCPOH3I4OZFO7HKX3NY7: { name: "The Aura", cents: 14900 },
  KH6OBDR37HWXJ7QKQ6K6LWW3: { name: "The Radiance", cents: 17900 },
  D6QW4UIBB5OJXPSEAMCCZYFV: { name: "The Lumina", cents: 24900 },
  B2PUH46HJKJI7QHS7RTG2Z2D: { name: "The Aura (launch)", cents: 11900 },
  TCSCFBWSGXDH6SXEKYURNH2C: { name: "The Radiance (launch)", cents: 13900 },
  EFNBDZQST6J2WJOL5U7STXPY: { name: "The Lumina (launch)", cents: 19900 },
  AIEJXQEJUKTEUSZRXENUEOTV: { name: "Bride / Bridesmaids", cents: 15900 },
};

const clean = (v, max = 300) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
const cleanBlock = (v, max = 1500) => String(v ?? "").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ").trim().slice(0, max);
const esc = (s) => String(s ?? "").replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function json(body, status = 200, maxAge = 0) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": maxAge ? `public, max-age=${maxAge}` : "no-store",
    },
  });
}

export function isLuneraPath(p) {
  return p === "/api/lunera/config" || p === "/api/lunera/availability" ||
         p === "/api/lunera/book" || p === "/api/lunera/request";
}

function settings(env) {
  return {
    token: clean(env.LUNERA_SQUARE_TOKEN, 400),
    appId: clean(env.LUNERA_SQUARE_APP_ID, 80),
    location: clean(env.LUNERA_SQUARE_LOCATION, 40) || LOCATION,
    requestsTo: clean(env.LUNERA_REQUESTS_TO, 160),
    resend: clean(env.RESEND_API_KEY, 200),
  };
}

/* ───────── time ───────── */

/* Minutes east of UTC for Edmonton at an instant (−360 summer, −420 winter). */
function offsetMinutes(at) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(at);
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+v.year, +v.month - 1, +v.day, +v.hour % 24, +v.minute, +v.second);
  return Math.round((asUtc - at.getTime()) / 60000);
}

/* Midnight at the start of an Edmonton calendar day, as an instant. */
export function startOfDay(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  const wall = Date.UTC(y, m - 1, d);
  // Guess with noon's offset, then re-check at the guess itself: on the day the
  // clocks change, midnight and noon are on different offsets.
  let at = new Date(wall - offsetMinutes(new Date(wall + 12 * 3600000)) * 60000);
  at = new Date(wall - offsetMinutes(at) * 60000);
  return at;
}

function wallTime(iso) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  }).format(new Date(iso));
}

/* ───────── Square ───────── */

async function square(s, fetchImpl, method, path, body) {
  let res;
  try {
    res = await fetchImpl(API + path, {
      method,
      headers: {
        "Authorization": `Bearer ${s.token}`,
        "Square-Version": SQUARE_VERSION,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    return { ok: false, status: 0, data: {}, errors: [{ code: "UNREACHABLE" }] };
  }
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data, errors: data.errors || [] };
}

function windowFor(fromInstant, days, nowAt) {
  let start = fromInstant;
  if (start < nowAt) start = new Date(Math.ceil(nowAt.getTime() / 60000) * 60000);
  let end = new Date(fromInstant.getTime() + days * 86400000);
  if (end - start < 86400000) end = new Date(start.getTime() + 86400000);
  if (end - start > 32 * 86400000) end = new Date(start.getTime() + 32 * 86400000);
  return { start_at: start.toISOString(), end_at: end.toISOString() };
}

function searchAvailability(s, fetchImpl, variation, range) {
  return square(s, fetchImpl, "POST", "/v2/bookings/availability/search", {
    query: { filter: { start_at_range: range, location_id: s.location, segment_filters: [{ service_variation_id: variation }] } },
  });
}

/* ───────── GET /api/lunera/config ───────── */

function handleConfig(env) {
  const s = settings(env);
  return json({
    live: !!s.token,
    booking: !!(s.token && s.appId),
    requests: !!(s.requestsTo && s.resend),
    appId: s.token && s.appId ? s.appId : null,
    locationId: s.location,
    sdk: SDK,
  }, 200, 30);
}

/* ───────── GET /api/lunera/availability ───────── */

async function handleAvailability(request, env, ctx, fetchImpl, now) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
  const url = new URL(request.url);
  const variation = String(url.searchParams.get("variation") || "");
  if (!SERVICES[variation]) return json({ live: false, error: "Unknown service" }, 400);
  const from = String(url.searchParams.get("from") || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) return json({ live: false, error: "from must be YYYY-MM-DD" }, 400);
  const days = Math.min(31, Math.max(1, parseInt(url.searchParams.get("days") || "31", 10) || 31));

  const s = settings(env);
  if (!s.token) return json({ live: false, reason: "not-connected" }, 503);

  const cache = typeof caches !== "undefined" ? caches.default : null;
  const key = new Request(`https://lunera-availability.cache/${variation}/${from}/${days}`);
  if (cache) {
    const hit = await cache.match(key);
    if (hit) return hit;
  }

  const r = await searchAvailability(s, fetchImpl, variation, windowFor(startOfDay(from), days, now()));
  if (!r.ok) return json({ live: false, reason: r.status ? "square-error" : "square-unreachable", status: r.status }, 502);

  const slots = (r.data.availabilities || [])
    .map((a) => a && a.start_at)
    .filter((t) => typeof t === "string" && !Number.isNaN(Date.parse(t)))
    .map((t) => new Date(t).toISOString().replace(".000Z", "Z"))
    .sort();

  const out = json({ live: true, tz: TZ, from, days, slots }, 200, CACHE_SECONDS);
  if (cache && ctx && ctx.waitUntil) ctx.waitUntil(cache.put(key, out.clone()));
  return out;
}

/* ───────── POST helpers ───────── */

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;                         // same-origin fetches may omit it
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}

function readPerson(b) {
  const name = clean(b.name, 120);
  const parts = name.split(/\s+/);
  return {
    name,
    given: parts[0] || name,
    family: parts.slice(1).join(" "),
    email: clean(b.email, 160).toLowerCase(),
    phone: clean(b.phone, 40),
    line1: clean(b.address, 160),
    city: clean(b.city, 80),
    postal: clean(b.postal, 12).toUpperCase(),
    area: clean(b.area, 80),
    notes: cleanBlock(b.notes, 1200),
  };
}

function missing(p) {
  const out = [];
  if (!p.name) out.push("your name");
  if (!EMAIL.test(p.email)) out.push("a valid email");
  if (p.phone.replace(/\D/g, "").length < 10) out.push("a phone number");
  if (!p.line1) out.push("your street address");
  if (!p.city) out.push("your town or city");
  return out;
}

/* +1 and ten digits, or nothing: Square refuses the whole customer over a
   phone number it can't parse, and a booking matters more than a field. */
function e164(phone) {
  const d = phone.replace(/\D/g, "");
  if (d.length === 10) return "+1" + d;
  if (d.length === 11 && d[0] === "1") return "+" + d;
  return "";
}

function squareAddress(p) {
  const a = { address_line_1: p.line1, locality: p.city, administrative_district_level_1: "AB", country: "CA" };
  if (p.postal) a.postal_code = p.postal;
  return a;
}

function cardMessage(errors) {
  const code = (errors[0] && errors[0].code) || "";
  const map = {
    CARD_DECLINED: "Your card was declined. Please try another card.",
    CVV_FAILURE: "The security code (CVV) didn't match. Please check it and try again.",
    ADDRESS_VERIFICATION_FAILURE: "The postal code didn't match your card. Please check it and try again.",
    INVALID_EXPIRATION: "The card's expiry date isn't valid.",
    INSUFFICIENT_FUNDS: "The card was declined for insufficient funds. Please try another card.",
    CARD_EXPIRED: "That card has expired. Please try another card.",
    VERIFY_CVV_FAILURE: "The security code (CVV) didn't match. Please check it and try again.",
    VERIFY_AVS_FAILURE: "The postal code didn't match your card. Please check it and try again.",
    GENERIC_DECLINE: "Your card was declined. Please try another card.",
  };
  return map[code] || "Your card couldn't be charged. Please check the details or try another card.";
}

/* ───────── POST /api/lunera/book ─────────
   1. the time is still free (asked again — the page may be minutes old)
   2. find or create her customer
   3. HOLD the 20% deposit on the card (not taken yet)
   4. create the booking in her calendar
   5. take the deposit — or, if the booking failed, release it
   So a customer is never charged for a booking that didn't happen. */

async function handleBook(request, env, fetchImpl, now) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!sameOrigin(request)) return json({ error: "Forbidden" }, 403);
  const s = settings(env);
  if (!s.token || !s.appId) return json({ ok: false, reason: "not-connected" }, 503);

  let b;
  try { b = await request.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  if (b.botcheck) return json({ ok: true });

  const variation = clean(b.variation, 40);
  const svc = SERVICES[variation];
  if (!svc) return json({ error: "Please choose an experience." }, 400);
  const startAt = clean(b.start_at, 40);
  const startMs = Date.parse(startAt);
  if (!startAt || Number.isNaN(startMs) || startMs < now().getTime()) return json({ error: "Please choose a time." }, 400);
  const card = clean(b.card_token, 400);
  if (!card) return json({ error: "Please add your card for the deposit." }, 400);
  if (b.consent !== true) return json({ error: "Please agree to the booking policies." }, 400);
  const p = readPerson(b);
  const need = missing(p);
  if (need.length) return json({ error: "Please add " + need.join(", ") + "." }, 400);

  const idem = clean(b.idem, 60).replace(/[^\w-]/g, "") || crypto.randomUUID();

  // 1 — still free?
  const from = new Date(startMs - 60000);
  const avail = await searchAvailability(s, fetchImpl, variation, windowFor(from, 1, now()));
  if (!avail.ok) return json({ error: "We couldn't reach the booking calendar. Please try again in a moment." }, 502);
  const slot = (avail.data.availabilities || []).find((a) => a && Date.parse(a.start_at) === startMs);
  const seg = slot && slot.appointment_segments && slot.appointment_segments[0];
  if (!seg || !seg.team_member_id) {
    return json({ ok: false, reason: "taken", error: "Sorry — that time was just taken. Please choose another." }, 409);
  }

  // price from her live catalogue (fallback: the table above)
  let cents = svc.cents;
  const cat = await square(s, fetchImpl, "GET", `/v2/catalog/object/${variation}`);
  const live = cat.ok && cat.data.object && cat.data.object.item_variation_data &&
               cat.data.object.item_variation_data.price_money && cat.data.object.item_variation_data.price_money.amount;
  if (Number.isInteger(live) && live > 0) cents = live;
  const deposit = Math.round(cents * DEPOSIT);

  // 2 — customer
  let customerId = "";
  const found = await square(s, fetchImpl, "POST", "/v2/customers/search", {
    limit: 1, query: { filter: { email_address: { exact: p.email } } },
  });
  if (found.ok && found.data.customers && found.data.customers[0]) customerId = found.data.customers[0].id;
  if (!customerId) {
    const cust = {
      idempotency_key: idem + "-c",
      given_name: p.given, family_name: p.family || undefined,
      email_address: p.email, address: squareAddress(p), note: "Booked on the Lunera Ora website",
    };
    const phone = e164(p.phone);
    if (phone) cust.phone_number = phone;
    let made = await square(s, fetchImpl, "POST", "/v2/customers", cust);
    if (!made.ok && cust.phone_number) { delete cust.phone_number; cust.idempotency_key = idem + "-c2"; made = await square(s, fetchImpl, "POST", "/v2/customers", cust); }
    if (!made.ok || !made.data.customer) return json({ error: "We couldn't save your details. Please try again, or text Ysabel." }, 502);
    customerId = made.data.customer.id;
  }

  // 3 — hold the deposit
  const when = wallTime(startAt);
  const pay = {
    idempotency_key: idem + "-p",
    source_id: card,
    amount_money: { amount: deposit, currency: "CAD" },
    autocomplete: false,
    location_id: s.location,
    customer_id: customerId,
    buyer_email_address: p.email,
    note: `20% deposit · ${svc.name} · ${when}`.slice(0, 500),
  };
  const vtok = clean(b.verification_token, 400);
  if (vtok) pay.verification_token = vtok;
  const held = await square(s, fetchImpl, "POST", "/v2/payments", pay);
  if (!held.ok || !held.data.payment) return json({ ok: false, reason: "card", error: cardMessage(held.errors) }, 402);
  const paymentId = held.data.payment.id;
  const release = () => square(s, fetchImpl, "POST", `/v2/payments/${paymentId}/cancel`, {});

  // 4 — the booking, at her client's address
  const note = [
    p.notes,
    p.area ? `Area: ${p.area}` : "",
    `Deposit paid online: $${(deposit / 100).toFixed(2)} (Square payment ${paymentId})`,
    "Booked on the Lunera Ora website",
  ].filter(Boolean).join("\n").slice(0, 4000);
  const booking = {
    start_at: new Date(startMs).toISOString(),
    location_id: s.location,
    customer_id: customerId,
    customer_note: note,
    location_type: "CUSTOMER_LOCATION",
    address: squareAddress(p),
    appointment_segments: [{
      duration_minutes: seg.duration_minutes,
      service_variation_id: variation,
      team_member_id: seg.team_member_id,
      service_variation_version: seg.service_variation_version,
    }],
  };
  let made = await square(s, fetchImpl, "POST", "/v2/bookings", { idempotency_key: idem + "-b", booking });
  if (!made.ok && made.status === 400) {
    // A location not set up for visits refuses CUSTOMER_LOCATION — keep the
    // address in the note and book it anyway.
    delete booking.location_type; delete booking.address;
    booking.customer_note = (`Address: ${p.line1}, ${p.city}${p.postal ? " " + p.postal : ""}\n` + note).slice(0, 4000);
    made = await square(s, fetchImpl, "POST", "/v2/bookings", { idempotency_key: idem + "-b2", booking });
  }
  if (!made.ok || !made.data.booking) {
    await release();
    const code = (made.errors[0] && made.errors[0].code) || "";
    if (made.status === 403 || code === "FORBIDDEN" || code === "INSUFFICIENT_SCOPES") {
      return json({ ok: false, reason: "not-allowed", error: "Online booking isn't switched on in Ysabel's Square yet. Nothing was charged — please text her to book." }, 503);
    }
    if (made.status === 409 || code === "CONFLICT" || /unavailable|not available|conflict/i.test(JSON.stringify(made.errors))) {
      return json({ ok: false, reason: "taken", error: "Sorry — that time was just taken. Nothing was charged; please choose another." }, 409);
    }
    return json({ ok: false, reason: "booking", error: "We couldn't complete the booking. Nothing was charged — please try again or text Ysabel." }, 502);
  }

  // 5 — take the deposit
  let captured = await square(s, fetchImpl, "POST", `/v2/payments/${paymentId}/complete`, {});
  if (!captured.ok) captured = await square(s, fetchImpl, "POST", `/v2/payments/${paymentId}/complete`, {});

  return json({
    ok: true,
    booking: { id: made.data.booking.id, start_at: made.data.booking.start_at || booking.start_at, status: made.data.booking.status },
    service: svc.name,
    deposit_cents: deposit,
    deposit_taken: !!captured.ok,
  });
}

/* ───────── POST /api/lunera/request ─────────
   Before Square is connected: the same form, sent to her as an email she can
   reply to. Off unless LUNERA_REQUESTS_TO is set. */

async function handleRequest(request, env, fetchImpl) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!sameOrigin(request)) return json({ error: "Forbidden" }, 403);
  const s = settings(env);
  if (!s.requestsTo || !s.resend) return json({ ok: false, sent: false, reason: "not-configured" }, 503);

  let b;
  try { b = await request.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  if (b.botcheck) return json({ ok: true, sent: true });
  const p = readPerson(b);
  const need = missing(p);
  if (need.length) return json({ error: "Please add " + need.join(", ") + "." }, 400);
  const service = clean(b.service, 80), day = clean(b.day, 60), time = clean(b.time, 40);
  if (!service || !day) return json({ error: "Please choose an experience and a day." }, 400);

  const rows = [
    ["Experience", service], ["Day", day], ["Preferred time", time || "Any"],
    ["Name", p.name], ["Email", p.email], ["Phone", p.phone],
    ["Address", `${p.line1}, ${p.city}${p.postal ? " " + p.postal : ""}`], ["Area", p.area], ["Notes", p.notes],
  ].filter((r) => r[1]);
  const text = "New booking request from the Lunera Ora website\n\n" + rows.map((r) => `${r[0]}: ${r[1]}`).join("\n");
  const html = `<div style="font-family:Arial,sans-serif;color:#3b2d26"><h2 style="font-weight:500">New booking request ✨</h2><table cellpadding="6" style="border-collapse:collapse">` +
    rows.map((r) => `<tr><td style="color:#76625a">${esc(r[0])}</td><td><b>${esc(r[1]).replace(/\n/g, "<br>")}</b></td></tr>`).join("") +
    `</table><p style="color:#76625a">Reply to this email to answer ${esc(p.given)} directly. Confirm the time in Square, then send the 20% deposit request.</p></div>`;

  let res;
  try {
    res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: "Bearer " + s.resend, "content-type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [s.requestsTo], reply_to: p.email, subject: `Booking request — ${service} · ${day}${time ? " " + time : ""} · ${p.name}`, html, text }),
    });
  } catch { res = null; }
  if (!res || !res.ok) return json({ ok: false, sent: false, reason: "email-failed" }, 502);
  return json({ ok: true, sent: true });
}

/* ───────── dispatch ───────── */

export async function handleLunera(request, env, ctx, { fetchImpl = fetch, now = () => new Date() } = {}) {
  const p = new URL(request.url).pathname;
  if (p === "/api/lunera/config") return request.method === "GET" ? handleConfig(env) : json({ error: "Method not allowed" }, 405);
  if (p === "/api/lunera/availability") return handleAvailability(request, env, ctx, fetchImpl, now);
  if (p === "/api/lunera/book") return handleBook(request, env, fetchImpl, now);
  if (p === "/api/lunera/request") return handleRequest(request, env, fetchImpl);
  return json({ error: "Not found" }, 404);
}

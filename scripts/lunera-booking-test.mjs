/* Lunera Ora — tests for worker/lunera/booking.js with a mocked Square.
   Run: node scripts/lunera-booking-test.mjs   (no network, no token needed) */
import { handleLunera, isLuneraPath, startOfDay } from "../worker/lunera/booking.js";

let fail = 0;
const ok = (c, m) => { console.log((c ? "ok  : " : "FAIL: ") + m); if (!c) fail++; };
const now = () => new Date("2026-10-02T17:00:00Z");
const ctx = { waitUntil() {} };
const ENV = { LUNERA_SQUARE_TOKEN: "secret-token", LUNERA_SQUARE_APP_ID: "sq0idp-test" };
const AURA = "B2PUH46HJKJI7QHS7RTG2Z2D";
const SLOT = "2026-10-04T15:00:00Z";
const get = (path) => new Request("https://billydigitals.com" + path);
const post = (path, body, headers = {}) => new Request("https://billydigitals.com" + path, {
  method: "POST", headers: { "content-type": "application/json", origin: "https://billydigitals.com", ...headers }, body: JSON.stringify(body) });
const run = (req, env = ENV, fetchImpl) => handleLunera(req, env, ctx, { now, fetchImpl });

/* A fake Square that records every call. `fail` names a step that should fail. */
function fakeSquare(opts = {}) {
  const calls = [];
  const res = (status, body) => new Response(JSON.stringify(body), { status });
  const impl = async (url, init = {}) => {
    const path = url.replace("https://connect.squareup.com", "");
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ path, method: init.method, body, auth: init.headers && init.headers.Authorization });
    if (path === "/v2/bookings/availability/search") {
      if (opts.fail === "availability") return res(500, { errors: [{ code: "INTERNAL" }] });
      const slots = opts.taken ? [] : [{ start_at: SLOT, appointment_segments: [{ duration_minutes: 60, team_member_id: "TM1", service_variation_id: AURA, service_variation_version: 7 }] }];
      return res(200, { availabilities: slots.concat([{ start_at: "2026-10-04T16:00:00Z", appointment_segments: [{ team_member_id: "TM1" }] }]) });
    }
    if (path.startsWith("/v2/catalog/object/")) return res(200, { object: { item_variation_data: { price_money: { amount: opts.price || 11900, currency: "CAD" } } } });
    if (path === "/v2/customers/search") return res(200, opts.existing ? { customers: [{ id: "CUST-OLD" }] } : {});
    if (path === "/v2/customers") {
      if (opts.fail === "phone" && body.phone_number) return res(400, { errors: [{ code: "INVALID_PHONE_NUMBER" }] });
      return res(200, { customer: { id: "CUST-NEW" } });
    }
    if (path === "/v2/payments") return opts.fail === "card" ? res(400, { errors: [{ code: "CARD_DECLINED" }] }) : res(200, { payment: { id: "PAY1", status: "APPROVED" } });
    if (path === "/v2/bookings") {
      if (opts.fail === "booking-plan") return res(403, { errors: [{ code: "FORBIDDEN", detail: "Appointments Plus required" }] });
      if (opts.fail === "booking-taken") return res(409, { errors: [{ code: "CONFLICT" }] });
      if (opts.fail === "location-type" && body.booking.location_type) return res(400, { errors: [{ code: "INVALID_VALUE", field: "location_type" }] });
      return res(200, { booking: { id: "BK1", status: "ACCEPTED", start_at: body.booking.start_at } });
    }
    if (/\/v2\/payments\/PAY1\/(complete|cancel)/.test(path)) return res(200, { payment: { id: "PAY1" } });
    if (url === "https://api.resend.com/emails") return opts.fail === "email" ? res(500, {}) : res(200, { id: "em1" });
    return res(404, {});
  };
  return { impl, calls, paths: () => calls.map((c) => c.method + " " + c.path) };
}

const person = { name: "Jamie Lee", email: "Jamie@Example.com", phone: "(780) 555-0101", address: "12 Elm St", city: "Beaumont", postal: "t4x 1a1", area: "Beaumont", notes: "Side door please" };
const booking = (extra = {}) => ({ variation: AURA, start_at: SLOT, card_token: "cnon:card", consent: true, idem: "abc123", ...person, ...extra });

/* ── paths and time ── */
ok(["/api/lunera/config", "/api/lunera/availability", "/api/lunera/book", "/api/lunera/request"].every(isLuneraPath) && !isLuneraPath("/api/lunera/x"), "paths");
ok(startOfDay("2026-10-04").toISOString() === "2026-10-04T06:00:00.000Z", "Edmonton midnight, summer (MDT)");
ok(startOfDay("2026-12-04").toISOString() === "2026-12-04T07:00:00.000Z", "Edmonton midnight, winter (MST)");
ok(startOfDay("2026-11-01").toISOString() === "2026-11-01T06:00:00.000Z", "fall-back day starts at MDT midnight");
ok(startOfDay("2027-03-14").toISOString() === "2027-03-14T07:00:00.000Z", "spring-forward day starts at MST midnight");

/* ── config ── */
let j = await (await run(get("/api/lunera/config"), {})).json();
ok(j.live === false && j.booking === false && j.appId === null, "config without settings: not connected");
j = await (await run(get("/api/lunera/config"))).json();
ok(j.live && j.booking && j.appId === "sq0idp-test" && j.locationId === "L8EH27QVVN1GN" && !JSON.stringify(j).includes("secret-token"), "config with settings: booking on, token never exposed");

/* ── availability ── */
let r = await run(get(`/api/lunera/availability?variation=${AURA}&from=2026-10-02`), {});
ok(r.status === 503, "availability without token → 503");
ok((await run(get("/api/lunera/availability?variation=NOPE&from=2026-10-02"))).status === 400, "unknown service refused");
let sq = fakeSquare();
j = await (await run(get(`/api/lunera/availability?variation=${AURA}&from=2026-10-02&days=31`), ENV, sq.impl)).json();
ok(j.live && j.slots.join() === "2026-10-04T15:00:00Z,2026-10-04T16:00:00Z", "availability returns her free times");
const f = sq.calls[0].body.query.filter;
ok(sq.calls[0].auth === "Bearer secret-token" && f.location_id === "L8EH27QVVN1GN" && f.start_at_range.start_at === "2026-10-02T17:00:00.000Z", "official API, her location, window starts now");

/* ── booking: the happy path, in order ── */
sq = fakeSquare();
r = await run(post("/api/lunera/book", booking()), ENV, sq.impl);
j = await r.json();
ok(r.status === 200 && j.ok && j.booking.id === "BK1" && j.deposit_cents === 2380 && j.deposit_taken, "books and takes the $23.80 deposit");
ok(sq.paths().join(" | ") === [
  "POST /v2/bookings/availability/search", "GET /v2/catalog/object/" + AURA, "POST /v2/customers/search",
  "POST /v2/customers", "POST /v2/payments", "POST /v2/bookings", "POST /v2/payments/PAY1/complete"].join(" | "),
  "order: check → price → customer → hold → book → take");
const pay = sq.calls.find((c) => c.path === "/v2/payments").body;
ok(pay.autocomplete === false && pay.amount_money.amount === 2380 && pay.amount_money.currency === "CAD" && pay.customer_id === "CUST-NEW", "deposit is held (not taken) first, in CAD, on her customer");
const cust = sq.calls.find((c) => c.path === "/v2/customers").body;
ok(cust.email_address === "jamie@example.com" && cust.phone_number === "+17805550101" && cust.given_name === "Jamie" && cust.family_name === "Lee", "customer saved with a clean email and phone");
const bk = sq.calls.find((c) => c.path === "/v2/bookings").body.booking;
ok(bk.start_at === "2026-10-04T15:00:00.000Z" && bk.appointment_segments[0].team_member_id === "TM1" && bk.appointment_segments[0].service_variation_version === 7, "booking uses the free slot's team member and version");
ok(bk.location_type === "CUSTOMER_LOCATION" && bk.address.address_line_1 === "12 Elm St" && bk.address.postal_code === "T4X 1A1", "booked at the client's address");
ok(/Deposit paid online: \$23\.80/.test(bk.customer_note) && /Side door/.test(bk.customer_note), "note carries the deposit and her client's notes");

/* ── price comes from her live catalogue ── */
sq = fakeSquare({ price: 15000 });
j = await (await run(post("/api/lunera/book", booking()), ENV, sq.impl)).json();
ok(j.deposit_cents === 3000, "deposit follows her Square price ($150 → $30)");

/* ── existing customer is reused ── */
sq = fakeSquare({ existing: true });
await run(post("/api/lunera/book", booking()), ENV, sq.impl);
ok(!sq.paths().includes("POST /v2/customers") && sq.calls.find((c) => c.path === "/v2/payments").body.customer_id === "CUST-OLD", "returning customer found by email, not duplicated");

/* ── a phone number Square won't take doesn't lose the booking ── */
sq = fakeSquare({ fail: "phone" });
j = await (await run(post("/api/lunera/book", booking()), ENV, sq.impl)).json();
ok(j.ok && sq.calls.filter((c) => c.path === "/v2/customers").length === 2, "retries the customer without the phone");

/* ── failures: nobody is charged for a booking that didn't happen ── */
sq = fakeSquare({ taken: true });
r = await run(post("/api/lunera/book", booking()), ENV, sq.impl);
ok(r.status === 409 && !sq.paths().some((p) => p.includes("payments")), "time gone → 409, card never touched");

sq = fakeSquare({ fail: "card" });
r = await run(post("/api/lunera/book", booking()), ENV, sq.impl); j = await r.json();
ok(r.status === 402 && /declined/.test(j.error) && !sq.paths().includes("POST /v2/bookings"), "card declined → clear message, no booking");

for (const [fail, status] of [["booking-plan", 503], ["booking-taken", 409]]) {
  sq = fakeSquare({ fail });
  r = await run(post("/api/lunera/book", booking()), ENV, sq.impl); j = await r.json();
  ok(r.status === status && sq.paths().includes("POST /v2/payments/PAY1/cancel") && !sq.paths().includes("POST /v2/payments/PAY1/complete") && /Nothing was charged/.test(j.error),
    `booking refused (${fail}) → deposit released, ${status}`);
}

sq = fakeSquare({ fail: "location-type" });
j = await (await run(post("/api/lunera/book", booking()), ENV, sq.impl)).json();
const second = sq.calls.filter((c) => c.path === "/v2/bookings")[1];
ok(j.ok && second && !second.body.booking.location_type && /Address: 12 Elm St/.test(second.body.booking.customer_note), "location not set up for visits → booked with the address in the note");

/* ── validation ── */
const bad = async (b, env = ENV, headers) => (await run(post("/api/lunera/book", b, headers), env, fakeSquare().impl)).status;
ok(await bad(booking(), {}) === 503, "not connected → 503");
ok(await bad(booking({ variation: "NOPE" })) === 400, "unknown service → 400");
ok(await bad(booking({ start_at: "2026-10-01T15:00:00Z" })) === 400, "time in the past → 400");
ok(await bad(booking({ card_token: "" })) === 400, "no card → 400");
ok(await bad(booking({ consent: false })) === 400, "policies not agreed → 400");
ok(await bad(booking({ email: "nope" })) === 400, "bad email → 400");
ok(await bad(booking({ address: "" })) === 400, "no address → 400");
ok(await bad(booking(), ENV, { origin: "https://evil.example" }) === 403, "another site can't post → 403");
ok((await run(get("/api/lunera/book"))).status === 405, "GET /book → 405");

/* ── requests (before Square is connected) ── */
const reqBody = { service: "The Aura", day: "Sun, Oct 4", time: "10:00 a.m.", ...person };
r = await run(post("/api/lunera/request", reqBody), {}, fakeSquare().impl);
ok(r.status === 503 && (await r.json()).sent === false, "requests off unless LUNERA_REQUESTS_TO is set");
sq = fakeSquare();
r = await run(post("/api/lunera/request", reqBody), { RESEND_API_KEY: "re_x", LUNERA_REQUESTS_TO: "lunera.mobilestudio@gmail.com" }, sq.impl);
const mail = sq.calls.find((c) => c.path === "https://api.resend.com/emails");
ok(r.status === 200 && mail && mail.body.to[0] === "lunera.mobilestudio@gmail.com" && mail.body.reply_to === "jamie@example.com" && /The Aura/.test(mail.body.subject), "request emailed to her, reply goes to the client");
ok(!/<script/i.test(mail.body.html) && (await (await run(post("/api/lunera/request", { ...reqBody, notes: "<script>x</script>" }), { RESEND_API_KEY: "re_x", LUNERA_REQUESTS_TO: "a@b.co" }, sq.impl)).json()).sent, "request notes are escaped in the email");
const lastMail = sq.calls.filter((c) => c.path === "https://api.resend.com/emails").pop();
ok(!lastMail.body.html.includes("<script>") && lastMail.body.html.includes("&lt;script&gt;"), "…and stored escaped");

process.exit(fail ? 1 : 0);

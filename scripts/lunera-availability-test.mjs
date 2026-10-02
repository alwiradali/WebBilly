/* Lunera Ora — tests for worker/lunera/availability.js with a mocked Square.
   Run: node scripts/lunera-availability-test.mjs  (no network, no token needed) */
import { handleLunera, isLuneraPath, startOfDay } from "../worker/lunera/availability.js";
let fail = 0; const ok = (c, m) => { console.log((c ? "ok  : " : "FAIL: ") + m); if (!c) fail++; };
const req = (q, method = "GET") => new Request("https://billydigitals.com/api/lunera/availability?" + q, { method });
const now = () => new Date("2026-10-02T17:00:00Z");
const ctx = { waitUntil() {} };

ok(isLuneraPath("/api/lunera/availability") && !isLuneraPath("/api/lunera/other"), "path match");
ok(startOfDay("2026-10-04").toISOString() === "2026-10-04T06:00:00.000Z", "Edmonton midnight in summer (MDT) = 06:00Z");
ok(startOfDay("2026-12-04").toISOString() === "2026-12-04T07:00:00.000Z", "Edmonton midnight in winter (MST) = 07:00Z");
ok(startOfDay("2027-03-14").toISOString() === "2027-03-14T07:00:00.000Z", "spring-forward day starts at MST midnight");
ok(startOfDay("2026-11-01").toISOString() === "2026-11-01T06:00:00.000Z", "DST change day starts at MDT midnight");

let r = await handleLunera(req("variation=TF2UNCPOH3I4OZFO7HKX3NY7&from=2026-10-02"), {}, ctx, { now });
ok(r.status === 503 && (await r.json()).live === false, "no token → 503 live:false");
r = await handleLunera(req("variation=NOPE&from=2026-10-02"), { LUNERA_SQUARE_TOKEN: "t" }, ctx, { now });
ok(r.status === 400, "unknown service refused");
r = await handleLunera(req("variation=TF2UNCPOH3I4OZFO7HKX3NY7&from=bad"), { LUNERA_SQUARE_TOKEN: "t" }, ctx, { now });
ok(r.status === 400, "bad date refused");
r = await handleLunera(req("variation=TF2UNCPOH3I4OZFO7HKX3NY7&from=2026-10-02", "POST"), { LUNERA_SQUARE_TOKEN: "t" }, ctx, { now });
ok(r.status === 405, "POST refused");

let sent;
const fakeFetch = async (u, init) => { sent = { u, init, body: JSON.parse(init.body) }; return new Response(JSON.stringify({ availabilities: [
  { start_at: "2026-10-04T15:00:00Z" }, { start_at: "2026-10-03T21:00:00.000Z" }, { bogus: 1 } ] }), { status: 200 }); };
r = await handleLunera(req("variation=TF2UNCPOH3I4OZFO7HKX3NY7&from=2026-10-02&days=31"), { LUNERA_SQUARE_TOKEN: "secret-token" }, ctx, { now, fetchImpl: fakeFetch });
const j = await r.json();
ok(r.status === 200 && j.live === true, "token → live:true");
ok(JSON.stringify(j.slots) === JSON.stringify(["2026-10-03T21:00:00Z", "2026-10-04T15:00:00Z"]), "slots cleaned and sorted: " + JSON.stringify(j.slots));
ok(sent.u === "https://connect.squareup.com/v2/bookings/availability/search", "calls the official Bookings API");
ok(sent.init.headers.Authorization === "Bearer secret-token" && sent.init.headers["Square-Version"], "token + Square-Version sent");
const f = sent.body.query.filter;
ok(f.location_id === "L8EH27QVVN1GN" && f.segment_filters[0].service_variation_id === "TF2UNCPOH3I4OZFO7HKX3NY7", "her location and service");
ok(f.start_at_range.start_at === "2026-10-02T17:00:00.000Z", "window starts now when 'from' is today (" + f.start_at_range.start_at + ")");
const span = (Date.parse(f.start_at_range.end_at) - Date.parse(f.start_at_range.start_at)) / 86400000;
ok(span >= 1 && span <= 32, "window between 1 and 32 days (" + span.toFixed(2) + ")");
ok(!JSON.stringify(j).includes("secret-token"), "token never in the response");
r = await handleLunera(req("variation=TF2UNCPOH3I4OZFO7HKX3NY7&from=2026-10-02"), { LUNERA_SQUARE_TOKEN: "t" }, ctx, { now, fetchImpl: async () => new Response("{}", { status: 401 }) });
ok(r.status === 502 && (await r.json()).live === false, "Square error → 502 live:false");
r = await handleLunera(req("variation=TF2UNCPOH3I4OZFO7HKX3NY7&from=2026-09-01&days=1"), { LUNERA_SQUARE_TOKEN: "t" }, ctx, { now, fetchImpl: fakeFetch });
const f2 = sent.body.query.filter.start_at_range; const span2 = (Date.parse(f2.end_at) - Date.parse(f2.start_at)) / 3600000;
ok(span2 >= 24, "past 'from' still gives Square a ≥24 h window (" + span2 + " h)");
process.exit(fail ? 1 : 0);

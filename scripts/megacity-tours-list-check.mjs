#!/usr/bin/env node
/* The 360 section: one permanent address per property.
 *
 * The address is the whole point of that screen. Walid pastes it into the
 * Virtual Tour box in 10ninety, once, and it has to keep working — before the
 * tour exists, while it is a draft, after a re-shoot, and after the panoramas
 * are replaced. A wrong origin here would put a dead link in his portal and
 * nobody would find out until a tenant clicked it.
 *
 *   node scripts/megacity-tours-list-check.mjs
 */
import { list } from "../worker/studio/tours.js";

let bad = 0;
const ok = (c, what) => { console.log((c ? "ok   " : "FAIL ") + what); if (!c) bad++; };

/* Three properties: one live tour, one still a draft, one never started. */
const ROWS = [
  { id: "carlton-road-5", ref: "RL0060", title: "Carlton Road, Salford", source: "tenninety", area: "salford", town: "Salford",
    status: "live", hidden: 0, deleted_at: null, tour_status: "live", room_count: 7, tour_updated_at: "2026-09-20T10:00:00Z", live_at: "2026-09-20T11:00:00Z", panos: 7 },
  { id: "drayton-street", ref: "RL0089", title: "Drayton Street, Manchester", source: "tenninety", area: "manchester", town: "Manchester",
    status: "live", hidden: 0, deleted_at: null, tour_status: "draft", room_count: 2, tour_updated_at: "2026-09-22T09:00:00Z", live_at: null, panos: 2 },
  { id: "grove-house", ref: "RL0093", title: "Grove House, Manchester", source: "tenninety", area: "manchester", town: "Manchester",
    status: "live", hidden: 1, deleted_at: null, tour_status: null, room_count: null, tour_updated_at: null, live_at: null, panos: 0 },
];

function ctx(host, rows = ROWS) {
  let sql = "";
  return {
    env: { MEGACITY_HOST: "www.megacityproperties.co.uk,megacityproperties.co.uk" },
    url: new URL("https://" + host + "/api/studio/tours"),
    db: { prepare: (s) => { sql = s; return { all: async () => ({ results: rows }) }; } },
    seenSql: () => sql,
  };
}
const run = async (c) => (await list(c)).json();

/* ── the address ──────────────────────────────────────────────────────────── */

const live = await run(ctx("www.megacityproperties.co.uk"));
const byId = (id) => live.items.find((i) => i.id === id);

ok(byId("carlton-road-5").publicUrl === "https://www.megacityproperties.co.uk/tour/carlton-road-5",
  "on his own domain the address is /tour/<id> — short, permanent, his");
ok(live.items.every((i) => /^https:\/\/www\.megacityproperties\.co\.uk\/tour\/[a-z0-9-]+$/.test(i.publicUrl)),
  "every property gets one, whatever state its tour is in");
ok(byId("grove-house").publicUrl === "https://www.megacityproperties.co.uk/tour/grove-house",
  "a property with NO tour still has its address — that is what makes it safe to paste in advance");

/* The Studio is used on billydigitals.com until the nameservers move. If the
   screen guessed the origin from the browser it would hand him a link on the
   agency's domain, and he would paste it into 10ninety. */
const demo = await run(ctx("billydigitals.com"));
ok(demo.items[0].publicUrl.indexOf("/tour/") < 0 && /billy360/.test(demo.items[0].publicUrl),
  "on the demo host the address is the viewer's own, not a /tour/ path that host does not serve");
ok(live.items.every((i) => i.embedOrigin === "https://www.megacityproperties.co.uk"),
  "the embed origin follows the same host, not the browser's");

/* ── what the screen says about each one ──────────────────────────────────── */

ok(byId("grove-house").tour === null,
  "no tour row reads as 'not started', not as an empty draft");
ok(byId("drayton-street").tour.status === "draft" && byId("drayton-street").tour.liveAt === null,
  "a tour that exists but is unpublished is a draft, and says when it was last touched");
ok(byId("carlton-road-5").tour.status === "live" && byId("carlton-road-5").tour.rooms === 7,
  "a live tour reports its room count");
ok(byId("carlton-road-5").panos === 7 && byId("grove-house").panos === 0,
  "the panorama count comes through, so 'no panoramas uploaded' is a fact and not a guess");
ok(byId("grove-house").listingLive === false,
  "a hidden listing is flagged — its tour link works, but nothing on the website points at it");
ok(byId("drayton-street").listingLive === true, "an advertised listing is not flagged");

/* ── the counts on the filter chips ───────────────────────────────────────── */

ok(live.counts.total === 3 && live.counts.live === 1 && live.counts.draft === 1 && live.counts.none === 1,
  `the chips add up (${live.counts.live} live, ${live.counts.draft} draft, ${live.counts.none} not started)`);

/* ── the query ────────────────────────────────────────────────────────────── */

{
  const c = ctx("www.megacityproperties.co.uk");
  await run(c);
  const sql = c.seenSql().replace(/\s+/g, " ");
  ok(/WHERE l\.deleted_at IS NULL/.test(sql), "the Bin is excluded — a deleted property is not offered a tour link");
  ok(/LEFT JOIN tours/.test(sql), "a property with no tour is still listed (LEFT JOIN, not INNER)");
  ok(/kind = 'pano'/.test(sql), "the panorama count counts panoramas, not every photo");
}

/* ── the routes exist ─────────────────────────────────────────────────────── */

{
  const src = await (await import("node:fs/promises")).readFile(new URL("../worker/studio/router.js", import.meta.url), "utf8");
  ok(/\["GET", "\/tours", tours\.list\]/.test(src), "GET /tours is wired up");
  ok(/\["POST", "\/sync\/tenninety", tenninetySync, \{ owner: true \}\]/.test(src), "the Refresh button's endpoint is owner-only");
  ok(/\["GET", "\/sync\/tenninety", tenninetyStatus\]/.test(src), "everyone can see when the properties last came across");
  ok(src.indexOf('["GET", "/tours", tours.list]') < src.indexOf('["GET", "/tours/:id"'), "/tours is matched before /tours/:id");
}

console.log();
console.log(bad ? `360 SECTION: ${bad} FAILED` : "360 SECTION: ALL PASS — one permanent address per property, right on both hosts.");
process.exit(bad ? 1 : 0);

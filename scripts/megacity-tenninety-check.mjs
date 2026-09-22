#!/usr/bin/env node
/* The 10ninety mapper, against the feed 10ninety actually returned.
 *
 * scripts/fixtures/tenninety-sample.json is the real response for Walid's
 * nine properties, saved on 22 September. Every assertion below is about a
 * specific thing in that file that would publish wrongly if mapped straight
 * through, so this is a record of what was found as much as a test.
 *
 *   node scripts/megacity-tenninety-check.mjs
 */
import { readFileSync } from "node:fs";
import { toListings, toListing, _internals } from "../worker/studio/tenninety.js";

const feed = JSON.parse(readFileSync(new URL("./fixtures/tenninety-sample.json", import.meta.url), "utf8"));
const TODAY = "2026-09-22";
const { listings, skipped } = toListings(feed.properties, { today: TODAY });
const by = (ref) => listings.find((l) => l.ref === ref);

let bad = 0;
const ok = (c, what) => { console.log((c ? "ok   " : "FAIL ") + what); if (!c) bad++; };

ok(listings.length === 9 && skipped.length === 0, `all nine properties map, none skipped (${listings.length}/${skipped.length})`);

/* ── the URLs the site already serves ─────────────────────────────────────── */

/* These addresses are in Google, in 10ninety's marketing emails and on
   whatever Walid has sent people. A second URL for the same property would
   retire the first without anyone noticing. */
for (const [ref, slug] of Object.entries(_internals.SLUG_ALIASES)) {
  const row = by(ref);
  if (row) ok(row.id === slug, `${ref} keeps its existing address /let/${slug}`);
}
ok(by("RL0144").id === "83-manchester-road-manchester", "a property with no hand-built page gets one from its address");
ok(new Set(listings.map((l) => l.id)).size === 9, "no two properties share a slug");

/* ── figures that are not figures ─────────────────────────────────────────── */

ok(by("RL0063").deposit === null, "9 Carlton Road's let_bond of 0.0 is not stated, not a £0 deposit");
ok(by("RL0060").deposit === 500, "a real deposit still comes through (£500)");
ok(listings.every((l) => l.epcRating === null), "no EPC rating is invented from the certificate image");
ok(listings.filter((l) => l.epcUrl).length === 9, "but all nine certificates are carried through");
ok(listings.every((l) => l.furnishing === null), "furnishing stays unstated while let_furn_id is unconfirmed");

/* ── the HMO rooms ────────────────────────────────────────────────────────── */

/* Both Carlton Road records arrive as bedrooms 1, bathrooms 3. The 3 is the
   house's. On a room listing it reads as a room with three bathrooms. */
ok(by("RL0060").bathrooms === null && by("RL0063").bathrooms === null, "an HMO room does not claim the house's 3 bathrooms");
ok(by("RL0060").letType === "room" && by("RL0060").type === "room_in_share", "an HMO room is typed as a room in a share");
ok(by("RL0140").bathrooms === 2, "a whole property still reports its bathrooms (2)");

/* ── the studio ───────────────────────────────────────────────────────────── */

ok(by("RL0136").bedrooms === 0 && by("RL0136").type === "studio", "bedrooms 0 is a studio, not a property with no bedrooms");

/* ── which borough ────────────────────────────────────────────────────────── */

/* searchable_areas is a marketing list and carries neighbours: Grove House and
   83 Manchester Road are in Manchester and both list "Salford". */
ok(by("RL0093").area === "manchester", "Grove House is filed under Manchester, its town, not a neighbouring area");
ok(by("RL0144").area === "manchester", "83 Manchester Road likewise");
ok(by("RL0060").area === "salford", "and a Salford property is still Salford");

/* ── availability ─────────────────────────────────────────────────────────── */

ok(by("RL0089").availability === "from_date" && by("RL0089").availableFrom === "2026-10-05", "a future date is stated as a date");
const past = toListing({ ...feed.properties[0], let_date_available: "2026-01-01T00:00:00" }, { today: TODAY });
ok(past.availability === "available_now" && past.availableFrom === null, "a date already passed reads as available now");
const none = toListing({ ...feed.properties[0], let_date_available: null }, { today: TODAY });
ok(none.availability === null, "no date at all stays blank rather than guessing");

/* ── status ───────────────────────────────────────────────────────────────── */

ok(listings.every((l) => l.status === "live"), "all nine are on the market today");
const let7 = toListing({ ...feed.properties[0], status_id: 7 }, { today: TODAY });
ok(let7.status === "let", "status_id 7 is let — the whole reason those statuses were enabled");
ok(toListing({ ...feed.properties[0], status_id: 99 }, { today: TODAY }) === null, "a status we have not been told about is dropped, not guessed");
ok(toListing({ ...feed.properties[0], trans_type_id: 1 }, { today: TODAY }) === null, "a sales record never becomes a letting");

/* ── media ────────────────────────────────────────────────────────────────── */

const shots = listings.reduce((n, l) => n + l.images.length, 0);
ok(shots === 107, `all 107 photographs come through (${shots})`);
ok(listings.every((l) => l.images.every((i) => /^https:\/\//.test(i.url))), "every image URL is https");
ok(listings.every((l) => l.tourUrl === null), "no property claims a 360 tour, because none has one");

/* ── rent ─────────────────────────────────────────────────────────────────── */

ok(by("RL0144").rentPcm === 1350, "monthly rent comes through as pounds per month");
const weekly = toListing({ ...feed.properties[0], let_rent_frequency: 2 }, { today: TODAY });
ok(weekly.rentPcm === null, "a rent frequency that is not monthly is left unpriced rather than converted on a guess");

console.log();
console.log(bad ? `10NINETY MAPPER: ${bad} FAILED` : "10NINETY MAPPER: ALL PASS — nothing is published that Walid did not supply.");
process.exit(bad ? 1 : 0);

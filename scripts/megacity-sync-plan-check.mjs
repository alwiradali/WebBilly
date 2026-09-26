#!/usr/bin/env node
/* What a sync is allowed to do to a letting agent's live website.
 *
 * Every case here is one where getting it wrong takes properties off a site
 * that should be showing them, or leaves properties up that are gone. The
 * planner is pure, so all of it is testable without a database.
 *
 *   node scripts/megacity-sync-plan-check.mjs
 */
import { readFileSync } from "node:fs";
import { toListings, feedMediaKey } from "../worker/studio/tenninety.js";
import { planSync, describePlan, changedFields, docSigOf, MAX_REMOVAL_FRACTION } from "../worker/studio/tenninety-sync.js";

const feed = JSON.parse(readFileSync(new URL("./fixtures/tenninety-sample.json", import.meta.url), "utf8"));
const { listings: NINE } = toListings(feed.properties, { today: "2026-09-22" });

let bad = 0;
const ok = (c, what) => { console.log((c ? "ok   " : "FAIL ") + what); if (!c) bad++; };
const asRows = (ls) => ls.map((l) => ({ ...l, pinned: 0 }));

/* ── the ordinary path ────────────────────────────────────────────────────── */

let p = planSync([], NINE);
ok(p.create.length === 9 && p.remove.length === 0, "an empty site takes all nine properties");

p = planSync(asRows(NINE), NINE);
ok(p.create.length === 0 && p.update.length === 0 && p.remove.length === 0 && p.unchanged.length === 9,
  "running it twice changes nothing the second time");

const dearer = NINE.map((l) => (l.ref === "RL0089" ? { ...l, rentPcm: 1300 } : l));
p = planSync(asRows(NINE), dearer);
ok(p.update.length === 1 && p.update[0].ref === "RL0089" && p.update[0]._changed.includes("rentPcm"),
  "a rent change updates exactly one property, and says which field");

p = planSync(asRows(NINE), NINE.filter((l) => l.ref !== "RL0089"));
ok(p.remove.length === 1 && p.remove[0].ref === "RL0089",
  "a property that leaves the feed comes off the site");

/* ── the feed is wrong, not the world ─────────────────────────────────────── */

p = planSync(asRows(NINE), [], { feedOk: false });
ok(p.remove.length === 0 && p.create.length === 0 && p.refusedRemoval,
  "a feed that could not be READ changes nothing at all");

p = planSync(asRows(NINE), []);
ok(p.remove.length === 0 && p.refusedRemoval, "an EMPTY feed never empties the website");
ok(/fault rather than/.test(p.reason), "  and it says it is treating that as a fault");

p = planSync(asRows(NINE), NINE.slice(0, 5));
ok(p.remove.length === 0 && p.refusedRemoval,
  "losing four of nine at once is reported, not acted on");
ok(/confirm in 10ninety/.test(p.reason), "  and it says what a person should do");

p = planSync(asRows(NINE), NINE.slice(0, 7));
ok(p.remove.length === 2 && !p.refusedRemoval,
  "losing two of nine is ordinary churn and goes through");

/* The boundary, stated rather than implied: 3 of 9 is exactly a third. */
p = planSync(asRows(NINE), NINE.slice(0, 6));
ok(p.remove.length === 3 && !p.refusedRemoval, "exactly a third is allowed; more than a third is not");

/* ── things a sync does not get a vote on ─────────────────────────────────── */

const pinnedRows = asRows(NINE).map((r) => (r.ref === "RL0142" ? { ...r, pinned: 1 } : r));
p = planSync(pinnedRows, NINE.filter((l) => l.ref !== "RL0142"));
ok(p.remove.length === 0 && p.held.length === 1 && p.held[0].ref === "RL0142",
  "a pinned listing is held, not removed, when it leaves the feed");

/* A pinned listing must not count towards the drop threshold either, or one
   pin could push an ordinary sync over the line and freeze everything. */
const manyPinned = asRows(NINE).map((r, i) => ({ ...r, pinned: i < 4 ? 1 : 0 }));
p = planSync(manyPinned, []);
ok(p.refusedRemoval, "an empty feed is still refused even when most listings are pinned");

/* ── only the fields the sync owns ────────────────────────────────────────── */

const withExtras = asRows(NINE).map((r) => ({ ...r, seoTitle: "hand written", pinned: 0 }));
p = planSync(withExtras, NINE);
ok(p.update.length === 0, "a field the website owns is not treated as a change by the sync");

ok(changedFields({ rentPcm: 1250 }, { rentPcm: 1250 }).length === 0, "same rent is not a change");
ok(changedFields({ rentPcm: null }, { rentPcm: null }).length === 0, "two blanks are not a change");
ok(changedFields({ deposit: 0 }, { deposit: null }).includes("deposit"),
  "zero and blank ARE different — that is the 9 Carlton Road deposit");

/* ── what it tells a person ───────────────────────────────────────────────── */

ok(/Up to date/.test(describePlan(planSync(asRows(NINE), NINE))), "a no-op says it is up to date");
ok(/9 added/.test(describePlan(planSync([], NINE))), "a first run says nine were added");
ok(/Nothing changed/.test(describePlan(planSync(asRows(NINE), [], { feedOk: false }))),
  "a failed read says nothing changed, not 'ok'");

/* ── a new photograph is a change ─────────────────────────────────────────── */

/* Walid adds a picture in 10ninety and exports. Nothing else about the
   property moved — same rent, same description, same everything the columns
   hold. Photographs are not one of those columns, so without a signature this
   counted as unchanged and the picture never reached the website, with nothing
   anywhere to say why. */
{
  const before = { ...NINE[0], photoSig: "a,b,c" };
  const after = { ...NINE[0], photoSig: "a,b,c,d" };
  const f = changedFields(before, after);
  ok(f.includes("photos"), "a property whose only change is a new photograph is seen as changed");

  ok(!changedFields({ ...NINE[0], photoSig: "a,b,c" }, { ...NINE[0], photoSig: "a,b,c" }).length,
    "and the same photographs in the same order are still no change");
  ok(changedFields({ ...NINE[0], photoSig: "a,b,c" }, { ...NINE[0], photoSig: "c,b,a" }).includes("photos"),
    "re-ordering them counts too — the feed decides the order they appear in");
  ok(changedFields({ ...NINE[0], photoSig: "a,b,c" }, { ...NINE[0], photoSig: "" }).includes("photos"),
    "and so does removing the last one");

  /* the whole point of hashing the PATH and not the URL: 10ninety puts a ?at=
     cache-buster on every image address and it moves on every export. If that
     reached the signature, every sync would rewrite every photograph. */
  const p1 = feedMediaKey("carlton-road-5", "https://x.10ninety.co.uk/i/1.jpg?at=111");
  const p2 = feedMediaKey("carlton-road-5", "https://x.10ninety.co.uk/i/1.jpg?at=999");
  ok(p1 === p2, "a re-export that only moves the cache-buster is not a photograph change");

  /* an existing row that predates the signature must not read as a change on
     its own — otherwise the first sync after this shipped would rewrite all
     nine properties and every photograph on them */
  ok(!changedFields({ ...NINE[0] }, { ...NINE[0] }).includes("photos"),
    "a listing with no signature on either side is not treated as changed");
}

/* ── what he uploads besides text and photographs ──────────────────────────
   A new floor plan, EPC, brochure, tour link or a changed feature list used to
   leave a property "unchanged", so it never reached the website. */
{
  const base = { id: "x", features: ["Balcony"], epcUrl: "https://cdn.10ninety.co.uk/epc/1.png?at=1", brochureUrl: null, tourUrl: null, floorplans: [] };
  const was = { id: "x", docSig: docSigOf(base) };
  const same = (r) => changedFields(was, { ...r, docSig: docSigOf(r) });
  ok(!same(base).includes("documents"), "unchanged documents are unchanged");
  ok(same({ ...base, floorplans: ["https://cdn.10ninety.co.uk/fp/1.pdf"] }).includes("documents"), "a new floor plan counts as a change");
  ok(same({ ...base, epcUrl: "https://cdn.10ninety.co.uk/epc/2.png" }).includes("documents"), "a replaced EPC counts as a change");
  ok(same({ ...base, brochureUrl: "https://cdn.10ninety.co.uk/b/1.pdf" }).includes("documents"), "a new brochure counts as a change");
  ok(same({ ...base, features: ["Balcony", "Parking"] }).includes("documents"), "an added key feature counts as a change");
  ok(!same({ ...base, epcUrl: "https://cdn.10ninety.co.uk/epc/1.png?at=2" }).includes("documents"), "10ninety's moving cache-buster alone is not a change");
  ok(changedFields({ id: "x" }, { id: "x" }).length === 0, "rows without the signature compare as before");
}

console.log();
console.log(`(threshold: more than ${Math.round(MAX_REMOVAL_FRACTION * 100)}% of listings disappearing at once stops the sync)`);
console.log(bad ? `SYNC PLAN: ${bad} FAILED` : "SYNC PLAN: ALL PASS — a bad feed cannot empty his website.");
process.exit(bad ? 1 : 0);

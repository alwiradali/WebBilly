#!/usr/bin/env node
/* The sync actually writing — against a stubbed D1 that records every
 * statement, so the SQL is exercised without a database and without touching
 * a client's live one.
 *
 *   node scripts/megacity-sync-write-check.mjs
 */
import { readFileSync } from "node:fs";
import { toListings } from "../worker/studio/tenninety.js";
import { planSync, applyPlan, runSync } from "../worker/studio/tenninety-sync.js";

const feed = JSON.parse(readFileSync(new URL("./fixtures/tenninety-sample.json", import.meta.url), "utf8"));
const { listings: NINE } = toListings(feed.properties, { today: "2026-09-24" });

let bad = 0;
const ok = (c, what) => { console.log((c ? "ok   " : "FAIL ") + what); if (!c) bad++; };

/* A D1 stub: remembers what it was asked to do, and can be told to fail. */
function stubDb(opts = {}) {
  const log = [];
  const mk = (sql) => ({
    sql,
    bind: (...args) => ({
      sql, args,
      run: async () => { log.push({ sql, args }); return { success: true }; },
      all: async () => { log.push({ sql, args }); return { results: opts.rows || [] }; },
      first: async () => { log.push({ sql, args }); return (opts.rows || [])[0] || null; },
    }),
  });
  return {
    log,
    prepare: (sql) => mk(sql),
    batch: async (stmts) => {
      if (opts.failFor && stmts.some((s) => opts.failFor(s))) throw new Error("constraint failed");
      for (const s of stmts) log.push({ sql: s.sql, args: s.args });
      return stmts.map(() => ({ success: true }));
    },
  };
}

/* ── a first run, on an empty site ────────────────────────────────────────── */

{
  const db = stubDb();
  const plan = planSync([], NINE);
  const r = await applyPlan(db, plan, { now: "2026-09-24T10:00:00Z" });
  ok(r.created === 9 && r.updated === 0 && r.removed === 0, `nine properties written (${r.created})`);
  ok(!r.failed.length, "none failed");

  const inserts = db.log.filter((s) => /INSERT INTO listings/.test(s.sql));
  ok(inserts.length === 9, "one listing insert each");
  ok(inserts.every((s) => s.args.includes("tenninety") || /'tenninety'/.test(s.sql)), "every row is marked as coming from the feed");

  const photos = db.log.filter((s) => /INSERT INTO media/.test(s.sql));
  ok(photos.length === 107, `all 107 photographs recorded (${photos.length})`);
  ok(photos.filter((s) => s.args.includes("cover")).length === 9, "one cover each, the rest gallery");
  ok(photos.every((s) => s.args.some((a) => typeof a === "string" && a.startsWith("https://"))), "each photo keeps its real address on 10ninety");
  ok(photos.every((s) => s.args.some((a) => typeof a === "string" && a.endsWith("/feed.jpg"))), "and a key the /media/ route understands");
}

/* ── the photographs are replaced, not merged ─────────────────────────────── */

{
  const db = stubDb();
  await applyPlan(db, planSync([], [NINE[0]]), {});
  const del = db.log.find((s) => /DELETE FROM media/.test(s.sql));
  ok(!!del, "a listing's feed photos are cleared before the new set is written");
  ok(/feed\.jpg/.test(del.sql), "  and only the feed ones — a 360 panorama uploaded here is not touched");
}

/* ── an update leaves the website's own work alone ────────────────────────── */

{
  const db = stubDb();
  const changed = NINE.map((l) => (l.ref === "RL0089" ? { ...l, rentPcm: 1300 } : l));
  const r = await applyPlan(db, planSync(NINE.map((l) => ({ ...l, pinned: 0 })), changed), {});
  ok(r.updated === 1 && r.created === 0, "only the changed property is written");
  const up = db.log.find((s) => /UPDATE listings SET/.test(s.sql));
  ok(!/created_at=/.test(up.sql), "created_at is not overwritten");
  ok(!/published_at=/.test(up.sql), "published_at is not overwritten");
  ok(!/seo_title|pinned|hidden/.test(up.sql), "the website's own fields are not in the statement at all");
  ok(/COALESCE/.test(up.sql), "a cover photo someone chose by hand survives the sync");
}

/* ── leaving the feed ─────────────────────────────────────────────────────── */

{
  const db = stubDb();
  const r = await applyPlan(db, planSync(NINE.map((l) => ({ ...l, pinned: 0 })), NINE.slice(1)), {});
  ok(r.removed === 1, "a property that left the feed is removed from the site");
  const w = db.log.find((s) => /UPDATE listings SET status='withdrawn'/.test(s.sql));
  ok(!!w, "  by being withdrawn");
  ok(!db.log.some((s) => /DELETE FROM listings/.test(s.sql)), "  never deleted — a mistake must be visible and reversible");
  ok(/source='tenninety'/.test(w.sql), "  and only ever a listing the feed owns, never a hand-made one");
}

/* ── one bad property does not stop the rest ──────────────────────────────── */

{
  const db = stubDb({ failFor: (s) => Array.isArray(s.args) && s.args[0] === "grove-house" });
  const r = await applyPlan(db, planSync([], NINE), {});
  ok(r.created === 8 && r.failed.length === 1, `eight written, one recorded as failed (${r.created}/${r.failed.length})`);
  ok(r.failed[0].id === "grove-house", "  and it says which");
}

/* ── the feed being down ──────────────────────────────────────────────────── */

{
  const db = stubDb({ rows: [] });
  const r = await runSync({ TENNINETY_API_KEY: "k" }, db, { fetch: async () => { throw new Error("upstream down"); } });
  ok(r.ok === false && r.feedOk === false, "a feed that cannot be read reports failure");
  ok(r.created === 0 && r.removed === 0, "  and writes nothing at all");
  ok(/could not be read/.test(r.summary), "  and says so in words a person can read");
  ok(!db.log.some((s) => /INSERT|UPDATE|DELETE/.test(s.sql)), "  not one write reached the database");
}

console.log();
console.log(bad ? `SYNC WRITE: ${bad} FAILED` : "SYNC WRITE: ALL PASS");
process.exit(bad ? 1 : 0);

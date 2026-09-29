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

/* ── a property back on the market is written back, not inserted again ─────── */

{
  const db = stubDb({});
  const rows = NINE.map((l) => ({ ...l, pinned: 0, status: l.ref === "RL0089" ? "withdrawn" : l.status }));
  const r = await applyPlan(db, planSync(rows, NINE), {});
  ok(r.updated === 1 && r.created === 0 && !r.failed.length, `the returning property is one update, no insert, no failure (${r.updated}/${r.created}/${r.failed.length})`);
  ok(!db.log.some((s) => /INSERT INTO listings/.test(s.sql)), "  no INSERT INTO listings (its id already exists)");
  const up = db.log.find((s) => /UPDATE listings SET/.test(s.sql) && Array.isArray(s.args) && s.args[0] === "drayton-street");
  ok(!!up && up.args.includes("live"), "  and the update sets it live");
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
  ok(!db.log.some((s) => /INSERT|UPDATE|DELETE/.test(s.sql) && !/INTO settings/.test(s.sql)), "  not one write reached a listing or a photograph");
  ok(db.log.some((s) => /INTO settings/.test(s.sql) && s.args && s.args[0] === "sync_tenninety_last" && /could not be read/.test(String(s.args[1]))),
     "  and the failed read is recorded, so the Studio can say so");
}

/* ── an unchanged feed costs next to nothing (27 Sep: 79% of D1's daily reads) ── */

{
  const settings = new Map(), log = [];
  const db = {
    prepare: (sql) => {
      const exec = (args) => ({
        run: async () => { log.push(sql); if (/INTO settings/.test(sql)) settings.set(args[0], args[1]); return { success: true }; },
        all: async () => { log.push(sql); return { results: [] }; },
        first: async () => { log.push(sql); if (/FROM settings WHERE key/.test(sql)) { const v = settings.get(args[0]); return v ? { value: v } : null; } return null; },
      });
      return { ...exec([]), bind: (...args) => exec(args) };
    },
    batch: async (stmts) => { log.push("batch"); return stmts.map(() => ({ success: true })); },
  };
  const feedOf = (props) => async (url) => /property-types/.test(url) ? { ok: false, text: async () => "" } : { ok: true, json: async () => ({ properties: props, paging: {} }) };
  const same = feedOf(feed.properties);
  const changed = feedOf(feed.properties.map((p, i) => (i === 0 ? { ...p, price: Number(p.price || 0) + 25 } : p)));
  const env = { TENNINETY_API_KEY: "k" };
  const heavy = () => log.filter((s) => /FROM listings|FROM media|^batch$/.test(s)).length;
  const run = async (fetch, now, extra = {}) => { log.length = 0; const r = await runSync(env, db, { fetch, now, today: now.slice(0, 10), ...extra }); return { r, heavy: heavy() }; };

  const a = await run(same, "2026-09-27T10:00:00Z");
  ok(!a.r.quiet && a.heavy > 0, "the first read compares everything");
  const b = await run(same, "2026-09-27T10:01:00Z");
  ok(b.r.quiet && b.heavy === 0, `a minute later, the same feed reads no listing or photograph (${b.heavy} heavy statements)`);
  ok(/^Up to date/.test(b.r.summary) && b.r.ok, "  and the Studio still sees a successful read");
  ok(JSON.parse(settings.get("sync_tenninety_last")).at === "2026-09-27T10:01:00Z", "  with the time of that read recorded");
  const c = await run(changed, "2026-09-27T10:02:00Z");
  ok(!c.r.quiet && c.heavy > 0, "a change in the feed (a rent) is compared in full straight away");
  const d = await run(changed, "2026-09-27T10:50:00Z");
  ok(d.r.quiet, "the changed feed, unchanged since, is quiet again");
  const e = await run(changed, "2026-09-27T11:03:00Z");
  ok(!e.r.quiet, "at least once an hour it compares in full anyway");
  const f = await run(changed, "2026-09-27T23:40:00Z");
  const g = await run(changed, "2026-09-28T00:01:00Z");
  ok(!g.r.quiet, "after midnight it compares in full, because 'available from' dates may have arrived");
  void f;
  const h = await run(changed, "2026-09-28T00:02:00Z", { force: true });
  ok(!h.r.quiet, "a refresh someone asked for always compares in full");
  const down = await run(async () => { throw new Error("upstream down"); }, "2026-09-28T00:03:00Z");
  const back = await run(changed, "2026-09-28T00:04:00Z");
  ok(!down.r.ok && !back.r.quiet, "after a failed read the next one compares in full");
}

/* ── a feed without photographs never takes them off the website (29 Sep) ── */

{
  const { keepPhotosWhenFeedHasNone } = await import("../worker/studio/tenninety-sync.js");
  const { feedMediaKey, imagesOf, imageShape } = await import("../worker/studio/tenninety.js");
  const sigOf = (r) => (r.images || []).map((i) => feedMediaKey(r.id, i.url)).join(",");
  const existing = NINE.map((r) => ({ ...r, photoSig: sigOf(r), docSig: undefined }));
  const bare = () => NINE.map((r) => ({ ...r, images: [], photoSig: "" }));

  const same = bare();
  const kept = keepPhotosWhenFeedHasNone(existing, same);
  ok(kept === 9 && same.every((r) => r._keepPhotos), `a feed with no photos: all nine keep theirs (${kept})`);
  const plan = planSync(existing.map((r) => ({ ...r, docSig: undefined })), same.map((r) => ({ ...r, docSig: undefined })));
  ok(plan.update.length === 0, `  and "no photos" alone is not a change, so nothing is rewritten (${plan.update.length} updates)`);

  const rentUp = bare().map((r, i) => (i === 0 ? { ...r, rentPcm: (r.rentPcm || 0) + 25 } : r));
  keepPhotosWhenFeedHasNone(existing, rentUp);
  const p2 = planSync(existing.map((r) => ({ ...r, docSig: undefined })), rentUp.map((r) => ({ ...r, docSig: undefined })));
  ok(p2.update.length === 1, "a real change (a rent) without photos is still applied");
  const db = stubDb();
  await applyPlan(db, p2, { now: "2026-09-29T03:04:00Z" });
  ok(!db.log.some((x) => /DELETE FROM media|INSERT INTO media/.test(x.sql)), "  without deleting or replacing a single photograph");
  const upd = db.log.find((x) => /UPDATE listings SET/.test(x.sql));
  ok(upd && !/cover_media_id/.test(upd.sql), "  and without touching the cover");

  const fresh = keepPhotosWhenFeedHasNone([{ id: "new-one", photoSig: "" }], [{ id: "new-one", images: [], photoSig: "" }]);
  ok(fresh === 0, "a property that never had photos is not 'kept' (nothing to keep)");

  const back = NINE.map((r) => ({ ...r, photoSig: sigOf(r) }));
  const p3 = planSync(NINE.map((r) => ({ ...r, photoSig: "", docSig: undefined })), back.map((r) => ({ ...r, docSig: undefined })));
  ok(p3.update.length === 9, "when photos come back in the feed, every listing that lost them gets them again");

  ok(imagesOf({ images: ["https://megacityproperties.10ninety.co.uk/PortalExports/DisplayImage/1"] }).length === 1, "photos sent as plain addresses are read");
  ok(imagesOf({ images: [{ URL: "http://megacityproperties.10ninety.co.uk/PortalExports/DisplayImage/1" }] })[0].url.startsWith("https://"), "10ninety's own http addresses are read as https");
  ok(imagesOf({ images: [{ url: "http://elsewhere.example/a.jpg" }] }).length === 0, "anything else over http is still refused");
  const shape = imageShape([{ images: [] }, { images: [] }]);
  ok(shape.properties === 2 && shape.withImages === 0 && shape.fieldType === "list of 0", "the Studio is told what the photo field looked like");
}

/* ── it runs on its own, not only when somebody presses a button ──────────── */

/* Walid's point, and a fair one: he should not have to open the Studio and
   press Refresh for his own website to say what his own system says. */
{
  const { readFileSync } = await import("node:fs");
  const toml = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
  const worker = readFileSync(new URL("../worker.js", import.meta.url), "utf8");

  const mega = toml.slice(toml.indexOf("[env.megacity]"));
  ok(/\[env\.megacity\.triggers\][\s\S]{0,400}?crons\s*=\s*\[/.test(mega), "megacity-properties has a cron trigger");
  const cron = (/crons\s*=\s*\[\s*"([^"]+)"/.exec(mega) || [])[1];
  ok(cron === "* * * * *", `it runs every minute, the fastest a Cron Trigger can (${cron})`);

  ok(/async scheduled\(event, env, ctx\)/.test(worker), "the Worker has a scheduled handler for it to fire");
  /* worker.js is shared by several clients; only one of them has a feed */
  ok(/if \(!env\.MEGACITY_DB \|\| !env\.TENNINETY_API_KEY\) return;/.test(worker),
    "which does nothing in a Worker with no Megacity database or no 10ninety key");
  ok(/ctx\.waitUntil\(/.test(worker), "and the work is handed to waitUntil so the run is not cut short");
  ok(!/throw/.test(worker.slice(worker.indexOf("async scheduled"), worker.indexOf("async fetch"))),
    "it never throws — a failed cron invocation has nobody watching it");
}

console.log();
console.log(bad ? `SYNC WRITE: ${bad} FAILED` : "SYNC WRITE: ALL PASS");
process.exit(bad ? 1 : 0);

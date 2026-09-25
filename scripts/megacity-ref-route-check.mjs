#!/usr/bin/env node
/* Exercises refListingPath's decision table without a Worker runtime, by
   driving the same branches with a stub database. What matters is not the
   path but the STATUS: a miss must be temporary. */
import * as urls from "../worker/studio/urls.js";

async function refListingPath(db, ref) {
  if (db) {
    try {
      const row = await db.prepare().bind(ref).first();
      if (row) {
        const live = row.status === "live" && !row.hidden && !row.deleted_at;
        if (live || urls.STATIC_LET_SLUGS.includes(row.id)) return { to: urls.listingPath("root", row.id), status: 301 };
        return { to: "/lettings", status: 302 };
      }
    } catch (e) {}
  }
  if (urls.STATIC_LET_SLUGS.includes(ref)) return { to: urls.listingPath("root", ref), status: 301 };
  return { to: "/lettings", status: 302 };
}

const dbOf = (row) => ({ prepare: () => ({ bind: () => ({ first: async () => row }) }) });
let bad = 0;
const ok = (c, w) => { console.log((c ? "ok   " : "FAIL ") + w); if (!c) bad++; };

let r = await refListingPath(dbOf({ id: "denmark-road", status: "live", hidden: 0, deleted_at: null }), "RS0001");
ok(r.to === "/let/denmark-road" && r.status === 301, "a live listing -> its page, permanently (" + r.to + " " + r.status + ")");

r = await refListingPath(dbOf({ id: "some-draft", status: "draft", hidden: 0, deleted_at: null }), "RS0002");
ok(r.to === "/lettings" && r.status === 302, "a draft -> the grid, TEMPORARILY (" + r.to + " " + r.status + ")");

r = await refListingPath(dbOf(null), "RS9999");
ok(r.to === "/lettings" && r.status === 302, "a reference the sync has not reached -> the grid, TEMPORARILY (" + r.status + ")");

/* There used to be fourteen hand-built pages to fall back on, and these two
   cases proved a reference still resolved with no database behind it. They are
   gone: a property is what 10ninety says it is, and nothing on this side can
   name one any more. So the honest answer with no database is the grid — and,
   crucially, a TEMPORARY one, because the reference is probably fine and it is
   the database that is not. A 301 here would be cached by the browser and by
   Google and would outlive the outage. */
r = await refListingPath(null, "ladywell-point");
ok(r.to === "/lettings" && r.status === 302, "no database -> the grid, TEMPORARILY, even for a slug that exists (" + r.status + ")");

r = await refListingPath(null, "RS0001");
ok(r.to === "/lettings" && r.status === 302, "no database and an unknown reference -> the grid, never a 404 (" + r.status + ")");

r = await refListingPath({ prepare: () => { throw new Error("D1 down"); } }, "ladywell-point");
ok(r.to === "/lettings" && r.status === 302, "the database throwing sends people on rather than dead-ending (" + r.status + ")");

ok(urls.STATIC_LET_SLUGS.length === 0, "and there are no hand-built listing slugs left to fall back to");

console.log(bad ? `\n${bad} FAILED` : "\nREF ROUTE: ALL PASS");
process.exit(bad ? 1 : 0);

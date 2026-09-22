#!/usr/bin/env node
/* Deploy guard. A placeholder D1 database_id once broke every deploy to
   billydigitals.com (see the note in wrangler.toml). Run this as the Workers
   Builds "build command" — or before `wrangler deploy` — and it refuses to
   continue while wrangler.toml still carries a placeholder id.
     node scripts/check-wrangler.mjs            (exits 1 on a problem)

   It reads the file PER ENVIRONMENT. It used to read it as one blob, which was
   fine while every client was routed from the top-level config and stopped
   being fine the moment one was not: [env.megacity] sets MEGACITY_HOST for
   Walid's own account and keeps its routes commented until his nameservers
   move, and a whole-file reading called that a fault — the host named here,
   the route commented there, two different Workers. */
import { readFileSync } from "node:fs";

const toml = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");

/* Only uncommented lines count: half this file is instructions. */
const live = (s) => s.split("\n").filter((l) => !/^\s*#/.test(l)).join("\n");

/* Split into the top-level config and one block per environment. A sub-table
   like [env.mm.assets] belongs to env.mm, so a new block starts only at an
   [env.<name>] header with nothing after the name. */
function environments(src) {
  const lines = src.split("\n");
  const blocks = [{ name: "(top level)", lines: [] }];
  for (const line of lines) {
    const m = line.match(/^\s*\[env\.([A-Za-z0-9_-]+)\]\s*$/);
    if (m) blocks.push({ name: m[1], lines: [] });
    blocks[blocks.length - 1].lines.push(line);
  }
  return blocks.map((b) => ({ name: b.name, text: b.lines.join("\n"), active: live(b.lines.join("\n")) }));
}

const envs = environments(toml);
const active = live(toml);
const problems = [];

/* ── placeholders, anywhere ─────────────────────────────────────────────── */

if (/PASTE_REAL_ID_HERE|<real uuid>|database_id\s*=\s*"(local|dev|xxx|todo)"/i.test(active)) {
  problems.push("wrangler.toml has a placeholder database_id on an active line.");
}
for (const m of active.matchAll(/database_id\s*=\s*"([^"]*)"/g)) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m[1])) {
    problems.push(`database_id "${m[1]}" is not a UUID.`);
  }
}

/* ── a client domain must be routed AND named, in the SAME environment ──── */

/* With a route but no host var the domain serves the Billy Digitals homepage;
   with a host var but no route nothing reaches the Worker at all. Both look
   like "the deploy did nothing", and both are seen by the client first. */
const PAIRS = [["megacityproperties.co.uk", "MEGACITY_HOST"], ["mumbai2london.co.uk", "M2L_HOST"]];
for (const env of envs) {
  for (const [host, v] of PAIRS) {
    const esc = host.replace(/\./g, "\\.");
    const routed = new RegExp(`pattern\\s*=\\s*"(www\\.)?${esc}"`).test(env.active);
    const named = new RegExp(`${v}\\s*=\\s*"[^"]*${esc}`).test(env.active);
    const where = env.name === "(top level)" ? "the top-level config" : `[env.${env.name}]`;
    if (routed && !named) problems.push(`${host} is routed in ${where} but not listed in ${v} there — it would serve the Billy Digitals site.`);
    if (named && !routed) {
      /* Naming the host with no route is how this sits between the DNS move
         and the website move, on purpose. Only say so; do not fail. */
      console.log(`check-wrangler: note — ${host} is named in ${v} in ${where} with its routes still commented.`);
      console.log("                 That is the state between the DNS move and the website move. Uncomment the routes when the zone is Active.");
    }
  }
}

/* ── a client Worker must not go live without its database and storage ──── */

/* The Studio, every enquiry record, every photograph and every 360 tour need
   D1 and R2. A Worker routed at a client's domain without them serves a site
   whose listings, inbox and media are all missing, which looks like the site
   is broken rather than like a binding is absent. */
for (const env of envs) {
  if (env.name !== "megacity") continue;
  const routed = /pattern\s*=\s*"(www\.)?megacityproperties\.co\.uk"/.test(env.active);
  const hasDb = /binding\s*=\s*"MEGACITY_DB"/.test(env.active);
  const hasR2 = /binding\s*=\s*"MEDIA"/.test(env.active);
  if (routed && !hasDb) problems.push("[env.megacity] is routed at his domain but has no MEGACITY_DB binding — the Studio and every listing would be missing.");
  if (routed && !hasR2) problems.push("[env.megacity] is routed at his domain but has no MEDIA binding — every photograph and 360 tour would be missing.");
  if (hasDb !== hasR2) problems.push("[env.megacity] has one of MEGACITY_DB / MEDIA but not the other — uncomment both or neither.");
  if (env.active.includes("directory = \"dist/megacity\"") === false) {
    problems.push("[env.megacity] must serve dist/megacity — anything else sends the whole repository to his account.");
  }
}

/* ── an environment with no routes of its own inherits the agency's ─────── */

/* wrangler warns about this and then does it anyway. A client environment that
   omits `routes` inherits billydigitals.com from the top level, so deploying
   it reassigns the AGENCY's live domain to a Worker in the client's account.
   `routes = []` inherits nothing; no routes line at all inherits everything. */
for (const env of envs) {
  if (env.name === "(top level)") continue;
  if (!/^\s*routes\s*=/m.test(env.active)) {
    problems.push(`[env.${env.name}] declares no routes, so it INHERITS the top-level ones ` +
      `(billydigitals.com). Deploying it would move the agency's domain to this Worker. ` +
      `Use routes = [] to inherit nothing.`);
  }
}

/* ── a D1 binding without a migrations_dir reads somebody else's schema ─── */

/* wrangler defaults to ./migrations, which in a repository that serves more
   than one client holds the FIRST client's migrations. It does not fail — it
   applies them to the wrong database and reports success. Worse where two
   schemas name the same table: CREATE TABLE IF NOT EXISTS then skips the
   right one, and the site runs against the wrong shape with no error at all. */
for (const env of envs) {
  if (env.name === "(top level)") continue;
  if (!/\[\[env\.[a-z0-9_-]+\.d1_databases\]\]/.test(env.active)) continue;
  if (!/migrations_dir\s*=/.test(env.active)) {
    problems.push(`[env.${env.name}] binds a D1 database but sets no migrations_dir — ` +
      `wrangler would apply ./migrations, which is another client's schema.`);
  }
}

if (problems.length) {
  console.error("check-wrangler: refusing to deploy.\n - " + problems.join("\n - "));
  process.exit(1);
}
console.log("check-wrangler: ok");

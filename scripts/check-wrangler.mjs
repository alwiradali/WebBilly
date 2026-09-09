#!/usr/bin/env node
/* Deploy guard. A placeholder D1 database_id once broke every deploy to
   billydigitals.com (see the note in wrangler.toml). Run this as the Workers
   Builds "build command" — or before `wrangler deploy` — and it refuses to
   continue while wrangler.toml still carries a placeholder id.
     node scripts/check-wrangler.mjs            (exits 1 on a problem) */
import { readFileSync } from "node:fs";

const toml = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
const active = toml
  .split("\n")
  .filter((line) => !/^\s*#/.test(line))   // ignore commented-out lines
  .join("\n");

const problems = [];
if (/PASTE_REAL_ID_HERE|<real uuid>|database_id\s*=\s*"(local|dev|xxx|todo)"/i.test(active)) {
  problems.push("wrangler.toml has a placeholder database_id on an active line.");
}
for (const m of active.matchAll(/database_id\s*=\s*"([^"]*)"/g)) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m[1])) {
    problems.push(`database_id "${m[1]}" is not a UUID.`);
  }
}
/* A client domain must be routed to this Worker AND named in its host var.
   With a route but no host var the domain serves the Billy Digitals homepage;
   with a host var but no route nothing reaches the Worker at all. Both look
   like "the deploy did nothing" and both are seen by the client first. */
for (const [host, v] of [["megacityproperties.co.uk", "MEGACITY_HOST"], ["mumbai2london.co.uk", "M2L_HOST"]]) {
  const routed = new RegExp(`pattern\\s*=\\s*"(www\\.)?${host.replace(/\./g, "\\.")}"`).test(active);
  const named = new RegExp(`${v}\\s*=\\s*"[^"]*${host.replace(/\./g, "\\.")}`).test(active);
  if (routed && !named) problems.push(`${host} is routed to this Worker but not listed in ${v} — it would serve the Billy Digitals site.`);
  if (named && !routed) problems.push(`${host} is listed in ${v} but has no route — no request would ever reach the Worker.`);
}

if (problems.length) {
  console.error("check-wrangler: refusing to deploy.\n - " + problems.join("\n - "));
  process.exit(1);
}
console.log("check-wrangler: ok");

#!/usr/bin/env node
/* Every URL Google has indexed on the old site -> where it lands on the new one.
 *
 * Walid's brief: "We do not want to lose existing Google rankings or indexed
 * pages when moving to the new site." This is the answer, checked rather than
 * asserted. The old site publishes a sitemap index, so the set of indexed URLs
 * is knowable exactly — 21 of them — and each is run through the real routing
 * code the Worker uses.
 *
 *   node scripts/megacity-redirect-map.mjs           from the live old site
 *   node scripts/megacity-redirect-map.mjs --offline from the saved list
 *
 * Run it again after the nameservers move and every row should still resolve;
 * that is the check that the move kept the rankings.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as urls from "../worker/studio/urls.js";

const OLD = "https://www.megacityproperties.co.uk";
const SAVED = new URL("./fixtures/old-site-urls.txt", import.meta.url);
const offline = process.argv.includes("--offline");

async function indexedUrls() {
  if (offline && existsSync(SAVED)) return readFileSync(SAVED, "utf8").trim().split("\n");
  const locs = async (u) => {
    const r = await fetch(u);
    if (!r.ok) return [];
    return [...(await r.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  };
  const index = await locs(`${OLD}/sitemap.xml`);
  const out = [];
  for (const child of index) out.push(...(await locs(child)));
  if (out.length) writeFileSync(SAVED, out.join("\n") + "\n");
  return out;
}

const list = await indexedUrls();
if (!list.length) { console.error("No URLs found. The old site may already be gone — run with --offline."); process.exit(1); }

let gaps = 0, viaDb = 0;
const rows = [];
for (const raw of list) {
  const path = new URL(raw).pathname.replace(/\/+$/, "") || "/";
  let dest = urls.legacyRedirect(path), how = "301";
  if (!dest && urls.resolveRoot(path)) { dest = path; how = "200 (same address)"; }
  if (!dest) {
    const m = /^\/property\/(\d+)/.exec(path);
    if (m) {
      const slug = urls.LEGACY_LISTINGS[m[1]];
      if (slug) { dest = urls.listingPath("root", slug); how = "301 (by old id)"; viaDb++; }
      else { dest = "/lettings"; how = "301 to the grid — NO MAPPING"; gaps++; }
    }
  }
  if (!dest) { dest = "(nothing)"; how = "GAP"; gaps++; }
  rows.push({ path, dest, how });
}

const w = Math.max(...rows.map((r) => r.path.length));
console.log(`| ${"Old URL".padEnd(w)} | New URL${" ".repeat(18)} | |`);
console.log(`|${"-".repeat(w + 2)}|${"-".repeat(27)}|---|`);
for (const r of rows) console.log(`| ${r.path.padEnd(w)} | ${r.dest.padEnd(25)} | ${r.how} |`);
console.log();
console.log(`${rows.length} indexed URLs · ${viaDb} property pages mapped by their old id · ${gaps} gap(s)`);
console.log(gaps
  ? "\nREDIRECT MAP: INCOMPLETE — a gap means an indexed page loses its ranking."
  : "\nREDIRECT MAP: every indexed URL resolves to its own page, not to a generic one.");
process.exit(gaps ? 1 : 0);

#!/usr/bin/env node
/* Builds dist/megacity — the only files that go to Walid's Cloudflare account.
 *
 * WHY THIS EXISTS
 *
 * The zone megacityproperties.co.uk lives in the client's own Cloudflare
 * account, which is the right way round: he owns the domain, the site, the
 * database and the photographs, and can take them elsewhere one day without
 * asking anybody. A Worker custom domain can only be created for a zone in the
 * same account as the Worker, so the Worker has to be deployed there too.
 *
 * The danger is what travels with it. `wrangler deploy --env megacity` with no
 * [env.megacity] block does not fail: it falls back to the top-level config and
 * uploads THE WHOLE REPOSITORY — every other client's pages, photographs and
 * documents — into the client's account as static assets, and reports success.
 * That has happened on this repository before. [env.megacity] points at this
 * directory precisely so there is nothing else here to send.
 *
 * So the rule is an ALLOW-LIST, never a deny-list. A deny-list has to be
 * updated every time a client is added, and the failure is silent and one-way:
 * once another client's files are in someone else's account, deleting them here
 * does not remove them from there.
 *
 *   node scripts/build-megacity.mjs           build it
 *   node scripts/build-megacity.mjs --check   verify an existing build
 *
 * The layout is not free to change. worker/studio/host.js asks env.ASSETS for
 * "/templates/<name>", "/templates/assets/mcr/<name>" and "/billy360/...", so
 * the build keeps exactly those paths — this is a copy of a subset, not a
 * rearrangement.
 */

import { readdirSync, statSync, mkdirSync, copyFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "dist", "megacity");
const check = process.argv.includes("--check");

/* ─────────────────────────────────────────────── what is allowed to travel */

/* Each entry is a directory to walk plus a test every file must pass. A file
   that matches nothing here does not reach the client's account. */
const ALLOW = [
  { from: "templates", to: "templates", depth: 0,
    test: (n) => /^megacity[-.].*\.(html|js|css)$/.test(n) },
  { from: "templates/assets/mcr", to: "templates/assets/mcr", depth: 99, test: () => true },
  { from: "templates/vendor", to: "templates/vendor", depth: 99, test: () => true },
  { from: "billy360", to: "billy360", depth: 99,
    /* the viewer and its demo panoramas; tour-ashby.js and tour-homes.js are
       other people's demo tours and stay behind */
    test: (n, rel) => !/^tour-(ashby|homes)\.js$/.test(n) && !/OPEN-ME|README/.test(n) },
  { from: ".", to: ".", depth: 0,
    /* No robots.txt: worker/studio/host.js writes the client domain its own,
       naming its own sitemap. Shipping this repository's would put a file in
       his account that is never read and would be wrong if it ever were. */
    test: (n) => n === "version.json" || n === "favicon.ico" },
];

/* .assetsignore already records which files must never be served — the earlier
   Megacity pages among them, with the reason written next to them: "on the
   client's own domain they would only be duplicate content". That decision is
   not repeated here, it is read. A second list would be one more thing to keep
   in step, and the failure would be silent: files nobody meant to publish,
   published, in somebody else's account.

   Only the plain path lines matter; comments and blank lines are skipped. */
function neverServed() {
  const out = new Set();
  for (const line of readFileSync(join(ROOT, ".assetsignore"), "utf8").split("\n")) {
    const t = line.trim();
    if (t && !t.startsWith("#")) out.add(t.replace(/^\/+/, "").replace(/\/+$/, ""));
  }
  return out;
}
const IGNORED = neverServed();
const isIgnored = (dest) => {
  const parts = dest.split("/");
  for (let i = 1; i <= parts.length; i++) if (IGNORED.has(parts.slice(0, i).join("/"))) return true;
  return false;
};

/* No other client may appear in a path, whatever the rules above say. This is
   the backstop: if an allow-list entry is ever widened by accident, this still
   refuses to ship somebody else's work to somebody else's account. */
const OTHER_CLIENTS = /(mumbai2london|m2l|molecular|smartin|rachel|roses|amabilis|hobberry|diamond|jet-?wash|clean-?my-?car|heatfix|lancashire|yoga|ashby)/i;

/* ───────────────────────────────────────────────────────────────── walking */

/* Paths are compared as strings throughout — against .assetsignore, against
   MUST, against the other-clients pattern — and all of those are written with
   forward slashes. node:path's join() and relative() use the platform
   separator, so on Windows every one of those comparisons silently failed and
   the build refused, claiming files were missing that were sitting right
   there. Separators are a platform detail; the keys in this file are not. */
const posix = (s) => s.split("\\").join("/");

function walk(dir, depth, base = dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (depth > 0) out.push(...walk(full, depth - 1, base));
    } else {
      out.push({ full, rel: posix(relative(base, full)), name });
    }
  }
  return out;
}

function collect() {
  const files = [];
  const seen = new Set();
  for (const rule of ALLOW) {
    for (const f of walk(join(ROOT, rule.from), rule.depth)) {
      if (!rule.test(f.name, f.rel)) continue;
      const dest = posix(join(rule.to, f.rel));
      if (isIgnored(dest)) continue;
      if (seen.has(dest)) continue;
      seen.add(dest);
      files.push({ src: f.full, dest });
    }
  }
  return files.sort((a, b) => a.dest.localeCompare(b.dest));
}

/* ─────────────────────────────────────────────────────────────── the build */

const files = collect();
if (!files.length) {
  console.error("Nothing matched the allow-list — refusing to write an empty build.");
  process.exit(1);
}

/* The backstop, applied to what is actually about to be copied. */
const strays = files.filter((f) => OTHER_CLIENTS.test(f.dest));
if (strays.length) {
  console.error("REFUSING TO BUILD — these would go to the client's account:");
  for (const s of strays.slice(0, 20)) console.error("  " + s.dest);
  process.exit(1);
}

/* Things the site cannot work without. A build that is merely smaller than it
   should be deploys perfectly and serves a broken site. */
const MUST = [
  "templates/megacity-let-template.html",
  "templates/megacity-page-template.html",
  "templates/megacity-properties.html",
  "templates/megacity-404.html",
  "templates/megacity-skyline.css",
  "templates/megacity-skyline.js",
  "templates/megacity-video360.js",
  /* his outreach signature is built from these two */
  "templates/assets/mcr/logo.png",
  "templates/assets/mcr/walid-mhana.jpg",
  "templates/megacity-studio.js",
  "billy360/embed.js",
  "billy360/index.html",
  "version.json",
];
const missing = MUST.filter((m) => !files.some((f) => f.dest === m));
if (missing.length) {
  console.error("REFUSING TO BUILD — these are missing and the site needs them:");
  for (const m of missing) console.error("  " + m);
  process.exit(1);
}

if (check) {
  let bad = 0;
  for (const f of files) {
    const at = join(OUT, f.dest);
    if (!existsSync(at)) { console.log("MISSING  " + f.dest); bad++; continue; }
    if (statSync(at).size !== statSync(f.src).size) { console.log("DIFFERS  " + f.dest); bad++; }
  }
  const extra = walk(OUT, 99).filter((f) => !files.some((x) => x.dest === f.rel));
  for (const e of extra) { console.log("EXTRA    " + e.rel); bad++; }
  console.log();
  console.log(bad ? `MEGACITY BUILD: ${bad} difference(s) — run without --check.`
                  : `MEGACITY BUILD: in step (${files.length} files).`);
  process.exit(bad ? 1 : 0);
}

rmSync(OUT, { recursive: true, force: true });
let bytes = 0;
for (const f of files) {
  const at = join(OUT, f.dest);
  mkdirSync(dirname(at), { recursive: true });
  copyFileSync(f.src, at);
  bytes += statSync(at).size;
}

/* What the reader wants to know is not "did it copy" but "what did it send". */
const byTop = {};
for (const f of files) {
  const top = f.dest.split("/").slice(0, 2).join("/");
  byTop[top] = (byTop[top] || 0) + statSync(join(OUT, f.dest)).size;
}
console.log(`Wrote dist/megacity — ${files.length} files, ${(bytes / 1048576).toFixed(1)} MB.`);
for (const [k, v] of Object.entries(byTop).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${(v / 1048576).toFixed(1).padStart(6)} MB  ${k}`);
}
const stamp = existsSync(join(OUT, "version.json"))
  ? JSON.parse(readFileSync(join(OUT, "version.json"), "utf8")).stamp : "(none)";
console.log(`  stamp ${stamp}`);
console.log("\nNothing from any other client is in here — the allow-list decides what travels,");
console.log("and a second check refuses to build if another client's name appears in a path.");

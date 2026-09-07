#!/usr/bin/env node
/* Build stamp. Twice on 7 September billydigitals.com served an August build —
   whole directories 404ing while Workers Builds reported success — and there was
   no way to ask the live site which build it was running. Dating it meant
   fetching files and comparing them against git history.

   This writes version.json at the repository root so the deployed site says so
   itself. Run it after staging and before committing:

     git add -A && node scripts/stamp.mjs && git add version.json && git commit

   `node scripts/stamp.mjs --check` exits 1 when version.json no longer matches
   the staged tree, so a forgotten stamp fails here instead of lying in
   production. `--ci` prefers Cloudflare's WORKERS_CI_COMMIT_SHA, for the day the
   Workers Builds command becomes
     node scripts/check-wrangler.mjs && node scripts/stamp.mjs --ci
   Nothing else depends on that; the stamp is correct either way. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);
const FILE = new URL("version.json", ROOT);
const args = process.argv.slice(2);
const check = args.includes("--check");
const ci = args.includes("--ci");

function git(...a) {
  return execFileSync("git", a, { cwd: ROOT, maxBuffer: 1 << 28 }).toString();
}

/* The identity that matters. `git ls-files -s` is mode + blob hash + path for
   every tracked file — a content fingerprint of exactly what the next commit
   will carry, in 3 ms, with no file reads. version.json is dropped from it so
   the stamp never feeds itself. It describes the INDEX, which is what gets
   committed and deployed: stamp after `git add`, not before. */
function fingerprint() {
  const lines = git("ls-files", "-s")
    .split("\n")
    .filter((l) => l && !/\tversion\.json$/.test(l))
    .sort();
  return { stamp: createHash("sha256").update(lines.join("\n")).digest("hex").slice(0, 12), files: lines.length };
}

const { stamp, files } = fingerprint();

if (check) {
  let have;
  try {
    have = JSON.parse(readFileSync(FILE, "utf8"));
  } catch {
    console.error("stamp: version.json is missing or unreadable. Run: node scripts/stamp.mjs");
    process.exit(1);
  }
  if (have.stamp !== stamp) {
    console.error(`stamp: version.json is stale (says ${have.stamp}, staged tree is ${stamp}).`);
    console.error("       Run: git add -A && node scripts/stamp.mjs && git add version.json");
    process.exit(1);
  }
  /* Unstaged edits are not in the fingerprint and will not be deployed, so a
     passing check could still mislead. Say so rather than staying quiet. */
  const dirty = git("diff", "--name-only").split("\n").filter(Boolean);
  if (dirty.length) {
    console.log(`stamp: ok (${stamp}), but ${dirty.length} tracked file(s) have unstaged changes:`);
    for (const f of dirty.slice(0, 8)) console.log(`       ${f}`);
    if (dirty.length > 8) console.log(`       … and ${dirty.length - 8} more`);
  } else {
    console.log(`stamp: ok (${stamp}, ${files} files)`);
  }
  process.exit(0);
}

/* `head` is a human landmark for finding the build in Cloudflare's deployment
   list, not the deployed revision — a commit cannot know its own hash, so
   `stamp` is the identity to compare.
   It names origin/main rather than local HEAD on purpose: stamping before a
   commit gives HEAD as the parent, but an amend or a rebase then leaves that
   parent naming a commit that no longer exists. What main last had is true
   either way. */
let head = "";
try {
  head = ci && process.env.WORKERS_CI_COMMIT_SHA
    ? process.env.WORKERS_CI_COMMIT_SHA.slice(0, 7)
    : git("rev-parse", "--short", "origin/main").trim();
} catch {
  try { head = git("rev-parse", "--short", "HEAD").trim(); } catch { head = ""; }
}

const out = {
  stamp,
  built: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
  head,
  files,
  note: "stamp identifies the deployed tree; head is what main last had when it was built",
};
writeFileSync(FILE, JSON.stringify(out, null, 2) + "\n");
console.log(`stamp: ${stamp} (${files} files, on top of main ${head || "unknown"})`);

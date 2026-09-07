#!/usr/bin/env node
/* Did the push actually go live? Twice on 7 September billydigitals.com served
   an August build: the homepage was fine, but /billy360/, /halcyon/ and every
   Megacity template 404'd, while /migrations/0001_m2l.sql — excluded from the
   upload since August — was still being served. Workers Builds reported
   success both times. Proving it took fetching files and dating them against
   git history; this script does that in one command.

     node scripts/deploy-verify.mjs
     node scripts/deploy-verify.mjs --base=https://www.megacityproperties.co.uk --files=off
     node scripts/deploy-verify.mjs --since=HEAD~5

   Exits non-zero and names the files when the live site is not running this
   tree. Uses curl rather than fetch() so it works behind a proxy and with the
   same CA store as the rest of the scripts here. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = new URL("../", import.meta.url);
const DIR = ROOT.pathname;
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const BASE = arg("base", "https://billydigitals.com").replace(/\/+$/, "");
const SINCE = arg("since", "HEAD~3");
/* The byte comparison uses files that only billydigitals.com serves — a client
   domain serves its own site and nothing else, so /halcyon/… is a correct 404
   there. Against a client host, check the stamp alone. */
const FILES = arg("files", "on") !== "off";

/* Files that are deliberately NOT uploaded. .assetsignore holds plain paths and
   directory names, no globs, so prefix matching is enough. */
const IGNORED = readFileSync(new URL(".assetsignore", ROOT), "utf8")
  .split("\n").map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"));
/* Cloudflare consumes these itself; they are never served. */
const CONFIG_FILES = ["_headers", "_redirects", "_routes.json"];
const ignored = (p) =>
  CONFIG_FILES.includes(p) ||
  IGNORED.some((i) => p === i || p.startsWith(i + "/") || p.split("/").pop() === i);

/* Served verbatim, so their bytes can be compared. HTML goes through the
   Worker's rewriters on some hosts, so those are checked for a 200 only. */
const VERBATIM = /\.(js|mjs|css|json|svg|png|jpg|jpeg|webp|avif|ico|woff2?|txt|xml|sql|map|md)$/i;

/* One file from each area that vanished in the stale-build windows, plus the
   agency homepage. If a deployment is partial, it shows up here. */
const CANARIES = [
  "billy360/engine.js",
  "billy360/index.html",
  "halcyon/index.html",
  "templates/megacity-skyline.css",
  "templates/assets/mcr/logo.png",
  "assets/css/style.css",
  "index.html",
];
/* Excluded from upload — a 200 here means an old build is being served. */
const MUST_BE_ABSENT = ["migrations/0001_m2l.sql", "docs/billy360.md"];

const TMP = join(tmpdir(), `deploy-verify-${process.pid}`);
function get(path) {
  const url = `${BASE}/${path.replace(/^\/+/, "")}`;
  try {
    const code = execFileSync("curl", ["-sS", "-L", "--max-time", "30", "-o", TMP, "-w", "%{http_code}", url],
      { encoding: "utf8" }).trim();
    const body = existsSync(TMP) ? readFileSync(TMP) : Buffer.alloc(0);
    return { code, body, md5: createHash("md5").update(body).digest("hex") };
  } catch (e) {
    return { code: "000", body: Buffer.alloc(0), md5: "", error: String(e.message || e).split("\n")[0] };
  }
}
const localMd5 = (p) => createHash("md5").update(readFileSync(join(DIR, p))).digest("hex");
/* Clean URLs: foo.html is served at /foo, and an index.html at the root of a
   directory at that directory's path. */
function urlFor(p) {
  if (p === "index.html") return "";
  if (!p.endsWith(".html")) return p;
  return p.replace(/(?:\/index)?\.html$/, (m) => (m === "/index.html" ? "/" : ""));
}

const problems = [];
const say = (ok, line) => console.log(`${ok ? "ok  " : "FAIL"}  ${line}`);

console.log(`== deployment  ${BASE}`);

/* 1. Is the local stamp even current? A stale one would compare the live site
      against a build nobody pushed. */
let localStamp = null;
try {
  localStamp = JSON.parse(readFileSync(new URL("version.json", ROOT), "utf8")).stamp;
} catch { /* reported below */ }
let stampTrusted = true;
try {
  execFileSync("node", [join(DIR, "scripts/stamp.mjs"), "--check"], { cwd: DIR, stdio: "pipe" });
} catch {
  stampTrusted = false;
  console.log("note  local version.json is stale — comparing files only, not the stamp");
}

/* 2. What the live site says it is. */
const live = get("version.json");
if (live.code !== "200") {
  say(false, `/version.json → ${live.code} (expected 200)`);
  problems.push("no /version.json on the live host — it may predate the stamp");
} else {
  let info = null;
  try { info = JSON.parse(live.body.toString("utf8")); } catch { /* handled */ }
  if (!info || !info.stamp) {
    say(false, "/version.json is not valid stamp JSON");
    problems.push("unreadable /version.json");
  } else {
    console.log(`      live: stamp ${info.stamp}, built ${info.built}, on top of main ${info.head}`);
    if (!stampTrusted) {
      say(true, "/version.json served (local stamp stale, not compared)");
    } else if (info.stamp === localStamp) {
      say(true, `live stamp matches this tree (${localStamp})`);
    } else {
      say(false, `live stamp ${info.stamp} ≠ this tree ${localStamp}`);
      problems.push("the live site is running a different build");
    }
  }
}

/* 3. Bytes. The stamp can only be trusted as far as the deployment that carried
      it, so check real files too — this is what caught both stale builds. */
let changed = [];
if (!FILES) console.log("note  --files=off: comparing the stamp only, not individual files");
try {
  changed = execFileSync("git", ["diff", "--name-only", `${SINCE}..HEAD`], { cwd: DIR, encoding: "utf8" })
    .split("\n").filter(Boolean);
} catch {
  console.log(`note  ${SINCE}..HEAD is not a valid range — checking the canaries only`);
}
const checkList = FILES
  ? [...new Set([...CANARIES, ...changed])].filter((p) => !ignored(p) && existsSync(join(DIR, p)))
  : [];

for (const p of checkList) {
  const r = get(urlFor(p));
  if (r.code !== "200") {
    say(false, `/${urlFor(p)} → ${r.code}${r.error ? ` (${r.error})` : ""}`);
    problems.push(`/${urlFor(p)} is not being served`);
  } else if (VERBATIM.test(p)) {
    const same = r.md5 === localMd5(p);
    say(same, `/${urlFor(p)}${same ? "" : " differs from this tree"}`);
    if (!same) problems.push(`/${urlFor(p)} is an older copy`);
  } else {
    say(true, `/${urlFor(p)} (200; HTML is rewritten per host, bytes not compared)`);
  }
}

/* 4. Files that must NOT be there. A 200 means an old manifest is live. */
for (const p of MUST_BE_ABSENT) {
  const r = get(p);
  const gone = r.code === "404";
  say(gone, `/${p} → ${r.code}${gone ? " (excluded, as expected)" : " — an old build is being served"}`);
  if (!gone) problems.push(`/${p} should not be uploaded`);
}

try { rmSync(TMP, { force: true }); } catch { /* nothing to clean */ }

console.log("");
if (problems.length) {
  console.error(`deploy-verify: ${problems.length} problem(s) against ${BASE}`);
  for (const p of problems) console.error(` - ${p}`);
  console.error("If a push has just landed, give Cloudflare a minute and run it again.");
  process.exit(1);
}
console.log(`deploy-verify: ${BASE} is running this tree (${checkList.length + MUST_BE_ABSENT.length + 1} checks).`);

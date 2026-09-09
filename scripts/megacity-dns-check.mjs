#!/usr/bin/env node
/* Checks megacityproperties.co.uk's DNS against the record inventory captured
   before anything moved, docs/megacity-old-site/dns-export.txt.

   Run it THREE times on DNS day:

     1. Before touching anything, against the current nameservers, to prove the
        inventory still matches reality:
          node scripts/megacity-dns-check.mjs --ns=ns15.domaincontrol.com

     2. After the records are entered in Cloudflare but BEFORE the nameservers
        are changed at GoDaddy. This is the important one — it asks Cloudflare's
        own nameservers directly, so you can see the new zone answering
        correctly while the live domain is still untouched. Nothing has changed
        for anyone yet, and if a record is missing you simply add it.
          node scripts/megacity-dns-check.mjs --ns=<the nameserver Cloudflare gave you>

     3. After the nameservers change, against public DNS, to confirm the world
        sees it:
          node scripts/megacity-dns-check.mjs

   Querying a named nameserver needs `dig` (macOS and Linux have it). Without
   --ns it uses DNS-over-HTTPS and needs nothing.

   Exit code is 1 if any record marked CRITICAL is wrong. Those are the ones
   carrying Walid's email: lose one and info@, lettings@ and management@ stop. */

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOM = "megacityproperties.co.uk";
const EXPORT = join(ROOT, "docs/megacity-old-site/dns-export.txt");

/* Records that carry email. Everything else is a nuisance if lost; these
   stop the agency receiving enquiries, or stop the email it sends being
   believed. The two _domainkey selectors and _amazonses were missed by the
   first capture and found by Cloudflare's scan — see dns-export.txt. */
const CRITICAL = new Set(["@ MX", "@ TXT", "autodiscover CNAME", "_dmarc TXT",
  "s1._domainkey CNAME", "s2._domainkey CNAME", "_amazonses TXT"]);

const ns = (process.argv.find((a) => a.startsWith("--ns=")) || "").slice(5);
const quiet = process.argv.includes("--quiet");

/* ------------------------------------------------------------ the inventory */

function expected() {
  const rows = [];
  for (const line of readFileSync(EXPORT, "utf8").split("\n")) {
    if (!line.trim() || line.startsWith("#") || line.startsWith("-") || /^NAME\s+TYPE/.test(line)) continue;
    const m = line.match(/^(\S+)\s+(A|AAAA|CNAME|MX|TXT|SRV|CAA|NS)\s+(\d+)\s+(.+?)\s*$/);
    if (m) rows.push({ name: m[1], type: m[2], value: m[4] });
  }
  if (!rows.length) throw new Error("no records parsed from " + EXPORT);
  return rows;
}

/* --------------------------------------------------------------- resolving */

const fqdn = (name) => (name === "@" ? DOM : `${name}.${DOM}`);

function viaDig(name, type) {
  const args = ["+short", "+time=5", "+tries=2", type, fqdn(name)];
  if (ns) args.unshift("@" + ns);
  try {
    return execFileSync("dig", args, { encoding: "utf8" })
      .split("\n").map((s) => s.trim()).filter(Boolean);
  } catch (e) {
    if (e.code === "ENOENT") {
      console.error("dig is not installed, so --ns cannot be used. Run without --ns to use DNS-over-HTTPS,\n" +
        "or run this on a machine with dig (macOS and most Linux have it).");
      process.exit(2);
    }
    return [];
  }
}

const NUM = { A: 1, NS: 2, CNAME: 5, MX: 15, TXT: 16, AAAA: 28, SRV: 33, CAA: 257 };

async function viaDoh(name, type) {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(fqdn(name))}&type=${type}`;
  const res = await fetch(url, { headers: { accept: "application/dns-json" } });
  if (!res.ok) return [];
  const j = await res.json();
  /* the resolver returns every hop of a CNAME chain; only this zone's own
     answers count */
  return (j.Answer || [])
    .filter((a) => a.name.replace(/\.$/, "").toLowerCase() === fqdn(name).toLowerCase() && a.type === NUM[type])
    .map((a) => a.data);
}

const lookup = (name, type) => (ns ? Promise.resolve(viaDig(name, type)) : viaDoh(name, type));

/* Compare loosely enough to survive formatting differences between dig, DoH
   and Cloudflare's editor: trailing dots, quoting, whitespace, case. */
function norm(v) {
  return String(v).trim().replace(/\.$/, "").replace(/^"(.*)"$/s, "$1").replace(/"\s+"/g, "").replace(/\s+/g, " ").toLowerCase();
}

/* ------------------------------------------------------------------- report */

let bad = 0, criticalBad = 0;
const say = (mark, text) => { if (!quiet || mark !== "ok  ") console.log(mark + " " + text); };

const where = ns ? `nameserver ${ns}` : "public DNS (Cloudflare 1.1.1.1)";
console.log(`Checking ${DOM} against ${EXPORT.replace(ROOT + "/", "")}\nSource: ${where}\n`);

for (const r of expected()) {
  const got = await lookup(r.name, r.type);
  const hit = got.some((g) => norm(g) === norm(r.value));
  const key = `${r.name} ${r.type}`;
  const crit = CRITICAL.has(key);
  if (hit) {
    say("ok  ", `${key.padEnd(24)} ${r.value}`);
  } else {
    bad++;
    if (crit) criticalBad++;
    console.log(`${crit ? "STOP" : "MISS"} ${key.padEnd(24)} expected ${r.value}`);
    console.log(`     ${got.length ? "found: " + got.join(" | ") : "nothing at that name"}`);
  }
}

console.log();
if (criticalBad) {
  console.log(`DNS CHECK: ${criticalBad} EMAIL RECORD(S) WRONG — do not change the nameservers.`);
  console.log("Fix these in Cloudflare and run this again. Walid's mailboxes depend on them.");
} else if (bad) {
  console.log(`DNS CHECK: ${bad} non-critical record(s) missing. Email is safe; add them when you can.`);
} else {
  console.log("DNS CHECK: ALL PASS — every record in the inventory answers correctly.");
}
process.exit(criticalBad ? 1 : 0);

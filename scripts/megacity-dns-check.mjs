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

   Needs nothing installed either way: --ns builds its own DNS queries and
   sends them to the nameserver named; without --ns it uses DNS-over-HTTPS.

   --ns PROVES IT REACHED THAT SERVER before reporting anything. It asks for the
   zone's SOA and requires the authoritative bit, then asks the same server
   about bbc.co.uk and requires it NOT to answer. Both halves matter, and they
   are here because of a real failure: run inside one sandbox, node:dns's
   setServers() was quietly ignored and every query was answered locally by a
   recursive resolver. Each run "passed" while reading public DNS — still
   GoDaddy's zone — and calling it Cloudflare's. Step 2 below is the one check
   standing between Walid's mailboxes and a bad switch, so it now refuses to
   report a result it cannot stand behind.

   Exit code is 1 if any record marked CRITICAL is wrong. Those are the ones
   carrying Walid's email: lose one and info@, lettings@ and management@ stop. */

import { readFileSync } from "node:fs";
import { promises as dnsp } from "node:dns";
import { queryRaw, isAuthoritative } from "./lib/dns-raw.mjs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOM = "megacityproperties.co.uk";
const EXPORT = join(ROOT, "docs/megacity-old-site/dns-export.txt");

/* Records that carry email. Everything else is a nuisance if lost; these
   stop the agency receiving enquiries, or stop the email it sends being
   believed.

   Every DKIM selector counts, and they are matched by shape rather than
   listed: the nine on this domain include seven Amazon SES selectors whose
   names are random 32-character strings, so a hand-written list would go stale
   the moment SES issues another one. See dns-export.txt. */
const CRITICAL = new Set(["@ MX", "@ TXT", "autodiscover CNAME", "_dmarc TXT", "_amazonses TXT"]);
const isCritical = (name, type) =>
  CRITICAL.has(`${name} ${type}`) || (type === "CNAME" && /(^|\.)_domainkey(\.|$)/.test(name));

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

/* Asking one named nameserver, and proving we got there. */
let serverIp = null;
async function nameserver() {
  if (serverIp) return serverIp;
  let addrs;
  try {
    addrs = await dnsp.resolve4(ns);
  } catch {
    console.error(`Cannot find the address of nameserver "${ns}". Check the spelling.`);
    process.exit(2);
  }
  for (const ip of addrs) {
    const verdict = await isAuthoritative(DOM, ip);
    if (verdict.ok) { serverIp = ip; return ip; }
    console.error(`  ${ip}: ${verdict.why}`);
  }
  console.error(`
STOP: cannot verify anything against ${ns} from here.

None of its addresses would answer as an authoritative server, so any result
this produced would be whatever a resolver in the way decided to say — which is
public DNS, which is the OLD zone. That would look like a pass and mean nothing.

Run this step from a machine with ordinary outbound DNS. On Windows:

  nslookup -type=MX megacityproperties.co.uk ${ns}
  nslookup -type=TXT megacityproperties.co.uk ${ns}

or run this same script there. Until it passes, do not change the nameservers.`);
  process.exit(2);
}

async function viaNs(name, type) {
  const ip = await nameserver();
  const res = await queryRaw(fqdn(name), type, ip);
  return res.ok ? res.values : [];
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

const lookup = (name, type) => (ns ? viaNs(name, type) : viaDoh(name, type));

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
  const crit = isCritical(r.name, r.type);
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

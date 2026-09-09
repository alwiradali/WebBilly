#!/usr/bin/env node
/* Turns the captured inventory, docs/megacity-old-site/dns-export.txt, into a
   BIND zone file that Cloudflare imports in one action:

     Cloudflare → the zone → DNS → Records → Import and Export → Import DNS
     records → choose the file → leave "Proxy imported DNS records" OFF.

   Why bother, when Cloudflare scans the domain itself? Because the scan does
   not reliably find SRV records, and because typing fourteen records by hand
   — two of them SRV, one of them an SPF string — is the way a mailbox gets
   lost. Importing a file makes the copy exact.

   The file is generated, never edited:

     node scripts/megacity-dns-zonefile.mjs            # write it
     node scripts/megacity-dns-zonefile.mjs --check    # fail if it has drifted

   Two things this fixes that a copy-and-paste would not:

     * SRV targets in the inventory have no trailing dot. In a zone file a name
       without a trailing dot gets $ORIGIN appended, so `sipdir.online.lync.com`
       would silently become `sipdir.online.lync.com.megacityproperties.co.uk.`
       Every name emitted here is fully qualified.
     * The apex A record is kept as it is. During B1 the old website must go on
       serving from 77.68.34.162 — that is the whole point of moving DNS first
       and the website second.

   After importing, prove the new zone before touching the nameservers:
     node scripts/megacity-dns-check.mjs --ns=<a nameserver Cloudflare shows> */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOM = "megacityproperties.co.uk";
const EXPORT = join(ROOT, "docs/megacity-old-site/dns-export.txt");
const ZONE = join(ROOT, `docs/megacity-old-site/${DOM}.zone`);
const rel = (p) => p.replace(ROOT + "/", "");

/* ------------------------------------------------------------ the inventory */

/* Same parse as megacity-dns-check.mjs, so the two can never disagree about
   what the inventory says. */
function inventory() {
  const rows = [];
  for (const line of readFileSync(EXPORT, "utf8").split("\n")) {
    if (!line.trim() || line.startsWith("#") || line.startsWith("-") || /^NAME\s+TYPE/.test(line)) continue;
    const m = line.match(/^(\S+)\s+(A|AAAA|CNAME|MX|TXT|SRV|CAA|NS)\s+(\d+)\s+(.+?)\s*$/);
    if (m) rows.push({ name: m[1], type: m[2], ttl: m[3], value: m[4] });
  }
  if (!rows.length) throw new Error("no records parsed from " + rel(EXPORT));
  return rows;
}

/* --------------------------------------------------------------- formatting */

const fqdn = (name) => (name === "@" ? `${DOM}.` : `${name}.${DOM}.`);
const dotted = (host) => (host.endsWith(".") ? host : host + ".");

/* A hostname anywhere in a record's value has to be fully qualified, or the
   zone file's $ORIGIN is appended to it on import. */
function value(r) {
  if (r.type === "CNAME") return dotted(r.value);
  if (r.type === "MX") {
    const m = r.value.match(/^(\d+)\s+(\S+)$/);
    if (!m) throw new Error("cannot read MX value: " + r.value);
    return `${m[1]} ${dotted(m[2])}`;
  }
  if (r.type === "SRV") {
    const m = r.value.match(/^(\d+)\s+(\d+)\s+(\d+)\s+(\S+)$/);
    if (!m) throw new Error("cannot read SRV value: " + r.value);
    return `${m[1]} ${m[2]} ${m[3]} ${dotted(m[4])}`;
  }
  if (r.type === "TXT") return /^".*"$/s.test(r.value) ? r.value : JSON.stringify(r.value);
  return r.value; /* A, AAAA */
}

function build(rows) {
  const head = [
    `; ${DOM} — the zone exactly as it stood before anything moved to Cloudflare.`,
    `; Generated from ${rel(EXPORT)} by scripts/megacity-dns-zonefile.mjs. Do not edit by hand.`,
    ";",
    "; Import: Cloudflare → DNS → Records → Import and Export → Import DNS records.",
    ";         Leave \"Proxy imported DNS records\" OFF. Every record here is DNS only",
    ";         (grey cloud); an orange cloud on a mail record breaks mail.",
    ";",
    "; The apex A record still points at the old website. That is deliberate: DNS",
    "; moves first and the website second, so nobody notices B1 at all.",
    ";",
    "; SOA and NS records are deliberately absent — Cloudflare writes its own.",
    "",
    `$ORIGIN ${DOM}.`,
    "$TTL 3600",
    "",
  ];
  const w = Math.max(...rows.map((r) => fqdn(r.name).length));
  const body = rows.map((r) => `${fqdn(r.name).padEnd(w)} ${String(r.ttl).padStart(4)} IN ${r.type.padEnd(5)} ${value(r)}`);
  return head.concat(body, "").join("\n");
}

/* --------------------------------------------------------- the round trip */

/* Read the generated file back the way a nameserver would, and prove it still
   says what the inventory says. A zone file that quietly means something else
   is exactly the failure this script exists to prevent. */
function readBack(text) {
  const rows = [];
  for (const line of text.split("\n")) {
    if (!line.trim() || line.startsWith(";") || line.startsWith("$")) continue;
    const m = line.match(/^(\S+)\s+(\d+)\s+IN\s+(A|AAAA|CNAME|MX|TXT|SRV|CAA)\s+(.+?)\s*$/);
    if (!m) throw new Error("generated a line no parser would accept: " + line);
    rows.push({ name: m[1], type: m[3], value: m[4] });
  }
  return rows;
}

const norm = (v) => String(v).trim().replace(/\.$/, "").replace(/^"(.*)"$/s, "$1").replace(/\s+/g, " ").toLowerCase();

function verify(rows, text) {
  const got = readBack(text);
  if (got.length !== rows.length) throw new Error(`${rows.length} records in, ${got.length} out`);
  rows.forEach((r, i) => {
    const g = got[i];
    if (g.name !== fqdn(r.name)) throw new Error(`${r.name} ${r.type}: emitted as ${g.name}`);
    if (g.type !== r.type) throw new Error(`${r.name}: type became ${g.type}`);
    if (norm(g.value) !== norm(r.value)) throw new Error(`${r.name} ${r.type}: ${r.value} became ${g.value}`);
    /* every hostname the record points at must be absolute */
    for (const host of (g.value.match(/[a-z0-9_-]+(?:\.[a-z0-9_-]+){2,}\.?/gi) || [])) {
      if (r.type === "TXT" || r.type === "A" || r.type === "AAAA") continue;
      if (!host.endsWith(".")) throw new Error(`${r.name} ${r.type}: "${host}" is relative — $ORIGIN would be appended to it`);
    }
  });
}

/* ------------------------------------------------------------------- run it */

const rows = inventory();
const text = build(rows);
verify(rows, text);

if (process.argv.includes("--check")) {
  let on_disk = null;
  try { on_disk = readFileSync(ZONE, "utf8"); } catch { /* not written yet */ }
  if (on_disk !== text) {
    console.log(`ZONE FILE: ${rel(ZONE)} does not match ${rel(EXPORT)}.`);
    console.log("Run: node scripts/megacity-dns-zonefile.mjs");
    process.exit(1);
  }
  console.log(`ZONE FILE: in step with ${rel(EXPORT)} (${rows.length} records).`);
  process.exit(0);
}

writeFileSync(ZONE, text);
console.log(`Wrote ${rel(ZONE)} — ${rows.length} records, every name fully qualified.`);
console.log("Import it at: Cloudflare → DNS → Records → Import and Export → Import DNS records.");
console.log("Leave \"Proxy imported DNS records\" OFF.");

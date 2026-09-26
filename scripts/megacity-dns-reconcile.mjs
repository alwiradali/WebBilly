#!/usr/bin/env node
/* Reconciles the inventory against the registrar's own export of the zone.

   This is the only check in the set that can prove the inventory is COMPLETE.
   Everything else asks DNS for names somebody thought of, and DNS has no "list
   the zone" query, so a record nobody guessed simply does not appear. That is
   not theoretical here: the first capture found 14 records, Cloudflare's scan
   raised it to 17, and GoDaddy's own page turned out to hold 33 — the gap being
   seven Amazon SES DKIM selectors whose names are random 32-character strings.

   Get the export from GoDaddy → the domain → DNS → Actions → Export, save it
   into docs/megacity-old-site/, and point this at it:

     node scripts/megacity-dns-reconcile.mjs [path to the export]

   Exit code is 1 if the two disagree in either direction. Re-export and re-run
   it whenever the zone is touched, and always before the nameservers move.

   SOA and apex NS records are ignored on purpose: they say who serves the zone,
   Cloudflare writes its own, and copying GoDaddy's would be actively wrong. */

import { readFileSync } from "node:fs";
const D = "megacityproperties.co.uk";
const norm = (v) => String(v).trim().replace(/\.$/, "").replace(/^"(.*)"$/s, "$1").replace(/\s+/g, " ").toLowerCase();

/* GoDaddy's export. Its own quirks: "@" means the origin, a name may be written
   with the origin already appended, and SRV names arrive as "_sip._tls.@". */
function parseExport(path) {
  const rows = [];
  for (const raw of readFileSync(path, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith(";") || line.startsWith("$")) continue;
    const m = line.match(/^(\S+)\s+(\d+)\s+IN\s+(A|AAAA|CNAME|MX|TXT|SRV|NS|SOA)\s+(.+?)\s*$/i);
    if (!m) continue;
    let [, name, ttl, type, value] = m;
    type = type.toUpperCase();
    name = name.replace(/\.@$/, "").replace(new RegExp("\\.?" + D.replace(/\./g, "\\.") + "\\.$"), "");
    if (name === "@") name = "@";
    if (value === "@") value = D + ".";
    rows.push({ name, type, ttl, value: value.replace(/\s+/g, " ") });
  }
  return rows;
}

function parseInventory(path) {
  const rows = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim() || line.startsWith("#") || line.startsWith("-") || /^NAME\s+TYPE/.test(line)) continue;
    const m = line.match(/^(\S+)\s+(A|AAAA|CNAME|MX|TXT|SRV|CAA|NS)\s+(\d+)\s+(.+?)\s*$/);
    if (m) rows.push({ name: m[1], type: m[2], ttl: m[3], value: m[4] });
  }
  return rows;
}

const key = (r) => `${norm(r.name)} ${r.type} ${norm(r.value)}`;
const given = process.argv[2] || "docs/megacity-old-site/godaddy-export-2026-09-16.txt";
const exp = parseExport(given);
const inv = parseInventory("docs/megacity-old-site/dns-export.txt");

/* SOA and NS at the apex describe who serves the zone. Cloudflare writes its
   own, and copying GoDaddy's would be actively wrong. */
const infra = (r) => r.type === "SOA" || (r.type === "NS" && r.name === "@");
const expReal = exp.filter((r) => !infra(r));

console.log(`Export         : ${given}`);
console.log(`GoDaddy export : ${exp.length} records (${exp.length - expReal.length} of them SOA/NS, which Cloudflare writes itself)`);
console.log(`Inventory      : ${inv.length} records\n`);

const invKeys = new Set(inv.map(key));
const expKeys = new Set(expReal.map(key));

const missing = expReal.filter((r) => !invKeys.has(key(r)));
const extra = inv.filter((r) => !expKeys.has(key(r)));

if (missing.length) { console.log("IN GODADDY, NOT IN THE INVENTORY:"); for (const r of missing) console.log(`  ${r.name} ${r.type} ${r.value}`); }
if (extra.length) { console.log("IN THE INVENTORY, NOT IN GODADDY:"); for (const r of extra) console.log(`  ${r.name} ${r.type} ${r.value}`); }

/* TTLs differing is not a fault — Cloudflare uses Auto — but worth seeing. */
const ttlDiff = [];
for (const r of expReal) {
  const mate = inv.find((i) => norm(i.name) === norm(r.name) && i.type === r.type && norm(i.value) === norm(r.value));
  if (mate && mate.ttl !== r.ttl) ttlDiff.push(`  ${r.name} ${r.type}: export ${r.ttl}, inventory ${mate.ttl}`);
}
if (ttlDiff.length) { console.log("\nTTL differences (cosmetic):"); console.log(ttlDiff.join("\n")); }

console.log();
console.log(!missing.length && !extra.length
  ? "RECONCILED: the inventory matches GoDaddy's own export exactly, record for record."
  : `NOT RECONCILED: ${missing.length} missing, ${extra.length} unexplained.`);
process.exit(missing.length || extra.length ? 1 : 0);

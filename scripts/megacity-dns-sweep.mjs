#!/usr/bin/env node
/* Looks for records in megacityproperties.co.uk that the inventory does not
   know about.

   megacity-dns-check.mjs proves every record we know about is present. It
   cannot prove there is nothing else, because DNS has no "list the zone"
   query: you can only ask for a name and see whether it answers. That is
   exactly how the first capture missed the two SendGrid DKIM selectors and the
   Amazon SES verification — three email records nobody had thought to ask for.

   This asks for several hundred names that services commonly use, straight at
   an authoritative nameserver (which answers NXDOMAIN for anything not in the
   zone, so there is no cache to fool us), and reports anything that answers
   and is not in docs/megacity-old-site/dns-export.txt.

     node scripts/megacity-dns-sweep.mjs --ns=ns15.domaincontrol.com   # GoDaddy, before
     node scripts/megacity-dns-sweep.mjs --ns=aaron.ns.cloudflare.com  # Cloudflare, after

   Run it against both and the two lists must agree. A name that answers at
   GoDaddy and not at Cloudflare is a record that would be lost at the switch.

   This still does not *prove* completeness — nothing queried from outside can.
   GoDaddy's own DNS page is the only authoritative list, and it should be read
   before the nameservers change. This narrows the gap; it does not close it. */

import { readFileSync } from "node:fs";
import { Resolver, promises as dnsp } from "node:dns";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOM = "megacityproperties.co.uk";
const EXPORT = join(ROOT, "docs/megacity-old-site/dns-export.txt");

const ns = (process.argv.find((a) => a.startsWith("--ns=")) || "").slice(5);
if (!ns) {
  console.error("Give a nameserver to ask, e.g. --ns=ns15.domaincontrol.com");
  console.error("Ask an authoritative one: a recursive resolver's cache can hide a name.");
  process.exit(2);
}

/* ------------------------------------------------------------- what to ask */

const HOSTS = [
  /* the web */
  "www", "web", "www2", "m", "mobile", "blog", "shop", "store", "portal", "app", "apps", "api",
  "cdn", "static", "assets", "img", "images", "media", "files", "download", "downloads",
  "dev", "test", "testing", "staging", "stage", "beta", "demo", "preview", "old", "new", "legacy",
  "admin", "login", "secure", "my", "account", "accounts", "client", "clients", "customer",
  "intranet", "extranet", "internal", "private", "public", "support", "help", "helpdesk",
  "docs", "wiki", "status", "monitor", "stats", "analytics", "track", "tracking", "go", "link",
  /* letting-agency and property software */
  "properties", "property", "lettings", "sales", "search", "book", "booking", "viewings",
  "tenant", "tenants", "landlord", "landlords", "maintenance", "repairs", "payments", "pay",
  "10ninety", "tenninety", "feed", "feeds", "xml", "data", "sync",
  /* mail */
  "mail", "mail2", "email", "webmail", "smtp", "smtp2", "imap", "pop", "pop3", "mx", "mx1", "mx2",
  "relay", "mailgate", "spam", "autoconfig", "autodiscover", "exchange", "owa", "outlook",
  "newsletter", "news", "mailer", "mailing", "bounce", "bounces", "em", "e", "click", "clicks",
  "sendgrid", "mailchimp", "mandrill", "postmark", "sparkpost",
  /* Microsoft 365 and Teams */
  "sip", "lyncdiscover", "msoid", "enterpriseregistration", "enterpriseenrollment",
  "teams", "skype", "sharepoint", "onedrive", "office",
  /* hosting and infrastructure */
  "ftp", "sftp", "ssh", "cpanel", "whm", "plesk", "webdisk", "server", "host", "ns", "ns1", "ns2",
  "vpn", "remote", "rdp", "gateway", "firewall", "router", "proxy", "db", "database", "sql",
  "backup", "backups", "archive", "git", "svn", "jenkins", "ci",
  /* telephony */
  "voip", "pbx", "phone", "call", "calls", "sms",
  /* calendars and misc */
  "calendar", "cal", "meet", "video", "conference", "chat", "forum", "community", "events",
];

/* Names that only ever carry TXT: verifications, DKIM selectors, policy records. */
const TXT_ONLY = [
  "_dmarc", "_domainkey", "_amazonses", "_acme-challenge", "_mta-sts", "mta-sts", "_smtp._tls",
  "_github-challenge", "_github-pages-challenge", "_atproto", "_pki-validation",
  "default._domainkey", "dkim._domainkey", "mail._domainkey", "email._domainkey",
  "k1._domainkey", "k2._domainkey", "k3._domainkey",
  "s1._domainkey", "s2._domainkey", "s3._domainkey",
  "selector1._domainkey", "selector2._domainkey",
  "google._domainkey", "zoho._domainkey", "mandrill._domainkey", "pm._domainkey",
  "smtpapi._domainkey", "sig1._domainkey", "protonmail._domainkey", "protonmail2._domainkey",
  "fm1._domainkey", "fm2._domainkey", "fm3._domainkey", "mte1._domainkey", "mte2._domainkey",
  "_domainconnect", "_psl", "_dnsauth", "_globalsign-domain-verification",
];

const SRV_NAMES = [
  "_sip._tls", "_sipfederationtls._tcp", "_sips._tcp", "_sip._tcp", "_sip._udp",
  "_xmpp-server._tcp", "_xmpp-client._tcp", "_autodiscover._tcp", "_imaps._tcp", "_submission._tcp",
  "_caldav._tcp", "_caldavs._tcp", "_carddav._tcp", "_carddavs._tcp", "_ldap._tcp", "_kerberos._tcp",
];

/* --------------------------------------------------------------- resolving */

const fqdn = (name) => (name === "@" ? DOM : `${name}.${DOM}`);

let resolver = null;
async function server() {
  if (resolver) return resolver;
  let addrs;
  try {
    addrs = await dnsp.resolve4(ns);
  } catch {
    console.error(`Cannot find the address of nameserver "${ns}". Check the spelling.`);
    process.exit(2);
  }
  resolver = new Resolver({ timeout: 5000, tries: 2 });
  resolver.setServers(addrs);
  return resolver;
}

const FN = { A: "resolve4", CNAME: "resolveCname", MX: "resolveMx", SRV: "resolveSrv", TXT: "resolveTxt" };

/* "No such record" and "the server did not answer" are completely different
   results, and a sweep that treats them the same reports an empty zone when it
   is really being rate-limited. NOTFOUND and NODATA are answers. Anything else
   — a timeout, SERVFAIL, a refusal — is retried, and if it still will not
   answer it is counted as unknown rather than quietly passed off as absent. */
const DEFINITIVE = new Set(["ENOTFOUND", "ENODATA"]);

function shape(type, out) {
  if (type === "MX") return out.map((m) => `${m.priority} ${m.exchange}`);
  if (type === "SRV") return out.map((s) => `${s.priority} ${s.weight} ${s.port} ${s.name}`);
  if (type === "TXT") return out.map((p) => p.join(""));
  return out;
}

async function ask(name, type, tries = 4) {
  const r = await server();
  const n = fqdn(name);
  for (let i = 0; i < tries; i++) {
    const res = await new Promise((done) => r[FN[type]](n, (err, out) => done({ err, out })));
    if (!res.err) return { values: shape(type, res.out), answered: true };
    if (DEFINITIVE.has(res.err.code)) return { values: [], answered: true };
    await new Promise((s) => setTimeout(s, 250 * (i + 1)));
  }
  return { values: [], answered: false };
}

/* ------------------------------------------------------------- the known set */

function known() {
  const set = new Set();
  for (const line of readFileSync(EXPORT, "utf8").split("\n")) {
    if (!line.trim() || line.startsWith("#") || line.startsWith("-") || /^NAME\s+TYPE/.test(line)) continue;
    const m = line.match(/^(\S+)\s+(A|AAAA|CNAME|MX|TXT|SRV|CAA|NS)\s+(\d+)\s+(.+?)\s*$/);
    if (m) set.add(`${m[1]} ${m[2]}`);
  }
  return set;
}

/* ------------------------------------------------------------------- run it */

const KNOWN = known();
const jobs = [];
for (const h of HOSTS) for (const t of ["A", "CNAME", "TXT"]) jobs.push([h, t]);
for (const h of TXT_ONLY) for (const t of ["TXT", "CNAME"]) jobs.push([h, t]);
for (const h of SRV_NAMES) jobs.push([h, "SRV"]);
for (const t of ["A", "CNAME", "TXT", "MX"]) jobs.push(["@", t]);

console.log(`Sweeping ${DOM} at ${ns} — ${jobs.length} lookups.`);
console.log(`Anything that answers and is not in ${EXPORT.replace(ROOT + "/", "")} is listed below.\n`);

const found = [];
const unanswered = [];
const LANES = 4; /* gentle: a nameserver that thinks it is being scanned starts dropping queries */
let next = 0;
await Promise.all(Array.from({ length: LANES }, async () => {
  for (;;) {
    const i = next++;
    if (i >= jobs.length) return;
    const [name, type] = jobs[i];
    const got = await ask(name, type);
    if (!got.answered) unanswered.push(`${name} ${type}`);
    else if (got.values.length) found.push({ name, type, values: got.values });
  }
}));

/* A resolver follows CNAMEs, so asking for "www A" hands back whatever the
   CNAME target resolves to and asking for "s2._domainkey TXT" hands back
   SendGrid's key. Neither is a record in this zone. Where a name has a CNAME,
   the CNAME is the only record it has. */
const hasCname = new Set(found.filter((f) => f.type === "CNAME").map((f) => f.name));
const chained = found.filter((f) => f.type !== "CNAME" && hasCname.has(f.name));
const real = found.filter((f) => f.type === "CNAME" || !hasCname.has(f.name));

real.sort((a, b) => (a.name + a.type).localeCompare(b.name + b.type));
const found_before = found.length;
found.length = 0;
found.push(...real);

let surprises = 0;
for (const f of found) {
  const key = `${f.name} ${f.type}`;
  if (KNOWN.has(key)) continue;
  surprises++;
  console.log(`NEW  ${key.padEnd(26)} ${f.values.join(" | ")}`);
}

/* Which inventory entries this sweep did NOT see. megacity-dns-check.mjs is
   the authority on whether a record is present — but if the sweep cannot see
   records it is being told to look for, its silence about everything else is
   not worth much either. */
const seen = new Set(found.map((f) => `${f.name} ${f.type}`));
const missed = [...KNOWN].filter((k) => !seen.has(k));

console.log();
console.log(`${found_before} name/type pairs answered. ${chained.length} of those were a CNAME target's own`);
console.log(`records showing through the chain, not records in this zone, and were ignored:`);
console.log(`  ${[...new Set(chained.map((c) => `${c.name} ${c.type}`))].join(", ") || "none"}`);
console.log(`That leaves ${found.length} real record(s), of which ${found.length - surprises} are in the inventory.`);

if (unanswered.length) {
  console.log(`\n${unanswered.length} lookup(s) never got an answer, so this sweep is INCOMPLETE:`);
  console.log(`  ${unanswered.slice(0, 12).join(", ")}${unanswered.length > 12 ? ", …" : ""}`);
  console.log("Run it again. A record could be hiding behind any of those.");
}
if (missed.length) {
  console.log(`\nThe sweep did not see ${missed.length} record(s) it knows exist: ${missed.join(", ")}`);
  console.log("If those are not explained by the line above, this sweep's result cannot be trusted.");
}

console.log();
if (surprises) {
  console.log(`SWEEP: ${surprises} record(s) the inventory does not know about. Add them to dns-export.txt,`);
  console.log("regenerate the zone file, and put them in Cloudflare before the nameservers change.");
} else if (unanswered.length || missed.length) {
  console.log("SWEEP: no surprises found, but the sweep did not complete — do not read that as a clean result.");
} else {
  console.log("SWEEP: complete, and nothing found that the inventory does not already have.");
}
console.log("\nThis narrows the gap. It does not close it — read GoDaddy's own DNS page too.");
process.exit(surprises || unanswered.length || missed.length ? 1 : 0);

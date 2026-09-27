#!/usr/bin/env node
/* Proves every public form reaches the inbox the agency asked for.

   Walid's rule, given 2026-09-19: everything a tenant sends goes to lettings@,
   everything else goes to info@, which he reads himself. Repairs are the single
   exception — management@ exists for them.

   This is worth a test rather than a careful read, for two reasons. An enquiry
   arriving in the wrong inbox does not look like a fault: the message is
   delivered, it is well formed, and the only symptom is that the wrong person
   answers it, or nobody does. And with the database unbound the email IS the
   enquiry — nothing else records that it happened — so a misroute is a lost
   instruction, not a misfiled one.

     node scripts/megacity-enquiry-routing-check.mjs

   Exit code 1 on any disagreement. */

import { ROUTE, kindFromTopic, OFFICE_TO, LETTINGS_TO, MANAGEMENT_TO } from "../worker/studio/enquiries.js";

const INBOX = { [OFFICE_TO]: "info@", [LETTINGS_TO]: "lettings@", [MANAGEMENT_TO]: "management@" };
const show = (list) => list.map((a) => INBOX[a] || a).join(" + ");

let bad = 0;
const check = (what, got, want) => {
  const g = show(got), w = show(want);
  if (g === w) { console.log(`ok   ${what.padEnd(46)} ${g}`); return; }
  bad++;
  console.log(`FAIL ${what.padEnd(46)} ${g}   (wanted ${w})`);
};

/* ---- the forms, each of which names its own kind in worker.js ------------ */

console.log("Every form, by the kind it asks for:\n");
for (const [kind, want] of [
  ["viewing", [LETTINGS_TO]],
  ["register", [LETTINGS_TO]],
  ["application", [LETTINGS_TO]],
  ["tour", [LETTINGS_TO]],
  ["landlord", [OFFICE_TO]],
  ["valuation", [OFFICE_TO]],
  ["maintenance", [MANAGEMENT_TO]],
]) {
  check(kind, ROUTE[kind] || [], want);
}

/* ---- the contact form, whose inbox depends on the "About" the sender picked */

/* These six are the options in templates/megacity-contact.html, verbatim. If
   that list is edited, this test should be edited with it — a new topic falls
   through to info@, which is the safe direction but not always the right one. */
console.log("\nThe contact form, by what the sender picked:\n");
for (const [topic, want] of [
  ["Renting a home", [LETTINGS_TO]],
  ["Letting my property", [OFFICE_TO]],
  ["Property management", [OFFICE_TO]],
  ["Commercial property", [OFFICE_TO]],
  ["Maintenance", [MANAGEMENT_TO]],
  ["Something else", [OFFICE_TO]],
]) {
  check(`"${topic}"`, ROUTE[kindFromTopic(topic)] || [], want);
}

/* ---- the traps ----------------------------------------------------------- */

/* "current" contains "rent". A regex without word boundaries sends a landlord
   describing their current tenancy straight to the tenant inbox. */
console.log("\nWords that look like other words:\n");
for (const [topic, want] of [
  ["My current agent is letting me down", [OFFICE_TO]],
  ["Parental guarantor question", [OFFICE_TO]],
  ["Property management", [OFFICE_TO]],
]) {
  check(`"${topic}"`, ROUTE[kindFromTopic(topic)] || [], want);
}

/* ---- the rule itself, stated as two absolutes --------------------------- */

console.log("\nThe rule, both ways round:\n");
const TENANT_FORMS = ["viewing", "register", "application", "tour", "contact-tenant"];
const OFFICE_FORMS = ["landlord", "valuation", "contact"];

for (const k of TENANT_FORMS) {
  const r = ROUTE[k] || [];
  if (r.includes(OFFICE_TO)) { bad++; console.log(`FAIL ${k} reaches info@ — Walid reads that himself`); }
  else console.log(`ok   ${k.padEnd(46)} never reaches info@`);
}
for (const k of OFFICE_FORMS) {
  const r = ROUTE[k] || [];
  if (r.includes(LETTINGS_TO)) { bad++; console.log(`FAIL ${k} reaches lettings@ — that is the tenant inbox`); }
  else console.log(`ok   ${k.padEnd(46)} never reaches lettings@`);
}

/* Every route must actually go somewhere. An empty list sends the enquiry
   nowhere at all, and with no database bound nothing would record that it
   ever arrived. */
for (const [kind, list] of Object.entries(ROUTE)) {
  if (!Array.isArray(list) || !list.length) { bad++; console.log(`FAIL ${kind} has no inbox at all`); }
}

console.log();
if (bad) {
  console.log(`ENQUIRY ROUTING: ${bad} wrong. Enquiries would reach the wrong person.`);
  process.exit(1);
}
console.log("ENQUIRY ROUTING: ALL PASS — every form reaches the inbox the agency asked for.");

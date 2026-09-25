#!/usr/bin/env node
/* Enquiries going INTO 10ninety, against the shapes their docs specify.
 *
 * The rule under all of it: a person filling in a form on a letting agent's
 * website must never see a failure that belongs to a third party. So the body
 * builders are pure and tested here, and the senders never throw.
 *
 *   node scripts/megacity-lead-check.mjs
 */
import { leadBody, maintenanceBody, splitName, sendLead, sendMaintenance, ROLE_FOR } from "../worker/studio/tenninety-lead.js";

let bad = 0;
const ok = (c, what) => { console.log((c ? "ok   " : "FAIL ") + what); if (!c) bad++; };

/* ── which of our forms becomes which of their roles ──────────────────────── */

ok(ROLE_FOR.landlord === "Landlord", "a landlord registration is a Landlord lead");
ok(ROLE_FOR.valuation === "Landlord", "a valuation request is a Landlord lead — it is a landlord asking");
ok(ROLE_FOR.register === "Tenant" && ROLE_FOR.viewing === "Tenant", "tenant registrations and viewings are Tenant leads");
ok(!ROLE_FOR.contact, "a general contact form has no role until a person reads it, so it is not sent");
ok(!ROLE_FOR.maintenance, "a repair is not a lead");
ok(leadBody({ kind: "contact", name: "A B", email: "a@b.c" }) === null, "and that really does produce nothing");

/* ── their required fields ────────────────────────────────────────────────── */

const base = { kind: "register", name: "Jane Smith", email: "jane@example.com" };
const b = leadBody(base);
ok(b.ContactRoleType === "Tenant", "role is set");
ok(b.Firstname === "Jane" && b.Surname === "Smith", "the name is split for them rather than left to be guessed");
ok(splitName("Cher").Surname === "Cher" && !splitName("Cher").Firstname, "one word becomes a surname — their rule needs one of the three");
ok(splitName("Mary Jane Watson").Surname === "Jane Watson", "a middle name stays with the surname rather than being dropped");
ok(leadBody({ kind: "register", email: "a@b.c" }) === null, "no name at all is not sent — they would reject it");
ok(leadBody({ kind: "register", name: "Jane Smith" }) === null, "no email AND no phone is not sent — a lead nobody can answer");
ok(leadBody({ ...base, email: undefined, phone: "07123 456789" }) !== null, "a phone alone is enough");

/* ── the two things that make this better than an email ───────────────────── */

const v = leadBody({ kind: "viewing", name: "Sam Patel", phone: "07000 000000",
  propertyRef: "RL0142", message: "Can I view on Saturday?", preferredDay: "Saturday morning", formLabel: "Viewing request" });
ok(v.PropertyReference === "RL0142", "a viewing carries the property reference, so it attaches to the property");
ok(/Saturday morning/.test(v.AdditionalInfo), "what the visitor actually wrote is carried, not summarised away");
ok(/megacityproperties\.co\.uk/.test(v.AdditionalInfo), "and where it came from, so the office is not guessing");

const vn = leadBody({ kind: "viewing", name: "Sam Patel", phone: "07000 000000", property: "2 bed apartment, Ladywell Point" });
ok(/^Property: 2 bed apartment, Ladywell Point/.test(vn.AdditionalInfo), "a viewing names the home in words too — a reference only helps if it matches his");
const cn = leadBody({ kind: "contact-tenant", name: "Sam Patel", phone: "07000 000000", property: "Renting a home" });
ok(!/Property:/.test(cn.AdditionalInfo), "the contact form's topic is not mistaken for a home");
ok(ROLE_FOR["contact-landlord"] === "Landlord" && ROLE_FOR["contact-tenant"] === "Tenant", "the contact form's landlord and tenant topics have roles");

const l = leadBody({ kind: "landlord", name: "Ann Owner", email: "a@o.uk",
  address1: "12 Example Street", town: "Salford", postcode: "M6 7EW" });
ok(l.ContactRoleType === "Landlord" && l.Address.Postcode === "M6 7EW", "a landlord's property address goes in the Address object");

/* ── maintenance ──────────────────────────────────────────────────────────── */

const m = maintenanceBody({ name: "Tenant Name", email: "t@e.st", problem: "Leak",
  subOption: "Gutter", message: "The gutter leaks when it rains", propertyAddress: "12 Example Street, Salford" });
ok(m.Problem === "Leak" && m.SubOption === "Gutter" && m.PropertyAddress, "a repair carries their five required fields");
ok(maintenanceBody({ name: "X", email: "x@y.z", message: "broken" }) === null, "a repair with no address is not sent — nobody could act on it");
ok(maintenanceBody({ name: "X", problem: "Leak", message: "m", propertyAddress: "a" }) === null, "nor one with no way to reply");
const m2 = maintenanceBody({ name: "X", email: "x@y.z", problem: "Heating", message: "no heat", propertyAddress: "a" });
ok(m2.SubOption === "Heating", "SubOption is required by them, so it falls back to the problem rather than being omitted");

/* ── it must never take the visitor down with it ──────────────────────────── */

const envNoKey = {};
ok((await sendLead(envNoKey, base)).ok === false, "no key configured fails quietly rather than throwing");

const exploding = { TENNINETY_OPEN_API_KEY: "k" };
const boom = async () => { throw new Error("network on fire"); };
ok((await sendLead(exploding, base, { fetch: boom })).ok === false, "a network failure is caught, not raised at the visitor");
ok((await sendMaintenance(exploding, { name: "X", email: "x@y.z", problem: "P", message: "m", propertyAddress: "a" }, { fetch: boom })).ok === false,
  "same for a maintenance report");

/* They answer 200 with IsSuccessful:false, so the status code is not enough. */
const rejects = async () => new Response(JSON.stringify({ IsSuccessful: false, ErrorMessage: "Duplicate" }), { status: 200 });
ok((await sendLead(exploding, base, { fetch: rejects })).ok === false, "a 200 carrying IsSuccessful:false is a failure, not a success");
const accepts = async () => new Response(JSON.stringify({ IsSuccessful: true, ErrorMessage: null, Name: "Jane Smith", Id: 56 }), { status: 200 });
const good = await sendLead(exploding, base, { fetch: accepts });
ok(good.ok === true && good.id === "56", "a real success returns their record id, so it can be written on the enquiry");

/* When their host fails it answers a 302 to an HTML error page that says 200.
   Followed, that looked like a delivered lead; it must read as a failure. */
const redirects = async (u, init) => { ok(init.redirect === "manual", "redirects are not followed"); return new Response("", { status: 302, headers: { location: "/Error" } }); };
ok((await sendLead(exploding, base, { fetch: redirects })).ok === false, "a 302 to their error page is a failure, not a success");
const htmlPage = async () => new Response("<html>Log on</html>", { status: 200, headers: { "content-type": "text/html" } });
ok((await sendLead(exploding, base, { fetch: htmlPage })).ok === false, "a 200 that is a web page rather than their JSON is not a success either");

console.log();
console.log(bad ? `10NINETY LEADS: ${bad} FAILED` : "10NINETY LEADS: ALL PASS — and a visitor never sees 10ninety fail.");
process.exit(bad ? 1 : 0);

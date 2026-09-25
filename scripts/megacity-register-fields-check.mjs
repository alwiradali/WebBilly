#!/usr/bin/env node
/* Do our registration forms ask for everything his old ones did?
 *
 * Walid's instruction: capture the exact same details as the 10ninety forms
 * on his old site. Those forms are the reference, so their fields are written
 * down here — read off the live pages on 25 September, not guessed from
 * screenshots — and each one must have a home on ours.
 *
 * Two of his fields are deliberately NOT carried over, and the reasons are
 * asserted rather than left to memory:
 *   - the tenant form's "Service Option" offers landlord services (Tenant
 *     Find, Rent Collection…) to a tenant: 10ninety reusing one partial
 *   - on both forms "Rental Valuation" and "Not Sure" submit the value
 *     "Switching Agent", so his old site records either as a switch
 *
 *   node scripts/megacity-register-fields-check.mjs
 */
import { readFileSync } from "node:fs";
import { leadBody } from "../worker/studio/tenninety-lead.js";

let bad = 0;
const ok = (c, what) => { console.log((c ? "ok   " : "FAIL ") + what); if (!c) bad++; };

const html = (f) => readFileSync(new URL("../templates/" + f, import.meta.url), "utf8");
const formOf = (page, marker) => { const s = html(page); const a = s.indexOf(marker); return s.slice(a, s.indexOf("</form>", a)); };
const names = (form) => new Set([...form.matchAll(/name="([A-Za-z0-9]+)"/g)].map((m) => m[1]));
const values = (form, name) => [...form.matchAll(new RegExp('name="' + name + '"[^>]*value="([^"]*)"', "g"))].map((m) => m[1].replace(/&amp;/g, "&"));

/* ── tenants ─────────────────────────────────────────────────────────────── */
{
  const f = formOf("megacity-renting.html", "data-register");
  const have = names(f);
  const THEIRS = {
    "Contact.TitleRefId": "title", "Contact.Firstname": "firstName", "Contact.Surname": "surname",
    "Contact.Email": "email", "Contact.MobilePhoneNumber": "phone",
    "Contact.Address.Address1": "address1", "Contact.Address.Address2": "address2",
    "Contact.Address.Town": "town", "Contact.Address.County": "county", "Contact.Address.Postcode": "postcode",
    "minbeds": "bedrooms", "MinPrice": "minPrice", "MaxPrice": "maxPrice", "areaIds": "areas",
    "PropTypeRefIds": "propertyTypes", "FurnishingTypeRefIds": "furnishing",
    "Comments (textarea)": "message", "subscribeEmail": "alerts",
  };
  for (const [theirs, ours] of Object.entries(THEIRS)) ok(have.has(ours), `tenant: ${theirs} -> ${ours}`);

  ok(JSON.stringify(values(f, "areas")) === JSON.stringify(["Bury", "Manchester City Centre", "Salford", "Stockport"]),
    "tenant: the same four areas, in the same order");
  ok(values(f, "propertyTypes").length === 11 && values(f, "propertyTypes").includes("Semi-Detached House"),
    "tenant: all eleven property types");
  ok(JSON.stringify(values(f, "furnishing")) === JSON.stringify(["Fully", "Furnished/unfurnished", "Part", "Unfurnished", "Unfurnished + white appliances"]),
    "tenant: the same five furnishing options, worded as his were");
  ok(values(f, "bedrooms").join(",") === "1,2,3,4,5,6,7,8,9,10+", "tenant: bedrooms 1 to 10+");
  const prices = [...f.slice(f.indexOf('name="minPrice"'), f.indexOf("</select>", f.indexOf('name="minPrice"'))).matchAll(/value="(\d+)"/g)].map((m) => +m[1]);
  ok(prices.length === 21 && prices[0] === 100 && prices[20] === 5000, `tenant: the same 21 price steps, £100 to £5,000 (${prices.length})`);
  ok(!have.has("service") && !/Tenant Find|Rent Collection/.test(f),
    "tenant: no landlord 'Service Option' — his tenant form offered landlord services to tenants");
}

/* ── landlords ───────────────────────────────────────────────────────────── */
{
  const f = formOf("megacity-for-landlords.html", "data-landlord");
  const have = names(f);
  for (const [theirs, ours] of Object.entries({ "Contact.TitleRefId": "title", "Contact.Firstname": "firstName",
    "Contact.Surname": "surname", "Contact.Email": "email", "Contact.MobilePhoneNumber": "phone", "Comments (Service Option)": "service" }))
    ok(have.has(ours), `landlord: ${theirs} -> ${ours}`);

  const svc = [...f.slice(f.indexOf('id="lrService"'), f.indexOf("</select>", f.indexOf('id="lrService"'))).matchAll(/value="([^"]*)"/g)].map((m) => m[1]);
  for (const s of ["Tenant Find", "Rent Collection", "Full Management", "HMO Management", "Switching Agent", "Rental Valuation", "Not sure"])
    ok(svc.some((v) => v.startsWith(s)), `landlord: service '${s}' is offered`);
  ok(new Set(svc).size === svc.length, "landlord: every service option submits its OWN value");
  ok(svc.filter((v) => v === "Switching Agent").length === 1,
    "landlord: 'Rental Valuation' and 'Not sure' are not recorded as a switch, as they are on his old form");

  /* the richer parts of ours stay: his asked for less than we already did */
  for (const n of ["address", "postcode", "area", "propertyType", "bedrooms", "rent"]) ok(have.has(n), `landlord: still asks for ${n}`);
}

/* ── what 10ninety is sent ───────────────────────────────────────────────── */
{
  const b = leadBody({ kind: "register", firstName: "Mary Anne", surname: "Smith", name: "Mary Anne Smith",
    email: "m@example.com", phone: "07700900123", areaNames: ["Salford", "Bury"], address1: "1 High St", town: "Salford", postcode: "M6 1AA" });
  ok(b.Firstname === "Mary Anne" && b.Surname === "Smith",
    `the names go to 10ninety as given, not re-split (${b.Firstname} / ${b.Surname})`);
  ok(b.ContactRoleType === "Tenant", "a tenant registration becomes a Tenant lead");
  ok(JSON.stringify(b.AreaNames) === JSON.stringify(["Salford", "Bury"]), "with the areas they ticked");
  ok(b.Address && b.Address.Town === "Salford" && b.Address.Postcode === "M6 1AA", "and their current address");

  const L = leadBody({ kind: "landlord", firstName: "Walid", surname: "Mhana", email: "x@example.com", phone: "0161" });
  ok(L.ContactRoleType === "Landlord" && L.Firstname === "Walid", "a landlord registration becomes a Landlord lead");

  const old = leadBody({ kind: "register", name: "Jan van Dyke", email: "j@example.com" });
  ok(old.Firstname === "Jan" && old.Surname === "van Dyke", "an older page sending one name still splits sensibly");
}

/* ── and the leads are actually sent now ─────────────────────────────────── */
{
  const src = readFileSync(new URL("../worker/studio/enquiries.js", import.meta.url), "utf8");
  ok(/import\("\.\/tenninety-lead\.js"\)/.test(src) && /sendLead\(env/.test(src),
    "recordEnquiry posts the lead — tenninety-lead.js was written and then never called");
  const head = src.slice(src.indexOf("export async function recordEnquiry"));
  ok(head.indexOf("sendLead") < head.indexOf("if (!db) return null"),
    "before the database guard, so a lead reaches 10ninety whether or not D1 is bound");
}

/* ── end to end: the real recordEnquiry, a stubbed network ───────────────── */

/* The chain is: form -> handler -> recordEnquiry -> sendLead -> 10ninety.
   Each link is tested on its own above; this runs the actual function with
   the network replaced, so a break anywhere in between shows up here rather
   than as a lead that silently never arrived. No database, deliberately: the
   lead must not depend on one. */
{
  const { recordEnquiry } = await import("../worker/studio/enquiries.js");
  const sent = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    sent.push({ url: String(url), headers: init && init.headers, body: init && init.body ? JSON.parse(init.body) : null });
    return new Response(JSON.stringify({ IsSuccessful: true, Id: "L-1" }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const env = { TENNINETY_OPEN_API_KEY: "test-key-not-real" };
  try {
    await recordEnquiry(env, { topic: "Tenant registration", name: "Mary Anne Smith", firstName: "Mary Anne", surname: "Smith",
      email: "m@example.com", phone: "07700900123", message: "Registered on the website.", areaNames: ["Salford"] });
    await recordEnquiry(env, { source: "landlord", name: "Walid Mhana", firstName: "Walid", surname: "Mhana",
      email: "w@example.com", phone: "01612201763", message: "x" });
    await recordEnquiry(env, { topic: "General", name: "Someone", email: "s@example.com", message: "hello" });
  } finally { globalThis.fetch = realFetch; }

  const leads = sent.filter((x) => /OpenAPILead\/Register$/.test(x.url));
  ok(leads.length === 2, `the tenant and the landlord registration each post a lead, the general enquiry does not (${leads.length})`);
  ok(leads[0] && leads[0].url === "https://megacityproperties.10ninety.co.uk/OpenAPILead/Register", "to his own 10ninety, by business key");
  ok(leads[0] && leads[0].headers["10ninety.OpenApi.Key"] === "test-key-not-real", "with the Open API key in the header 10ninety reads");
  ok(leads[0] && leads[0].body.ContactRoleType === "Tenant" && leads[0].body.Firstname === "Mary Anne", "the tenant arrives as a Tenant, names as given");
  ok(leads[1] && leads[1].body.ContactRoleType === "Landlord" && leads[1].body.Surname === "Mhana", "the landlord arrives as a Landlord");
}

console.log();
console.log(bad ? `REGISTRATION FIELDS: ${bad} FAILED` : "REGISTRATION FIELDS: ALL PASS — everything his forms asked, and none of their mistakes.");
process.exit(bad ? 1 : 0);

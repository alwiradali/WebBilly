#!/usr/bin/env node
/* Which inbox does each Megacity form reach?

   Walid's rule, given 2026-09-19 and again 2026-09-25: anything a tenant
   sends goes to lettings@, everything from landlords goes to info@, which he
   reads himself; repairs go to management@ and only there. Everything also
   goes into 10ninety. The general contact form used to go to BOTH info@ and lettings@
   — that is what changed, and this check is what caught it when it did.
   Nothing else checks this: the Studio inbox only
   exists once D1 is bound, so in production the email IS the record — a form
   pointed at the wrong address, or at the old demo inbox, loses the enquiry with
   nobody to notice. This asserts the table directly.

     node scripts/megacity-routing-check.mjs        (exits 1 on a wrong inbox) */
import { notifyTo, kindFromTopic, OFFICE_TO, LETTINGS_TO, MANAGEMENT_TO } from "../worker/studio/enquiries.js";

const OFFICE = [OFFICE_TO];
const LETTINGS = [LETTINGS_TO];
const MANAGEMENT = [MANAGEMENT_TO];
/* Deliberately no BOTH any more: no form reaches two inboxes. Walid reads
   info@ himself and asked not to get tenant mail there. */

/* env with no MEGACITY_DB — exactly the state production is in today. */
const LIVE = {};

const cases = [
  ["landlord", OFFICE, "landlord registration"],
  ["valuation", OFFICE, "landlord valuation request"],
  ["contact", OFFICE, "general contact form"],
  ["contact-tenant", LETTINGS, "contact form from a tenant"],
  ["contact-landlord", OFFICE, "contact form from a landlord"],
  ["register", LETTINGS, "tenant registration"],
  ["viewing", LETTINGS, "viewing request"],
  ["application", LETTINGS, "tenancy application"],
  ["maintenance", MANAGEMENT, "maintenance report"],
  ["tour", LETTINGS, "360° tour lead"],
];

/* The contact endpoint carries three forms, told apart only by their topic. */
const topics = [
  ["Free landlord valuation", "valuation", OFFICE],
  ["Tenant registration", "register", LETTINGS],
  ["General", "contact", OFFICE],
  ["", "contact", OFFICE],
  ["Renting a home", "contact-tenant", LETTINGS],
  ["Letting my property", "contact-landlord", OFFICE],
  ["Property management", "contact-landlord", OFFICE],
  /* a landlord service with the word "rent" in it */
  ["Rent collection", "contact-landlord", OFFICE],
  ["Landlord registration", "contact-landlord", OFFICE],
  ["Maintenance", "maintenance", MANAGEMENT],
  /* "current" contains "rent"; a regex without word boundaries sends this
     landlord to the tenant inbox. */
  ["My current agent is letting me down", "contact-landlord", OFFICE],
];

let fails = 0;
const ok = (c, what, got) => { console.log((c ? "ok   " : "FAIL ") + what + (c ? "" : "  got " + JSON.stringify(got))); if (!c) fails++; };
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

for (const [kind, want, what] of cases) {
  const got = await notifyTo(LIVE, kind);
  ok(same(got, want), `${what} → ${want.join(", ")}`, got);
}

for (const [topic, kind, want] of topics) {
  const k = kindFromTopic(topic);
  const got = await notifyTo(LIVE, k);
  ok(k === kind && same(got, want), `contact topic "${topic || "(none)"}" → ${kind} → ${want.join(", ")}`, { k, got });
}

/* Nothing may still reach the agency's own inbox. */
for (const [kind] of cases) {
  const got = await notifyTo(LIVE, kind);
  ok(!got.some((a) => /billydigitals\.com$/i.test(a)), `${kind} does not go to the agency inbox`, got);
}

/* An unknown form falls back to the office rather than nowhere. */
ok(same(await notifyTo(LIVE, "something-new"), OFFICE), "an unknown form falls back to the office");

/* Settings → Notifications used to override every form at once. It must not
   any more: the routing is the agency's rule, and repairs in particular go to
   management@ and nowhere else — never to an address someone typed into the
   Studio. A database whose settings table holds a list proves it. */
const withDb = {
  MEGACITY_DB: {
    prepare: () => ({
      bind: () => ({ first: async () => ({ value: JSON.stringify(["walid.personal@example.com"]) }) }),
      first: async () => ({ value: JSON.stringify(["walid.personal@example.com"]) }),
    }),
  },
};
for (const [kind, want, what] of cases) {
  const got = await notifyTo(withDb, kind);
  ok(same(got, want), `${what} → ${want.join(", ")} even with a Notifications list saved`, got);
}
ok(same(await notifyTo(withDb, "maintenance"), MANAGEMENT), "a repair reaches management@ and only management@", await notifyTo(withDb, "maintenance"));
/* and a caller that mutated the list it was given cannot change the table */
(await notifyTo(LIVE, "maintenance")).push("someone@example.com");
ok(same(await notifyTo(LIVE, "maintenance"), MANAGEMENT), "the route handed out is a copy, not the table itself");

/* ── and now the real endpoints ──────────────────────────────────────────
   The table above is only half the answer: what matters is the address the
   Worker actually hands Resend. worker.js imports cleanly in node, so post a
   real request to each form and read the "to" off the intercepted Resend call.
   Nothing leaves the machine — global fetch is stubbed. */
const worker = (await import("../worker.js")).default;

const ENV = { RESEND_API_KEY: "test-key-not-a-real-one" };   // no MEGACITY_DB, as in production
let pending = [];
const CTX = { waitUntil: (p) => { pending.push(p); } };
const realFetch = globalThis.fetch;
let sent = null, into = [];
/* what 10ninety answers, per test: accept, or fail the way its host does */
let tenninety = "accept";
/* and what Resend answers: accept, or fail the way it does when it is down */
let resend = "accept";
globalThis.fetch = async (url, init) => {
  if (String(url).includes("api.resend.com")) {
    if (resend === "fail") return new Response(JSON.stringify({ message: "service unavailable" }), { status: 503, headers: { "content-type": "application/json" } });
    sent = JSON.parse(init.body);
    return new Response(JSON.stringify({ id: "test" }), { status: 200, headers: { "content-type": "application/json" } });
  }
  if (String(url).includes(".10ninety.co.uk/")) {
    into.push({ path: new URL(url).pathname, body: JSON.parse(init.body), redirect: init.redirect });
    if (tenninety === "redirect") return new Response("", { status: 302, headers: { location: "/Error" } });
    return new Response(JSON.stringify({ IsSuccessful: true, Id: 77 }), { status: 200, headers: { "content-type": "application/json" } });
  }
  throw new Error("unexpected network call in a test: " + url);
};

async function post(path, body, env = ENV) {
  sent = null; into = []; pending = [];
  const res = await worker.fetch(
    new Request("https://billydigitals.com" + path, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    }), env, CTX);
  const json = await res.json().catch(() => null);
  await Promise.all(pending);
  return { status: res.status, json, sent, into };
}

const person = { name: "A Person", phone: "07700 900123", email: "person@example.com" };

const posts = [
  ["/api/megacity-landlord", { ...person, address: "12 Example Street" }, OFFICE, "landlord registration"],
  ["/api/megacity-contact", { ...person, topic: "Free landlord valuation", message: "x" }, OFFICE, "valuation via the contact endpoint"],
  ["/api/megacity-contact", { ...person, topic: "Tenant registration", message: "x" }, LETTINGS, "tenant registration via the contact endpoint"],
  ["/api/megacity-contact", { ...person, topic: "General", message: "x" }, OFFICE, "general contact"],
  ["/api/megacity-contact", { ...person, topic: "Renting a home", message: "x" }, LETTINGS, "a tenant using the contact form"],
  ["/api/megacity-viewing", { ...person, property: "12 Example Street" }, LETTINGS, "viewing request"],
  ["/api/megacity-apply", { ...person, property: "12 Example Street" }, LETTINGS, "tenancy application"],
  ["/api/megacity-maintenance", { name: person.name, contact: person.email, address: "12 Example Street", issue: "Leak" }, MANAGEMENT, "maintenance report"],
];

for (const [path, body, want, what] of posts) {
  const r = await post(path, body);
  ok(r.status === 200 && r.sent && same(r.sent.to, want), `${what} emails ${want.join(", ")}`,
     { status: r.status, to: r.sent && r.sent.to, err: r.json && r.json.error });
}

/* The landlord form's own guards. */
const noEmail = await post("/api/megacity-landlord", { name: "A", phone: "1", address: "x" });
ok(noEmail.status === 400 && !noEmail.sent, "a landlord registration without an email is refused", noEmail.status);
const noAddress = await post("/api/megacity-landlord", { ...person });
ok(noAddress.status === 400 && !noAddress.sent, "a landlord registration without an address is refused", noAddress.status);
const bot = await post("/api/megacity-landlord", { ...person, address: "x", botcheck: "spam" });
ok(bot.status === 200 && !bot.sent, "a bot filling the honeypot is dropped without emailing anyone", bot.status);

/* The subject line the office will see in their inbox. */
const subject = await post("/api/megacity-landlord", { ...person, address: "12 Example Street", postcode: "M8 8RA" });
ok(subject.sent && /^Landlord registration — 12 Example Street, M8 8RA · A Person$/.test(subject.sent.subject),
   "the subject names the property and the landlord", subject.sent && subject.sent.subject);
ok(subject.sent && subject.sent.reply_to === person.email, "reply-to is the landlord, so hitting reply works",
   subject.sent && subject.sent.reply_to);

/* Values in, labels out: the office reads "Semi-detached house", not house_semi. */
const labelled = await post("/api/megacity-landlord", {
  ...person, address: "12 Example Street", area: "salford", propertyType: "house_semi", epc: "pending", parking: "1",
});
ok(labelled.sent && /Semi-detached house/.test(labelled.sent.text) && /Salford/.test(labelled.sent.text) &&
   /Certificate pending/.test(labelled.sent.text) && !/house_semi/.test(labelled.sent.text),
   "the email reads in words, not in database values");

/* ── repairs: into 10ninety, and one email to management@ — never two ──── */
const OPEN = { ...ENV, TENNINETY_OPEN_API_KEY: "test-open-key" };
const repair = { name: "Jane Smith", contact: "jane@example.com", address: "Flat 4, 12 Example Street, M4 6DE", urgency: "Emergency — no heat", issue: "Boiler not working", access: "Mornings" };

tenninety = "accept";
const r1 = await post("/api/megacity-maintenance", repair, OPEN);
ok(r1.status === 200 && r1.into.length === 1 && r1.into[0].path === "/OpenAPIMaintenanceIssue/Report",
   "a repair is reported into 10ninety", { status: r1.status, into: r1.into.map((c) => c.path) });
ok(r1.into[0] && r1.into[0].body.PropertyAddress === repair.address && /Boiler not working/.test(r1.into[0].body.AdditionalInformation) && r1.into[0].body.Email === repair.contact,
   "with the address, the problem and a way to reply", r1.into[0] && r1.into[0].body);
ok(!r1.sent, "and the website sends no second email — 10ninety's own alert is the one", r1.sent && r1.sent.to);
ok(r1.into[0] && r1.into[0].redirect === "manual", "10ninety is asked not to follow redirects, so its error page cannot pass for a success");

tenninety = "redirect";
const r2 = await post("/api/megacity-maintenance", repair, OPEN);
ok(r2.status === 200 && r2.sent && same(r2.sent.to, MANAGEMENT), "when 10ninety fails (302 to its error page), the website emails management@ itself",
   { status: r2.status, to: r2.sent && r2.sent.to });
ok(r2.sent && r2.sent.reply_to === repair.contact, "with the tenant as reply-to");

const r3 = await post("/api/megacity-maintenance", { ...repair, contact: "07700 900123" }, ENV);
ok(r3.status === 200 && r3.sent && same(r3.sent.to, MANAGEMENT) && !r3.sent.reply_to, "no 10ninety key: management@ by email, phone-only report still accepted",
   { status: r3.status, to: r3.sent && r3.sent.to });
tenninety = "accept";

/* ── a viewing with a phone and no email: the form says email is optional ── */
const phoneOnly = await post("/api/megacity-viewing", { name: "Sam Patel", phone: "07700 900456", email: "", property: "2 bed, Ladywell Point", day: "Saturday" });
ok(phoneOnly.status === 200 && phoneOnly.sent && same(phoneOnly.sent.to, LETTINGS) && !phoneOnly.sent.reply_to,
   "a phone-only viewing request is accepted and reaches lettings@", { status: phoneOnly.status, err: phoneOnly.json && phoneOnly.json.error });
const badEmail = await post("/api/megacity-viewing", { name: "Sam", phone: "07700 900456", email: "not-an-email", property: "x" });
ok(badEmail.status === 400 && !badEmail.sent, "a mistyped email is still caught", badEmail.status);
const nothing = await post("/api/megacity-viewing", { name: "Sam", property: "x" });
ok(nothing.status === 400 && !nothing.sent, "no phone and no email is refused — nobody could answer it", nothing.status);

/* ── into 10ninety: the contact topics become the right kind of contact ─── */
for (const [topic, role] of [["Renting a home", "Tenant"], ["Letting my property", "Landlord"], ["Rent collection", "Landlord"], ["Tenant registration", "Tenant"], ["Free landlord valuation", "Landlord"]]) {
  const r = await post("/api/megacity-contact", { ...person, topic, message: "x" }, OPEN);
  const lead = r.into.find((c) => c.path === "/OpenAPILead/Register");
  ok(lead && lead.body.ContactRoleType === role, `"${topic}" becomes a ${role} lead in 10ninety`, r.into);
}
const general = await post("/api/megacity-contact", { ...person, topic: "Something else", message: "x" }, OPEN);
ok(!general.into.length, "a message with no tenant or landlord in it is emailed but not guessed into a role");

const viewingLead = await post("/api/megacity-viewing", { ...person, property: "2 bed apartment, Ladywell Point", day: "Saturday" }, OPEN);
const vl = viewingLead.into.find((c) => c.path === "/OpenAPILead/Register");
ok(vl && /Property: 2 bed apartment, Ladywell Point/.test(vl.body.AdditionalInfo), "a viewing lead names the home it is about", vl && vl.body.AdditionalInfo);

/* ── the sender: his own domain once MAIL_FROM is set ───────────────────── */
const own = await post("/api/megacity-viewing", { ...person, property: "x" }, { ...ENV, MAIL_FROM: "Megacity Properties <website@megacityproperties.co.uk>" });
ok(own.sent && own.sent.from === "Megacity Properties <website@megacityproperties.co.uk>", "forms send as MAIL_FROM when it is set — his Resend account only allows his domain", own.sent && own.sent.from);
const def = await post("/api/megacity-viewing", { ...person, property: "x" });
ok(def.sent && /billydigitals\.com>$/.test(def.sent.from), "and as before when it is not", def.sent && def.sent.from);

/* ── the email failing must not lose the lead ─────────────────────────────
   The 10ninety lead used to be sent only after the email had gone, so a
   Resend outage — or a key not set yet — lost it from 10ninety and the
   Studio too. The visitor is still told it did not go (so they ring), and
   the lead goes in regardless. */
resend = "fail";
for (const [path, body, what] of [
  ["/api/megacity-landlord", { ...person, address: "12 Example Street" }, "landlord registration"],
  ["/api/megacity-contact", { ...person, topic: "Free landlord valuation", message: "x" }, "valuation request"],
  ["/api/megacity-contact", { ...person, topic: "Tenant registration", message: "x" }, "tenant registration"],
  ["/api/megacity-contact", { ...person, topic: "Renting a home", message: "x" }, "tenant contact"],
  ["/api/megacity-viewing", { ...person, property: "12 Example Street" }, "viewing request"],
  ["/api/megacity-apply", { ...person, property: "12 Example Street" }, "tenancy application"],
]) {
  const r = await post(path, body, OPEN);
  ok(r.status === 502 && r.into.some((c) => c.path === "/OpenAPILead/Register"),
     `${what}: the email fails, the visitor is told, and the lead still reaches 10ninety`, { status: r.status, into: r.into.map((c) => c.path) });
}
resend = "accept";
const { RESEND_API_KEY: _k, ...NO_RESEND } = OPEN;
const noKey = await post("/api/megacity-viewing", { ...person, property: "12 Example Street" }, NO_RESEND);
ok(noKey.status === 500 && noKey.into.some((c) => c.path === "/OpenAPILead/Register"),
   "no Resend key set yet: the visitor is told, and the lead still reaches 10ninety", { status: noKey.status, into: noKey.into.map((c) => c.path) });
ok(noKey.json && noKey.json.error && !/RESEND|secret|api|key|resend/i.test(noKey.json.error),
   "and what the visitor reads is plain words, not the name of a setting", noKey.json && noKey.json.error);
resend = "fail";
const refused = await post("/api/megacity-contact", { ...person, topic: "General", message: "x" }, OPEN);
ok(refused.status === 502 && refused.json && !/resend|provider|detail/i.test(JSON.stringify(refused.json)),
   "a refused email tells the visitor nothing about the provider either", refused.json);
resend = "accept";
const botNoLead = await post("/api/megacity-viewing", { ...person, property: "x", botcheck: "spam" }, OPEN);
ok(botNoLead.status === 200 && !botNoLead.into.length, "a bot filling the honeypot still makes no lead");
const limitedNoLead = await post("/api/megacity-viewing", { name: "Sam", property: "x" }, OPEN);
ok(limitedNoLead.status === 400 && !limitedNoLead.into.length, "an incomplete form still makes no lead");

globalThis.fetch = realFetch;

console.log("");
console.log(fails ? `ROUTING CHECK: ${fails} FAILURE(S)` : "ROUTING CHECK: ALL PASS");
process.exit(fails ? 1 : 0);

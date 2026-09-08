#!/usr/bin/env node
/* Which inbox does each Megacity form reach?

   Landlord business goes to the office, tenant business to lettings, and the
   general contact form to both. Nothing else checks this: the Studio inbox only
   exists once D1 is bound, so in production the email IS the record — a form
   pointed at the wrong address, or at the old demo inbox, loses the enquiry with
   nobody to notice. This asserts the table directly.

     node scripts/megacity-routing-check.mjs        (exits 1 on a wrong inbox) */
import { notifyTo, kindFromTopic, OFFICE_TO, LETTINGS_TO } from "../worker/studio/enquiries.js";

const OFFICE = [OFFICE_TO];
const LETTINGS = [LETTINGS_TO];
const BOTH = [OFFICE_TO, LETTINGS_TO];

/* env with no MEGACITY_DB — exactly the state production is in today. */
const LIVE = {};

const cases = [
  ["landlord", OFFICE, "landlord registration"],
  ["valuation", OFFICE, "landlord valuation request"],
  ["contact", BOTH, "general contact form"],
  ["register", LETTINGS, "tenant registration"],
  ["viewing", LETTINGS, "viewing request"],
  ["application", LETTINGS, "tenancy application"],
  ["maintenance", LETTINGS, "maintenance report"],
  ["tour", LETTINGS, "360° tour lead"],
];

/* The contact endpoint carries three forms, told apart only by their topic. */
const topics = [
  ["Free landlord valuation", "valuation", OFFICE],
  ["Tenant registration", "register", LETTINGS],
  ["General", "contact", BOTH],
  ["", "contact", BOTH],
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

/* Settings → Notifications still overrides everything, so the office can
   redirect the lot from one screen. */
const withDb = {
  MEGACITY_DB: {
    prepare: () => ({
      bind: () => ({ first: async () => ({ value: JSON.stringify(["all@example.com"]) }) }),
      first: async () => ({ value: JSON.stringify(["all@example.com"]) }),
    }),
  },
};
const overridden = await notifyTo(withDb, "viewing");
ok(same(overridden, ["all@example.com"]), "a notifyEmails setting overrides every form", overridden);

/* ── and now the real endpoints ──────────────────────────────────────────
   The table above is only half the answer: what matters is the address the
   Worker actually hands Resend. worker.js imports cleanly in node, so post a
   real request to each form and read the "to" off the intercepted Resend call.
   Nothing leaves the machine — global fetch is stubbed. */
const worker = (await import("../worker.js")).default;

const ENV = { RESEND_API_KEY: "test-key-not-a-real-one" };   // no MEGACITY_DB, as in production
const CTX = { waitUntil: () => {} };
const realFetch = globalThis.fetch;
let sent = null;
globalThis.fetch = async (url, init) => {
  if (String(url).includes("api.resend.com")) {
    sent = JSON.parse(init.body);
    return new Response(JSON.stringify({ id: "test" }), { status: 200, headers: { "content-type": "application/json" } });
  }
  return realFetch(url, init);
};

async function post(path, body) {
  sent = null;
  const res = await worker.fetch(
    new Request("https://billydigitals.com" + path, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    }), ENV, CTX);
  return { status: res.status, json: await res.json().catch(() => null), sent };
}

const person = { name: "A Person", phone: "07700 900123", email: "person@example.com" };

const posts = [
  ["/api/megacity-landlord", { ...person, address: "12 Example Street" }, OFFICE, "landlord registration"],
  ["/api/megacity-contact", { ...person, topic: "Free landlord valuation", message: "x" }, OFFICE, "valuation via the contact endpoint"],
  ["/api/megacity-contact", { ...person, topic: "Tenant registration", message: "x" }, LETTINGS, "tenant registration via the contact endpoint"],
  ["/api/megacity-contact", { ...person, topic: "General", message: "x" }, BOTH, "general contact"],
  ["/api/megacity-viewing", { ...person, property: "12 Example Street" }, LETTINGS, "viewing request"],
  ["/api/megacity-apply", { ...person, property: "12 Example Street" }, LETTINGS, "tenancy application"],
  ["/api/megacity-maintenance", { name: person.name, contact: person.email, address: "12 Example Street", issue: "Leak" }, LETTINGS, "maintenance report"],
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

globalThis.fetch = realFetch;

console.log("");
console.log(fails ? `ROUTING CHECK: ${fails} FAILURE(S)` : "ROUTING CHECK: ALL PASS");
process.exit(fails ? 1 : 0);

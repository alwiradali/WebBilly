#!/usr/bin/env node
/* House and flat numbers stay off the public site (Walid, 26 Sep 2026: "the
   property numbers can't be visible on the properties").

   10ninety gives two addresses: the full one (address_1 "Apartment 208,
   Adelphi Wharf 2", postcode "M3 6FZ") and the display address Walid
   publishes ("Apartment , Adelphi Wharf , Adelphi Street, Salford"). Only the
   second, the town and the postcode district may reach a visitor. The office
   still gets the full address in its viewing emails.

   The rendered pages (cards, breadcrumb, map, structured data) are checked
   against a running Worker by the smoke test; this pins the data they are
   built from.   node scripts/megacity-address-check.mjs */
import * as pub from "../worker/studio/public.js";
import { buildSkeleton } from "../worker/studio/tours.js";

let bad = 0;
const ok = (c, what) => { console.log((c ? "ok   " : "FAIL ") + what); if (!c) bad++; };

const ROW = {
  id: "adelphi-apartments", status: "live", hidden: 0, title: "Apartment , Adelphi Wharf , Adelphi Street, Salford",
  address_1: "Apartment 208, Adelphi Wharf 2", address_2: "9 Adelphi Street", town: "Salford", postcode: "M3 6FZ",
  area: "salford", lat: 53.48612345, lng: -2.25498765, rent_pcm: 950, bedrooms: 0, type: "studio", let_type: "whole",
  summary: "Stylish studio in Apartment 208, Adelphi Wharf",
  description: "Situated on the second floor at 9 Adelphi Street, a short walk from the University of Salford.\n\nCouncil Tax Band: A\nDeposit: £0\nParking options: Off Street",
  home_json: "{}", features_json: "[]", external_json: "{}", availability: "from_date", available_from: "2027-01-01",
  published_at: "2026-09-25T03:57:45Z", updated_at: "2026-09-26T00:49:08Z",
};
const stubDb = { prepare: () => ({ bind() { return this; }, all: async () => ({ results: [ROW] }), first: async () => ROW }) };
const env = { MEGACITY_HOST: "www.megacityproperties.co.uk" };
const url = new URL("https://www.megacityproperties.co.uk/api/public/listings");

const leaks = (text) => ["208", "Adelphi Wharf 2", "9 Adelphi Street", "M3 6FZ", "53.4861", "-2.2549"].filter((s) => text.includes(s));

const list = await (await pub.list(stubDb, url, env)).json();
ok(leaks(JSON.stringify(list)).length === 0, "the listings feed carries no house number, flat number or full postcode" + (leaks(JSON.stringify(list)).length ? ": " + leaks(JSON.stringify(list)).join(", ") : ""));
ok(list.items[0].district === "M3" && list.items[0].town === "Salford", "  it has the town and the postcode district (Salford · M3)");
ok(!("line1" in list.items[0]), "  and no line1 field at all");

const search = await (await pub.list(stubDb, new URL(url + "?view=search"), env)).json();
ok(leaks(JSON.stringify(search)).length === 0, "the site search index carries none either");
ok(/adelphi wharf/.test(search.items[0].k), "  but still finds the building by its published name");

const one = await (await pub.one(stubDb, url, env, "adelphi-apartments")).json().catch(() => null);
if (one) {
  ok(leaks(JSON.stringify(one.address || {})).length === 0, "a single listing's public address has no number, full postcode or exact position");
  ok(one.address.postcode === "M3" && Math.abs(one.address.lat - 53.486) < 1e-9, "  district and a position to about 100 m");
}

/* 10ninety's display address keeps the words round the numbers it leaves
   out ("Apartment , Adelphi Wharf ,  Adelphi Street"); the site does not */
ok(list.items[0].title === "Adelphi Wharf, Adelphi Street, Salford", `the card title drops the empty "Apartment ," ("${list.items[0].title}")`);
ok(search.items[0].t === "Adelphi Wharf, Adelphi Street, Salford", "  and so does site search");
if (one) {
  const text = JSON.stringify([one.summary, one.description]);
  ok(leaks(text).length === 0 && !/Apartment 208/.test(text), "a number in the advert text in front of the property's own street or building stays off the site" + (leaks(text).length ? ": " + leaks(text).join(", ") : ""));
  ok(/at Adelphi Street, a short walk/.test(text) && /Council Tax Band: A/.test(text) && /Off Street/.test(text), "  and the rest of Walid's text is untouched");
  ok(!/Deposit: £0/.test(text), `"Deposit: £0" (a field not filled in) is not shown as a deposit of nothing`);
}
const T = await import("../worker/studio/text.js");
ok(T.displayAddress("99 Denmark Road, Manchester") === "Denmark Road, Manchester", "a number typed into the display address later still stays off the site");
ok(T.displayAddress("Carlton Road, Salford") === "Carlton Road, Salford" && T.displayAddress("3rd Avenue, Trafford Park") === "3rd Avenue, Trafford Park", "an address with no number is left exactly as it is");
ok(T.advertText("Deposit: £500\n8 double rooms, 10 minutes to Salford", "Carlton Road, Salford", "Salford") === "Deposit: £500\n8 double rooms, 10 minutes to Salford", "real deposits, room counts and distances are left alone");

const sk = buildSkeleton({ id: "adelphi-apartments", title: ROW.title, address: { line1: ROW.address_1, line2: ROW.address_2, town: "Salford", postcode: "M3 6FZ", area: "salford" }, home: {} }, {}, {});
ok(sk.project.location === "Salford, M3", `a new 360 tour says where it is by town and district ("${sk.project.location}")`);

console.log(bad ? `ADDRESS: ${bad} FAILED` : "ADDRESS: ALL PASS — no house or flat number leaves the office.");
process.exit(bad ? 1 : 0);

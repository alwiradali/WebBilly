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

const sk = buildSkeleton({ id: "adelphi-apartments", title: ROW.title, address: { line1: ROW.address_1, line2: ROW.address_2, town: "Salford", postcode: "M3 6FZ", area: "salford" }, home: {} }, {}, {});
ok(sk.project.location === "Salford, M3", `a new 360 tour says where it is by town and district ("${sk.project.location}")`);

console.log(bad ? `ADDRESS: ${bad} FAILED` : "ADDRESS: ALL PASS — no house or flat number leaves the office.");
process.exit(bad ? 1 : 0);

#!/usr/bin/env node
/* Studio → Settings → Branding reaches every public page (27 Sep: "when i
   changed into the backoffice it should change too"). Run before a deploy:
     node scripts/megacity-brand-check.mjs
   Checks, against the real templates: nothing changes while Branding says
   what the pages print; a new address, phone, email or WhatsApp number
   replaces every printed form of the old one, once; the structured data
   still parses and says the new address; and what Walid types cannot break
   the page. The Worker wiring is proven against a running Worker by the
   local run described in the commit. */
import { readFileSync } from "node:fs";
import * as u from "../worker/studio/urls.js";
import { PRINTED, brandPairs, applyBrand, addressParts, e164 } from "../worker/studio/brand.js";
import { DEFAULTS } from "../worker/studio/settings.js";

let bad = 0;
const ok = (c, what) => { console.log((c ? "ok   " : "FAIL ") + what); if (!c) bad++; };
const read = (f) => readFileSync(new URL("../templates/" + f, import.meta.url), "utf8");
const LIVE = [...new Set([...u.PUBLIC_STATIC_SLUGS, "let-template", "page-template", "404"])].map((s) => "megacity-" + s + ".html");
const pages = LIVE.map((f) => ({ f, h: read(f) }));
const ld = (h) => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const agent = (h) => ld(h).flatMap((x) => x["@graph"] || [x]).find((x) => x["@type"] === "RealEstateAgent");

/* the pages print what PRINTED says, so the swap has something to find */
ok(DEFAULTS.brand.address === PRINTED.address, "the Studio's default address is the one the pages print");
const everywhere = (s) => pages.filter((p) => !p.h.includes(s)).map((p) => p.f);
for (const [what, s] of [["address (header menu form)", "Office 18, The Tube Business Centre,<br>86 North Street, Manchester M8 8RA"], ["address (footer form)", "Office 18, The Tube, 86 North Street, M8 8RA"], ["phone", "tel:" + PRINTED.phoneE164], ["email", "mailto:" + PRINTED.email], ["WhatsApp", "wa.me/" + PRINTED.whatsapp]]) {
  const miss = everywhere(s);
  ok(miss.length === 0, `every public page prints the ${what}` + (miss.length ? " — not: " + miss.join(", ") : ""));
}

/* unchanged Branding: not one byte changes */
for (const brand of [DEFAULTS.brand, { ...DEFAULTS.brand, whatsapp: "+447804900719" }, { address: "  office 18, The Tube Business Centre,  86 North Street, Manchester M8 8RA ", phone: "0161 2201763", email: "INFO@megacityproperties.co.uk", whatsapp: "07804 900719" }, {}, null, { address: "", phone: "", email: "", whatsapp: "" }]) {
  ok(brandPairs(brand).length === 0, `nothing to swap when Branding matches the pages (${JSON.stringify(brand).slice(0, 70)})`);
}
ok(pages.every((p) => applyBrand(p.h, brandPairs(DEFAULTS.brand)) === p.h), "and every page comes out byte for byte the same");

/* a move within the building: the new value contains the old building name */
const move = brandPairs({ address: "Office 20, The Tube Business Centre, 86 North Street, Manchester M8 8RA" });
for (const p of pages) {
  const out = applyBrand(p.h, move);
  if (!/Office 18/.test(p.h)) continue;
  ok(!/Office 18/.test(out) && !/Office 20, Office 20|Office 20, The Tube Business Centre, 86 North Street, Manchester M8 8RA, 86/.test(out), `${p.f}: Office 18 becomes Office 20, once`);
}
const contact = applyBrand(read("megacity-contact-us.html"), move);
ok(/<b>Office 20, The Tube Business Centre<\/b><span>86 North Street, Manchester M8 8RA<\/span>/.test(contact), "the contact card keeps its two lines");
ok(agent(contact).address.streetAddress === "Office 20, The Tube Business Centre, 86 North Street" && agent(contact).address.postalCode === "M8 8RA", "the address Google reads says Office 20");

/* a move elsewhere */
const away = brandPairs({ address: "Unit 5, Example House, 1 Example Street, Salford M5 4AB" });
for (const p of pages) {
  const out = applyBrand(p.h, away);
  /* "e.g. M8 8RA" in the valuation form is an example postcode, not the office */
  const left = ["Office 18", "86 North Street", "M8 8RA", "North+Street"].filter((s) => out.replace(/e\.g\. M8 8RA/g, "").includes(s));
  ok(left.length === 0, `${p.f}: no trace of the old address` + (left.length ? " — still: " + left.join(", ") : ""));
  for (const x of ld(out)) void x;       // throws if the structured data no longer parses
}
const home = applyBrand(read("megacity-skyline.html"), away);
const a = agent(home).address;
ok(a.streetAddress === "Unit 5, Example House, 1 Example Street" && a.addressLocality === "Salford" && a.postalCode === "M5 4AB", `the structured address is split into street, town and postcode (${JSON.stringify(a)})`);
ok(/Unit 5, Example House,<br>1 Example Street, Salford M5 4AB/.test(home), "the header menu shows it on two lines");
ok(/maps\.google\.com\/\?q=Unit\+5%2C\+Example\+House%2C\+1\+Example\+Street%2C\+Salford\+M5\+4AB/.test(home), "the map link searches for the new address");

/* an address without a postcode: the text changes, the structured data stays whole */
const nopc = applyBrand(read("megacity-skyline.html"), brandPairs({ address: "Office 20, The Tube Business Centre, North Street, Manchester" }));
ok(agent(nopc).address.postalCode === "M8 8RA" && /Office 20/.test(nopc), "no postcode typed: the page text changes, and Google keeps a complete address rather than half of one");

/* phone, email, WhatsApp */
const all = brandPairs({ phone: "0161 000 0000", email: "lettings@megacityproperties.co.uk", whatsapp: "07700 900123" });
for (const p of pages) {
  const out = applyBrand(p.h, all);
  const left = ["0161 220 1763", "+441612201763", "info@megacityproperties.co.uk", "447804900719"].filter((s) => out.includes(s));
  ok(left.length === 0, `${p.f}: new phone, email and WhatsApp everywhere` + (left.length ? " — still: " + left.join(", ") : ""));
}
const allHome = applyBrand(read("megacity-skyline.html"), all);
ok(/href="tel:\+441610000000"/.test(allHome) && />0161 000 0000</.test(allHome) && agent(allHome).telephone === "+441610000000", "the phone changes in the links, the text and the structured data");
ok(/wa\.me\/447700900123/.test(allHome) && /mailto:lettings@megacityproperties\.co\.uk/.test(allHome), "WhatsApp and email links follow");
ok(e164("0161 220 1763") === "+441612201763" && e164("123") === null, "phone numbers are read the same way the site writes them");

/* what is typed cannot break the page */
const evil = applyBrand(read("megacity-skyline.html"), brandPairs({ address: 'Office 1 <script>alert(1)</script> "x" & Co, 2 Road, Manchester M1 1AA', email: "a<b@x.com" }));
ok(!/<script>alert/.test(evil) && /&lt;script&gt;/.test(evil), "an address with markup in it is shown as text, not run");
ok(ld(evil).length > 0 && agent(evil).address.postalCode === "M1 1AA", "and the structured data still parses");
ok(addressParts(PRINTED.address).line1 === "Office 18, The Tube Business Centre" && addressParts(PRINTED.address).line2 === "86 North Street, Manchester M8 8RA", "the office address splits where the pages split it");

console.log(bad ? `BRANDING: ${bad} FAILURE(S)` : "BRANDING: ALL PASS — change it in the Studio and every page follows; change nothing and nothing changes.");
process.exit(bad ? 1 : 0);

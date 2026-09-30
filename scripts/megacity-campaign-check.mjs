#!/usr/bin/env node
/* Where landlord enquiries come from (30 Sep 2026: the landlord campaign,
   £1,500 to £2,000 over six months, judged channel by channel at month 3).
     node scripts/megacity-campaign-check.mjs
   Checks: every landlord form sends the visit's campaign label; Google and
   Facebook ads are labelled even without a tag; the Studio's table sorts by
   landlord enquiries and never counts spam; the privacy page says so. */
import { readFileSync } from "node:fs";
import { channelOf, channelTable } from "../worker/studio/enquiries.js";

let bad = 0;
const ok = (c, what) => { console.log((c ? "ok   " : "FAIL ") + what); if (!c) bad++; };
const read = (f) => readFileSync(new URL("../templates/" + f, import.meta.url), "utf8");

/* the landlord forms carry the label */
const js = read("megacity-skyline.js");
const block = (start) => js.slice(js.indexOf(start), js.indexOf("})();", js.indexOf(start)));
ok(/attr: window\.mcAttr/.test(block('getElementById("valForm")')), "the valuation form sends where the visit came from");
ok(/attr: window\.mcAttr/.test(block('querySelector("[data-landlord]")')), "the landlord registration form does too");
ok(/id="valForm"/.test(read("megacity-valuation.html")) && /id="valForm"/.test(read("megacity-skyline.html")), "  and both valuation pages use that form");
ok(/data-landlord/.test(read("megacity-for-landlords.html")), "  and the Landlords page uses the registration form");
ok(/gclid/.test(js) && /fbclid/.test(js) && /\["google", "cpc"\]/.test(js), "Google and Facebook ads are labelled from their click ids when a link has no tag");

/* Google Ads and Meta are told when a landlord asks (after consent) */
ok(/mcTrack\("generate_lead", \{ form: "valuation" \}\)/.test(block('getElementById("valForm")')), "a valuation request is reported as a lead");
ok(/mcTrack\("generate_lead", \{ form: "landlord" \}\)/.test(js), "  and so is a landlord registration");
ok(/mcTrack\("landlord_lead", \{ form: "valuation" \}\)/.test(js) && /mcTrack\("landlord_lead", \{ form: "landlord" \}\)/.test(js) && (js.match(/mcTrack\("landlord_lead"/g) || []).length === 2, "landlord_lead fires for the two landlord forms and nothing else");
ok(/a\[href\^="tel:"\], a\[href\*="wa\.me\/"\]/.test(js) && /mcTrack\("contact"/.test(js), "taps on the phone number and WhatsApp are reported as contacts");
const consent = read("megacity-consent.js");
ok(/if \(!granted\) \{ queue\.push/.test(consent), "  and nothing is sent to Google or Meta before the visitor agrees");

/* channels */
const C = (r) => channelOf(r).channel;
ok(C({ utm_source: "Letter", utm_medium: "post" }) === "letter / post", "a tagged link names its channel");
ok(channelOf({ utm_source: "leaflet", utm_campaign: "m6-oct" }).campaign === "m6-oct", "  and keeps the campaign");
ok(C({ referrer: "https://www.google.co.uk/" }) === "Google search (not an ad)", "an untagged visit from Google is ordinary search, not an ad");
ok(C({ referrer: "https://www.megacityproperties.co.uk/lettings" }) === "Direct or typed in" && C({}) === "Direct or typed in", "the site itself, or nothing, is 'direct'");
ok(C({ referrer: "https://l.facebook.com/" }) === "Facebook / Instagram (not an ad)" && C({ referrer: "https://www.zoopla.co.uk/x" }) === "Property portals", "Facebook and the portals are recognised");
ok(C({ referrer: "not a url" }) === "Direct or typed in", "a broken referrer does not break the table");
const t = channelTable([
  { source: "viewing", referrer: "https://www.google.co.uk/" },
  { source: "viewing", referrer: "https://www.google.co.uk/" },
  { source: "valuation", utm_source: "letter", utm_medium: "post", utm_campaign: "hmo-salford" },
  { source: "landlord", utm_source: "letter", utm_medium: "post", utm_campaign: "hmo-salford" },
]);
ok(t[0].channel === "letter / post" && t[0].landlord === 2, "the channel with the most landlord enquiries comes first, even with fewer enquiries overall");
ok(t[1].landlord === 0 && t[1].total === 2, "  tenant enquiries are counted, not called landlord ones");

const enq = readFileSync(new URL("../worker/studio/enquiries.js", import.meta.url), "utf8");
ok(/status != 'spam'/.test(enq.slice(enq.indexOf("since90"))), "spam is left out of the table");
ok(/Where enquiries came from/.test(read("megacity-studio.js")) && /channelsHtml\(E \? E\.channels/.test(read("megacity-studio.js")), "the Studio's Home shows it");
ok(/adverts, letters or leaflets/.test(read("megacity-privacy.html")) && /for that visit only/.test(read("megacity-privacy.html")), "the privacy page says what is kept and for how long");

console.log(bad ? `CAMPAIGN: ${bad} FAILURE(S)` : "CAMPAIGN: ALL PASS — every landlord enquiry says where it came from.");
process.exit(bad ? 1 : 0);

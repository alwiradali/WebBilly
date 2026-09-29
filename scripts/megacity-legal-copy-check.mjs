#!/usr/bin/env node
/* The legal and service wording Walid asked to be put right (26 Sep 2026),
   pinned so an old sentence cannot come back with a template edit:
     node scripts/megacity-legal-copy-check.mjs
   Checked against gov.uk and legislation.gov.uk on 26 Sep 2026:
   - Awaab's Law applies to social housing (from 27 Oct 2025); for private
     renting the Renters' Rights Act roadmap says "TBC – subject to
     consultation". The site must not say it already applies.
   - Housing Act 2004 s.249A civil penalty: up to £40,000 from 1 May 2026
     (S.I. 2026/319). Rent repayment orders: up to 2 years' rent from 1 May
     2026 (Housing and Planning Act 2016 s.44).
   - DPS Insured: the member (agent or landlord) holds the money, DPS
     insures it. Nothing may say the deposit sits with or goes to DPS.
   - Tenancies are assured periodic from 1 May 2026: no tenancy "renewals".
   A Studio edit (Website section) is stored separately and wins over these
   templates on the live site, so this pins the templates, not the edits. */
import { readFileSync } from "node:fs";
import * as u from "../worker/studio/urls.js";

let bad = 0;
const ok = (c, what) => { console.log((c ? "ok   " : "FAIL ") + what); if (!c) bad++; };
const read = (f) => readFileSync(new URL("../templates/" + f, import.meta.url), "utf8");
const text = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")
  .replace(/&rsquo;/g, "’").replace(/&amp;/g, "&").replace(/&pound;/g, "£").replace(/&nbsp;/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ");

const LIVE = [...new Set([...u.PUBLIC_STATIC_SLUGS, "let-template", "page-template", "404"])].map((s) => "megacity-" + s + ".html");
const pages = LIVE.map((f) => ({ f, t: text(read(f)) }));
const any = (re) => pages.filter((p) => re.test(p.t)).map((p) => p.f.replace(/^megacity-|\.html$/g, ""));
const none = (re, what) => { const hit = any(re); ok(hit.length === 0, what + (hit.length ? " — still on: " + hit.join(", ") : "")); };

/* Awaab's Law */
none(/extended to the private rented sector/i, "no page says Awaab's Law has been extended to private renting");
none(/Under Awaab’s Law (there are|serious hazards)/i, "no page says Awaab's Law timescales bind private landlords now");
none(/clock on damp and mould is now a legal one/i, "Full Management does not say the damp clock is already a legal one");
none(/timescales for damp, mould and hazards are tightening/i, "no page leans on 'tightening' timescales");
const awaab = pages.filter((p) => /Awaab/.test(p.t));
const vague = awaab.filter((p) => !/social housing/.test(p.t)).map((p) => p.f);
ok(vague.length === 0, "every page that names Awaab's Law says where it applies now (social housing)" + (vague.length ? " — not on: " + vague.join(", ") : ""));
ok(/date still to be confirmed/.test(text(read("megacity-journal.html"))) && /27 October 2025/.test(text(read("megacity-journal.html"))), "the Journal gives the social-housing start date and says the private date is not set");
for (const f of ["megacity-renting.html", "megacity-for-landlords.html", "megacity-fully-managed.html", "megacity-maintenance.html"]) {
  ok(/promptly/.test(text(read(f))), `${f.replace(/^megacity-|\.html$/g, "")} says damp, mould and hazards are dealt with promptly`);
}

/* penalties */
none(/civil penalty of up to £30,000(?! on)(?!\))/i, "no page gives £30,000 as today's maximum civil penalty");
none(/up to twelve months’ rent(?! \(| where)/i, "no page gives twelve months as today's maximum rent repayment order");
for (const f of ["megacity-hmo.html", "megacity-journal.html"]) {
  const t = text(read(f));
  ok(/£40,000/.test(t) && /two years’ rent/.test(t) && /1 May 2026/.test(t), `${f.replace(/^megacity-|\.html$/g, "")}: £40,000 and two years' rent, from 1 May 2026`);
}

/* deposits */
none(/sits with the independent DPS|Deposits held in the DPS|Deposits go to the Deposit Protection Service/i, "nothing describes the deposit as held by DPS");
ok(/DPS Insured/.test(text(read("megacity-renting.html"))) && /held by us, or by your landlord/.test(text(read("megacity-renting.html"))), "the tenant FAQ says DPS Insured and who holds the money");
ok(/held by us, or by you if you hold it yourself/.test(text(read("megacity-for-landlords.html"))), "the landlord FAQ says who holds the money");
none(/each renewal is treated as a separate tenancy|every renewal counts as a fresh breach/i, "no deposit-penalty maths built on tenancy renewals");

/* periodic tenancies */
none(/Tenancy renewals|renewals handled so the tenancy|drifts onto a periodic|the renewal is your call/i, "no tenancy renewals on the service pages");
none(/(Repairs, inspections, renewals|certificates, renewals and)/i, "no 'renewals' in the service summaries");

/* Walid's other points */
none(/twelve years|12 years/i, "Walid's experience is not given as twelve years");
ok(any(/fifteen years in letting and management/).length >= 2, "fifteen years, on the home page and About");
none(/You keep the keys/i, "the old Rent Collection line is gone");
ok(/You manage the property\. We collect and account for the rent\./.test(text(read("megacity-rent-collection.html"))), "Rent Collection: 'You manage the property. We collect and account for the rent.'");
none(/direct number|direct line|one named person|named property manager/i, "no promise of a named manager's direct number");
none(/360° (tour|walkthrough) (and professional photography )?on every|Every home we manage gets/i, "no promise of a 360° tour on every home");
for (const f of ["megacity-renting.html", "megacity-maintenance.html"]) {
  const t = text(read(f));
  ok(/0800 111 999/.test(t) && /\b105\b/.test(t) && /\b999\b/.test(t) && /outside office hours/i.test(t), `${f.replace(/^megacity-|\.html$/g, "")}: out-of-hours emergency numbers (gas 0800 111 999, power cut 105, 999)`);
  /* Megacity's own emergency line, from its WhatsApp Business profile (28 Sep) */
  ok(/07487 695077/.test(t) && read(f).includes('href="https://wa.me/447487695077"') && read(f).includes('href="tel:+447487695077"'), `${f.replace(/^megacity-|\.html$/g, "")}: the emergency line 07487 695077, to call or WhatsApp`);
}
for (const f of ["megacity-privacy.html", "megacity-terms.html"]) {
  ok(/Last updated <time datetime="\d{4}-\d{2}-\d{2}">/.test(read(f)) && !/last updated when this website was published/.test(read(f)), `${f.replace(/^megacity-|\.html$/g, "")} carries a real "last updated" date`);
}
/* the Tenants page leads with the emergency line, straight under the hero */
{
  const h = read("megacity-renting.html");
  const banner = h.slice(h.indexOf('<section class="emerg"'), h.indexOf("</section>", h.indexOf('<section class="emerg"')));
  ok(h.indexOf('<section class="emerg"') > 0 && h.indexOf('<section class="emerg"') < h.indexOf('id="actions"'), "Tenants: an emergency banner sits under the hero, above everything else");
  ok(/href="tel:\+447487695077"/.test(banner) && /href="https:\/\/wa\.me\/447487695077"/.test(banner), "  with Call and WhatsApp for 07487 695077");
  ok(/href="tel:0800111999"/.test(banner) && /href="tel:105"/.test(banner) && /href="tel:999"/.test(banner), "  and gas, power cut and 999 as tappable numbers");
}
const pv = text(read("megacity-privacy.html"));
ok(/Google Maps/.test(pv) && /one-way code/.test(pv) && /only ever used if you agree/.test(pv), "the privacy page covers Google Maps, the site's own counting, and consent-only cookies");
const tools = readFileSync(new URL("../templates/megacity-tools.js", import.meta.url), "utf8");
ok(/id="ratesSources"/.test(read("megacity-tools.html")) && /sources: \[/.test(tools) && /ratesSources/.test(tools), "the calculators print a source and date for their figures");
for (const k of ["Rental estimate", "Mortgage", "Council tax", "Stamp duty", "Affordability", "Gross yield"]) ok(tools.includes(`["${k}", "`), `  source given for ${k}`);

console.log(bad ? `LEGAL COPY: ${bad} FAILURE(S)` : "LEGAL COPY: ALL PASS — the law as it stands on 26 Sep 2026, and nothing promised that is not offered.");
process.exit(bad ? 1 : 0);

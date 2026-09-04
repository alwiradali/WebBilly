#!/usr/bin/env node
/* The link rules, pinned. Run before a deploy: node scripts/megacity-urls-check.mjs */
import assert from "node:assert/strict";
import * as u from "../worker/studio/urls.js";

const R = (v) => u.rewriteHref(v, "root");
const cases = [
  ["megacity-skyline", "/"], ["megacity-skyline#top", "/#top"], ["megacity-properties", "/lettings"],
  ["megacity-for-landlords#fees", "/landlords#fees"], ["megacity-renting#register", "/tenants#register"],
  ["megacity-privacy#cookies", "/privacy-policy#cookies"], ["megacity-let-room-3", "/let/room-3"],
  ["megacity-studio", "/studio"], ["megacity-skyline.css", "/templates/megacity-skyline.css"],
  ["megacity-skyline.js", "/templates/megacity-skyline.js"], ["megacity-urls.js", "/templates/megacity-urls.js"],
  ["megacity-sitemap.xml", "/sitemap.xml"], ["megacity-renting-in-salford", "/renting-in-salford"],
  ["megacity-tenant-application-form?property=Flat+1&listing=x", "/tenant-application-form?property=Flat+1&listing=x"],
  ["assets/mcr/hero-wide.jpg", "/templates/assets/mcr/hero-wide.jpg"], ["./assets/mcr/x.jpg", "/templates/assets/mcr/x.jpg"],
  ["vendor/gsap.min.js", "/templates/vendor/gsap.min.js"], ["megacity-about-us.html", "/about-us"],
  ["#main", "#main"], ["/favicon.ico?v=4", "/favicon.ico?v=4"], ["/billy360/?site=x", "/billy360/?site=x"], ["/media/l/a/b/w480.jpg", "/media/l/a/b/w480.jpg"],
  ["https://megacityproperties-maintenance.10ninety.co.uk", "https://megacityproperties-maintenance.10ninety.co.uk"],
  ["mailto:info@megacityproperties.co.uk", "mailto:info@megacityproperties.co.uk"], ["tel:+441612201763", "tel:+441612201763"],
  ["https://wa.me/447804900719", "https://wa.me/447804900719"], ["", ""],
];
for (const [inp, want] of cases) assert.equal(R(inp), want, `rewriteHref(${JSON.stringify(inp)})`);
for (const [inp] of cases) assert.equal(u.rewriteHref(inp, "demo"), inp, `demo mode must not touch ${JSON.stringify(inp)}`);

assert.equal(u.rewriteSrcset("assets/mcr/a.jpg 760w, assets/mcr/b.jpg 1400w", "root"), "/templates/assets/mcr/a.jpg 760w, /templates/assets/mcr/b.jpg 1400w");
assert.equal(u.rewriteStyle("--ph-img:url('assets/mcr/ph-maintenance.jpg');color:red", "root"), "--ph-img:url('/templates/assets/mcr/ph-maintenance.jpg');color:red");
assert.equal(u.rewriteStyle("background:url(assets/mcr/x.jpg)", "root"), "background:url(/templates/assets/mcr/x.jpg)");
assert.equal(u.rewriteStyle("background:url(\"/media/x.jpg\")", "root"), "background:url(\"/media/x.jpg\")");

assert.deepEqual(u.resolveRoot("/"), { kind: "home", slug: "skyline" });
assert.deepEqual(u.resolveRoot("/lettings"), { kind: "page", slug: "properties" });
assert.deepEqual(u.resolveRoot("/let/room-3"), { kind: "listing", slug: "room-3" });
assert.deepEqual(u.resolveRoot("/studio"), { kind: "studio", slug: "studio" });
assert.deepEqual(u.resolveRoot("/renting-in-salford"), { kind: "cms", slug: "renting-in-salford" });
assert.equal(u.resolveRoot("/let/"), null); assert.equal(u.resolveRoot("/a/b"), null); assert.equal(u.resolveRoot("/x_y"), null);

assert.equal(u.legacyRedirect("/tenants/register"), "/tenants#register");
assert.equal(u.legacyRedirect("/free-valuation/commercial"), "/valuation");
assert.equal(u.legacyRedirect("/blog/some-post"), "/journal");
assert.equal(u.legacyRedirect("/megacity-let-room-7"), "/let/room-7");
assert.equal(u.legacyRedirect("/megacity-for-landlords"), "/landlords");
assert.equal(u.legacyRedirect("/lettings"), null);

const envRoot = { MEGACITY_HOST: "www.megacityproperties.co.uk,megacityproperties.co.uk", MEGACITY_PUBLIC_BASE: "https://billydigitals.com/templates/" };
const live = new URL("https://www.megacityproperties.co.uk/lettings");
const demo = new URL("https://billydigitals.com/templates/megacity-properties");
assert.equal(u.mode(envRoot, live.hostname), "root"); assert.equal(u.mode(envRoot, demo.hostname), "demo");
assert.equal(u.canonicalHost(envRoot), "www.megacityproperties.co.uk");
assert.equal(u.absUrl(envRoot, live, "page", "skyline"), "https://www.megacityproperties.co.uk/");
assert.equal(u.absUrl(envRoot, live, "listing", "room-3"), "https://www.megacityproperties.co.uk/let/room-3");
assert.equal(u.absUrl(envRoot, live, "asset", "assets/mcr/ph.jpg"), "https://www.megacityproperties.co.uk/templates/assets/mcr/ph.jpg");
assert.equal(u.absUrl(envRoot, live, "asset", "/media/l/x/w1600.jpg"), "https://www.megacityproperties.co.uk/media/l/x/w1600.jpg");
assert.equal(u.absUrl(envRoot, live, "asset", "https://cdn.example/x.jpg"), "https://cdn.example/x.jpg");
assert.equal(u.absUrl(envRoot, live, "studio"), "https://www.megacityproperties.co.uk/studio");
assert.equal(u.absUrl(envRoot, live, "cms", "renting-in-salford"), "https://www.megacityproperties.co.uk/renting-in-salford");
assert.equal(u.absUrl(envRoot, demo, "page", "skyline"), "https://billydigitals.com/templates/megacity-skyline");
assert.equal(u.absUrl(envRoot, demo, "listing", "room-3"), "https://billydigitals.com/templates/megacity-let-room-3");
assert.equal(u.absUrl(envRoot, demo, "asset", "assets/mcr/ph.jpg"), "https://billydigitals.com/templates/assets/mcr/ph.jpg");
assert.equal(u.absUrl(envRoot, demo, "asset", "/media/x.jpg"), "https://billydigitals.com/media/x.jpg");
assert.equal(u.absUrl(envRoot, demo, "studio"), "https://billydigitals.com/templates/megacity-studio");
assert.equal(u.absUrl({}, new URL("http://localhost:8787/templates/megacity-x"), "page", "skyline"), "http://localhost:8787/templates/megacity-skyline");
assert.equal(u.publicBase({}, live), "https://www.megacityproperties.co.uk/templates/");
console.log("megacity-urls-check: all " + cases.length + " link cases and the mode/absUrl cases pass");

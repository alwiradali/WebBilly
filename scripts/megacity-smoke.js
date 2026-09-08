#!/usr/bin/env node
/* Megacity smoke test in a real browser, for both hosts.
     node scripts/megacity-smoke.js http://www.megacityproperties.co.uk:8787   (root mode; needs a hosts entry)
     node scripts/megacity-smoke.js http://localhost:8787 --demo               (demo mode)
   Checks: no failed requests or console errors, nav links right for the host,
   every picture loads, search results link to listings, the 404 page, the
   Studio. Playwright + Chromium (CHROME=path to the browser); set FONT_CSS to
   a saved Google Fonts stylesheet to run offline. */
module.paths.push("/opt/node22/lib/node_modules");   // playwright is installed globally on the build box
const { chromium } = require("playwright");
const fs = require("fs");

const BASE = (process.argv[2] || "http://localhost:8787").replace(/\/$/, "");
const DEMO = process.argv.includes("--demo");
const MAP = { skyline: "/", properties: "/lettings", "for-landlords": "/landlords", renting: "/tenants" };
const P = (slug) => (DEMO ? "/templates/megacity-" + slug : MAP[slug] || "/" + slug);
const LET = (id) => (DEMO ? "/templates/megacity-let-" + id : "/let/" + id);
const STUDIO = DEMO ? "/templates/megacity-studio" : "/studio";
const fontCss = process.env.FONT_CSS && fs.existsSync(process.env.FONT_CSS) ? fs.readFileSync(process.env.FONT_CSS, "utf8") : null;
let fails = 0;
const ok = (c, what) => { console.log((c ? "ok   " : "FAIL ") + what); if (!c) fails++; };

(async () => {
  /* software WebGL so the 360 frame really renders on a machine with no GPU */
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: true });
  /* third parties answer with empty bodies so an offline run stays quiet */
  await ctx.route(/fonts\.googleapis\.com/, (r) => r.fulfill({ contentType: "text/css", body: fontCss || "" }));
  await ctx.route(/fonts\.gstatic\.com|google\.com\/maps|googletagmanager|facebook\.net/, (r) => r.fulfill({ status: 204, body: "" }));
  const page = await ctx.newPage();
  const bad = [], errors = [];
  page.on("requestfailed", (r) => { if (!/fonts\.|google\.com\/maps|googletagmanager|facebook/.test(r.url())) bad.push("failed " + r.url()); });
  page.on("response", (r) => { if (r.status() >= 400 && !/this-does-not-exist|\/api\/studio\/auth\/me/.test(r.url())) bad.push(r.status() + " " + r.url()); });
  page.on("console", (m) => { if (m.type() === "error" && !/401 \(Unauthorized\)/.test(m.text())) errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  const pages = [P("skyline"), P("properties"), P("for-landlords"), P("renting"), LET("denmark-road"), P("tenant-application-form"), P("about-us")];
  for (const path of pages) {
    bad.length = 0; errors.length = 0;
    const res = await page.goto(BASE + path, { waitUntil: "networkidle" });
    ok(res && res.status() === 200, "GET " + path + " -> " + (res && res.status()));
    const robots = await page.$('meta[name="robots"]');
    ok(DEMO ? !!robots : !robots, path + (DEMO ? " keeps noindex on the demo host" : " has no noindex"));
    const hrefs = await page.$$eval(".nav-links a, .footer a, .mm-acc a", (as) => as.map((a) => a.getAttribute("href")));
    const wrong = hrefs.filter((h) => h && !/^(https?:|mailto:|tel:|#)/.test(h) && (DEMO ? !/^megacity-|^\//.test(h) : !h.startsWith("/")));
    ok(!wrong.length, path + " nav/footer links suit the host" + (wrong.length ? " (" + wrong.slice(0, 3).join(", ") + ")" : ""));
    if (!DEMO) ok(!hrefs.some((h) => h && /\/templates\/megacity-/.test(h)), path + " has no demo-shaped links");
    /* a picture that finished loading with no size is broken; lazy ones below the fold are simply not fetched yet */
    const imgs = await page.$$eval("img", (els) => els.filter((i) => i.getAttribute("src")).map((i) => ({ src: i.currentSrc || i.src, broken: i.complete && i.naturalWidth === 0 })));
    const broken = imgs.filter((i) => i.broken);
    ok(!broken.length, path + " pictures load (" + imgs.length + ")" + (broken.length ? " broken: " + broken.slice(0, 2).map((b) => b.src).join(", ") : ""));
    ok(!bad.length, path + " no failed requests" + (bad.length ? ": " + bad.slice(0, 3).join(" | ") : ""));
    ok(!errors.length, path + " no console errors" + (errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""));
    if (path === P("skyline")) {
      const current = await page.$eval('.nav-links a[aria-current="page"]', (a) => a.textContent.trim()).catch(() => null);
      ok(current === "Home", "home nav item is marked current (" + current + ")");
      await page.click("#navSearch");
      await page.fill("#slInput", "room");
      await page.waitForTimeout(800);
      const results = await page.$$eval("#slRes a", (as) => as.map((a) => a.getAttribute("href")));
      const homes = results.filter((h) => /let/.test(h));
      ok(homes.length > 0 && homes.every((h) => (DEMO ? /megacity-let-/.test(h) : h.startsWith("/let/"))), "search results link to listings for this host (" + homes.slice(0, 2).join(", ") + ")");
      await page.keyboard.press("Escape");
    }
    if (path === P("properties")) {
      const first = await page.$eval(".pl-card", (a) => a.getAttribute("href"));
      ok(DEMO ? /megacity-let-/.test(first) : first.startsWith("/let/"), "first property card links to " + first);
    }
    if (path === P("renting")) ok(!!(await page.$("[data-register]")), "tenant register form is on the page");
    if (path === P("for-landlords")) {
      /* /landlords/register/ on the old site 301s to this anchor, so the anchor
         has to BE the form — it was a band of buttons until 8 September. */
      const reg = await page.evaluate(() => {
        const sec = document.getElementById("register");
        const f = document.querySelector("[data-landlord]");
        return { isForm: !!(sec && sec.querySelector("[data-landlord]")), selects: f ? f.querySelectorAll("select").length : 0 };
      });
      ok(reg.isForm, "#register on the landlords page is the registration form");
      ok(reg.selects >= 8, "the landlord form asks about the property (" + reg.selects + " dropdowns)");
    }
    if (path === P("tenant-application-form")) ok(!!(await page.$("[data-apply]")), "application form is on the page");
    if (!DEMO) {
      const styles = await page.$$eval("[style]", (els) => els.map((e) => e.getAttribute("style")).filter((s) => /url\(['"]?assets\//.test(s)));
      ok(!styles.length, path + " has no relative url() left in inline styles");
    }
  }
  /* The phone nav. Below 1360px the burger is the ONLY navigation — .nav-links
     is hidden — so if it does not open, a phone visitor cannot leave the page.
     It shipped broken because the handler threw on its first line, and nothing
     here pressed it: the loop above records console errors, but this one only
     fires on interaction. Open and close it on a real touch context. */
  {
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, ignoreHTTPSErrors: true });
    await phone.route(/fonts\.googleapis\.com/, (r) => r.fulfill({ contentType: "text/css", body: fontCss || "" }));
    await phone.route(/fonts\.gstatic\.com|google\.com\/maps|googletagmanager|facebook\.net/, (r) => r.fulfill({ status: 204, body: "" }));
    for (const path of [P("skyline"), P("properties")]) {
      const pp = await phone.newPage();
      const errs = [];
      pp.on("console", (m) => { if (m.type() === "error" && !/401 \(Unauthorized\)/.test(m.text())) errs.push(m.text()); });
      pp.on("pageerror", (e) => errs.push(String(e)));
      await pp.goto(BASE + path, { waitUntil: "load" });
      await pp.tap("#burger");
      await pp.waitForTimeout(450);
      const open = await pp.evaluate(() => {
        const m = document.getElementById("megamenu"), b = document.getElementById("burger"), a = m && m.querySelector("a");
        return { hidden: m.hidden, cls: m.className, aria: b.getAttribute("aria-expanded"), link: !!(a && a.getBoundingClientRect().height > 0) };
      });
      const opened = open.hidden === false && /is-open/.test(open.cls) && open.aria === "true" && open.link;
      ok(opened, path + " menu opens on a phone (" + open.cls + ", aria-expanded=" + open.aria + ")");
      /* only meaningful if it opened — otherwise "still shut" passes for the
         wrong reason and reads as a pass next to the real failure */
      if (opened) {
        await pp.tap("#burger");
        await pp.waitForTimeout(450);
        const shut = await pp.evaluate(() => ({ aria: document.getElementById("burger").getAttribute("aria-expanded"), body: document.body.className }));
        ok(shut.aria === "false" && !/mm-open/.test(shut.body), path + " menu closes again on a phone");
      }
      ok(!errs.length, path + " no errors opening the phone menu" + (errs.length ? ": " + errs.slice(0, 2).join(" | ") : ""));
      await pp.close();
    }
    await phone.close();
  }

  /* the 360 tour: the listing page reserves the frame's box before embed.js
     runs, and the frame opens on the panorama of the listing's cover room. */
  {
    let canary = process.env.MEGACITY_TOUR_CANARY || "";
    if (!canary) {
      const r = await page.goto(BASE + "/api/public/tours", { waitUntil: "domcontentloaded" }).catch(() => null);
      if (r && r.status() === 200) {
        const body = await page.evaluate(() => { try { return JSON.parse(document.body.innerText); } catch (e) { return null; } });
        canary = (body && body.items && body.items[0] && body.items[0].id) || "";
      }
    }
    if (!canary) console.log("skip 360 tour checks — no live tour yet (publish one, or set MEGACITY_TOUR_CANARY)");
    else {
      bad.length = 0; errors.length = 0;
      let hold = true;
      await page.route(/\/billy360\/embed\.js/, async (r) => { while (hold) await new Promise((res) => setTimeout(res, 50)); return r.continue(); });
      await page.goto(BASE + LET(canary), { waitUntil: "commit" });
      const host = await page.waitForSelector(".pd-tour", { timeout: 20000 }).catch(() => null);
      if (!host) ok(false, "listing page has a tour box for " + canary);
      else {
        const before = await page.evaluate(() => { const n = document.querySelector(".pd-tour"); const r = n.getBoundingClientRect();
          return { h: r.height, y: r.top + scrollY, id: n.getAttribute("data-billy360"), room: n.getAttribute("data-room") }; });
        ok(before.h > 200 && before.id === canary, "tour box is reserved before embed.js runs (" + Math.round(before.h) + " px, id " + before.id + ")");
        ok(!!before.room, "the listing tells the frame which room to open (" + before.room + ")");
        hold = false;
        /* embed.js only builds the frames near the viewport, so bring it into view */
        await page.evaluate(() => document.querySelector(".pd-tour").scrollIntoView({ block: "center" }));
        await page.waitForFunction(() => !!document.querySelector(".pd-tour iframe"), null, { timeout: 20000 }).catch(() => {});
        const after = await page.evaluate(() => { const n = document.querySelector(".pd-tour"); const f = n.querySelector("iframe"); const r = n.getBoundingClientRect();
          return { h: r.height, y: r.top + scrollY, src: f && f.getAttribute("src"), fits: f ? Math.abs(f.getBoundingClientRect().height - r.height) < 2 : false, kids: n.children.length }; });
        ok(Math.abs(after.h - before.h) < 2 && Math.abs(after.y - before.y) < 2, "the box does not move when the frame lands (" + Math.round(before.h) + " → " + Math.round(after.h) + " px)");
        ok(after.fits && after.kids === 1 && /embed=1/.test(after.src || ""), "the iframe fills the box with no wrapper (" + after.src + ")");
        ok(!!after.src && after.src.indexOf("#/tour/" + before.room) > 0, "the frame opens on the cover room");
        let frame = null;
        for (let i = 0; i < 40 && !frame; i++) { frame = page.frames().find((f) => /billy360\/\?site=/.test(f.url())); if (!frame) await page.waitForTimeout(250); }
        if (!frame) ok(false, "the tour frame is on the page");
        else {
          const booted = await frame.waitForFunction(() => window.BILLY360App && window.BILLY360App.engine() && document.querySelector("#loader.is-done"), null, { timeout: 90000 }).then(() => true, () => false);
          const view = booted ? await frame.evaluate(() => ({ view: (document.querySelector(".view.is-active") || {}).id, room: (document.querySelector("#roomName") || {}).textContent, poster: !!document.querySelector("#poster") })) : {};
          ok(booted && view.view === "viewTour" && !!view.room, "the framed viewer opens on the panorama (" + (view.room || "-") + ")");
          ok(!booted || view.poster, "a poster holds the first tap so the listing keeps scrolling");
        }
        ok(!errors.length, "the tour frame has no console errors" + (errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""));
      }
      await page.unroute(/\/billy360\/embed\.js/);
      if (!DEMO) {
        const pretty = await page.goto(BASE + "/tour/" + canary, { waitUntil: "domcontentloaded" });
        ok(pretty && pretty.status() === 200, "GET /tour/" + canary + " -> " + (pretty && pretty.status()));
        const booted = await page.waitForFunction(() => window.BILLY360_STORE && window.BILLY360_STORE.mode === "public", null, { timeout: 30000 }).then(() => true, () => false);
        ok(booted, "the pretty tour link boots the viewer in public mode");
      }
    }
  }

  /* the 404 page */
  const nf = await page.goto(BASE + "/this-does-not-exist", { waitUntil: "domcontentloaded" });
  ok(nf.status() === 404, "unknown path answers 404");
  if (!DEMO) ok(/moved on/.test(await page.content()), "404 is the Megacity page");
  /* the Studio */
  bad.length = 0; errors.length = 0;
  await page.goto(BASE + STUDIO + (DEMO ? "?mock=1" : ""), { waitUntil: "networkidle" });
  const studioText = await page.textContent("body");
  ok(/Sign in|Megacity Studio|Home|Not connected/.test(studioText), "Studio renders at " + STUDIO);
  ok(!errors.length, "Studio has no console errors" + (errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""));
  if (DEMO) {
    await page.goto(BASE + STUDIO + "?mock=1#/settings/redirects", { waitUntil: "networkidle" });
    await page.waitForFunction(() => /Missing addresses/.test(document.body.textContent), null, { timeout: 8000 }).catch(() => {});
    const t = await page.textContent("body");
    ok(/Missing addresses/.test(t) && /tenants\/register/.test(t), "Redirects & 404s screen renders with sample rows (mock)" + (/Missing addresses/.test(t) ? "" : " — body starts: " + t.replace(/\s+/g, " ").trim().slice(0, 160)));
    await page.goto(BASE + STUDIO + "?mock=1#/integrations", { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    ok(!!(await page.$("#f_gtmId")), "Integrations shows the Tag Manager field");
    ok(!errors.length, "Studio screens have no console errors" + (errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""));
  }
  await browser.close();
  console.log(fails ? "SMOKE: " + fails + " FAILURE(S)" : "SMOKE: ALL PASS");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });

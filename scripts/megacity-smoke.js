#!/usr/bin/env node
/* Megacity smoke test in a real browser, for both hosts.
     node scripts/megacity-smoke.js http://www.megacityproperties.co.uk:8787   (root mode; needs a hosts entry)
     node scripts/megacity-smoke.js http://localhost:8787 --demo               (demo mode)
   Checks: no failed requests or console errors, nav links right for the host,
   every picture loads, search results link to listings, the 404 page, the
   Studio. Playwright + Chromium (CHROME=path to the browser); set FONT_CSS to
   a saved Google Fonts stylesheet to run offline. */
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
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ["--no-sandbox"] });
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
    if (path === P("tenant-application-form")) ok(!!(await page.$("[data-apply]")), "application form is on the page");
    if (!DEMO) {
      const styles = await page.$$eval("[style]", (els) => els.map((e) => e.getAttribute("style")).filter((s) => /url\(['"]?assets\//.test(s)));
      ok(!styles.length, path + " has no relative url() left in inline styles");
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
    await page.waitForTimeout(600);
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

#!/usr/bin/env node
/* 360° video on a phone that is several years old.
 *
 * Equirectangular video is the most expensive thing this site can draw. Every
 * frame of it has to be pushed to the GPU, and in WebGL 1 that upload is
 * synchronous main-thread work — there is no asynchronous texture upload. So
 * the question is never whether it is expensive; it is what gives way.
 *
 * The answer this viewer commits to: the FOOTAGE gives way, never the
 * panning. Measured here, 2048x1024 footage, CPU throttled 6x, software
 * renderer, which is harder than any real phone:
 *
 *     a frame uploaded every time  ->  16fps on screen
 *     every second frame           ->  29fps
 *     every fourth                 ->  59fps, the same as an empty page
 *
 * So the viewer paces uploads by the frame interval it actually measures, and
 * only reaches for resolution once pacing is exhausted. This asserts the
 * outcome: dragging stays smooth, whatever it costs the picture.
 *
 * It also asserts that nothing downloads before the visitor presses play,
 * which is the difference between a listing page an old phone can open and
 * one it cannot.
 *
 *   (cd . && python3 -m http.server 8971) &
 *   node scripts/megacity-video360-check.js
 */
module.paths.push("/opt/node22/lib/node_modules");
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = (process.argv[2] || "http://127.0.0.1:8971").replace(/\/$/, "");
const CPU = Number(process.env.CPU || 6);
let bad = 0;
const ok = (c, w) => { console.log((c ? "ok   " : "FAIL ") + w); if (!c) bad++; };

/* Served from the repo rather than set as content: the viewer asks for the
   video with crossOrigin="anonymous", as it must to use it as a texture, and
   a page on about:blank makes that a cross-origin request a static server
   will not answer. */
const HARNESS = "/scripts/fixtures/video360-harness.html";

(async () => {
  try { const r = await fetch(BASE + "/templates/megacity-video360.js"); if (!r.ok) throw new Error(String(r.status)); }
  catch {
    console.error(`no static server on ${BASE} — run:  (cd ${process.cwd()} && python3 -m http.server 8971)`);
    process.exit(2);
  }
  if (!fs.existsSync(path.join(process.cwd(), "scripts/fixtures/pano-test.webm"))) {
    console.error("scripts/fixtures/pano-test.webm is missing");
    process.exit(2);
  }

  /* Playwright's Chromium has no H.264, so the fixture is VP8 in WebM — both
     are formats the product accepts (STREAM_TYPES in worker/studio/media.js). */
  const browser = await chromium.launch({ args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon/.test(m.text())) errs.push(m.text().slice(0, 160)); });

  /* what actually goes over the wire, and when */
  const asked = [];
  page.on("request", (r) => { if (/pano-test\.webm/.test(r.url())) asked.push(r.url()); });

  await page.addInitScript(() => {
    window.__f = []; let l = performance.now();
    const t = () => { const n = performance.now(); window.__f.push(Math.round(n - l)); l = n; requestAnimationFrame(t); };
    requestAnimationFrame(t);
  });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
  await page.goto(BASE + HARNESS, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(2500);

  ok(!!(await page.$(".v360-start")), "the page shows a play button, not a player");
  ok(asked.length === 0, `and has not fetched a byte of the video (${asked.length} requests)`);

  await page.click(".v360-start");
  await page.waitForTimeout(12000);   // let the pacing settle

  ok(!!(await page.$(".v360-canvas")), "pressing play builds the sphere");
  ok(!!(await page.$(".v360-bar")), "with a pause button");
  ok(asked.length > 0, "and now the video is fetched");

  /* it is drawing the video, not a black box, and it answers the finger */
  const el = await page.$(".pd-v360");
  const before = (await el.screenshot()).toString("base64");
  const b = await el.boundingBox();
  await page.evaluate(() => { window.__f.length = 0; });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  for (let i = 0; i < 24; i++) { await page.mouse.move(b.x + b.width / 2 - i * 9, b.y + b.height / 2 + (i % 4)); await page.waitForTimeout(16); }
  await page.mouse.up();
  await page.waitForTimeout(800);
  const after = (await el.screenshot()).toString("base64");
  ok(before !== after, "dragging moves the view");

  const r = await page.evaluate(() => {
    const f = window.__f.filter((x) => x > 0).sort((a, b) => a - b);
    return { n: f.length, median: f[Math.floor(f.length / 2)] || 0, p90: f[Math.floor(f.length * 0.9)] || 0,
      worst: f[f.length - 1] || 0, over100: f.filter((x) => x > 100).length };
  });
  const st = await page.evaluate(() => { const c = document.querySelector(".v360-canvas"); return c ? c.width + "x" + c.height : "none"; });
  console.log(`  dragging: ${r.n} frames, median ${r.median}ms, p90 ${r.p90}ms, worst ${r.worst}ms; canvas ${st}`);

  /* the bar. 34ms is 30fps — below that a drag stops feeling attached to the
     finger, which is the thing this whole viewer is arranged to avoid. */
  ok(r.median > 0 && r.median <= 34, `dragging keeps up (median ${r.median}ms, ${Math.round(1000 / (r.median || 1))}fps)`);
  ok(r.over100 === 0, `and never stalls (${r.over100} frames over 100ms)`);
  ok(errs.length === 0, "no errors" + (errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""));

  await browser.close();
  console.log(bad ? `\n360 VIDEO: ${bad} FAILED` : "\n360 VIDEO: ALL PASS — the footage gives way, the panning does not.");
  process.exit(bad ? 1 : 0);
})();

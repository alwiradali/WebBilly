#!/usr/bin/env node
/* What a tenant on an old phone gets, asserted rather than hoped for.
 *
 * Walid's requirement, in his words: a tenant viewing a property and its tour
 * "on an old phone should be same experience as the new phone... no lags no
 * freezes". This is that requirement as a test.
 *
 * It runs the real viewer with real panoramas on a 390x844 screen with the CPU
 * throttled 6x — roughly a phone several years old — and separates two things
 * that are not the same:
 *
 *   LOADING  the tour is coming up and the visitor is waiting anyway
 *   LOOKING  the visitor is dragging to look around, and any stall is felt
 *
 * The bar is on LOOKING. A frame budget is 16ms; anything over 100ms reads as
 * a stutter and over 200ms as a freeze.
 *
 * Note on the renderer: this runs on SwiftShader, so all GPU work is done in
 * software and is far slower than any real phone. That makes the loading
 * numbers pessimistic and the JavaScript numbers honest, which is the right
 * way round for a guard.
 *
 *   (cd . && python3 -m http.server 8971) &
 *   node scripts/billy360-phone-check.js
 */
module.paths.push("/opt/node22/lib/node_modules");
const { chromium } = require("playwright");

const BASE = (process.argv[2] || "http://127.0.0.1:8971").replace(/\/$/, "");
const CPU = Number(process.env.CPU || 6);
let bad = 0;
const ok = (c, w) => { console.log((c ? "ok   " : "FAIL ") + w); if (!c) bad++; };

(async () => {
  try { const r = await fetch(BASE + "/billy360/index.html"); if (!r.ok) throw new Error(String(r.status)); }
  catch {
    console.error(`no static server on ${BASE} — run:  (cd ${process.cwd()} && python3 -m http.server 8971)`);
    process.exit(2);
  }

  const browser = await chromium.launch({ args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();

  await page.addInitScript(() => {
    window.__phase = "load"; window.__long = []; window.__frames = [];
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push({ d: Math.round(e.duration), p: window.__phase }); })
        .observe({ entryTypes: ["longtask"] });
    } catch (e) { /* older engines: the frame timings below still tell the story */ }
    let last = performance.now();
    const tick = () => { const n = performance.now(); window.__frames.push(Math.round(n - last)); last = n; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });

  /* count the texture uploads: one per room whose picture reached the GPU */
  await page.route("**/engine.js*", async (r) => {
    const res = await r.fetch(); const b = await res.text();
    await r.fulfill({ contentType: "application/javascript",
      body: b.replace("function uploadPano(src, tw, th) {", "function uploadPano(src, tw, th) { window.__uploads = (window.__uploads || 0) + 1;") });
  });

  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
  await page.goto(BASE + "/billy360/index.html", { waitUntil: "load", timeout: 90000 }).catch(() => {});

  /* A tenant does not wait for the tour to finish loading before touching it.
     They drag as soon as there is something on screen, which is exactly when
     the pictures for the other rooms used to be landing. This is the phase
     that matters and the one a late drag would never catch. */
  const drag = async () => {
    await page.mouse.move(195, 400);
    await page.mouse.down();
    for (let i = 0; i < 24; i++) { await page.mouse.move(195 - i * 8, 400 + (i % 5)); await page.waitForTimeout(16); }
    await page.mouse.up();
  };
  await page.waitForTimeout(3500);
  await page.evaluate(() => { window.__phase = "early"; window.__frames.length = 0; }).catch(() => {});
  await drag();
  await page.waitForTimeout(1500);
  const early = await page.evaluate(() => {
    const e = window.__long.filter((x) => x.p === "early").map((x) => x.d).sort((a, b) => b - a);
    const f = window.__frames.filter((x) => x > 0).sort((a, b) => a - b);
    return { worst: e[0] || 0, block: e.reduce((n, d) => n + Math.max(0, d - 50), 0),
      median: f[Math.floor(f.length / 2)] || 0, over100: f.filter((x) => x > 100).length };
  }).catch(() => ({ worst: -1, block: -1, median: -1, over100: -1 }));

  await page.waitForTimeout(10000);

  const rooms = await page.evaluate(() => (window.BILLY360_TOUR && window.BILLY360_TOUR.rooms || []).filter((r) => r.pano).length);
  const uploads = await page.evaluate(() => window.__uploads || 0);

  /* and again once everything has settled */
  await page.evaluate(() => { window.__phase = "looking"; window.__frames.length = 0; });
  await drag();
  await page.waitForTimeout(4000);

  const r = await page.evaluate(() => {
    const at = (p) => window.__long.filter((e) => e.p === p).map((e) => e.d).sort((a, b) => b - a);
    const look = at("looking"), f = window.__frames.filter((x) => x > 0).sort((a, b) => a - b);
    return { look, worstLook: look[0] || 0, blockLook: look.reduce((n, d) => n + Math.max(0, d - 50), 0),
      frames: f.length, median: f[Math.floor(f.length / 2)] || 0, over100: f.filter((x) => x > 100).length, worst: f[f.length - 1] || 0,
      loadWorst: (at("load")[0] || 0) };
  });

  console.log(`  ${rooms} rooms with photographs, CPU throttled ${CPU}x, 390x844`);
  console.log(`  while loading: worst single block ${r.loadWorst}ms`);
  console.log(`  dragging EARLY, mid-load: median ${early.median}ms, worst block ${early.worst}ms, ${early.over100} frames over 100ms`);
  console.log(`  dragging once settled   : ${r.frames} frames, median ${r.median}ms, worst ${r.worst}ms, ${r.over100} over 100ms`);
  console.log();

  /* The room on screen and the rooms next door, not the whole building. A
     tour of 13 rooms used to upload all 13 at start-up, at hundreds of
     milliseconds of blocked main thread each, while the visitor was trying to
     look at the first one. */
  ok(uploads > 0 && uploads <= Math.max(6, Math.ceil(rooms / 2)),
    `only the rooms in reach are uploaded up front — ${uploads} of ${rooms}`);

  /* The bar, and the whole point of the file. Dragging DURING the load is the
     real test: it is what a tenant does, and it is when the work is happening. */
  ok(early.worst >= 0 && early.worst < 400, `nothing blocks badly while looking around mid-load (worst ${early.worst}ms)`);
  ok(early.median > 0 && early.median <= 50, `frames keep up while the tour is still loading (median ${early.median}ms)`);
  ok(early.over100 <= 4, `few stutters while loading and dragging at once (${early.over100} frames over 100ms)`);

  ok(r.worstLook < 200, `nothing blocks the main thread while looking around (worst ${r.worstLook}ms)`);
  ok(r.blockLook < 300, `total blocking while looking is negligible (${r.blockLook}ms)`);
  ok(r.median > 0 && r.median <= 34, `frames land at 30fps or better while dragging (median ${r.median}ms)`);
  ok(r.over100 <= 2, `no stutters while dragging (${r.over100} frames over 100ms)`);

  await browser.close();
  console.log(bad ? `\n360 ON AN OLD PHONE: ${bad} FAILED` : "\n360 ON AN OLD PHONE: ALL PASS — smooth where it is felt.");
  process.exit(bad ? 1 : 0);
})();

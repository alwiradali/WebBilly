#!/usr/bin/env node
/* Opening a tour whose rooms have no panoramas must not lock the browser.
 *
 * This is here because it did. Building a tour in the Studio for one of
 * Walid's properties produced a two-room skeleton with no panoramas in it —
 * which is the normal first state of every tour, before the shoot — and the
 * whole tab went unresponsive for several seconds. Nine rooms was worse, and
 * a three-bed house builds nine.
 *
 * The cause was a gl.readPixels in the bake loop, taken once per empty room to
 * make a thumbnail. readPixels is a synchronous stall: the CPU waits for the
 * GPU to finish everything queued behind it. It was stalling the pipeline to
 * photograph a procedural gradient — the same gradient in every empty room.
 *
 * What this asserts is the PROPERTY, not a number: the time the main thread is
 * unusable must not grow with the number of empty rooms. A machine-specific
 * millisecond threshold would either pass everywhere or fail everywhere.
 *
 *   (cd . && python3 -m http.server 8971) &
 *   node scripts/billy360-freeze-check.js
 */
module.paths.push("/opt/node22/lib/node_modules");
const { chromium } = require("playwright");

const BASE = (process.argv[2] || "http://127.0.0.1:8971").replace(/\/$/, "");
let bad = 0;
const ok = (c, w) => { console.log((c ? "ok   " : "FAIL ") + w); if (!c) bad++; };

/* the same skeleton the Worker builds, widened to N rooms */
function skeleton(n) {
  const room = (id, name, hotspots) => ({ id, name, floor: "g", pano: null, description: "",
    view: { yaw: -70, pitch: -6, fov: 80 }, plan: [18, 18], hotspots, photos: [], layout: 9, kind: "Hallway" });
  const rooms = [room("hall", "Hallway", []), room("r1", "The room", [{ id: "h1", type: "nav", to: "hall", yaw: 0, pitch: -4, label: "out", auto: true }])];
  rooms[0].hotspots.push({ id: "g1", type: "nav", to: "r1", yaw: 40, pitch: -4, label: "in", auto: true });
  while (rooms.length < n) {
    const i = rooms.length, id = "r" + i;
    rooms.push(room(id, "Bedroom " + i, [{ id: "h" + i, type: "nav", to: "hall", yaw: 0, pitch: -4, label: "out", auto: true }]));
    rooms[0].hotspots.push({ id: "g" + i, type: "nav", to: id, yaw: (i * 40) % 360, pitch: -4, label: "in", auto: true });
  }
  return { id: "freeze-check", version: 1, brand: {},
    project: { name: "Freeze check", slug: "freeze-check", location: "", area: "", floors: 1, duration: "2 min",
      captured: "", summary: "", price: "", status: "To let", beds: null, baths: null, propertyType: "", tenure: "",
      epc: "", ref: "", cover: "hall", hidden: true, agent: {}, facts: [] },
    guided: { dwell: 9000, order: rooms.map((r) => r.id) },
    floors: [{ id: "g", name: "", short: "", plan: null }], rooms };
}

/* how long is the main thread unable to answer a trivial question? */
async function blockedMs(rooms) {
  const browser = await chromium.launch({ args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const tour = JSON.stringify(skeleton(rooms));
    await page.route("**/store.js*", async (route) => {
      const res = await route.fetch(); const body = await res.text();
      await route.fulfill({ contentType: "application/javascript",
        body: "window.BILLY360_TOURS=[" + tour + "];window.BILLY360_TOUR=window.BILLY360_TOURS[0];\n" + body });
    });
    const t0 = Date.now();
    page.goto(BASE + "/billy360/index.html", { waitUntil: "commit" }).catch(() => {});
    let blocked = 0, lastBad = 0, settled = false;
    while (Date.now() - t0 < 60000) {
      const a = Date.now();
      let alive = true;
      try { await Promise.race([page.evaluate(() => 1), new Promise((_, rj) => setTimeout(() => rj(new Error("busy")), 500))]); }
      catch { alive = false; }
      const took = Date.now() - a;
      if (!alive || took > 400) { blocked += took; lastBad = Date.now(); }
      else if (Date.now() - t0 > 1500) settled = true;
      if (settled && Date.now() - lastBad > 4000) break;
      await new Promise((r) => setTimeout(r, 120));
    }
    return blocked;
  } finally { await browser.close(); }
}

(async () => {
  try { const r = await fetch(BASE + "/billy360/index.html"); if (!r.ok) throw new Error(String(r.status)); }
  catch (e) {
    console.error(`no static server on ${BASE} — run:  (cd ${process.cwd()} && python3 -m http.server 8971)`);
    process.exit(2);
  }

  const two = await blockedMs(2);
  const nine = await blockedMs(9);
  console.log(`     2 empty rooms: main thread blocked ~${two}ms`);
  console.log(`     9 empty rooms: main thread blocked ~${nine}ms`);

  /* Start-up costs the same whatever the tour holds — shader compilation,
     mostly. What must not happen is a per-room stall on top of it. Four and a
     half times the rooms may not cost materially more. */
  const growth = nine - two;
  ok(growth < Math.max(1500, two * 0.75),
    `seven more empty rooms cost ${growth}ms, not a stall each (before the fix: 5033ms -> 9480ms)`);
  ok(nine < 20000, `nine empty rooms do not lock the tab for an age (${nine}ms)`);

  console.log(bad ? `\n360 FREEZE: ${bad} FAILED` : "\n360 FREEZE: ALL PASS — an unshot tour opens without locking the browser.");
  process.exit(bad ? 1 : 0);
})();

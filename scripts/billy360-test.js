#!/usr/bin/env node
/* billy360 acceptance suite — one command, seven sections.
 *
 *   node scripts/billy360-test.js                     # everything
 *   node scripts/billy360-test.js --only=public,embed  # a subset (names or 1..7)
 *   node scripts/billy360-test.js --static=8971 --wrangler=8972
 *
 * Sections
 *   1 demo     local mode: the shipped demo tours still work end to end
 *   2 public   ?site= with a stubbed public API: fail-closed, one project, leads, a11y
 *   3 embed    the listing-page iframe: poster, passive wheel, replaceState, back bar
 *   4 devices  phone / landscape / tablet / reduced motion
 *   5 engine   engine.js on a bare rig: loading, memory, texture ladder, context loss
 *   6 office   ?office=1 against wrangler dev: intake, save queue, publish, Studio, /tour/<id>
 *   7 data     one-room and forty-room tours, throttled 4G
 *
 * Needs a static server on --static (python3 -m http.server 8971 in the repo root)
 * and, for section 6, wrangler dev on --wrangler with the megacity bindings and
 * migrations 0003 + 0004 applied. Every section runs to the end; the process
 * exits non-zero if anything failed, and prints a per-section table either way.
 *
 * Knobs: CHROME (browser binary), MEGACITY_LISTING / MEGACITY_HOST (section 6),
 * STUDIO_EMAIL / STUDIO_PASSWORD, BILLY360_OFFICE_ONLY=<letters a-h> to run part
 * of section 6, BILLY360_OUT (screenshots and fixtures, default a temp folder).
 */
"use strict";
process.env.NO_PROXY = process.env.NO_PROXY || "localhost,127.0.0.1";
module.paths.push("/opt/node22/lib/node_modules");   // playwright is installed globally on the build box
const fs = require("fs");
const path = require("path");
let chromium;
try { ({ chromium } = require("playwright")); }
catch (e) { console.error("playwright is not on the module path — try:\n  NODE_PATH=/opt/node22/lib/node_modules node scripts/billy360-test.js"); process.exit(2); }

/* ── arguments ─────────────────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const hit = argv.find((a) => a === "--" + name || a.startsWith("--" + name + "="));
  if (!hit) return dflt;
  return hit.indexOf("=") > 0 ? hit.slice(hit.indexOf("=") + 1) : true;
};
const STATIC_PORT = String(arg("static", process.env.BILLY360_STATIC || "8971"));
const WR_PORT = String(arg("wrangler", process.env.BILLY360_WRANGLER || "8972"));
const S = "http://localhost:" + STATIC_PORT;          // static file server (the repo root)
const W = "http://localhost:" + WR_PORT;              // wrangler dev
const HOST = process.env.MEGACITY_HOST || "www.megacityproperties.co.uk";
const ID = process.env.MEGACITY_LISTING || "ladywell-point";
const EXE = process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const ARGS = ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
const OUT = process.env.BILLY360_OUT || path.join(require("os").tmpdir(), "billy360-test");
const ROOT = path.resolve(__dirname, "..");
const PANO4K = fs.existsSync(path.join(ROOT, "billy360/panos/entrance_hall.jpg")) ? path.join(ROOT, "billy360/panos/entrance_hall.jpg") : null;
const SMALL = path.join(ROOT, "billy360/panos/cabin.jpg");

const ORDER = ["demo", "public", "embed", "devices", "engine", "office", "data"];
const ALIAS = { 1: "demo", 2: "public", 3: "embed", 4: "devices", 5: "engine", 6: "office", 7: "data",
                local: "demo", visitor: "public", iframe: "embed", device: "devices", api: "office", edges: "data" };
const only = arg("only", "");
const WANT = only === true || !only ? ORDER.slice()
  : String(only).split(/[,\s]+/).filter(Boolean).map((n) => ALIAS[n] || n);
const unknown = WANT.filter((n) => ORDER.indexOf(n) < 0);
if (unknown.length) { console.error("unknown section(s): " + unknown.join(", ") + "\nknown: " + ORDER.join(", ")); process.exit(2); }

/* ── result recording ──────────────────────────────────────────────────── */
const SECTIONS = [];
let cur = null;
function section(name) { cur = { name, pass: 0, fail: 0, skip: 0, t0: Date.now(), notes: [] }; SECTIONS.push(cur); console.log("\n══ " + name + " ═══════════════════════════════════════════"); }
function ok(name, cond, info) {
  const line = (cond ? "PASS " : "FAIL ") + name + (info === undefined || info === null || info === "" ? "" : "  [" + String(typeof info === "string" ? info : JSON.stringify(info)).slice(0, 700) + "]");
  console.log(line);
  if (cond) cur.pass++; else { cur.fail++; cur.notes.push(name + (info ? "  " + String(typeof info === "string" ? info : JSON.stringify(info)).slice(0, 300) : "")); }
  return !!cond;
}
function skip(name, why) { console.log("SKIP " + name + "  [" + why + "]"); cur.skip++; }

/* ── browser helpers ───────────────────────────────────────────────────── */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const launch = () => chromium.launch({ executablePath: EXE, args: ARGS });
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 };
const TABLET = { viewport: { width: 1024, height: 1366 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const DESKTOP = { viewport: { width: 1280, height: 800 } };

/* fonts (and anything else off-origin) answer empty so a run works offline */
async function offline(ctx) {
  await ctx.route(/^https?:\/\/(?!localhost|127\.0\.0\.1|www\.megacityproperties)/, (r) => r.fulfill({ status: 200, body: "" }));
}
/* Script errors only: a "Failed to load resource" line is the browser
   reporting a status code, and several sections serve 404s on purpose. */
function watch(page, keepNet) {
  const errs = [];
  page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (!keepNet && /Failed to load resource|net::ERR_/.test(t)) return;
    errs.push("console: " + t);
  });
  return errs;
}
/* SwiftShader bakes the demo rooms slowly and the tier watchdog would reload:
   pin the tier the way a slow machine already would have. */
const pinTier = (ctx) => ctx.addInitScript(() => { try { localStorage.setItem("billy360:tier", "2"); } catch (e) {} });
const ready = (target, ms) => target.waitForFunction(
  () => window.BILLY360App && window.BILLY360App.engine() && document.querySelector("#loader.is-done"), null, { timeout: ms || 90000 });
const active = (p) => p.evaluate(() => { const a = document.activeElement; return a ? (a.id ? "#" + a.id : a.tagName + "." + a.className) : null; });
const fovOf = (p) => p.evaluate(() => window.BILLY360App.engine().camera().fov);
const yawOf = (p) => p.evaluate(() => window.BILLY360App.engine().camera().yaw);
/* the boot pan eases in exponentially, so "no change over 300 ms" is not enough */
async function settle(p, get) {
  get = get || ((pg) => pg.evaluate(() => { const c = window.BILLY360App.engine().camera(); return [c.yaw, c.fov]; }));
  let still = 0;
  for (let i = 0; i < 60; i++) {
    const a = await get(p); await p.waitForTimeout(400); const b = await get(p);
    if (Math.abs(a[0] - b[0]) < 0.02 && Math.abs(a[1] - b[1]) < 0.02) { if (++still >= 2) return; } else still = 0;
  }
}
function contrast(fg, bg) {
  const lum = (c) => { const f = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
  const a = lum(fg), b = lum(bg); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
const rgb = (s) => (s.match(/\d+/g) || [0, 0, 0]).slice(0, 3).map(Number);

/* ── the stub tour served to public/embed/device sections ──────────────── */
function stubTour(o) {
  o = o || {};
  const rooms = [
    { id: "a", name: "Hallway", short: "Hall", floor: "g", pano: "/billy360/panos/entrance_hall.jpg", thumb: "/billy360/panos/entrance_hall.jpg",
      view: { yaw: 0, pitch: 0, fov: 75 }, description: "The way in.",
      hotspots: [{ id: "h1", type: "nav", to: "b", yaw: 10, pitch: -6, label: "Kitchen" }] },
    { id: "b", name: "Kitchen", short: "Kit", floor: "g", pano: "/billy360/panos/cabin.jpg", thumb: "/billy360/panos/cabin.jpg",
      view: { yaw: 0, pitch: 0, fov: 75 }, description: "Fitted kitchen.",
      hotspots: [{ id: "h2", type: "nav", to: "a", yaw: 0, pitch: -6, label: "Hallway" }, { id: "h3", type: "nav", to: "c", yaw: 40, pitch: -6, label: "Bedroom" }] },
    { id: "c", name: "Bedroom", short: "Bed", floor: "g", pano: "/billy360/panos/entrance_hall.jpg", thumb: "/billy360/panos/entrance_hall.jpg",
      view: { yaw: 0, pitch: 0, fov: 75 }, description: "Double bedroom.",
      hotspots: [{ id: "h4", type: "nav", to: "b", yaw: 0, pitch: -6, label: "Kitchen" }] }
  ];
  return {
    id: "x", version: 3,
    project: Object.assign({
      name: "Ladywell Point", cover: "b", price: "£1,200 pcm", beds: 2, baths: 1, epc: "C", ref: "MC-77",
      features: ["Furnished", "Bills included"], hidden: false,
      agent: { name: "Megacity Properties", phone: "0161 220 1763", whatsapp: "07700900000", email: "info@example.com" }
    }, o.project || {}),
    brand: { name: "Megacity Properties", accent: "#2b7fff", accent2: "#38bdf8", bg: "#060b1a", ink: "#eaf2ff" },
    floors: [{ id: "g", name: "Ground Floor", short: "G", plan: o.plan || "" }],
    rooms: o.rooms || (o.oneRoom ? [Object.assign({}, rooms[0], { hotspots: [] })] : rooms),
    guided: { dwell: o.dwell || 9000 }
  };
}
/* a long tour: a hub with N-1 rooms hanging off it, every picture the same two files */
function bigTour(n) {
  const hub = { id: "hub", name: "Hallway", short: "Hall", floor: "g", pano: "/billy360/panos/entrance_hall.jpg", view: { yaw: 0, pitch: 0, fov: 75 }, hotspots: [] };
  const rooms = [hub];
  for (let i = 1; i < n; i++) {
    const id = "r" + i;
    hub.hotspots.push({ id: "hh" + i, type: "nav", to: id, yaw: (360 / (n - 1)) * i - 180, pitch: -6, label: "Room " + i });
    rooms.push({ id: id, name: "Room " + i, short: "R" + i, floor: "g", pano: "/billy360/panos/" + (i % 2 ? "cabin" : "comfy_cafe") + ".jpg",
                 view: { yaw: 0, pitch: 0, fov: 75 }, hotspots: [{ id: "b" + i, type: "nav", to: "hub", yaw: 0, pitch: -6, label: "Hallway" }] });
  }
  return stubTour({ rooms: rooms, project: { cover: "hub" } });
}
async function stubApi(ctx, tour, opts) {
  opts = opts || {};
  await ctx.route("**/api/public/tours/**", (r) => {
    if (opts.status && opts.status !== 200) return r.fulfill({ status: opts.status, contentType: "application/json", headers: { "cache-control": "no-store" }, body: JSON.stringify(opts.body || { error: "not found", listingUrl: "/let/ladywell-point" }) });
    return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(tour || stubTour()) });
  });
  await ctx.route("**/api/public/event", (r) => r.fulfill({ status: 204, body: "" }));
}

/* ══ 1 · demo regression in local mode ══════════════════════════════════ */
async function sectionDemo(br) {
  const ctx = await br.newContext(DESKTOP);
  await offline(ctx); await pinTier(ctx);
  const page = await ctx.newPage();
  const errs = watch(page);
  await page.goto(S + "/billy360/", { waitUntil: "load" });
  await ready(page);
  const dash = await page.evaluate(() => ({
    mode: window.BILLY360_STORE && window.BILLY360_STORE.mode,
    view: (document.querySelector(".view.is-active") || {}).id,
    sites: window.BILLY360App.sites().map((s) => s.id)
  }));
  ok("boot: local mode, the dashboard lists the shipped demos", dash.mode === "local" && dash.sites.indexOf("charnwood-house") >= 0 && dash.sites.length > 1, dash.sites.join(","));

  await page.evaluate(() => window.BILLY360App.site("charnwood-house"));
  await page.waitForFunction(() => window.BILLY360App.site() === "charnwood-house" && document.querySelector("#roomName").textContent !== "—", null, { timeout: 60000 });
  await page.evaluate(() => window.BILLY360App.view("tour"));
  await sleep(600);
  const t = await page.evaluate(() => ({
    view: (document.querySelector(".view.is-active") || {}).id,
    room: document.querySelector("#roomName").textContent,
    title: document.title,
    plan: document.querySelectorAll("#planHost .fp-geo rect").length,
    pins: document.querySelectorAll("#planHost .pin").length
  }));
  ok("Charnwood House opens in the tour view with its floor plan drawn", t.view === "viewTour" && !!t.room && /Charnwood/.test(t.title) && t.plan > 5 && t.pins > 3, t);

  /* a drag turns the camera and leaves the pitch where it was */
  await settle(page);
  const c0 = await page.evaluate(() => window.BILLY360App.engine().camera());
  await page.mouse.move(640, 400); await page.mouse.down();
  for (let i = 1; i <= 10; i++) { await page.mouse.move(640 + i * 20, 400); await sleep(16); }
  await page.mouse.up();
  await settle(page);
  const c1 = await page.evaluate(() => window.BILLY360App.engine().camera());
  ok("a 200 px drag turns the camera and keeps the pitch", Math.abs(c1.yaw - c0.yaw) > 5 && Math.abs(c1.pitch - c0.pitch) < 1.5,
     "yaw " + c0.yaw.toFixed(1) + "→" + c1.yaw.toFixed(1) + " pitch " + c0.pitch.toFixed(2) + "→" + c1.pitch.toFixed(2));

  /* walk through a door */
  const walked = await page.evaluate(async () => {
    const before = document.querySelector("#roomName").textContent;
    const hs = document.querySelector("#hotspots .hs[data-to]");
    if (!hs) return { before, err: "no door marker" };
    hs.click();
    for (let i = 0; i < 200; i++) { await new Promise((r) => setTimeout(r, 150)); if (document.querySelector("#roomName").textContent !== before) break; }
    return { before, after: document.querySelector("#roomName").textContent, to: hs.getAttribute("data-to") };
  });
  ok("a door marker walks to the next room", walked.after && walked.after !== walked.before, walked);

  /* the browser Studio still asks for the passcode and opens on Rooms */
  await page.evaluate(() => { location.hash = "#/studio/rooms"; });
  await sleep(500);
  const lock = await page.evaluate(() => ({ on: document.querySelector("#lock").classList.contains("is-on"), inert: document.querySelector("#viewTour").inert, focus: document.activeElement.id }));
  ok("#/studio/rooms asks for the passcode (background inert, code field focused)", lock.on && lock.inert && lock.focus === "lockCode", lock);
  await page.fill("#lockCode", "nope"); await page.click("#lockGo"); await sleep(500);
  ok("a wrong passcode is refused", await page.evaluate(() => document.querySelector("#lock").classList.contains("is-on") && !window.BILLY360App.isAdmin()));
  await page.fill("#lockCode", "redadmin"); await page.click("#lockGo");
  await page.waitForFunction(() => window.BILLY360App.isAdmin(), null, { timeout: 20000 }).catch(() => {});
  await sleep(600);
  const st = await page.evaluate(() => ({ view: (document.querySelector(".view.is-active") || {}).id, admin: window.BILLY360App.isAdmin(), hash: location.hash, inert: document.querySelector("#viewStudio").inert }));
  ok("the passcode unlocks the Studio on the Rooms tab", st.view === "viewStudio" && st.admin && st.hash === "#/studio/rooms" && !st.inert, st);

  /* Add space → undo → redo */
  const n0 = await page.evaluate(() => window.BILLY360App.tour().rooms.length);
  await page.click("#btnAddRoom");
  await page.fill("#addRoomName", "Test Room");
  await page.click("#btnAddRoomGo");
  await page.waitForFunction((n) => window.BILLY360App.tour().rooms.length === n + 1, n0, { timeout: 30000 }).catch(() => {});
  const n1 = await page.evaluate(() => window.BILLY360App.tour().rooms.length);
  ok("Add space adds a room", n1 === n0 + 1, n0 + " → " + n1);
  await page.click("#btnUndo");
  await page.waitForFunction((n) => window.BILLY360App.tour().rooms.length === n, n0, { timeout: 20000 }).catch(() => {});
  const n2 = await page.evaluate(() => window.BILLY360App.tour().rooms.length);
  await page.click("#btnRedo");
  await page.waitForFunction((n) => window.BILLY360App.tour().rooms.length === n + 1, n0, { timeout: 20000 }).catch(() => {});
  const n3 = await page.evaluate(() => window.BILLY360App.tour().rooms.length);
  ok("undo removes it and redo puts it back", n2 === n0 && n3 === n0 + 1, [n0, n1, n2, n3].join(" → "));

  /* the local copy is written to this browser */
  const saved = await page.evaluate(async () => {
    window.BILLY360App.save();
    for (let i = 0; i < 60; i++) { await new Promise((r) => setTimeout(r, 200)); const k = Object.keys(localStorage).filter((k) => /^billy360:tour:/.test(k)); if (k.length) return k; }
    return [];
  });
  ok("local autosave writes the tour to this browser", saved.some((k) => /charnwood-house/.test(k)), saved.join(","));

  await page.evaluate(() => window.BILLY360App.view("tour"));
  await sleep(300);
  await page.keyboard.press("h"); await sleep(400);
  ok("h goes home to the dashboard", await page.evaluate(() => (document.querySelector(".view.is-active") || {}).id === "viewDash"));
  ok("no page errors in local mode", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");
  await ctx.close();
}

/* ══ 2 · public mode against a stubbed API ═════════════════════════════ */
async function sectionPublic(br) {
  /* (a) fail-closed: an unknown / draft / hidden listing shows the blocked card */
  for (const c of [
    { name: "404 with a listing path", status: 404, body: { error: "not found", listingUrl: "/let/ladywell-point" }, title: /isn't published yet/, href: "/let/ladywell-point" },
    { name: "404 with no body at all", status: 404, body: {}, title: /isn't published yet/, href: "/" },
    /* a listingUrl the server would never send: it must never become a link,
       and the card still needs a way out — so it falls back to the home page */
    { name: "404 with a junk listingUrl", status: 404, body: { error: "x", listingUrl: "javascript:alert(1)" }, title: /isn't published yet/, href: "/" },
    { name: "410 the listing is in the Bin", status: 410, body: { error: "binned", binned: true, listingUrl: "/let/ladywell-point" }, title: /./, href: "/let/ladywell-point" }
  ]) {
    const ctx = await br.newContext(DESKTOP);
    await offline(ctx); await stubApi(ctx, null, { status: c.status, body: c.body });
    const page = await ctx.newPage(); const errs = watch(page);
    await page.goto(S + "/billy360/?site=not-a-demo", { waitUntil: "load" });
    await page.waitForSelector("#storeBlocked", { timeout: 20000 }).catch(() => {});
    const card = await page.evaluate(() => {
      const b = document.querySelector("#storeBlocked");
      if (!b) return null;
      const a = b.querySelector("a");
      return { h1: (b.querySelector("h1") || {}).textContent, body: (b.querySelector("p") || {}).textContent,
               href: a && a.getAttribute("href"), target: a && a.getAttribute("target"), anchors: b.querySelectorAll("a").length,
               engine: !!(window.BILLY360App && window.BILLY360App.engine()) };
    });
    const wantA = c.anchors === undefined ? 1 : c.anchors;
    ok("blocked card · " + c.name, !!card && c.title.test(card.h1 || "") && card.href === c.href && card.anchors === wantA && (!wantA || card.target === "_top") && !card.engine, card);
    ok("blocked card · " + c.name + ": no page errors", errs.length === 0, errs.slice(0, 2).join(" | ") || "none");
    await ctx.close();
  }
  {
    const ctx = await br.newContext(DESKTOP);
    await offline(ctx);
    await ctx.route("**/api/public/tours/**", (r) => r.abort("failed"));
    const page = await ctx.newPage();
    await page.goto(S + "/billy360/?site=not-a-demo", { waitUntil: "load" });
    await page.waitForSelector("#storeBlocked", { timeout: 20000 }).catch(() => {});
    ok("blocked card · the network failed", /Couldn't load the tour/.test(await page.evaluate(() => { const b = document.querySelector("#storeBlocked"); return b ? b.querySelector("h1").textContent : ""; })));
    await ctx.close();
  }

  /* (b) one project, no browser Studio, straight into the tour on the cover room */
  {
    const ctx = await br.newContext(DESKTOP);
    await offline(ctx); await stubApi(ctx, stubTour());
    const page = await ctx.newPage(); const errs = watch(page);
    await page.goto(S + "/billy360/?site=x&admin=1", { waitUntil: "load" });
    await ready(page); await sleep(400);
    const v = await page.evaluate(() => ({
      mode: window.BILLY360_STORE.mode, listing: window.BILLY360_STORE.listingId,
      view: (document.querySelector(".view.is-active") || {}).id,
      room: document.querySelector("#roomName").textContent, title: document.title,
      sites: window.BILLY360App.sites().length,
      admin: window.BILLY360App.isAdmin(), btnAdmin: document.querySelector("#btnAdmin").hidden,
      token: localStorage.getItem("billy360:admin"), hash: location.hash
    }));
    ok("public boot: one project, tour view, the cover room", v.mode === "public" && v.listing === "x" && v.view === "viewTour" && v.room === "Kitchen" && v.sites === 1, v);
    ok("per-room title", v.title === "Ladywell Point · Kitchen", v.title);
    ok("?admin=1 is ignored, #btnAdmin is hidden, no admin token is left", v.admin === false && v.btnAdmin === true && !v.token, v);
    ok("saveTour() refuses in public mode", (await page.evaluate(() => window.BILLY360App.save())) === false);

    /* #/studio on a visitor link is rewritten to the tour */
    await page.evaluate(() => { location.hash = "#/studio/rooms"; });
    await sleep(700);
    const after = await page.evaluate(() => ({ hash: location.hash, view: (document.querySelector(".view.is-active") || {}).id, lock: document.querySelector("#lock").classList.contains("is-on"), admin: window.BILLY360App.isAdmin() }));
    ok("#/studio on a visitor link is rewritten to #/tour/<room>", /^#\/tour\//.test(after.hash) && after.view === "viewTour" && !after.lock && !after.admin, after);

    /* the title follows the room */
    await page.evaluate(() => window.BILLY360App.go("a"));
    await page.waitForFunction(() => document.querySelector("#roomName").textContent === "Hallway", null, { timeout: 40000 });
    await sleep(300);
    const live = await page.evaluate(() => ({ title: document.title, live: document.querySelector("#roomLive").textContent, focus: document.activeElement.id }));
    ok("the title and the aria-live region follow the room", live.title === "Ladywell Point · Hallway" && /Hallway/.test(live.live), live);
    ok("no page errors in public mode", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");
    await ctx.close();
  }

  /* (c) details sheet + lead */
  {
    const ctx = await br.newContext(DESKTOP);
    await offline(ctx); await stubApi(ctx, stubTour());
    const page = await ctx.newPage(); const errs = watch(page);
    let lead = null;
    await page.route("**/api/public/lead", (r) => { try { lead = JSON.parse(r.request().postData()); } catch (e) {} r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }); });
    await page.goto(S + "/billy360/?site=x", { waitUntil: "load" });
    await ready(page); await sleep(400);
    ok("Enquire and Details are offered when the project has details", await page.evaluate(() => !document.querySelector("#btnEnquire").hidden && !document.querySelector("#dockDetails").hidden));
    await page.click("#btnEnquire"); await sleep(500);
    const det = await page.evaluate(() => ({
      on: document.querySelector("#sheet").classList.contains("is-on"), text: document.querySelector("#sheetBody").innerText,
      focus: document.activeElement.id, inert: document.querySelector("#viewTour").inert,
      btns: [...document.querySelectorAll("#sheetFoot button")].map((b) => b.textContent.trim())
    }));
    ok("the details sheet lists rent, EPC, agent and features", det.on && /£1,200 pcm/.test(det.text) && /EPC\s*C/.test(det.text) && /Megacity Properties/.test(det.text) && /Bills included/.test(det.text), det.text.replace(/\n/g, " | "));
    ok("Book a viewing / Call / WhatsApp / Close, focus on Book, background inert", det.btns.join(",") === "Book a viewing,Call,WhatsApp,Close" && det.focus === "btnDetailsBook" && det.inert, det.btns.join(",") + " focus=" + det.focus);
    await page.click("#btnDetailsBook"); await sleep(400);
    await page.fill("#leadName", "Test Person");
    await page.fill("#sheetBody input[type=email]", "test@example.com");
    await page.click("#btnLeadSend");
    await page.waitForFunction(() => /^Sent/.test(document.querySelector("#toast").textContent), null, { timeout: 8000 }).catch(() => {});
    ok("POST /api/public/lead carries source, room, roomName, site and listingId", lead && lead.source === "tour" && lead.room === "b" && lead.roomName === "Kitchen" && lead.site === "x" && lead.listingId === "x" && lead.name === "Test Person", lead);
    ok("the sheet closes and focus returns to the tour", await page.evaluate(() => !document.querySelector("#sheet").classList.contains("is-on") && !document.querySelector("#viewTour").inert && document.activeElement.id === "roomName"), await active(page));
    ok("no page errors around the lead form", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");
    await ctx.close();
  }

  /* (d) keyboard and a11y */
  {
    const ctx = await br.newContext(DESKTOP);
    await offline(ctx); await stubApi(ctx, stubTour());
    const page = await ctx.newPage(); const errs = watch(page);
    await page.goto(S + "/billy360/?site=x", { waitUntil: "load" });
    await ready(page); await sleep(400);
    await page.focus("#btnHome");
    const hid0 = await page.evaluate(() => document.querySelector("#panelLeft").classList.contains("is-hidden"));
    const seq = [];
    for (let i = 0; i < 4; i++) { await page.keyboard.press("Tab"); seq.push(await active(page)); }
    const hid1 = await page.evaluate(() => document.querySelector("#panelLeft").classList.contains("is-hidden"));
    ok("Tab moves focus on and is never hijacked", seq[0] !== "#btnHome" && seq.every(Boolean) && hid0 === hid1 && hid1 === false, seq.join(" → "));
    ok("letter shortcuts are ignored while a control has focus", await page.evaluate(() => {
      document.querySelector("#btnHome").focus();
      document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "m", bubbles: true, cancelable: true }));
      return !document.querySelector("#panelRight").classList.contains("is-hidden");
    }));
    /* hidden controls leave the tab order */
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press("p");
    await page.waitForFunction(() => getComputedStyle(document.querySelector("#panelLeft")).visibility === "hidden", null, { timeout: 10000 }).catch(() => {});
    const hidden = await page.evaluate(() => {
      const b = document.querySelector("#btnCloseLeft"); b.focus();
      return { cls: document.querySelector("#panelLeft").classList.contains("is-hidden"), vis: getComputedStyle(b).visibility, focused: document.activeElement === b, pressed: document.querySelector("#btnPanels").getAttribute("aria-pressed") };
    });
    ok("p hides the panels and their buttons refuse focus", hidden.cls && hidden.vis === "hidden" && !hidden.focused && hidden.pressed === "false", hidden);
    await page.keyboard.press("p"); await sleep(500);
    /* the palette is a modal: Tab is trapped, everything behind it is inert, focus is restored */
    await page.click("#btnSearch"); await sleep(500);
    const trap = [];
    for (let i = 0; i < 8; i++) { await page.keyboard.press("Tab"); trap.push(await page.evaluate(() => !!(document.activeElement && document.activeElement.closest("#palette")))); }
    const inert = await page.evaluate(() => ({ tour: document.querySelector("#viewTour").inert, pal: document.querySelector("#palette").inert === true }));
    ok("Tab stays inside the open palette and the views behind it are inert", trap.every(Boolean) && inert.tour && !inert.pal, JSON.stringify(inert) + " trapped=" + trap.filter(Boolean).length + "/8");
    await page.keyboard.press("Escape"); await sleep(400);
    const back = await page.evaluate(() => ({ focus: document.activeElement.id, inert: document.querySelector("#viewTour").inert }));
    ok("Escape closes it, lifts inert and restores focus to the opener", back.focus === "btnSearch" && !back.inert, back);
    /* invisible door markers are out of the tab order */
    ok("door markers behind the camera are aria-hidden with tabindex -1", await page.evaluate(() => {
      const all = [...document.querySelectorAll("#hotspots .hs")];
      if (!all.length) return false;
      return all.every((n) => n.classList.contains("is-behind") ? (n.getAttribute("tabindex") === "-1" && n.getAttribute("aria-hidden") === "true") : n.getAttribute("aria-hidden") !== "true");
    }));
    /* contrast of the side copy */
    const cc = await page.evaluate(() => {
      const n = document.querySelector(".side-label");
      if (!n) return null;
      let p = n, bg = "";
      while (p && !bg) { const c = getComputedStyle(p).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) bg = c; p = p.parentElement; }
      return { fg: getComputedStyle(n).color, bg: bg || "rgb(6, 11, 26)" };
    });
    const ratio = cc ? contrast(rgb(cc.fg), rgb(cc.bg)) : 0;
    ok(".side-label contrast is at least 4.5:1", ratio >= 4.5, cc ? cc.fg + " on " + cc.bg + " = " + ratio.toFixed(2) + ":1" : "no .side-label");
    ok("no page errors in the a11y pass", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");
    await ctx.close();
  }

  /* (e) the guided walkthrough, the documented deep link, the panel copy */
  {
    const ctx = await br.newContext(DESKTOP);
    await offline(ctx); await stubApi(ctx, stubTour());
    const page = await ctx.newPage(); const errs = watch(page);
    await page.goto(S + "/billy360/?site=x", { waitUntil: "load" });
    await ready(page); await sleep(400);
    /* the visitor opens in the cover room, which sits in the middle of the
       order — a lap has to come back round to the rooms before it */
    const seen = [await page.evaluate(() => document.querySelector("#roomName").textContent)];
    await page.click("#btnPlay"); await sleep(400);
    for (let i = 0; i < 2; i++) {
      const was = seen[seen.length - 1];
      await page.evaluate(() => document.querySelector("#btnNext").click());
      await page.waitForFunction((w) => document.querySelector("#roomName").textContent !== w, was, { timeout: 40000 }).catch(() => {});
      await sleep(300);
      seen.push(await page.evaluate(() => document.querySelector("#roomName").textContent));
    }
    const mid = await page.evaluate(() => ({ pos: document.querySelector("#transportPos").textContent,
      end: !!(document.querySelector("#guidedEnd") && !document.querySelector("#guidedEnd").hidden) }));
    await page.evaluate(() => document.querySelector("#btnNext").click());
    await sleep(800);
    const end = await page.evaluate(() => { const n = document.querySelector("#guidedEnd");
      return { card: n && !n.hidden ? n.textContent : "", on: document.querySelector("#transport").classList.contains("is-on") }; });
    ok("the guided walkthrough is a full lap from wherever the visitor is standing",
       seen.join(" → ") === "Kitchen → Bedroom → Hallway" && !mid.end && /Room 3 of 3/.test(mid.pos), { seen, mid });
    ok("\"That's the whole tour\" waits until every room has been shown", /whole tour/.test(end.card) && !end.on, end);
    ok("the empty state under \"In this space\" describes that list, not the photographs above it",
       await page.evaluate(() => { const t = document.querySelector("#sideHotspots").textContent;
         return /Nothing extra marked in this room yet\./.test(t) && !/photos/i.test(t); }),
       await page.evaluate(() => document.querySelector("#sideHotspots").textContent.trim()));

    const deep = await ctx.newPage();
    await deep.goto(S + "/billy360/?site=x#/tour/a?y=45&p=3&f=50", { waitUntil: "load" });
    await ready(deep); await settle(deep);
    const at = await deep.evaluate(() => ({ room: document.querySelector("#roomName").textContent, cam: window.BILLY360App.engine().camera() }));
    ok("the documented deep link #/tour/<room>?y=&p=&f= opens that room at that view",
       at.room === "Hallway" && Math.abs(at.cam.yaw - 45) < 1 && Math.abs(at.cam.fov - 50) < 1, at);
    ok("no page errors around the walkthrough and the deep link", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");
    await ctx.close();
  }

  /* (f) a property card's floor plan is a plan sink like any other: the
     portfolio only exists in local mode, so this one boots the demos */
  {
    const ctx = await br.newContext(DESKTOP);
    await offline(ctx);
    const page = await ctx.newPage(); const errs = watch(page);
    await page.goto(S + "/billy360/", { waitUntil: "load" });
    await ready(page);
    const id = await page.evaluate(() => {
      const src = (window.BILLY360_TOURS || []).filter((t) => t.floors && t.floors[0] && !(t.project || {}).coverImage)[0];
      if (!src) return null;
      const t = JSON.parse(JSON.stringify(src));
      t.version = (t.version || 0) + 10;            // a browser copy only wins when it is newer
      t.floors[0].plan = '<rect width="9" height="9"/><img src=x onerror="window.__pwned=1;document.title=\'PWNED\'">';
      localStorage.setItem("billy360:tour:" + t.id, JSON.stringify(t));
      return t.id;
    });
    await page.goto(S + "/billy360/#/sites", { waitUntil: "load" });
    await page.reload({ waitUntil: "load" });        // same-document hash moves do not re-read storage
    await ready(page); await sleep(800);
    const card = await page.evaluate((sid) => {
      const c = document.querySelector('[data-site="' + sid + '"]');
      const plan = c && c.querySelector(".sitecard-plan");
      return { pwned: !!window.__pwned, title: document.title, html: plan ? plan.innerHTML : "(no card)" };
    }, id);
    ok("a hostile floor plan on a property card is rebuilt from the allow-list",
       !!id && !card.pwned && !/PWNED/.test(card.title) && /<rect width="9" height="9">/.test(card.html) && !/img|onerror/i.test(card.html), card);
    ok("no page errors on the portfolio", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");
    await ctx.close();
  }
}

/* ══ 3 · the listing-page embed ════════════════════════════════════════ */
const LISTING_HTML = (frame) =>
  '<!doctype html><meta charset="utf-8"><title>Listing</title><body style="margin:0">' +
  '<div id="above" style="height:600px;background:#eee">above the fold</div>' + frame +
  '<p id="after">after the tour</p><div style="height:2000px"></div></body>';

async function sectionEmbed(br) {
  /* (a) poster, passive wheel, replaceState, height message — a 16:9 frame */
  {
    const ctx = await br.newContext(DESKTOP);
    await offline(ctx); await stubApi(ctx, stubTour());
    await ctx.route(S + "/listing-harness", (r) => r.fulfill({ status: 200, contentType: "text/html", body: LISTING_HTML(
      '<iframe id="f" src="/billy360/?site=x&embed=1" style="width:960px;height:540px;border:0;display:block" allow="fullscreen; accelerometer; gyroscope; xr-spatial-tracking" allowfullscreen></iframe>') }));
    const page = await ctx.newPage(); const errs = watch(page);
    await page.goto(S + "/listing-harness", { waitUntil: "load" });
    const frame = page.frames().find((f) => f.url().indexOf("embed=1") >= 0);
    await ready(frame); await sleep(500);
    await page.evaluate(() => { window.__msgs = []; addEventListener("message", (e) => { if (e.data && e.data.source === "billy360") window.__msgs.push(e.data); }); });

    const p0 = await frame.evaluate(() => {
      const p = document.querySelector("#poster");
      return { poster: !!p, text: p && p.textContent, tag: p && p.tagName, isPoster: document.body.classList.contains("is-poster"),
               ta: getComputedStyle(document.querySelector("#stageTour")).touchAction, home: getComputedStyle(document.querySelector("#btnHome")).display,
               view: (document.querySelector(".view.is-active") || {}).id, room: document.querySelector("#roomName").textContent };
    });
    ok("embed boots into the tour on the cover room behind a poster", p0.poster && p0.tag === "BUTTON" && /Tap to explore/.test(p0.text) && /3 rooms/.test(p0.text) && p0.isPoster && p0.view === "viewTour" && p0.room === "Kitchen", p0);
    ok("the stage leaves vertical scrolling to the page until the tap", p0.ta === "pan-y" && p0.home === "none", p0.ta + " #btnHome " + p0.home);

    /* the wheel belongs to the listing page until the visitor taps */
    await frame.evaluate(() => { window.__dp = []; document.addEventListener("wheel", (e) => window.__dp.push(e.defaultPrevented)); });
    await settle(frame);   // the boot pan is still easing the fov right after ready
    /* aim at the middle of the frame; the page scrolls by less than half its height,
       so the pointer stays over the tour for the whole gesture */
    const mid = async () => page.evaluate(() => {
      const f = document.querySelector("#f");
      f.scrollIntoView({ block: "center" });
      const r = f.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    let at = await mid();
    const f0 = await frame.evaluate(() => window.BILLY360App.engine().camera().fov);
    const y0 = await page.evaluate(() => scrollY);
    await page.mouse.move(at.x, at.y); await page.mouse.wheel(0, 120); await sleep(900);
    const f1 = await frame.evaluate(() => window.BILLY360App.engine().camera().fov);
    const y1 = await page.evaluate(() => scrollY);
    const dp0 = await frame.evaluate(() => window.__dp.slice());
    ok("before the tap the wheel is passive: the page scrolls, the tour does not zoom", Math.abs(f1 - f0) < 0.6 && y1 > y0 && dp0.length > 0 && dp0.every((v) => v === false),
       "fov " + f0.toFixed(2) + "→" + f1.toFixed(2) + " scrollY " + y0 + "→" + y1 + " defaultPrevented=" + dp0.join(","));

    const h0 = await page.evaluate(() => history.length);
    await frame.click("#poster"); await sleep(600);
    const after = await frame.evaluate(() => ({ poster: !!document.querySelector("#poster"), ta: getComputedStyle(document.querySelector("#stageTour")).touchAction, isPoster: document.body.classList.contains("is-poster") }));
    ok("the tap removes the poster and the stage takes the gestures", !after.poster && after.ta === "none" && !after.isPoster, after);
    at = await mid();
    const y2 = await page.evaluate(() => scrollY);
    await page.mouse.move(at.x, at.y); await page.mouse.wheel(0, 400); await sleep(900);
    const f2 = await frame.evaluate(() => window.BILLY360App.engine().camera().fov);
    const y3 = await page.evaluate(() => scrollY);
    const dp1 = await frame.evaluate(() => window.__dp.slice());
    ok("after the tap the wheel zooms the tour and the page stays put", Math.abs(f2 - f1) > 1 && dp1[dp1.length - 1] === true && y3 === y2, "fov " + f1.toFixed(2) + "→" + f2.toFixed(2) + " scrollY " + y2 + "→" + y3);

    /* a wheel over a door ring is forwarded to the canvas */
    const box = await page.evaluate(() => {
      const f = document.querySelector("#f"), r = f.getBoundingClientRect();
      const n = f.contentDocument.querySelector("#hotspots .hs");
      if (!n) return null;
      const h = n.getBoundingClientRect();
      return { x: r.left + h.left + h.width / 2, y: r.top + h.top + h.height / 2 };
    });
    if (box) {
      const f3 = await frame.evaluate(() => window.BILLY360App.engine().camera().fov);
      await page.mouse.move(box.x, box.y); await page.mouse.wheel(0, -400); await sleep(900);
      const f4 = await frame.evaluate(() => window.BILLY360App.engine().camera().fov);
      ok("a wheel over a door ring still zooms (never scrolls the listing)", Math.abs(f4 - f3) > 1, "fov " + f3.toFixed(2) + "→" + f4.toFixed(2));
    } else skip("a wheel over a door ring still zooms", "no door marker in view");

    /* walking rooms inside a frame never touches the parent's history */
    await frame.evaluate(() => window.BILLY360App.go("a"));
    await frame.waitForFunction(() => document.querySelector("#roomName").textContent === "Hallway", null, { timeout: 40000 });
    await frame.evaluate(() => window.BILLY360App.go("c"));
    await frame.waitForFunction(() => document.querySelector("#roomName").textContent === "Bedroom", null, { timeout: 40000 });
    await sleep(400);
    const h1 = await page.evaluate(() => history.length);
    ok("room walks inside the frame add no history entries (replaceState)", h1 === h0, h0 + " → " + h1 + " after two walks");

    const msgs = await page.evaluate(() => window.__msgs.map((m) => m.type));
    ok("the frame announces itself on the bus (ready / room)", msgs.indexOf("billy360:room") >= 0, msgs.join(","));

    /* an open sheet asks the host for room (whichever Details control this width shows) */
    await frame.evaluate(() => {
      const n = [...document.querySelectorAll("#btnEnquire, #dockDetails")].find((b) => !b.hidden && b.getClientRects().length);
      if (n) n.click();
    });
    await sleep(1200);
    const height = await page.evaluate(() => (window.__msgs.filter((m) => m.type === "billy360:height").pop() || {}).px);
    ok("an open sheet asks the listing page for more height", typeof height === "number" && height > 100, "billy360:height " + height);
    ok("no page errors in the embed", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");
    await ctx.close();
  }

  /* (b) compact chrome in a short frame on a phone */
  {
    const ctx = await br.newContext(Object.assign({}, PHONE, { viewport: { width: 390, height: 700 } }));
    await offline(ctx); await stubApi(ctx, stubTour());
    await ctx.route(S + "/listing-harness", (r) => r.fulfill({ status: 200, contentType: "text/html", body: LISTING_HTML(
      '<iframe id="f" src="/billy360/?site=x&embed=1#/tour/b" style="width:390px;height:300px;border:0;display:block" allowfullscreen></iframe>') }));
    const page = await ctx.newPage(); const errs = watch(page);
    await page.goto(S + "/listing-harness", { waitUntil: "load" });
    const frame = page.frames().find((f) => f.url().indexOf("embed=1") >= 0);
    await ready(frame); await sleep(500);
    const e = await frame.evaluate(() => {
      const cs = (s) => getComputedStyle(document.querySelector(s));
      return { strip: cs("#filmstrip").display, dock: cs("#mobileDock").display, hint: cs("#hint").display,
               rooms: cs("#btnRooms").display, home: cs("#btnHome").display, canvas: document.querySelector("#gl").getBoundingClientRect().height };
    });
    ok("compact chrome at 390×300: filmstrip, dock and hint away, Rooms shown", e.strip === "none" && e.dock === "none" && e.hint === "none" && e.rooms !== "none" && e.home === "none", e);
    ok("the panorama still fills the short frame", e.canvas >= 250, "canvas " + Math.round(e.canvas) + " px of 300");
    await frame.tap("#poster"); await sleep(400);
    await frame.tap("#btnRooms"); await sleep(500);
    const pal = await frame.evaluate(() => ({ on: document.querySelector("#palette").classList.contains("is-on"), items: [...document.querySelectorAll("#paletteList .palette-item b")].map((n) => n.textContent) }));
    ok("Rooms opens the room list only", pal.on && pal.items.join(",") === "Hallway,Kitchen,Bedroom", pal);
    await frame.evaluate(() => document.querySelectorAll("#paletteList .palette-item")[0].click());
    await frame.waitForFunction(() => document.querySelector("#roomName").textContent === "Hallway", null, { timeout: 40000 });
    ok("picking a room walks there", true);

    /* no element fullscreen: the button opens the full page instead of doing nothing */
    const full = await frame.evaluate(() => {
      const before = { fe: document.fullscreenEnabled, wfe: document.webkitFullscreenEnabled };
      Object.defineProperty(document, "fullscreenEnabled", { configurable: true, get: () => false });
      Object.defineProperty(document, "webkitFullscreenEnabled", { configurable: true, get: () => false });
      let opened = null; const real = window.open; window.open = (u) => { opened = u; return null; };
      document.querySelector("#btnFull").click();
      window.open = real;
      return { opened, before, hidden: document.querySelector("#btnFull").hidden };
    });
    ok("without element fullscreen the embed opens the full-screen page", !full.hidden && typeof full.opened === "string" && /site=x/.test(full.opened) && /#\/tour\//.test(full.opened), full);
    ok("no page errors in the compact embed", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");
    await ctx.close();
  }

  /* (c) the "← Back to property" bar (never inside a frame) */
  for (const c of [
    { name: "?from=/let/ladywell-point", q: "&from=/let/ladywell-point", href: "/let/ladywell-point", shown: true },
    { name: "?from=https://evil.example", q: "&from=https://evil.example/x", href: null, shown: false },
    { name: "?from=//evil.example", q: "&from=//evil.example", href: null, shown: false },
    { name: "no ?from at all", q: "", href: null, shown: false }
  ]) {
    const ctx = await br.newContext(DESKTOP);
    await offline(ctx); await stubApi(ctx, stubTour());
    const page = await ctx.newPage();
    await page.goto(S + "/billy360/?site=x" + c.q, { waitUntil: "load" });
    await ready(page); await sleep(400);
    const bar = await page.evaluate(() => {
      const b = document.querySelector("#backBar");
      const a = b && b.querySelector("a");
      return { exists: !!b, hidden: b ? b.hidden : null, href: a && a.getAttribute("href"), text: a && a.textContent, has: document.querySelector("#app").classList.contains("has-backbar") };
    });
    ok("back bar · " + c.name, c.shown ? (bar.hidden === false && bar.href === c.href && /Back to property/.test(bar.text) && bar.has)
                                       : (bar.hidden !== false && !bar.has), bar);
    await ctx.close();
  }
  {
    const ctx = await br.newContext(DESKTOP);
    await offline(ctx); await stubApi(ctx, stubTour());
    await ctx.route(S + "/listing-harness", (r) => r.fulfill({ status: 200, contentType: "text/html", body: LISTING_HTML(
      '<iframe src="/billy360/?site=x&embed=1&from=/let/ladywell-point" style="width:960px;height:540px;border:0"></iframe>') }));
    const page = await ctx.newPage();
    await page.goto(S + "/listing-harness", { waitUntil: "load" });
    const frame = page.frames().find((f) => f.url().indexOf("embed=1") >= 0);
    await ready(frame); await sleep(400);
    ok("back bar · never inside the listing's own frame", await frame.evaluate(() => { const b = document.querySelector("#backBar"); return (!b || b.hidden === true) && !document.querySelector("#app").classList.contains("has-backbar"); }));
    await ctx.close();
  }

  /* (d) embed.js reserves the box before it runs and pins the iframe into it */
  {
    const ctx = await br.newContext(DESKTOP);
    await offline(ctx); await stubApi(ctx, stubTour());
    await ctx.route(S + "/listing-embedjs", (r) => r.fulfill({ status: 200, contentType: "text/html", body:
      '<!doctype html><meta charset="utf-8"><title>Listing</title>' +
      '<link rel="stylesheet" href="/templates/megacity-skyline.css">' +
      '<body style="margin:0"><div style="height:200px"></div>' +
      '<div class="pd-tour" data-billy360="x" data-room="b"></div><p id="after">after</p><div style="height:1500px"></div>' +
      '<script src="/billy360/embed.js" defer></script>' }));
    const page = await ctx.newPage(); const errs = watch(page);
    await page.goto(S + "/listing-embedjs", { waitUntil: "domcontentloaded" });
    const before = await page.evaluate(() => ({ box: document.querySelector(".pd-tour").getBoundingClientRect().height, after: document.querySelector("#after").getBoundingClientRect().top }));
    await page.waitForFunction(() => !!document.querySelector(".pd-tour iframe"), null, { timeout: 20000 });
    await sleep(700);
    const shape = await page.evaluate(() => {
      const h = document.querySelector(".pd-tour"), f = h.querySelector("iframe");
      const hb = h.getBoundingClientRect(), fb = f.getBoundingClientRect();
      return { box: hb.height, after: document.querySelector("#after").getBoundingClientRect().top,
               wrappers: h.children.length, tag: f.tagName, src: f.getAttribute("src"),
               fits: Math.abs(fb.height - hb.height) < 2 && Math.abs(fb.width - hb.width) < 2, ratio: (hb.width / hb.height).toFixed(2) };
    });
    ok("the tour box is reserved before embed.js runs (no layout shift)", before.box > 100 && Math.abs(shape.box - before.box) < 2 && Math.abs(shape.after - before.after) < 2,
       "box " + Math.round(before.box) + " → " + Math.round(shape.box) + " px, #after " + Math.round(before.after) + " → " + Math.round(shape.after));
    ok("the iframe is dropped straight into the host at 16:9", shape.wrappers === 1 && shape.tag === "IFRAME" && shape.fits && shape.ratio === "1.78", shape);
    ok("the frame opens on the listing's cover room", /site=x/.test(shape.src) && /embed=1/.test(shape.src) && /#\/tour\/b/.test(shape.src), shape.src);
    const frame = page.frames().find((f) => (f.url() || "").indexOf("embed=1") >= 0);
    await ready(frame); await sleep(300);
    ok("and it lands on the panorama, not the dashboard", await frame.evaluate(() => (document.querySelector(".view.is-active") || {}).id === "viewTour" && document.querySelector("#roomName").textContent === "Kitchen"));
    ok("no page errors on the listing page", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");
    await ctx.close();
  }

  /* (e) the frame a phone gets on a listing page: 4:5 of a narrow column is
     short as well as narrow, and the landscape chrome must not claim it */
  {
    const ctx = await br.newContext(PHONE);
    await offline(ctx); await stubApi(ctx, stubTour());
    await ctx.route(S + "/listing-phone", (r) => r.fulfill({ status: 200, contentType: "text/html", body:
      '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Listing</title>' +
      '<body style="margin:0"><div style="height:200px;background:#eee">above</div>' +
      '<div style="padding:0 20px"><div class="pd-tour" data-billy360="x" data-title="360° tour"></div></div>' +
      '<p id="after">after</p><div style="height:1200px"></div>' +
      '<script src="/billy360/embed.js" defer></script>' }));
    const page = await ctx.newPage(); const errs = watch(page);
    await page.goto(S + "/listing-phone", { waitUntil: "load" });
    await page.evaluate(() => document.querySelector(".pd-tour").scrollIntoView({ block: "center" }));
    await page.waitForFunction(() => !!document.querySelector(".pd-tour iframe"), null, { timeout: 20000 });
    let frame = null;   // loading="lazy": the frame appears in the list a moment after the element
    for (let i = 0; i < 40 && !frame; i++) { frame = page.frames().find((f) => (f.url() || "").indexOf("embed=1") >= 0); if (!frame) await sleep(250); }
    await ready(frame); await sleep(600);
    const P = await frame.evaluate(() => {
      const box = (s) => { const n = document.querySelector(s); if (!n) return null; const r = n.getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
      const area = (a, b) => (!a || !b) ? 0 : Math.max(0, Math.min(a.r, b.r) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.y, b.y));
      const w = document.querySelector("#stripWrap");
      return { vw: innerWidth, vh: innerHeight, portrait: innerHeight > innerWidth,
               strip: Math.round(w.clientWidth), tiles: Math.round(w.scrollWidth),
               names: getComputedStyle(document.querySelector(".strip-name")).display,
               onDock: Math.round(area(box("#stripWrap"), box(".mobile-dock"))) };
    });
    ok("a portrait phone frame keeps a usable room strip", P.portrait && P.strip >= P.vw * 0.7 && P.names !== "none" && P.onDock === 0, P);
    ok("no page errors in the phone listing frame", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");
    await ctx.close();
  }

  /* (f) the head the viewer ships is the one a link that is not live lands on
     (the Worker rewrites it only for a live tour), so it must stay neutral */
  {
    const r = await fetch(S + "/billy360/");
    const html = (await r.text()).slice(0, 4000);
    const title = (/<title>([^<]*)<\/title>/i.exec(html) || [])[1] || "";
    const desc = (/<meta name="description" content="([^"]*)"/i.exec(html) || [])[1] || "";
    ok("the shipped head names no product and sells no other property", !!title && !!desc && !/billy360/i.test(title + desc) && !/sq ft|office|studio/i.test(desc),
       JSON.stringify({ title, desc }));
  }
}

/* ══ 4 · devices ═══════════════════════════════════════════════════════ */
/* the same tour served from /media/ so the texture ladder is observable */
function mediaTour() {
  const t = stubTour();
  t.rooms.forEach((r) => { r.pano = "/media/l1/" + r.id + "/pano4096.jpg"; r.thumb = "/media/l1/" + r.id + "/w480.jpg"; });
  return t;
}
async function stubMedia(ctx, seen) {
  await ctx.route("**/media/**", (r) => {
    if (seen) seen.push(r.request().url().replace(/^https?:\/\/[^/]+/, ""));
    return r.fulfill({ status: 200, contentType: "image/jpeg", body: fs.readFileSync(SMALL) });
  });
}

async function sectionDevices(br) {
  /* (a) phone portrait */
  {
    const ctx = await br.newContext(PHONE);
    await offline(ctx); await stubApi(ctx, mediaTour());
    const seen = []; await stubMedia(ctx, seen);
    const page = await ctx.newPage(); const errs = watch(page);
    await page.goto(S + "/billy360/?site=x", { waitUntil: "load" });
    await ready(page); await sleep(800);
    const pre = await page.evaluate(() => [...document.querySelectorAll("link[rel=preload][as=image]")].map((l) => l.getAttribute("href") + "|" + l.getAttribute("crossorigin")));
    ok("phone 390×844 DPR3 preloads the cover thumb and pano2048", pre.some((h) => /pano2048\.jpg\|anonymous/.test(h)) && pre.some((h) => /w480\.jpg\|anonymous/.test(h)), pre.join(" "));
    const st = await page.evaluate(() => window.BILLY360App.engine().stats());
    ok("the texture cap on a phone canvas is 2048", st.cap === 2048, st);
    ok("only pano2048 files are fetched, never the 4096", seen.some((u) => /pano2048\.jpg/.test(u)) && !seen.some((u) => /pano4096\.jpg/.test(u)), seen.filter((u) => /pano/.test(u)).slice(0, 6).join(" "));
    const g = await page.evaluate(() => { const b = document.querySelector("#btnGyro"); const r = b.getBoundingClientRect(); return { display: getComputedStyle(b).display, w: r.width, coarse: matchMedia("(pointer: coarse)").matches }; });
    ok("the gyro button is reachable on a phone", g.display !== "none" && g.w > 0 && g.coarse, g);
    const dock = await page.evaluate(() => { const d = document.querySelector("#mobileDock").getBoundingClientRect(); return { h: d.height, btns: [...document.querySelectorAll("#mobileDock .btn")].filter((b) => !b.hidden).length }; });
    ok("the dock fits on one row", dock.h < 50 && dock.btns >= 4, dock);
    ok("form fields are 16 px on a coarse pointer (no iOS zoom)", (await page.evaluate(() => getComputedStyle(document.querySelector("#lockCode")).fontSize)) === "16px");
    const sel = await page.evaluate(() => ({ stage: getComputedStyle(document.querySelector("#stageTour")).userSelect, ta: getComputedStyle(document.querySelector("#stageTour")).touchAction, tag: getComputedStyle(document.querySelector(".hs-tag")).opacity }));
    ok("the stage owns the gestures and door labels stay visible on touch", sel.stage === "none" && sel.ta === "none" && +sel.tag >= 0.8, sel);
    /* a finger drag turns the camera and leaves the pitch alone */
    await settle(page);
    const cdp = await ctx.newCDPSession(page);
    /* A dispatched touch can land while the boot pan is still easing, in which
       case the camera reads the same before and after. Try twice before
       calling it a failure — a drag that never turns the camera fails both. */
    let c0, c1;
    for (let attempt = 0; attempt < 2; attempt++) {
      c0 = await page.evaluate(() => window.BILLY360App.engine().camera());
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 195, y: 420, id: 1 }] });
      for (let i = 1; i <= 10; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 195 + i * 20, y: 420, id: 1 }] }); await sleep(16); }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await settle(page);
      c1 = await page.evaluate(() => window.BILLY360App.engine().camera());
      if (Math.abs(c1.yaw - c0.yaw) > 5) break;
      await sleep(400);
    }
    ok("a 200 px finger drag turns the camera and keeps the pitch", Math.abs(c1.yaw - c0.yaw) > 5 && Math.abs(c1.pitch - c0.pitch) < 0.5,
       "yaw " + c0.yaw.toFixed(1) + "→" + c1.yaw.toFixed(1) + " pitch " + c0.pitch.toFixed(2) + "→" + c1.pitch.toFixed(2));
    ok("no page errors on the phone", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");

    /* (b) the same page turned on its side */
    await page.setViewportSize({ width: 844, height: 390 });
    await sleep(1200);
    await page.tap("#dockPlay"); await sleep(700);
    const L = await page.evaluate(() => {
      const box = (s) => { const n = document.querySelector(s); const r = n.getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
      const ov = (a, b) => a.x < b.r && b.x < a.r && a.y < b.b && b.y < a.b && a.w && b.w;
      const t = box(".transport"), d = box(".mobile-dock"), f = box("#filmstrip"), s = box("#stripWrap"), top = box("#tourTop");
      return { ovTD: ov(t, d), ovTF: ov(t, f), ovDF: ov(d, f),
               pano: (Math.min(t.y, d.y, s.y) - top.b) / innerHeight,
               names: getComputedStyle(document.querySelector(".strip-name")).display,
               thumbH: box(".strip-thumb").h, pos: document.querySelector("#transportPos").textContent,
               scrollLeft: document.querySelector("#app").scrollLeft };
    });
    ok("landscape: transport, dock and filmstrip never overlap", !L.ovTD && !L.ovTF && !L.ovDF, L);
    ok("landscape: at least 60% of the height is panorama", L.pano >= 0.6, (L.pano * 100).toFixed(1) + "%");
    ok("landscape: the strip drops its names and the transport counts rooms", L.names === "none" && L.thumbH <= 40 && /^Room \d of 3$/.test(L.pos), L);
    ok("landscape: the fixed shell never scrolls sideways", L.scrollLeft === 0, "scrollLeft " + L.scrollLeft);
    await page.screenshot({ path: path.join(OUT, "landscape.png") });
    await ctx.close();
  }

  /* (c) tablet: a coarse pointer with a big canvas still gets the 4096 file */
  {
    const ctx = await br.newContext(TABLET);
    await offline(ctx); await stubApi(ctx, mediaTour());
    const seen = []; await stubMedia(ctx, seen);
    const page = await ctx.newPage(); const errs = watch(page);
    await page.goto(S + "/billy360/?site=x", { waitUntil: "load" });
    await ready(page); await sleep(1000);
    const pre = await page.evaluate(() => [...document.querySelectorAll("link[rel=preload][as=image]")].map((l) => l.getAttribute("href")));
    const st = await page.evaluate(() => window.BILLY360App.engine().stats());
    ok("tablet 1024×1366 DPR2 (coarse): cap 4096 and the 4096 file is preloaded", st.cap === 4096 && pre.some((h) => /pano4096\.jpg/.test(h)), { cap: st.cap, pre });
    /* KNOWN FAILURE — see handoffs.md "## D1 → fixes", item 1: the engine is
       still mounted on the small dashboard stage when start() runs, so the
       opening room is fetched at pano2048 while the preload already pulled
       pano4096. Every other room follows the tour stage and gets 4096. */
    ok("tablet: the opening room is fetched once, at the preloaded 4096 size", seen.some((u) => /pano4096\.jpg/.test(u)) && !seen.some((u) => /pano2048\.jpg/.test(u)), seen.filter((u) => /pano/.test(u)).slice(0, 6).join(" "));
    const lay = await page.evaluate(() => ({
      coarse: matchMedia("(pointer: coarse)").matches,
      dock: getComputedStyle(document.querySelector("#mobileDock")).display,
      canvas: document.querySelector("#gl").getBoundingClientRect(),
      strip: getComputedStyle(document.querySelector("#filmstrip")).display,
      scrollLeft: document.querySelector("#app").scrollLeft, bodyScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth
    }));
    ok("tablet: the layout fills the viewport and never scrolls sideways", lay.coarse && lay.canvas.width >= 1000 && lay.scrollLeft === 0 && lay.bodyScroll <= 0, lay);
    ok("no page errors on the tablet", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");
    await page.screenshot({ path: path.join(OUT, "tablet.png") });
    await ctx.close();
  }

  /* (c2) desktop: the same ladder, and the preloaded file must be the one used */
  {
    const ctx = await br.newContext(DESKTOP);
    await offline(ctx); await stubApi(ctx, mediaTour());
    const seen = []; await stubMedia(ctx, seen);
    const page = await ctx.newPage();
    await page.goto(S + "/billy360/?site=x", { waitUntil: "load" });
    await ready(page); await sleep(1200);
    const pre = await page.evaluate(() => [...document.querySelectorAll("link[rel=preload][as=image]")].map((l) => l.getAttribute("href")));
    const cover = seen.filter((u) => /\/b\/pano/.test(u));
    ok("desktop preloads pano4096 for the cover room", pre.some((h) => /\/b\/pano4096\.jpg$/.test(h)), pre);
    /* KNOWN FAILURE — same cause as the tablet check above (handoffs "D1 → fixes" 1) */
    ok("desktop: the cover panorama is downloaded once, and it is the 4096 one", cover.length === 1 && /pano4096\.jpg/.test(cover[0]), cover.join(" ") + " | all: " + seen.filter((u) => /pano/.test(u)).join(" "));
    await ctx.close();
  }

  /* (d) ?q=lo drops to the 1600 px file (the same rule in store.js and the engine) */
  {
    const ctx = await br.newContext(DESKTOP);
    await offline(ctx); await stubApi(ctx, mediaTour());
    const seen = []; await stubMedia(ctx, seen);
    const page = await ctx.newPage();
    await page.goto(S + "/billy360/?site=x&q=lo", { waitUntil: "load" });
    await ready(page); await sleep(800);
    const pre = await page.evaluate(() => [...document.querySelectorAll("link[rel=preload][as=image]")].map((l) => l.getAttribute("href")));
    ok("?q=lo preloads and fetches w1600.jpg, never a pano file", pre.some((h) => /w1600\.jpg/.test(h)) && seen.some((u) => /w1600\.jpg/.test(u)) && !seen.some((u) => /pano(2048|4096)\.jpg/.test(u)), { pre, seen: seen.slice(0, 5) });
    await ctx.close();
  }

  /* (e) prefers-reduced-motion: no boot pan */
  {
    const ctx = await br.newContext(Object.assign({ reducedMotion: "reduce" }, DESKTOP));
    await offline(ctx); await stubApi(ctx, stubTour());
    const page = await ctx.newPage(); const errs = watch(page);
    await page.goto(S + "/billy360/?site=x", { waitUntil: "load" });
    await ready(page);
    const a = await page.evaluate(() => window.BILLY360App.engine().camera());
    await sleep(2500);
    const b = await page.evaluate(() => window.BILLY360App.engine().camera());
    ok("reduced motion: the camera does not pan or zoom by itself at boot", Math.abs(a.yaw - b.yaw) < 0.5 && Math.abs(a.fov - b.fov) < 0.5,
       "yaw " + a.yaw.toFixed(2) + "→" + b.yaw.toFixed(2) + " fov " + a.fov.toFixed(2) + "→" + b.fov.toFixed(2));
    /* and the tour is still usable */
    await page.evaluate(() => window.BILLY360App.go("a"));
    await page.waitForFunction(() => document.querySelector("#roomName").textContent === "Hallway", null, { timeout: 40000 });
    ok("reduced motion: walking still works", true);
    ok("no page errors under reduced motion", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");
    await ctx.close();
  }

  /* (f) landscape with the "Back to property" bar: the bar shortens the view,
     so a raised dock measured against the viewport lands on the toolbar */
  {
    const ctx = await br.newContext(Object.assign({}, PHONE, { viewport: { width: 844, height: 390 } }));
    await offline(ctx); await stubApi(ctx, stubTour());
    const page = await ctx.newPage(); const errs = watch(page);
    await page.goto(S + "/billy360/?site=x&from=/let/ladywell-point", { waitUntil: "load" });
    await ready(page); await sleep(800);
    await page.tap("#dockInfo").catch(() => page.tap("#dockDetails"));
    await sleep(800);
    const B = await page.evaluate(() => {
      const box = (s) => { const n = document.querySelector(s); if (!n) return null; const r = n.getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom }; };
      const area = (a, b) => (!a || !b) ? 0 : Math.max(0, Math.min(a.r, b.r) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.y, b.y));
      const d = box(".mobile-dock");
      return { backbar: document.querySelector("#app").classList.contains("has-backbar"),
               raised: document.querySelector(".mobile-dock").classList.contains("is-raised"),
               onToolbar: Math.round(area(d, box("#tourTop"))), onEnquire: Math.round(area(d, box("#btnEnquire"))) };
    });
    ok("landscape from a listing: the raised dock stays clear of the toolbar and Enquire", B.backbar && B.raised && B.onToolbar === 0 && B.onEnquire === 0, B);
    ok("no page errors in landscape with the back bar", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");
    await ctx.close();
  }

  /* (g) the Studio header on a 390 px phone: with the save pill up, the row
     still has to fit — Publish on screen and the rail toggle a real target */
  {
    const ctx = await br.newContext(PHONE);
    await offline(ctx); await pinTier(ctx);
    const page = await ctx.newPage(); const errs = watch(page);
    await page.goto(S + "/billy360/", { waitUntil: "load" });
    await ready(page);
    await page.evaluate(() => { location.hash = "#/studio/rooms"; });
    await sleep(500);
    await page.fill("#lockCode", "redadmin"); await page.click("#lockGo");
    await page.waitForFunction(() => window.BILLY360App.isAdmin(), null, { timeout: 20000 }).catch(() => {});
    await sleep(600);
    /* the longest label the save pill ever carries (app.js markSaved) */
    const H = await page.evaluate(() => {
      const n = document.querySelector("#saveState");
      n.innerHTML = ""; n.appendChild(document.createElement("i")); n.appendChild(document.createTextNode(" Not saved — retrying"));
      const top = document.querySelector(".studio-top");
      const box = (s) => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); return { x: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width) }; };
      return { view: (document.querySelector(".view.is-active") || {}).id, vw: innerWidth,
               scrollWidth: top.scrollWidth, clientWidth: top.clientWidth,
               publish: box("#btnStudioPublish"), toggle: box("#btnRailToggle"), pill: box("#saveState"),
               name: document.querySelector("#btnStudioPublish").textContent.trim() };
    });
    ok("the Studio header fits a 390 px phone with the save pill up", H.view === "viewStudio" && H.scrollWidth <= H.clientWidth && H.publish.r <= H.vw && H.toggle.w >= 36 && /Publish/.test(H.name), H);
    ok("no page errors in the Studio on a phone", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");
    await ctx.close();
  }

  /* (h) the upload path: every web size is re-encoded, so none of the files
     served publicly carries the camera's EXIF (only the gated orig does) */
  {
    const ctx = await br.newContext(DESKTOP);
    await offline(ctx); await stubApi(ctx, stubTour());
    const page = await ctx.newPage(); const errs = watch(page);
    await page.goto(S + "/billy360/?site=x", { waitUntil: "load" });
    await page.waitForFunction(() => window.BILLY360_STORE, null, { timeout: 60000 });
    const U = await page.evaluate(async () => {
      /* a 2048×1024 JPEG (inside every derivative's edge) with a marker in an
         APP1 segment where a camera writes EXIF */
      const c = document.createElement("canvas"); c.width = 2048; c.height = 1024;
      const x = c.getContext("2d");
      for (let i = 0; i < 64; i++) { x.fillStyle = "hsl(" + i * 5 + ",60%,50%)"; x.fillRect(i * 32, 0, 32, 1024); }
      const plain = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.9));
      const head = new Uint8Array(await plain.slice(0, 2).arrayBuffer());
      const marker = "Exif\u0000\u0000SECRET-GPS-53.4808N-2.2426W";
      const app1 = new Uint8Array(4 + marker.length);
      app1[0] = 0xff; app1[1] = 0xe1; app1[2] = ((marker.length + 2) >> 8) & 255; app1[3] = (marker.length + 2) & 255;
      for (let i = 0; i < marker.length; i++) app1[4 + i] = marker.charCodeAt(i);
      const src = new Blob([head, app1, await plain.slice(2)], { type: "image/jpeg" });

      let sent = null;
      const real = window.fetch;
      window.fetch = function (u, o) {
        if (String(u).indexOf("/api/studio/media") >= 0) { sent = o.body; return Promise.resolve(new Response("{}", { status: 200, headers: { "content-type": "application/json" } })); }
        return real.apply(window, arguments);
      };
      try { await window.BILLY360_STORE.upload(src, { isPano: true, role: "tour", listingId: "x", roomLabel: "EXIF probe" }); }
      finally { window.fetch = real; }
      const txt = async (b) => new TextDecoder("latin1").decode(new Uint8Array(await b.arrayBuffer()));
      const meta = JSON.parse(sent.get("meta"));
      const parts = {};
      for (const k of ["orig", "large", "thumb", "pano", "pano2048"]) {
        const f = sent.get(k);
        parts[k] = f ? { size: f.size, exif: (await txt(f)).indexOf("SECRET-GPS") >= 0 } : null;
      }
      return { srcSize: src.size, panoIsOrig: meta.panoIsOrig, parts };
    });
    const web = ["large", "thumb", "pano", "pano2048"];
    ok("the upload sends a re-encoded file for every web size, EXIF only on the orig",
       U.panoIsOrig === undefined && web.every((k) => U.parts[k] && U.parts[k].size > 0 && !U.parts[k].exif && U.parts[k].size !== U.srcSize) && U.parts.orig.exif, U);
    ok("no page errors during the upload", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");
    await ctx.close();
  }
}

/* ══ 5 · the engine on a bare rig ══════════════════════════════════════ */
/* engine.js + the shipped demo tour on a page of their own: every callback is
   hooked, no app engine competes for the network, and panos/ resolves under
   /billy360/ because the harness URL lives there. */
const PANO_OF = { hall: "entrance_hall", living: "lythwood_lounge", kitchen: "kiara_interior", study: "provence_studio",
                  landing: "large_corridor", master: "hotel_room", bed2: "lythwood_room", bath: "modern_bathroom", garden: "suburban_garden" };
const roomOfUrl = (url) => { const m = /panos\/([a-z_0-9]+)\.jpg/.exec(url); if (!m) return null; return Object.keys(PANO_OF).find((k) => PANO_OF[k] === m[1]) || m[1]; };

const RIG = () => {
  window.__log = []; window.__t0 = performance.now();
  const L = (k, v) => window.__log.push({ k, v, t: Math.round(performance.now() - window.__t0) });
  window.__draws = 0; window.__frames = 0;
  const P = WebGLRenderingContext.prototype, orig = P.drawArrays;
  P.drawArrays = function () { window.__draws++; return orig.apply(this, arguments); };
  const host = document.createElement("div");
  host.id = "rigHost";
  host.style.cssText = "position:fixed;left:0;top:0;width:960px;height:600px;z-index:99999;background:#000";
  const c = document.createElement("canvas"); c.id = "rig"; c.style.cssText = "width:100%;height:100%;display:block";
  host.appendChild(c); document.body.appendChild(host);
  window.__mk = (extra, tour) => {
    window.__tour = tour || JSON.parse(JSON.stringify(window.BILLY360_TOURS.find((t) => t.id === "beech-house")));
    window.__rig = window.BILLY360.createEngine(Object.assign({
      canvas: c, host: host,
      onLoading: (id, on, why) => L("loading", id + ":" + on + (why ? ":" + why : "")),
      onRoom: (room, from) => { L("room", room.id + "<" + (from ? from.id : "-")); window.__lastRoom = room; },
      onReady: () => L("ready", 1),
      onSharpen: (on) => L("sharpen", !!on),
      onFrame: () => { window.__frames++; },
      onError: (e) => L("error", e.title)
    }, extra || {}));
    return !!window.__rig;
  };
  window.__size = (w, h) => { host.style.width = w + "px"; host.style.height = h + "px"; window.__rig && window.__rig.resize(); };
  window.__luma = () => new Promise((res) => requestAnimationFrame(() => {
    const cc = document.createElement("canvas"); cc.width = 64; cc.height = 40;
    const x = cc.getContext("2d"); x.drawImage(c, 0, 0, 64, 40); const d = x.getImageData(0, 0, 64, 40).data;
    let s = 0; for (let i = 0; i < d.length; i += 4) s += (d[i] + d[i + 1] + d[i + 2]) / 3; res(s / (d.length / 4));
  }));
  return true;
};
async function rig(br, opts) {
  opts = opts || {};
  const ctx = await br.newContext(Object.assign({ viewport: { width: 1280, height: 800 } }, opts.context || {}));
  await offline(ctx);
  const reqs = [];
  const delay = opts.delay || {}, abort = opts.abort || {};
  await ctx.route("**/billy360/panos/*.jpg", async (route) => {
    const url = route.request().url(), room = roomOfUrl(url);
    reqs.push({ room, t: Date.now(), url });
    if (abort[room] && abort[room]-- > 0) { reqs[reqs.length - 1].aborted = true; return route.abort("failed"); }
    if (delay[room]) await new Promise((r) => setTimeout(r, delay[room]));
    return route.continue();
  });
  await ctx.route("**/media/**", async (r) => {
    const u = r.request().url().replace(/^https?:\/\/[^/]+/, "");
    reqs.push({ media: true, t: Date.now(), url: u });
    /* panoDelay holds only the big file back, so thumb-first is observable:
       served from disk both files land in the same frame and the engine has
       nothing to sharpen from. */
    const wait = opts.mediaDelay || (opts.panoDelay && /pano\d+\.jpg$/.test(u) ? opts.panoDelay : 0);
    if (wait) await new Promise((res) => setTimeout(res, wait));
    return r.fulfill({ status: 200, contentType: "image/jpeg", body: fs.readFileSync(SMALL) });
  });
  const pg = await ctx.newPage();
  const errors = []; pg.on("pageerror", (e) => errors.push(String(e)));
  await pg.goto(S + "/billy360/rig-" + Date.now(), { waitUntil: "load" });   // a 404 body on the right origin and path
  await pg.addScriptTag({ url: "/billy360/engine.js" });
  await pg.addScriptTag({ url: "/billy360/tour-megacity.js" });
  await pg.evaluate(RIG);
  return { ctx, pg, reqs, errors };
}
const rigIdle = (pg) => pg.waitForFunction(() => { const s = window.__rig.stats(); return s.queued === 0 && s.inflight === 0; }, null, { timeout: 180000 });
const rigReady = (pg) => pg.waitForFunction(() => window.__rig.isReady(), null, { timeout: 180000 });

async function sectionEngine(br) {
  /* (a) pending room, priority queue, no dissolve into an empty room */
  {
    const h = await rig(br, { delay: { bath: 4000 } });
    const { pg, reqs } = h;
    await pg.evaluate(() => { window.__mk(); window.__rig.load(window.__tour); window.__rig.start("living"); });
    await rigReady(pg); await pg.waitForTimeout(150);
    const tGo = Date.now();
    await pg.evaluate(() => { window.__t0 = performance.now(); window.__rig.go("bath"); });
    const s1 = await pg.evaluate(() => ({ cur: window.__rig.current().id, pend: window.__rig.pending(), log: window.__log.slice() }));
    ok("go() into a room whose picture has not arrived keeps the current room", s1.cur === "living" && s1.pend === "bath" && s1.log.some((e) => e.k === "loading" && e.v === "bath:true"), "current=" + s1.cur + " pending=" + s1.pend);
    await pg.waitForTimeout(1500);
    const luma = await pg.evaluate(() => window.__luma());
    const mid = await pg.evaluate(() => ({ cur: window.__rig.current().id, rooms: window.__log.filter((e) => e.k === "room").map((e) => e.v) }));
    ok("it never dissolves into black while waiting", luma > 20 && mid.cur === "living" && !mid.rooms.some((v) => /^bath/.test(v)), "luma " + luma.toFixed(1) + " current " + mid.cur);
    await pg.waitForFunction(() => window.__log.some((e) => e.k === "room" && /^bath/.test(e.v)), null, { timeout: 60000 });
    const after = await pg.evaluate(() => ({ log: window.__log.slice(), cur: window.__rig.current().id }));
    const li = after.log.findIndex((e) => e.k === "loading" && e.v === "bath:true"),
          lf = after.log.findIndex((e) => e.k === "loading" && e.v === "bath:false"),
          ri = after.log.findIndex((e) => e.k === "room" && /^bath/.test(e.v));
    ok("onLoading true → false → onRoom, then the dissolve", li >= 0 && lf > li && ri > lf && after.cur === "bath", "loading:true=" + li + " loading:false=" + lf + " room=" + ri);
    const order = reqs.filter((r) => r.room).map((r) => r.room);
    const rest = ["kitchen", "study", "landing", "master", "bed2", "garden"];
    const bathIdx = order.indexOf("bath"), firstRest = Math.min.apply(null, rest.map((r) => { const i = order.indexOf(r); return i < 0 ? 1e9 : i; }));
    const bathReq = reqs.find((r) => r.room === "bath");
    ok("the tapped room jumps the queue", bathIdx >= 0 && bathIdx < firstRest && bathReq.t - tGo < 2000, "order: " + order.join(" → "));
    await rigIdle(pg);
    const st = await pg.evaluate(() => window.__rig.stats());
    ok("all nine panoramas end up as nine textures and no synthetic bake", st.textures === 9 && st.bakes === 0, st);
    ok("no page errors (loading)", h.errors.length === 0, h.errors.join(" | ") || "none");
    await h.ctx.close();
  }

  /* (b) memory: load() diffs by room id and pano */
  {
    const h = await rig(br);
    const { pg } = h;
    await pg.evaluate(() => { window.__mk(); window.__rig.load(window.__tour); window.__rig.start("living"); });
    await rigReady(pg); await rigIdle(pg);
    const n0 = await pg.evaluate(() => window.__rig.stats().textures);
    const before = h.reqs.length;
    const cyc = await pg.evaluate(async () => {
      const out = [];
      for (let i = 0; i < 3; i++) {
        const clone = JSON.parse(JSON.stringify(window.__tour));       // what undo/redo does
        window.__rig.load(clone);
        clone.rooms.forEach((r) => { if (r.pano) window.__rig.setPano(r.id, r.pano); });
        window.__rig.go("living", { force: true });
        await new Promise((r) => { const iv = setInterval(() => { const s = window.__rig.stats(); if (!s.queued && !s.inflight) { clearInterval(iv); r(); } }, 100); });
        out.push(window.__rig.stats().textures);
      }
      return out;
    });
    ok("three load()+setPano cycles keep the same textures and download nothing", cyc.every((n) => n === n0) && n0 === 9 && h.reqs.length === before, "start " + n0 + " → " + cyc.join(",") + ", extra requests " + (h.reqs.length - before));
    ok("the stage never went blank across load()", (await pg.evaluate(() => window.__luma())) > 20);
    const rem = await pg.evaluate(async () => {
      const clone = JSON.parse(JSON.stringify(window.__tour));
      clone.rooms = clone.rooms.filter((r) => r.id !== "garden");
      clone.rooms.forEach((r) => { r.hotspots = r.hotspots.filter((hs) => hs.to !== "garden"); });
      window.__rig.load(clone);
      await new Promise((r) => setTimeout(r, 300));
      return window.__rig.stats().textures;
    });
    ok("a removed room frees exactly one texture", rem === n0 - 1, n0 + " → " + rem);
    const chg = await pg.evaluate(async () => {
      const clone = JSON.parse(JSON.stringify(window.__tour));
      clone.rooms = clone.rooms.filter((r) => r.id !== "garden");
      clone.rooms.find((r) => r.id === "bath").pano = "panos/cabin.jpg";
      const start = window.__rig.stats().textures;
      window.__rig.load(clone);
      const mid = window.__rig.stats().textures;
      window.__rig.go("bath");
      await new Promise((r) => { const iv = setInterval(() => { const s = window.__rig.stats(); if (!s.queued && !s.inflight) { clearInterval(iv); r(); } }, 100); });
      return { start, mid, after: window.__rig.stats().textures };
    });
    ok("a changed panorama frees its texture and reloads on demand", chg.mid === chg.start - 1 && chg.after === chg.start, chg);
    await pg.waitForFunction(() => !window.__rig.transitioning(), null, { timeout: 30000 });
    await pg.evaluate(() => window.__rig.sleep(true)); await pg.waitForTimeout(300);
    const sl = await pg.evaluate(async () => { const d = window.__draws, f = window.__frames; await new Promise((r) => setTimeout(r, 1000)); return { draws: window.__draws - d, frames: window.__frames - f }; });
    ok("sleep(true) stops the loop entirely", sl.draws === 0 && sl.frames === 0, sl);
    await pg.evaluate(() => window.__rig.sleep(false)); await pg.waitForTimeout(400);
    ok("sleep(false) resumes it", (await pg.evaluate(async () => { const d = window.__draws; await new Promise((r) => setTimeout(r, 500)); return window.__draws - d; })) > 0);
    ok("no page errors (memory)", h.errors.length === 0, h.errors.join(" | ") || "none");
    await h.ctx.close();
  }

  /* (c) a download that fails: retries with backoff, never a synthetic room */
  {
    const h = await rig(br, { abort: { master: 4 } });   // first + 2 retries + one go() attempt fail
    const { pg, reqs } = h;
    await pg.evaluate(() => { window.__mk(); window.__rig.load(window.__tour); window.__rig.start("living"); });
    await rigReady(pg);
    await pg.waitForFunction(() => window.__log.some((e) => e.k === "loading" && e.v === "master:false:failed"), null, { timeout: 90000 });
    const m = reqs.filter((r) => r.room === "master");
    const gaps = m.slice(1).map((r, i) => r.t - m[i].t);
    ok("a failed image retries at about 2 s and 8 s, then reports failed", m.length === 3 && gaps[0] >= 1900 && gaps[0] < 5000 && gaps[1] >= 7900 && gaps[1] < 12000, "gaps " + gaps.join(",") + " ms");
    const st = await pg.evaluate(() => ({ s: window.__rig.stats(), thumb: window.__rig.equirect("master") }));
    ok("a captured room is never replaced by a synthetic render", st.s.bakes === 0 && st.thumb === null, st.s);
    await rigIdle(pg);
    await pg.evaluate(() => { window.__log.length = 0; window.__rig.go("master"); });
    await pg.waitForFunction(() => window.__log.some((e) => e.k === "loading" && e.v === "master:false:failed"), null, { timeout: 40000 });
    ok("go() into the failed room tries once more and stays put", reqs.filter((r) => r.room === "master").length === 4 && (await pg.evaluate(() => window.__rig.current().id)) === "living");
    await pg.evaluate(() => { window.__log.length = 0; window.__rig.go("master"); });
    await pg.waitForFunction(() => window.__log.some((e) => e.k === "room" && /^master/.test(e.v)), null, { timeout: 60000 });
    ok("the next attempt succeeds and walks in", reqs.filter((r) => r.room === "master").length === 5);
    ok("no page errors (retry)", h.errors.length === 0, h.errors.join(" | ") || "none");
    await h.ctx.close();
  }

  /* (d) the /media/ texture ladder and thumb-first */
  {
    const h = await rig(br, { panoDelay: 700 });   // hold the big file so the thumb is visibly first
    const { pg, reqs } = h;
    const tour = { id: "m", project: { name: "M", cover: "a" }, brand: {}, floors: [{ id: "g", name: "G" }],
      rooms: [{ id: "a", name: "A", floor: "g", pano: "/media/l1/a/pano4096.jpg", thumb: "/media/l1/a/w480.jpg", view: { yaw: 0, pitch: 0, fov: 75 }, hotspots: [] }] };
    /* a big stage: four texels per device pixel puts the cap at 4096 */
    await pg.evaluate((t) => { window.__size(1200, 750); window.__mk({}, t); window.__rig.load(window.__tour); window.__rig.start("a"); }, tour);
    await rigReady(pg); await rigIdle(pg);
    const big = await pg.evaluate(() => window.__rig.stats());
    const urls = reqs.filter((r) => r.media).map((r) => r.url);
    ok("a desktop-sized stage asks for pano4096.jpg", big.cap === 4096 && urls.some((u) => /pano4096\.jpg$/.test(u)) && !urls.some((u) => /pano2048\.jpg$/.test(u)), { cap: big.cap, urls });
    const sharpen = await pg.evaluate(() => window.__log.filter((e) => e.k === "sharpen" || e.k === "ready").map((e) => e.k + ":" + e.v));
    /* thumb-first: the small file paints, ready fires on it, the full one sharpens in after */
    const iT = sharpen.indexOf("sharpen:true"), iR = sharpen.indexOf("ready:1");
    ok("the w480 thumb paints first, ready fires on it and the panorama sharpens in",
       urls.indexOf("/media/l1/a/w480.jpg") >= 0 && iT >= 0 && iR > iT && sharpen.slice(iR).indexOf("sharpen:false") >= 0,
       sharpen.join(" ") + " | " + urls.join(" "));
    /* a small stage (cap 2048) takes the 2048 file for the same room */
    const small = await pg.evaluate(async (t) => {
      window.__size(700, 500);
      window.__mk({}, JSON.parse(JSON.stringify(t)));
      window.__rig.load(window.__tour); window.__rig.start("a");
      await new Promise((r) => { const iv = setInterval(() => { const s = window.__rig.stats(); if (!s.queued && !s.inflight) { clearInterval(iv); r(); } }, 100); });
      return window.__rig.stats();
    }, tour);
    const after = reqs.filter((r) => r.media).map((r) => r.url);
    ok("a smaller stage asks for pano2048.jpg instead", small.cap === 2048 && after.some((u) => /pano2048\.jpg$/.test(u)), { cap: small.cap, urls: after });
    ok("no page errors (ladder)", h.errors.length === 0, h.errors.join(" | ") || "none");
    await h.ctx.close();
  }

  /* (e) inputs on the canvas: wheel, pinch, one pointer per drag */
  {
    const ctx = await br.newContext(PHONE);
    await offline(ctx); await pinTier(ctx);
    const page = await ctx.newPage();
    const errs = watch(page);
    await page.goto(S + "/billy360/?site=foundry-loft#/tour/living", { waitUntil: "load" });
    await ready(page);
    await settle(page);
    const cdp = await ctx.newCDPSession(page);
    const pinch = async (cx, cy, dir) => {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cx - 25, y: cy, id: 1 }, { x: cx + 25, y: cy, id: 2 }] });
      for (let i = 1; i <= 10; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: cx - 25 - dir * 12 * i, y: cy, id: 1 }, { x: cx + 25 + dir * 12 * i, y: cy, id: 2 }] }); await sleep(16); }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    };
    const f0 = await fovOf(page), y0 = await yawOf(page);
    await pinch(195, 420, 1); await sleep(1200);
    const f1 = await fovOf(page), y1 = await yawOf(page);
    ok("a two-finger pinch zooms without turning", Math.abs(f1 - f0) > 3 && Math.abs(y1 - y0) < 0.5, "fov " + f0.toFixed(2) + "→" + f1.toFixed(2) + " yaw " + y0.toFixed(2) + "→" + y1.toFixed(2));
    /* the second finger arriving late must not be read as a drag */
    await page.evaluate(() => { const e = window.BILLY360App.engine(); e.look(e.camera().yaw, e.camera().pitch, 75); });
    await settle(page);
    const sy0 = await yawOf(page), sf0 = await fovOf(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 120, y: 420, id: 1 }] });
    await sleep(90);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 120, y: 420, id: 1 }, { x: 270, y: 420, id: 2 }] });
    for (let i = 1; i <= 10; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 120 - i * 8, y: 420, id: 1 }, { x: 270 + i * 8, y: 420, id: 2 }] }); await sleep(16); }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await sleep(1200);
    const sy1 = await yawOf(page), sf1 = await fovOf(page);
    ok("a staggered pinch still zooms and does not turn", Math.abs(sf1 - sf0) > 2 && Math.abs(sy1 - sy0) < 3, "fov " + sf0.toFixed(2) + "→" + sf1.toFixed(2) + " yaw " + sy0.toFixed(2) + "→" + sy1.toFixed(2));
    ok("no page errors (inputs)", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");
    await ctx.close();
  }

  /* (f) a lost WebGL context pauses the tour and comes back */
  {
    const ctx = await br.newContext(DESKTOP);
    await offline(ctx); await pinTier(ctx);
    const page = await ctx.newPage();
    const errs = watch(page);
    await page.goto(S + "/billy360/?site=foundry-loft#/tour/living", { waitUntil: "load" });
    await ready(page); await settle(page);
    await page.evaluate(() => { window.__lose = document.querySelector("#gl").getContext("webgl").getExtension("WEBGL_lose_context"); window.__lose.loseContext(); });
    await page.waitForTimeout(900);
    const lost = await page.evaluate(() => {
      const b = document.querySelector(".failure");
      return { title: b && (b.querySelector("h2") || {}).textContent, tap: !!(b && b.classList.contains("failure--tap")),
               buttons: b ? b.querySelectorAll("button").length : -1, isLost: document.querySelector("#gl").getContext("webgl").isContextLost() };
    });
    ok("a lost context shows one tap-to-restart overlay, no renderer buttons", lost.title === "The tour paused" && lost.isLost && lost.buttons <= 1, lost);
    await page.evaluate(() => window.__lose.restoreContext());
    await page.waitForFunction(() => !document.querySelector("#gl").getContext("webgl").isContextLost(), null, { timeout: 30000 });
    await page.waitForTimeout(5000);
    const back = await page.evaluate(async () => {
      const e = window.BILLY360App.engine();
      /* a WebGL canvas only reads back inside the frame that drew it */
      const l = await new Promise((res) => requestAnimationFrame(() => {
        const c = document.querySelector("#gl"), cc = document.createElement("canvas");
        cc.width = 64; cc.height = 40;
        const x = cc.getContext("2d"); x.drawImage(c, 0, 0, 64, 40);
        const d = x.getImageData(0, 0, 64, 40).data;
        let s = 0; for (let i = 0; i < d.length; i += 4) s += (d[i] + d[i + 1] + d[i + 2]) / 3;
        res(s / (d.length / 4));
      }));
      return { luma: l, diag: /context restored/.test(e.diagnostics()), failure: !!document.querySelector(".failure") };
    });
    const yb = await yawOf(page);
    await page.evaluate(() => { const e = window.BILLY360App.engine(); e.look(e.camera().yaw + 40, 0); });
    await sleep(1500);
    const ya = await yawOf(page);
    ok("the context comes back, the picture returns and the loop runs", back.luma > 3 && back.diag && Math.abs(ya - yb) > 20 && !back.failure,
       "luma " + back.luma.toFixed(1) + " yaw " + yb.toFixed(1) + "→" + ya.toFixed(1) + " overlay=" + back.failure);
    ok("no page errors (context loss)", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");
    await ctx.close();
  }
}

/* ══ 7 · data edges: one room, forty rooms, a slow network ═════════════ */
async function sectionData(br) {
  /* (a) a tour with a single room */
  {
    const ctx = await br.newContext(DESKTOP);
    await offline(ctx); await stubApi(ctx, stubTour({ oneRoom: true }));
    const page = await ctx.newPage(); const errs = watch(page);
    await page.goto(S + "/billy360/?site=x", { waitUntil: "load" });
    await ready(page); await sleep(500);
    await page.click("#btnPlay"); await sleep(500);
    const one = await page.evaluate(() => ({
      toast: document.querySelector("#toast").textContent,
      transport: document.querySelector("#transport").classList.contains("is-on"),
      pressed: document.querySelector("#btnPlay").getAttribute("aria-pressed"),
      strip: document.querySelectorAll("#filmstrip .strip-item").length,
      doors: document.querySelectorAll("#hotspots .hs").length,
      room: document.querySelector("#roomName").textContent
    }));
    ok("a one-room tour refuses the guided tour in plain English", /one room/.test(one.toast) && !one.transport && one.pressed === "false", one);
    ok("a one-room tour still opens, with one strip tile and no doors", one.strip === 1 && one.doors === 0 && one.room === "Hallway", one);
    await page.click("#dockRooms").catch(() => {});
    ok("no page errors on a one-room tour", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");
    await ctx.close();
  }

  /* (b) forty rooms: queue order, textures and memory */
  {
    const N = 40;
    const h = await rig(br, { mediaDelay: 250 });   // slow enough that the queue is still working when we tap
    const { pg, reqs } = h;
    /* a chain: room n opens on to room n+1, so "neighbours" is a short list */
    const tour = { id: "big", project: { name: "Forty", cover: "r0" }, brand: {}, floors: [{ id: "g", name: "G" }], rooms: [] };
    for (let i = 0; i < N; i++) {
      const hs = [];
      if (i > 0) hs.push({ id: "b" + i, type: "nav", to: "r" + (i - 1), yaw: 180, pitch: -6, label: "Back" });
      if (i < N - 1) hs.push({ id: "f" + i, type: "nav", to: "r" + (i + 1), yaw: 0, pitch: -6, label: "On" });
      tour.rooms.push({ id: "r" + i, name: "Room " + i, floor: "g", pano: "/media/l1/r" + i + "/pano4096.jpg", thumb: "/media/l1/r" + i + "/w480.jpg", view: { yaw: 0, pitch: 0, fov: 75 }, hotspots: hs });
    }
    const t0 = Date.now();
    await pg.evaluate((t) => { window.__mk({}, t); window.__rig.load(window.__tour); window.__rig.start("r0"); }, tour);
    await rigReady(pg);
    const tReady = Date.now() - t0;
    ok("a forty-room tour is ready in a couple of seconds", tReady < 20000, tReady + " ms");
    await pg.waitForFunction(() => true).catch(() => {});
    for (let i = 0; i < 60 && reqs.filter((r) => r.media && /pano/.test(r.url)).length < 5; i++) await sleep(200);
    const firstFive = reqs.filter((r) => r.media && /pano/.test(r.url)).slice(0, 5).map((r) => (r.url.match(/\/(r\d+)\//) || [])[1]);
    ok("the opening room and its neighbours are fetched first", firstFive[0] === "r0" && firstFive.slice(0, 2).indexOf("r1") >= 0 && firstFive.indexOf("r39") < 0, firstFive.join(","));
    /* a tap at the far end of the chain jumps the queue */
    const before = reqs.filter((r) => r.media && /pano/.test(r.url)).length;
    await pg.evaluate(() => window.__rig.go("r39"));
    await pg.waitForFunction(() => window.__log.some((e) => e.k === "room" && /^r39/.test(e.v)), null, { timeout: 120000 });
    const panoOrder = () => reqs.filter((r) => r.media && /pano/.test(r.url)).map((r) => (r.url.match(/\/(r\d+)\//) || [])[1]);
    for (let i = 0; i < 60 && panoOrder().indexOf("r39") < 0; i++) await sleep(200);   // the room opens on its thumb; the panorama follows
    const idx = panoOrder().indexOf("r39");
    ok("a room forty doors away jumps the queue when it is tapped", idx >= 0 && idx <= before + 2, "its panorama was request " + (idx - before) + " after the tap, with " + (N - before) + " rooms still queued");
    await rigIdle(pg);
    const st = await pg.evaluate(() => window.__rig.stats());
    /* forty panoramas plus the thumb the room on screen is still holding */
    ok("all forty panoramas are held, one texture each", st.textures >= N && st.textures <= N + 2, st);
    const cdp = await h.ctx.newCDPSession(pg);
    await cdp.send("Performance.enable");
    const met = (await cdp.send("Performance.getMetrics")).metrics.reduce((a, m) => (a[m.name] = m.value, a), {});
    const heapMb = Math.round(met.JSHeapUsedSize / 1048576);
    ok("the JS heap stays modest with forty rooms loaded", heapMb < 400, heapMb + " MB used");
    /* an undo/redo cycle over forty rooms must not leak */
    const cyc = await pg.evaluate(async () => {
      const out = [];
      for (let i = 0; i < 3; i++) {
        const clone = JSON.parse(JSON.stringify(window.__tour));
        window.__rig.load(clone);
        clone.rooms.forEach((r) => window.__rig.setPano(r.id, r.pano));
        window.__rig.go("r0", { force: true });
        await new Promise((r) => { const iv = setInterval(() => { const s = window.__rig.stats(); if (!s.queued && !s.inflight) { clearInterval(iv); r(); } }, 100); });
        out.push(window.__rig.stats().textures);
      }
      return out;
    });
    ok("three load()+setPano cycles over forty rooms leak nothing", cyc.every((n) => n === cyc[0]) && cyc[0] <= st.textures, st.textures + " → " + cyc.join(","));
    ok("no page errors with forty rooms", h.errors.length === 0, h.errors.join(" | ") || "none");
    await h.ctx.close();
  }

  /* (c) a throttled 4G connection: time to the first room and to the last door.
     The pictures are the repo's own panoramas over real HTTP — Chromium only
     throttles bytes it fetches itself, so nothing here is intercepted. */
  {
    const files = ["church_meeting_room", "suburban_garden", "roof_garden", "dancing_hall", "combination_room", "kiara_interior", "reading_room", "modern_bathroom"];
    const tour = { id: "slow", project: { name: "Slow", cover: "s0" }, brand: {}, floors: [{ id: "g", name: "G" }], rooms: [] };
    files.forEach((f, i) => {
      const hs = [];
      if (i > 0) hs.push({ id: "b" + i, type: "nav", to: "s" + (i - 1), yaw: 180, pitch: -6, label: "Back" });
      if (i < files.length - 1) hs.push({ id: "f" + i, type: "nav", to: "s" + (i + 1), yaw: 0, pitch: -6, label: "On" });
      tour.rooms.push({ id: "s" + i, name: "Room " + (i + 1), floor: "g", pano: "/billy360/panos/" + f + ".jpg",
                        thumb: "/billy360/panos/unfinished_office.jpg", view: { yaw: 0, pitch: 0, fov: 75 }, hotspots: hs });
    });
    const bytes = files.reduce((a, f) => a + fs.statSync(path.join(ROOT, "billy360/panos/" + f + ".jpg")).size, 0);
    const ctx = await br.newContext(DESKTOP);
    await offline(ctx);
    await ctx.route("**/api/public/tours/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(tour) }));
    await ctx.route("**/api/public/event", (r) => r.fulfill({ status: 204, body: "" }));
    const page = await ctx.newPage(); const errs = watch(page);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 4 * 1024 * 1024 / 8, uploadThroughput: 1024 * 1024 / 8 });
    const done = {};
    page.on("response", (r) => { const m = /panos\/([a-z_0-9]+)\.jpg/.exec(r.url()); if (m) done[m[1]] = Date.now(); });
    const t0 = Date.now();
    await page.goto(S + "/billy360/?site=slow", { waitUntil: "commit" });
    await ready(page, 120000);
    const tFirst = Date.now() - t0;
    const coverDone = done[files[0]] ? done[files[0]] - t0 : null;
    /* SwiftShader decodes and uploads the first texture in software, so this is
       a ceiling for the worst machine we test on, not the phone number. */
    ok("throttled 4G: the first room is on screen in a few seconds", tFirst < 6000, tFirst + " ms (viewer + " + Math.round(bytes / 1024) + " KB of panoramas at 4 Mbit/s, software renderer)");
    /* the last door: walk to the far end and wait for the picture */
    await page.evaluate(() => window.BILLY360App.go("s7"));
    await page.waitForFunction(() => document.querySelector("#roomName").textContent === "Room 8", null, { timeout: 120000 });
    const tLast = Date.now() - t0;
    ok("throttled 4G: the last room in the tour is usable well inside 20 s", tLast < 20000, tLast + " ms from first byte");
    ok("no page errors on a slow connection", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await ctx.close();
  }

  /* (d) thumb first: hold the panoramas back and the room still opens */
  {
    const tour = stubTour();
    tour.rooms.forEach((r) => { r.pano = "/media/l1/" + r.id + "/pano4096.jpg"; r.thumb = "/media/l1/" + r.id + "/w480.jpg"; });
    const ctx = await br.newContext(DESKTOP);
    await offline(ctx); await stubApi(ctx, tour);
    let tourAt = 0, thumbAt = 0;
    await ctx.route("**/media/**", async (r) => {
      const u = r.request().url();
      if (/pano4096/.test(u)) await sleep(6000);          // a panorama that crawls in
      else if (/w480/.test(u) && !thumbAt) thumbAt = Date.now();
      return r.fulfill({ status: 200, contentType: "image/jpeg", body: fs.readFileSync(SMALL) });
    });
    const page = await ctx.newPage(); const errs = watch(page);
    page.on("response", (r) => { if (/api\/public\/tours/.test(r.url()) && !tourAt) tourAt = Date.now(); });
    await page.goto(S + "/billy360/?site=x", { waitUntil: "commit" });
    await ready(page, 120000);
    const tReady = Date.now();
    const shot = await page.evaluate(() => new Promise((res) => requestAnimationFrame(() => {
      const c = document.querySelector("#gl"), cc = document.createElement("canvas");
      cc.width = 64; cc.height = 40;
      const x = cc.getContext("2d"); x.drawImage(c, 0, 0, 64, 40);
      const d = x.getImageData(0, 0, 64, 40).data;
      let s = 0; for (let i = 0; i < d.length; i += 4) s += (d[i] + d[i + 1] + d[i + 2]) / 3;
      res({ luma: s / (d.length / 4), sharpen: !document.querySelector("#sharpen").hidden, room: document.querySelector("#roomName").textContent });
    })));
    ok("a slow panorama never holds the room back: the thumb opens it", tReady - tourAt < 5000 && shot.luma > 3 && shot.room === "Kitchen",
       (tReady - tourAt) + " ms after the tour JSON, canvas luma " + shot.luma.toFixed(1) + " (the panorama is held for 6 s)");
    ok("no page errors while the panorama is still downloading", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");
    await ctx.close();
  }
}

/* ══ 6 · office mode against wrangler dev ══════════════════════════════ */
const OFFICE_ONLY = process.env.BILLY360_OFFICE_ONLY || "abcdefgh";
const STUDIO = () => W + "/templates/megacity-studio";
let COOKIE = "";

async function wapi(method, p, body) {
  const h = { "X-Studio": "1", Origin: W };
  if (COOKIE) h.Cookie = COOKIE;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (!isForm && body !== undefined) h["content-type"] = "application/json";
  const r = await fetch(W + p, { method, headers: h, body: body === undefined ? undefined : isForm ? body : JSON.stringify(body) });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { status: r.status, json: j };
}
async function wlogin() {
  const jar = path.join(OUT, "studio-cookie.txt");
  try { COOKIE = fs.readFileSync(jar, "utf8").trim(); if (COOKIE && (await wapi("GET", "/api/studio/tours/" + ID)).status !== 401) return "cached"; } catch (e) {}
  for (let i = 0; i < 8; i++) {
    const r = await fetch(W + "/api/studio/auth/login", { method: "POST", headers: { "content-type": "application/json", "X-Studio": "1", Origin: W },
      body: JSON.stringify({ email: process.env.STUDIO_EMAIL || "walid@example.com", password: process.env.STUDIO_PASSWORD || "correct-horse-battery" }) });
    if (r.status === 429) { await sleep(30000); continue; }         // the login route rate-limits after ~10 tries
    COOKIE = (r.headers.get("set-cookie") || "").split(";")[0];
    if (COOKIE) fs.writeFileSync(jar, COOKIE);
    return r.status;
  }
  throw new Error("could not sign in to the Studio");
}
async function withCookie(ctx) {
  const [n, v] = COOKIE.split("=");
  await ctx.addCookies([{ name: n, value: v, domain: "localhost", path: "/", httpOnly: true, secure: true, sameSite: "Lax" }]);
}
function wfile(p, type) { return new File([fs.readFileSync(p)], p.split("/").pop(), { type }); }
async function uploadPano(roomLabel) {
  const fd = new FormData();
  fd.append("meta", JSON.stringify({ listingId: ID, roomLabel, alt: "", width: 4096, height: 2048, isPano: true, role: "tour", panoIsOrig: true }));
  fd.append("orig", wfile(PANO4K || SMALL, "image/jpeg"), "upload.jpg");
  fd.append("large", wfile(SMALL, "image/jpeg"), "w1600.jpg");
  fd.append("thumb", wfile(SMALL, "image/jpeg"), "w480.jpg");
  fd.append("pano2048", wfile(SMALL, "image/jpeg"), "pano2048.jpg");
  return wapi("POST", "/api/studio/media", fd);
}
/* a fresh tour: the skeleton, optionally with a real panorama in every room */
async function resetTour(withPanos, weak) {
  await wapi("DELETE", "/api/studio/tours/" + ID);
  const c = await wapi("POST", "/api/studio/tours/" + ID, {});
  if (c.status !== 200 && c.status !== 201) throw new Error("create tour: " + c.status + " " + JSON.stringify(c.json));
  const t = c.json.tour;
  if (withPanos) {
    const up = await uploadPano(t.rooms[0].name);
    const m = (up.json && (up.json.media || up.json)) || {};
    t.rooms.forEach((r, i) => {
      r.pano = m.pano; r.thumb = m.thumb;
      r.photos = [{ src: m.url, thumb: m.thumb, caption: "" }];   // the guide's photo step is then behind us
      if (!weak) { r.description = "A bright " + r.name.toLowerCase() + "."; r.plan = [20 + (i % 8) * 10, 30 + (i % 3) * 10]; }
    });
    t.rooms.forEach((r) => (r.hotspots || []).forEach((hs) => { delete hs.auto; }));
  }
  const p = await wapi("PUT", "/api/studio/tours/" + ID, { tour: t, version: c.json.version, health: withPanos && !weak ? 90 : null });
  if (p.status !== 200) throw new Error("reset PUT: " + p.status + " " + JSON.stringify(p.json));
  return p.json;
}
const setGate = (n) => wapi("PUT", "/api/studio/settings", { tourGateScore: n });
const serverTour = async () => (await wapi("GET", "/api/studio/tours/" + ID)).json;

function apiTrace(page) {
  const net = [];
  page.on("request", (r) => { if (/\/api\//.test(r.url())) net.push({ ev: "req", m: r.method(), u: r.url().replace(W, ""), body: /^(PUT|POST)$/.test(r.method()) ? (r.postData() || "") : "" }); });
  page.on("response", (r) => { if (/\/api\//.test(r.url())) net.push({ ev: "res", m: r.request().method(), u: r.url().replace(W, ""), s: r.status() }); });
  return net;
}
async function bootOffice(page, hash) {
  await page.goto(W + "/billy360/?site=" + ID + "&office=1" + (hash || "#/studio/rooms"), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.BILLY360App && window.BILLY360App.tour() && window.BILLY360App.sync && window.BILLY360App.sync(), null, { timeout: 60000 });
  await page.evaluate(() => {
    window.__pill = []; window.__toasts = [];
    const n = document.querySelector("#saveState");
    const push = () => { const t = n.textContent.trim(); if (!window.__pill.length || window.__pill[window.__pill.length - 1] !== t) window.__pill.push(t); };
    push(); new MutationObserver(push).observe(n, { childList: true, subtree: true, characterData: true });
    const tb = document.querySelector("#toast") || document.body;
    new MutationObserver(() => { const t = tb.textContent.trim(); if (t && window.__toasts[window.__toasts.length - 1] !== t) window.__toasts.push(t); }).observe(tb, { childList: true, subtree: true, characterData: true });
  });
  await sleep(500);
}
const waitPill = (page, re, ms) => page.waitForFunction((src) => new RegExp(src).test(document.querySelector("#saveState").textContent.trim()), re.source, { timeout: ms || 30000 }).then(() => true, () => false);
const pillNow = (page) => page.evaluate(() => document.querySelector("#saveState").textContent.trim());
async function renameRoom(page, name) {
  await page.click('#studioNav button[data-tab="rooms"]'); await sleep(300);
  const inp = page.locator('#studioBody .field:has(> label:text-is("Name")) input').first();
  await inp.fill(name);
  await inp.dispatchEvent("input");
}
/* six panoramas, drawn in the browser so the suite carries no binary fixtures */
async function makePanos(br, n) {
  const dir = path.join(OUT, "fx");
  fs.mkdirSync(dir, { recursive: true });
  const names = ["hall", "living", "kitchen", "bed", "bath", "garden"].slice(0, n);
  if (names.every((f) => fs.existsSync(path.join(dir, f + ".jpg")))) return names.map((f) => path.join(dir, f + ".jpg"));
  const ctx = await br.newContext(DESKTOP);
  const page = await ctx.newPage();
  await page.goto(S + "/billy360/", { waitUntil: "domcontentloaded" });
  for (let i = 0; i < names.length; i++) {
    const b64 = await page.evaluate(async (hue) => {
      const c = document.createElement("canvas"); c.width = 4096; c.height = 2048;
      const x = c.getContext("2d");
      const g = x.createLinearGradient(0, 0, 4096, 2048);
      g.addColorStop(0, "hsl(" + hue + ",60%,55%)"); g.addColorStop(1, "hsl(" + ((hue + 60) % 360) + ",50%,25%)");
      x.fillStyle = g; x.fillRect(0, 0, 4096, 2048);
      x.fillStyle = "rgba(255,255,255,.35)";
      for (let k = 0; k < 40; k++) x.fillRect((k * 101) % 4000, (k * 57) % 1900, 60, 90);
      const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.8));
      const buf = await blob.arrayBuffer();
      let s = ""; const u = new Uint8Array(buf);
      for (let j = 0; j < u.length; j++) s += String.fromCharCode(u[j]);
      return btoa(s);
    }, i * 47);
    fs.writeFileSync(path.join(dir, names[i] + ".jpg"), Buffer.from(b64, "base64"));
  }
  await ctx.close();
  return names.map((f) => path.join(dir, f + ".jpg"));
}
/* answer every "Which room is this?" card the intake raises */
async function answerCards(page, choose) {
  const seen = [];
  let idle = 0;
  for (let i = 0; i < 900; i++) {
    const card = await page.evaluate(() => {
      const w = document.querySelector(".ask-room");
      if (!w) return null;
      const sel = w.querySelector("select");
      return { chip: (w.querySelector(".chip") || {}).textContent, value: sel.value, text: sel.options[sel.selectedIndex].textContent,
               options: [...sel.options].map((o) => o.textContent), taken: (w.querySelector(".ask-room-taken") || {}).textContent || "" };
    });
    if (!card) {
      const busy = await page.evaluate(() => !!document.querySelector(".drop.is-busy"));
      if (!busy) { if (!idle) idle = Date.now(); else if (Date.now() - idle > 3000) break; }
      await sleep(150); continue;
    }
    idle = 0;
    const want = choose ? choose(card, seen.length) : null;
    seen.push(card);
    if (want && want.value) await page.selectOption(".ask-room select", want.value);
    page.once("dialog", (d) => d.accept());
    await page.click(".ask-room .btn--primary");
    await sleep(150);
  }
  return seen;
}
/* the Megacity host, proxied through curl so wrangler sees the right Host header */
async function routeMegacityHost(page, seen) {
  const { spawnSync } = require("child_process");
  await page.route(/^https?:\/\/www\.megacityproperties\.co\.uk\//, (route) => {
    const u = new URL(route.request().url());
    if (seen) seen.push(u.pathname + u.search);
    const r = spawnSync("curl", ["-s", "-D", "-", "-H", "Host: " + HOST, "-X", route.request().method(), W + u.pathname + u.search],
      { encoding: "buffer", env: Object.assign({}, process.env, { NO_PROXY: "localhost,127.0.0.1" }), maxBuffer: 64 * 1024 * 1024 });
    const raw = r.stdout, sep = raw.indexOf("\r\n\r\n");
    const head = raw.slice(0, sep).toString("latin1"), body = raw.slice(sep + 4);
    const lines = head.split("\r\n"), status = Number(lines[0].split(" ")[1] || 500), headers = {};
    lines.slice(1).forEach((l) => { const i = l.indexOf(":"); if (i > 0) { const k = l.slice(0, i).toLowerCase(); if (!/^(content-length|transfer-encoding|content-encoding|connection)$/.test(k)) headers[k] = l.slice(i + 1).trim(); } });
    route.fulfill({ status, headers, body });
  });
}

async function sectionOffice(br) {
  console.log("studio login:", await wlogin());

  /* ── (a) the office editor: remote gating and a save that only says Saved after the PUT ── */
  if (OFFICE_ONLY.indexOf("a") >= 0) {
    await resetTour(true);
    await setGate(70);
    const ctx = await br.newContext(DESKTOP);
    await offline(ctx); await withCookie(ctx);
    const page = await ctx.newPage(); const errs = watch(page);
    await bootOffice(page, "#/studio/sites");
    const gate = await page.evaluate(() => {
      const field = (label) => [...document.querySelectorAll("#studioBody .field")].find((f) => f.firstChild && f.firstChild.textContent.trim() === label);
      const nameF = field("Property name");
      return {
        mode: window.BILLY360_STORE.mode, listing: window.BILLY360_STORE.listingId,
        gets: performance.getEntriesByType("resource").filter((e) => /\/api\/studio\/tours\//.test(e.name) && !/publish/.test(e.name)).length,
        admin: document.querySelector("#btnAdmin").hidden,
        access: document.querySelector('#studioNav button[data-tab="access"]').hidden,
        newBtn: !!document.querySelector("#btnNewProject"), dupBtn: !!document.querySelector("#btnDupProject"), delBtn: !!document.querySelector("#btnDeleteProject"),
        nameDisabled: nameF ? nameF.querySelector("input").disabled : null, hint: !!document.querySelector("#listingFieldHint"),
        visStatus: (document.querySelector("[data-pubstatus]") || {}).textContent,
        liveVersion: window.BILLY360_STORE.liveVersion, gateScore: window.BILLY360_STORE.gate, studioUrl: window.BILLY360_STORE.studioUrl
      };
    });
    ok("office boot: remote mode, one tour GET, no Access tab, no browser Studio sign-in", gate.mode === "remote" && gate.listing === ID && gate.gets === 1 && gate.admin === true && gate.access === true, gate);
    ok("the boot GET carries the whole summary (liveVersion, gate, studio URL)", gate.liveVersion !== undefined && typeof gate.gateScore === "number" && !!gate.studioUrl, gate);
    ok("the office editor has no New/Duplicate/Delete and the listing facts are read-only", !gate.newBtn && !gate.dupBtn && !gate.delBtn && gate.nameDisabled === true && gate.hint, gate);
    await page.evaluate(() => { location.hash = "#/studio/access"; });
    await sleep(500);
    ok("#/studio/access falls back to the Rooms tab in office mode", (await page.evaluate(() => document.querySelector("#studioNav button.is-on").getAttribute("data-tab"))) === "rooms");

    /* "Saved" must wait for the PUT: hold the response back for two seconds */
    let held = 0;
    await page.route("**/api/studio/tours/" + ID, async (r) => {
      if (r.request().method() !== "PUT") return r.continue();
      held++; await sleep(2000); return r.continue();
    });
    await renameRoom(page, "Hallway D1");
    await waitPill(page, /Unsaved|Saving/, 15000);
    await page.waitForRequest((r) => r.method() === "PUT" && /\/tours\//.test(r.url()), { timeout: 40000 });
    await sleep(1000);                      // half way through the held response
    const midFlight = await pillNow(page);
    await page.waitForResponse((r) => r.request().method() === "PUT" && /\/tours\//.test(r.url()), { timeout: 40000 });
    const atResponse = await pillNow(page);
    const saved = await waitPill(page, /^Saved$/, 20000);
    const seq = await page.evaluate(() => window.__pill);
    ok("the pill runs Unsaved → Saving… → Saved and never says Saved while the PUT is still in flight",
       saved && held === 1 && midFlight !== "Saved" && seq.lastIndexOf("Saved") > seq.indexOf("Saving…") && seq.indexOf("Saving…") > 0 && seq.indexOf("Unsaved changes") > 0,
       { seq, held, midFlight, atResponse });
    ok("the server really has the edit", (await serverTour()).tour.rooms[0].name === "Hallway D1", (await serverTour()).tour.rooms[0].name);
    await page.unroute("**/api/studio/tours/" + ID);
    ok("no page errors in the office editor", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");
    await page.close(); await ctx.close();
  }

  /* ── (b) the queue under stress: retry, 409, 401 ── */
  if (OFFICE_ONLY.indexOf("b") >= 0) {
    await resetTour(true);
    const ctx = await br.newContext(DESKTOP);
    await offline(ctx); await withCookie(ctx);
    const page = await ctx.newPage(); const errs = watch(page);
    await bootOffice(page, "#/studio/rooms");

    /* the network drops: the queue keeps the edit and retries */
    let block = true;
    await page.route("**/api/studio/tours/" + ID, (r) => (block && r.request().method() === "PUT") ? r.abort("failed") : r.continue());
    await renameRoom(page, "Offline edit");
    const retrying = await waitPill(page, /retrying|Retry|Not saved/, 30000);
    ok("a PUT that cannot leave the browser says so and keeps retrying", retrying, await pillNow(page));
    block = false;
    await page.evaluate(() => window.BILLY360App.sync().retry && window.BILLY360App.sync().retry());
    const backOk = await waitPill(page, /^Saved$/, 40000);
    ok("when the network comes back the edit is saved", backOk && (await serverTour()).tour.rooms[0].name === "Offline edit", await pillNow(page));

    /* somebody else saves first: 409 and the choice */
    const s1 = await serverTour();
    const other = JSON.parse(JSON.stringify(s1.tour));
    other.rooms[0].name = "Saved by someone else";
    const put = await wapi("PUT", "/api/studio/tours/" + ID, { tour: other, version: s1.version, health: 90 });
    ok("a second editor's PUT succeeds first", put.status === 200, put.status);
    await renameRoom(page, "Mine");
    await page.waitForSelector("#syncConflict", { timeout: 40000 }).catch(() => {});
    const conflict = await page.evaluate(() => {
      const n = document.querySelector("#syncConflict");
      return n ? { role: n.getAttribute("role"), title: (n.querySelector("h4") || {}).textContent, mine: !!document.querySelector("#syncMine"), theirs: !!document.querySelector("#syncTheirs") } : null;
    });
    ok("a 409 opens the conflict sheet with both ways out", conflict && conflict.mine && conflict.theirs && /dialog/.test(conflict.role || ""), conflict);
    await page.click("#syncMine");
    const keptMine = await waitPill(page, /^Saved$/, 40000);
    ok('"Keep mine" wins with the fresh version', keptMine && (await serverTour()).tour.rooms[0].name === "Mine", (await serverTour()).tour.rooms[0].name);

    /* a second clash while the first is being resolved: "Keep mine" must not
       report a save that never left the browser, and the pill has to lead
       back to the sheet if it ever goes */
    const s2 = await serverTour();
    const other2 = JSON.parse(JSON.stringify(s2.tour));
    other2.rooms[0].name = "Saved by someone else again";
    await wapi("PUT", "/api/studio/tours/" + ID, { tour: other2, version: s2.version, health: 90 });
    await renameRoom(page, "Mine again");
    await page.waitForSelector("#syncConflict", { timeout: 40000 }).catch(() => {});
    let clash = true;
    await page.route("**/api/studio/tours/" + ID, (r) => (clash && r.request().method() === "PUT")
      ? r.fulfill({ status: 409, contentType: "application/json", body: '{"error":"Someone else saved this tour since you opened it.","version":9999}' })
      : r.continue());
    await page.evaluate(() => { window.__toasts = []; });
    await page.click("#syncMine");
    await sleep(3000);
    const failed = await page.evaluate(() => ({
      sheet: !!document.querySelector("#syncConflict"), toasts: window.__toasts.slice(-2),
      pill: document.querySelector("#saveState").textContent.trim(), dirty: window.BILLY360App.sync().dirty
    }));
    ok('a "Keep mine" that the server refused says so and keeps the sheet open',
       failed.sheet && failed.dirty && !failed.toasts.some((t) => /Saved your version/.test(t)) && failed.toasts.some((t) => /Couldn't save your version/.test(t)),
       failed);
    ok("the server does not have the version that was reported as saved", (await serverTour()).tour.rooms[0].name === "Saved by someone else again", (await serverTour()).tour.rooms[0].name);
    /* the sheet gone, the pill is the only way back to it */
    await page.evaluate(() => {
      const n = document.querySelector("#syncConflict"); if (n) n.remove();
      ["viewSites", "viewDash", "viewTour", "viewStudio"].forEach((id) => { const e = document.querySelector("#" + id); if (e) e.inert = false; });
    });
    await page.click("#saveState");
    await sleep(600);
    const reopened = await page.evaluate(() => ({ sheet: !!document.querySelector("#syncConflict"),
      role: document.querySelector("#saveState").getAttribute("role"), pill: document.querySelector("#saveState").textContent.trim() }));
    ok("the conflict pill is a button that reopens the sheet", reopened.sheet && reopened.role === "button" && /Conflict/.test(reopened.pill), reopened);
    clash = false;
    await page.click("#syncMine");
    const won = await waitPill(page, /^(Saved|Changes not live)$/, 40000);
    ok('"Keep mine" saves once the server lets it', won && (await serverTour()).tour.rooms[0].name === "Mine again", await pillNow(page));
    await page.unroute("**/api/studio/tours/" + ID);

    /* the tab going away with an edit still in hand: a phone that reclaims a
       backgrounded tab never fires beforeunload, so the draft is stashed */
    const stashKey = "billy360:pending:" + ID;
    let hold = true;
    await page.route("**/api/studio/tours/" + ID, (r) => (hold && r.request().method() === "PUT") ? r.abort("failed") : r.continue());
    await renameRoom(page, "Typed just before the tab went");
    await waitPill(page, /Unsaved|Saving|retrying|Not saved/, 30000);
    const onHide = await page.evaluate((k) => {
      localStorage.removeItem(k);
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
      document.dispatchEvent(new Event("visibilitychange"));
      const kept = localStorage.getItem(k);
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
      return kept ? (JSON.parse(kept).tour.rooms[0].name || "") : null;
    }, stashKey);
    ok("the tab being hidden with an unsaved edit stashes the draft", onHide === "Typed just before the tab went", onHide);
    const onPagehide = await page.evaluate((k) => {
      localStorage.removeItem(k);
      window.dispatchEvent(new Event("pagehide"));
      const kept = localStorage.getItem(k);
      return kept ? (JSON.parse(kept).tour.rooms[0].name || "") : null;
    }, stashKey);
    ok("pagehide stashes it too", onPagehide === "Typed just before the tab went", onPagehide);
    hold = false;
    await page.evaluate(() => window.BILLY360App.sync().retry());
    const stashed = await waitPill(page, /^(Saved|Changes not live)$/, 40000);
    ok("the stash is cleared again once the edit reaches the server", stashed && (await page.evaluate((k) => !localStorage.getItem(k), stashKey)), await pillNow(page));
    await page.unroute("**/api/studio/tours/" + ID);

    /* the session expires: the draft is kept and a way back offered */
    await page.route("**/api/studio/tours/" + ID, (r) => r.request().method() === "PUT"
      ? r.fulfill({ status: 401, contentType: "application/json", body: '{"error":"Sign in again"}' }) : r.continue());
    await renameRoom(page, "After the session went");
    await page.waitForSelector("#signinBar", { timeout: 40000 }).catch(() => {});
    const out = await page.evaluate(() => ({
      bar: !!document.querySelector("#signinBar"), go: !!document.querySelector("#signinBarGo"),
      pill: document.querySelector("#saveState").textContent.trim(),
      stash: Object.keys(localStorage).filter((k) => /^billy360:pending:/.test(k)),
      dirty: window.BILLY360App.sync().dirty
    }));
    ok("a 401 shows a sign-in bar, keeps the draft in the browser and stays dirty", out.bar && out.go && /Sign in/.test(out.pill) && out.stash.length === 1 && out.dirty, out);
    await page.unroute("**/api/studio/tours/" + ID);
    await page.evaluate(() => window.BILLY360App.sync().flush({ force: true }));
    const back = await waitPill(page, /^(Saved|Changes not live)$/, 40000);
    ok("once the session is back the kept draft goes up and the stash is cleared", back && (await page.evaluate(() => Object.keys(localStorage).filter((k) => /^billy360:pending:/.test(k)).length)) === 0, await pillNow(page));
    ok("no page errors under queue stress", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");
    await page.close(); await ctx.close();
  }

  /* ── (c) every publish entry point ── */
  if (OFFICE_ONLY.indexOf("c") >= 0) {
    await resetTour(true, true);          // scored but weak: the gate will refuse
    await setGate(100);
    await wapi("POST", "/api/studio/listings/" + ID + "/publish", {});
    const ctx = await br.newContext(DESKTOP);
    await offline(ctx); await withCookie(ctx);
    const page = await ctx.newPage(); const errs = watch(page); const net = apiTrace(page);
    await bootOffice(page, "#/studio/rooms");
    async function burst(act) {
      const from = net.length;
      await act();
      await page.waitForFunction(() => { const s = window.BILLY360App.sync(); return s.state === "saved" || s.state === "error" || s.state === "idle"; }, null, { timeout: 40000 }).catch(() => {});
      await page.waitForResponse((r) => /\/publish$/.test(r.url()), { timeout: 40000 }).catch(() => {});
      await sleep(700);
      return net.slice(from).filter((n) => n.ev === "res" && (n.m === "PUT" || /publish/.test(n.u))).map((n) => n.m + " " + (/publish/.test(n.u) ? "publish" : "tour") + " " + n.s);
    }
    const o1 = await burst(() => page.click("#btnStudioPublish"));
    const p1 = await page.evaluate(() => ({ tab: (document.querySelector("#studioNav button.is-on") || {}).getAttribute && document.querySelector("#studioNav button.is-on").getAttribute("data-tab"),
                                            items: [...document.querySelectorAll("#publishProblems li")].map((li) => li.textContent), status: window.BILLY360_STORE.status }));
    ok("top bar Publish: the queue is flushed first, then /publish; the gate's problems are listed", o1.length === 2 && /^PUT/.test(o1[0]) && /publish 200$/.test(o1[1]) && p1.tab === "publish" && p1.items.length > 0 && p1.status === "draft", { o1, p1 });
    await setGate(1);
    /* the editor learns the new threshold from the next save's response */
    await renameRoom(page, "Hallway before go-live");
    await waitPill(page, /^(Saved|Changes not live)$/, 40000);
    await bootOffice(page, "#/studio/rooms");   // a fresh boot so the guide re-reads the score against the new gate
    await sleep(600);
    const hasGuide = await page.locator("#guideWiz .gw-now button[data-golive]").count();
    if (!hasGuide) skip("the guide's \"Make it live now\" publishes for real", "the guide is not offering go-live at this score");
    const o2 = hasGuide ? await burst(() => page.click("#guideWiz .gw-now button[data-golive]")) : await burst(() => page.click("#btnStudioPublish"));
    const p2 = await page.evaluate(() => ({ status: window.BILLY360_STORE.status, hidden: window.BILLY360App.tour().project.hidden,
                                            live: window.BILLY360_STORE.liveVersion, v: window.BILLY360_STORE.version, toasts: window.__toasts.slice(-3) }));
    ok(hasGuide ? 'the guide\'s "Make it live now" publishes for real' : "the tour goes live once it clears the gate",
       o2.length === 2 && /publish 200$/.test(o2[1]) && p2.status === "live" && p2.hidden === false && p2.live === p2.v, { o2, p2 });
    await renameRoom(page, "Renamed after go-live");
    const notLive = await waitPill(page, /^Changes not live$/, 30000);
    ok("editing a live tour says Changes not live", notLive, await pillNow(page));
    await page.click('#studioNav button[data-tab="assistant"]'); await sleep(400);
    const o4 = await burst(async () => { await page.fill("#asInput", "make it live"); await page.click("#asSend"); });
    const p4 = await page.evaluate(() => ({ last: [...document.querySelectorAll("#asLog .as-msg")].map((m) => m.textContent).slice(-1)[0], pill: document.querySelector("#saveState").textContent.trim() }));
    ok("the assistant publishes too and answers in plain English", o4.length === 2 && /publish 200$/.test(o4[1]) && /Live on the listing/.test(p4.last || "") && p4.pill === "Saved", { o4, p4 });
    await page.click('#studioNav button[data-tab="publish"]'); await sleep(400);
    const o5 = await burst(() => page.click("#btnPublishRemote"));
    ok("the Publish tab's own button does the same", o5.length >= 1 && /publish 200$/.test(o5[o5.length - 1]), o5);
    page.once("dialog", (d) => d.accept());
    await page.click("#btnUnpublishRemote");
    await page.waitForResponse((r) => /unpublish$/.test(r.url()), { timeout: 30000 });
    await sleep(500);
    ok('"Take it off the listing" puts it back to draft', await page.evaluate(() => window.BILLY360_STORE.status === "draft"), await page.evaluate(() => window.BILLY360_STORE.status));
    await setGate(70);
    ok("no page errors around publishing", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");
    await page.close(); await ctx.close();
  }

  /* ── (d) six panoramas through the intake, one at a time ── */
  if (OFFICE_ONLY.indexOf("d") >= 0) {
    const files = await makePanos(br, 6);
    const created = await resetTour(false);
    const ctx = await br.newContext(PHONE);
    await offline(ctx); await withCookie(ctx);
    const page = await ctx.newPage(); const errs = watch(page); const net = apiTrace(page);
    await bootOffice(page, "#/studio/rooms");
    await page.evaluate(() => {
      window.__prog = []; window.__inflight = 0; window.__maxInflight = 0; window.__decodes = 0;
      const cib = window.createImageBitmap;
      if (cib) window.createImageBitmap = function () { window.__decodes++; window.__inflight++; window.__maxInflight = Math.max(window.__maxInflight, window.__inflight);
        return cib.apply(this, arguments).finally(() => { window.__inflight--; }); };
      new MutationObserver(() => { const n = document.querySelector(".drop .drop-status"); if (n && n.textContent && window.__prog[window.__prog.length - 1] !== n.textContent) window.__prog.push(n.textContent.trim()); })
        .observe(document.body, { childList: true, subtree: true, characterData: true });
    });
    const before = await page.evaluate(() => JSON.parse(JSON.stringify(window.BILLY360App.tour())));
    const t0 = Date.now();
    await page.setInputFiles("#bulkFile", files);
    const cards = await answerCards(page);
    const readMs = Date.now() - t0;
    const conc = await page.evaluate(() => ({ max: window.__maxInflight, decodes: window.__decodes, prog: window.__prog }));
    ok("six photographs are read one at a time with a counted progress line", cards.length === 6 && conc.max <= 1 && [1, 2, 3, 4, 5, 6].every((n) => conc.prog.some((p) => p === "Reading photo " + n + " of 6…")), { cards: cards.length, max: conc.max, ms: readMs, prog: conc.prog.slice(0, 3) });
    const picks = cards.map((c) => c.value);
    ok("each card offers a different empty room and names the ones already taken", new Set(picks).size === 6 && picks.every((v) => v !== "__new") && /Already chosen/.test(cards[5].taken) === true, { picks, taken: cards[5].taken });
    const savedOk = await waitPill(page, /^(Saved|Changes not live)$/, 240000);
    const after = (await serverTour()).tour;
    const withPano = after.rooms.filter((r) => /^\/media\//.test(r.pano || ""));
    ok("six rooms end up with their own /media/ panorama and a w480 thumb", savedOk && withPano.length === 6 && new Set(withPano.map((r) => r.pano)).size === 6 && withPano.every((r) => /w480/.test(r.thumb || "")), { saved: savedOk, panos: withPano.length });
    const navs = (t) => t.rooms.reduce((n, r) => n + (r.hotspots || []).filter((h) => h.type === "nav").length, 0);
    ok("filling existing rooms adds no doors", navs(after) === navs(before), navs(before) + " → " + navs(after));
    const puts = net.filter((n) => n.ev === "req" && n.m === "PUT" && /\/tours\//.test(n.u));
    ok("no PUT ever carried a data: URL", puts.length > 0 && puts.every((p) => p.body.indexOf("data:image") < 0), puts.length + " PUTs");
    ok("no page errors during the intake", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");
    await page.screenshot({ path: path.join(OUT, "office-intake.png") });
    await page.close(); await ctx.close();
  }

  /* ── (e) the message bus with a harness parent ── */
  if (OFFICE_ONLY.indexOf("e") >= 0) {
    await resetTour(true);
    await setGate(1);
    const ctx = await br.newContext(DESKTOP);
    await offline(ctx); await withCookie(ctx);
    const page = await ctx.newPage(); const errs = watch(page);
    await page.route(W + "/__d1_harness.html", (r) => r.fulfill({ status: 200, contentType: "text/html", body:
      '<!doctype html><meta charset="utf-8"><title>harness</title><body style="margin:0">' +
      '<iframe id="f" src="/billy360/?site=' + ID + '&office=1#/studio/rooms" style="width:1200px;height:760px;border:0"></iframe>' +
      '<script>window.got=[];addEventListener("message",function(e){var d=e.data;' +
      'if(!d||d.source!=="billy360"||e.origin!==location.origin||e.source!==document.getElementById("f").contentWindow)return;got.push(d);});' +
      'window.send=function(m){m.source="billy360";document.getElementById("f").contentWindow.postMessage(m,location.origin);};<\/script>' }));
    await page.goto(W + "/__d1_harness.html", { waitUntil: "domcontentloaded" });
    const gotReady = await page.waitForFunction(() => window.got.some((m) => m.type === "billy360:ready"), null, { timeout: 60000 }).then(() => true, () => false);
    const f = page.frames().find((x) => /office=1/.test(x.url()));
    const h0 = await page.evaluate(() => history.length);
    await f.click('#studioNav button[data-tab="hotspots"]'); await sleep(300);
    await f.click('#studioNav button[data-tab="rooms"]'); await sleep(300);
    const h1 = await page.evaluate(() => history.length);
    ok("the framed editor announces billy360:ready and adds no history to the page around it", gotReady && h1 === h0, { gotReady, h0, h1 });

    await f.locator('#studioBody .field:has(> label:text-is("Name")) input').first().fill("Bus test");
    await f.locator('#studioBody .field:has(> label:text-is("Name")) input').first().dispatchEvent("input");
    await page.waitForFunction(() => window.got.some((m) => m.type === "billy360:state" && m.dirty), null, { timeout: 20000 }).catch(() => {});
    await page.evaluate(() => { window.got.length = 0; window.send({ type: "billy360:flush" }); });
    const flushed = await page.waitForFunction(() => window.got.some((m) => m.type === "billy360:flushed"), null, { timeout: 40000 }).then(() => true, () => false);
    const states = await page.evaluate(() => window.got.filter((m) => m.type === "billy360:state").map((m) => m.status));
    ok("billy360:flush drains the queue and answers billy360:flushed", flushed && states.indexOf("saved") >= 0, { flushed, states });
    await page.evaluate(() => { window.got.length = 0; window.send({ type: "billy360:publish" }); });
    const published = await page.waitForFunction(() => window.got.some((m) => m.type === "billy360:published"), null, { timeout: 60000 }).then(() => true, () => false);
    const pub = await page.evaluate(() => window.got.find((m) => m.type === "billy360:published"));
    ok("billy360:publish publishes and reports back", published && pub && pub.ok === true, pub);
    /* the editor's own version: a newer one is its cue to fetch that copy instead */
    const vNow = await f.evaluate(() => window.BILLY360_STORE.version);
    await page.evaluate((v) => { window.send({ type: "billy360:status", status: "live", health: 88, version: v, liveVersion: v, gate: 55 }); }, vNow);
    await sleep(800);
    const adopted = await f.evaluate(() => ({ status: window.BILLY360_STORE.status, gate: window.BILLY360_STORE.gate, health: window.BILLY360_STORE.health }));
    ok("billy360:status from the parent is adopted by the editor", adopted.status === "live" && adopted.gate === 55 && adopted.health === 88, adopted);
    await page.evaluate(() => { const w = document.getElementById("f").contentWindow; w.postMessage({ source: "billy360", type: "billy360:status", status: "draft", gate: 1 }, "*"); });
    const stray = await f.evaluate(() => new Promise((res) => { const s = document.createElement("iframe"); document.body.appendChild(s);
      s.contentWindow.parent.postMessage({ source: "billy360", type: "billy360:status", status: "bogus" }, location.origin); setTimeout(() => res(window.BILLY360_STORE.status), 400); }));
    ok("a message that did not come from the parent is ignored", stray !== "bogus", stray);
    ok("no page errors on the bus", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");
    await page.close(); await ctx.close();
  }

  /* ── (f) the Studio's 360 tab ── */
  if (OFFICE_ONLY.indexOf("f") >= 0) {
    await resetTour(true);
    await setGate(70);
    await wapi("POST", "/api/studio/tours/" + ID + "/unpublish", {}).catch(() => {});
    await wapi("POST", "/api/studio/listings/" + ID + "/publish", {});
    const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } });
    await offline(ctx); await withCookie(ctx);
    const page = await ctx.newPage(); const errs = watch(page);
    await page.goto(STUDIO() + "#/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#app:not([hidden])", { timeout: 30000 });
    await page.evaluate((h) => { location.hash = h; }, "#/listings/" + ID + "/tour");
    await page.waitForSelector("#tourStrip, #tourReadiness, [data-tact=create]", { timeout: 40000 });
    await sleep(1200);
    const frame = await page.waitForFunction(() => !!document.querySelector("iframe.st-tour-frame"), null, { timeout: 40000 }).then(() => true, () => false);
    const draft = await page.evaluate(() => ({
      pill: (document.querySelector("#tourStrip .st-pill") || {}).textContent,
      copy: (document.querySelector('[data-tact="copy-link"]') || {}).disabled,
      embed: (document.querySelector('[data-tact="copy-embed"]') || {}).disabled,
      qr: !!document.querySelector("#tourQr canvas"),
      allow: (document.querySelector("iframe.st-tour-frame") || {}).getAttribute && document.querySelector("iframe.st-tour-frame").getAttribute("allow")
    }));
    ok("the 360 tab mounts one editor frame and marks the tour Draft", frame && draft.pill === "Draft" && /fullscreen/.test(draft.allow || ""), draft);
    ok("copy link and embed are refused until it is published", draft.copy === true && draft.embed === true, draft);
    ok("the QR is drawn in the strip", draft.qr, draft.qr);
    const inner = page.frames().find((x) => /office=1/.test(x.url()));
    await inner.waitForFunction(() => window.BILLY360App && window.BILLY360App.tour(), null, { timeout: 60000 });
    await inner.evaluate(() => { window.__bus = []; addEventListener("message", (e) => { if (e.data && e.data.source === "billy360") window.__bus.push(e.data.type); }); });
    /* an unsaved edit in the frame, then Publish from the strip: the flush comes first */
    await inner.locator('#studioBody .field:has(> label:text-is("Name")) input').first().fill("Strip publish");
    await inner.locator('#studioBody .field:has(> label:text-is("Name")) input').first().dispatchEvent("input");
    await sleep(400);
    const order = [];
    page.on("response", (r) => { if (/\/api\/studio\/tours\//.test(r.url())) order.push(r.request().method() + (/publish/.test(r.url()) ? " publish" : " tour") + " " + r.status()); });
    await page.click('[data-tact="publish"]');
    await page.waitForFunction(() => /Live/.test((document.querySelector("#tourStrip .st-pill") || {}).textContent || ""), null, { timeout: 60000 }).catch(() => {});
    await sleep(800);
    const bus = await inner.evaluate(() => window.__bus);
    const live = await page.evaluate(() => ({
      pill: (document.querySelector("#tourStrip .st-pill") || {}).textContent,
      copy: (document.querySelector('[data-tact="copy-link"]') || {}).disabled,
      link: (document.querySelector(".st-qr-link") || {}).textContent,
      toast: document.body.innerText.match(/Tour published[^\n]*/) ? document.body.innerText.match(/Tour published[^\n]*/)[0] : ""
    }));
    ok("the strip's Publish flushes the frame first (billy360:flush) then publishes", bus.indexOf("billy360:flush") >= 0 && order.some((o) => /^PUT tour 200/.test(o)) && order.some((o) => /publish 200/.test(o)) &&
       order.findIndex((o) => /^PUT tour 200/.test(o)) < order.findIndex((o) => /publish 200/.test(o)), { bus, order });
    ok("the strip goes Live and the canonical link is offered", /Live/.test(live.pill || "") && live.copy === false && /https?:\/\//.test(live.link || ""), live);
    ok("the server kept the frame's unsaved edit", (await serverTour()).tour.rooms[0].name === "Strip publish", (await serverTour()).tour.rooms[0].name);
    ok("no page errors in the Studio", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");
    await page.screenshot({ path: path.join(OUT, "studio-360-tab.png") });
    await page.close(); await ctx.close();
  }

  /* ── (g) what the public sees: the listing page frame and /tour/<id> ── */
  if (OFFICE_ONLY.indexOf("g") >= 0) {
    /* make sure something is live to look at */
    const sum = await wapi("GET", "/api/studio/tours/" + ID);
    if (!sum.json || sum.json.status !== "live") {
      await resetTour(true);
      await setGate(1);
      await wapi("POST", "/api/studio/listings/" + ID + "/publish", {});
      const p = await wapi("POST", "/api/studio/tours/" + ID + "/publish", {});
      ok("a tour is live to look at", !!(p.json && p.json.ok), p.json && p.json.problems);
    } else ok("a tour is live to look at", true, "already live");

    for (const [label, opts] of [["desktop", { viewport: { width: 1440, height: 900 } }], ["phone", PHONE]]) {
      const ctx = await br.newContext(opts);
      await offline(ctx);
      const page = await ctx.newPage(); const errs = watch(page);
      let hold = true;
      await page.route(/\/billy360\/embed\.js/, async (r) => { while (hold) await sleep(50); return r.continue(); });
      await page.goto(W + "/templates/megacity-let-" + ID, { waitUntil: "commit" });
      await page.waitForSelector(".pd-tour", { timeout: 30000 });
      const before = await page.evaluate(() => { const n = document.querySelector(".pd-tour"); return { h: n.getBoundingClientRect().height, room: n.getAttribute("data-room"), id: n.getAttribute("data-billy360") }; });
      hold = false;
      /* embed.js only builds what is near the viewport (IntersectionObserver, 400 px) */
      await page.evaluate(() => document.querySelector(".pd-tour").scrollIntoView({ block: "center" }));
      await page.waitForFunction(() => !!document.querySelector(".pd-tour iframe"), null, { timeout: 40000 });
      await sleep(800);
      const after = await page.evaluate(() => { const n = document.querySelector(".pd-tour"); const f = n.querySelector("iframe"); return { h: n.getBoundingClientRect().height, src: f.getAttribute("src"), fits: Math.abs(f.getBoundingClientRect().height - n.getBoundingClientRect().height) < 2 }; });
      ok("listing (" + label + "): the tour box is reserved before embed.js and never moves", before.h > (label === "phone" ? 0.55 * 844 : 200) && Math.abs(after.h - before.h) < 2, { before: Math.round(before.h), after: Math.round(after.h) });
      ok("listing (" + label + "): the frame carries the listing id and opens on the cover room", before.id === ID && !!before.room && after.src.indexOf("#/tour/" + before.room) > 0 && after.fits, { room: before.room, src: after.src });
      const f = page.frames().find((x) => /billy360\/\?site=/.test(x.url()));
      if (f) {
        await ready(f, 120000).catch(() => {});
        const inFrame = await f.evaluate(() => ({ view: (document.querySelector(".view.is-active") || {}).id, room: (document.querySelector("#roomName") || {}).textContent, poster: !!document.querySelector("#poster") }));
        ok("listing (" + label + "): the framed viewer opens on the panorama behind its poster", inFrame.view === "viewTour" && !!inFrame.room && inFrame.poster, inFrame);
      } else ok("listing (" + label + "): the framed viewer opens on the panorama behind its poster", false, "no frame");
      ok("listing (" + label + "): no page errors", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");
      await page.screenshot({ path: path.join(OUT, "listing-" + label + ".png") });
      await ctx.close();
    }

    /* the pretty link on the Megacity host */
    {
      const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } });
      await offline(ctx);
      const page = await ctx.newPage(); const errs = watch(page);
      const seen = [];
      await routeMegacityHost(page, seen);
      await page.goto("http://" + HOST + "/tour/" + ID, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.BILLY360_STORE && window.BILLY360App, null, { timeout: 60000 }).catch(() => {});
      await sleep(2000);
      const st = await page.evaluate(() => ({ href: location.href, mode: window.BILLY360_STORE.mode, listing: window.BILLY360_STORE.listingId,
        title: document.title, rooms: (window.BILLY360App.tour() || { rooms: [] }).rooms.length, blocked: !!document.querySelector("#storeBlocked"),
        canonical: (document.querySelector('link[rel=canonical]') || {}).href, robots: (document.querySelector('meta[name=robots]') || {}).content }));
      ok("/tour/<id> boots the viewer in public mode with the live tour", st.mode === "public" && st.listing === ID && st.rooms > 0 && !st.blocked, st);
      /* the served head is the listing's (billy360-api.mjs checks that); once the
         viewer boots it takes the title over, per room */
      ok("/tour/<id> keeps its own address, stays noindex and titles itself per room",
         new RegExp("/tour/" + ID + "(#|$)").test(st.href) && st.href.indexOf("?site=") < 0 && / · /.test(st.title) && /noindex/.test(st.robots || "") &&
         /^https:\/\//.test(st.canonical || ""), { href: st.href, title: st.title, robots: st.robots, canonical: st.canonical });
      ok("/tour/<id> loads the viewer's files from /billy360/, not from under /tour/", seen.filter((p) => /^\/tour\/[^?]+\.(js|css)/.test(p)).length === 0 && seen.some((p) => /^\/billy360\/app\.js/.test(p)), seen.slice(0, 10).join(" "));
      ok("/tour/<id>: no page errors", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");
      await page.screenshot({ path: path.join(OUT, "tour-pretty-link.png") });
      await ctx.close();
    }
  }

  /* ── (h) two degraded cases: a poll landing mid-keystroke, a shell with no sync.js ── */
  if (OFFICE_ONLY.indexOf("h") >= 0) {
    await resetTour(true);
    const ctx = await br.newContext(DESKTOP);
    await offline(ctx); await withCookie(ctx);
    const page = await ctx.newPage(); const errs = watch(page);
    await bootOffice(page, "#/studio/rooms");
    /* a colleague saves, the parent's poll says a newer version exists, and
       Walid types while the GET that fetches it is still out */
    const s0 = await serverTour();
    const theirs = JSON.parse(JSON.stringify(s0.tour));
    theirs.rooms[0].name = "Their copy";
    await wapi("PUT", "/api/studio/tours/" + ID, { tour: theirs, version: s0.version, health: 90 });
    const newVersion = (await serverTour()).version;
    await page.route("**/api/studio/tours/" + ID, async (r) => { if (r.request().method() === "GET") await sleep(1000); return r.continue(); });
    await page.evaluate((v) => {
      window.postMessage({ source: "billy360", type: "billy360:status", version: v, status: "draft" }, location.origin);
      setTimeout(() => {
        const f = [...document.querySelectorAll("#studioBody .field")].find((x) => x.firstChild && x.firstChild.textContent.trim() === "Name");
        const inp = f && f.querySelector("input");
        if (!inp) return;
        inp.value = "Typed during the poll";
        inp.dispatchEvent(new Event("input", { bubbles: true }));
      }, 150);
    }, newVersion);
    await sleep(2500);
    const kept = await page.evaluate(() => window.BILLY360App.tour().rooms[0].name);
    ok("a poll landing mid-keystroke does not overwrite what is being typed", kept === "Typed during the poll", kept);
    const landed = await waitPill(page, /^(Saved|Changes not live)$/, 40000);
    ok("and the typing goes up on top of their version", landed && (await serverTour()).tour.rooms[0].name === "Typed during the poll", (await serverTour()).tour.rooms[0].name);
    await page.unroute("**/api/studio/tours/" + ID);
    ok("no page errors around the poll", errs.length === 0, errs.slice(0, 3).join(" | ") || "none");
    await page.close(); await ctx.close();

    /* a part-deployed shell: sync.js 404s. Saving already falls back to one
       plain PUT — Publish has to say why rather than throw past every catch */
    const ctx2 = await br.newContext(DESKTOP);
    await offline(ctx2); await withCookie(ctx2);
    await ctx2.route("**/billy360/sync.js*", (r) => r.fulfill({ status: 404, contentType: "application/javascript", body: "" }));
    const p2 = await ctx2.newPage(); const errs2 = watch(p2);
    await p2.goto(W + "/billy360/?site=" + ID + "&office=1#/studio/rooms", { waitUntil: "domcontentloaded" });
    await p2.waitForFunction(() => window.BILLY360App && window.BILLY360App.tour(), null, { timeout: 60000 });
    await sleep(600);
    const shell = await p2.evaluate(() => ({ lib: !!window.BILLY360Sync, queue: !!window.BILLY360App.sync() }));
    const pub = await p2.evaluate(() => window.BILLY360App.publish().then((j) => ({ ok: j.ok, problems: j.problems }), (e) => ({ threw: String((e && e.message) || e) })));
    const btns = await p2.evaluate(() => ({ disabled: [...document.querySelectorAll("[data-golive]")].map((b) => b.disabled), toast: (document.querySelector("#toast") || {}).textContent || "" }));
    ok("Publish on a shell without sync.js reports a problem instead of throwing",
       !shell.lib && !shell.queue && pub.ok === false && !pub.threw && /reload the page/i.test((pub.problems || []).join(" ")), { shell, pub });
    ok("and it leaves the Publish buttons usable", btns.disabled.every((d) => d === false) && /reload the page/i.test(btns.toast), btns);
    ok("no page errors on a shell without sync.js", errs2.length === 0, errs2.slice(0, 3).join(" | ") || "none");
    await p2.close(); await ctx2.close();
  }
}

/* @@SECTIONS@@ */

/* ══ runner ════════════════════════════════════════════════════════════ */
const REGISTRY = {
  demo: { fn: () => sectionDemo, needs: "static" },
  public: { fn: () => sectionPublic, needs: "static" },
  embed: { fn: () => sectionEmbed, needs: "static" },
  devices: { fn: () => sectionDevices, needs: "static" },
  engine: { fn: () => sectionEngine, needs: "static" },
  office: { fn: () => sectionOffice, needs: "wrangler" },
  data: { fn: () => sectionData, needs: "static" }
};
async function up(base) { try { const r = await fetch(base + "/billy360/", { redirect: "manual" }); return r.status < 500; } catch (e) { return false; } }

(async () => {
  try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
  const haveStatic = await up(S);
  const needsWrangler = WANT.some((n) => REGISTRY[n].needs === "wrangler");
  const haveWrangler = needsWrangler ? await up(W) : true;
  if (!haveStatic) { console.error("no static server on " + S + " — run:  (cd " + ROOT + " && python3 -m http.server " + STATIC_PORT + ")"); process.exit(2); }
  if (!haveWrangler) { console.error("no wrangler dev on " + W + " — start it with the megacity bindings, or run with --only=demo,public,embed,devices,engine,data"); process.exit(2); }
  const br = await launch();
  for (const name of ORDER) {
    if (WANT.indexOf(name) < 0) continue;
    section(name);
    try { await REGISTRY[name].fn()(br); }
    catch (e) { ok(name + ": section crashed", false, (e && e.stack ? e.stack : String(e)).split("\n").slice(0, 3).join(" ⏎ ")); }
    cur.ms = Date.now() - cur.t0;
  }
  await br.close();

  const w = Math.max(9, ...SECTIONS.map((s) => s.name.length));
  const pad = (s, n) => (s + "                    ").slice(0, n);
  console.log("\n┌" + "─".repeat(w + 2) + "┬───────┬───────┬───────┬────────┐");
  console.log("│ " + pad("section", w) + " │  pass │  fail │  skip │   time │");
  console.log("├" + "─".repeat(w + 2) + "┼───────┼───────┼───────┼────────┤");
  let P = 0, F = 0, K = 0;
  SECTIONS.forEach((s) => {
    P += s.pass; F += s.fail; K += s.skip;
    console.log("│ " + pad(s.name, w) + " │ " + String(s.pass).padStart(5) + " │ " + String(s.fail).padStart(5) + " │ " + String(s.skip).padStart(5) + " │ " + (((s.ms || 0) / 1000).toFixed(1) + "s").padStart(6) + " │");
  });
  console.log("├" + "─".repeat(w + 2) + "┼───────┼───────┼───────┼────────┤");
  console.log("│ " + pad("total", w) + " │ " + String(P).padStart(5) + " │ " + String(F).padStart(5) + " │ " + String(K).padStart(5) + " │        │");
  console.log("└" + "─".repeat(w + 2) + "┴───────┴───────┴───────┴────────┘");
  if (F) { console.log("\nfailures:"); SECTIONS.forEach((s) => s.notes.forEach((n) => console.log("  " + s.name + " · " + n))); }
  console.log(F ? "\nBILLY360 TEST: " + F + " FAILURE(S)" : "\nBILLY360 TEST: ALL PASS (" + P + " checks)");
  process.exit(F ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });

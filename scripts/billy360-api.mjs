#!/usr/bin/env node
/* billy360 Worker contract check — the 360 half of the Megacity API.
 *
 *   node scripts/billy360-api.mjs --base=http://localhost:8972
 *   node scripts/billy360-api.mjs --base=http://localhost:8972 --host=www.megacityproperties.co.uk
 *
 * Runs against a wrangler dev with the megacity bindings and migrations
 * 0003 + 0004 applied. It signs in as the Studio user, creates and deletes a
 * scratch listing and rewrites the tour of --listing (ladywell-point by
 * default), so point it at a dev database, never production.
 * Exits non-zero on any failed check.
 */
const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find((a) => a === "--" + n || a.startsWith("--" + n + "=")); return h ? (h.indexOf("=") > 0 ? h.slice(h.indexOf("=") + 1) : true) : d; };
const BASE = String(arg("base", process.env.BILLY360_BASE || "http://localhost:8972")).replace(/\/$/, "");
const HOST = String(arg("host", process.env.MEGACITY_HOST || "www.megacityproperties.co.uk"));
const ID = String(arg("listing", process.env.MEGACITY_LISTING || "ladywell-point"));
const EMAIL = process.env.STUDIO_EMAIL || "walid@example.com";
const PASSWORD = process.env.STUDIO_PASSWORD || "correct-horse-battery";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SMALL = path.join(ROOT, "billy360/panos/cabin.jpg");
const PANO = path.join(ROOT, "billy360/panos/church_meeting_room.jpg");
process.env.NO_PROXY = process.env.NO_PROXY || "localhost,127.0.0.1";

/* ── results ───────────────────────────────────────────────────────────── */
const GROUPS = [];
let g = null;
const group = (name) => { g = { name, pass: 0, fail: 0, notes: [] }; GROUPS.push(g); console.log("\n══ " + name + " ═══════════════════════════════"); };
function t(name, cond, info) {
  const extra = info === undefined ? "" : "  [" + String(typeof info === "string" ? info : JSON.stringify(info)).slice(0, 500) + "]";
  console.log((cond ? "PASS " : "FAIL ") + name + extra);
  if (cond) g.pass++; else { g.fail++; g.notes.push(name + extra); }
  return !!cond;
}

/* ── HTTP ──────────────────────────────────────────────────────────────── */
let COOKIE = "";
async function raw(method, p, { body, cookie = true, host, headers = {} } = {}) {
  const h = Object.assign({ "X-Studio": "1", Origin: BASE }, headers);
  if (cookie && COOKIE) h.Cookie = COOKIE;
  if (host) h.Host = host;
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm && !h["content-type"]) h["content-type"] = "application/json";
  const r = await fetch(BASE + p, { method, headers: h, body: body === undefined ? undefined : isForm ? body : JSON.stringify(body), redirect: "manual" });
  const text = await r.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch (e) {}
  return { status: r.status, headers: r.headers, json, text, location: r.headers.get("location") };
}
const api = (m, p, body) => raw(m, p, { body });
/* fetch() refuses to send a Host header, so the client-host checks go through curl */
import { spawnSync } from "node:child_process";
function curl(method, p, host) {
  const r = spawnSync("curl", ["-s", "-D", "-", "-X", method, "-H", "Host: " + host, BASE + p],
    { encoding: "buffer", env: Object.assign({}, process.env, { NO_PROXY: "localhost,127.0.0.1" }), maxBuffer: 64 * 1024 * 1024 });
  const out = r.stdout || Buffer.alloc(0);
  const sep = out.indexOf("\r\n\r\n");
  const head = sep < 0 ? out.toString("latin1") : out.slice(0, sep).toString("latin1");
  const text = sep < 0 ? "" : out.slice(sep + 4).toString("utf8");
  const lines = head.split("\r\n");
  const headers = new Map();
  lines.slice(1).forEach((l) => { const i = l.indexOf(":"); if (i > 0) headers.set(l.slice(0, i).toLowerCase(), l.slice(i + 1).trim()); });
  return { status: Number((lines[0] || "").split(" ")[1] || 0), text, location: headers.get("location") || null,
           headers: { get: (k) => headers.get(String(k).toLowerCase()) || null } };
}
const file = (p, type) => new File([fs.readFileSync(p)], p.split("/").pop(), { type });

async function upload(listingId, meta, parts) {
  const fd = new FormData();
  fd.append("meta", JSON.stringify(meta));
  for (const [k, [p, type, name]] of Object.entries(parts)) fd.append(k, file(p, type), name);
  return raw("POST", "/api/studio/media?listingId=" + listingId, { body: fd });
}
const panoParts = { orig: [PANO, "image/jpeg", "upload.jpg"], large: [SMALL, "image/jpeg", "w1600.jpg"], thumb: [SMALL, "image/jpeg", "w480.jpg"], pano2048: [SMALL, "image/jpeg", "pano2048.jpg"] };

const PLAN_IN =
  '<svg viewBox="0 0 120 80"><script>window.x=1</script><style>rect{fill:red}</style>' +
  '<g class="fp-geo"><rect class="fp-out" x="6" y="6" width="108" height="68" rx="2" onclick="alert(1)"/>' +
  '<path d="M6 6 L114 6" stroke="#fff" stroke-width="1"/><text class="fp-lb" x="9" y="11">HALL</text>' +
  '<image href="/media/l1/plan/w1600.jpg" x="0" y="0" width="120" height="80"/>' +
  '<image href="https://evil.example/x.png" width="10" height="10"/>' +
  '<a href="javascript:alert(1)"><text x="1" y="1">LINK</text></a>' +
  '<use href="#x"/><foreignObject width="10" height="10"><b>no</b></foreignObject>' +
  '<animate attributeName="x" to="9"/><!-- comment --></g></svg>';

(async () => {
  /* ── 1 · sign in ─────────────────────────────────────────────────────── */
  group("session");
  {
    const anon = await raw("GET", "/api/studio/tours/" + ID, { cookie: false });
    t("the tours API refuses an anonymous caller", anon.status === 401 || anon.status === 403, anon.status);
    const bad = await raw("POST", "/api/studio/auth/login", { body: { email: EMAIL, password: "not-the-password" }, cookie: false });
    t("a wrong password is refused", bad.status === 401 || bad.status === 400 || bad.status === 429, bad.status);
    let login = null;
    for (let i = 0; i < 6; i++) {
      login = await raw("POST", "/api/studio/auth/login", { body: { email: EMAIL, password: PASSWORD }, cookie: false });
      if (login.status !== 429) break;
      await new Promise((r) => setTimeout(r, 30000));
    }
    COOKIE = (login.headers.get("set-cookie") || "").split(";")[0];
    t("the Studio password signs in and sets the session cookie", login.status === 200 && /^__Host-mc_studio=/.test(COOKIE), { status: login.status, cookie: COOKIE.split("=")[0] });
    if (!COOKIE) { console.error("cannot continue without a session"); process.exit(2); }
  }

  /* ── 2 · the tour resource ───────────────────────────────────────────── */
  let version = 0;
  group("tours: shape, validation, sanitiser");
  {
    await api("DELETE", "/api/studio/tours/" + ID);
    const created = await api("POST", "/api/studio/tours/" + ID, {});
    t("a tour can be created from the listing", created.status === 200 || created.status === 201, created.status);
    const get = await api("GET", "/api/studio/tours/" + ID);
    const j = get.json || {};
    const keys = ["tour", "version", "status", "health", "liveVersion", "listingLive", "gate", "publicUrl", "embedOrigin"];
    t("GET returns the whole summary", get.status === 200 && keys.every((k) => k in j), keys.filter((k) => !(k in j)).join(",") || "all present");
    t("the brand is Megacity's, with the listing as its credit", j.tour && j.tour.brand && j.tour.brand.name === "Megacity Properties" && j.tour.brand.accent === "#2b7fff" && /^https?:\/\//.test(j.tour.brand.creditHref || ""), j.tour && j.tour.brand);
    t("the agent block comes from the Studio settings", !!(j.tour && j.tour.project && j.tour.project.agent && j.tour.project.agent.name), j.tour && j.tour.project && j.tour.project.agent);
    t("publicUrl and embedOrigin are absolute", /^https?:\/\//.test(j.publicUrl || "") && /^https?:\/\//.test(j.embedOrigin || ""), { publicUrl: j.publicUrl, embedOrigin: j.embedOrigin });
    t("a fresh tour is a draft with no live version", j.status === "draft" && j.liveVersion === null, { status: j.status, liveVersion: j.liveVersion });
    version = j.version;

    const tour = j.tour;
    const stale = await api("PUT", "/api/studio/tours/" + ID, { tour, version: version - 1, health: 50 });
    t("a PUT with a stale version is refused with 409", stale.status === 409, stale.status);

    const badId = JSON.parse(JSON.stringify(tour));
    badId.rooms[0].id = 'x"onload';
    t("a room id outside the server's rule is refused with 400", (await api("PUT", "/api/studio/tours/" + ID, { tour: badId, version, health: 50 })).status === 400);
    const badTo = JSON.parse(JSON.stringify(tour));
    if (badTo.rooms[0].hotspots && badTo.rooms[0].hotspots[0]) badTo.rooms[0].hotspots[0].to = "../etc";
    t("a hotspot pointing at a bad id is refused with 400", (await api("PUT", "/api/studio/tours/" + ID, { tour: badTo, version, health: 50 })).status === 400);
    const dataPlan = JSON.parse(JSON.stringify(tour));
    dataPlan.floors[0].plan = '<image href="data:image/png;base64,iVBORw0KGgo=" width="10" height="10"/>';
    const big = await api("PUT", "/api/studio/tours/" + ID, { tour: dataPlan, version, health: 50 });
    t("a data: URI inside a floor plan is refused with 413", big.status === 413 && /floors/.test(JSON.stringify(big.json || {})), { status: big.status, body: big.json });

    const planned = JSON.parse(JSON.stringify(tour));
    planned.floors[0].plan = PLAN_IN;
    planned.brand = Object.assign({}, planned.brand, { creditHref: "javascript:alert(1)" });
    if (planned.rooms[0].hotspots && planned.rooms[0].hotspots[0]) planned.rooms[0].hotspots[0].href = "javascript:alert(1)";
    const put = await api("PUT", "/api/studio/tours/" + ID, { tour: planned, version, health: 90 });
    t("a PUT with a sanitisable plan is accepted", put.status === 200, { status: put.status, body: put.json });
    version = put.json ? put.json.version : version;
    const back = (await api("GET", "/api/studio/tours/" + ID)).json;
    const plan = (back.tour.floors[0].plan || "");
    t("the sanitiser drops script, style, on*, <a>, <use>, foreignObject, animate and comments",
      !/<script|<style|onclick|<a[ >]|<use|foreignObject|<animate|<!--/.test(plan), plan.slice(0, 200));
    t("it keeps the geometry and only /media/ images", /<rect/.test(plan) && /<path/.test(plan) && /<text/.test(plan) && plan.indexOf("/media/l1/plan/w1600.jpg") > 0 && plan.indexOf("evil.example") < 0, plan.slice(0, 300));
    t("a javascript: credit link is dropped", !/javascript:/.test(JSON.stringify(back.tour)), (back.tour.brand || {}).creditHref);
    /* the sanitiser fixture points at a /media/ file that does not exist — take it
       back out before anything publishes this tour to real visitors */
    const clean = back.tour;
    clean.floors.forEach((f) => { f.plan = ""; });
    const tidy = await api("PUT", "/api/studio/tours/" + ID, { tour: clean, version: back.version, health: 90 });
    t("the sanitiser fixture is cleaned out again", tidy.status === 200 && !/\/media\/l1\/plan/.test(JSON.stringify((await api("GET", "/api/studio/tours/" + ID)).json.tour)), tidy.status);
    version = tidy.json ? tidy.json.version : version;
  }

  /* ── 3 · publish, unpublish and what the public sees ─────────────────── */
  group("publish and the public tour");
  {
    /* the gate wants a real capture in every room */
    const up = await upload(ID, { listingId: ID, roomLabel: "Hall", alt: "", width: 4096, height: 2048, isPano: true, role: "tour", panoIsOrig: true }, panoParts);
    const um = (up.json && (up.json.media || up.json)) || {};
    const cur = await api("GET", "/api/studio/tours/" + ID);
    const withPanos = cur.json.tour;
    withPanos.rooms.forEach((r, i) => { r.pano = um.pano; r.thumb = um.thumb; r.description = "A bright " + r.name.toLowerCase() + "."; r.plan = [20 + (i % 8) * 10, 30]; });
    const armed = await api("PUT", "/api/studio/tours/" + ID, { tour: withPanos, version: cur.json.version, health: 92 });
    t("the tour can be filled with real panoramas", armed.status === 200 && /pano/.test(um.pano || ""), { status: armed.status, pano: um.pano });
    /* the gate reads the stored score, never the body */
    await api("PUT", "/api/studio/settings", { tourGateScore: 100 });
    const refused = await api("POST", "/api/studio/tours/" + ID + "/publish", { health: 100 });
    t("the gate uses the stored score, not the number in the request", refused.json && refused.json.ok === false && (refused.json.problems || []).length > 0, refused.json && refused.json.problems);
    await api("PUT", "/api/studio/settings", { tourGateScore: 1 });
    await api("POST", "/api/studio/listings/" + ID + "/publish", {});
    const pub = await api("POST", "/api/studio/tours/" + ID + "/publish", {});
    const p = pub.json || {};
    t("publish answers with the status, versions and links", pub.status === 200 && p.ok === true && p.status === "live" && p.liveVersion === p.version && (p.problems || []).length === 0, p);
    t("publishing a live listing reports listingLive", p.listingLive === true, { listingLive: p.listingLive, note: p.note });
    const sum = (await api("GET", "/api/studio/tours/" + ID)).json;
    t("the draft is written back visible, at the same version", sum.tour.project.hidden === false && sum.liveVersion === sum.version && sum.status === "live", { hidden: sum.tour.project.hidden, v: sum.version, live: sum.liveVersion });
    const firstLiveAt = sum.liveAt;
    const again = await api("POST", "/api/studio/tours/" + ID + "/publish", {});
    t("a second publish keeps the first live_at", again.json && again.json.ok && (await api("GET", "/api/studio/tours/" + ID)).json.liveAt === firstLiveAt, { first: firstLiveAt, now: again.json && again.json.liveAt });

    const pubJson = await raw("GET", "/api/public/tours/" + ID, { cookie: false });
    t("the public tour is served with a revalidating cache header", pubJson.status === 200 && /max-age=0/.test(pubJson.headers.get("cache-control") || "") && /stale-while-revalidate=60/.test(pubJson.headers.get("cache-control") || ""), pubJson.headers.get("cache-control"));
    const pt = pubJson.json || {};
    t("the public JSON carries Megacity's brand and the listing's facts", pt.brand && pt.brand.name === "Megacity Properties" && !!pt.project && !!pt.project.name && pt.project.hidden === false, { brand: pt.brand && pt.brand.name, name: pt.project && pt.project.name });
    t("the public JSON has an agent and no data: URLs", !!(pt.project && pt.project.agent && pt.project.agent.name) && JSON.stringify(pt).indexOf("data:image") < 0, pt.project && pt.project.agent && pt.project.agent.name);
    t("the manifest lists the live tour", (await raw("GET", "/api/public/tours", { cookie: false })).json.items.some((i) => i.id === ID));

    const un = await api("POST", "/api/studio/tours/" + ID + "/unpublish", {});
    t("unpublish puts it back to draft and clears live_at", un.status === 200 && (await api("GET", "/api/studio/tours/" + ID)).json.liveAt === null, un.json);
    const gone = await raw("GET", "/api/public/tours/" + ID, { cookie: false });
    t("the public tour is then 404, no-store, with a way back to the listing",
      gone.status === 404 && /no-store/.test(gone.headers.get("cache-control") || "") && /^(\/|https:\/\/)/.test((gone.json || {}).listingUrl || ""), { cc: gone.headers.get("cache-control"), body: gone.json });
    const unknown = await raw("GET", "/api/public/tours/no-such-listing", { cookie: false });
    t("an unknown listing answers the same way", unknown.status === 404 && /no-store/.test(unknown.headers.get("cache-control") || ""), unknown.status);
    /* leave it live for the page checks below */
    await api("POST", "/api/studio/tours/" + ID + "/publish", {});
    await api("PUT", "/api/studio/settings", { tourGateScore: 70 });
  }

  /* ── 4 · media: the panorama ladder, roles, covers, deletes, originals ─ */
  group("media");
  const scratch = "d1-media-" + Date.now().toString(36);
  {
    const mk = await api("POST", "/api/studio/listings", { id: scratch, title: "D1 media scratch", area: "salford", bedrooms: 1, rent_pcm: 500 });
    t("a scratch listing can be created", mk.status === 200 || mk.status === 201, mk.status);
    const lid = (mk.json && (mk.json.id || (mk.json.listing || {}).id)) || scratch;

    const pano = await upload(lid, { listingId: lid, roomLabel: "Hall", alt: "", width: 4096, height: 2048, isPano: true, role: "tour", panoIsOrig: true }, panoParts);
    const pm = (pano.json && (pano.json.media || pano.json)) || {};
    t("a panorama uploads as kind pano, role tour", pano.status === 201 && pm.kind === "pano" && pm.role === "tour", { status: pano.status, kind: pm.kind, role: pm.role });
    t("the response carries pano4096 and pano2048", /pano4096\.jpg$/.test(pm.pano || "") && /pano2048\.jpg$/.test(pm.pano2048 || ""), { pano: pm.pano, pano2048: pm.pano2048 });
    t("both derivatives are really in the bucket", (await raw("HEAD", pm.pano, { cookie: false })).status === 200 && (await raw("HEAD", pm.pano2048, { cookie: false })).status === 200);
    t("a tour panorama never makes the listing live", pm.listingWentLive !== true, pm.listingWentLive);
    t("the upload reports the listing's new timestamp", typeof pm.listingUpdatedAt === "string" && /^\d{4}-/.test(pm.listingUpdatedAt), pm.listingUpdatedAt);

    const logo = await upload(lid, { listingId: lid, alt: "logo", width: 512, height: 512, role: "logo" }, { orig: [SMALL, "image/png", "upload.png"], large: [SMALL, "image/jpeg", "w1600.jpg"], thumb: [SMALL, "image/jpeg", "w480.jpg"] });
    t("a brand logo uploads with role logo", logo.status === 201 && ((logo.json.media || logo.json).role === "logo"), logo.status);
    const plan = await upload(lid, { listingId: lid, alt: "plan", width: 2000, height: 1400, role: "floorplan" }, { orig: [SMALL, "image/jpeg", "upload.jpg"], large: [SMALL, "image/jpeg", "w1600.jpg"], thumb: [SMALL, "image/jpeg", "w480.jpg"] });
    t("a raster floor plan uploads with role floorplan", plan.status === 201 && ((plan.json.media || plan.json).role === "floorplan"), plan.status);
    const l1 = await api("GET", "/api/studio/listings/" + lid);
    t("none of them became the listing's cover", !l1.json.coverMediaId && !l1.json.cover_media_id, { cover: l1.json.coverMediaId || l1.json.cover_media_id });
    const blocked = await api("POST", "/api/studio/listings/" + lid + "/publish", {});
    t("a listing with only a panorama still cannot go live", blocked.json && blocked.json.ok === false && /photo/i.test((blocked.json.problems || []).join(" ")), blocked.json && blocked.json.problems);

    const photo = await upload(lid, { listingId: lid, alt: "front", width: 1600, height: 1067, role: "gallery" }, { orig: [SMALL, "image/jpeg", "upload.jpg"], large: [SMALL, "image/jpeg", "w1600.jpg"], thumb: [SMALL, "image/jpeg", "w480.jpg"] });
    const phm = photo.json.media || photo.json;
    t("a real photograph uploads as kind photo", photo.status === 201 && phm.kind === "photo", phm.kind);
    const l2 = await api("GET", "/api/studio/listings/" + lid);
    t("the photograph, not the panorama, becomes the cover", (l2.json.coverMediaId || l2.json.cover_media_id) === phm.id, { cover: l2.json.coverMediaId || l2.json.cover_media_id, photo: phm.id });

    /* image originals are behind the Studio session; the logo and the web sizes are not */
    t("an image original is refused without the Studio cookie", (await raw("GET", pm.orig || (pm.url || "").replace(/w1600\.jpg$/, "orig.jpg"), { cookie: false })).status === 403, pm.orig);
    const withCookie = await raw("GET", pm.orig);
    t("the same original opens with the cookie, marked private", withCookie.status === 200 && /private/.test(withCookie.headers.get("cache-control") || ""), { status: withCookie.status, cc: withCookie.headers.get("cache-control") });
    const lm = logo.json.media || logo.json;
    t("the brand logo's original stays public", (await raw("GET", lm.orig, { cookie: false })).status === 200, lm.orig);
    t("the web sizes stay public", (await raw("GET", pm.pano2048, { cookie: false })).status === 200 && (await raw("GET", phm.thumb, { cookie: false })).status === 200);

    /* a picture the tour is using cannot be deleted by accident */
    await api("POST", "/api/studio/tours/" + lid, {});
    const st = await api("GET", "/api/studio/tours/" + lid);
    const tt = st.json.tour;
    tt.rooms[0].pano = pm.pano; tt.rooms[0].thumb = pm.thumb;
    tt.brand = Object.assign({}, tt.brand, { logo: lm.orig });
    const savedTour = await api("PUT", "/api/studio/tours/" + lid, { tour: tt, version: st.json.version, health: 60 });
    t("the tour can point at the uploaded panorama and logo", savedTour.status === 200, savedTour.status);
    const delPano = await api("DELETE", "/api/studio/media/" + pm.id);
    t("deleting a panorama the tour uses is refused with 409 and names the room", delPano.status === 409 && /room/i.test((delPano.json || {}).error || ""), delPano.json);
    const delLogo = await api("DELETE", "/api/studio/media/" + lm.id);
    t("deleting the logo the tour uses is refused too", delLogo.status === 409, delLogo.json);
    t("the refused delete left the file in place", (await raw("GET", pm.pano2048, { cookie: false })).status === 200);
    const spare = await upload(lid, { listingId: lid, roomLabel: "Spare", alt: "", width: 4096, height: 2048, isPano: true, role: "tour", panoIsOrig: true }, panoParts);
    const sp = spare.json.media || spare.json;
    const delSpare = await api("DELETE", "/api/studio/media/" + sp.id);
    t("an unreferenced panorama deletes, and its derivatives go with it", delSpare.status === 200 && (await raw("GET", sp.pano2048, { cookie: false })).status === 404, { del: delSpare.status });
  }

  /* ── 5 · leads ───────────────────────────────────────────────────────── */
  group("leads");
  {
    const lead = await raw("POST", "/api/public/lead", { cookie: false, body: {
      name: "D1 Contract", email: "d1@example.com", phone: "", message: "", site: ID, listingId: ID,
      room: "hall", roomName: "Hallway", source: "tour", property: "Ladywell Point" } });
    t("a lead from inside the tour is accepted", lead.status === 200 || lead.status === 201 || lead.status === 204, lead.status);
    const rows = await api("GET", "/api/studio/enquiries");
    const items = (rows.json && (rows.json.items || rows.json)) || [];
    const mine = items.filter && items.filter((e) => e.email === "d1@example.com")[0];
    t("it lands in the Studio's enquiries with source 'tour'", !!mine && mine.source === "tour", mine && { source: mine.source, listing: mine.listing_id || mine.listingId });
  }

  /* ── 6 · the pages a visitor can open ────────────────────────────────── */
  group("viewer pages and frame headers");
  {
    const viewer = await raw("GET", "/billy360/?site=" + ID, { cookie: false });
    t("the viewer page is served for a live tour", viewer.status === 200 && /<html/i.test(viewer.text), viewer.status);
    t("its head is the listing's: title, description, og and canonical", /360° tour · Megacity Properties<\/title>/.test(viewer.text) && /og:image/.test(viewer.text) && /rel="canonical"/.test(viewer.text), (viewer.text.match(/<title>[^<]*<\/title>/) || [])[0]);
    t("it stays out of the index", /name="robots"[^>]*noindex/.test(viewer.text));
    t("it can be framed by the listing pages", !viewer.headers.get("x-frame-options") && /frame-ancestors/.test(viewer.headers.get("content-security-policy") || ""), { xfo: viewer.headers.get("x-frame-options"), csp: (viewer.headers.get("content-security-policy") || "").slice(0, 80) });
    const asset = await raw("GET", "/billy360/app.js", { cookie: false });
    t("the viewer's own assets are framable too", asset.status === 200 && !asset.headers.get("x-frame-options") && /frame-ancestors/.test(asset.headers.get("content-security-policy") || ""), { xfo: asset.headers.get("x-frame-options") });
    const embed = await raw("GET", "/billy360/embed.js", { cookie: false });
    t("embed.js is served", embed.status === 200 && /billy360/i.test(embed.text), embed.status);
    const studio = await raw("GET", "/templates/megacity-studio", { cookie: false });
    t("the Studio itself keeps X-Frame-Options", /SAMEORIGIN/i.test(studio.headers.get("x-frame-options") || ""), studio.headers.get("x-frame-options"));
    const unknown = await raw("GET", "/billy360/?site=no-such-listing", { cookie: false });
    t("an unknown id still serves the viewer, which shows its own card", unknown.status === 200 && !/360° tour · Megacity Properties<\/title>/.test(unknown.text), unknown.status);

    /* the pretty link on the client host */
    const pretty = curl("GET", "/tour/" + ID, HOST);
    t("/tour/<id> serves the viewer on the Megacity host", pretty.status === 200 && /<html/i.test(pretty.text) && /360° tour/.test(pretty.text), pretty.status);
    t("/tour/<id> hands the listing id to the viewer and makes its scripts absolute",
      /window\.BILLY360_SITE\s*=\s*"?'?/.test(pretty.text) && /src="\/billy360\/[a-z]+\.js/.test(pretty.text) && !/history\.replaceState/.test(pretty.text),
      (pretty.text.match(/window\.BILLY360_SITE[^<]*/) || [])[0]);
    t("/tour/<id> points canonical at the listing page", new RegExp('rel="canonical" href="https://' + HOST.replace(/\./g, "\\.") + '/let/' + ID).test(pretty.text), (pretty.text.match(/rel="canonical"[^>]*/) || [])[0]);
    t("/tour/<id> is framable and noindex", !pretty.headers.get("x-frame-options") && /frame-ancestors/.test(pretty.headers.get("content-security-policy") || "") && /noindex/.test(pretty.text));
    const tidy = curl("GET", "/Tour/" + ID.toUpperCase() + "/", HOST);
    t("a sloppy /Tour/<ID>/ redirects to the tidy address", tidy.status === 301 && /\/tour\//.test(tidy.location || ""), { status: tidy.status, to: tidy.location });
    const robots = curl("GET", "/robots.txt", HOST);
    t("robots.txt keeps crawlers out of /tour/ and /billy360/", /Disallow: \/tour\//.test(robots.text) && /Disallow: \/billy360\//.test(robots.text), robots.text.split("\n").filter((l) => /Disallow/.test(l)).join(" | "));
    const listing = curl("GET", "/let/" + ID, HOST);
    t("the listing page carries the tour frame with its cover room", new RegExp('data-billy360="' + ID + '"').test(listing.text) && /data-room="[^"]+"/.test(listing.text), (listing.text.match(/data-billy360="[^"]*"[^>]*/) || [])[0]);
  }

  /* tidy up the scratch listing */
  await api("DELETE", "/api/studio/listings/" + scratch).catch(() => {});

  /* ── report ──────────────────────────────────────────────────────────── */
  const w = Math.max(10, ...GROUPS.map((x) => x.name.length));
  const pad = (s, n) => (s + " ".repeat(n)).slice(0, n);
  console.log("\n┌" + "─".repeat(w + 2) + "┬───────┬───────┐");
  console.log("│ " + pad("group", w) + " │  pass │  fail │");
  console.log("├" + "─".repeat(w + 2) + "┼───────┼───────┤");
  let P = 0, F = 0;
  GROUPS.forEach((x) => { P += x.pass; F += x.fail; console.log("│ " + pad(x.name, w) + " │ " + String(x.pass).padStart(5) + " │ " + String(x.fail).padStart(5) + " │"); });
  console.log("├" + "─".repeat(w + 2) + "┼───────┼───────┤");
  console.log("│ " + pad("total", w) + " │ " + String(P).padStart(5) + " │ " + String(F).padStart(5) + " │");
  console.log("└" + "─".repeat(w + 2) + "┴───────┴───────┘");
  if (F) { console.log("\nfailures:"); GROUPS.forEach((x) => x.notes.forEach((n) => console.log("  " + x.name + " · " + n))); }
  console.log(F ? "\nBILLY360 API: " + F + " FAILURE(S)" : "\nBILLY360 API: ALL PASS (" + P + " checks)");
  process.exit(F ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });

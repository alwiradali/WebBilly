/* ═══════════════════════════════════════════════════════════════════════════
   BILLY360 · STORE ADAPTER
   Decides where a tour lives before app.js boots, then loads app.js.

     no ?site                 → legacy: localStorage + the shipped tour files
     ?site=<id>               → public: the live tour from /api/public/tours/<id>
                                and nothing else — a shipped demo of the same id
                                still opens, anything else fails closed
     ?site=<id>&office=1      → Studio: the draft from /api/studio/tours/<id>
                                (needs the Megacity Studio login cookie); saves
                                go back through PUT, images go to R2 first

   app.js asks window.BILLY360_STORE what to do at the handful of places that
   used to touch localStorage. Everything else in the product is unchanged.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var QS = new URLSearchParams(location.search);
  /* a listing id is a slug and nothing else — anything odd is treated as absent */
  /* /tour/<id> on the Megacity host hands the id over as window.BILLY360_SITE instead of ?site= */
  var RAW_SITE = QS.get("site") || QS.get("property") || (typeof window.BILLY360_SITE === "string" ? window.BILLY360_SITE : "");
  var SITE = /^[a-z0-9-]{1,80}$/i.test(RAW_SITE) ? RAW_SITE.toLowerCase() : null;
  var OFFICE = QS.get("office") === "1";
  /* must match the <link rel="preload"> and the store.js tag stamp in index.html */
  var APP = "app.js?v=20260907a";
  /* app.js lives beside this script, not beside the document (/tour/<id> is served from /billy360/);
     document.currentScript is only set while this script runs, so capture it now, not in inject() */
  var BASE = ((document.currentScript && document.currentScript.src) || "").replace(/[^\/]*$/, "");
  var CFG = window.BILLY360_CONFIG || (window.BILLY360_CONFIG = {});
  var PUBLIC_TIMEOUT = 8000;

  function inject() {
    var s = document.createElement("script");
    s.src = BASE + APP;
    document.head.appendChild(s);
  }
  function fnv(str) {
    var h = 0x811c9dc5;
    str = "billy360:" + String(str);
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return ("0000000" + h.toString(16)).slice(-8);
  }
  function shipped(id) {
    var all = window.BILLY360_TOURS || [];
    for (var i = 0; i < all.length; i++) if (all[i] && all[i].id === id) return all[i];
    return null;
  }
  /* outside local mode the viewer only ever knows one project: no portfolio
     grid, no demo palette entries, and PROJECT can only resolve to this id */
  function useOnly(tour) {
    window.BILLY360_TOURS = [tour];
    window.BILLY360_TOUR = tour;
  }
  /* the browser-only Studio is for the shipped demos; on a ?site= link the
     lock stays shut and any remembered token is dropped. (enabled:false would
     mean "no lock" to app.js, so the lock is kept with a hash nothing can
     match — random per load so its session token cannot be precomputed.) */
  function closeAdmin() {
    CFG.admin = { enabled: true, hash: "closed:" + Math.random().toString(36).slice(2), verifyUrl: null, rememberDays: 0, hint: "" };
    try { localStorage.removeItem("billy360:admin"); sessionStorage.removeItem("billy360:admin"); } catch (e) { }
  }
  function forgetLocalCopy(id) {
    try { localStorage.removeItem("billy360:tour:" + id); } catch (e) { }   // never let a stale browser copy shadow the server
  }
  /* the engine picks pano2048 on small canvases — warm the same file it will
     ask for. A preload link is the one form the engine's own <img> request
     is guaranteed to reuse (a detached Image or a fetch downloads twice). */
  function panoCap() {
    /* the engine's rule (engine.js panoCap): four texels per DPR-capped device
       pixel, the 2048 ceiling only on phone-sized canvases, 1024 in low quality */
    var coarse = false;
    try { coarse = window.matchMedia("(pointer:coarse)").matches; } catch (e) { }
    var q = QS.get("q");
    if (q === "lo" || q === "md") return 1024;
    var dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.75 : 2);
    var w = (window.innerWidth || 1024) * dpr, h = (window.innerHeight || 768) * dpr;
    var big = Math.max(w, h) >= 1500;
    var px = Math.max(1, w) * 4;
    var pot = 1024; while (pot * 2 <= px && pot < 4096) pot *= 2;
    return Math.min(pot, coarse && !big ? 2048 : 4096);
  }
  function warmFirstPano(tour) {
    try {
      var rooms = tour.rooms || [], r = null;
      for (var i = 0; i < rooms.length; i++) if (rooms[i] && rooms[i].id === (tour.project && tour.project.cover)) r = rooms[i];
      r = r || rooms[0];
      if (!r || typeof r.pano !== "string" || !r.pano) return;
      var src = r.pano, cap = panoCap();
      if (cap <= 1024) src = src.replace(/\/pano4096\.jpg$/, "/w1600.jpg");
      else if (cap <= 2048) src = src.replace(/\/pano4096\.jpg$/, "/pano2048.jpg");
      [r.thumb, src].forEach(function (u) {
        if (typeof u !== "string" || !u) return;
        var l = document.createElement("link");
        l.rel = "preload"; l.as = "image"; l.crossOrigin = "anonymous";   // must match the engine's request or it is not reused
        l.href = u;
        document.head.appendChild(l);
      });
    } catch (e) { }
  }
  function api(method, path, body, raw) {
    var opts = { method: method, credentials: "same-origin", headers: { "X-Studio": "1" } };
    if (body && !raw) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
    else if (body) opts.body = body;
    return fetch(path, opts).then(function (r) {
      return r.text().then(function (t) {
        var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { }
        if (!r.ok) { var err = new Error((j && j.error) || ("HTTP " + r.status)); err.status = r.status; err.body = j; throw err; }
        return j;
      });
    });
  }
  /* links the server hands back (publicUrl/embedOrigin on the tour GET) */
  function noteLinks(j) {
    if (!j) return;
    if (typeof j.publicUrl === "string" && /^https?:\/\//i.test(j.publicUrl)) STORE.publicUrl = j.publicUrl;
    if (typeof j.embedOrigin === "string" && /^https?:\/\//i.test(j.embedOrigin)) STORE.embedOrigin = j.embedOrigin.replace(/\/+$/, "");
  }

  /* ── image helpers: data URL → blob, blob → resized jpeg ─────────────── */
  function dataUrlToBlob(u) {
    var m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(u);
    if (!m) return null;
    var mime = m[1] || "application/octet-stream";
    var data = m[2] ? atob(m[3]) : decodeURIComponent(m[3]);
    var arr = new Uint8Array(data.length);
    for (var i = 0; i < data.length; i++) arr[i] = data.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }
  /* a JPEG that already fits is passed through untouched (no second lossy
     pass, and the caller can tell because `same` is set) */
  function resized(blob, maxEdge, quality, type) {
    return new Promise(function (res) {
      var url = URL.createObjectURL(blob), im = new Image();
      im.onload = function () {
        var w = im.naturalWidth, h = im.naturalHeight, s = Math.min(1, maxEdge / Math.max(w, h));
        if (s === 1 && !type && blob.type === "image/jpeg") { URL.revokeObjectURL(url); res({ blob: blob, w: w, h: h, same: true }); return; }
        var c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { res({ blob: b || blob, w: w, h: h }); }, type || "image/jpeg", quality);
      };
      im.onerror = function () { URL.revokeObjectURL(url); res({ blob: blob, w: 0, h: 0, same: true }); };
      im.src = url;
    });
  }
  var ORIG_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };
  var STREAM_TYPES = { "video/mp4": "video", "video/webm": "video", "application/pdf": "pdf" };

  /* ── the store object app.js consults ─────────────────────────────────── */
  var STORE = window.BILLY360_STORE = { mode: "local", listingId: null, version: 0, rooms: [], status: null, publicUrl: null, embedOrigin: null };

  /* upload one image (data URL or Blob) for a listing; resolves to
     {url, thumb, pano, pano2048, orig, id} — url is the 1600 photo, pano the
     4096 panorama, orig the untouched file (the logo keeps its PNG/SVG).
     meta: {isPano, role: tour|logo|floorplan|gallery|cover, roomLabel, alt, listingId,
     derivedThumb: a data: URL JPEG ≤ 480 wide the caller already made (skips one decode)} */
  STORE.upload = function (src, meta) {
    meta = meta || {};
    var blob = typeof src === "string" ? dataUrlToBlob(src) : src;
    if (!blob) return Promise.reject(new Error("Not an image."));
    var thumbBlob = typeof meta.derivedThumb === "string" && meta.derivedThumb.indexOf("data:image/jpeg") === 0 ? dataUrlToBlob(meta.derivedThumb) : null;
    var listingId = meta.listingId || STORE.listingId;
    var isPano = !!meta.isPano;
    var role = isPano ? "tour" : (meta.role || "gallery");
    /* the Worker only stores jpeg/png/webp/gif/avif originals — an SVG logo goes up as a PNG */
    var origP = ORIG_TYPES[blob.type] ? Promise.resolve({ blob: blob }) : resized(blob, 2048, 1, "image/png");
    return Promise.all([
      resized(blob, 1600, 0.82),
      thumbBlob ? Promise.resolve({ blob: thumbBlob }) : resized(blob, 480, 0.75),
      isPano ? resized(blob, 4096, 0.86) : null,
      isPano ? resized(blob, 2048, 0.86) : null,
      origP
    ]).then(function (parts) {
      var orig = parts[4].blob;
      var fd = new FormData();
      /* a JPEG panorama that is already ≤ 4096 wide is sent once: the server
         files the orig bytes as pano4096.jpg as well (panoIsOrig) */
      var panoIsOrig = !!(parts[2] && parts[2].same && parts[2].blob === orig);
      fd.append("meta", JSON.stringify({
        listingId: listingId, kind: isPano ? "pano" : "photo", role: role,
        roomLabel: meta.roomLabel || "", alt: meta.alt || meta.roomLabel || "", width: parts[0].w, height: parts[0].h, isPano: isPano,
        panoIsOrig: panoIsOrig
      }));
      fd.append("orig", orig, "upload." + (ORIG_TYPES[orig.type] || "jpg"));
      fd.append("large", parts[0].blob, "w1600.jpg");
      fd.append("thumb", parts[1].blob, "w480.jpg");
      if (parts[2] && !panoIsOrig) fd.append("pano", parts[2].blob, "pano4096.jpg");
      if (parts[3]) fd.append("pano2048", parts[3].blob, "pano2048.jpg");
      return api("POST", "/api/studio/media", fd, true);
    }).then(function (m) {
      m = m || {};
      return { url: m.url || null, thumb: m.thumb || m.url || null, pano: m.pano || m.url || null, pano2048: m.pano2048 || null, orig: m.orig || m.url || null, id: m.id || null,
        listingWentLive: m.listingWentLive === true };
    });
  };
  /* video / PDF hotspot attachments go up as a raw body (no derivatives) */
  STORE.uploadStream = function (src, meta) {
    meta = meta || {};
    var blob = typeof src === "string" ? dataUrlToBlob(src) : src;
    if (!blob || !STREAM_TYPES[blob.type]) return Promise.reject(new Error("Only MP4, WebM and PDF attachments can be uploaded."));
    var q = "?listingId=" + encodeURIComponent(meta.listingId || STORE.listingId) + "&kind=" + STREAM_TYPES[blob.type] +
      "&role=gallery&roomLabel=" + encodeURIComponent(meta.roomLabel || "") + "&alt=" + encodeURIComponent(meta.alt || meta.roomLabel || "") +
      "&filename=" + encodeURIComponent("attachment." + (STREAM_TYPES[blob.type] === "pdf" ? "pdf" : blob.type === "video/webm" ? "webm" : "mp4"));
    return api("PUT", "/api/studio/media/stream" + q, blob, true).then(function (m) { return { url: (m && m.url) || null, id: (m && m.id) || null }; });
  };

  function isDataUrl(v) { return typeof v === "string" && v.indexOf("data:") === 0 && v.length > 4096; }
  /* a photo uploaded from the tour completed an imported listing's set and the
     listing went live by itself (F171) — the app shows a toast for it */
  function listingWentLive() {
    STORE.listingLive = true;
    try { window.dispatchEvent(new CustomEvent("billy360:listing-live", { detail: { listingId: STORE.listingId } })); } catch (e) { }
  }

  /* swap every embedded image in the tour for an uploaded URL; resolves to
     the number of uploads it made. Each write-back only lands when the field
     still holds the data URL that was uploaded — a capture replaced or
     removed mid-upload is left alone for the next pass. */
  STORE.hydrate = function (tour, onStatus, listingId) {
    listingId = listingId || STORE.listingId;
    var jobs = [], total = 0, done = 0;
    function status(label) {
      if (onStatus) onStatus("Uploading " + (done + 1) + " of " + total + (label ? " · " + label : "") + "…");
    }
    function want(obj, key, meta, pick, extra) {
      var v = obj && obj[key];
      if (!isDataUrl(v)) return;
      total++;
      meta.listingId = listingId;
      jobs.push(function () {
        status(meta.roomLabel);
        var up = meta.stream ? STORE.uploadStream(v, meta) : STORE.upload(v, meta);
        return up.then(function (m) {
          if (m && m.listingWentLive) listingWentLive();
          if (obj[key] !== v) return;   // superseded while uploading — keep the newer value
          obj[key] = pick ? pick(m) : m.url;
          if (extra) extra(m);
        });
      });
    }
    /* a raster floor plan is a data: href inside <image …> markup */
    function wantPlan(f) {
      var plan = f && f.plan, m = typeof plan === "string" ? /href="(data:[^"]+)"/.exec(plan) : null;
      if (!m || !isDataUrl(m[1])) return;
      total++;
      var v = m[1];
      jobs.push(function () {
        status(f.name || "Floor plan");
        return STORE.upload(v, { role: "floorplan", roomLabel: f.name || "Floor plan", listingId: listingId }).then(function (up) {
          if (f.plan !== plan || !up.url) return;
          f.plan = plan.split(v).join(up.url);
        });
      });
    }
    (tour.rooms || []).forEach(function (r) {
      want(r, "pano", { isPano: true, roomLabel: r.name, derivedThumb: typeof r.thumb === "string" && r.thumb.indexOf("data:") === 0 ? r.thumb : null },
        function (m) { return m.pano; }, function (m) { if (m.thumb) r.thumb = m.thumb; });
      (r.photos || []).forEach(function (p) { want(p, "src", { roomLabel: r.name, alt: p.caption }, null, function (m) { if (m.thumb) p.thumb = m.thumb; }); });
      (r.hotspots || []).forEach(function (h) {
        if (h.type === "image") want(h, "src", { roomLabel: r.name, alt: h.label });
        else if (h.type === "video" || h.type === "doc") want(h, "src", { roomLabel: r.name, alt: h.label, stream: true });
      });
    });
    if (tour.project) want(tour.project, "coverImage", { role: "cover", roomLabel: "Cover" });
    if (tour.brand) want(tour.brand, "logo", { role: "logo", roomLabel: "Logo" }, function (m) { return m.orig || m.url; });
    (tour.floors || []).forEach(wantPlan);
    return jobs.reduce(function (p, job) { return p.then(job).then(function () { done++; }); }, Promise.resolve()).then(function () { return total; });
  };

  STORE.save = function (tour, opts) {
    opts = opts || {};
    var id = STORE.listingId;
    /* a capture that lands during the uploads is picked up by the next pass,
       so the PUT never carries a data: URL (the server would refuse it) */
    var rounds = 0;
    function step() {
      return STORE.hydrate(tour, opts.onStatus, id).then(function (n) { return n && ++rounds < 30 ? step() : null; });
    }
    return step().then(function () {
      if (opts.onStatus) opts.onStatus("Saving…");
      return api("PUT", "/api/studio/tours/" + encodeURIComponent(id), { tour: tour, version: STORE.version, health: opts.health });
    }).then(function (j) { STORE.version = j.version; noteLinks(j); return j; });
  };

  STORE.publish = function (health) {
    return api("POST", "/api/studio/tours/" + encodeURIComponent(STORE.listingId) + "/publish", { health: health }).then(function (j) {
      if (j.ok) STORE.status = "live";
      noteLinks(j);
      return j;
    });
  };
  STORE.unpublish = function () {
    return api("POST", "/api/studio/tours/" + encodeURIComponent(STORE.listingId) + "/unpublish", {}).then(function (j) { STORE.status = "draft"; return j; });
  };
  STORE.importLocal = function () {
    var tours = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf("billy360:tour:") === 0 && k !== "billy360:tour:v2") {
          var t = JSON.parse(localStorage.getItem(k));
          if (t && t.rooms) tours.push(t);
        }
      }
    } catch (e) { }
    if (!tours.length) return Promise.resolve({ imported: [], skipped: [], none: true });
    /* one tour at a time — every upload carries its own listing id */
    return tours.reduce(function (p, t) { return p.then(function () { return STORE.hydrateFor(t); }); }, Promise.resolve()).then(function () {
      return api("POST", "/api/studio/tours/import", { tours: tours });
    });
  };
  /* hydrate a tour that belongs to a different listing id (used by importLocal) */
  STORE.hydrateFor = function (tour) {
    return STORE.hydrate(tour, null, tour.id);
  };
  /* the canonical links come from the server (GET /api/studio/tours/:id);
     until it says otherwise they point at this host */
  STORE.tourUrl = function () { return STORE.publicUrl || (location.origin + "/billy360/?site=" + encodeURIComponent(STORE.listingId)); };
  STORE.embedCode = function () {
    var origin = STORE.embedOrigin || location.origin;
    return '<div data-billy360="' + STORE.listingId + '" data-height="16:9"></div>\n<script src="' + origin + '/billy360/embed.js" defer></script>';
  };

  /* The only links a blocked card will draw: a path on this site, or an https
     address. Anything else (javascript:, data:, junk) is refused. */
  function safeBack(href) {
    return !!href && (/^\/[a-z0-9\/#._?=-]*$/i.test(href) || /^https:\/\/[a-z0-9.-]+(\/[a-z0-9\/#._?=&%-]*)?$/i.test(href));
  }

  function showBlocked(title, body, href, label) {
    var paint = function () {
      /* built with textContent — nothing from the URL is ever parsed as HTML */
      var box = document.createElement("div");
      box.id = "storeBlocked";
      box.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:#0C0E22;color:#F5F2EA;font:15px/1.6 Inter,system-ui,sans-serif;padding:24px";
      var card = document.createElement("div");
      card.style.cssText = "max-width:440px;text-align:center";
      var h = document.createElement("h1");
      h.style.cssText = "font:600 24px/1.2 Georgia,serif;margin:0 0 10px";
      h.textContent = title;
      var p = document.createElement("p");
      p.style.cssText = "opacity:.8;margin:0 0 18px";
      p.textContent = body;
      card.appendChild(h); card.appendChild(p);
      if (safeBack(href)) {
        var a = document.createElement("a");
        a.href = href;
        a.target = "_top";   // inside the Studio iframe the whole page moves, not the frame
        a.style.cssText = "display:inline-block;background:#176B99;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600";
        a.textContent = label;
        card.appendChild(a);
      }
      box.appendChild(card);
      document.body.appendChild(box);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paint);
    else paint();
  }

  /* the Studio lives at /studio on the client domain, /templates/megacity-studio on the demo host (worker/studio/urls.js) */
  var STUDIO = /^(www\.)?billydigitals\.com$|^localhost$|^127\.0\.0\.1$/i.test(location.hostname) ? "/templates/megacity-studio" : "/studio";
  STORE.studioUrl = STUDIO;   // app.js builds "Back to the listing" and the sign-in link from it

  /* ── mode selection ───────────────────────────────────────────────────── */
  if (!SITE) {
    if (OFFICE) { showBlocked("No such listing", "The Studio link is missing a valid listing id.", STUDIO + "#/listings", "Back to listings"); return; }
    inject();
    return;
  }

  if (!OFFICE) {
    STORE.mode = "public";
    STORE.listingId = SITE;
    /* the live tour or nothing: no demo portfolio, no Charnwood stand-in.
       A shipped demo with this exact id (the demo host) still opens. */
    var ctrl = null, timer = null;
    try { ctrl = new AbortController(); timer = setTimeout(function () { ctrl.abort(); }, PUBLIC_TIMEOUT); } catch (e) { }
    var fopts = { credentials: "omit", cache: "no-cache" };
    if (ctrl) fopts.signal = ctrl.signal;
    var failed = function (why, body) {
      if (timer) clearTimeout(timer);
      var ship = shipped(SITE);
      closeAdmin();
      forgetLocalCopy(SITE);
      if (ship) { useOnly(ship); inject(); return; }
      /* showBlocked only draws a link it considers safe, so an unusable
         listingUrl would leave the card with no way out at all. Test it here
         and fall back to the home page instead. */
      var offered = body && typeof body.listingUrl === "string" ? body.listingUrl : "";
      var back = safeBack(offered) ? offered : "/";
      if (why === "network") showBlocked("Couldn't load the tour", "We couldn't reach the tour just now. Check your connection and try again.", back, "Back to the listing");
      else showBlocked("This tour isn't published yet", "Ask the office and we will send it over as soon as it is live.", back, "Back to the listing");
    };
    fetch("/api/public/tours/" + encodeURIComponent(SITE), fopts)
      .then(function (r) {
        return r.text().then(function (txt) {
          var j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) { }
          if (!r.ok || !j || !j.rooms || !j.rooms.length) { failed("missing", j); return; }
          if (timer) clearTimeout(timer);
          var t = j;
          t.id = SITE;
          useOnly(t);
          closeAdmin();
          forgetLocalCopy(SITE);
          CFG.leads = { endpoint: "/api/public/lead" };
          CFG.analytics = { endpoint: "/api/public/event" };
          warmFirstPano(t);
          inject();
        });
      })
      .catch(function () { failed("network"); });
    return;
  }

  STORE.mode = "remote";
  STORE.listingId = SITE;
  api("GET", "/api/studio/tours/" + encodeURIComponent(SITE)).catch(function (e) {
    if (e.status === 404 && e.body && e.body.canCreate) {
      var ship = shipped(SITE) || (window.BILLY360_TOURS || [])[0] || {};
      return api("POST", "/api/studio/tours/" + encodeURIComponent(SITE), {
        brand: ship.brand || null, agent: (ship.project && ship.project.agent) || null
      });
    }
    throw e;
  }).then(function (j) {
    var tour = j.tour;
    tour.id = SITE;
    tour.project = tour.project || {};
    STORE.version = j.version;
    STORE.status = j.status;
    STORE.health = j.health;
    STORE.liveVersion = j.liveVersion === undefined ? null : j.liveVersion;
    STORE.listingLive = !!j.listingLive;
    STORE.gate = j.gate == null ? null : j.gate;
    noteLinks(j);
    useOnly(tour);
    CFG.admin = CFG.admin || {};
    CFG.admin.enabled = true;
    CFG.admin.hash = null;
    CFG.admin.verifyUrl = "/api/billy360-verify";
    CFG.admin.rememberDays = 0;
    CFG.leads = { endpoint: "/api/public/lead" };
    /* no analytics endpoint here: office sessions must not count as visitors */
    CFG.analytics = { endpoint: null };
    /* the office cookie already proved who this is — open the Studio without a passcode */
    try {
      localStorage.removeItem("billy360:admin");
      sessionStorage.setItem("billy360:admin", fnv("session:" + CFG.admin.verifyUrl));
    } catch (e) { }
    forgetLocalCopy(SITE);
    if (!location.hash || location.hash === "#/") location.hash = "#/studio/rooms";
    inject();
  }).catch(function (e) {
    if (e.status === 401) showBlocked("Sign in to the Studio first", "This tour editor uses your Megacity Studio login.", STUDIO + "#/login", "Open the Studio");
    else if (e.status === 503) showBlocked("Not connected yet", "The Studio database is not set up on this deployment.", STUDIO, "Open the Studio");
    else if (e.status === 404) showBlocked("No such listing", "There is no listing with that id.", STUDIO + "#/listings", "Back to listings");
    else if (e.status === 410) showBlocked("This listing is in the Bin", "Restore the listing in the Studio to keep editing its tour.", STUDIO + "#/listings/" + encodeURIComponent(SITE), "Open the listing");
    else showBlocked("Could not load the tour", e.message || "Please try again.", STUDIO + "#/listings", "Back to listings");
  });
})();

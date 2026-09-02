/* ═══════════════════════════════════════════════════════════════════════════
   BILLY360 · STORE ADAPTER
   Decides where a tour lives before app.js boots, then loads app.js.

     no ?site                 → legacy: localStorage + the shipped tour files
     ?site=<id>               → public: the live tour from /api/public/tours/<id>,
                                falling back to the shipped file
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
  var RAW_SITE = QS.get("site") || QS.get("property") || "";
  var SITE = /^[a-z0-9-]{1,80}$/i.test(RAW_SITE) ? RAW_SITE.toLowerCase() : null;
  var OFFICE = QS.get("office") === "1";
  var APP = "app.js?v=20260902s";
  var CFG = window.BILLY360_CONFIG || (window.BILLY360_CONFIG = {});

  function inject() {
    var s = document.createElement("script");
    s.src = APP;
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
  function replaceShipped(tour) {
    var all = window.BILLY360_TOURS || (window.BILLY360_TOURS = []);
    for (var i = 0; i < all.length; i++) if (all[i] && all[i].id === tour.id) { all[i] = tour; return; }
    all.unshift(tour);
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
  function resized(blob, maxEdge, quality) {
    return new Promise(function (res) {
      var url = URL.createObjectURL(blob), im = new Image();
      im.onload = function () {
        var w = im.naturalWidth, h = im.naturalHeight, s = Math.min(1, maxEdge / Math.max(w, h));
        var c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { res({ blob: b || blob, w: w, h: h }); }, "image/jpeg", quality);
      };
      im.onerror = function () { URL.revokeObjectURL(url); res({ blob: blob, w: 0, h: 0 }); };
      im.src = url;
    });
  }

  /* ── the store object app.js consults ─────────────────────────────────── */
  var STORE = window.BILLY360_STORE = { mode: "local", listingId: null, version: 0, rooms: [], status: null };

  /* upload one image (data URL or Blob) for a room; resolves to the URL to
     keep in the tour — the 4096 panorama for a 360, the 1600 photo otherwise */
  STORE.upload = function (src, meta) {
    meta = meta || {};
    var blob = typeof src === "string" ? dataUrlToBlob(src) : src;
    if (!blob) return Promise.reject(new Error("Not an image."));
    var isPano = !!meta.isPano;
    return Promise.all([
      resized(blob, 1600, 0.82),
      resized(blob, 480, 0.75),
      isPano ? resized(blob, 4096, 0.86) : null
    ]).then(function (parts) {
      var fd = new FormData();
      fd.append("meta", JSON.stringify({
        listingId: STORE.listingId, kind: isPano ? "pano" : "photo", role: isPano ? "tour" : (meta.role || "gallery"),
        roomLabel: meta.roomLabel || "", alt: meta.alt || meta.roomLabel || "", width: parts[0].w, height: parts[0].h, isPano: isPano
      }));
      fd.append("orig", blob, "upload.jpg");
      fd.append("large", parts[0].blob, "w1600.jpg");
      fd.append("thumb", parts[1].blob, "w480.jpg");
      if (parts[2]) fd.append("pano", parts[2].blob, "pano4096.jpg");
      return api("POST", "/api/studio/media", fd, true);
    }).then(function (m) { return isPano ? (m.pano || m.url) : m.url; });
  };

  /* swap every embedded image in the tour for an uploaded URL */
  STORE.hydrate = function (tour, onStatus) {
    var jobs = [];
    var total = 0;
    function want(obj, key, meta) {
      var v = obj && obj[key];
      if (typeof v === "string" && v.indexOf("data:") === 0 && v.length > 4096) {
        total++;
        jobs.push(function () {
          if (onStatus) onStatus("Uploading " + (jobs.length - jobs.filter(function (j) { return j.done; }).length) + " of " + total + "…");
          return STORE.upload(v, meta).then(function (url) { obj[key] = url; });
        });
      }
    }
    (tour.rooms || []).forEach(function (r) {
      want(r, "pano", { isPano: true, roomLabel: r.name });
      (r.photos || []).forEach(function (p) { want(p, "src", { roomLabel: r.name, alt: p.caption }); });
      (r.hotspots || []).forEach(function (h) { if (h.type === "image") want(h, "src", { roomLabel: r.name, alt: h.label }); });
    });
    if (tour.project) want(tour.project, "coverImage", { role: "cover", roomLabel: "Cover" });
    return jobs.reduce(function (p, job) { return p.then(job).then(function () { job.done = true; }); }, Promise.resolve()).then(function () { return total; });
  };

  STORE.save = function (tour, opts) {
    opts = opts || {};
    return STORE.hydrate(tour, opts.onStatus).then(function () {
      return api("PUT", "/api/studio/tours/" + encodeURIComponent(STORE.listingId), { tour: tour, version: STORE.version, health: opts.health });
    }).then(function (j) { STORE.version = j.version; return j; });
  };

  STORE.publish = function (health) {
    return api("POST", "/api/studio/tours/" + encodeURIComponent(STORE.listingId) + "/publish", { health: health }).then(function (j) {
      if (j.ok) STORE.status = "live";
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
    return Promise.all(tours.map(function (t) { return STORE.hydrateFor(t); })).then(function () {
      return api("POST", "/api/studio/tours/import", { tours: tours });
    });
  };
  /* hydrate a tour that belongs to a different listing id (used by importLocal) */
  STORE.hydrateFor = function (tour) {
    var keep = STORE.listingId;
    STORE.listingId = tour.id;
    return STORE.hydrate(tour).then(function () { STORE.listingId = keep; }, function (e) { STORE.listingId = keep; throw e; });
  };
  STORE.tourUrl = function () { return location.origin + "/billy360/?site=" + encodeURIComponent(STORE.listingId); };
  STORE.embedCode = function () {
    return '<div data-billy360="' + STORE.listingId + '" data-height="16:9"></div>\n<script src="' + location.origin + '/billy360/embed.js" defer></script>';
  };

  function showBlocked(title, body, href, label) {
    var paint = function () {
      /* built with textContent — nothing from the URL is ever parsed as HTML */
      var box = document.createElement("div");
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
      if (href && /^\/[a-z0-9\/#._?=-]*$/i.test(href)) {
        var a = document.createElement("a");
        a.href = href;
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

  /* ── mode selection ───────────────────────────────────────────────────── */
  if (!SITE) {
    if (OFFICE) { showBlocked("No such listing", "The Studio link is missing a valid listing id.", "/templates/megacity-studio#/listings", "Back to listings"); return; }
    inject();
    return;
  }

  if (!OFFICE) {
    STORE.mode = "public";
    fetch("/api/public/tours/" + encodeURIComponent(SITE), { credentials: "omit" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (t) { if (t && t.rooms && t.rooms.length) replaceShipped(t); })
      .catch(function () { })
      .then(inject);
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
    window.BILLY360_TOURS = [tour];
    window.BILLY360_TOUR = tour;
    CFG.admin = CFG.admin || {};
    CFG.admin.enabled = true;
    CFG.admin.hash = null;
    CFG.admin.verifyUrl = "/api/billy360-verify";
    CFG.admin.rememberDays = 0;
    CFG.leads = { endpoint: "/api/public/lead" };
    CFG.analytics = { endpoint: "/api/public/event" };
    /* the office cookie already proved who this is — open the Studio without a passcode */
    try {
      localStorage.removeItem("billy360:admin");
      sessionStorage.setItem("billy360:admin", fnv("session:" + CFG.admin.verifyUrl));
      localStorage.removeItem("billy360:tour:" + SITE);   // never let a stale browser copy shadow the server
    } catch (e) { }
    if (!location.hash || location.hash === "#/") location.hash = "#/studio/rooms";
    inject();
  }).catch(function (e) {
    if (e.status === 401) showBlocked("Sign in to the Studio first", "This tour editor uses your Megacity Studio login.", "/templates/megacity-studio#/login", "Open the Studio");
    else if (e.status === 503) showBlocked("Not connected yet", "The Studio database is not set up on this deployment.", "/templates/megacity-studio", "Open the Studio");
    else if (e.status === 404) showBlocked("No such listing", "There is no listing with that id.", "/templates/megacity-studio#/listings", "Back to listings");
    else showBlocked("Could not load the tour", e.message || "Please try again.", "/templates/megacity-studio#/listings", "Back to listings");
  });
})();

/* ═══════════════════════════════════════════════════════════════════════════
   RED360 · APPLICATION
   Three screens over one WebGL context:

     Overview   project dashboard with a live preview of the building
     Tour       the immersive viewer — panels, plan, hotspots, guided walkthrough
     Studio     the CMS — rooms, hotspots, plans, branding, publish

   The canvas is never re-created. It is re-parented between screens, so the
   GPU context, the baked panoramas and the camera all survive navigation and
   moving from the dashboard into the tour is instantaneous.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ── tiny DOM helpers ─────────────────────────────────────────────────── */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }
  function icon(name, cls) {
    var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    if (cls) s.setAttribute("class", cls);
    var u = document.createElementNS("http://www.w3.org/2000/svg", "use");
    u.setAttribute("href", "#i-" + name);
    s.appendChild(u);
    return s;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = matchMedia("(pointer: coarse)").matches;
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || "");

  /* ── state ────────────────────────────────────────────────────────────── */

  var CFG = window.RED360_CONFIG || {};
  var PORTFOLIO = CFG.portfolio || {};
  var ADMIN_CFG = CFG.admin || {};
  var EMBED_CFG = CFG.embed || {};
  var QS = new URLSearchParams(location.search);
  var EMBED = QS.get("embed") === "1";

  /* Every tour file registers itself, so a deployment can carry as many
     properties as you like — add the file, add one <script> line, done. A file
     that only sets window.RED360_TOUR (the original single-tour shape) still
     works. A file may also register a *stub* — id, project block and floors,
     plus src — so a portfolio of hundreds does not parse every room at boot. */
  var SHIPPED = (window.RED360_TOURS && window.RED360_TOURS.length
    ? window.RED360_TOURS
    : [window.RED360_TOUR]).filter(Boolean).map(function (t) {
      var c = JSON.parse(JSON.stringify(t));
      c.id = c.id || (c.project && c.project.slug) || slug((c.project && c.project.name) || "tour");
      return c;
    });
  function isStub(t) { return !!(t && t.src && !(t.rooms && t.rooms.length)); }
  /* pull a stub's real file in on demand, then swap it into the registry */
  var loadingSrc = {};
  function fetchStub(id, cb) {
    var stub = shippedTour(id);
    if (!stub || !isStub(stub)) { cb(loadTour(id)); return; }
    if (loadingSrc[id]) { loadingSrc[id].push(cb); return; }
    loadingSrc[id] = [cb];
    var sc = document.createElement("script");
    sc.src = stub.src;
    sc.onload = function () {
      var full = null, all = window.RED360_TOURS || [];
      for (var i = 0; i < all.length; i++) if (all[i] && all[i].id === id && all[i].rooms) full = all[i];
      if (full) {
        for (var j = 0; j < SHIPPED.length; j++) {
          if (SHIPPED[j].id === id) SHIPPED[j] = JSON.parse(JSON.stringify(full));
        }
      }
      done(full ? loadTour(id) : null);
    };
    sc.onerror = function () { done(null); };
    document.head.appendChild(sc);
    function done(t) {
      var q = loadingSrc[id] || [];
      delete loadingSrc[id];
      q.forEach(function (f) { f(t); });
    }
  }
  function slug(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tour";
  }
  function storeKey(id) { return "red360:tour:" + id; }
  function projectIds() {
    var ids = SHIPPED.map(function (t) { return t.id; });
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf("red360:tour:") === 0) {
          var id = k.slice(12);
          if (id !== "v2" && ids.indexOf(id) < 0) ids.push(id);
        }
      }
    } catch (e) { }
    return ids;
  }
  /* the command palette rebuilds on every keystroke, so the summary of each
     project is cached rather than re-parsing every stored tour each time */
  var metaCache = {};
  function projectMeta(id) {
    var live = id === PROJECT;
    if (!live && metaCache[id]) return metaCache[id];
    var t = live ? TOUR : loadTour(id);
    if (!t) return null;
    var p = t.project || {};
    var m = {
      id: id, name: p.name || id, rooms: (t.rooms || []).length,
      location: p.location || "", brand: t.brand, project: p,
      plan: (t.floors && t.floors[0] && t.floors[0].plan) || "",
      stub: isStub(t), shipped: !!shippedTour(id)
    };
    /* the open project is read straight off TOUR — it changes as you edit */
    return live ? m : (metaCache[id] = m);
  }
  function forgetMeta(id) { if (id) delete metaCache[id]; else metaCache = {}; }
  var PROJECT = (function () {
    /* ?site=<id>. Deliberately not ?p= — that is the pitch angle in a share link. */
    var q = QS.get("site") || QS.get("property");
    var ids = projectIds();
    if (q && ids.indexOf(q) >= 0) return q;
    var last = null;
    try { last = localStorage.getItem("red360:project"); } catch (e) { }
    return (last && ids.indexOf(last) >= 0) ? last : ids[0];
  })();
  var TOUR = loadTour(PROJECT);
  (function migrate() {
    try {
      var old = localStorage.getItem("red360:tour:v2");
      if (old && !localStorage.getItem(storeKey(SHIPPED[0].id))) {
        localStorage.setItem(storeKey(SHIPPED[0].id), old);
        localStorage.removeItem("red360:tour:v2");
        if (PROJECT === SHIPPED[0].id) TOUR = loadTour(PROJECT);
      }
    } catch (e) { }
  })();

  var engine = null;
  var view = "dash";
  var roomsById = {};
  var currentRoom = null;
  var hotEls = [];
  var panelsHidden = false;
  var lastRead = "";
  var placing = false;              // studio: click-to-place a hotspot
  var selectedHotspot = null;
  var studioRoomId = null;
  var studioTab = "rooms";
  var cameFrom = "dash";
  var dirty = false;

  function shippedTour(id) {
    for (var i = 0; i < SHIPPED.length; i++) if (SHIPPED[i].id === id) return SHIPPED[i];
    return null;
  }
  /* a saved edit wins over the shipped file; a project that only exists in
     storage (made in Studio) loads from there alone */
  function loadTour(id) {
    try {
      var raw = localStorage.getItem(storeKey(id));
      if (raw) {
        var t = JSON.parse(raw);
        if (t && t.rooms && t.rooms.length) { t.id = t.id || id; return t; }
      }
    } catch (e) { }
    var ship = shippedTour(id);
    return ship ? JSON.parse(JSON.stringify(ship)) : null;
  }
  function saveTour(silent) {
    try {
      localStorage.setItem(storeKey(PROJECT), JSON.stringify(TOUR));
      localStorage.setItem("red360:project", PROJECT);
      forgetMeta(PROJECT);
      dirty = false;
      markSaved("Saved");
      if (!silent) toast("Changes saved to this browser.");
      return true;
    } catch (e) {
      markSaved("Not saved", true);
      if (!silent) toast("Couldn't save — browser storage is full. Export the tour instead.");
      return false;
    }
  }
  function markDirty() {
    dirty = true;
    markSaved("Unsaved changes", true);
  }
  function markSaved(label, warn) {
    var n = $("#saveState");
    if (!n) return;
    n.innerHTML = "";
    n.appendChild(el("i"));
    n.appendChild(document.createTextNode(" " + label));
    n.style.color = warn ? "var(--warn)" : "";
  }

  /* ═══════════════════════════════════════════════════════════════════════
     ADMIN ACCESS
     The Studio is the agency's back office. A visitor should never see it, so
     every route and every control into it goes through isAdmin().

     Be straight with the client about what this is: it hides the tools, it
     does not protect the data. The whole app is static files — anyone who
     opens the JavaScript can get past a passcode that lives in it. When the
     listings themselves are confidential, put the folder behind the server's
     own login, or set admin.verifyUrl and check the code server-side.
     ═══════════════════════════════════════════════════════════════════════ */
  var ADMIN_KEY = "red360:admin";
  var adminOpen = false, adminAfter = null;

  function fnv(str) {
    var h = 0x811c9dc5;
    str = "red360:" + String(str);
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return ("0000000" + h.toString(16)).slice(-8);
  }
  function adminLocked() {
    return ADMIN_CFG.enabled !== false && !!(ADMIN_CFG.hash || ADMIN_CFG.verifyUrl);
  }
  function adminToken() {
    return fnv("session:" + (ADMIN_CFG.hash || ADMIN_CFG.verifyUrl || ""));
  }
  var adminUnlocked = (function () {
    if (!adminLocked()) return true;
    try {
      if (sessionStorage.getItem(ADMIN_KEY) === adminToken()) return true;
      var raw = localStorage.getItem(ADMIN_KEY);
      if (raw) {
        var v = JSON.parse(raw);
        if (v && v.t === adminToken() && v.exp > Date.now()) return true;
        localStorage.removeItem(ADMIN_KEY);
      }
    } catch (e) { }
    return false;
  })();
  function isAdmin() { return !adminLocked() || adminUnlocked; }

  function adminGrant(remember) {
    adminUnlocked = true;
    try {
      sessionStorage.setItem(ADMIN_KEY, adminToken());
      var days = +ADMIN_CFG.rememberDays || 0;
      if (remember && days > 0) {
        localStorage.setItem(ADMIN_KEY, JSON.stringify({ t: adminToken(), exp: Date.now() + days * 864e5 }));
      }
    } catch (e) { }
    syncAdminUI();
  }
  function adminSignOut() {
    adminUnlocked = false;
    try { sessionStorage.removeItem(ADMIN_KEY); localStorage.removeItem(ADMIN_KEY); } catch (e) { }
    syncAdminUI();
    if (view === "studio") setView(SITES_ON ? "sites" : "dash");
    toast("Signed out of the Studio.");
  }
  /* returns a promise-ish: cb(true|false) */
  function adminCheck(code, cb) {
    if (ADMIN_CFG.verifyUrl) {
      var done = false;
      var to = setTimeout(function () { if (!done) { done = true; cb(false, "The server didn't answer."); } }, 8000);
      fetch(ADMIN_CFG.verifyUrl, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code })
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (done) return; done = true; clearTimeout(to);
        cb(!!(j && j.ok), j && j.error);
      })["catch"](function () {
        if (done) return; done = true; clearTimeout(to);
        cb(false, "Couldn't reach the sign-in service.");
      });
      return;
    }
    cb(fnv(code) === ADMIN_CFG.hash);
  }

  /* every control that leads into the Studio hides itself when locked */
  function syncAdminUI() {
    var on = isAdmin();
    document.body.classList.toggle("is-admin", on);
    $$(".admin-only").forEach(function (n) { n.hidden = !on; });
    var b = $("#btnAdmin");
    if (b) {
      b.hidden = !adminLocked();
      b.classList.toggle("is-on", on);
      b.title = on ? "Signed in — sign out of the Studio" : "Studio access";
      var u = $("use", b);
      if (u) u.setAttribute("href", on ? "#i-key" : "#i-lock");
    }
  }

  function openLock(after) {
    if (isAdmin()) { if (after) after(); return; }
    adminOpen = true; adminAfter = after || null;
    $("#lock").classList.add("is-on");
    $("#lockHint").textContent = ADMIN_CFG.hint || "Enter the passcode to open the editing tools.";
    $("#lockErr").hidden = true;
    $("#lockCode").value = "";
    $("#lockRemember").parentNode.style.display = (+ADMIN_CFG.rememberDays > 0) ? "" : "none";
    engine && engine.inputs(false);
    setTimeout(function () { $("#lockCode").focus(); }, 60);
  }
  function closeLock() {
    adminOpen = false; adminAfter = null;
    $("#lock").classList.remove("is-on");
    engine && engine.inputs(view === "tour");
  }
  /* the single door into the Studio — used by every button, key and route */
  function gotoStudio(tab) {
    if (tab) studioTab = tab;
    if (!isAdmin()) { openLock(function () { setView("studio", { force: true }); }); return false; }
    setView("studio", { force: view === "studio" });
    return true;
  }

  function indexRooms() {
    roomsById = {};
    TOUR.rooms.forEach(function (r, i) { r._i = i; roomsById[r.id] = r; });
  }
  function floorOf(id) {
    for (var i = 0; i < TOUR.floors.length; i++) if (TOUR.floors[i].id === id) return TOUR.floors[i];
    return TOUR.floors[0];
  }

  /* ═══════════════════════════════════════════════════════════════════════
     BRANDING — every colour and name in the interface resolves from here
     ═══════════════════════════════════════════════════════════════════════ */
  function rgba(hex, a) {
    hex = String(hex || "").replace("#", "");
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var n = parseInt(hex, 16);
    if (isNaN(n)) return null;
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }
  function luminance(hex) {
    hex = String(hex || "").replace("#", "");
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var n = parseInt(hex, 16);
    if (isNaN(n)) return 0;
    return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  }

  function applyBrand() {
    var b = TOUR.brand || {}, s = document.documentElement.style;
    if (b.accent) {
      s.setProperty("--accent", b.accent);
      s.setProperty("--accent-soft", rgba(b.accent, .14));
      s.setProperty("--accent-line", rgba(b.accent, .34));
      s.setProperty("--accent-glow", rgba(b.accent, .45));
      s.setProperty("--accent-ink", luminance(b.accent) > 0.62 ? "#0A0A0C" : "#FFFFFF");
    }
    if (b.accent2) s.setProperty("--accent-2", b.accent2);
    if (b.bg) { s.setProperty("--bg", b.bg); document.querySelector('meta[name=theme-color]').setAttribute("content", b.bg); }
    if (b.ink) s.setProperty("--ink", b.ink);
    if (b.fontBody) s.setProperty("--font", b.fontBody);
    if (b.fontDisplay) s.setProperty("--font-display", b.fontDisplay);

    var word = esc(b.mark || b.name || "") + (b.markAccent ? "<em>" + esc(b.markAccent) + "</em>" : "");
    $$(".brand-word").forEach(function (n) { n.innerHTML = word; });
    $$(".brand-sub").forEach(function (n) { if (n.id) n.textContent = b.sub || ""; });
    $$(".brand-orb").forEach(function (n) {
      n.innerHTML = "";
      if (b.logo) { var im = new Image(); im.src = b.logo; im.alt = ""; n.appendChild(im); }
    });
    document.title = (b.name || "RED360") + " · " + (b.tagline || "Virtual Tours");
  }

  /* ═══════════════════════════════════════════════════════════════════════
     TOAST
     ═══════════════════════════════════════════════════════════════════════ */
  var toastTimer = 0;
  function toast(msg) {
    var n = $("#toast");
    n.textContent = msg;
    n.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { n.classList.remove("is-on"); }, 3400);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     ROUTER
     ═══════════════════════════════════════════════════════════════════════ */
  function stageFor(v) {
    return v === "tour" ? $("#stageTour") : v === "studio" ? ($("#studioStage") || $("#stageTour")) : $("#stageDash");
  }
  function mountStage(elm) {
    var gl = $("#gl"), hs = $("#hotspots");
    if (!engine || !elm || !gl || !hs) return;
    elm.appendChild(gl);
    elm.appendChild(hs);
    engine.mount(elm);
  }
  /* Studio re-renders its whole body, which would take the canvas down with it.
     Park the live context on the tour stage first — it is always in the DOM. */
  function parkStage() {
    var gl = $("#gl"), hs = $("#hotspots"), park = $("#stageTour");
    if (!gl || !hs || !park) return;
    if (gl.parentNode !== park) park.appendChild(gl);
    if (hs.parentNode !== park) park.appendChild(hs);
    if (engine) engine.mount(park);
  }

  function setView(next, opts) {
    opts = opts || {};
    if (next === "studio" && !isAdmin()) { openLock(function () { setView("studio", { force: true }); }); return; }
    if (next === "sites" && !SITES_ON) next = "dash";
    if (next === view && !opts.force) return;
    var prev = view;
    if (next === "studio" && prev !== "studio") cameFrom = prev;
    view = next;
    $$(".view").forEach(function (v) { v.classList.toggle("is-active", v.id === "view" + cap(next)); });
    $$("[data-nav]").forEach(function (n) { n.classList.toggle("is-on", n.getAttribute("data-nav") === next); });

    if (next === "tour") {
      mountStage($("#stageTour"));
      engine && engine.autoRotate(false);
      engine && engine.inputs(true);
      layoutHotspots(true);
      if (!sessionStorage.getItem("red360:hinted")) {
        setTimeout(function () { $("#hint").classList.add("is-on"); }, 700);
      }
      location.hash = "#/tour/" + (currentRoom ? currentRoom.id : "");
    } else if (next === "dash") {
      mountStage($("#stageDash"));
      engine && engine.autoRotate(true, 0.0016);
      engine && engine.inputs(!coarse);
      guidedStop(true);
      location.hash = "#/";
    } else if (next === "studio") {
      renderStudio();
      guidedStop(true);
      location.hash = "#/studio/" + studioTab;
    } else if (next === "sites") {
      parkStage();
      engine && engine.autoRotate(false);
      engine && engine.inputs(false);
      guidedStop(true);
      buildSites();
      location.hash = "#/sites";
    }
    if (prev === "studio" && next !== "studio") { placing = false; $("#stageTour").classList.remove("is-placing"); }
    /* on the portfolio the canvas is invisible — put the render loop to sleep */
    if (engine && engine.sleep) engine.sleep(next === "sites");
    closePalette(); closeSheet();
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function readHash() {
    var h = (location.hash || "").replace(/^#\/?/, "");
    var parts = h.split("/");
    if (parts[0] === "tour") return { view: "tour", room: parts[1] || null };
    if (parts[0] === "studio") return { view: "studio", tab: parts[1] || "rooms" };
    if (parts[0] === "sites") return { view: "sites" };
    if (parts[0] === "site" && parts[1]) return { view: "dash", site: parts[1] };
    return { view: h === "" ? null : "dash" };
  }

  /* ═══════════════════════════════════════════════════════════════════════
     PORTFOLIO — every property in the deployment, in one grid
     ═══════════════════════════════════════════════════════════════════════ */
  var siteQuery = "", siteFilter = "all", siteSort = "default";

  /* the portfolio is the landing screen only when there is something to
     choose between; a single-property deployment never sees it */
  var SITES_ON = (function () {
    var mode = PORTFOLIO.mode || "auto";
    if (EMBED && !EMBED_CFG.chrome) return false;
    if (mode === "never") return false;
    if (mode === "always") return true;
    return projectIds().length > 1;
  })();

  /* a draft listing is visible to the agency and to a direct link, never in
     the public grid */
  function visibleSites() {
    return projectIds().map(projectMeta).filter(function (m) {
      return m && (isAdmin() || !m.project.hidden);
    });
  }
  function priceValue(p) {
    var n = parseFloat(String(p || "").replace(/[^0-9.]/g, ""));
    if (!isFinite(n)) return -1;
    if (/pcm|pw|per\s*(week|month|calendar)/i.test(String(p))) n *= 240;   // rent → rough sale scale
    return n;
  }
  function sortSites(list) {
    var by = {
      "price-desc": function (a, b) { return priceValue(b.project.price) - priceValue(a.project.price); },
      "price-asc": function (a, b) { return priceValue(a.project.price) - priceValue(b.project.price); },
      "beds-desc": function (a, b) { return (+b.project.beds || 0) - (+a.project.beds || 0); },
      "name": function (a, b) { return a.name.localeCompare(b.name); }
    }[siteSort];
    return by ? list.slice().sort(by) : list;
  }
  function siteTerms(m) {
    var p = m.project;
    return [m.name, p.location, p.ref, p.status, p.propertyType, p.price, p.summary,
      p.beds ? p.beds + " bed" : ""].join(" ").toLowerCase();
  }

  function buildSites() {
    var b = TOUR.brand || {};
    $("#sitesEyebrow").textContent = PORTFOLIO.eyebrow || "Portfolio";
    $("#sitesTitle").textContent = PORTFOLIO.title || "Every property, walkable";
    $("#sitesBlurb").textContent = PORTFOLIO.blurb || "";
    $("#creditSites").innerHTML = b.credit
      ? '<a href="' + esc(b.creditHref || "#") + '" style="color:var(--ink-3)">' + esc(b.credit) + "</a>"
      : "";

    /* filter chips — only statuses that actually occur, so the bar never lies */
    var all = visibleSites();
    var present = {};
    all.forEach(function (m) { if (m.project.status) present[m.project.status] = 1; });
    var order = (PORTFOLIO.statuses || []).filter(function (st) { return present[st]; });
    Object.keys(present).forEach(function (st) { if (order.indexOf(st) < 0) order.push(st); });

    var fs = $("#siteFilters");
    fs.innerHTML = "";
    [["all", "All"]].concat(order.map(function (st) { return [st, st]; })).forEach(function (f) {
      var btn = el("button", f[0] === siteFilter ? "is-on" : "", f[1]);
      btn.onclick = function () { siteFilter = f[0]; buildSites(); };
      fs.appendChild(btn);
    });
    $("#siteSort").value = siteSort;
    renderSiteGrid(all);
  }

  function renderSiteGrid(all) {
    all = all || visibleSites();
    var q = siteQuery.trim().toLowerCase();
    var list = all.filter(function (m) {
      if (siteFilter !== "all" && m.project.status !== siteFilter) return false;
      if (q && siteTerms(m).indexOf(q) < 0) return false;
      return true;
    });
    list = sortSites(list);

    var g = $("#siteGrid");
    g.innerHTML = "";
    list.forEach(function (m) { g.appendChild(siteCard(m)); });
    $("#sitesEmpty").hidden = list.length > 0;
    $("#siteCount").textContent = list.length + " of " + all.length + (all.length === 1 ? " property" : " properties");
    $("#sitesInfo").textContent = all.length + " properties · " +
      all.reduce(function (a, m) { return a + m.rooms; }, 0) + " positions · WebGL";
  }

  function siteCard(m) {
    var p = m.project;
    var card = el("button", "card sitecard" + (p.hidden ? " is-draft" : ""));
    card.setAttribute("data-site", m.id);

    var art = el("span", "sitecard-art");
    if (p.coverImage) {
      var im = el("span", "sitecard-photo");
      im.style.backgroundImage = "url(" + JSON.stringify(String(p.coverImage)) + ")";
      art.appendChild(im);
    } else if (m.id === PROJECT) {
      /* the open property can show a real frame from the engine */
      var cv = el("canvas"); cv.width = 456; cv.height = 285;
      art.appendChild(cv);
      art.className += " sitecard-art--live";
      setTimeout(function () { paintSiteThumb(m, cv); }, 0);
    }
    if (!p.coverImage) {
      /* otherwise the floor plan itself is the card art — real data, and it
         costs nothing to draw */
      var plan = el("span", "sitecard-plan");
      plan.innerHTML = '<svg viewBox="0 0 120 80" aria-hidden="true">' + (m.plan || "") + "</svg>";
      art.appendChild(plan);
    }
    /* the card carries its own client's accent, so a mixed portfolio does not
       paint every chip in whichever brand happens to be loaded */
    var accent = (m.brand && m.brand.accent) || "#FF2D46";
    card.style.setProperty("--card-accent", accent);
    card.style.setProperty("--card-tint", rgba(accent, .3) || "rgba(255,255,255,.16)");
    card.appendChild(art);

    if (p.status) {
      var st = el("span", "chip sitecard-status", p.status);
      st.setAttribute("data-status", slug(p.status));
      card.appendChild(st);
    }
    if (p.hidden) card.appendChild(el("span", "chip sitecard-draft", "Draft"));

    var body = el("span", "sitecard-body");
    var price = el("span", "sitecard-price");
    price.appendChild(el("b", null, p.price || ""));
    if (p.priceQualifier) price.appendChild(el("span", null, p.priceQualifier));
    if (p.price) body.appendChild(price);
    body.appendChild(el("h4", null, m.name));
    body.appendChild(el("p", null, p.location || ""));

    var facts = el("span", "sitecard-facts");
    if (p.beds) facts.appendChild(fact("bed", p.beds));
    if (p.baths) facts.appendChild(fact("bath", p.baths));
    if (p.area) facts.appendChild(fact("building", p.area));
    facts.appendChild(fact("pin", m.rooms + (m.stub ? "+" : "") + " positions"));
    body.appendChild(facts);
    card.appendChild(body);

    card.onclick = function () { openSite(m.id); };
    return card;
  }
  function fact(ic, txt) {
    var f = el("span", "sitefact");
    f.appendChild(icon(ic));
    f.appendChild(el("span", null, String(txt)));
    return f;
  }
  function paintSiteThumb(m, cv) {
    if (!engine || m.id !== PROJECT) return;
    var room = (m.project.cover && roomsById[m.project.cover]) || currentRoom || TOUR.rooms[0];
    if (!room) return;
    var src = engine.thumbnail(room.id, cv.width, cv.height);
    if (!src) return;
    cv.getContext("2d").drawImage(src, 0, 0, cv.width, cv.height);
    if (cv.parentNode) cv.parentNode.classList.add("is-ready");
  }

  /* open a property: pull its file if it is a stub, then land on its overview */
  function openSite(id, opts) {
    opts = opts || {};
    if (id === PROJECT) { setView(opts.view || "dash"); return; }
    var meta = projectMeta(id);
    if (meta && meta.stub) {
      toast("Opening " + meta.name + "…");
      fetchStub(id, function (t) {
        if (!t) { toast("That property's file couldn't be loaded."); return; }
        switchProject(id, { force: true, view: opts.view || "dash" });
      });
      return;
    }
    switchProject(id, { view: opts.view || "dash" });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     DASHBOARD
     ═══════════════════════════════════════════════════════════════════════ */
  var dashFloor = "all";

  function buildDash() {
    var b = TOUR.brand || {}, p = TOUR.project || {};
    $("#heroEyebrow").textContent = [b.tagline, p.name].filter(Boolean).join("  ·  ");
    $("#heroTitle").innerHTML = p.beds
      ? esc(p.name || "") + "<br><em>" + esc(p.location || "walk it before you visit") + "</em>"
      : "Walk the building<br><em>before you visit</em>";
    $("#heroSummary").textContent = p.summary || "";
    $("#projName").textContent = p.name || "";
    $("#projCaptured").textContent = p.captured || "";
    $("#previewProject").textContent = "LIVE";
    $("#creditDash").innerHTML = b.credit
      ? '<a href="' + esc(b.creditHref || "#") + '" style="color:var(--ink-3)">' + esc(b.credit) + "</a>"
      : "";
    $("#buildInfo").textContent = TOUR.rooms.length + " positions · " + TOUR.floors.length + " floors · WebGL";
    $("#loadNote").textContent = (p.name || "") + " · " + (p.area || "") + " · " + (p.location || "");

    var meta = $("#heroMeta");
    meta.innerHTML = "";
    var facts = p.beds
      ? [[p.price, p.priceQualifier || (p.status || "Price")], [String(p.beds), "Bedrooms"],
         [p.baths ? String(p.baths) : "", "Bathrooms"], [p.area, "Floor area"],
         [String(TOUR.rooms.length), "Positions"]]
      : [[p.area, "Footprint"], [String(p.floors || TOUR.floors.length), "Floors"],
         [String(TOUR.rooms.length), "Positions"], [p.duration, "Walkthrough"]];
    facts.forEach(function (m) {
      if (!m[0]) return;
      var d = el("div", "stat");
      d.appendChild(el("b", null, m[0]));
      d.appendChild(el("span", null, m[1]));
      meta.appendChild(d);
    });

    var sg = $("#statGrid");
    sg.innerHTML = "";
    (p.facts || []).forEach(function (f) {
      var d = el("div");
      d.appendChild(el("b", null, f[1]));
      d.appendChild(el("span", null, f[0]));
      sg.appendChild(d);
    });

    var fs = $("#dashFloors");
    fs.innerHTML = "";
    [{ id: "all", short: "All" }].concat(TOUR.floors).forEach(function (f) {
      var btn = el("button", f.id === dashFloor ? "is-on" : "", f.short || f.name);
      btn.onclick = function () { dashFloor = f.id; buildRoomGrid(); $$("#dashFloors button").forEach(function (x) { x.classList.remove("is-on"); }); btn.classList.add("is-on"); };
      fs.appendChild(btn);
    });
    buildRoomGrid();
  }

  function buildRoomGrid() {
    var g = $("#roomGrid");
    g.innerHTML = "";
    TOUR.rooms.filter(function (r) { return dashFloor === "all" || r.floor === dashFloor; }).forEach(function (r) {
      var card = el("button", "card roomcard");
      card.setAttribute("data-room", r.id);
      var img = el("span", "roomcard-img");
      var cv = el("canvas");
      cv.width = 456; cv.height = 285;
      img.appendChild(cv);
      var chip = el("span", "chip roomcard-floor", floorOf(r.floor).short || "");
      var body = el("span", "roomcard-body");
      body.appendChild(el("h4", null, r.name));
      body.appendChild(el("p", null, [r.kind, r.area].filter(Boolean).join("  ·  ")));
      card.appendChild(img); card.appendChild(chip); card.appendChild(body);
      card.onclick = function () { enterTour(r.id); };
      g.appendChild(card);
      paintThumb(r.id);
    });
  }

  function paintThumb(id) {
    if (!engine) return;
    $$('[data-room="' + id + '"] canvas, [data-strip="' + id + '"] canvas, [data-rl="' + id + '"] canvas, [data-pal="' + id + '"] canvas').forEach(function (cv) {
      var t = engine.thumbnail(id, cv.width, cv.height);
      if (!t) return;
      cv.getContext("2d").drawImage(t, 0, 0, cv.width, cv.height);
      if (cv.parentNode) cv.parentNode.classList.add("is-ready");
    });
  }
  function paintAllThumbs() { TOUR.rooms.forEach(function (r) { paintThumb(r.id); }); }

  function enterTour(roomId, opts) {
    setView("tour");
    if (roomId && (!currentRoom || currentRoom.id !== roomId)) engine.go(roomId, opts);
    else if (opts) engine.go(currentRoom.id, Object.assign({ force: true }, opts));
  }

  /* ═══════════════════════════════════════════════════════════════════════
     TOUR — filmstrip, plan, panels
     ═══════════════════════════════════════════════════════════════════════ */
  function buildFilmstrip() {
    var wrap = $("#stripWrap");
    wrap.innerHTML = "";
    TOUR.floors.forEach(function (f) {
      var list = TOUR.rooms.filter(function (r) { return r.floor === f.id; });
      if (!list.length) return;
      var grp = el("div", "strip-group");
      list.forEach(function (r) {
        var item = el("button", "strip-item");
        item.setAttribute("data-strip", r.id);
        item.title = r.name + " · " + (r.area || "");
        var th = el("span", "strip-thumb");
        var cv = el("canvas"); cv.width = 232; cv.height = 140;
        th.appendChild(cv);
        item.appendChild(th);
        item.appendChild(el("span", "strip-name", r.short || r.name));
        item.onclick = function () { engine.go(r.id); };
        grp.appendChild(item);
      });
      wrap.appendChild(grp);
    });
    paintAllThumbs();
  }

  var planPins = {};
  function buildPlan() {
    var host = $("#planHost"), sw = $("#floorSwitch");
    host.innerHTML = ""; sw.innerHTML = ""; planPins = {};
    TOUR.floors.forEach(function (f) {
      var b = el("button", "", f.short || f.name);
      b.setAttribute("data-floor", f.id);
      b.onclick = function () { showFloor(f.id); };
      sw.appendChild(b);

      var box = el("div", "planfloor");
      box.setAttribute("data-floor", f.id);
      box.innerHTML =
        '<svg viewBox="0 0 120 80" role="img" aria-label="' + esc(f.name) + ' plan">' +
        '<defs><radialGradient id="cone-' + f.id + '" cx="0" cy="0" r="1" gradientUnits="objectBoundingBox">' +
        '<stop offset="0" stop-color="' + esc((TOUR.brand && TOUR.brand.accent) || "#FF2D46") + '" stop-opacity=".8"/>' +
        '<stop offset="1" stop-color="' + esc((TOUR.brand && TOUR.brand.accent) || "#FF2D46") + '" stop-opacity="0"/>' +
        "</radialGradient></defs>" +
        '<g class="fp-geo">' + (f.plan || "") + "</g><g class='fp-pins'></g></svg>";
      host.appendChild(box);

      var pins = $(".fp-pins", box);
      TOUR.rooms.filter(function (r) { return r.floor === f.id; }).forEach(function (r) {
        var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "pin");
        g.setAttribute("transform", "translate(" + (r.plan ? r.plan[0] : 60) + "," + (r.plan ? r.plan[1] : 40) + ")");
        g.innerHTML =
          '<path class="pin-cone" d="M0 0 L-11 -17 A20 20 0 0 0 11 -17 Z" fill="url(#cone-' + f.id + ')"/>' +
          '<circle class="pin-ring" r="3"/>' +
          '<circle class="pin-dot" r="2.3"/>' +
          '<circle class="pin-hit" r="6"/>' +
          '<text class="pin-lbl" y="6.2">' + esc(r.short || r.name) + "</text>";
        g.setAttribute("tabindex", "0");
        g.setAttribute("role", "button");
        g.setAttribute("aria-label", "Go to " + r.name);
        g.addEventListener("click", function () { engine.go(r.id); });
        g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); engine.go(r.id); } });
        pins.appendChild(g);
        planPins[r.id] = g;
      });
    });
  }
  function showFloor(id) {
    $$(".planfloor").forEach(function (n) { n.classList.toggle("is-on", n.getAttribute("data-floor") === id); });
    $$("#floorSwitch button").forEach(function (n) { n.classList.toggle("is-on", n.getAttribute("data-floor") === id); });
    $("#planFloorName").textContent = floorOf(id).name;
  }

  var HS_LABEL = { nav: "Walk through", info: "Information", image: "Image", video: "Video", doc: "Document", link: "External link" };
  var HS_ICON = { nav: "arrow", info: "info", image: "image", video: "play", doc: "doc", link: "link", sparkle: "sparkle" };

  function setRoom(room, prev) {
    currentRoom = room;
    $("#roomName").textContent = room.name;
    $("#roomMeta").textContent = [floorOf(room.floor).name, room.kind, room.area].filter(Boolean).join("  ·  ");
    $("#sideTitle").textContent = room.name;
    $("#previewRoom").textContent = room.name;
    $("#previewMeta").textContent = [floorOf(room.floor).short, room.area].filter(Boolean).join(" · ");

    var chips = $("#sideChips");
    chips.innerHTML = "";
    [room.kind, room.area, room.capacity, room.ceiling].filter(Boolean).forEach(function (c, i) {
      chips.appendChild(el("span", "chip" + (i === 0 ? " chip--accent" : ""), c));
    });
    $("#sideDesc").textContent = room.description || "";

    var stats = $("#sideStats");
    stats.innerHTML = "";
    [["Floor", floorOf(room.floor).name], ["Area", room.area], ["Capacity", room.capacity], ["Ceiling", room.ceiling]]
      .filter(function (s) { return s[1]; }).forEach(function (s) {
        stats.appendChild(el("dt", null, s[0]));
        stats.appendChild(el("dd", null, s[1]));
      });

    /* hotspots + links in the side panel */
    var hs = $("#sideHotspots"), lk = $("#sideLinks");
    hs.innerHTML = ""; lk.innerHTML = "";
    (room.hotspots || []).forEach(function (h) {
      var row = el("button", "hsrow hsrow--" + h.type);
      var ic = el("span", "hsrow-ico");
      ic.appendChild(icon(HS_ICON[h.icon] || HS_ICON[h.type] || "info"));
      var tx = el("span", "hsrow-txt");
      tx.appendChild(el("b", null, h.label || (h.to && roomsById[h.to] ? roomsById[h.to].name : "Hotspot")));
      tx.appendChild(el("span", null, HS_LABEL[h.type] || h.type));
      row.appendChild(ic); row.appendChild(tx);
      row.onclick = function () { activateHotspot(h, true); };
      (h.type === "nav" ? lk : hs).appendChild(row);
    });
    if (!hs.children.length) hs.appendChild(el("p", "t-body", "No media hotspots in this space."));
    if (!lk.children.length) lk.appendChild(el("p", "t-body", "This is a terminal position."));

    $$(".strip-item").forEach(function (n) { n.classList.toggle("is-on", n.getAttribute("data-strip") === room.id); });
    Object.keys(planPins).forEach(function (k) { planPins[k].classList.toggle("is-on", k === room.id); });
    showFloor(room.floor);

    var card = $('.strip-item[data-strip="' + room.id + '"]');
    if (card && card.scrollIntoView) card.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest", inline: "center" });

    renderHotspots(room);
    if (view === "tour") location.hash = "#/tour/" + room.id;
  }

  /* ── hotspots in the scene ─────────────────────────────────────────────── */
  function renderHotspots(room) {
    var layer = $("#hotspots");
    layer.innerHTML = "";
    hotEls = [];
    (room.hotspots || []).forEach(function (h, i) {
      var b = el("button", "hs hs--" + h.type);
      b.setAttribute("data-hs", h.id || i);
      var target = h.to && roomsById[h.to];
      var label = h.label || (target ? target.name : "Hotspot");
      b.setAttribute("aria-label", (h.type === "nav" ? "Walk to " : "Open ") + label);
      var mark = el("span", "hs-mark");
      if (h.type === "nav") mark.appendChild(el("span", "hs-arrow"));
      else mark.appendChild(icon(HS_ICON[h.icon] || HS_ICON[h.type] || "info"));
      b.appendChild(mark);
      b.appendChild(el("span", "hs-tag", label));
      b.onclick = function (ev) {
        ev.stopPropagation();
        if (placing) { selectHotspot(h); return; }
        activateHotspot(h);
      };
      layer.appendChild(b);
      hotEls.push({ el: b, h: h });
    });
    layoutHotspots(true);
  }

  /* Re-projecting the hotspot layer is a DOM write per hotspot. Skipping it
     when the camera hasn't actually moved keeps drags, scrolls and idle
     frames free of layout work. */
  var lastLayout = { yaw: 1e9, pitch: 1e9, fov: 0, n: -1, w: 0 };
  function layoutHotspots(force) {
    if (!engine) return;
    var c = engine.camera(), W = window.innerWidth;
    if (!force && hotEls.length === lastLayout.n && W === lastLayout.w &&
      Math.abs(c.yaw - lastLayout.yaw) < 0.02 && Math.abs(c.pitch - lastLayout.pitch) < 0.02 &&
      Math.abs(c.fov - lastLayout.fov) < 0.02) return;
    lastLayout = { yaw: c.yaw, pitch: c.pitch, fov: c.fov, n: hotEls.length, w: W };
    for (var i = 0; i < hotEls.length; i++) {
      var it = hotEls[i], pr = engine.project(it.h.yaw, it.h.pitch);
      if (!pr || pr[2] > 2.9) { it.el.style.opacity = 0; it.el.style.pointerEvents = "none"; continue; }
      var fade = Math.max(0, Math.min(1, 1 - (pr[2] - 1.55) / 1.1));
      var scale = 0.72 + 0.5 * Math.max(0, Math.min(1, 1 - pr[2] * 0.42));
      it.el.style.transform = "translate3d(" + (pr[0] | 0) + "px," + (pr[1] | 0) + "px,0) translate(-50%,-50%) scale(" + scale.toFixed(3) + ")";
      it.el.style.opacity = (0.32 + 0.68 * fade).toFixed(3);
      it.el.style.pointerEvents = fade > 0.14 ? "auto" : "none";
    }
  }

  function activateHotspot(h, fromPanel) {
    if (h.type === "nav" && roomsById[h.to]) { engine.go(h.to); return; }
    if (fromPanel && h.yaw != null) engine.look(h.yaw, h.pitch);
    openSheet(h);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     MEDIA SHEET
     ═══════════════════════════════════════════════════════════════════════ */
  var sheetOpen = false, lastFocus = null;

  function embedFor(h) {
    var src = h.src;
    if (!src) return null;
    if (src === "@equirect") {
      var cv = engine.equirect(currentRoom.id);
      if (!cv) return null;
      var out = document.createElement("canvas");
      out.width = cv.width; out.height = cv.height;
      out.getContext("2d").drawImage(cv, 0, 0);
      return out;
    }
    var yt = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/.exec(src);
    var vm = /vimeo\.com\/(\d+)/.exec(src);
    if (yt || vm) {
      var f = el("iframe");
      f.src = yt ? "https://www.youtube-nocookie.com/embed/" + yt[1] : "https://player.vimeo.com/video/" + vm[1];
      f.allow = "accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen";
      f.setAttribute("allowfullscreen", "");
      f.setAttribute("title", h.label || "Video");
      return f;
    }
    if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(src)) {
      var v = el("video");
      v.src = src; v.controls = true; v.playsInline = true; v.preload = "metadata";
      if (h.poster) v.poster = h.poster;
      return v;
    }
    if (/\.pdf(\?|$)/i.test(src)) {
      var o = document.createElement("object");
      o.data = src; o.type = "application/pdf";
      o.style.width = "100%"; o.style.height = "440px";
      o.appendChild(el("p", "t-body", "Your browser can't display the PDF inline."));
      return o;
    }
    var im = el("img");
    im.src = src; im.alt = h.label || "";
    im.loading = "lazy";
    return im;
  }

  function openSheet(h) {
    lastFocus = document.activeElement;
    $("#sheetKind").textContent = HS_LABEL[h.type] || "Information";
    $("#sheetTitle").textContent = h.label || currentRoom.name;
    var body = $("#sheetBody"), foot = $("#sheetFoot");
    body.innerHTML = ""; foot.innerHTML = "";

    var media = embedFor(h);
    if (media) {
      var box = el("div", "sheet-media");
      box.appendChild(media);
      body.appendChild(box);
    } else if (h.type === "video" || h.type === "image" || (h.type === "doc" && h.src)) {
      var empty = el("div", "sheet-empty");
      empty.appendChild(icon(HS_ICON[h.type] || "image"));
      empty.appendChild(el("p", null, "Media slot — attach a file or a URL to this hotspot in Studio and it plays here, inside the tour."));
      body.appendChild(empty);
    }

    if (h.body) {
      var p = el("p", "t-body", h.body);
      p.style.marginBottom = "18px";
      body.appendChild(p);
    }
    if (h.stats && h.stats.length) {
      var dl = el("dl", "dl");
      dl.style.borderTop = "1px solid var(--line)";
      dl.style.paddingTop = "16px";
      h.stats.forEach(function (s) {
        dl.appendChild(el("dt", null, s[0]));
        dl.appendChild(el("dd", null, s[1]));
      });
      body.appendChild(dl);
    }

    if (h.type === "link" && h.href) {
      var a = el("a", "btn btn--primary", "Open link");
      a.href = h.href; a.target = "_blank"; a.rel = "noopener";
      a.appendChild(icon("arrow"));
      foot.appendChild(a);
    }
    if (h.to && roomsById[h.to]) {
      var g = el("button", "btn btn--primary", "Walk to " + roomsById[h.to].name);
      g.onclick = function () { closeSheet(); engine.go(h.to); };
      foot.appendChild(g);
    }
    var back = el("button", "btn", "Close");
    back.onclick = closeSheet;
    foot.appendChild(back);

    $("#sheet").classList.add("is-on");
    $("#scrim").classList.add("is-on");
    sheetOpen = true;
    engine && engine.inputs(false);
    setTimeout(function () { $("#btnSheetClose").focus(); }, 60);
  }
  function closeSheet() {
    if (!sheetOpen) return;
    $("#sheet").classList.remove("is-on");
    if (!paletteOpen) $("#scrim").classList.remove("is-on");
    $("#sheetBody").innerHTML = "";
    sheetOpen = false;
    engine && engine.inputs(view !== "dash" || !coarse);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ═══════════════════════════════════════════════════════════════════════
     COMMAND PALETTE
     ═══════════════════════════════════════════════════════════════════════ */
  var paletteOpen = false, palItems = [], palSel = 0, palOnly = null;
  var palPlaceholder = "Search rooms, hotspots, actions…";

  function paletteData() {
    var out = [];
    TOUR.rooms.forEach(function (r) {
      out.push({
        group: floorOf(r.floor).name, kind: "room", id: r.id,
        title: r.name, sub: [r.kind, r.area, r.capacity].filter(Boolean).join(" · "),
        terms: (r.name + " " + r.kind + " " + (r.short || "") + " " + (r.description || "")).toLowerCase(),
        run: function () { closePalette(); enterTour(r.id); }
      });
    });
    TOUR.rooms.forEach(function (r) {
      (r.hotspots || []).forEach(function (h) {
        if (h.type === "nav") return;
        out.push({
          group: "Hotspots", kind: "hotspot", icon: HS_ICON[h.icon] || HS_ICON[h.type],
          title: h.label || "Hotspot", sub: r.name + " · " + (HS_LABEL[h.type] || h.type),
          terms: ((h.label || "") + " " + (h.body || "") + " " + r.name).toLowerCase(),
          run: function () {
            closePalette();
            setView("tour");
            if (currentRoom && currentRoom.id === r.id) activateHotspot(h, true);
            else { engine.go(r.id); setTimeout(function () { activateHotspot(h, true); }, 900); }
          }
        });
      });
    });
    /* every property in this deployment, so ⌘K switches building as easily as
       it switches room */
    visibleSites().forEach(function (m) {
      var id = m.id, p = m.project;
      out.push({
        group: "Properties", kind: "project", icon: "building",
        title: "Open " + m.name + (id === PROJECT ? " · current" : ""),
        sub: [p.price, p.location, m.rooms + " positions"].filter(Boolean).join(" · "),
        terms: ("open property building " + siteTerms(m)),
        run: function () { closePalette(); openSite(id); }
      });
    });
    var acts = [
      { title: "Start guided walkthrough", sub: "Play the automatic tour", ic: "play", run: function () { closePalette(); setView("tour"); guidedStart(); } },
      { title: "Export a still", sub: "PNG of the current view", ic: "camera", run: function () { closePalette(); shot(); } },
      { title: "Copy link to this view", sub: "Deep link with the exact angle", ic: "share", run: function () { closePalette(); share(); } },
      { title: "Back to overview", sub: "This property's dashboard", ic: "home", run: function () { closePalette(); setView("dash"); } },
      { title: "Toggle fullscreen", sub: "Immersive mode", ic: "expand", run: function () { closePalette(); toggleFull(); } },
      { title: "Rendering quality · High", sub: "4K panoramas — best on a dedicated GPU", ic: "settings", run: function () { closePalette(); engine.quality("hi"); toast("Rendering at full resolution."); } },
      { title: "Rendering quality · Balanced", sub: "Matches the panorama size to your hardware", ic: "settings", run: function () { closePalette(); engine.quality("auto"); toast("Quality set to automatic."); } },
      { title: "Rendering quality · Low", sub: "Smaller panoramas — for older machines", ic: "settings", run: function () { closePalette(); engine.quality("lo"); toast("Rendering at low quality."); } }
    ];
    if (SITES_ON) {
      acts.unshift({ title: "All properties", sub: "Back to the portfolio", ic: "building", run: function () { closePalette(); setView("sites"); } });
    }
    if (isAdmin()) {
      acts.splice(1, 0,
        { title: "Add a property", sub: "A new building in this deployment", ic: "plus", run: function () { closePalette(); gotoStudio("sites"); } },
        { title: "Add a space", sub: "New position in this property", ic: "plus", run: function () { closePalette(); if (gotoStudio("rooms")) openAddRoom(); } },
        { title: "Open content studio", sub: "Rooms, hotspots, branding, publish", ic: "edit", run: function () { closePalette(); gotoStudio(); } },
        { title: "Sign out of the Studio", sub: "Hide the editing tools again", ic: "lock", run: function () { closePalette(); adminSignOut(); } });
    } else if (adminLocked()) {
      acts.push({ title: "Studio sign-in", sub: "For the agency, not for visitors", ic: "lock", run: function () { closePalette(); openLock(function () { setView("studio", { force: true }); }); } });
    }
    acts.forEach(function (a) {
      out.push({ group: "Actions", kind: "action", icon: a.ic, title: a.title, sub: a.sub, terms: (a.title + " " + a.sub).toLowerCase(), run: a.run });
    });
    return out;
  }

  /* opts.only narrows the palette to one kind — the project switcher opens
     straight onto the list of buildings instead of everything in the tour */
  function openPalette(opts) {
    paletteOpen = true;
    palOnly = (opts && opts.only) || null;
    $("#palette").classList.add("is-on");
    $("#scrim").classList.add("is-on");
    $("#paletteInput").value = "";
    $("#paletteInput").placeholder = (opts && opts.placeholder) || palPlaceholder;
    filterPalette("");
    engine && engine.inputs(false);
    setTimeout(function () { $("#paletteInput").focus(); }, 40);
  }
  function closePalette() {
    if (!paletteOpen) return;
    paletteOpen = false;
    palOnly = null;
    $("#paletteInput").placeholder = palPlaceholder;
    $("#palette").classList.remove("is-on");
    if (!sheetOpen) $("#scrim").classList.remove("is-on");
    engine && engine.inputs(view !== "dash" || !coarse);
  }
  function filterPalette(q) {
    q = (q || "").trim().toLowerCase();
    var all = paletteData();
    if (palOnly) all = all.filter(function (i) { return i.kind === palOnly; });
    palItems = q ? all.filter(function (i) { return i.terms.indexOf(q) >= 0 || i.title.toLowerCase().indexOf(q) >= 0; }) : all;
    palSel = 0;
    var list = $("#paletteList");
    list.innerHTML = "";
    if (!palItems.length) {
      list.appendChild(el("p", "palette-empty", "Nothing matches “" + q + "”."));
      $("#paletteCount").textContent = "";
      return;
    }
    var group = null;
    palItems.forEach(function (item, i) {
      if (item.group !== group) {
        group = item.group;
        list.appendChild(el("p", "palette-group", group));
      }
      var b = el("button", "palette-item" + (i === 0 ? " is-sel" : ""));
      b.setAttribute("data-idx", i);
      if (item.kind === "room") {
        var th = el("span", "palette-thumb");
        th.setAttribute("data-pal", item.id);
        var cv = el("canvas"); cv.width = 92; cv.height = 60;
        th.appendChild(cv);
        b.appendChild(th);
      } else {
        var ic = el("span", "palette-ico");
        ic.appendChild(icon(item.icon || "arrow"));
        b.appendChild(ic);
      }
      var tx = el("span", "palette-txt");
      tx.appendChild(el("b", null, item.title));
      tx.appendChild(el("span", null, item.sub || ""));
      b.appendChild(tx);
      b.appendChild(el("span", "palette-hint", item.kind === "room" ? "GO" : item.kind === "hotspot" ? "OPEN" : "RUN"));
      b.onmouseenter = function () { selectPal(i); };
      b.onclick = function () { item.run(); };
      list.appendChild(b);
      if (item.kind === "room") paintThumb(item.id);
    });
    $("#paletteCount").textContent = palItems.length + " result" + (palItems.length === 1 ? "" : "s");
  }
  function selectPal(i) {
    palSel = Math.max(0, Math.min(palItems.length - 1, i));
    $$(".palette-item").forEach(function (n) { n.classList.toggle("is-sel", +n.getAttribute("data-idx") === palSel); });
    var sel = $('.palette-item[data-idx="' + palSel + '"]');
    if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: "nearest" });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     GUIDED TOUR
     ═══════════════════════════════════════════════════════════════════════ */
  var guided = { on: false, timer: 0, at: 0, speed: 1, dwell: 9000, t0: 0, raf: 0 };
  var SPEEDS = [0.5, 0.75, 1, 1.5, 2];

  function guidedOrder() {
    var o = (TOUR.guided && TOUR.guided.order) || [];
    o = o.filter(function (id) { return roomsById[id]; });
    return o.length ? o : TOUR.rooms.map(function (r) { return r.id; });
  }
  function guidedStart() {
    var order = guidedOrder();
    guided.on = true;
    guided.dwell = (TOUR.guided && TOUR.guided.dwell) || 9000;
    guided.at = Math.max(0, order.indexOf(currentRoom ? currentRoom.id : order[0]));
    guided.t0 = performance.now();
    $("#transport").classList.add("is-on");
    $("#transport").classList.remove("is-off");
    $("#btnPlay").classList.add("is-on");
    $("#btnPlay").setAttribute("aria-pressed", "true");
    setPlayIcon(true);
    engine.autoRotate(true, 0.0055);
    tickGuided();
    hideHint();
  }
  function guidedStop(silent) {
    guided.on = false;
    cancelAnimationFrame(guided.raf);
    $("#transport").classList.remove("is-on");
    $("#transport").classList.add("is-off");
    $("#btnPlay").classList.remove("is-on");
    $("#btnPlay").setAttribute("aria-pressed", "false");
    engine && engine.autoRotate(false);
    if (!silent) toast("Guided walkthrough stopped.");
  }
  function guidedPause() {
    guided.paused = !guided.paused;
    setPlayIcon(!guided.paused);
    engine.autoRotate(!guided.paused, 0.0055);
    if (!guided.paused) guided.t0 = performance.now() - guided.elapsed;
  }
  function setPlayIcon(playing) {
    var b = $("#btnPlayPause");
    b.innerHTML = "";
    b.appendChild(icon(playing ? "pause" : "play"));
    b.title = playing ? "Pause" : "Play";
    b.setAttribute("aria-label", playing ? "Pause guided tour" : "Resume guided tour");
  }
  function guidedGo(delta) {
    var order = guidedOrder();
    guided.at = (guided.at + delta + order.length) % order.length;
    guided.t0 = performance.now();
    guided.elapsed = 0;
    engine.go(order[guided.at]);
  }
  function tickGuided() {
    if (!guided.on) return;
    var span = guided.dwell / guided.speed;
    if (!guided.paused) {
      guided.elapsed = performance.now() - guided.t0;
      if (guided.elapsed >= span) guidedGo(1);
    }
    $("#transportFill").style.transform = "scaleX(" + Math.min(1, (guided.elapsed || 0) / span).toFixed(3) + ")";
    guided.raf = requestAnimationFrame(tickGuided);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     TOOLBAR ACTIONS
     ═══════════════════════════════════════════════════════════════════════ */
  function share() {
    var c = engine.camera();
    var url = new URL(location.href);
    url.hash = "#/tour/" + currentRoom.id;
    url.searchParams.set("y", c.yaw.toFixed(1));
    url.searchParams.set("p", c.pitch.toFixed(1));
    url.searchParams.set("f", c.fov.toFixed(0));
    var link = url.toString();
    if (navigator.share && coarse) { navigator.share({ title: document.title, url: link }).catch(function () { }); return; }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link).then(
        function () { toast("Link copied — it opens on this exact angle."); },
        function () { prompt("Copy this link", link); });
    } else prompt("Copy this link", link);
  }
  function shot() {
    var data = engine.capture();
    if (!data) { toast("Couldn't export the frame."); return; }
    var a = el("a");
    a.download = (TOUR.project.name || "tour").toLowerCase().replace(/\s+/g, "-") + "-" + currentRoom.id + ".png";
    a.href = data;
    a.click();
    toast("Still exported.");
  }
  function toggleFull() {
    var host = $("#app");
    if (!document.fullscreenElement) (host.requestFullscreen || host.webkitRequestFullscreen || function () { }).call(host);
    else document.exitFullscreen();
  }
  function hideHint() {
    $("#hint").classList.remove("is-on");
    sessionStorage.setItem("red360:hinted", "1");
  }
  function togglePanels(force) {
    panelsHidden = force != null ? force : !panelsHidden;
    $("#panelLeft").classList.toggle("is-hidden", panelsHidden);
    $("#panelRight").classList.toggle("is-hidden", panelsHidden);
    $("#btnPanels").classList.toggle("is-on", !panelsHidden);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     STUDIO (CMS)
     ═══════════════════════════════════════════════════════════════════════ */
  var STUDIO_TITLES = {
    rooms: ["Rooms", "Every position in the tour"],
    hotspots: ["Hotspots", "Click inside the panorama to place one"],
    plans: ["Floor plans", "The interactive minimap"],
    brand: ["Branding", "One block drives the entire interface"],
    sites: ["Properties", "Every building in this deployment"],
    access: ["Access", "Who can open the Studio"],
    publish: ["Publish", "Save, export and embed"]
  };

  function renderStudio() {
    if (!STUDIO_TITLES[studioTab]) studioTab = "rooms";
    $$("#studioNav button").forEach(function (b) { b.classList.toggle("is-on", b.getAttribute("data-tab") === studioTab); });
    $("#studioTitle").textContent = STUDIO_TITLES[studioTab][0];
    $("#studioSub").textContent = STUDIO_TITLES[studioTab][1];
    var body = $("#studioBody");
    parkStage();
    body.innerHTML = "";
    if (studioTab === "rooms") studioRooms(body);
    else if (studioTab === "hotspots") studioHotspots(body);
    else if (studioTab === "plans") studioPlans(body);
    else if (studioTab === "brand") studioBrand(body);
    else if (studioTab === "sites") studioSites(body);
    else if (studioTab === "access") studioAccess(body);
    else studioPublish(body);
    markSaved(dirty ? "Unsaved changes" : "Saved", dirty);
    /* the tab can change without going through the router — keep the address
       bar honest so a deep link always reopens what you were looking at */
    if (view === "studio") {
      var want = "#/studio/" + studioTab;
      if (location.hash !== want) location.hash = want;
    }
  }

  function field(label, node) {
    var f = el("div", "field");
    f.appendChild(el("label", null, label));
    f.appendChild(node);
    return f;
  }
  function input(value, oninput, placeholder) {
    var i = el("input", "input");
    i.value = value == null ? "" : value;
    if (placeholder) i.placeholder = placeholder;
    i.oninput = function () { oninput(i.value); markDirty(); };
    return i;
  }
  function textarea(value, oninput) {
    var t = el("textarea", "textarea");
    t.value = value || "";
    t.oninput = function () { oninput(t.value); markDirty(); };
    return t;
  }
  function select(options, value, onchange) {
    var s = el("select", "select");
    options.forEach(function (o) {
      var op = el("option", null, o[1]);
      op.value = o[0];
      if (o[0] === value) op.selected = true;
      s.appendChild(op);
    });
    s.onchange = function () { onchange(s.value); markDirty(); };
    return s;
  }
  function roomListPanel(onPick) {
    var wrap = el("div", "studio-panel card");
    var head = el("div");
    head.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:14px";
    var h = el("h4", null, "Positions");
    h.style.margin = "0";
    var add = el("button", "btn btn--sm btn--primary");
    add.id = "btnAddRoom";
    add.style.marginLeft = "auto";
    add.appendChild(icon("plus"));
    add.appendChild(document.createTextNode("Add space"));
    add.onclick = openAddRoom;
    head.appendChild(h); head.appendChild(add);
    wrap.appendChild(head);
    var list = el("div", "roomlist");
    TOUR.rooms.forEach(function (r) {
      var b = el("button", "roomlist-item" + (r.id === studioRoomId ? " is-on" : ""));
      b.setAttribute("data-rl", r.id);
      var th = el("span", "roomlist-thumb");
      var cv = el("canvas"); cv.width = 108; cv.height = 68;
      th.appendChild(cv);
      var tx = el("span", "roomlist-txt");
      tx.appendChild(el("b", null, r.name));
      tx.appendChild(el("span", null, floorOf(r.floor).short + " · " + (r.hotspots || []).length + " hotspots"));
      b.appendChild(th); b.appendChild(tx);
      b.onclick = function () { studioRoomId = r.id; onPick(r); };
      list.appendChild(b);
      setTimeout(function () { paintThumb(r.id); }, 0);
    });
    wrap.appendChild(list);
    return wrap;
  }

  /* inline "add a space" form — name, floor, and which furniture set the
     synthesised room should use until a real capture replaces it */
  function openAddRoom() {
    var box = $("#addRoomForm");
    if (box) { box.parentNode.removeChild(box); return; }
    var wrap = el("div", "studio-panel card");
    wrap.id = "addRoomForm";
    wrap.style.marginBottom = "14px";
    wrap.appendChild(el("h4", null, "Add a space"));
    var g = el("div", "form-grid");
    var nameI = el("input", "input");
    nameI.id = "addRoomName";
    nameI.placeholder = "e.g. Meeting Room · Trent";
    g.appendChild(field("Name", nameI));
    var row = el("div", "form-row");
    var floorS = select(TOUR.floors.map(function (f) { return [f.id, f.name]; }), TOUR.floors[0].id, function () { });
    var layoutS = select(LAYOUTS.map(function (l) { return [String(l[0]), l[1]]; }), "0", function () { });
    floorS.id = "addRoomFloor";
    layoutS.id = "addRoomLayout";
    row.appendChild(field("Floor", floorS));
    row.appendChild(field("Space type", layoutS));
    g.appendChild(row);
    g.appendChild(el("p", "t-body", "The space type only decides what the placeholder room looks like. " +
      "Drop a real capture on it afterwards and the type stops mattering."));
    var act = el("div");
    act.style.cssText = "display:flex;gap:8px";
    var go = el("button", "btn btn--sm btn--primary", "Create space");
    go.id = "btnAddRoomGo";
    go.onclick = function () {
      addRoom(nameI.value.trim() || "New space", floorS.value, +layoutS.value);
    };
    var cancel = el("button", "btn btn--sm", "Cancel");
    cancel.onclick = function () { wrap.parentNode.removeChild(wrap); };
    act.appendChild(go); act.appendChild(cancel);
    g.appendChild(act);
    wrap.appendChild(g);
    var body = $("#studioBody");
    body.insertBefore(wrap, body.firstChild);
    nameI.focus();
  }

  /* ── Studio · rooms ────────────────────────────────────────────────────── */
  function studioRooms(body) {
    if (!studioRoomId) studioRoomId = (currentRoom || TOUR.rooms[0]).id;
    var room = roomsById[studioRoomId] || TOUR.rooms[0];
    var cols = el("div", "studio-cols");
    var main = el("div", "studio-panel card");
    main.appendChild(el("h4", null, "Room detail"));

    var grid = el("div", "form-grid");
    var row1 = el("div", "form-row");
    row1.appendChild(field("Name", input(room.name, function (v) { room.name = v; refreshAfterEdit(); })));
    row1.appendChild(field("Short label", input(room.short, function (v) { room.short = v; refreshAfterEdit(); })));
    grid.appendChild(row1);

    var row2 = el("div", "form-row");
    row2.appendChild(field("Floor", select(TOUR.floors.map(function (f) { return [f.id, f.name]; }), room.floor, function (v) { room.floor = v; refreshAfterEdit(); })));
    row2.appendChild(field("Type", input(room.kind, function (v) { room.kind = v; refreshAfterEdit(); }, "Meeting, Social…")));
    grid.appendChild(row2);

    var row3 = el("div", "form-row");
    row3.appendChild(field("Area", input(room.area, function (v) { room.area = v; refreshAfterEdit(); })));
    row3.appendChild(field("Capacity", input(room.capacity, function (v) { room.capacity = v; refreshAfterEdit(); })));
    grid.appendChild(row3);

    grid.appendChild(field("Description", textarea(room.description, function (v) { room.description = v; refreshAfterEdit(); })));

    /* panorama */
    var panoBox = el("div", "field");
    panoBox.appendChild(el("label", null, "Panorama"));
    var drop = el("div", "drop");
    drop.appendChild(icon("upload"));
    var dtxt = el("p", null, room.pano
      ? "Capture attached — click to replace"
      : "Drop an equirectangular capture here, or click to choose. Matterport, Insta360, Ricoh Theta or any 2:1 JPEG.");
    drop.appendChild(dtxt);
    var file = el("input");
    file.type = "file"; file.accept = "image/*"; file.style.display = "none";
    drop.onclick = function () { file.click(); };
    drop.ondragover = function (e) { e.preventDefault(); drop.classList.add("is-over"); };
    drop.ondragleave = function () { drop.classList.remove("is-over"); };
    drop.ondrop = function (e) {
      e.preventDefault(); drop.classList.remove("is-over");
      if (e.dataTransfer.files[0]) readPano(e.dataTransfer.files[0]);
    };
    file.onchange = function () { if (file.files[0]) readPano(file.files[0]); };
    function readPano(f) {
      var fr = new FileReader();
      fr.onload = function () {
        room.pano = fr.result;
        engine.setPano(room.id, fr.result);
        dtxt.textContent = "Capture attached — click to replace";
        markDirty();
        toast("Panorama attached to " + room.name + ".");
      };
      fr.readAsDataURL(f);
    }
    panoBox.appendChild(drop);
    panoBox.appendChild(file);
    if (room.pano) {
      var rm = el("button", "btn btn--sm btn--danger", "Remove capture · use the synthesised space");
      rm.style.marginTop = "8px";
      rm.onclick = function () {
        room.pano = null;
        engine.rebake(room.id);
        markDirty(); renderStudio();
        toast("Reverted to the synthesised space.");
      };
      panoBox.appendChild(rm);
    }
    grid.appendChild(panoBox);
    main.appendChild(grid);

    /* opening view */
    var vbox = el("div", "studio-panel card");
    vbox.style.marginTop = "16px";
    vbox.appendChild(el("h4", null, "Opening view"));
    var vrow = el("div", "form-row");
    vrow.appendChild(field("Yaw", input((room.view && room.view.yaw) || 0, function (v) { room.view = room.view || {}; room.view.yaw = +v || 0; })));
    vrow.appendChild(field("Pitch", input((room.view && room.view.pitch) || 0, function (v) { room.view = room.view || {}; room.view.pitch = +v || 0; })));
    vbox.appendChild(vrow);
    var setView2 = el("button", "btn btn--sm");
    setView2.appendChild(icon("target"));
    setView2.appendChild(document.createTextNode("Use the current camera angle"));
    setView2.style.marginTop = "12px";
    setView2.onclick = function () {
      var c = engine.camera();
      room.view = { yaw: +c.yaw.toFixed(2), pitch: +c.pitch.toFixed(2), fov: +c.fov.toFixed(1) };
      markDirty(); renderStudio();
      toast("Opening view for " + room.name + " set.");
    };
    vbox.appendChild(setView2);
    main.appendChild(vbox);

    var danger = el("div");
    danger.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:16px";
    var dup = el("button", "btn btn--sm");
    dup.id = "btnRoomDuplicate";
    dup.appendChild(icon("rooms"));
    dup.appendChild(document.createTextNode("Duplicate this space"));
    dup.onclick = function () { duplicateRoom(room); };
    var del = el("button", "btn btn--sm btn--danger");
    del.id = "btnRoomDelete";
    del.appendChild(icon("trash"));
    del.appendChild(document.createTextNode("Delete this space"));
    del.onclick = function () { deleteRoom(room); };
    danger.appendChild(dup); danger.appendChild(del);
    main.appendChild(danger);

    cols.appendChild(main);
    var side = roomListPanel(function () { renderStudio(); });
    cols.appendChild(side);
    body.appendChild(cols);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     PROJECTS
     ═══════════════════════════════════════════════════════════════════════ */
  function switchProject(id, opts) {
    if (id === PROJECT && !(opts && opts.force)) return;
    var next = loadTour(id);
    if (!next) { toast("That project couldn't be loaded."); return; }
    if (dirty) saveTour(true);
    PROJECT = id;
    TOUR = next;
    try { localStorage.setItem("red360:project", id); } catch (e) { }
    dirty = false;
    selectedHotspot = null;
    studioRoomId = null;
    dashFloor = "all";        // the old floor id may not exist in this building
    forgetMeta();
    indexRooms();
    applyBrand();
    engine.load(TOUR);
    buildDash(); buildFilmstrip(); buildPlan();
    engine.go(TOUR.rooms[0].id, { force: true });
    renderProjectSwitch();
    var u = new URL(location.href);
    u.searchParams["delete"]("p");
    u.searchParams.set("site", id);
    history.replaceState(null, "", u);
    if (opts && opts.view) setView(opts.view, { force: true });
    else if (view === "sites") setView("dash", { force: true });
    if (!(opts && opts.silent)) toast("Opened " + ((TOUR.project && TOUR.project.name) || id) + ".");
  }

  function renderProjectSwitch() {
    var host = $("#projectSwitch");
    if (!host) return;
    var ids = projectIds();
    host.style.display = ids.length > 1 ? "" : "none";
    host.innerHTML = "";
    var label = el("span", null, (TOUR.project && TOUR.project.name) || PROJECT);
    host.appendChild(icon(SITES_ON ? "building" : "rooms"));
    host.appendChild(label);
    host.appendChild(icon("arrow"));
    host.onclick = function () {
      if (SITES_ON) setView("sites");
      else openPalette({ only: "project", placeholder: "Switch property…" });
    };
    host.title = SITES_ON ? "Back to all " + ids.length + " properties"
      : ids.length + " properties — click to switch";
    $$(".sites-only").forEach(function (n) { n.hidden = !SITES_ON; });
  }

  function blankTour(name) {
    var b = JSON.parse(JSON.stringify(TOUR.brand || {}));
    var id = slug(name) + "-" + Math.random().toString(36).slice(2, 6);
    return {
      id: id, version: 2, brand: b,
      project: { name: name, slug: id, location: "", area: "", floors: 1, duration: "2 min",
        captured: "", summary: "A new property. Add spaces in Studio → Rooms.",
        price: "", status: (PORTFOLIO.statuses || ["For sale"])[0], beds: null, baths: null,
        propertyType: "", tenure: "", epc: "", ref: "", cover: "space-1", hidden: true,
        agent: JSON.parse(JSON.stringify((TOUR.project && TOUR.project.agent) || {})),
        facts: [["Positions", "1"], ["Floors", "1"]] },
      guided: { dwell: 9000, order: ["space-1"] },
      floors: [{
        id: "g", name: "Ground Floor", short: "G",
        plan: '<rect class="fp-out" x="6" y="6" width="108" height="68" rx="2"/>' +
              '<rect class="fp-rm" x="6" y="6" width="108" height="68"/>' +
              '<path class="fp-glaze" d="M6 74h108"/>'
      }],
      rooms: [newRoom("Space 1", "g", 0)]
    };
  }

  var LAYOUTS = [
    [0, "Reception"], [1, "Atrium / social"], [2, "Café"], [3, "Event hall"],
    [4, "Board room"], [5, "Open workspace"], [6, "Meeting room"], [7, "Focus booths"],
    [8, "Terrace (open roof)"], [9, "Hallway"], [10, "Lounge"]
  ];
  var LAYOUT_SPACE = {
    0: { w: 11.5, h: 3.6, d: 9.5, cam: [0, 0.2] },
    1: { w: 14, h: 6.6, d: 12.5, cam: [0, 2.4] },
    2: { w: 12.5, h: 3.4, d: 10.5, cam: [0.4, 1.9] },
    3: { w: 17, h: 4.8, d: 15, cam: [0, 5.0] },
    4: { w: 9, h: 3.2, d: 11, cam: [0, 3.0] },
    5: { w: 19, h: 3.5, d: 15, cam: [1.6, 1.3] },
    6: { w: 6.6, h: 3.0, d: 7.8, cam: [0, 2.2] },
    7: { w: 10.5, h: 3.2, d: 8.5, cam: [0, 2.1] },
    8: { w: 15, h: 3.1, d: 9.5, cam: [0, 1.6], open: true, glaze2: "+x", warm: 1 },
    9: { w: 3.4, h: 2.9, d: 16, cam: [0, 1.2] },
    10: { w: 9, h: 3.2, d: 8.5, cam: [0, 2.2], warm: 0.35 }
  };

  function newRoom(name, floorId, layout) {
    var base = LAYOUT_SPACE[layout] || LAYOUT_SPACE[0];
    var id = slug(name) + "-" + Math.random().toString(36).slice(2, 5);
    return {
      id: id, name: name, short: name, kind: (LAYOUTS[layout] || LAYOUTS[0])[1], floor: floorId,
      area: "", capacity: "", ceiling: "", description: "",
      plan: [60, 40], north: -90,
      view: { yaw: 0, pitch: -6, fov: 80 },
      pano: null,
      space: {
        w: base.w, h: base.h, d: base.d, eye: 1.62, cam: base.cam.slice(),
        layout: layout, glaze: "+z", glaze2: base.glaze2, open: !!base.open,
        seed: +(Math.random() * 30).toFixed(1), exposure: 1.04, city: 1, warm: base.warm || 0,
        palette: JSON.parse(JSON.stringify(
          (TOUR.rooms && TOUR.rooms[0] && TOUR.rooms[0].space && TOUR.rooms[0].space.palette) ||
          { wall: "#e2e6ec", floor: "#87837c", accent: "#7a1220", light: "#ffe8c8", wood: "#b78448", fabric: "#42536b" }))
      },
      hotspots: []
    };
  }

  function addRoom(name, floorId, layout) {
    var room = newRoom(name || "New space", floorId || TOUR.floors[0].id, layout || 0);
    TOUR.rooms.push(room);
    (TOUR.guided = TOUR.guided || {}).order = (TOUR.guided.order || []).concat([room.id]);
    indexRooms();
    engine.load(TOUR);
    studioRoomId = room.id;
    markDirty();
    buildDash(); buildFilmstrip(); buildPlan();
    engine.go(room.id, { force: true });
    renderStudio();
    toast(room.name + " added — it renders as soon as you open it.");
    return room;
  }

  function deleteRoom(room) {
    if (TOUR.rooms.length < 2) { toast("A tour needs at least one space."); return; }
    if (!confirm("Delete " + room.name + "? Hotspots pointing at it will be removed too.")) return;
    TOUR.rooms = TOUR.rooms.filter(function (r) { return r !== room; });
    TOUR.rooms.forEach(function (r) {
      r.hotspots = (r.hotspots || []).filter(function (h) { return h.to !== room.id; });
    });
    if (TOUR.guided) TOUR.guided.order = (TOUR.guided.order || []).filter(function (i) { return i !== room.id; });
    indexRooms();
    engine.load(TOUR);
    studioRoomId = TOUR.rooms[0].id;
    markDirty();
    buildDash(); buildFilmstrip(); buildPlan();
    engine.go(TOUR.rooms[0].id, { force: true });
    renderStudio();
    toast("Deleted.");
  }

  function duplicateRoom(room) {
    var copy = JSON.parse(JSON.stringify(room));
    copy.id = slug(room.name) + "-" + Math.random().toString(36).slice(2, 5);
    copy.name = room.name + " (copy)";
    copy.short = (room.short || room.name) + " (copy)";
    /* nudge the pin so the copy isn't hidden underneath the original */
    copy.plan = [Math.min(114, (room.plan || [60, 40])[0] + 5), Math.min(74, (room.plan || [60, 40])[1] + 5)];
    copy.space = copy.space || null;
    if (copy.space) copy.space.seed = +(Math.random() * 30).toFixed(1);
    copy.hotspots = (copy.hotspots || []).map(function (h) {
      h.id = "h" + Math.random().toString(36).slice(2, 7);
      return h;
    });
    TOUR.rooms.splice(TOUR.rooms.indexOf(room) + 1, 0, copy);
    indexRooms();
    engine.load(TOUR);
    studioRoomId = copy.id;
    markDirty();
    buildDash(); buildFilmstrip(); buildPlan();
    engine.go(copy.id, { force: true });
    renderStudio();
    toast("Duplicated.");
  }

  function refreshAfterEdit() {
    indexRooms();
    if (currentRoom) setRoom(roomsById[currentRoom.id] || TOUR.rooms[0]);
    buildFilmstrip(); buildPlan(); buildDash();
    if (currentRoom) showFloor(currentRoom.floor);
  }

  /* ── Studio · hotspots ─────────────────────────────────────────────────── */
  function studioHotspots(body) {
    if (!studioRoomId) studioRoomId = (currentRoom || TOUR.rooms[0]).id;
    var room = roomsById[studioRoomId];
    if (currentRoom && currentRoom.id !== room.id) engine.go(room.id);

    var cols = el("div", "studio-cols");
    var main = el("div");

    /* live placement surface — the real engine, mounted here */
    var pv = el("div", "studio-preview");
    pv.id = "studioStage";
    main.appendChild(pv);

    var bar = el("div");
    bar.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin:14px 0";
    var place = el("button", "btn btn--sm" + (placing ? " btn--primary" : ""));
    place.appendChild(icon("plus"));
    place.appendChild(document.createTextNode(placing ? "Click in the panorama…" : "Place a hotspot"));
    place.onclick = function () {
      placing = !placing;
      $("#studioStage").classList.toggle("is-placing", placing);
      renderStudio();
      if (placing) toast("Click anywhere in the panorama to drop a hotspot.");
    };
    bar.appendChild(place);
    var look = el("button", "btn btn--sm");
    look.appendChild(icon("eye"));
    look.appendChild(document.createTextNode("Open in the tour"));
    look.onclick = function () { setView("tour"); };
    bar.appendChild(look);
    main.appendChild(bar);

    var list = el("div", "studio-panel card");
    list.appendChild(el("h4", null, room.name + " · " + (room.hotspots || []).length + " hotspots"));
    (room.hotspots || []).forEach(function (h, i) {
      var row = el("div", "hs-edit" + (selectedHotspot === h ? " is-sel" : ""));
      row.appendChild(select([["nav", "Walk to"], ["info", "Info"], ["image", "Image"], ["video", "Video"], ["doc", "Document"], ["link", "Link"]],
        h.type, function (v) { h.type = v; renderStudio(); refreshHotspotsOnly(room); }));
      row.appendChild(input(h.label, function (v) { h.label = v; refreshHotspotsOnly(room); }, "Label"));
      var acts = el("div");
      acts.style.cssText = "display:flex;gap:5px";
      var pick = el("button", "icon-btn icon-btn--sm");
      pick.appendChild(icon("edit"));
      pick.title = "Edit this hotspot";
      pick.onclick = function () { selectHotspot(h); };
      var aim = el("button", "icon-btn icon-btn--sm");
      aim.appendChild(icon("target"));
      aim.title = "Aim at the current view";
      aim.onclick = function () {
        var c = engine.camera();
        h.yaw = +c.yaw.toFixed(2); h.pitch = +c.pitch.toFixed(2);
        refreshHotspotsOnly(room); markDirty();
        toast("Hotspot re-aimed.");
      };
      var del = el("button", "icon-btn icon-btn--sm");
      del.appendChild(icon("trash"));
      del.title = "Delete";
      del.onclick = function () {
        room.hotspots.splice(i, 1);
        if (selectedHotspot === h) selectedHotspot = null;
        refreshHotspotsOnly(room); markDirty(); renderStudio();
      };
      acts.appendChild(pick); acts.appendChild(aim); acts.appendChild(del);
      row.appendChild(acts);
      list.appendChild(row);
    });
    if (!(room.hotspots || []).length) list.appendChild(el("p", "t-body", "No hotspots here yet. Use “Place a hotspot”."));
    main.appendChild(list);

    /* editor for the selected hotspot */
    if (selectedHotspot && (room.hotspots || []).indexOf(selectedHotspot) >= 0) {
      var h = selectedHotspot;
      var ed = el("div", "studio-panel card");
      ed.style.marginTop = "16px";
      ed.appendChild(el("h4", null, "Editing · " + (h.label || "hotspot")));
      var g = el("div", "form-grid");
      g.appendChild(field("Label", input(h.label, function (v) { h.label = v; refreshHotspotsOnly(room); })));
      if (h.type === "nav") {
        g.appendChild(field("Walks to", select(TOUR.rooms.map(function (r) { return [r.id, r.name]; }), h.to,
          function (v) { h.to = v; refreshHotspotsOnly(room); })));
      } else {
        g.appendChild(field("Body copy", textarea(h.body, function (v) { h.body = v; })));
        if (h.type === "link") g.appendChild(field("URL", input(h.href, function (v) { h.href = v; }, "https://…")));
        else if (h.type !== "info") {
          g.appendChild(field(h.type === "video" ? "Video URL (MP4, YouTube or Vimeo)" : h.type === "doc" ? "PDF URL" : "Image URL",
            input(h.src === "@equirect" ? "" : h.src, function (v) { h.src = v || null; }, h.type === "video" ? "https://youtu.be/…" : "https://…")));
          var upl = el("div", "field");
          upl.appendChild(el("label", null, "…or upload a file"));
          var d2 = el("div", "drop");
          d2.appendChild(icon("upload"));
          d2.appendChild(el("p", null, "Click to choose a file"));
          var f2 = el("input"); f2.type = "file"; f2.style.display = "none";
          f2.accept = h.type === "video" ? "video/*" : h.type === "doc" ? "application/pdf" : "image/*";
          d2.onclick = function () { f2.click(); };
          f2.onchange = function () {
            if (!f2.files[0]) return;
            var fr = new FileReader();
            fr.onload = function () { h.src = fr.result; markDirty(); toast("Attached."); renderStudio(); };
            fr.readAsDataURL(f2.files[0]);
          };
          upl.appendChild(d2); upl.appendChild(f2);
          g.appendChild(upl);
        }
      }
      var ang = el("div", "form-row");
      ang.appendChild(field("Yaw", input(h.yaw, function (v) { h.yaw = +v || 0; refreshHotspotsOnly(room); })));
      ang.appendChild(field("Pitch", input(h.pitch, function (v) { h.pitch = +v || 0; refreshHotspotsOnly(room); })));
      g.appendChild(ang);
      ed.appendChild(g);
      main.appendChild(ed);
    }

    cols.appendChild(main);
    cols.appendChild(roomListPanel(function (r) {
      selectedHotspot = null;
      engine.go(r.id);
      renderStudio();
    }));
    body.appendChild(cols);

    /* mount the live engine into the placement surface */
    setTimeout(function () {
      mountStage($("#studioStage"));
      $("#studioStage").classList.toggle("is-placing", placing);
      layoutHotspots(true);
    }, 0);
  }

  function refreshHotspotsOnly(room) {
    if (currentRoom && currentRoom.id === room.id) renderHotspots(room);
    markDirty();
  }
  function selectHotspot(h) {
    selectedHotspot = h;
    if (view === "studio") renderStudio();
  }
  function placeHotspotAt(e) {
    if (!placing || !currentRoom) return;
    var a = engine.angleAt(e.clientX, e.clientY);
    var h = {
      id: "h" + Date.now().toString(36),
      type: "info", yaw: +a.yaw.toFixed(2), pitch: +a.pitch.toFixed(2),
      label: "New hotspot", body: ""
    };
    currentRoom.hotspots = currentRoom.hotspots || [];
    currentRoom.hotspots.push(h);
    selectedHotspot = h;
    renderHotspots(currentRoom);
    markDirty();
    renderStudio();
    toast("Hotspot placed — set what it does on the right.");
  }

  /* ── Studio · plans ────────────────────────────────────────────────────── */
  function studioPlans(body) {
    var cols = el("div", "studio-cols");
    var main = el("div");
    TOUR.floors.forEach(function (f) {
      var card = el("div", "studio-panel card");
      card.style.marginBottom = "16px";
      card.appendChild(el("h4", null, f.name));
      var g = el("div", "form-grid");
      var r = el("div", "form-row");
      r.appendChild(field("Name", input(f.name, function (v) { f.name = v; buildPlan(); })));
      r.appendChild(field("Short label", input(f.short, function (v) { f.short = v; buildPlan(); })));
      g.appendChild(r);

      var prev = el("div");
      prev.style.cssText = "border:1px solid var(--line);border-radius:var(--r);padding:12px;background:rgba(0,0,0,.25)";
      prev.innerHTML = '<svg viewBox="0 0 120 80" style="width:100%;height:auto"><g class="fp-geo">' + (f.plan || "") + "</g></svg>";
      g.appendChild(field("Current plan", prev));

      var drop = el("div", "drop");
      drop.appendChild(icon("upload"));
      drop.appendChild(el("p", null, "Upload a floor plan — an SVG drops straight in, a PNG or JPEG is placed behind the pins"));
      var file = el("input"); file.type = "file"; file.accept = ".svg,image/*"; file.style.display = "none";
      drop.onclick = function () { file.click(); };
      drop.ondragover = function (e) { e.preventDefault(); drop.classList.add("is-over"); };
      drop.ondragleave = function () { drop.classList.remove("is-over"); };
      drop.ondrop = function (e) { e.preventDefault(); drop.classList.remove("is-over"); if (e.dataTransfer.files[0]) readPlan(e.dataTransfer.files[0]); };
      file.onchange = function () { if (file.files[0]) readPlan(file.files[0]); };
      function readPlan(fl) {
        var fr = new FileReader();
        if (/svg/.test(fl.type) || /\.svg$/i.test(fl.name)) {
          fr.onload = function () {
            var m = /<svg[^>]*>([\s\S]*)<\/svg>/i.exec(fr.result);
            f.plan = m ? m[1] : fr.result;
            markDirty(); buildPlan(); renderStudio();
            toast("Floor plan replaced.");
          };
          fr.readAsText(fl);
        } else {
          fr.onload = function () {
            f.plan = '<image href="' + fr.result + '" x="0" y="0" width="120" height="80" preserveAspectRatio="xMidYMid meet" opacity=".8"/>';
            markDirty(); buildPlan(); renderStudio();
            toast("Floor plan image placed.");
          };
          fr.readAsDataURL(fl);
        }
      }
      g.appendChild(drop);
      g.appendChild(file);
      card.appendChild(g);
      main.appendChild(card);
    });

    /* pin positions */
    var pins = el("div", "studio-panel card");
    pins.appendChild(el("h4", null, "Pin positions"));
    pins.appendChild(el("p", "t-body", "Where each position sits on its plan, in plan units (0–120 across, 0–80 down)."));
    TOUR.rooms.forEach(function (r) {
      var row = el("div", "hs-edit");
      row.style.gridTemplateColumns = "1fr 70px 70px";
      row.appendChild(el("span", null, r.name));
      row.appendChild(input(r.plan ? r.plan[0] : 60, function (v) { r.plan = [+v || 0, r.plan ? r.plan[1] : 40]; buildPlan(); }));
      row.appendChild(input(r.plan ? r.plan[1] : 40, function (v) { r.plan = [r.plan ? r.plan[0] : 60, +v || 0]; buildPlan(); }));
      pins.appendChild(row);
    });
    cols.appendChild(main);
    cols.appendChild(pins);
    body.appendChild(cols);
  }

  /* ── Studio · branding ─────────────────────────────────────────────────── */
  function studioBrand(body) {
    var b = TOUR.brand;
    var cols = el("div", "studio-cols");
    var main = el("div", "studio-panel card");
    main.appendChild(el("h4", null, "Identity"));
    var g = el("div", "form-grid");
    var r1 = el("div", "form-row");
    r1.appendChild(field("Company name", input(b.name, function (v) { b.name = v; applyBrand(); })));
    r1.appendChild(field("Sub-label", input(b.sub, function (v) { b.sub = v; applyBrand(); })));
    g.appendChild(r1);
    var r2 = el("div", "form-row");
    r2.appendChild(field("Wordmark", input(b.mark, function (v) { b.mark = v; applyBrand(); })));
    r2.appendChild(field("Accented part", input(b.markAccent, function (v) { b.markAccent = v; applyBrand(); })));
    g.appendChild(r2);
    g.appendChild(field("Tagline", input(b.tagline, function (v) { b.tagline = v; applyBrand(); buildDash(); })));

    var colours = el("div", "form-grid");
    [["Accent", "accent"], ["Accent 2", "accent2"], ["Background", "bg"], ["Text", "ink"]].forEach(function (c) {
      var row = el("div");
      row.style.cssText = "display:flex;gap:10px;align-items:center";
      var sw = el("input");
      sw.type = "color"; sw.value = b[c[1]] || "#ffffff";
      var tx = el("input", "input");
      tx.value = b[c[1]] || "";
      function set(v) { b[c[1]] = v; sw.value = v; tx.value = v; applyBrand(); markDirty(); }
      sw.oninput = function () { set(sw.value); };
      tx.oninput = function () { if (/^#[0-9a-f]{3,8}$/i.test(tx.value)) set(tx.value); };
      row.appendChild(sw); row.appendChild(tx);
      colours.appendChild(field(c[0], row));
    });
    g.appendChild(field("Palette", colours));

    var logo = el("div", "drop");
    logo.appendChild(icon("upload"));
    logo.appendChild(el("p", null, b.logo ? "Logo attached — click to replace" : "Upload a logo mark (square, SVG or PNG)"));
    var lf = el("input"); lf.type = "file"; lf.accept = "image/*"; lf.style.display = "none";
    logo.onclick = function () { lf.click(); };
    lf.onchange = function () {
      if (!lf.files[0]) return;
      var fr = new FileReader();
      fr.onload = function () { b.logo = fr.result; applyBrand(); markDirty(); renderStudio(); toast("Logo applied."); };
      fr.readAsDataURL(lf.files[0]);
    };
    g.appendChild(field("Logo", logo));
    g.appendChild(lf);
    if (b.logo) {
      var rmL = el("button", "btn btn--sm btn--danger", "Remove logo");
      rmL.onclick = function () { b.logo = null; applyBrand(); markDirty(); renderStudio(); };
      g.appendChild(rmL);
    }

    g.appendChild(field("Credit line", input(b.credit, function (v) { b.credit = v; buildDash(); })));
    main.appendChild(g);

    var prev = el("div", "studio-panel card");
    prev.appendChild(el("h4", null, "Live preview"));
    var demo = el("div");
    demo.style.cssText = "display:grid;gap:12px";
    var bar = el("div");
    bar.style.cssText = "display:flex;align-items:center;gap:11px;padding:12px;border:1px solid var(--line);border-radius:var(--r)";
    var orb = el("span", "brand-orb");
    if (b.logo) { var im = new Image(); im.src = b.logo; orb.appendChild(im); }
    bar.appendChild(orb);
    var wm = el("span", "brand-word");
    wm.innerHTML = esc(b.mark || "") + "<em>" + esc(b.markAccent || "") + "</em>";
    bar.appendChild(wm);
    demo.appendChild(bar);
    var btns = el("div");
    btns.style.cssText = "display:flex;gap:8px;flex-wrap:wrap";
    btns.appendChild(el("button", "btn btn--primary btn--sm", "Primary"));
    btns.appendChild(el("button", "btn btn--sm", "Secondary"));
    btns.appendChild(el("span", "chip chip--accent", "Accent chip"));
    demo.appendChild(btns);
    prev.appendChild(demo);
    prev.appendChild(el("p", "t-body", "Everything above — and every hotspot, radar cone, progress bar and focus ring in the product — is drawn from these four values."));

    cols.appendChild(main);
    cols.appendChild(prev);
    body.appendChild(cols);
  }

  /* ── Studio · projects ─────────────────────────────────────────────────── */
  /* ── Studio · properties ───────────────────────────────────────────────── */
  function studioSites(body) {
    var cols = el("div", "studio-cols");
    var main = el("div");

    /* ══ the listing details of the property that is currently open ══ */
    var p = TOUR.project = TOUR.project || {};
    var det = el("div", "studio-panel card");
    det.appendChild(el("h4", null, "Listing · " + (p.name || PROJECT)));
    det.appendChild(el("p", "t-body", "What a viewer sees on the portfolio card and across the top of the " +
      "property. Leave a field empty and it simply does not appear."));
    var g = el("div", "form-grid");

    var r1 = el("div", "form-row");
    r1.appendChild(field("Property name", input(p.name, function (v) { p.name = v; afterSiteEdit(); }, "12 Willow Lane")));
    r1.appendChild(field("Address / area", input(p.location, function (v) { p.location = v; afterSiteEdit(); }, "Stoneygate, Leicester LE2")));
    g.appendChild(r1);

    var r2 = el("div", "form-row");
    r2.appendChild(field("Price", input(p.price, function (v) { p.price = v; afterSiteEdit(); }, "£465,000  ·  £1,250 pcm")));
    r2.appendChild(field("Status", select(
      (PORTFOLIO.statuses || ["For sale"]).map(function (x) { return [x, x]; }).concat([["", "— none —"]]),
      p.status || "", function (v) { p.status = v; afterSiteEdit(); })));
    g.appendChild(r2);

    var r3 = el("div", "form-row form-row--3");
    r3.appendChild(field("Bedrooms", input(p.beds, function (v) { p.beds = v ? +v : null; afterSiteEdit(); }, "4")));
    r3.appendChild(field("Bathrooms", input(p.baths, function (v) { p.baths = v ? +v : null; afterSiteEdit(); }, "2")));
    r3.appendChild(field("Receptions", input(p.receptions, function (v) { p.receptions = v ? +v : null; afterSiteEdit(); }, "2")));
    g.appendChild(r3);

    var r4 = el("div", "form-row form-row--3");
    r4.appendChild(field("Type", input(p.propertyType, function (v) { p.propertyType = v; afterSiteEdit(); }, "Detached house")));
    r4.appendChild(field("Tenure", input(p.tenure, function (v) { p.tenure = v; afterSiteEdit(); }, "Freehold")));
    r4.appendChild(field("EPC", input(p.epc, function (v) { p.epc = v; afterSiteEdit(); }, "C")));
    g.appendChild(r4);

    var r5 = el("div", "form-row");
    r5.appendChild(field("Floor area", input(p.area, function (v) { p.area = v; afterSiteEdit(); }, "1,640 sq ft")));
    r5.appendChild(field("Your reference", input(p.ref, function (v) { p.ref = v; afterSiteEdit(); }, "MER-1042")));
    g.appendChild(r5);

    g.appendChild(field("Summary", textarea(p.summary, function (v) { p.summary = v; afterSiteEdit(); })));

    /* card artwork: a photo if they have one, otherwise the floor plan */
    var cov = el("div", "field");
    cov.appendChild(el("label", null, "Portfolio card image"));
    var covDrop = el("div", "drop");
    covDrop.appendChild(icon("upload"));
    var covTxt = el("p", null, p.coverImage ? "Photo set — click to replace" : "Click to add a photo (optional — the floor plan is used otherwise)");
    covDrop.appendChild(covTxt);
    var covF = el("input"); covF.type = "file"; covF.accept = "image/*"; covF.style.display = "none";
    covDrop.onclick = function () { covF.click(); };
    covF.onchange = function () {
      if (!covF.files[0]) return;
      var fr = new FileReader();
      fr.onload = function () { p.coverImage = fr.result; afterSiteEdit(); renderStudio(); toast("Card image set."); };
      fr.readAsDataURL(covF.files[0]);
    };
    cov.appendChild(covDrop); cov.appendChild(covF);
    if (p.coverImage) {
      var clr = el("button", "btn btn--sm", "Remove the photo");
      clr.style.marginTop = "8px";
      clr.onclick = function () { p.coverImage = null; afterSiteEdit(); renderStudio(); };
      cov.appendChild(clr);
    }
    g.appendChild(cov);

    var r6 = el("div", "form-row");
    r6.appendChild(field("Opening room on the card", select(
      TOUR.rooms.map(function (r) { return [r.id, r.name]; }), p.cover || TOUR.rooms[0].id,
      function (v) { p.cover = v; afterSiteEdit(); })));
    /* visibility is an action, not an edit — going live has to survive closing
       the tab, so it saves itself rather than waiting for Publish */
    r6.appendChild(field("Visibility", select(
      [["live", "Live — shown in the portfolio"], ["draft", "Draft — hidden from visitors"]],
      p.hidden ? "draft" : "live",
      function (v) {
        p.hidden = v === "draft";
        afterSiteEdit();
        saveTour(true);
        toast(p.hidden ? "Hidden from visitors — saved." : "Live in the portfolio — saved.");
        renderStudio();
      })));
    g.appendChild(r6);

    var ag = p.agent = p.agent || {};
    var r7 = el("div", "form-row form-row--3");
    r7.appendChild(field("Agent", input(ag.name, function (v) { ag.name = v; afterSiteEdit(); }, "Meridian Residential")));
    r7.appendChild(field("Phone", input(ag.phone, function (v) { ag.phone = v; afterSiteEdit(); }, "0116 000 0000")));
    r7.appendChild(field("Email", input(ag.email, function (v) { ag.email = v; afterSiteEdit(); }, "viewings@…")));
    g.appendChild(r7);

    det.appendChild(g);
    main.appendChild(det);

    /* ══ everything else in the deployment ══ */
    var list = el("div", "studio-panel card");
    list.style.marginTop = "16px";
    list.appendChild(el("h4", null, "All properties"));
    list.appendChild(el("p", "t-body", "Each one is a separate building with its own rooms, plans, hotspots " +
      "and branding. Switching is instant — they share one viewer."));
    var rows = el("div", "roomlist");
    rows.style.marginTop = "14px";
    projectIds().forEach(function (id) {
      var m = projectMeta(id);
      if (!m) return;
      var b = el("button", "roomlist-item projrow" + (id === PROJECT ? " is-on" : ""));
      b.setAttribute("data-project", id);
      var dot = el("span");
      dot.style.cssText = "width:10px;height:10px;border-radius:3px;flex:0 0 auto;background:" +
        esc((m.brand && m.brand.accent) || "var(--accent)");
      var tx = el("span", "roomlist-txt");
      tx.appendChild(el("b", null, m.name));
      tx.appendChild(el("span", null, [
        m.project.price, m.rooms + " positions", m.location,
        m.shipped ? null : "created here", m.project.hidden ? "draft" : null
      ].filter(Boolean).join(" · ")));
      b.appendChild(dot); b.appendChild(tx);
      if (id === PROJECT) b.appendChild(el("span", "chip chip--accent", "Open"));
      b.onclick = function () { openSite(id, { view: "studio" }); };
      rows.appendChild(b);
    });
    list.appendChild(rows);

    var act = el("div");
    act.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:16px";
    var mk = el("button", "btn btn--sm btn--primary");
    mk.id = "btnNewProject";
    mk.appendChild(icon("plus"));
    mk.appendChild(document.createTextNode("New property"));
    mk.onclick = function () { openNewSite(); };
    var dup = el("button", "btn btn--sm");
    dup.id = "btnDupProject";
    dup.appendChild(icon("building"));
    dup.appendChild(document.createTextNode("Duplicate this property"));
    dup.onclick = function () {
      var copy = JSON.parse(JSON.stringify(TOUR));
      copy.id = slug(TOUR.project.name) + "-" + Math.random().toString(36).slice(2, 6);
      copy.project.name = TOUR.project.name + " (copy)";
      copy.project.slug = copy.id;
      copy.project.ref = "";
      copy.project.hidden = true;
      if (!storeSite(copy)) return;
      switchProject(copy.id, { force: true, view: "studio" });
      renderStudio();
    };
    var imp = el("button", "btn btn--sm");
    imp.appendChild(icon("upload"));
    imp.appendChild(document.createTextNode("Import a tour.json"));
    var impF = el("input");
    impF.type = "file"; impF.accept = "application/json,.json"; impF.style.display = "none";
    imp.onclick = function () { impF.click(); };
    impF.onchange = function () {
      if (!impF.files[0]) return;
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var t = JSON.parse(fr.result);
          if (!t.rooms || !t.rooms.length) throw new Error("no rooms");
          t.id = t.id || slug((t.project && t.project.name) || "imported") + "-" + Math.random().toString(36).slice(2, 5);
          if (!storeSite(t)) return;
          switchProject(t.id, { force: true, view: "studio" });
          renderStudio();
        } catch (e) { toast("That file isn't a valid tour.json."); }
      };
      fr.readAsText(impF.files[0]);
    };
    act.appendChild(mk); act.appendChild(dup); act.appendChild(imp); act.appendChild(impF);
    if (!shippedTour(PROJECT)) {
      var rm = el("button", "btn btn--sm btn--danger");
      rm.id = "btnDeleteProject";
      rm.appendChild(icon("trash"));
      rm.appendChild(document.createTextNode("Delete this property"));
      rm.onclick = function () {
        if (!confirm("Delete " + TOUR.project.name + "? This cannot be undone.")) return;
        try { localStorage.removeItem(storeKey(PROJECT)); } catch (e) { }
        forgetMeta();
        switchProject(projectIds()[0], { force: true, view: "studio" });
        renderStudio();
      };
      act.appendChild(rm);
    }
    list.appendChild(act);
    main.appendChild(list);

    var how = el("div", "studio-panel card");
    how.appendChild(el("h4", null, "Putting a property on the server"));
    how.appendChild(el("p", "t-body", "Properties made here live in this browser, which is right for drafting. " +
      "To publish one to every visitor, export it and drop it in the folder as its own file:"));
    var code = el("pre", "code");
    code.textContent =
      "1.  Studio → Publish → Export tour.json\n" +
      "2.  Save it into the folder as  tour-<name>.js  and wrap it:\n\n" +
      "      (window.RED360_TOURS = window.RED360_TOURS || []).push(\n" +
      "        { …the exported JSON… }\n" +
      "      );\n\n" +
      "3.  Add one line to index.html, next to the others:\n\n" +
      '      <script src="tour-<name>.js"><\/script>\n\n' +
      "No build, no database, no rebuild of anything else.";
    how.appendChild(code);
    how.appendChild(el("h4", null, "A portfolio with hundreds of listings"));
    how.appendChild(el("p", "t-body", "Past about fifty properties, register a stub instead — the listing card " +
      "loads at once and the rooms only when someone opens it:"));
    var code2 = el("pre", "code");
    code2.textContent =
      "(window.RED360_TOURS = window.RED360_TOURS || []).push({\n" +
      '  id: "willow-lane-12",\n' +
      '  src: "tours/willow-lane-12.js",   // pulled in on demand\n' +
      "  project: { name: …, price: …, beds: … },\n" +
      "  floors: [{ id: \"g\", plan: \"…\" }]\n" +
      "});";
    how.appendChild(code2);

    cols.appendChild(main);
    cols.appendChild(how);
    body.appendChild(cols);
  }

  /* a listing edit changes the card, the hero and the switcher all at once */
  function afterSiteEdit() {
    markDirty();
    forgetMeta(PROJECT);
    buildDash();
    renderProjectSwitch();
    if (SITES_ON) buildSites();
  }
  function storeSite(t) {
    try { localStorage.setItem(storeKey(t.id), JSON.stringify(t)); }
    catch (e) { toast("Browser storage is full — export a property first."); return false; }
    forgetMeta();
    return true;
  }

  /* new property: name it, say what it is, and it exists */
  function openNewSite() {
    var boxOld = $("#newSiteForm");
    if (boxOld) { boxOld.parentNode.removeChild(boxOld); return; }
    var wrap = el("div", "studio-panel card");
    wrap.id = "newSiteForm";
    wrap.style.marginBottom = "14px";
    wrap.appendChild(el("h4", null, "New property"));
    var g = el("div", "form-grid");
    var nameI = el("input", "input");
    nameI.id = "newSiteName";
    nameI.placeholder = "e.g. 12 Willow Lane";
    g.appendChild(field("Property name", nameI));
    var row = el("div", "form-row");
    var locI = el("input", "input");
    locI.id = "newSiteLocation";
    locI.placeholder = "Stoneygate, Leicester LE2";
    var priceI = el("input", "input");
    priceI.id = "newSitePrice";
    priceI.placeholder = "£465,000";
    row.appendChild(field("Address / area", locI));
    row.appendChild(field("Price", priceI));
    g.appendChild(row);
    var row2 = el("div", "form-row");
    var statusS = select((PORTFOLIO.statuses || ["For sale"]).map(function (x) { return [x, x]; }),
      (PORTFOLIO.statuses || ["For sale"])[0], function () { });
    statusS.id = "newSiteStatus";
    var bedsI = el("input", "input");
    bedsI.id = "newSiteBeds";
    bedsI.placeholder = "3";
    row2.appendChild(field("Status", statusS));
    row2.appendChild(field("Bedrooms", bedsI));
    g.appendChild(row2);
    g.appendChild(el("p", "t-body", "It starts as a draft with one space, so nothing half-finished ever shows " +
      "in the portfolio. Add the rest in Rooms, then switch it to Live."));
    var act = el("div");
    act.style.cssText = "display:flex;gap:8px";
    var go = el("button", "btn btn--sm btn--primary", "Create property");
    go.id = "btnNewSiteGo";
    go.onclick = function () {
      var t = blankTour(nameI.value.trim() || "New property");
      t.project.location = locI.value.trim();
      t.project.price = priceI.value.trim();
      t.project.status = statusS.value;
      t.project.beds = bedsI.value ? +bedsI.value : null;
      t.project.hidden = true;
      if (!storeSite(t)) return;
      switchProject(t.id, { force: true, view: "studio" });
      studioTab = "rooms";
      renderStudio();
      toast(t.project.name + " created as a draft.");
    };
    var cancel = el("button", "btn btn--sm", "Cancel");
    cancel.onclick = function () { wrap.parentNode.removeChild(wrap); };
    act.appendChild(go); act.appendChild(cancel);
    g.appendChild(act);
    wrap.appendChild(g);
    var host = $("#studioBody");
    host.insertBefore(wrap, host.firstChild);
    nameI.focus();
  }

  /* ── Studio · access ───────────────────────────────────────────────────── */
  function studioAccess(body) {
    var cols = el("div", "studio-cols");
    var main = el("div");

    var state = el("div", "studio-panel card");
    state.appendChild(el("h4", null, "Studio access"));
    state.appendChild(el("p", "t-body", adminLocked()
      ? "The Studio is hidden from visitors. The portfolio, the property pages and the tours are all public; " +
        "everything on this side of the passcode is not."
      : "No passcode is set, so the Studio is visible to anyone who opens this page. Set one below."));
    var dl = el("dl", "dl");
    [["Lock", adminLocked() ? "On" : "Off"],
    ["Checked", ADMIN_CFG.verifyUrl ? "On your server" : "In the browser"],
    ["This device", isAdmin() ? "Signed in" : "Signed out"],
    ["Stays signed in", (+ADMIN_CFG.rememberDays > 0) ? ADMIN_CFG.rememberDays + " days" : "Until the tab closes"]]
      .forEach(function (x) { dl.appendChild(el("dt", null, x[0])); dl.appendChild(el("dd", null, x[1])); });
    state.appendChild(dl);
    var out = el("button", "btn btn--sm");
    out.style.marginTop = "12px";
    out.appendChild(icon("lock"));
    out.appendChild(document.createTextNode("Sign out on this device"));
    out.onclick = function () { adminSignOut(); };
    state.appendChild(out);
    main.appendChild(state);

    var ch = el("div", "studio-panel card");
    ch.style.marginTop = "16px";
    ch.appendChild(el("h4", null, "Change the passcode"));
    ch.appendChild(el("p", "t-body", "The passcode itself is never stored anywhere. Type a new one and this gives " +
      "you the line to paste into config.js — that is what makes it permanent for everybody."));
    var g = el("div", "form-grid");
    var np = el("input", "input");
    np.id = "newPass"; np.type = "text"; np.placeholder = "a new passcode";
    g.appendChild(field("New passcode", np));
    var outLine = el("pre", "code");
    outLine.id = "newPassLine";
    outLine.textContent = 'hash: "' + esc(ADMIN_CFG.hash || "") + '"      // current';
    var mk = el("button", "btn btn--sm btn--primary", "Generate the line");
    mk.id = "btnMakeHash";
    mk.onclick = function () {
      var v = np.value.trim();
      if (v.length < 4) { toast("Use at least four characters."); return; }
      outLine.textContent =
        "// in config.js → admin:\n" +
        'hash: "' + fnv(v) + '",';
      toast("Paste that into config.js to make it permanent.");
    };
    g.appendChild(mk);
    ch.appendChild(g);
    ch.appendChild(outLine);
    main.appendChild(ch);

    var real = el("div", "studio-panel card");
    real.appendChild(el("h4", null, "What this lock is, honestly"));
    real.appendChild(el("p", "t-body", "It keeps the editing tools out of a visitor's way and off a shared screen. " +
      "It is not a security boundary. The whole product is static files, so anyone who reads the JavaScript can " +
      "get past a passcode that lives inside it."));
    real.appendChild(el("p", "t-body", "If the listings themselves are confidential — anything unpublished, " +
      "anything with a vendor's name on it — put the folder behind the server's own login instead:"));
    var code = el("pre", "code");
    code.textContent =
      "Cloudflare       Zero Trust → Access → self-hosted app on /studio\n" +
      "Apache / cPanel  .htpasswd on the folder\n" +
      "Nginx            auth_basic on the location block\n" +
      "Anything else    set admin.verifyUrl in config.js to an endpoint\n" +
      "                 that takes {code} and answers {ok:true}";
    real.appendChild(code);
    cols.appendChild(main);
    cols.appendChild(real);
    body.appendChild(cols);
  }

  /* ── Studio · publish ──────────────────────────────────────────────────── */
  function studioPublish(body) {
    var cols = el("div", "studio-cols");
    var main = el("div");

    var save = el("div", "studio-panel card");
    save.appendChild(el("h4", null, "Publish"));
    save.appendChild(el("p", "t-body", "Publishing writes the tour to this browser so the change is live for you immediately. " +
      "Export the file to move it onto the server, into a repository, or across to another machine."));
    var acts = el("div");
    acts.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:14px";
    var pub = el("button", "btn btn--primary");
    pub.appendChild(icon("check"));
    pub.appendChild(document.createTextNode("Publish changes"));
    pub.onclick = function () { saveTour(); };
    var exp = el("button", "btn");
    exp.appendChild(icon("download"));
    exp.appendChild(document.createTextNode("Export tour.json"));
    exp.onclick = exportTour;
    var imp = el("button", "btn");
    imp.appendChild(icon("upload"));
    imp.appendChild(document.createTextNode("Import tour.json"));
    var impF = el("input"); impF.type = "file"; impF.accept = "application/json,.json"; impF.style.display = "none";
    imp.onclick = function () { impF.click(); };
    impF.onchange = function () {
      if (!impF.files[0]) return;
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var t = JSON.parse(fr.result);
          if (!t.rooms || !t.rooms.length) throw new Error("no rooms");
          TOUR = t;
          indexRooms(); applyBrand();
          engine.load(TOUR);
          buildDash(); buildFilmstrip(); buildPlan();
          engine.go(TOUR.rooms[0].id, { force: true });
          markDirty(); renderStudio();
          toast("Tour imported.");
        } catch (e) { toast("That file isn't a valid tour.json."); }
      };
      fr.readAsText(impF.files[0]);
    };
    var reset = el("button", "btn btn--danger");
    reset.appendChild(icon("trash"));
    reset.appendChild(document.createTextNode("Reset to shipped demo"));
    reset.onclick = function () {
      if (!confirm("Discard every change and restore the demo tour?")) return;
      var ship = shippedTour(PROJECT);
      try { localStorage.removeItem(storeKey(PROJECT)); } catch (e) { }
      /* a project that only ever existed in this browser has nothing to
         restore to — fall back to the first project that ships in the folder */
      if (!ship) { switchProject(SHIPPED[0].id, { force: true }); renderStudio(); return; }
      TOUR = JSON.parse(JSON.stringify(ship));
      indexRooms(); applyBrand();
      engine.load(TOUR);
      buildDash(); buildFilmstrip(); buildPlan();
      engine.go(TOUR.rooms[0].id, { force: true });
      dirty = false; renderStudio();
      toast("Restored the shipped demo.");
    };
    acts.appendChild(pub); acts.appendChild(exp); acts.appendChild(imp); acts.appendChild(impF); acts.appendChild(reset);
    save.appendChild(acts);
    main.appendChild(save);

    var host = el("div", "studio-panel card");
    host.style.marginTop = "16px";
    host.appendChild(el("h4", null, "Hosting"));
    host.appendChild(el("p", "t-body", "The tour is a folder of static files. It runs from any web server, any CDN, " +
      "an S3 bucket, a closed intranet — or straight off a memory stick."));
    var tree = el("pre", "code");
    tree.textContent =
      "/tours                         ← anywhere on your existing site\n" +
      "  ├── index.html               shell\n" +
      "  ├── config.js                portfolio + studio passcode\n" +
      "  ├── app.css / app.js         the product\n" +
      "  ├── engine.js                WebGL engine · no dependencies\n" +
      "  ├── embed.js                 drop-in for your other pages\n" +
      "  ├── tour-<property>.js       one file per property\n" +
      "  └── panos/                   your stitched captures\n\n" +
      "No build step. No server runtime. No database. No licence key.\n" +
      "Upload the folder by FTP and it works.";
    host.appendChild(tree);
    main.appendChild(host);

    var origin = location.origin + location.pathname.replace(/index\.html$/, "");
    var embed = el("div", "studio-panel card");
    embed.style.marginTop = "16px";
    embed.appendChild(el("h4", null, "Put it on the website you already have"));
    embed.appendChild(el("p", "t-body", "Nothing here replaces the agency's site. Upload this folder to it, then " +
      "paste one of these onto a property page, a listing template or the homepage."));

    var tabs = el("div", "segmented");
    tabs.style.margin = "4px 0 12px";
    var code = el("pre", "code");
    var note = el("p", "t-body");
    var SNIPPETS = [
      ["This property", function () {
        note.textContent = "Goes on the page for " + (TOUR.project.name || "this property") + ".";
        return '<iframe\n  src="' + origin + '?site=' + PROJECT + '&embed=1#/tour/' +
          (currentRoom ? currentRoom.id : TOUR.rooms[0].id) + '"\n' +
          '  width="100%" height="640" loading="lazy"\n  style="border:0;border-radius:16px"\n' +
          '  allow="fullscreen; accelerometer; gyroscope; xr-spatial-tracking"\n' +
          '  title="' + esc(TOUR.project.name) + ' — virtual tour"></iframe>';
      }],
      ["The whole portfolio", function () {
        note.textContent = "One block that lists every live property, with the search and filters.";
        return '<iframe\n  src="' + origin + '#/sites"\n' +
          '  width="100%" height="900" loading="lazy"\n  style="border:0;border-radius:16px"\n' +
          '  allow="fullscreen; accelerometer; gyroscope; xr-spatial-tracking"\n' +
          '  title="Virtual tours — every property"></iframe>';
      }],
      ["One line per listing", function () {
        note.textContent = "For a listing template: put the property id in the attribute and embed.js " +
          "builds the iframe. Add the script once, anywhere on the page.";
        return '<div data-red360="' + PROJECT + '" data-height="640"></div>\n' +
          '<script src="' + origin + 'embed.js"><\/script>';
      }],
      ["A button, not a frame", function () {
        note.textContent = "Opens the walkthrough full-screen in a new tab — the lightest option, and the " +
          "one to use on a slow listing page.";
        return '<a href="' + origin + '?site=' + PROJECT + '&embed=1#/tour/' +
          (currentRoom ? currentRoom.id : TOUR.rooms[0].id) + '"\n' +
          '   target="_blank" rel="noopener">View the 360° tour</a>';
      }]
    ];
    var picked = 0;
    function drawSnippet() {
      $$("button", tabs).forEach(function (b, i) { b.classList.toggle("is-on", i === picked); });
      code.textContent = SNIPPETS[picked][1]();
    }
    SNIPPETS.forEach(function (sn, i) {
      var b = el("button", null, sn[0]);
      b.onclick = function () { picked = i; drawSnippet(); };
      tabs.appendChild(b);
    });
    embed.appendChild(tabs);
    embed.appendChild(code);
    embed.appendChild(note);
    drawSnippet();
    var cp = el("button", "btn btn--sm");
    cp.id = "btnCopyEmbed";
    cp.style.marginTop = "10px";
    cp.textContent = "Copy this snippet";
    cp.onclick = function () {
      navigator.clipboard && navigator.clipboard.writeText(code.textContent);
      toast("Copied — paste it into the page.");
    };
    embed.appendChild(cp);
    main.appendChild(embed);

    var links = el("div", "studio-panel card");
    links.style.marginTop = "16px";
    links.appendChild(el("h4", null, "Links worth keeping"));
    var lt = el("pre", "code");
    lt.textContent =
      origin + "#/sites                     the portfolio\n" +
      origin + "#/site/" + PROJECT + "\n" +
      "                                     straight to this property\n" +
      origin + "?site=" + PROJECT + "&embed=1\n" +
      "                                     the same, with no portfolio chrome\n" +
      origin + "?admin=<passcode>            signs the agency in and opens the Studio";
    links.appendChild(lt);
    main.appendChild(links);

    var stats = el("div", "studio-panel card");
    stats.appendChild(el("h4", null, "This tour"));
    var dl = el("dl", "dl");
    var hsCount = TOUR.rooms.reduce(function (a, r) { return a + (r.hotspots || []).length; }, 0);
    var captured = TOUR.rooms.filter(function (r) { return !!r.pano; }).length;
    [["Positions", String(TOUR.rooms.length)], ["Floors", String(TOUR.floors.length)],
    ["Hotspots", String(hsCount)], ["Real captures", captured + " / " + TOUR.rooms.length],
    ["Renderer", "WebGL 1"], ["Payload", "≈ " + Math.round(JSON.stringify(TOUR).length / 1024) + " KB"]]
      .forEach(function (s) {
        dl.appendChild(el("dt", null, s[0]));
        dl.appendChild(el("dd", null, s[1]));
      });
    stats.appendChild(dl);
    cols.appendChild(main);
    cols.appendChild(stats);
    body.appendChild(cols);
  }

  function exportTour() {
    var blob = new Blob([JSON.stringify(TOUR, null, 2)], { type: "application/json" });
    var a = el("a");
    a.href = URL.createObjectURL(blob);
    a.download = (TOUR.project.name || "tour").toLowerCase().replace(/\s+/g, "-") + ".json";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    toast("tour.json exported — that file is the whole tour.");
  }

  /* ═══════════════════════════════════════════════════════════════════════
     FAILURE SCREEN
     ═══════════════════════════════════════════════════════════════════════ */
  function showFailure(e) {
    $("#loader").style.display = "none";
    var box = el("div", "failure");
    box.innerHTML =
      "<h2>" + esc(e.title) + "</h2>" +
      "<p>" + e.message + "</p>" +
      '<p class="failure-act">' +
      '<button class="btn btn--primary" id="failCompat">Use the compatibility renderer</button>' +
      '<button class="btn" id="failLo">Try it in low quality</button>' +
      '<button class="btn" id="failDetail">Show technical detail</button></p>' +
      '<pre id="failPre" hidden>' + esc((e.detail || "") + "\n" + (e.diag || "")) + "</pre>";
    $("#app").appendChild(box);
    $("#failCompat").onclick = function () {
      try { localStorage.setItem("red360:tier", "2"); sessionStorage.removeItem("red360:tier-reload"); } catch (e) { }
      var u = new URL(location.href);
      u.searchParams.set("tier", "2");
      location.href = u.toString();
    };
    $("#failLo").onclick = function () {
      var u = new URL(location.href);
      u.searchParams.set("q", "lo");
      location.href = u.toString();
    };
    $("#failDetail").onclick = function () {
      var p = $("#failPre");
      p.hidden = !p.hidden;
    };
  }

  /* ═══════════════════════════════════════════════════════════════════════
     KEYBOARD
     ═══════════════════════════════════════════════════════════════════════ */
  document.addEventListener("keydown", function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    var mod = isMac ? e.metaKey : e.ctrlKey;

    if (adminOpen) {
      if (e.key === "Escape") { e.preventDefault(); closeLock(); }
      return;
    }
    if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); paletteOpen ? closePalette() : openPalette(); return; }

    if (paletteOpen) {
      if (e.key === "Escape") { e.preventDefault(); closePalette(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); selectPal(palSel + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); selectPal(palSel - 1); }
      else if (e.key === "Enter") { e.preventDefault(); if (palItems[palSel]) palItems[palSel].run(); }
      return;
    }
    if (e.key === "Escape") {
      if (sheetOpen) { closeSheet(); return; }
      if (view === "studio") { setView(cameFrom === "sites" ? "sites" : "tour"); return; }
      if (view === "tour" && document.fullscreenElement) return;
    }
    if (typing) return;
    if (view !== "tour") {
      if (e.key === "Enter" && view === "dash") { e.preventDefault(); enterTour(currentRoom && currentRoom.id); }
      return;
    }

    var k = e.key.toLowerCase(), step = e.shiftKey ? 16 : 6;
    if (k === "arrowleft") { engine.nudge(step, 0); hideHint(); }
    else if (k === "arrowright") { engine.nudge(-step, 0); hideHint(); }
    else if (k === "arrowup") { engine.nudge(0, step * 0.6); hideHint(); }
    else if (k === "arrowdown") { engine.nudge(0, -step * 0.6); hideHint(); }
    else if (k === "+" || k === "=") engine.zoom(-6);
    else if (k === "-" || k === "_") engine.zoom(6);
    else if (k === " ") { e.preventDefault(); guided.on ? guidedStop() : guidedStart(); }
    else if (k === "f") toggleFull();
    else if (k === "tab") { e.preventDefault(); togglePanels(); }
    else if (k === "m") $("#panelRight").classList.toggle("is-hidden");
    else if (k === "e") { if (isAdmin() || adminLocked()) gotoStudio(); }
    else if (k === "b") setView(SITES_ON ? "sites" : "dash");
    else if (k === "h" || k === "escape") setView("dash");
    else if (k === "s") shot();
    else if (guided.on && k === "n") guidedGo(1);
    else if (guided.on && k === "p") guidedGo(-1);
    else if (k >= "1" && k <= "9" && TOUR.rooms[+k - 1]) engine.go(TOUR.rooms[+k - 1].id);
    else return;
    e.preventDefault();
  });

  /* ═══════════════════════════════════════════════════════════════════════
     WIRING
     ═══════════════════════════════════════════════════════════════════════ */
  function wire() {
    $$("[data-nav]").forEach(function (b) {
      b.onclick = function () {
        var t = b.getAttribute("data-nav");
        if (t === "tour") enterTour(currentRoom && currentRoom.id);
        else if (t === "studio") gotoStudio();
        else setView(t);
      };
    });

    /* ── portfolio ── */
    var search = $("#siteSearch");
    if (search) {
      search.oninput = function () { siteQuery = search.value; renderSiteGrid(); };
      search.onkeydown = function (e) { if (e.key === "Escape") { search.value = ""; siteQuery = ""; renderSiteGrid(); } };
    }
    $("#siteSort").onchange = function () { siteSort = $("#siteSort").value; renderSiteGrid(); };

    /* ── studio access ── */
    $("#btnAdmin").onclick = function () {
      if (isAdmin()) adminSignOut();
      else openLock(function () { gotoStudio("sites"); });
    };
    $("#lockCancel").onclick = closeLock;
    $("#lockForm").onsubmit = function (e) {
      e.preventDefault();
      var code = $("#lockCode").value;
      var go = $("#lockGo");
      go.disabled = true;
      adminCheck(code, function (ok, why) {
        go.disabled = false;
        if (!ok) {
          var err = $("#lockErr");
          err.textContent = why || "That passcode isn't right.";
          err.hidden = false;
          $("#lockCode").select();
          return;
        }
        adminGrant($("#lockRemember").checked);
        var after = adminAfter;
        closeLock();
        toast("Signed in — the Studio is open.");
        if (after) after();
      });
    };
    $("#lock").onclick = function (e) { if (e.target === $("#lock")) closeLock(); };
    $("#btnStudioSites").onclick = function () {
      $("#studioRail").classList.remove("is-on");
      $("#studioScrim").classList.remove("is-on");
      setView(SITES_ON ? "sites" : "dash");
    };
    $("#btnStart").onclick = function () { enterTour(currentRoom ? currentRoom.id : TOUR.rooms[0].id); };
    $("#btnPreviewEnter").onclick = function () { enterTour(currentRoom && currentRoom.id); };
    $("#btnGuided").onclick = function () { enterTour(TOUR.rooms[0].id); setTimeout(guidedStart, 400); };
    $("#btnHome").onclick = function () { setView("dash"); };
    $("#btnSearch").onclick = function () { openPalette(); };
    $("#btnPlay").onclick = function () { guided.on ? guidedStop() : guidedStart(); };
    $("#btnPlayPause").onclick = guidedPause;
    $("#btnNext").onclick = function () { guidedGo(1); };
    $("#btnPrev").onclick = function () { guidedGo(-1); };
    $("#btnSpeed").onclick = function () {
      var i = (SPEEDS.indexOf(guided.speed) + 1) % SPEEDS.length;
      guided.speed = SPEEDS[i];
      guided.t0 = performance.now();
      guided.elapsed = 0;
      $("#btnSpeed").textContent = guided.speed.toFixed(guided.speed % 1 ? 2 : 1).replace(/0$/, "") + "×";
    };
    $("#btnGyro").onclick = function () {
      var on = engine.gyro(!engine.gyroOn());
      $("#btnGyro").classList.toggle("is-on", on);
      $("#btnGyro").setAttribute("aria-pressed", on ? "true" : "false");
      if (on) { toast("Move your device to look around."); hideHint(); }
    };
    if (!window.DeviceOrientationEvent || !coarse) $("#btnGyro").style.display = "none";
    $("#btnShot").onclick = shot;
    $("#btnShare").onclick = share;
    $("#btnPanels").onclick = function () { togglePanels(); };
    $("#btnStudio").onclick = function () { gotoStudio(); };
    $("#btnFull").onclick = toggleFull;
    $("#btnCloseLeft").onclick = function () { $("#panelLeft").classList.add("is-hidden"); };
    $("#btnCloseRight").onclick = function () { $("#panelRight").classList.add("is-hidden"); };
    $("#btnSheetClose").onclick = closeSheet;
    $("#scrim").onclick = function () { closeSheet(); closePalette(); };
    $("#paletteInput").oninput = function () { filterPalette($("#paletteInput").value); };
    $("#btnStudioExit").onclick = function () {
      $("#studioRail").classList.remove("is-on");
      $("#studioScrim").classList.remove("is-on");
      setView("tour");
    };
    $("#btnStudioPublish").onclick = function () { saveTour(); };
    function railOpen(on) {
      $("#studioRail").classList.toggle("is-on", on);
      $("#studioScrim").classList.toggle("is-on", on);
    }
    $("#btnStudioBack").onclick = function () {
      railOpen(false);
      setView(cameFrom === "dash" ? "dash" : "tour");
    };
    $("#btnRailToggle").onclick = function () { railOpen(!$("#studioRail").classList.contains("is-on")); };
    $("#studioScrim").onclick = function () { railOpen(false); };
    $("#btnStudioHome").onclick = function () { railOpen(false); setView("dash"); };
    $$("#studioNav button").forEach(function (b) {
      b.onclick = function () {
        if (!isAdmin()) { openLock(); return; }
        studioTab = b.getAttribute("data-tab");
        $("#studioRail").classList.remove("is-on");
        $("#studioScrim").classList.remove("is-on");
        renderStudio();
        location.hash = "#/studio/" + studioTab;
      };
    });
    document.addEventListener("fullscreenchange", function () {
      $("#btnFull").classList.toggle("is-on", !!document.fullscreenElement);
      engine && engine.resize();
    });
    window.addEventListener("hashchange", function () {
      var r = readHash();
      if (r.site && r.site !== PROJECT) { openSite(r.site); return; }
      /* the tab has to be set before the view switches, or entering the Studio
         renders the old tab and then rewrites the hash back to it */
      var tabMoved = r.view === "studio" && r.tab && r.tab !== studioTab;
      if (tabMoved) studioTab = r.tab;
      if (r.view && r.view !== view) setView(r.view);
      else if (tabMoved) renderStudio();
      if (r.view === "tour" && r.room && roomsById[r.room] && (!currentRoom || currentRoom.id !== r.room)) engine.go(r.room);
    });
    window.addEventListener("beforeunload", function (e) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    });
    /* mobile: tapping the room title opens the info sheet as a panel */
    $(".tour-title").onclick = function () {
      if (window.innerWidth <= 860) $("#panelLeft").classList.toggle("is-open");
    };
    $("#btnPanels").classList.add("is-on");

    /* phone dock */
    var dockInfo = $("#dockInfo"), dockMap = $("#dockMap"), dockMore = $("#dockMore");
    function syncDock() {
      var l = $("#panelLeft"), r = $("#panelRight");
      var any = l.classList.contains("is-open") || r.classList.contains("is-open");
      dockInfo.classList.toggle("btn--primary", l.classList.contains("is-open"));
      dockMap.classList.toggle("btn--primary", r.classList.contains("is-open"));
      $("#mobileDock").classList.toggle("is-raised", any);
    }
    function sheetToggle(which) {
      var l = $("#panelLeft"), r = $("#panelRight");
      var open = which === "left" ? l : r, other = which === "left" ? r : l;
      other.classList.remove("is-open");
      open.classList.toggle("is-open");
      syncDock();
    }
    dockInfo.onclick = function () { sheetToggle("left"); };
    dockMap.onclick = function () { sheetToggle("right"); };
    dockMore.onclick = function () { openPalette(); };
    $("#btnCloseLeft").addEventListener("click", function () { $("#panelLeft").classList.remove("is-open"); syncDock(); });
    $("#btnCloseRight").addEventListener("click", function () { $("#panelRight").classList.remove("is-open"); syncDock(); });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     BOOT
     ═══════════════════════════════════════════════════════════════════════ */
  function boot() {
    /* a stub property has no rooms until its file is pulled in — resolve the
       one we are about to open before anything touches the engine */
    if (!TOUR || !(TOUR.rooms && TOUR.rooms.length)) {
      var want = PROJECT;
      fetchStub(want, function (t) {
        if (t && t.rooms && t.rooms.length) { TOUR = t; bootReady(); return; }
        /* fall back to the first property that does carry its rooms */
        for (var i = 0; i < SHIPPED.length; i++) {
          if (SHIPPED[i].rooms && SHIPPED[i].rooms.length) {
            PROJECT = SHIPPED[i].id; TOUR = loadTour(PROJECT); bootReady(); return;
          }
        }
        showFailure({ title: "No property could be loaded", message: "Every tour file in this deployment is empty or missing." });
      });
      return;
    }
    bootReady();
  }

  function bootReady() {
    indexRooms();
    applyBrand();
    wire();
    syncAdminUI();
    if (EMBED) document.body.classList.add("is-embed");

    var params = QS;
    var route = readHash();
    if (route.site && projectMeta(route.site)) {
      /* #/site/<id> — a link straight to one listing */
      if (route.site !== PROJECT) { PROJECT = route.site; TOUR = loadTour(PROJECT) || TOUR; indexRooms(); applyBrand(); }
    }
    if (!route.view) route.view = SITES_ON ? "sites" : "dash";

    /* ── crash sentinel ──────────────────────────────────────────────────
       If the last visit never reached "ready" — a GPU driver reset, a frozen
       tab, a rage-quit during first render — this visit finds the flag still
       set and boots in low quality automatically. On the visit after that,
       the third strike also remembers the simplest renderer for next time.
       A healthy visit clears the flag, so quality returns by itself. */
    var CRASH_KEY = "red360:boot-crash";
    var crashes = 0;
    try {
      crashes = parseInt(localStorage.getItem(CRASH_KEY), 10) || 0;
      localStorage.setItem(CRASH_KEY, String(crashes + 1));
    } catch (e) { }
    function bootHealthy() {
      try { localStorage.removeItem(CRASH_KEY); } catch (e) { }
    }
    window.addEventListener("pagehide", bootHealthy);   // a clean exit is not a crash
    if (crashes >= 2) { try { localStorage.setItem("red360:tier", "2"); } catch (e) { } }
    var quality = params.get("q") || (crashes >= 1 ? "lo" : "auto");
    if (crashes >= 1 && !params.get("q")) {
      setTimeout(function () {
        toast("Last visit didn't finish loading, so this one runs in low quality. It resets by itself.");
      }, 2600);
    }

    engine = window.RED360.createEngine({
      canvas: $("#gl"),
      host: $("#stageDash"),
      quality: quality,
      onProgress: function (p, label) {
        var pct = Math.round(p * 100) + "%";
        $("#loadFill").style.transform = "scaleX(" + p.toFixed(3) + ")";
        $("#previewFill").style.transform = "scaleX(" + p.toFixed(3) + ")";
        $("#loadPct").textContent = pct;
        $("#previewPct").textContent = pct;
        $("#loadStage").textContent = label;
        $("#previewStage").textContent = label;
      },
      onReady: function () {
        /* alive for 12 s after first paint = a healthy machine */
        setTimeout(bootHealthy, 12000);
        $("#loader").classList.add("is-done");
        $("#previewLoading").classList.add("is-done");
        setTimeout(function () { $("#loader").style.display = "none"; }, 800);
        paintAllThumbs();
      },
      onRoom: function (room) { setRoom(room); },
      onFrame: function (cam, room) {
        if (view === "dash" || view === "sites") return;
        layoutHotspots();
        var pin = room && planPins[room.id];
        if (pin) {
          var cone = $(".pin-cone", pin);
          if (cone) cone.setAttribute("transform", "rotate(" + (cam.yaw + (room.north || 0)) + ")");
        }
        var t = $("#telemetry");
        if (t) {
          var read = "AZ " + String(Math.round((cam.yaw % 360 + 360) % 360)).padStart(3, "0") +
            "°  EL " + (cam.pitch >= 0 ? "+" : "") + Math.round(cam.pitch) +
            "°  FOV " + Math.round(cam.fov) + "°";
          if (read !== lastRead) { t.textContent = read; lastRead = read; }
        }
      },
      onSharpen: function (on) { $("#sharpen").classList.toggle("is-on", on); },
      onThumb: function (id) { paintThumb(id); },
      onTap: function (e) { if (placing) placeHotspotAt(e); else hideHint(); },
      onInteract: hideHint,
      onError: showFailure
    });
    if (!engine) return;

    engine.load(TOUR);
    buildDash();
    buildFilmstrip();
    buildPlan();
    renderProjectSwitch();
    if (SITES_ON) buildSites();

    var startRoom = (route.room && roomsById[route.room]) ? route.room : TOUR.rooms[0].id;
    var startView = null;
    if (params.has("y")) {
      startView = {
        yaw: parseFloat(params.get("y")),
        pitch: parseFloat(params.get("p") || "0"),
        fov: parseFloat(params.get("f") || "75")
      };
    }
    engine.start(startRoom, startView);
    engine.autoRotate(route.view === "dash", 0.0016);

    /* ?admin=<passcode> — a bookmark the agency can keep, so they never type it */
    var qadmin = params.get("admin");
    if (qadmin && adminLocked() && !isAdmin()) {
      adminCheck(qadmin, function (ok) {
        if (!ok) return;
        adminGrant(true);
        toast("Signed in — the Studio is open.");
        var u = new URL(location.href);
        u.searchParams["delete"]("admin");
        history.replaceState(null, "", u);
      });
    }

    if (route.view === "studio" && !isAdmin()) route.view = SITES_ON ? "sites" : "dash";
    if (route.view !== "dash") {
      if (route.view === "studio" && route.tab) studioTab = route.tab;
      setView(route.view, { force: true });
    } else {
      setView("dash", { force: true });
      engine.inputs(!coarse);
    }
    $("#btnSpeed").textContent = "1×";
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  /* a small public surface, for embedding hosts */
  window.RED360App = {
    go: function (id) { enterTour(id); },
    view: function (v) { setView(v); },
    tour: function () { return TOUR; },
    site: function (id, opts) { if (id) openSite(id, opts); return PROJECT; },
    sites: function () { return visibleSites().map(function (m) { return { id: m.id, name: m.name, project: m.project }; }); },
    isAdmin: isAdmin,
    signOut: adminSignOut,
    engine: function () { return engine; }
  };
})();

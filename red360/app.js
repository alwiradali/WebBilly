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
  var STORE_KEY = "red360:tour:v2";
  var SHIPPED = JSON.parse(JSON.stringify(window.RED360_TOUR));
  var TOUR = loadTour();
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

  function loadTour() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var t = JSON.parse(raw);
        if (t && t.rooms && t.rooms.length) return t;
      }
    } catch (e) { }
    return JSON.parse(JSON.stringify(window.RED360_TOUR));
  }
  function saveTour(silent) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(TOUR));
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
    }
    if (prev === "studio" && next !== "studio") { placing = false; $("#stageTour").classList.remove("is-placing"); }
    closePalette(); closeSheet();
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function readHash() {
    var h = (location.hash || "").replace(/^#\/?/, "");
    var parts = h.split("/");
    if (parts[0] === "tour") return { view: "tour", room: parts[1] || null };
    if (parts[0] === "studio") return { view: "studio", tab: parts[1] || "rooms" };
    return { view: "dash" };
  }

  /* ═══════════════════════════════════════════════════════════════════════
     DASHBOARD
     ═══════════════════════════════════════════════════════════════════════ */
  var dashFloor = "all";

  function buildDash() {
    var b = TOUR.brand || {}, p = TOUR.project || {};
    $("#heroEyebrow").textContent = [b.tagline, p.name].filter(Boolean).join("  ·  ");
    $("#heroTitle").innerHTML = "Walk the building<br><em>before you visit</em>";
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
    [[p.area, "Footprint"], [String(p.floors || TOUR.floors.length), "Floors"],
    [String(TOUR.rooms.length), "Positions"], [p.duration, "Walkthrough"]].forEach(function (m) {
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
  var paletteOpen = false, palItems = [], palSel = 0;

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
    [
      { title: "Start guided walkthrough", sub: "Play the automatic tour", ic: "play", run: function () { closePalette(); setView("tour"); guidedStart(); } },
      { title: "Open content studio", sub: "Rooms, hotspots, branding, publish", ic: "edit", run: function () { closePalette(); setView("studio"); } },
      { title: "Export a still", sub: "PNG of the current view", ic: "camera", run: function () { closePalette(); shot(); } },
      { title: "Copy link to this view", sub: "Deep link with the exact angle", ic: "share", run: function () { closePalette(); share(); } },
      { title: "Back to overview", sub: "Project dashboard", ic: "home", run: function () { closePalette(); setView("dash"); } },
      { title: "Toggle fullscreen", sub: "Immersive mode", ic: "expand", run: function () { closePalette(); toggleFull(); } },
      { title: "Rendering quality · High", sub: "4K panoramas — best on a dedicated GPU", ic: "settings", run: function () { closePalette(); engine.quality("hi"); toast("Rendering at full resolution."); } },
      { title: "Rendering quality · Balanced", sub: "Matches the panorama size to your hardware", ic: "settings", run: function () { closePalette(); engine.quality("auto"); toast("Quality set to automatic."); } },
      { title: "Rendering quality · Low", sub: "Smaller panoramas — for older machines", ic: "settings", run: function () { closePalette(); engine.quality("lo"); toast("Rendering at low quality."); } }
    ].forEach(function (a) {
      out.push({ group: "Actions", kind: "action", icon: a.ic, title: a.title, sub: a.sub, terms: (a.title + " " + a.sub).toLowerCase(), run: a.run });
    });
    return out;
  }

  function openPalette() {
    paletteOpen = true;
    $("#palette").classList.add("is-on");
    $("#scrim").classList.add("is-on");
    $("#paletteInput").value = "";
    filterPalette("");
    engine && engine.inputs(false);
    setTimeout(function () { $("#paletteInput").focus(); }, 40);
  }
  function closePalette() {
    if (!paletteOpen) return;
    paletteOpen = false;
    $("#palette").classList.remove("is-on");
    if (!sheetOpen) $("#scrim").classList.remove("is-on");
    engine && engine.inputs(view !== "dash" || !coarse);
  }
  function filterPalette(q) {
    q = (q || "").trim().toLowerCase();
    var all = paletteData();
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
    publish: ["Publish", "Save, export and embed"]
  };

  function renderStudio() {
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
    else studioPublish(body);
    markSaved(dirty ? "Unsaved changes" : "Saved", dirty);
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
    wrap.appendChild(el("h4", null, "Positions"));
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

    cols.appendChild(main);
    var side = roomListPanel(function () { renderStudio(); });
    cols.appendChild(side);
    body.appendChild(cols);
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
      localStorage.removeItem(STORE_KEY);
      TOUR = JSON.parse(JSON.stringify(SHIPPED));
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
      "/tour\n" +
      "  ├── index.html      shell\n" +
      "  ├── app.css         design system\n" +
      "  ├── app.js          application\n" +
      "  ├── engine.js       WebGL engine · no dependencies\n" +
      "  ├── tour.js         this tour  ← the only file that changes\n" +
      "  └── panos/          your stitched captures\n\n" +
      "No build step. No server runtime. No licence key.";
    host.appendChild(tree);
    main.appendChild(host);

    var embed = el("div", "studio-panel card");
    embed.style.marginTop = "16px";
    embed.appendChild(el("h4", null, "Embed"));
    embed.appendChild(el("p", "t-body", "Drop the tour into any page — a website, an intranet, a Notion doc, a listing portal."));
    var code = el("pre", "code");
    var origin = location.origin + location.pathname.replace(/index\.html$/, "");
    code.textContent =
      '<iframe\n  src="' + origin + '#/tour/' + (currentRoom ? currentRoom.id : "reception") + '"\n' +
      '  width="100%" height="640"\n  style="border:0;border-radius:16px"\n' +
      '  allow="fullscreen; accelerometer; gyroscope; xr-spatial-tracking"\n' +
      '  title="' + esc(TOUR.project.name) + ' virtual tour"></iframe>';
    embed.appendChild(code);
    var cp = el("button", "btn btn--sm");
    cp.style.marginTop = "10px";
    cp.textContent = "Copy embed code";
    cp.onclick = function () {
      navigator.clipboard && navigator.clipboard.writeText(code.textContent);
      toast("Embed code copied.");
    };
    embed.appendChild(cp);
    main.appendChild(embed);

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
      if (view === "studio") { setView("tour"); return; }
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
    else if (k === "e") setView("studio");
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
        else setView(t);
      };
    });
    $("#btnStart").onclick = function () { enterTour(currentRoom ? currentRoom.id : TOUR.rooms[0].id); };
    $("#btnPreviewEnter").onclick = function () { enterTour(currentRoom && currentRoom.id); };
    $("#btnGuided").onclick = function () { enterTour(TOUR.rooms[0].id); setTimeout(guidedStart, 400); };
    $("#btnHome").onclick = function () { setView("dash"); };
    $("#btnSearch").onclick = openPalette;
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
    $("#btnStudio").onclick = function () { setView("studio"); };
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
      if (r.view !== view) setView(r.view);
      if (r.view === "tour" && r.room && roomsById[r.room] && (!currentRoom || currentRoom.id !== r.room)) engine.go(r.room);
      if (r.view === "studio" && r.tab && r.tab !== studioTab) { studioTab = r.tab; renderStudio(); }
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
    dockMore.onclick = openPalette;
    $("#btnCloseLeft").addEventListener("click", function () { $("#panelLeft").classList.remove("is-open"); syncDock(); });
    $("#btnCloseRight").addEventListener("click", function () { $("#panelRight").classList.remove("is-open"); syncDock(); });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     BOOT
     ═══════════════════════════════════════════════════════════════════════ */
  function boot() {
    indexRooms();
    applyBrand();
    wire();

    var params = new URLSearchParams(location.search);
    var route = readHash();

    engine = window.RED360.createEngine({
      canvas: $("#gl"),
      host: $("#stageDash"),
      quality: params.get("q") || "auto",
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
        $("#loader").classList.add("is-done");
        $("#previewLoading").classList.add("is-done");
        setTimeout(function () { $("#loader").style.display = "none"; }, 800);
        paintAllThumbs();
      },
      onRoom: function (room) { setRoom(room); },
      onFrame: function (cam, room) {
        if (view === "dash") return;
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

    if (route.view !== "dash") {
      if (route.view === "studio" && route.tab) studioTab = route.tab;
      setView(route.view, { force: true });
    } else {
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
    engine: function () { return engine; }
  };
})();

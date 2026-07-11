/* ============================================================
   Billy Digitals — Template Experience
   1) A rotating "brainstorming" orbit of the sample styles.
   2) An in-site viewer: templates open INSIDE the page in an
      overlay with a back button; the browser/phone back button
      also closes it, returning you to the exact spot you left.
   3) A live animated background behind the section.
   Vanilla JS, no deps. Degrades to the original grid if anything
   is missing or reduced-motion is requested.
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var section = document.getElementById("templates");
  var grid = document.getElementById("templatesGrid");
  if (!section || !grid) return;

  // ---- read template data from the existing cards ----
  var items = [].slice.call(grid.querySelectorAll(".tcard")).map(function (card) {
    var a = card.querySelector(".tthumb");
    var href = a ? a.getAttribute("href") : "#";
    return {
      href: href,
      slug: (href.split("/").pop() || "").replace(".html", ""),
      name: text(card.querySelector("h3")),
      cat: card.getAttribute("data-cat") || "",
      catLabel: text(card.querySelector(".tcat")),
      emoji: text(card.querySelector(".tthumb-emoji")),
      t1: (a && a.style.getPropertyValue("--t1")) || "#2b7fff",
      t2: (a && a.style.getPropertyValue("--t2")) || "#22d3ee"
    };
  });
  if (items.length < 2) return;
  function text(el) { return el ? (el.textContent || "").trim() : ""; }

  /* ==========================================================
     Live animated background
     ========================================================== */
  var bg = document.createElement("canvas");
  bg.className = "tx-bg"; bg.setAttribute("aria-hidden", "true");
  section.insertBefore(bg, section.firstChild);
  (function background() {
    var ctx = bg.getContext("2d");
    var blobs = [], stars = [], W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var cols = ["#2b7fff", "#22d3ee", "#7c3aed", "#0ea5e9"];
    function size() {
      W = section.clientWidth; H = section.clientHeight;
      bg.width = W * dpr; bg.height = H * dpr; bg.style.width = W + "px"; bg.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function seed() {
      blobs = []; for (var i = 0; i < 6; i++) blobs.push({
        x: Math.random() * W, y: Math.random() * H,
        r: 180 + Math.random() * 260, c: cols[i % cols.length],
        vx: (Math.random() - 0.5) * 0.14, vy: (Math.random() - 0.5) * 0.11, ph: Math.random() * 6.28
      });
      stars = []; for (var j = 0; j < 70; j++) stars.push({
        x: Math.random() * W, y: Math.random() * H, z: 0.3 + Math.random() * 0.7, tw: Math.random() * 6.28
      });
    }
    size(); seed();
    new ResizeObserver(function () { size(); seed(); }).observe(section);

    var running = false, raf = null, onScreen = true, t = 0;
    function frame() {
      raf = requestAnimationFrame(frame); t += 0.016;
      ctx.clearRect(0, 0, W, H);
      // drifting nebula
      ctx.globalCompositeOperation = "lighter";
      for (var i = 0; i < blobs.length; i++) {
        var b = blobs[i];
        b.x += b.vx + Math.sin(t * 0.3 + b.ph) * 0.12;
        b.y += b.vy + Math.cos(t * 0.24 + b.ph) * 0.10;
        if (b.x < -b.r) b.x = W + b.r; if (b.x > W + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = H + b.r; if (b.y > H + b.r) b.y = -b.r;
        var g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, hexA(b.c, 0.20)); g.addColorStop(1, hexA(b.c, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.2832); ctx.fill();
      }
      // faint starfield
      for (var s = 0; s < stars.length; s++) {
        var st = stars[s]; var a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.4 + st.tw)) * st.z;
        ctx.fillStyle = "rgba(200,220,255," + a.toFixed(3) + ")";
        ctx.fillRect(st.x, st.y, st.z * 1.6, st.z * 1.6);
      }
      ctx.globalCompositeOperation = "source-over";
    }
    function play() { if (running) return; running = true; frame(); }
    function pause() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }
    function sync() { (onScreen && document.visibilityState !== "hidden" && !reduce) ? play() : (pause(), reduce && paintStatic()); }
    function paintStatic() { // one clean frame for reduced-motion
      ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = "lighter";
      for (var i = 0; i < blobs.length; i++) { var b = blobs[i]; var g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r); g.addColorStop(0, hexA(b.c, 0.16)); g.addColorStop(1, hexA(b.c, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.2832); ctx.fill(); }
      ctx.globalCompositeOperation = "source-over";
    }
    new IntersectionObserver(function (e) { onScreen = e[0].isIntersecting; sync(); }, { threshold: 0.01 }).observe(section);
    document.addEventListener("visibilitychange", sync);
    sync();
  })();
  function hexA(hex, a) {
    hex = hex.trim().replace("#", "");
    if (hex.length === 3) hex = hex.replace(/(.)/g, "$1$1");
    var n = parseInt(hex, 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  /* ==========================================================
     Orbit
     ========================================================== */
  var stage = document.createElement("div");
  stage.className = "tx-stage";
  var orbit = document.createElement("div"); orbit.className = "tx-orbit"; stage.appendChild(orbit);
  var hub = document.createElement("div"); hub.className = "tx-hub";
  hub.innerHTML = '<div class="core"><span>B</span></div><div class="hub-label"><b>' + items.length + ' industries</b><br>one signature look each</div>';
  stage.appendChild(hub);

  // Real photography for each style instead of emoji, so the orbit reads
  // as an actual portfolio. Falls back to the emoji if a slug is unmapped.
  var CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3FGGVT7BdUNi97QY6Gukppcri19/";
  var imgMap = {
    atelier:     CDN + "hf_20260711_221955_6f576c4c-001f-4896-af96-3ce7b07e70a7_min.webp",
    aurum:       CDN + "hf_20260711_224020_97fde0a0-9e26-4b4d-b552-e1c29e6b0ac9_min.webp",
    lumiere:     CDN + "hf_20260711_224045_1064b9e1-ba5a-4869-99fa-1dff51d0b3d7_min.webp",
    restaurant:  CDN + "hf_20260707_034814_1799480b-9d5d-42dd-b2a6-0126c97e93e2_min.webp",
    corporate:   CDN + "hf_20260707_034819_19ee2c8c-cd05-45e7-8fb1-f6932a99a56a_min.webp",
    portfolio:   CDN + "hf_20260707_035008_2f6272d6-5623-4795-bc98-c584bfe01e48_min.webp",
    realestate:  CDN + "hf_20260707_035023_f3548813-1801-4ab2-8814-26ef480ec9f9_min.webp",
    medical:     CDN + "hf_20260707_034839_3a8767bc-27fc-4d84-8506-70c8dc7c6570_min.webp",
    education:   CDN + "hf_20260707_034822_6979d34d-706b-4eb1-9b16-461ffe1c2faa_min.webp",
    saas:        CDN + "hf_20260707_035009_66bc911d-e195-4343-b379-0ef0c0bf79dc_min.webp",
    fitness:     CDN + "hf_20260707_034840_67554d1a-91ff-4a4c-89e6-4a976a589649_min.webp",
    travel:      CDN + "hf_20260707_034901_95dbcf5b-8672-46bb-8082-8e92a9187fad_min.webp",
    law:         CDN + "hf_20260708_005756_f1a5dd19-d2eb-4160-93e4-4eba78244f5f_min.webp",
    automotive:  CDN + "hf_20260708_005758_c330b3fd-cb2b-437c-ad02-dbda47d54eaf_min.webp",
    cafe:        CDN + "hf_20260708_005801_9843a2dd-2e0a-42ec-8ec4-3246908139c7_min.webp",
    photography: CDN + "hf_20260708_005801_da1d7696-58ca-4397-9d2f-291fd21408fa_min.webp",
    music:       CDN + "hf_20260708_005807_dc214a1a-9d08-4e0d-9a34-799e743dbed7_min.webp",
    wellness:    CDN + "hf_20260708_005808_75a36fdd-ddf6-43a0-a4bf-2a4bd23d4785_min.webp"
  };

  var nodes = items.map(function (it, i) {
    var n = document.createElement("button");
    n.type = "button"; n.className = "tx-node"; n.setAttribute("data-cat", it.cat);
    n.setAttribute("aria-label", "View the " + it.name + " sample");
    n.style.setProperty("--t1", it.t1); n.style.setProperty("--t2", it.t2);
    var art = imgMap[it.slug]
      ? '<img class="shot" src="' + imgMap[it.slug] + '" alt="" loading="lazy" decoding="async">'
      : '<span class="emoji" aria-hidden="true">' + it.emoji + '</span>';
    n.innerHTML =
      '<span class="thumb">' + art +
      '<span class="badge">' + it.catLabel + '</span>' +
      '<span class="go">Open ' + it.name + ' ↗</span></span>' +
      '<span class="label"><span class="name">' + it.name + '</span><span class="cat">' + it.catLabel + '</span></span>';
    n._it = it; n._i = i;
    // Keyboard access; pointer taps are handled in the pointerup logic below
    // (a native click on a slowly-spinning tile can miss, so we don't rely on it).
    n.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); viewer.open(it); } });
    orbit.appendChild(n);
    return n;
  });

  var hint = document.createElement("p");
  hint.className = "tx-hint";
  var touch = window.matchMedia && matchMedia("(hover: none)").matches;
  hint.innerHTML = touch
    ? 'Swipe to spin the wheel · tap the front style to open it here · a <b>Back to site</b> button brings you right back'
    : 'Drag to spin · click any style to open it here · <kbd>Esc</kbd> or <b>Back to site</b> returns you';
  stage.appendChild(hint);

  grid.parentNode.insertBefore(stage, grid.nextSibling);
  section.classList.add("tx-live");

  // geometry + animation
  var N = nodes.length, step = (Math.PI * 2) / N;
  var base = 0, vel = 0, hoverK = 1, focusIdx = -1, dragging = false, lastX = 0, dragMoved = 0, hovering = false;
  var canHover = !(window.matchMedia && matchMedia("(hover: none)").matches);
  var Rx = 360, Ry = 240;
  function measure() {
    var w = stage.clientWidth, h = stage.clientHeight;
    Rx = Math.max(110, Math.min(w * 0.36, 400));
    Ry = Math.min(h * 0.30, Rx * 0.74);
  }
  measure(); new ResizeObserver(measure).observe(stage);

  // Cards ride an ellipse around the hub; the one nearest the bottom is
  // "front" (largest, sharpest), so the wheel reads as turning in space.
  function layout() {
    // find the front-most node (nearest the bottom) so it can be the hero
    var maxDepth = -1, frontI = 0;
    for (var k = 0; k < N; k++) { var dk = (Math.sin(base + k * step) + 1) / 2; if (dk > maxDepth) { maxDepth = dk; frontI = k; } }
    var heroI = focusIdx >= 0 ? focusIdx : frontI;
    for (var i = 0; i < N; i++) {
      var ang = base + i * step;
      var x = Math.cos(ang) * Rx;
      var y = Math.sin(ang) * Ry;
      var depth = (Math.sin(ang) + 1) / 2;       // 0 back(top) .. 1 front(bottom)
      var isHero = i === heroI;
      // strong zoom on the middle/front one, back ones recede
      var sc = 0.5 + 0.62 * depth + (isHero ? 0.14 : 0);
      var n = nodes[i];
      n.classList.toggle("front", isHero);
      n.style.transform = "translate(-50%,-50%) translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) scale(" + sc.toFixed(3) + ")";
      n.style.zIndex = String(isHero ? 200 : 10 + Math.round(depth * 100));
      n.style.opacity = (focusIdx >= 0 ? (i === focusIdx ? 1 : 0.16) : (0.32 + 0.68 * depth)).toFixed(3);
    }
  }

  var prev = null, TAU = Math.PI * 2, running = false, lastBase = NaN, lastFocus = -2, orbitVisible = false;
  function tick(now) {
    if (!running) return;
    requestAnimationFrame(tick);
    if (prev === null) prev = now; var dt = Math.min((now - prev) / 1000, 0.05); prev = now;
    if (focusIdx >= 0) {                            // ease the focused style to the front (bottom)
      var target = (Math.PI / 2) - focusIdx * step;
      target += Math.round((base - target) / TAU) * TAU;   // nearest equivalent angle
      base += (target - base) * 0.12; vel = 0;
    } else if (!dragging && hovering) {              // frozen while the mouse is over the wheel, so tiles are easy to click
      vel = 0;
    } else if (!dragging && !reduce) {               // idle auto-spin (paused under reduced-motion)
      vel += (0.28 - vel) * 0.04;
      base += vel * dt;
    } else if (!dragging && reduce) {                // reduced-motion: let flung momentum settle, no idle spin
      base += vel * dt; vel *= 0.94;
    }
    // Only write to the DOM when the wheel actually moved — a frozen or
    // settled wheel then costs nothing per frame.
    if (dragging || base !== lastBase || focusIdx !== lastFocus) {
      layout(); lastBase = base; lastFocus = focusIdx;
    }
  }
  function startOrbit() { if (running) return; running = true; prev = null; requestAnimationFrame(tick); }
  function stopOrbit() { running = false; }
  layout();   // position the tiles once up front, even before the wheel scrolls into view
  // Pause the entire wheel when it's off-screen or the tab is hidden. This is
  // the single biggest saving on lower-powered laptops — no work when unseen.
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        orbitVisible = e.isIntersecting;
        (orbitVisible && document.visibilityState !== "hidden") ? startOrbit() : stopOrbit();
      });
    }, { threshold: 0.04 }).observe(stage);
  } else { orbitVisible = true; startOrbit(); }
  document.addEventListener("visibilitychange", function () {
    (orbitVisible && document.visibilityState !== "hidden") ? startOrbit() : stopOrbit();
  });

  // hover pauses the spin
  // On a mouse device, freeze the wheel whenever the pointer is over it so
  // tiles sit still and are easy to click. (Touch devices keep spinning; a
  // tap there lands on whatever tile is under the finger.)
  stage.addEventListener("pointerover", function () { if (canHover) hovering = true; });
  stage.addEventListener("pointerout", function (e) { if (canHover && !stage.contains(e.relatedTarget)) hovering = false; });

  // Drag/swipe to spin, tap to open. The tiles sit in a 3D-perspective
  // context where DOM hit-testing on a transformed tile is unreliable, so we
  // work in geometry: figure out which tile is nearest the pointer from the
  // wheel's own maths. Handled on `window` (gated to presses that start over
  // the stage) so it never depends on which element the browser hit-tests.
  function stageRect() { return stage.getBoundingClientRect(); }
  function inStage(x, y) { var r = stageRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }
  function nearestIndex(x, y) {
    var r = stageRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, best = 0, bd = Infinity;
    for (var i = 0; i < N; i++) {
      var a = base + i * step, nx = cx + Math.cos(a) * Rx, ny = cy + Math.sin(a) * Ry;
      var d = (x - nx) * (x - nx) + (y - ny) * (y - ny);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  var pressed = false;
  window.addEventListener("pointerdown", function (e) {
    if (!inStage(e.clientX, e.clientY)) return;   // ignore presses elsewhere on the page
    pressed = true; dragging = true; lastX = e.clientX; dragMoved = 0;
  });
  window.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var dx = e.clientX - lastX; lastX = e.clientX; dragMoved += Math.abs(dx);
    if (dragMoved > 8 && focusIdx >= 0) {          // a real swipe releases any category lock
      focusIdx = -1;
      fbtns.forEach(function (b) { b.classList.remove("active"); });
      var allBtn = document.querySelector('.fbtn[data-filter="all"]'); if (allBtn) allBtn.classList.add("active");
    }
    base += dx * 0.006; vel = dx * 0.05;
  });
  window.addEventListener("pointerup", function (e) {
    if (pressed && dragMoved < 8) {                // a tap → open the tile nearest the pointer
      var it = nodes[nearestIndex(e.clientX, e.clientY)]._it;
      if (it) viewer.open(it);
    }
    dragging = false; pressed = false;
  });
  window.addEventListener("pointercancel", function () { dragging = false; pressed = false; });

  // filters bring a style to the front
  var fbtns = [].slice.call(document.querySelectorAll(".fbtn"));
  fbtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      fbtns.forEach(function (b) { b.classList.remove("active"); }); btn.classList.add("active");
      var f = btn.getAttribute("data-filter");
      if (f === "all") { focusIdx = -1; }
      else { for (var i = 0; i < items.length; i++) if (items[i].cat === f) { focusIdx = i; break; } }
    });
  });

  /* ==========================================================
     In-site viewer overlay (opens templates inside the page)
     ========================================================== */
  var viewer = (function () {
    var el = document.createElement("div");
    el.className = "tx-overlay"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
    el.innerHTML =
      '<div class="tx-bar">' +
        '<button type="button" class="tx-back"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg> Back to site</button>' +
        '<span class="tx-title"></span>' +
        '<span class="tx-spacer"></span>' +
        '<a class="tx-newtab" target="_blank" rel="noopener">Open in new tab ↗</a>' +
        '<a class="tx-cta" href="#contact">Request this style</a>' +
      '</div>' +
      '<div class="tx-frame-wrap"><div class="tx-loader">Loading sample…</div><iframe class="tx-frame" title="Template preview" loading="lazy"></iframe></div>';
    document.body.appendChild(el);
    var frame = el.querySelector(".tx-frame"), loader = el.querySelector(".tx-loader"),
        titleEl = el.querySelector(".tx-title"), back = el.querySelector(".tx-back"),
        newtab = el.querySelector(".tx-newtab"), cta = el.querySelector(".tx-cta");
    var isOpen = false, pushed = false;

    frame.addEventListener("load", function () { if (frame.src) loader.classList.add("gone"); });

    function show(it) {
      titleEl.innerHTML = it.name + '<span class="tx-cat">' + it.catLabel + '</span>';
      newtab.href = it.href; cta.href = "#contact";
      loader.classList.remove("gone");
      frame.src = it.href;
      el.classList.add("open"); document.body.classList.add("tx-locked");
      isOpen = true;
      back.focus();
    }
    function open(it) {
      if (!isOpen) { history.pushState({ txView: it.slug }, "", "#style=" + it.slug); pushed = true; }
      else { history.replaceState({ txView: it.slug }, "", "#style=" + it.slug); }
      show(it);
    }
    function hide() {
      el.classList.remove("open"); document.body.classList.remove("tx-locked");
      isOpen = false;
      setTimeout(function () { if (!isOpen) { frame.src = "about:blank"; loader.classList.remove("gone"); } }, 360);
    }
    // Back button / Esc use history so the exact scroll position is restored.
    function requestClose() { if (pushed && history.state && history.state.txView) { history.back(); } else { hide(); } }
    back.addEventListener("click", requestClose);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && isOpen) requestClose(); });
    window.addEventListener("popstate", function () {
      var st = history.state;
      if (st && st.txView) { var it = bySlug(st.txView); if (it) { show(it); return; } }
      if (isOpen) hide();
    });
    // Deep link: /#style=restaurant opens that sample on load.
    (function deep() {
      var m = (location.hash || "").match(/style=([\w-]+)/);
      if (m) { var it = bySlug(m[1]); if (it) { history.replaceState({ txView: it.slug }, "", location.hash); pushed = true; show(it); } }
    })();
    function bySlug(s) { for (var i = 0; i < items.length; i++) if (items[i].slug === s) return items[i]; return null; }
    return { open: open };
  })();
})();

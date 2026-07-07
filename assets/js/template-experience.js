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
    var blobs = [], stars = [], W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
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

  var nodes = items.map(function (it, i) {
    var n = document.createElement("button");
    n.type = "button"; n.className = "tx-node"; n.setAttribute("data-cat", it.cat);
    n.setAttribute("aria-label", "View the " + it.name + " sample");
    n.style.setProperty("--t1", it.t1); n.style.setProperty("--t2", it.t2);
    n.innerHTML =
      '<span class="thumb"><span class="emoji" aria-hidden="true">' + it.emoji + '</span>' +
      '<span class="go">Open ↗</span></span>' +
      '<span class="label"><span class="name">' + it.name + '</span><span class="cat">' + it.catLabel + '</span></span>';
    n._it = it; n._i = i;
    n.addEventListener("click", function () { viewer.open(it); });
    orbit.appendChild(n);
    return n;
  });

  var hint = document.createElement("p");
  hint.className = "tx-hint";
  hint.innerHTML = 'Drag to spin · click any style to open it here · <kbd>Esc</kbd> to come back';
  stage.appendChild(hint);

  grid.parentNode.insertBefore(stage, grid.nextSibling);
  section.classList.add("tx-live");

  // geometry + animation
  var N = nodes.length, step = (Math.PI * 2) / N;
  var base = 0, vel = 0, hoverK = 1, focusIdx = -1, dragging = false, lastX = 0, dragMoved = 0;
  var Rx = 360, Ry = 240;
  function measure() {
    var w = stage.clientWidth, h = stage.clientHeight;
    Rx = Math.max(110, Math.min(w * 0.36, 400));
    Ry = Math.min(h * 0.34, Rx * 0.8);
  }
  measure(); new ResizeObserver(measure).observe(stage);

  // Cards ride an ellipse around the hub; the one nearest the bottom is
  // "front" (largest, sharpest), so the wheel reads as turning in space.
  function layout() {
    for (var i = 0; i < N; i++) {
      var ang = base + i * step;
      var x = Math.cos(ang) * Rx;
      var y = Math.sin(ang) * Ry;
      var depth = (Math.sin(ang) + 1) / 2;       // 0 back(top) .. 1 front(bottom)
      var sc = 0.78 + 0.22 * depth;
      var n = nodes[i];
      n.style.transform = "translate(-50%,-50%) translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) scale(" + sc.toFixed(3) + ")";
      n.style.zIndex = String(10 + Math.round(depth * 100));
      n.style.opacity = (focusIdx >= 0 ? (i === focusIdx ? 1 : 0.2) : (0.5 + 0.5 * depth)).toFixed(3);
    }
  }

  var prev = null, TAU = Math.PI * 2;
  function tick(now) {
    requestAnimationFrame(tick);
    if (prev === null) prev = now; var dt = Math.min((now - prev) / 1000, 0.05); prev = now;
    if (focusIdx >= 0) {                            // ease the focused style to the front (bottom)
      var target = (Math.PI / 2) - focusIdx * step;
      target += Math.round((base - target) / TAU) * TAU;   // nearest equivalent angle
      base += (target - base) * 0.12; vel = 0;
    } else if (!dragging) {                         // auto-spin (momentum eases back to it)
      vel += (0.28 * hoverK - vel) * 0.04;
      base += vel * dt;
    }
    layout();
  }
  if (reduce) { layout(); }                          // static ring, no spin
  else { requestAnimationFrame(tick); }

  // hover pauses the spin
  stage.addEventListener("pointerover", function (e) { if (e.target.closest(".tx-node")) hoverK = 0; });
  stage.addEventListener("pointerout", function (e) { if (!stage.matches(":hover")) hoverK = 1; });

  // drag to spin
  stage.addEventListener("pointerdown", function (e) {
    if (focusIdx >= 0) return;
    dragging = true; lastX = e.clientX; dragMoved = 0; stage.setPointerCapture && stage.setPointerCapture(e.pointerId);
  });
  window.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var dx = e.clientX - lastX; lastX = e.clientX; dragMoved += Math.abs(dx);
    base += dx * 0.006; vel = dx * 0.05;
  });
  window.addEventListener("pointerup", function () { dragging = false; });
  // prevent a click firing after a real drag
  stage.addEventListener("click", function (e) { if (dragMoved > 6) { e.stopPropagation(); e.preventDefault(); } }, true);

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

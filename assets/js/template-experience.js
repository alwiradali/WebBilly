/* ============================================================
   Billy Digitals — Template Experience
   1) A smooth 3D coverflow carousel of the sample styles — one
      centred and face-on, neighbours angled back in space. Auto-
      glides, drag / swipe / arrows / keyboard, click to open.
   2) An in-site viewer: templates open INSIDE the page in an
      overlay; the browser/phone back button returns you.
   3) A live animated background behind the section.
   Vanilla JS, no deps. Degrades to the plain grid under reduced
   motion or if anything is missing.
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var section = document.getElementById("templates");
  var grid = document.getElementById("templatesGrid");
  if (!section || !grid) return;

  function text(el) { return el ? (el.textContent || "").trim() : ""; }
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

  /* ==========================================================
     Live animated background (unchanged)
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
        x: Math.random() * W, y: Math.random() * H, r: 180 + Math.random() * 260, c: cols[i % cols.length],
        vx: (Math.random() - 0.5) * 0.14, vy: (Math.random() - 0.5) * 0.11, ph: Math.random() * 6.28
      });
      stars = []; for (var j = 0; j < 70; j++) stars.push({ x: Math.random() * W, y: Math.random() * H, z: 0.3 + Math.random() * 0.7, tw: Math.random() * 6.28 });
    }
    size(); seed();
    new ResizeObserver(function () { size(); seed(); }).observe(section);
    var running = false, raf = null, onScreen = true, t = 0;
    function frame() {
      raf = requestAnimationFrame(frame); t += 0.016;
      ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = "lighter";
      for (var i = 0; i < blobs.length; i++) {
        var b = blobs[i];
        b.x += b.vx + Math.sin(t * 0.3 + b.ph) * 0.12; b.y += b.vy + Math.cos(t * 0.24 + b.ph) * 0.10;
        if (b.x < -b.r) b.x = W + b.r; if (b.x > W + b.r) b.x = -b.r; if (b.y < -b.r) b.y = H + b.r; if (b.y > H + b.r) b.y = -b.r;
        var g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, hexA(b.c, 0.20)); g.addColorStop(1, hexA(b.c, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.2832); ctx.fill();
      }
      for (var s = 0; s < stars.length; s++) {
        var st = stars[s]; var a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.4 + st.tw)) * st.z;
        ctx.fillStyle = "rgba(200,220,255," + a.toFixed(3) + ")"; ctx.fillRect(st.x, st.y, st.z * 1.6, st.z * 1.6);
      }
      ctx.globalCompositeOperation = "source-over";
    }
    function play() { if (running) return; running = true; frame(); }
    function pause() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }
    function paintStatic() {
      ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = "lighter";
      for (var i = 0; i < blobs.length; i++) { var b = blobs[i]; var g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r); g.addColorStop(0, hexA(b.c, 0.16)); g.addColorStop(1, hexA(b.c, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.2832); ctx.fill(); }
      ctx.globalCompositeOperation = "source-over";
    }
    function sync() { (onScreen && document.visibilityState !== "hidden" && !reduce) ? play() : (pause(), reduce && paintStatic()); }
    new IntersectionObserver(function (e) { onScreen = e[0].isIntersecting; sync(); }, { threshold: 0.01 }).observe(section);
    document.addEventListener("visibilitychange", sync); sync();
  })();
  function hexA(hex, a) {
    hex = hex.trim().replace("#", ""); if (hex.length === 3) hex = hex.replace(/(.)/g, "$1$1");
    var n = parseInt(hex, 16); return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  /* ==========================================================
     Coverflow carousel
     ========================================================== */
  var CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3FGGVT7BdUNi97QY6Gukppcri19/";
  var imgMap = {
    noir: CDN + "hf_20260712_215021_20e0ea05-8a6c-4245-86d0-e48ce36d176c_min.webp",
    atelier: CDN + "hf_20260711_221955_6f576c4c-001f-4896-af96-3ce7b07e70a7_min.webp",
    aurum: CDN + "hf_20260711_224020_97fde0a0-9e26-4b4d-b552-e1c29e6b0ac9_min.webp",
    lumiere: CDN + "hf_20260711_224045_1064b9e1-ba5a-4869-99fa-1dff51d0b3d7_min.webp",
    nova: "assets/thumb-nova.webp", creative: "assets/thumb-aether.webp",
    restaurant: CDN + "hf_20260707_034814_1799480b-9d5d-42dd-b2a6-0126c97e93e2_min.webp",
    corporate: CDN + "hf_20260707_034819_19ee2c8c-cd05-45e7-8fb1-f6932a99a56a_min.webp",
    portfolio: CDN + "hf_20260707_035008_2f6272d6-5623-4795-bc98-c584bfe01e48_min.webp",
    realestate: CDN + "hf_20260707_035023_f3548813-1801-4ab2-8814-26ef480ec9f9_min.webp",
    medical: CDN + "hf_20260707_034839_3a8767bc-27fc-4d84-8506-70c8dc7c6570_min.webp",
    education: CDN + "hf_20260707_034822_6979d34d-706b-4eb1-9b16-461ffe1c2faa_min.webp",
    saas: CDN + "hf_20260707_035009_66bc911d-e195-4343-b379-0ef0c0bf79dc_min.webp",
    fitness: CDN + "hf_20260707_034840_67554d1a-91ff-4a4c-89e6-4a976a589649_min.webp",
    travel: CDN + "hf_20260707_034901_95dbcf5b-8672-46bb-8082-8e92a9187fad_min.webp",
    law: CDN + "hf_20260708_005756_f1a5dd19-d2eb-4160-93e4-4eba78244f5f_min.webp",
    automotive: CDN + "hf_20260708_005758_c330b3fd-cb2b-437c-ad02-dbda47d54eaf_min.webp",
    cafe: CDN + "hf_20260708_005801_9843a2dd-2e0a-42ec-8ec4-3246908139c7_min.webp",
    photography: CDN + "hf_20260708_005801_da1d7696-58ca-4397-9d2f-291fd21408fa_min.webp",
    music: CDN + "hf_20260708_005807_dc214a1a-9d08-4e0d-9a34-799e743dbed7_min.webp",
    wellness: CDN + "hf_20260708_005808_75a36fdd-ddf6-43a0-a4bf-2a4bd23d4785_min.webp",
    barber: CDN + "hf_20260712_213912_4b9ad79b-4956-46ac-87d1-e7682f213f29_min.webp",
    chesters: CDN + "hf_20260712_213920_4a64eb96-184d-4d77-9911-dd8162408a2d_min.webp"
  };

  var stage = document.createElement("div");
  stage.className = "tcf"; stage.tabIndex = 0;
  stage.setAttribute("role", "group"); stage.setAttribute("aria-roledescription", "carousel");
  stage.setAttribute("aria-label", "Sample template styles");
  var track = document.createElement("div"); track.className = "tcf-track"; stage.appendChild(track);

  var prevBtn = document.createElement("button");
  prevBtn.type = "button"; prevBtn.className = "tcf-arrow prev"; prevBtn.setAttribute("aria-label", "Previous style"); prevBtn.innerHTML = "‹";
  var nextBtn = document.createElement("button");
  nextBtn.type = "button"; nextBtn.className = "tcf-arrow next"; nextBtn.setAttribute("aria-label", "Next style"); nextBtn.innerHTML = "›";
  stage.appendChild(prevBtn); stage.appendChild(nextBtn);

  var cards = items.map(function (it, i) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "tcf-card"; b.setAttribute("data-cat", it.cat);
    b.setAttribute("aria-label", "Open the " + it.name + " sample");
    b.style.setProperty("--t1", it.t1); b.style.setProperty("--t2", it.t2);
    var art = imgMap[it.slug]
      ? '<img class="shot" src="' + imgMap[it.slug] + '" alt="" loading="lazy" decoding="async">'
      : '<span class="emoji" aria-hidden="true">' + it.emoji + '</span>';
    b.innerHTML =
      '<span class="tcf-thumb">' + art + '<span class="tcf-open">Open live ↗</span></span>' +
      '<span class="tcf-info"><span class="tcf-name">' + it.name + '</span><span class="tcf-cat">' + it.catLabel + '</span></span>';
    b._it = it; b._i = i;
    b.addEventListener("click", function () {
      if (moved > 7) return;                        // it was a drag, not a tap
      if (b._i === frontIdx) viewer.open(b._it);    // centre → open
      else bringToFront(b._i);                       // side → bring to centre
    });
    track.appendChild(b);
    return b;
  });

  var cap = document.createElement("p");
  cap.className = "tcf-hint";
  var touch = window.matchMedia && matchMedia("(hover: none)").matches;
  cap.innerHTML = touch
    ? "Swipe · tap the centre style to open it here"
    : "Drag or use ‹ › · click the centre style to open it here";

  var wrapEl = document.createElement("div");
  wrapEl.className = "tcf-wrap";
  wrapEl.appendChild(stage); wrapEl.appendChild(cap);
  grid.parentNode.insertBefore(wrapEl, grid.nextSibling);
  section.classList.add("tx-live");

  var N = cards.length;
  var pos = 0, target = 0, frontIdx = 0;
  var cardW = 300, cardH = 190, frontGap = 180, sideGap = 130, mobileNow = false;

  function measure() {
    var sw = stage.clientWidth || section.clientWidth || 1000;
    mobileNow = sw < 640;
    cardW = mobileNow ? Math.min(Math.round(sw * 0.72), 320) : Math.max(250, Math.min(Math.round(sw * 0.30), 360));
    cardH = Math.round(cardW * 0.64);
    frontGap = cardW * 0.62; sideGap = cardW * 0.44;
    stage.style.height = (cardH + (mobileNow ? 92 : 118)) + "px";
    for (var i = 0; i < N; i++) { cards[i].style.width = cardW + "px"; cards[i].style.height = cardH + "px"; }
    dirty = true;
  }

  function wrap(d) { d = ((d % N) + N) % N; if (d > N / 2) d -= N; return d; }

  function layout() {
    frontIdx = ((Math.round(pos) % N) + N) % N;
    for (var i = 0; i < N; i++) {
      var rel = wrap(i - pos), a = Math.abs(rel), sgn = rel < 0 ? -1 : 1;
      var vis = a <= 3.25;
      var c = cards[i];
      if (!vis) { c.style.opacity = "0"; c.style.pointerEvents = "none"; c.style.transform = "translate(-50%,-50%) scale(0.5)"; continue; }
      var capA = Math.min(a, 1);
      var x = sgn * (frontGap * capA + Math.max(a - 1, 0) * sideGap);
      var ry = -sgn * capA * 46;
      var sc = Math.max(1 - a * 0.12, 0.7) * (a < 0.5 ? 1.06 : 1);
      var z = -Math.min(a, 4) * 130;
      var op = Math.max(1 - a * 0.26, 0.18);
      c.style.transform = "translate(-50%,-50%) translateX(" + x.toFixed(1) + "px) translateZ(" + z.toFixed(1) + "px) rotateY(" + ry.toFixed(1) + "deg) scale(" + sc.toFixed(3) + ")";
      c.style.opacity = op.toFixed(3);
      c.style.zIndex = String(200 - Math.round(a * 10));
      c.style.pointerEvents = "auto";
      c.classList.toggle("front", a < 0.5);
    }
    prevBtn.classList.toggle("on", true); nextBtn.classList.toggle("on", true);
  }

  /* ---- motion loop ---- */
  var running = false, raf = null, visible = false, hovering = false, dragging = false, dirty = true, lastPos = NaN, autoT = 0;
  var viewerPaused = false;   // frozen while a template is open in the viewer
  var AUTO = 3.8, last = 0;
  function loop(now) {
    if (!running) return; raf = requestAnimationFrame(loop);
    var dt = Math.min((now - last) / 1000, 0.05) || 0.016; last = now;
    if (!dragging && !hovering && !reduce && !viewerPaused) { autoT += dt; if (autoT >= AUTO) { autoT = 0; target += 1; } }
    pos += (target - pos) * 0.12;
    if (Math.abs(target - pos) < 0.0004) pos = target;
    if (dragging || pos !== lastPos || dirty) { layout(); lastPos = pos; dirty = false; }
  }
  function start() { if (running || !visible || document.hidden) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  measure();
  new ResizeObserver(measure).observe(stage);
  layout();
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { es.forEach(function (e) { visible = e.isIntersecting; visible && !document.hidden ? start() : stop(); }); }, { threshold: 0.05 }).observe(stage);
  } else { visible = true; start(); }
  document.addEventListener("visibilitychange", function () { (visible && !document.hidden) ? start() : stop(); });

  function bringToFront(i) { target = i + N * Math.round((pos - i) / N); autoT = 0; }
  function frontItem() { return items[frontIdx]; }

  cards.forEach(function (c) {
    c.addEventListener("focus", function () { bringToFront(c._i); });
  });
  prevBtn.addEventListener("click", function () { target = Math.round(pos) - 1; autoT = 0; });
  nextBtn.addEventListener("click", function () { target = Math.round(pos) + 1; autoT = 0; });

  if (!(window.matchMedia && matchMedia("(hover: none)").matches)) {
    stage.addEventListener("pointerenter", function () { hovering = true; });
    stage.addEventListener("pointerleave", function () { hovering = false; });
  }
  stage.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { e.preventDefault(); target = Math.round(pos) - 1; autoT = 0; }
    else if (e.key === "ArrowRight") { e.preventDefault(); target = Math.round(pos) + 1; autoT = 0; }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); viewer.open(frontItem()); }
  });

  // drag / swipe to spin (window-level so it never loses the pointer);
  // taps are handled by each card's own click listener (guarded by `moved`).
  var startX = 0, startTarget = 0, moved = 0, pressed = false;
  stage.addEventListener("pointerdown", function (e) {
    if (e.target.closest(".tcf-arrow")) return;
    pressed = true; dragging = true; startX = e.clientX; startTarget = target; moved = 0;
  });
  window.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var dx = e.clientX - startX; moved = Math.max(moved, Math.abs(dx));
    target = startTarget - dx / (cardW * 0.62); autoT = 0;
  });
  window.addEventListener("pointerup", function () {
    if (!pressed) return; pressed = false; dragging = false;
    if (moved >= 7) target = Math.round(target);
    setTimeout(function () { moved = 0; }, 0);       // reset after the click fires
  });
  window.addEventListener("pointercancel", function () { pressed = false; dragging = false; moved = 0; });

  // filters bring a style to the front
  var fbtns = [].slice.call(document.querySelectorAll(".fbtn"));
  fbtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      fbtns.forEach(function (b) { b.classList.remove("active"); }); btn.classList.add("active");
      var f = btn.getAttribute("data-filter");
      if (f === "all") return;
      for (var i = 0; i < items.length; i++) if (items[i].cat === f) { bringToFront(i); break; }
    });
  });

  /* ==========================================================
     In-site viewer overlay (unchanged)
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
      loader.classList.remove("gone"); frame.src = it.href;
      el.classList.add("open"); document.body.classList.add("tx-locked"); isOpen = true;
      viewerPaused = true;                // freeze the carousel on this style
      back.focus();
    }
    function open(it) {
      if (!isOpen) { history.pushState({ txView: it.slug }, "", "#style=" + it.slug); pushed = true; }
      else { history.replaceState({ txView: it.slug }, "", "#style=" + it.slug); }
      show(it);
    }
    function hide() {
      el.classList.remove("open"); document.body.classList.remove("tx-locked"); isOpen = false;
      viewerPaused = false;               // let the carousel breathe again
      setTimeout(function () { if (!isOpen) { frame.src = "about:blank"; loader.classList.remove("gone"); } }, 360);
    }
    function requestClose() { if (pushed && history.state && history.state.txView) { history.back(); } else { hide(); } }
    back.addEventListener("click", requestClose);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && isOpen) requestClose(); });
    // the "Billy Digitals" pill inside the previewed template asks us to close (one clean click, no reload)
    window.addEventListener("message", function (e) { if (e.data && e.data.bdCloseViewer && isOpen) requestClose(); });
    window.addEventListener("popstate", function () {
      var st = history.state;
      if (st && st.txView) { var it = bySlug(st.txView); if (it) { show(it); return; } }
      if (isOpen) hide();
    });
    (function deep() {
      var m = (location.hash || "").match(/style=([\w-]+)/);
      if (m) { var it = bySlug(m[1]); if (it) { history.replaceState({ txView: it.slug }, "", location.hash); pushed = true; show(it); } }
    })();
    function bySlug(s) { for (var i = 0; i < items.length; i++) if (items[i].slug === s) return items[i]; return null; }
    return { open: open };
  })();
})();

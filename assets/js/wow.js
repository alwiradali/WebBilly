/* ============================================================
   Billy Digitals — WOW motion layer
   Scroll progress · 3D card tilt · magnetic buttons · aurora.
   Additive & non-conflicting with main.js reveals. 60fps-minded:
   transform-only, rAF-throttled, gated, reduced-motion safe.
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var touch = window.matchMedia && matchMedia("(hover: none)").matches;
  if (reduce) return;

  /* ---------- scroll progress bar ---------- */
  (function progress() {
    var bar = document.createElement("div");
    bar.className = "wow-progress";
    document.body.appendChild(bar);
    var ticking = false;
    function update() {
      var h = document.documentElement;
      var max = (h.scrollHeight - h.clientHeight) || 1;
      var p = Math.min(1, Math.max(0, (window.scrollY || h.scrollTop) / max));
      bar.style.transform = "scaleX(" + p + ")";
      ticking = false;
    }
    addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  })();

  /* ---------- 3D tilt on cards ---------- */
  (function tilt() {
    if (touch) return;
    var cards = document.querySelectorAll(".card, .offer, .plan, .host-card");
    cards.forEach(function (el) {
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      el.classList.add("tilt");
      var sheen = document.createElement("span");
      sheen.className = "tilt-sheen";
      el.appendChild(sheen);
      var raf = 0, rect = null;
      function onMove(e) {
        if (!rect) rect = el.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width;
        var py = (e.clientY - rect.top) / rect.height;
        if (raf) return;
        raf = requestAnimationFrame(function () {
          var rx = (0.5 - py) * 7;      // max ~7deg
          var ry = (px - 0.5) * 9;      // max ~9deg
          el.style.transform = "perspective(900px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg) translateY(-4px)";
          el.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
          el.style.setProperty("--my", (py * 100).toFixed(1) + "%");
          raf = 0;
        });
      }
      el.addEventListener("pointerenter", function () { rect = el.getBoundingClientRect(); el.classList.add("is-tilting"); });
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", function () {
        el.classList.remove("is-tilting");
        el.style.transform = "";
        rect = null;
      });
    });
  })();

  /* ---------- phone gyroscope tilt ----------
     On touch devices, tilt cards to how the phone is held via the device
     orientation sensor. Updates two CSS vars (--gx/--gy) that the mobile
     tilt rule in wow.css reads, so one cheap update tilts every card.
     iOS 13+ needs a user gesture to grant sensor access, so we request it
     on the first tap. Transform-only — cannot affect layout. */
  (function gyroTilt() {
    if (!touch) return;
    var root = document.documentElement, raf = 0, gx = 0, gy = 0;
    function apply() {
      root.style.setProperty("--gx", gx.toFixed(2) + "deg");
      root.style.setProperty("--gy", gy.toFixed(2) + "deg");
      raf = 0;
    }
    function onOrient(e) {
      var gamma = e.gamma || 0, beta = e.beta || 0;      // gamma: L/R (-90..90), beta: F/B
      gy = Math.max(-10, Math.min(10, gamma * 0.18));    // rotateY from left-right tilt
      gx = Math.max(-8, Math.min(8, (beta - 45) * -0.11)); // rotateX from front-back (neutral ~45°)
      if (!raf) raf = requestAnimationFrame(apply);
    }
    function start() { window.addEventListener("deviceorientation", onOrient, { passive: true }); }
    var DOE = window.DeviceOrientationEvent;
    if (!DOE) return;
    if (typeof DOE.requestPermission === "function") {   // iOS 13+
      var ask = function () {
        DOE.requestPermission().then(function (s) { if (s === "granted") start(); }).catch(function () {});
        window.removeEventListener("touchend", ask); window.removeEventListener("click", ask);
      };
      window.addEventListener("touchend", ask, { once: true });
      window.addEventListener("click", ask, { once: true });
    } else {
      start();
    }
  })();

  /* ---------- pinned zoom statement: scale the word with scroll ---------- */
  (function pinZoom() {
    var wrap = document.querySelector(".pinzoom");
    if (!wrap) return;
    var word = wrap.querySelector(".pz-word");
    var tag = wrap.querySelector(".pz-tag");
    if (!word) return;
    var raf = 0;
    function upd() {
      var r = wrap.getBoundingClientRect();
      var total = wrap.offsetHeight - window.innerHeight;
      var p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      word.style.setProperty("--pz", (0.55 + p * 0.95).toFixed(3));
      word.style.opacity = (0.4 + Math.min(1, p * 1.5) * 0.6).toFixed(2);
      if (tag) tag.style.setProperty("--pzt", (Math.max(0, (p - 0.5) * 2)).toFixed(2));
      raf = 0;
    }
    addEventListener("scroll", function () { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
    addEventListener("resize", upd, { passive: true });
    upd();
  })();

  /* ---------- magnetic buttons ---------- */
  (function magnetic() {
    if (touch) return;
    var btns = document.querySelectorAll(".btn-primary, .nav-cta, .magnetic");
    btns.forEach(function (el) {
      el.classList.add("magnetic-btn");
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.28;
        var y = (e.clientY - r.top - r.height / 2) * 0.4;
        el.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  })();

  /* ---------- aurora accents in a few simple sections ----------
     Desktop only, and never inside sections that run their own
     layout/carousel scripts (e.g. #templates) — injecting a child
     there corrupts their measurements and balloons the height. */
  (function aurora() {
    if (touch) return;
    ["services", "contact"].forEach(function (id) {
      var sec = document.getElementById(id);
      if (!sec) return;
      if (getComputedStyle(sec).position === "static") sec.style.position = "relative";
      var a = document.createElement("div");
      a.className = "wow-aurora";
      a.setAttribute("aria-hidden", "true");
      sec.insertBefore(a, sec.firstChild);
    });
  })();

  /* ---------- cursor spotlight over the hero ----------
     A soft brand-blue glow that follows the pointer across the hero.
     Desktop only, pointer-events none, transform-free (paints a moving
     radial-gradient var) — cannot affect layout. */
  (function spotlight() {
    if (touch) return;
    var hero = document.querySelector(".hero");
    if (!hero) return;
    if (getComputedStyle(hero).position === "static") hero.style.position = "relative";
    var s = document.createElement("div");
    s.className = "wow-spot";
    s.setAttribute("aria-hidden", "true");
    hero.insertBefore(s, hero.firstChild);
    var raf = 0, x = 0, y = 0;
    function apply() { s.style.setProperty("--sx", x + "px"); s.style.setProperty("--sy", y + "px"); raf = 0; }
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      x = e.clientX - r.left; y = e.clientY - r.top; s.style.opacity = "1";
      if (!raf) raf = requestAnimationFrame(apply);
    }, { passive: true });
    hero.addEventListener("pointerleave", function () { s.style.opacity = "0"; });
  })();

  /* ---------- Huly-style border beam on tiles ----------
     A light comet travels around each tile's rounded outline (masked
     rotating conic gradient). Appended as a child so it never clashes
     with the ::before/::after already used on cards. */
  (function hulyBeam() {
    var sel = ".panel, #services .card, .offer, .tcard, .plan, .host-card";
    var beams = [];
    document.querySelectorAll(sel).forEach(function (el) {
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      var b = document.createElement("span");
      b.className = "hbeam"; b.setAttribute("aria-hidden", "true");
      el.appendChild(b); beams.push(b);
    });
    // Only animate the comets on tiles that are actually on screen.
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { e.target.classList.toggle("live", e.isIntersecting); });
      }, { rootMargin: "120px 0px" });
      beams.forEach(function (b) { io.observe(b); });
    } else {
      beams.forEach(function (b) { b.classList.add("live"); });
    }
  })();

  /* ---------- bulletproof reveal reinforcement ----------
     The 3D reveal hides .reveal until it gets .in. To guarantee nothing
     ever stays invisible (even on fast mobile scroll), we reinforce with a
     zero-threshold observer AND a scroll/​load sweep that reveals anything
     that has entered the viewport. Belt and braces. */
  (function reveals() {
    var sel = ".reveal:not(.plan):not(.tcard), .wow-up, .wow-stagger";
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0, rootMargin: "0px 0px -2% 0px" });
    document.querySelectorAll(sel).forEach(function (t) { io.observe(t); });

    var raf = 0;
    function sweep() {
      var bottom = (window.scrollY || document.documentElement.scrollTop || 0) + window.innerHeight;
      document.querySelectorAll(".reveal:not(.in):not(.plan):not(.tcard), .wow-up:not(.in), .wow-stagger:not(.in)").forEach(function (el) {
        var r = el.getBoundingClientRect();
        var top = r.top + (window.scrollY || document.documentElement.scrollTop || 0);
        if (top < bottom - 20) el.classList.add("in");
      });
      raf = 0;
    }
    addEventListener("scroll", function () { if (!raf) raf = requestAnimationFrame(sweep); }, { passive: true });
    addEventListener("resize", sweep, { passive: true });
    addEventListener("load", sweep);
    sweep();
  })();
})();

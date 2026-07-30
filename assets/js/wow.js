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
    var cards = document.querySelectorAll(".card, .tcard, .offer, .plan, .host-card");
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

  /* ---------- aurora accents in a few sections ---------- */
  (function aurora() {
    ["services", "templates", "contact"].forEach(function (id) {
      var sec = document.getElementById(id);
      if (!sec) return;
      if (getComputedStyle(sec).position === "static") sec.style.position = "relative";
      var a = document.createElement("div");
      a.className = "wow-aurora";
      a.setAttribute("aria-hidden", "true");
      sec.insertBefore(a, sec.firstChild);
    });
  })();

  /* ---------- extra reveals for elements main.js doesn't cover ---------- */
  (function reveals() {
    var targets = document.querySelectorAll(".wow-up, .wow-stagger");
    if (!targets.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    targets.forEach(function (t) { io.observe(t); });
  })();
})();

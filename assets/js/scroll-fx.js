/* ============================================================
   Billy Digitals — additive scroll effects
   Cinematic hero parallax + fade, gentle heading/eyebrow depth.
   Self-contained, guarded, composes with existing reveal + Lenis.
   ============================================================ */
(function () {
  "use strict";
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var coarse = window.matchMedia && matchMedia("(pointer: coarse)").matches;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  var hero = document.querySelector(".hero");
  var heroInner = document.querySelector(".hero-inner");

  // parallax targets: children only (never the .reveal wrappers) so nothing conflicts
  var items = [];
  function add(sel, s) {
    [].forEach.call(document.querySelectorAll(sel), function (el) { items.push({ el: el, s: s }); });
  }
  if (!coarse) {
    add(".section-head h2", -0.06);   // headings drift up gently as they cross centre
    add(".section-head .tag", 0.07);  // eyebrow drifts the other way → depth
  }

  var vh = window.innerHeight;
  addEventListener("resize", function () { vh = window.innerHeight; }, { passive: true });

  function frame() {
    var sc = window.scrollY || window.pageYOffset || 0;

    // Hero: content gently sinks and fades as you scroll past — cinematic, clean
    if (hero && heroInner && !coarse) {
      var hh = hero.offsetHeight || vh;
      if (sc < hh * 1.15) {
        heroInner.style.transform = "translate3d(0," + (sc * 0.22) + "px,0)";
        heroInner.style.opacity = String(clamp(1 - sc / (hh * 0.85), 0, 1));
      }
    }

    // Heading / eyebrow parallax (only while near the viewport)
    for (var i = 0; i < items.length; i++) {
      var it = items[i], r = it.el.getBoundingClientRect();
      if (r.bottom < -120 || r.top > vh + 120) continue;
      var centre = (r.top + r.height / 2) - vh / 2;
      it.el.style.transform = "translate3d(0," + (centre * it.s) + "px,0)";
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

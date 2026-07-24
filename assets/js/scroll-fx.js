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

  // gentler intensity on phones so it stays buttery and never hides content
  var pf = coarse ? 0.5 : 1;

  // parallax targets: children only (never the .reveal wrappers) so nothing conflicts
  var items = [];
  function add(sel, s) {
    [].forEach.call(document.querySelectorAll(sel), function (el) { items.push({ el: el, s: s }); });
  }
  add(".section-head h2", -0.06 * pf);   // headings drift up gently as they cross centre
  add(".section-head .tag", 0.07 * pf);  // eyebrow drifts the other way → depth

  var vh = window.innerHeight;
  addEventListener("resize", function () { vh = window.innerHeight; }, { passive: true });

  // Safety net: guarantee scroll-reveal elements become visible once they enter
  // the viewport. Complements the site's own observer so content can never get
  // stuck hidden (e.g. flaky IntersectionObserver timing on some mobile browsers).
  var revs = [].slice.call(document.querySelectorAll(".reveal:not(.in)"));

  function frame() {
    var sc = window.scrollY || window.pageYOffset || 0;

    if (revs.length) {
      for (var ri = revs.length - 1; ri >= 0; ri--) {
        var rr = revs[ri].getBoundingClientRect();
        if (rr.top < vh * 0.92) { revs[ri].classList.add("in"); revs.splice(ri, 1); }
      }
    }

    // Hero motion.
    // Desktop: content gently sinks + fades as you scroll past (hero fits one screen).
    // Mobile: tiny drift only, NO fade — the hero is taller than the phone screen,
    // so fading it would hide content that's still visible.
    if (hero && heroInner) {
      var hh = hero.offsetHeight || vh;
      if (sc < hh * 1.15) {
        if (coarse) {
          heroInner.style.transform = "translate3d(0," + (sc * 0.06) + "px,0)";
        } else {
          heroInner.style.transform = "translate3d(0," + (sc * 0.22) + "px,0)";
          heroInner.style.opacity = String(clamp(1 - sc / (hh * 0.85), 0, 1));
        }
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

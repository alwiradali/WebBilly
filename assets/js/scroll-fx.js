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

/* ============================================================
   data-fx toolkit driver (additive, v2)
   Companion to the [data-fx=*] rules in scroll-fx.css.
   Effects: reveal · stagger · text · parallax · pin · horizontal · progressbar.

   Usage (opt-in per element):
     <h2 data-fx="reveal">Fades up</h2>
     <img data-fx="reveal" data-fx-variant="scale" data-fx-delay="150" src="…">
     <ul data-fx="stagger" data-fx-step="100"><li>…</li></ul>
     <h1 data-fx="text">Words rise in</h1>
     <div data-fx="parallax" data-fx-speed="0.25"><img src="bg.jpg"></div>
     <section data-fx="pin" style="height:300vh"><div class="fx-pin-inner">…</div></section>
     <section data-fx="horizontal" style="height:300vh">
       <div class="fx-h-sticky"><div class="fx-h-track">…cards…</div></div></section>
     <div data-fx="progressbar" style="color:#38bdf8"></div>

   Attributes: data-fx-variant (down|left|right|scale), data-fx-delay (ms),
   data-fx-step (ms, stagger/text), data-fx-speed (parallax).
   Self-contained, guarded, reduced-motion aware. window.ScrollFXKit.refresh(root)
   re-scans after dynamically injecting content.
   ============================================================ */
(function () {
  "use strict";
  var doc = document;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var sec = function (v, d) { v = parseFloat(v); return isNaN(v) ? d : v / 1000; }; // ms attr → s

  /* ---------- one-time setup: split text, mark stagger items ---------- */
  function makeWord(text, delay) {
    var w = doc.createElement("span"); w.className = "fx-word";
    var inner = doc.createElement("span"); inner.className = "fx-word-inner";
    inner.textContent = text; inner.style.transitionDelay = delay + "s";
    w.appendChild(inner); return w;
  }
  function setup(root) {
    root = root || doc;
    // TEXT → words
    [].forEach.call(root.querySelectorAll('[data-fx="text"]'), function (el) {
      if (el.__fx) return; el.__fx = 1;
      var step = sec(el.getAttribute("data-fx-step"), 0.05);
      var base = sec(el.getAttribute("data-fx-delay"), 0);
      var nodes = [].slice.call(el.childNodes), wi = 0;
      el.textContent = "";
      nodes.forEach(function (n) {
        if (n.nodeType === 3) {
          n.nodeValue.split(/(\s+)/).forEach(function (tok) {
            if (tok === "") return;
            if (tok.trim() === "") { el.appendChild(doc.createTextNode(tok)); return; }
            el.appendChild(makeWord(tok, base + wi * step)); wi++;
          });
        } else if (n.nodeType === 1) {              // keep child elements as one unit
          var w = doc.createElement("span"); w.className = "fx-word";
          var inner = doc.createElement("span"); inner.className = "fx-word-inner";
          inner.appendChild(n); inner.style.transitionDelay = (base + wi * step) + "s";
          w.appendChild(inner); el.appendChild(w); wi++;
        }
      });
    });
    // STAGGER → mark direct children
    [].forEach.call(root.querySelectorAll('[data-fx="stagger"]'), function (c) {
      if (c.__fx) return; c.__fx = 1;
      var step = sec(c.getAttribute("data-fx-step"), 0.08);
      var base = sec(c.getAttribute("data-fx-delay"), 0);
      [].forEach.call(c.children, function (it, i) {
        it.classList.add("fx-stagger-item");
        it.style.transitionDelay = (base + i * step) + "s";
      });
    });
    // REVEAL → optional delay
    [].forEach.call(root.querySelectorAll('[data-fx="reveal"]'), function (el) {
      var base = sec(el.getAttribute("data-fx-delay"), 0);
      if (base) el.style.transitionDelay = base + "s";
    });
  }

  /* ---------- reveal/stagger/text via IntersectionObserver ---------- */
  var io;
  function markIn(el) {
    el.classList.add("fx-in");
    [].forEach.call(el.querySelectorAll(".fx-stagger-item, .fx-word-inner"),
      function (i) { i.classList.add("fx-in"); });
  }
  function observe(root) {
    root = root || doc;
    var els = [].slice.call(root.querySelectorAll('[data-fx="reveal"],[data-fx="stagger"],[data-fx="text"]'));
    if (reduce) { els.forEach(markIn); return; }
    if (!io && "IntersectionObserver" in window) {
      io = new IntersectionObserver(function (en) {
        en.forEach(function (e) { if (e.isIntersecting) { markIn(e.target); io.unobserve(e.target); } });
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    }
    if (!io) { els.forEach(markIn); return; }        // no IO support → just show
    els.forEach(function (el) { if (!el.__ob) { el.__ob = 1; io.observe(el); } });
  }

  /* ---------- scroll-driven: parallax/pin/horizontal/progressbar ---------- */
  var par = [], pin = [], hor = [], bar = [], vh = window.innerHeight, ticking = false;
  function collect() {
    par = [].slice.call(doc.querySelectorAll('[data-fx="parallax"]')).map(function (el) {
      return { el: el, s: parseFloat(el.getAttribute("data-fx-speed")) || 0.2 };
    });
    pin = [].slice.call(doc.querySelectorAll('[data-fx="pin"]'));
    hor = [].slice.call(doc.querySelectorAll('[data-fx="horizontal"]')).map(function (el) {
      return { el: el, track: el.querySelector(".fx-h-track") };
    });
    bar = [].slice.call(doc.querySelectorAll('[data-fx="progressbar"]'));
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(render); } }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function render() {
    ticking = false;
    var y = window.pageYOffset || doc.documentElement.scrollTop || 0;
    if (bar.length) {
      var p = clamp01(y / ((doc.documentElement.scrollHeight - vh) || 1));
      for (var b = 0; b < bar.length; b++) bar[b].style.transform = "scaleX(" + p + ")";
    }
    if (reduce) return;
    for (var i = 0; i < par.length; i++) {
      var it = par[i], r = it.el.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) continue;
      var centre = (r.top + r.height / 2) - vh / 2;
      it.el.style.transform = "translate3d(0," + (-centre * it.s) + "px,0)";
    }
    for (var k = 0; k < pin.length; k++) {
      var pe = pin[k], pr = pe.getBoundingClientRect(), ph = pe.offsetHeight - vh;
      pe.style.setProperty("--fx-progress", (ph > 0 ? clamp01(-pr.top / ph) : 0).toFixed(4));
    }
    for (var m = 0; m < hor.length; m++) {
      var ho = hor[m]; if (!ho.track) continue;
      var hr = ho.el.getBoundingClientRect(), hh = ho.el.offsetHeight - vh;
      var hp = hh > 0 ? clamp01(-hr.top / hh) : 0;
      var dist = ho.track.scrollWidth - window.innerWidth; if (dist < 0) dist = 0;
      ho.track.style.transform = "translate3d(" + (-dist * hp) + "px,0,0)";
    }
  }

  function boot() { setup(); observe(); collect(); render(); }
  if (doc.readyState !== "loading") boot();
  else doc.addEventListener("DOMContentLoaded", boot);
  window.addEventListener("load", boot);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () { vh = window.innerHeight; collect(); onScroll(); }, { passive: true });

  window.ScrollFXKit = { refresh: function (root) { setup(root); observe(root); collect(); render(); } };
})();

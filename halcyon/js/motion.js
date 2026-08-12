/* ═══════════════════════════════════════════════════════════════════════════
   HALCYON — motion language (HAL.motion)
   Scroll reveals are handled by the global data-fx toolkit (scroll-fx.js).
   This file adds what the toolkit can't express: the cinematic hero rotation,
   magnetic buttons, cursor, animated counters, page-transition veil.
   Everything transform/opacity only; everything honours reduced motion.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ── cursor dot ─────────────────────────────────────────────────────────── */
  function cursor() {
    if (!finePointer || reduced) return;
    var dot = document.querySelector(".cursor-dot"); if (!dot) return;
    var x = 0, y = 0, cx = 0, cy = 0, live = false;
    addEventListener("pointermove", function (e) {
      x = e.clientX; y = e.clientY;
      if (!live) { live = true; dot.classList.add("is-live"); cx = x; cy = y; tick(); }
      var t = e.target.closest && e.target.closest("a,button,[data-cursor-grow]");
      dot.classList.toggle("is-grow", !!t);
    }, { passive: true });
    function tick() {
      cx += (x - cx) * 0.22; cy += (y - cy) * 0.22;
      dot.style.transform = "translate(" + cx + "px," + cy + "px)";
      requestAnimationFrame(tick);
    }
  }

  /* ── magnetic buttons ───────────────────────────────────────────────────── */
  function magnetic() {
    if (!finePointer || reduced) return;
    document.querySelectorAll(".btn:not([data-nomag]), .icon-btn").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        var mx = (e.clientX - r.left - r.width / 2) / r.width;
        var my = (e.clientY - r.top - r.height / 2) / r.height;
        b.style.transform = "translate(" + mx * 6 + "px," + my * 5 + "px)";
      });
      b.addEventListener("pointerleave", function () { b.style.transform = ""; });
    });
  }

  /* ── animated counters (data-count / data-count-prefix / -suffix) ───────── */
  function counters() {
    var nodes = document.querySelectorAll("[data-count]");
    if (!nodes.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var n = en.target, target = parseFloat(n.getAttribute("data-count"));
        var pre = n.getAttribute("data-count-prefix") || "", suf = n.getAttribute("data-count-suffix") || "";
        var dec = (String(target).split(".")[1] || "").length;
        if (reduced) { n.textContent = pre + target.toLocaleString("en-GB") + suf; return; }
        var t0 = performance.now(), dur = 1400;
        (function step(t) {
          var k = Math.min(1, (t - t0) / dur); k = 1 - Math.pow(1 - k, 3);
          var v = target * k;
          n.textContent = pre + (dec ? v.toFixed(dec) : Math.round(v).toLocaleString("en-GB")) + suf;
          if (k < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.6 });
    nodes.forEach(function (n) { io.observe(n); });
  }

  /* ── hero crossfade rotation (homepage) ─────────────────────────────────
     .hero-slides > figure elements; rotates with a slow scale drift.       */
  function heroRotate(sel, every) {
    var box = document.querySelector(sel); if (!box) return;
    var slides = box.querySelectorAll("figure"); if (slides.length < 2) return;
    var i = 0;
    slides[0].classList.add("is-on");
    if (reduced) return;
    setInterval(function () {
      slides[i].classList.remove("is-on");
      i = (i + 1) % slides.length;
      slides[i].classList.add("is-on");
      var meta = document.querySelector("[data-hero-meta]");
      if (meta) {
        meta.classList.remove("swap"); void meta.offsetWidth; meta.classList.add("swap");
        var src = slides[i].getAttribute("data-meta");
        if (src) meta.innerHTML = src;
      }
      var idx = document.querySelector("[data-hero-index]");
      if (idx) idx.textContent = "0" + (i + 1) + " / 0" + slides.length;
    }, every || 6000);
  }

  /* ── page transitions (veil wipe on internal navigation) ────────────────── */
  function transitions() {
    if (reduced) return;
    document.body.classList.add("veil-out");
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a || a.target || a.hasAttribute("download") || e.metaKey || e.ctrlKey) return;
      var href = a.getAttribute("href");
      if (!href || href[0] === "#" || /^(mailto|tel|https?):/.test(href) && a.host !== location.host) return;
      if (a.closest(".bottom-nav")) return;
      e.preventDefault();
      document.body.classList.remove("veil-out");
      document.body.classList.add("veil-in");
      setTimeout(function () { location.href = href; }, 480);
    });
    addEventListener("pageshow", function (e) {
      if (e.persisted) { document.body.classList.remove("veil-in"); document.body.classList.add("veil-out"); }
    });
  }

  /* ── tilt on [data-tilt] cards ──────────────────────────────────────────── */
  function tilt() {
    if (!finePointer || reduced) return;
    document.querySelectorAll("[data-tilt]").forEach(function (c) {
      c.style.transformStyle = "preserve-3d"; c.style.transition = "transform .5s var(--ease)";
      c.addEventListener("pointermove", function (e) {
        var r = c.getBoundingClientRect();
        var rx = ((e.clientY - r.top) / r.height - 0.5) * -4;
        var ry = ((e.clientX - r.left) / r.width - 0.5) * 5;
        c.style.transform = "perspective(900px) rotateX(" + rx + "deg) rotateY(" + ry + "deg)";
      });
      c.addEventListener("pointerleave", function () { c.style.transform = ""; });
    });
  }

  function init() { cursor(); magnetic(); counters(); tilt(); transitions(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  window.HAL = window.HAL || {};
  window.HAL.motion = { heroRotate: heroRotate, counters: counters, magnetic: magnetic, reduced: reduced };
})();

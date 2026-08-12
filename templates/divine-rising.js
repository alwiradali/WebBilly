/* ============================================================
   DIVINE RISING — page interactions
   Chakra journey scrub, schedule tabs, membership toggle,
   testimonial slider, booking modal, newsletter, burger nav.
   atelier.js supplies cursor / loader / reveals / h-scroll.
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGSAP = window.gsap && window.ScrollTrigger;

  // shared bridge read by divine-gl.js every frame
  var BRIDGE = (window.DIVINE = window.DIVINE || { hue: null });

  /* ---------- page progress bar ---------- */
  var pbar = document.querySelector(".page-progress i");
  function progress () {
    if (!pbar) return;
    var h = document.documentElement.scrollHeight - innerHeight;
    pbar.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + "%";
  }
  addEventListener("scroll", progress, { passive: true });
  progress();

  /* ---------- footer year ---------- */
  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- smooth anchors via the shared Lenis instance ---------- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var target = document.querySelector(a.getAttribute("href"));
    if (!target) return;
    if (window.__lenis) {
      e.preventDefault();
      window.__lenis.scrollTo(target, { offset: -64, duration: 1.4 });
    }
    if (document.body.classList.contains("nav-open")) closeNav();
  });

  /* ---------- burger nav ---------- */
  var burger = document.getElementById("burger");
  function closeNav () {
    document.body.classList.remove("nav-open");
    if (burger) { burger.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); }
  }
  if (burger) burger.addEventListener("click", function () {
    var open = document.body.classList.toggle("nav-open");
    burger.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", String(open));
  });

  /* ---------- chakra journey ---------- */
  (function journey () {
    var section = document.querySelector(".journey");
    if (!section) return;
    var steps = section.querySelectorAll(".j-step");
    var dots = section.querySelectorAll(".j-dots i");
    var sanskrit = section.querySelector(".j-sanskrit");
    var bija = ["लं", "वं", "रं", "यं", "हं", "ॐ", "✦"];
    var current = -1;

    function setStep (i) {
      if (i === current) return;
      current = i;
      var hue = steps[i].getAttribute("data-hue");
      steps.forEach(function (s, k) { s.classList.toggle("is-on", k === i); });
      dots.forEach(function (d, k) { d.classList.toggle("is-on", k <= i); });
      if (sanskrit) sanskrit.textContent = bija[i];
      document.documentElement.style.setProperty("--jc", hue);
      BRIDGE.hue = hue;
    }
    setStep(0);

    if (!hasGSAP || reduce) { section.classList.add("static"); return; }
    ScrollTrigger.create({
      trigger: section, start: "top top", end: "+=520%",
      pin: true, scrub: 0.4,
      onUpdate: function (self) {
        setStep(Math.min(steps.length - 1, Math.floor(self.progress * steps.length)));
      },
      onLeave: function () { BRIDGE.hue = null; },
      onEnterBack: function () { BRIDGE.hue = steps[current].getAttribute("data-hue"); },
      onLeaveBack: function () { BRIDGE.hue = null; }
    });
  })();

  /* ---------- schedule tabs ---------- */
  (function schedule () {
    var tabs = document.querySelectorAll(".sched-tabs button");
    var days = document.querySelectorAll(".sched-day");
    if (!tabs.length) return;
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var day = tab.getAttribute("data-day");
        tabs.forEach(function (t) { t.classList.toggle("is-on", t === tab); t.setAttribute("aria-selected", String(t === tab)); });
        days.forEach(function (d) { d.classList.toggle("is-on", d.getAttribute("data-day") === day); });
        if (hasGSAP) ScrollTrigger.refresh();
      });
    });
  })();

  /* ---------- membership toggle ---------- */
  (function pricing () {
    var buttons = document.querySelectorAll(".price-toggle button");
    if (!buttons.length) return;
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var period = btn.getAttribute("data-period");
        buttons.forEach(function (b) { b.classList.toggle("is-on", b === btn); });
        document.querySelectorAll("[data-monthly]").forEach(function (el) {
          el.textContent = el.getAttribute(period === "yearly" ? "data-yearly" : "data-monthly");
        });
      });
    });
  })();

  /* ---------- client love slider ---------- */
  (function love () {
    var slides = document.querySelectorAll(".love-slide");
    if (!slides.length) return;
    var dots = document.querySelectorAll(".love-dots button");
    var idx = 0, timer = null;

    function show (i) {
      idx = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle("is-on", k === idx); });
      dots.forEach(function (d, k) { d.classList.toggle("is-on", k === idx); });
    }
    function auto () {
      clearInterval(timer);
      if (!reduce) timer = setInterval(function () { show(idx + 1); }, 6500);
    }
    var prev = document.querySelector(".love-btn.prev");
    var next = document.querySelector(".love-btn.next");
    if (prev) prev.addEventListener("click", function () { show(idx - 1); auto(); });
    if (next) next.addEventListener("click", function () { show(idx + 1); auto(); });
    dots.forEach(function (d, k) { d.addEventListener("click", function () { show(k); auto(); }); });
    auto();
  })();

  /* ---------- booking modal ---------- */
  (function booking () {
    var modal = document.getElementById("bookModal");
    if (!modal) return;
    var select = document.getElementById("bookClass");
    var form = document.getElementById("bookForm");
    var formWrap = modal.querySelector(".modal-form");
    var done = modal.querySelector(".modal-done");
    var lastFocus = null;

    function open (className) {
      lastFocus = document.activeElement;
      if (className && select) {
        var match = Array.prototype.find.call(select.options, function (o) { return o.text === className; });
        if (!match) { match = new Option(className, className); select.add(match, 0); }
        select.value = match.value;
      }
      formWrap.hidden = false; done.hidden = true;
      modal.hidden = false;
      document.body.style.overflow = "hidden";
      if (window.__lenis && window.__lenis.stop) window.__lenis.stop();
      var first = modal.querySelector("input");
      if (first) first.focus();
    }
    function close () {
      modal.hidden = true;
      document.body.style.overflow = "";
      if (window.__lenis && window.__lenis.start) window.__lenis.start();
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    document.addEventListener("click", function (e) {
      var opener = e.target.closest && e.target.closest("[data-book]");
      if (opener) { open(opener.getAttribute("data-class") || ""); return; }
      if (e.target.closest && e.target.closest("[data-close]")) close();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) close(); });

    if (form) form.addEventListener("submit", function (e) {
      e.preventDefault();
      formWrap.hidden = true; done.hidden = false;
    });
  })();

  /* ---------- newsletter (demo) ---------- */
  (function newsletter () {
    var form = document.querySelector(".newsletter");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = form.querySelector(".nl-ok");
      var input = form.querySelector("input");
      if (ok) ok.hidden = false;
      if (input) input.value = "";
    });
  })();
})();

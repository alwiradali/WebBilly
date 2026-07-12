/* ============================================================
   Fade & Co — barber template interactions (vanilla JS)
   Sticky nav, mobile drawer, scroll reveals, live open/closed
   badge from the hours table, demo booking modal + toast.
   Shared by barber.html and gara-barber.html.
   ============================================================ */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- sticky nav shadow ---- */
  var nav = $(".nav");
  function onScroll() { if (nav) nav.classList.toggle("scrolled", window.scrollY > 24); }
  onScroll(); window.addEventListener("scroll", onScroll, { passive: true });

  /* ---- mobile drawer ---- */
  var drawer = $("#drawer"), burger = $("#burger");
  function setDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle("open", open);
    if (burger) burger.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
  }
  if (burger) burger.addEventListener("click", function () { setDrawer(!drawer.classList.contains("open")); });
  if (drawer) $$("a,[data-close]", drawer).forEach(function (a) { a.addEventListener("click", function () { setDrawer(false); }); });

  /* ---- staggered scroll reveals ---- */
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var sibs = $$(".rv", e.target.parentNode).filter(function (n) { return !n.classList.contains("in"); });
        var idx = sibs.indexOf(e.target);
        setTimeout(function () { e.target.classList.add("in"); }, Math.max(0, idx) * 80);
        io.unobserve(e.target);
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    $$(".rv").forEach(function (el) { io.observe(el); });
  } else {
    $$(".rv").forEach(function (el) { el.classList.add("in"); });
  }

  /* ---- live "open now / closed" from the hours table ---- */
  // data-hours on each .hours li: "open-close" in 24h (e.g. "9-19"), or "closed"
  (function liveStatus() {
    var badge = $("#openBadge");
    var rows = $$(".hours li");
    if (!rows.length) return;
    var now = new Date();
    var day = now.getDay(); // 0 Sun .. 6 Sat
    var hourNow = now.getHours() + now.getMinutes() / 60;
    // hours rows are ordered Mon..Sun; map to JS getDay
    var order = [1, 2, 3, 4, 5, 6, 0];
    rows.forEach(function (li, i) {
      if (order[i] === day) li.classList.add("today");
    });
    var todayRow = rows[order.indexOf(day)];
    var open = false, closeStr = "";
    if (todayRow) {
      var h = todayRow.getAttribute("data-hours");
      if (h && h !== "closed") {
        var parts = h.split("-").map(parseFloat);
        if (hourNow >= parts[0] && hourNow < parts[1]) { open = true; closeStr = fmt(parts[1]); }
      }
    }
    if (badge) {
      badge.innerHTML = open
        ? '<span class="dot"></span> Open now · closes ' + closeStr
        : '<span class="dot" style="background:#c0554b;box-shadow:0 0 0 4px rgba(192,85,75,.2)"></span> Closed now · book online';
    }
    function fmt(x) { var hh = Math.floor(x), mm = Math.round((x - hh) * 60); return hh + (mm ? ":" + ("0" + mm).slice(-2) : "") + (hh < 12 ? "am" : "pm"); }
  })();

  /* ---- demo booking modal + toast ---- */
  var modal = $("#book"), toast = $("#toast");
  function openModal() { if (modal) { modal.classList.add("open"); document.body.style.overflow = "hidden"; } }
  function closeModal() { if (modal) { modal.classList.remove("open"); document.body.style.overflow = ""; } }
  $$("[data-book]").forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); openModal(); }); });
  if (modal) {
    $$("[data-close]", modal).forEach(function (x) { x.addEventListener("click", closeModal); });
    modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
    var form = $("#bookForm", modal);
    if (form) form.addEventListener("submit", function (e) {
      e.preventDefault(); closeModal();
      if (toast) { toast.classList.add("show"); setTimeout(function () { toast.classList.remove("show"); }, 3400); }
    });
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeModal(); setDrawer(false); } });

  /* ---- prefill the booking date with today ---- */
  var d = $("#bkDate");
  if (d) { var t = new Date(); t.setMinutes(t.getMinutes() - t.getTimezoneOffset()); d.value = t.toISOString().slice(0, 10); d.min = d.value; }

  /* ---- smooth-scroll internal links & close drawer ---- */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href"); if (id.length < 2) return;
      var t = $(id); if (!t) return;
      e.preventDefault(); setDrawer(false);
      window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 60, behavior: reduce ? "auto" : "smooth" });
    });
  });
})();

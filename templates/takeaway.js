/* ============================================================
   Takeaway template interactions (vanilla JS)
   Sticky nav, mobile drawer, scroll reveals, live open/closed
   badge from the hours table, demo order modal + toast.
   ============================================================ */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

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
        setTimeout(function () { e.target.classList.add("in"); }, Math.max(0, idx) * 75);
        io.unobserve(e.target);
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    $$(".rv").forEach(function (el) { io.observe(el); });
  } else {
    $$(".rv").forEach(function (el) { el.classList.add("in"); });
  }

  /* ---- live open/closed from the hours table ---- */
  (function liveStatus() {
    var badge = $("#openBadge");
    var rows = $$(".hours li");
    if (!rows.length) return;
    var now = new Date(), day = now.getDay(), hourNow = now.getHours() + now.getMinutes() / 60;
    var order = [1, 2, 3, 4, 5, 6, 0];
    rows.forEach(function (li, i) { if (order[i] === day) li.classList.add("today"); });
    var todayRow = rows[order.indexOf(day)], open = false, closeStr = "";
    if (todayRow) {
      var h = todayRow.getAttribute("data-hours");
      if (h && h !== "closed") {
        var p = h.split("-").map(parseFloat);
        // supports overnight closing (e.g. 16-23.5, or open past midnight like 16-25)
        var end = p[1] > 24 ? p[1] - 24 : p[1];
        if ((p[1] > 24 && (hourNow >= p[0] || hourNow < end)) || (p[1] <= 24 && hourNow >= p[0] && hourNow < p[1])) { open = true; closeStr = fmt(end); }
      }
    }
    if (badge) badge.innerHTML = open
      ? '<span class="dot"></span> Open now · till ' + closeStr
      : '<span class="dot" style="background:#ee2b1c;box-shadow:0 0 0 4px rgba(238,43,28,.2)"></span> Closed · order for later';
    function fmt(x) { var hh = Math.floor(x) % 24, mm = Math.round((x - Math.floor(x)) * 60); return (hh % 12 || 12) + (mm ? ":" + ("0" + mm).slice(-2) : "") + (hh < 12 ? "am" : "pm"); }
  })();

  /* ---- order modal + toast ---- */
  var modal = $("#order"), toast = $("#toast");
  function openModal() { if (modal) { modal.classList.add("open"); document.body.style.overflow = "hidden"; } }
  function closeModal() { if (modal) { modal.classList.remove("open"); document.body.style.overflow = ""; } }
  $$("[data-order]").forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); openModal(); }); });
  if (modal) {
    $$("[data-close]", modal).forEach(function (x) { x.addEventListener("click", closeModal); });
    modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
    $$(".otype button", modal).forEach(function (b) {
      b.addEventListener("click", function () { $$(".otype button", modal).forEach(function (o) { o.classList.remove("on"); }); b.classList.add("on"); });
    });
    var form = $("#orderForm", modal);
    if (form) form.addEventListener("submit", function (e) {
      e.preventDefault(); closeModal();
      if (toast) { toast.classList.add("show"); setTimeout(function () { toast.classList.remove("show"); }, 3600); }
    });
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeModal(); setDrawer(false); } });

  /* ---- smooth-scroll internal links ---- */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href"); if (id.length < 2) return;
      var t = $(id); if (!t) return;
      e.preventDefault(); setDrawer(false);
      window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 60, behavior: reduce ? "auto" : "smooth" });
    });
  });
})();

/* Aperture — bespoke photography: genre-filtered gallery + lightbox, a
   drag before/after retouch slider, and a session-booking form. */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  document.addEventListener("DOMContentLoaded", function () {
    var nav = $("#nav"), links = $("#navLinks"), burger = $("#burger");
    var onScroll = function () { nav.classList.toggle("stuck", scrollY > 20); };
    onScroll(); addEventListener("scroll", onScroll, { passive: true });
    burger.addEventListener("click", function () { var o = links.classList.toggle("open"); burger.setAttribute("aria-expanded", o); });
    $$("#navLinks a").forEach(function (a) { a.addEventListener("click", function () { links.classList.remove("open"); }); });

    if ("IntersectionObserver" in window && !reduce) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: 0.1, rootMargin: "0px 0px -5% 0px" });
      $$(".rv").forEach(function (el) { io.observe(el); });
    } else $$(".rv").forEach(function (el) { el.classList.add("in"); });

    /* ---- gallery filter ---- */
    var shots = $$("#gallery .shot");
    $("#filters").addEventListener("click", function (e) {
      var b = e.target.closest(".fbtn"); if (!b) return;
      $$(".fbtn", this).forEach(function (x) { x.classList.remove("on"); }); b.classList.add("on");
      var f = b.getAttribute("data-f");
      shots.forEach(function (s) { s.classList.toggle("hide", !(f === "all" || s.getAttribute("data-f") === f)); });
    });

    /* ---- lightbox ---- */
    var lb = $("#lb"), lbImg = $("#lbImg");
    shots.forEach(function (s) {
      s.addEventListener("click", function () {
        var img = $("img", s); lbImg.src = img.src; lbImg.alt = s.getAttribute("data-t") || img.alt;
        lb.classList.add("open"); document.body.style.overflow = "hidden";
      });
    });
    function closeLb() { lb.classList.remove("open"); document.body.style.overflow = ""; lbImg.src = ""; }
    $("#lbClose").addEventListener("click", closeLb);
    lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && lb.classList.contains("open")) closeLb(); });

    /* ---- before/after slider ---- */
    var ba = $("#ba"), after = $("#baAfter"), handle = $("#baHandle"), dragging = false;
    function setPct(pct) {
      pct = Math.max(0, Math.min(100, pct));
      after.style.clipPath = "inset(0 0 0 " + pct + "%)";
      handle.style.left = pct + "%";
    }
    function fromEvent(clientX) { var r = ba.getBoundingClientRect(); return (clientX - r.left) / r.width * 100; }
    ba.addEventListener("pointerdown", function (e) { dragging = true; ba.setPointerCapture(e.pointerId); setPct(fromEvent(e.clientX)); });
    ba.addEventListener("pointermove", function (e) { if (dragging) setPct(fromEvent(e.clientX)); });
    ba.addEventListener("pointerup", function () { dragging = false; });
    ba.addEventListener("pointercancel", function () { dragging = false; });
    setPct(50);

    /* ---- booking ---- */
    var form = $("#bookForm"), ok = $("#bookOk");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = $("#bName").value.trim(), email = $("#bEmail").value.trim();
      if (!name) { $("#bName").focus(); return; }
      if (!/.+@.+\..+/.test(email)) { $("#bEmail").focus(); return; }
      $("#bookMsg").textContent = "Thanks, " + name.split(" ")[0] + " — I'll reply within a day about your " +
        $("#bType").value.split("—")[0].trim().toLowerCase() + " session (" + $("#bWhen").value.toLowerCase() + ").";
      form.style.display = "none"; ok.classList.add("show");
    });
  });
})();

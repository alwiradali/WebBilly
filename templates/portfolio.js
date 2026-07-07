/* Studio Nova — bespoke portfolio: project lightbox (prev/next/keyboard),
   work filter, sticky mix-blend nav, mobile menu, reveals. */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  document.addEventListener("DOMContentLoaded", function () {
    var nav = $("#nav"), links = $("#navLinks"), burger = $("#burger");
    var onScroll = function () { nav.classList.toggle("stuck", scrollY > 40); };
    onScroll(); addEventListener("scroll", onScroll, { passive: true });
    burger.addEventListener("click", function () { var o = links.classList.toggle("open"); burger.setAttribute("aria-expanded", o); });
    $$("#navLinks a").forEach(function (a) { a.addEventListener("click", function () { links.classList.remove("open"); }); });

    if ("IntersectionObserver" in window && !reduce) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      $$(".rv").forEach(function (el) { io.observe(el); });
    } else $$(".rv").forEach(function (el) { el.classList.add("in"); });

    /* filter */
    var fbtns = $$("#filters button"), projects = $$(".proj");
    $("#filters").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      fbtns.forEach(function (x) { x.classList.remove("on"); }); b.classList.add("on");
      var f = b.getAttribute("data-f");
      projects.forEach(function (p) { p.classList.toggle("hide", !(f === "all" || p.getAttribute("data-cat") === f)); });
      buildList();
    });

    /* lightbox */
    var lb = $("#lb"), lbImg = $("#lbImg"), lbTitle = $("#lbTitle"), lbSub = $("#lbSub"),
        lbCount = $("#lbCount"), i = 0, list = [];
    function buildList() { list = projects.filter(function (p) { return !p.classList.contains("hide"); }); }
    buildList();

    function show(n) {
      if (!list.length) return;
      i = (n + list.length) % list.length;
      var p = list[i];
      lbImg.src = p.getAttribute("data-img"); lbImg.alt = p.getAttribute("data-title");
      lbTitle.firstChild.nodeValue = p.getAttribute("data-title");
      lbSub.textContent = p.getAttribute("data-sub");
      lbCount.textContent = (i + 1) + " / " + list.length;
    }
    function open(p) { buildList(); show(list.indexOf(p)); lb.classList.add("open"); document.body.style.overflow = "hidden"; $("#lbClose").focus(); }
    function close() { lb.classList.remove("open"); document.body.style.overflow = ""; lbImg.src = ""; }

    projects.forEach(function (p) { p.addEventListener("click", function () { open(p); }); });
    $("#lbClose").addEventListener("click", close);
    $("#lbPrev").addEventListener("click", function () { show(i - 1); });
    $("#lbNext").addEventListener("click", function () { show(i + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb || e.target.classList.contains("lb-stage")) close(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(i - 1);
      else if (e.key === "ArrowRight") show(i + 1);
    });
  });
})();

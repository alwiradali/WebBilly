/* Northbridge — bespoke consulting: services accordion, animated result
   counters, consultation booking form with confirmation, nav, reveals. */
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

    /* reveals + counters */
    var io = ("IntersectionObserver" in window) ? new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (!e.isIntersecting) return; e.target.classList.add("in"); $$("[data-count]", e.target).forEach(countUp); io.unobserve(e.target); });
    }, { threshold: 0.16, rootMargin: "0px 0px -6% 0px" }) : null;
    if (io && !reduce) $$(".rv").forEach(function (el) { io.observe(el); });
    else { $$(".rv").forEach(function (el) { el.classList.add("in"); }); $$("[data-count]").forEach(function (el) { el.textContent = num(el.getAttribute("data-count")) + (el.getAttribute("data-suffix") || ""); }); }

    function countUp(el) {
      var target = parseFloat(el.getAttribute("data-count")), dec = (el.getAttribute("data-count").indexOf(".") > -1) ? 1 : 0,
          suf = el.getAttribute("data-suffix") || "", t0 = null, dur = 1400;
      if (reduce) { el.textContent = target.toFixed(dec) + suf; return; }
      function step(now) { if (t0 === null) t0 = now; var p = Math.min((now - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3); el.textContent = (target * e).toFixed(dec) + suf; if (p < 1) requestAnimationFrame(step); }
      requestAnimationFrame(step);
    }

    /* accordion */
    $$(".acc-item").forEach(function (item) {
      var head = $(".acc-head", item), body = $(".acc-body", item);
      function setH() { body.style.maxHeight = item.classList.contains("open") ? body.scrollHeight + "px" : "0px"; }
      if (item.classList.contains("open")) setH();
      head.addEventListener("click", function () {
        var wasOpen = item.classList.contains("open");
        $$(".acc-item").forEach(function (o) { o.classList.remove("open"); $(".acc-head", o).setAttribute("aria-expanded", "false"); $(".acc-body", o).style.maxHeight = "0px"; });
        if (!wasOpen) { item.classList.add("open"); head.setAttribute("aria-expanded", "true"); setH(); }
      });
      window.addEventListener("resize", function () { if (item.classList.contains("open")) setH(); });
    });

    /* booking form */
    var form = $("#bookForm"), ok = $("#bookOk");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = $("#bName").value.trim(), company = $("#bCompany").value.trim(), email = $("#bEmail").value.trim();
      if (!name || !company || !/.+@.+\..+/.test(email)) { (name ? (company ? $("#bEmail") : $("#bCompany")) : $("#bName")).focus(); return; }
      $("#bookOkMsg").textContent = "Thanks, " + name.split(" ")[0] + " — a Northbridge partner will reply within one business day about " + $("#bTopic").value.toLowerCase() + ".";
      form.style.display = "none"; ok.classList.add("show");
    });
    $("#bookAgain").addEventListener("click", function () { ok.classList.remove("show"); form.style.display = ""; form.reset(); $("#bName").focus(); });
  });

  function num(v) { var n = parseFloat(v); return v.indexOf(".") > -1 ? n.toFixed(1) : String(n); }
})();

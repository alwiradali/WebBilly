/* Skyline Estates — bespoke real-estate: type+budget filters, listing
   detail modal with viewing booking, live mortgage calculator, reveals. */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var gbp = function (n) { return "£" + Math.round(n).toLocaleString("en-GB"); };

  document.addEventListener("DOMContentLoaded", function () {
    var nav = $("#nav"), links = $("#navLinks"), burger = $("#burger");
    var onScroll = function () { nav.classList.toggle("stuck", scrollY > 20); };
    onScroll(); addEventListener("scroll", onScroll, { passive: true });
    burger.addEventListener("click", function () { var o = links.classList.toggle("open"); burger.setAttribute("aria-expanded", o); });
    $$("#navLinks a").forEach(function (a) { a.addEventListener("click", function () { links.classList.remove("open"); }); });

    /* reveals */
    if ("IntersectionObserver" in window && !reduce) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: 0.14, rootMargin: "0px 0px -6% 0px" });
      $$(".rv, .card").forEach(function (el) { io.observe(el); });
    } else $$(".rv, .card").forEach(function (el) { el.classList.add("in"); });

    /* ---- filters (type chips + budget) ---- */
    var chips = $$("#chips .chip"), cards = $$("#grid .card"), empty = $("#empty");
    var maxPrice = $("#maxPrice"), maxOut = $("#maxOut"), curType = "all";
    function applyFilters() {
      var cap = +maxPrice.value, shown = 0;
      cards.forEach(function (c) {
        var types = c.getAttribute("data-type").split(" ");
        var okType = curType === "all" || types.indexOf(curType) > -1;
        var okPrice = +c.getAttribute("data-price") <= cap;
        var show = okType && okPrice;
        c.classList.toggle("hide", !show);
        if (show) shown++;
      });
      empty.classList.toggle("show", shown === 0);
    }
    $("#chips").addEventListener("click", function (e) {
      var b = e.target.closest(".chip"); if (!b) return;
      chips.forEach(function (x) { x.classList.remove("on"); }); b.classList.add("on");
      curType = b.getAttribute("data-f"); applyFilters();
    });
    maxPrice.addEventListener("input", function () { maxOut.textContent = gbp(maxPrice.value); applyFilters(); });

    /* ---- mortgage calculator ---- */
    var cPrice = $("#cPrice"), cDep = $("#cDep"), cTerm = $("#cTerm"), cRate = $("#cRate");
    function calc() {
      var price = +cPrice.value, depPct = +cDep.value, years = +cTerm.value, rate = (+cRate.value) / 10;
      var deposit = price * depPct / 100, loan = price - deposit;
      var r = rate / 100 / 12, n = years * 12;
      var m = r === 0 ? loan / n : loan * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
      $("#pOut").textContent = gbp(price);
      $("#dPct").textContent = depPct;
      $("#dOut").textContent = gbp(deposit);
      $("#tOut").textContent = years + " years";
      $("#rOut").textContent = rate.toFixed(1) + "%";
      $("#monthly").textContent = gbp(m);
      $("#loanOut").textContent = gbp(loan);
      $("#depOut").textContent = gbp(deposit);
      $("#totalOut").textContent = gbp(m * n);
    }
    [cPrice, cDep, cTerm, cRate].forEach(function (el) { el.addEventListener("input", calc); });
    calc();

    /* ---- listing modal ---- */
    var modal = $("#modal"), form = $("#bookForm"), ok = $("#bookOk"), lastFocus = null;
    function openModal(c) {
      lastFocus = document.activeElement;
      $("#mImg").src = c.getAttribute("data-img");
      $("#mImg").alt = c.getAttribute("data-title");
      $("#mTitle").textContent = c.getAttribute("data-title");
      $("#mAddr").textContent = c.getAttribute("data-addr");
      $("#mPrice").textContent = gbp(c.getAttribute("data-price"));
      $("#mSpecs").innerHTML =
        "<span><b>" + c.getAttribute("data-beds") + "</b> bedrooms</span>" +
        "<span><b>" + c.getAttribute("data-baths") + "</b> bathrooms</span>" +
        "<span><b>" + (+c.getAttribute("data-size")).toLocaleString("en-GB") + "</b> sq ft</span>";
      $("#mDesc").textContent = c.getAttribute("data-desc");
      form.dataset.home = c.getAttribute("data-title");
      form.style.display = ""; ok.classList.remove("show"); form.reset();
      modal.classList.add("open"); document.body.style.overflow = "hidden";
      $("#modalClose").focus();
    }
    function closeModal() {
      modal.classList.remove("open"); document.body.style.overflow = "";
      if (lastFocus) lastFocus.focus();
    }
    cards.forEach(function (c) { c.addEventListener("click", function () { openModal(c); }); });
    $("#modalClose").addEventListener("click", closeModal);
    $("#modalBg").addEventListener("click", closeModal);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && modal.classList.contains("open")) closeModal(); });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = $("#bName").value.trim(), phone = $("#bPhone").value.trim(), email = $("#bEmail").value.trim();
      if (!name) { $("#bName").focus(); return; }
      if (!phone) { $("#bPhone").focus(); return; }
      if (!/.+@.+\..+/.test(email)) { $("#bEmail").focus(); return; }
      $("#bookOkMsg").textContent = "Thanks, " + name.split(" ")[0] + " — a Skyline agent will call to confirm your viewing of " + form.dataset.home + " " + $("#bWhen").value.toLowerCase() + ".";
      form.style.display = "none"; ok.classList.add("show");
    });
  });
})();

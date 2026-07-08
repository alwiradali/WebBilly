/* Wanderlight Tours — bespoke travel: combined region + style journey
   filters, and a journey-detail modal with a day-by-day itinerary,
   selectable departures (spots-left) and an enquiry form. */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var JOURNEYS = {
    azores: { title: "Azores Island Hop", region: "Europe", price: "£1,240", nights: 7, group: "Max 12", pace: "Gentle",
      img: "https://d8j0ntlcm91z4.cloudfront.net/user_3FGGVT7BdUNi97QY6Gukppcri19/hf_20260707_034901_95dbcf5b-8672-46bb-8082-8e92a9187fad_min.webp",
      itin: [["Days 1–2", "São Miguel", "Crater lakes, tea plantations and steaming fumaroles at Furnas."], ["Days 3–4", "Pico", "Climb Portugal's highest peak, then vineyards born of black lava."], ["Days 5–7", "Faial", "Blue coves, a caldera hike and whale-watching off Horta."]],
      deps: [["12 May", 4], ["9 Jun", 2], ["7 Jul", 0]] },
    patagonia: { title: "Patagonia Trails", region: "Americas", price: "£3,480", nights: 11, group: "Max 10", pace: "Active",
      img: "https://d8j0ntlcm91z4.cloudfront.net/user_3FGGVT7BdUNi97QY6Gukppcri19/hf_20260707_034914_e1a74ecb-78fe-4bff-9aa9-216f1149d747_min.webp",
      itin: [["Days 1–3", "Torres del Paine", "The W-trek's granite towers and hanging glaciers."], ["Days 4–6", "Grey Glacier", "Ice fields by boat and a night at a remote refugio."], ["Days 7–11", "El Chaltén", "Fitz Roy trails and empty valleys on the Argentine side."]],
      deps: [["3 Oct", 3], ["24 Oct", 5], ["14 Nov", 1]] },
    puglia: { title: "Ancient Puglia", region: "Europe", price: "£1,890", nights: 6, group: "Max 12", pace: "Relaxed",
      img: "https://d8j0ntlcm91z4.cloudfront.net/user_3FGGVT7BdUNi97QY6Gukppcri19/hf_20260707_034904_cfb62744-dce9-4025-aa84-a52120394ef9_min.webp",
      itin: [["Days 1–2", "Alberobello", "Cone-roofed trulli, back-lanes and a pasta-making evening."], ["Days 3–4", "Ostuni", "The white city, olive-oil estates and a coastal feast."], ["Days 5–6", "Lecce", "Baroque stone, artisan workshops and a slow farewell dinner."]],
      deps: [["18 Apr", 6], ["16 May", 4], ["13 Jun", 2]] },
    atlas: { title: "Atlas & Desert Nights", region: "Africa", price: "£2,150", nights: 8, group: "Max 10", pace: "Active",
      img: "https://d8j0ntlcm91z4.cloudfront.net/user_3FGGVT7BdUNi97QY6Gukppcri19/hf_20260707_034916_a3d4f5e7-5a22-483e-8498-1015fbc3b92a_min.webp",
      itin: [["Days 1–2", "Marrakech", "Medina souks, rooftop mint tea and a hidden riad."], ["Days 3–5", "High Atlas", "Berber villages, mule trails and mountain guesthouses."], ["Days 6–8", "Sahara", "Camel trek to the dunes and a night in a desert camp."]],
      deps: [["5 Mar", 5], ["2 Apr", 3], ["1 Oct", 0]] },
    fjord: { title: "Norwegian Fjord Kayak", region: "Europe", price: "£2,690", nights: 9, group: "Max 8", pace: "Active",
      img: "https://d8j0ntlcm91z4.cloudfront.net/user_3FGGVT7BdUNi97QY6Gukppcri19/hf_20260707_034915_b34949ca-6298-4565-8d33-8f96af54b7e4_min.webp",
      itin: [["Days 1–3", "Nærøyfjord", "Paddle a UNESCO fjord between vertical cliffs."], ["Days 4–6", "Sognefjord", "Red-timber cabins, waterfalls and glassy morning water."], ["Days 7–9", "Bergen", "Hanseatic wharf, funicular views and a seafood send-off."]],
      deps: [["16 Jun", 3], ["7 Jul", 2], ["4 Aug", 4]] },
    andes: { title: "Andean Summits", region: "Americas", price: "£2,980", nights: 10, group: "Max 10", pace: "Challenging",
      img: "https://d8j0ntlcm91z4.cloudfront.net/user_3FGGVT7BdUNi97QY6Gukppcri19/hf_20260707_034905_58454017-5396-4b3b-9325-4bfc6dc2bd71_min.webp",
      itin: [["Days 1–3", "Cusco", "Acclimatise among Inca walls and Andean markets."], ["Days 4–7", "Sacred Valley", "High passes, cloud forest and a trail few tourists walk."], ["Days 8–10", "Machu Picchu", "A sunrise arrival above the peaks, then a valley farewell."]],
      deps: [["10 May", 2], ["7 Jun", 4], ["9 Aug", 1]] },
  };

  document.addEventListener("DOMContentLoaded", function () {
    var nav = $("#nav"), links = $("#navLinks"), burger = $("#burger");
    var onScroll = function () { nav.classList.toggle("stuck", scrollY > 20); };
    onScroll(); addEventListener("scroll", onScroll, { passive: true });
    burger.addEventListener("click", function () { var o = links.classList.toggle("open"); burger.setAttribute("aria-expanded", o); });
    $$("#navLinks a").forEach(function (a) { a.addEventListener("click", function () { links.classList.remove("open"); }); });

    if ("IntersectionObserver" in window && !reduce) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      $$(".rv").forEach(function (el) { io.observe(el); });
    } else $$(".rv").forEach(function (el) { el.classList.add("in"); });

    /* ---- filters (region + style, combined) ---- */
    var cards = $$("#jgrid .jcard"), empty = $("#empty"), curRegion = "all", curStyle = "all";
    function applyFilters() {
      var shown = 0;
      cards.forEach(function (c) {
        var okR = curRegion === "all" || c.getAttribute("data-region") === curRegion;
        var okS = curStyle === "all" || c.getAttribute("data-style") === curStyle;
        var show = okR && okS;
        c.classList.toggle("hide", !show); if (show) shown++;
      });
      empty.classList.toggle("show", shown === 0);
    }
    $("#regionFilter").addEventListener("click", function (e) {
      var b = e.target.closest(".chip"); if (!b) return;
      $$(".chip", this).forEach(function (x) { x.classList.remove("on"); }); b.classList.add("on");
      curRegion = b.getAttribute("data-region"); applyFilters();
    });
    $("#styleFilter").addEventListener("click", function (e) {
      var b = e.target.closest(".chip"); if (!b) return;
      $$(".chip", this).forEach(function (x) { x.classList.remove("on"); }); b.classList.add("on");
      curStyle = b.getAttribute("data-style"); applyFilters();
    });

    /* ---- journey modal ---- */
    var modal = $("#modal"), form = $("#enqForm"), ok = $("#enqOk"), selDep = null, lastFocus = null;
    function openModal(id) {
      var j = JOURNEYS[id]; if (!j) return;
      lastFocus = document.activeElement;
      $("#mImg").src = j.img; $("#mImg").alt = j.title;
      $("#mTitle").textContent = j.title;
      $("#mRegion").textContent = j.region + " · " + j.nights + " nights · " + j.pace;
      $("#mPrice").innerHTML = j.price + ' <small>per person</small>';
      $("#mFacts").innerHTML =
        "<div><b>" + j.nights + "</b> nights</div><div><b>" + j.group + "</b></div><div>Pace: <b>" + j.pace + "</b></div>";
      $("#mItin").innerHTML = j.itin.map(function (d) {
        return '<li><span class="d">' + d[0] + '</span><span class="t"><b>' + d[1] + "</b><span>" + d[2] + "</span></span></li>";
      }).join("");
      selDep = null;
      $("#mDeps").innerHTML = j.deps.map(function (d, i) {
        var gone = d[1] === 0;
        return '<button type="button" class="dep' + (gone ? " gone" : "") + '" data-i="' + i + '" data-date="' + d[0] + '"' + (gone ? " disabled" : "") + '>' +
          "<span>" + d[0] + "</span><span class=\"spots" + (gone ? " gone" : "") + "\">" + (gone ? "Sold out" : d[1] + " place" + (d[1] === 1 ? "" : "s") + " left") + "</span></button>";
      }).join("");
      form.dataset.journey = j.title;
      form.style.display = ""; ok.classList.remove("show"); form.reset(); $("#eTravellers").value = 2;
      modal.classList.add("open"); document.body.style.overflow = "hidden";
      $("#modalClose").focus();
    }
    function closeModal() { modal.classList.remove("open"); document.body.style.overflow = ""; if (lastFocus) lastFocus.focus(); }
    cards.forEach(function (c) { c.addEventListener("click", function () { openModal(c.getAttribute("data-id")); }); });
    $("#modalClose").addEventListener("click", closeModal);
    $("#modalBg").addEventListener("click", closeModal);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && modal.classList.contains("open")) closeModal(); });

    $("#mDeps").addEventListener("click", function (e) {
      var b = e.target.closest(".dep"); if (!b || b.disabled) return;
      $$(".dep", this).forEach(function (x) { x.classList.remove("sel"); }); b.classList.add("sel");
      selDep = b.getAttribute("data-date");
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = $("#eName").value.trim(), email = $("#eEmail").value.trim(), trav = $("#eTravellers").value || "1";
      if (!name) { $("#eName").focus(); return; }
      if (!/.+@.+\..+/.test(email)) { $("#eEmail").focus(); return; }
      var when = selDep ? "the " + selDep + " departure" : "your preferred dates";
      $("#enqMsg").textContent = "Thanks, " + name.split(" ")[0] + " — we'll email a tailored quote for " + trav +
        " on " + form.dataset.journey + " (" + when + ") within one working day.";
      form.style.display = "none"; ok.classList.add("show");
    });
  });
})();

/* ════════════════════════════════════════════════════════════════
   MEGACITY PROPERTIES — property tools
   Six client-side calculators: instant rental estimate, mortgage,
   council tax, stamp duty, rent affordability and gross yield.

   Every figure a calculator leans on lives in RATES below, labelled
   with the period it applies to, so updating the site for a new tax
   year is a one-block edit. Everything is a guide, not advice — the
   pages say so next to every result.
   ════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var RATES = {
    asOf: "council tax 2026/27 · SDLT, mortgage averages and asking rents checked 11 August 2026",

    /* Annual Band D council tax 2026/27, incl. Greater Manchester mayoral
       precepts — MHCLG council tax levels tables + each council's own site. */
    councilTaxBandD: {
      "Manchester": 2312.04,
      "Salford": 2594.45,
      "Trafford": 2289.79,
      "Stockport": 2618.90,
      "Bury": 2555.15
    },
    /* statutory band ratios relative to Band D */
    bandRatio: { A: 6 / 9, B: 7 / 9, C: 8 / 9, D: 1, E: 11 / 9, F: 13 / 9, G: 15 / 9, H: 2 },

    /* England residential SDLT (from April 2025) */
    sdlt: {
      standard: [[125000, 0], [250000, 0.02], [925000, 0.05], [1500000, 0.10], [Infinity, 0.12]],
      /* additional dwellings (buy-to-let / second home) surcharge on the whole price */
      surcharge: 0.05,
      firstTimeBuyer: { nilTo: 300000, rate: 0.05, capAt: 500000 }
    },

    /* indicative mortgage pricing — Rightmove rate tracker / Bank of England */
    mortgage: {
      typicalResidential: 4.98,  // avg residential 5-year fixed, 75% LTV
      typicalBtl: 5.35,          // avg buy-to-let 5-year fixed, 75% LTV
      baseRate: 3.75
    },

    /* typical monthly asking rents by area and bedrooms — medians of live
       Rightmove/OnTheMarket listings (11 Aug 2026) cross-checked against
       ONS Price Index of Private Rents (June 2026). Houses run a touch
       above the flat figure for the same beds (houseFactor). */
    rents: {
      "Ancoats":          { 1: 1300, 2: 1575, 3: 2400, 4: 2900 },
      "Northern Quarter": { 1: 1155, 2: 1400, 3: 1900, 4: 2300 },
      "Castlefield":      { 1: 1100, 2: 1390, 3: 2000, 4: 2450 },
      "Salford":          { 1: 1000, 2: 1400, 3: 1600, 4: 1850 },
      "Salford Quays":    { 1: 1100, 2: 1315, 3: 1650, 4: 2000 },
      "West Didsbury":    { 1: 1100, 2: 1400, 3: 1850, 4: 2550 },
      "Chorlton":         { 1: 800,  2: 1270, 3: 1530, 4: 2315 },
      "Prestwich":        { 1: 775,  2: 1175, 3: 1200, 4: 1600 }
    },
    houseFactor: 1.08,
    estimateSpread: 0.08,

    /* referencing rule of thumb: annual income ≥ 30 × monthly rent */
    affordability: { incomeMultiple: 30, guarantorMultiple: 36 }
  };
  window.MEGACITY_RATES = RATES;

  /* ── helpers ─────────────────────────────────────────────────── */
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function fmt(n, dp) {
    return "£" + Number(n).toLocaleString("en-GB", { minimumFractionDigits: dp || 0, maximumFractionDigits: dp || 0 });
  }
  function val(el) { return parseFloat(String(el.value).replace(/[^0-9.]/g, "")) || 0; }

  /* animate a money figure into place; falls back to instant text */
  function setFigure(el, n, dp, suffix) {
    if (!el) return;
    var target = Number(n);
    if (!window.gsap || reduce) { el.textContent = fmt(target, dp) + (suffix || ""); return; }
    var from = parseFloat(String(el.textContent).replace(/[^0-9.]/g, "")) || 0;
    var obj = { v: from };
    gsap.to(obj, {
      v: target, duration: 0.7, ease: "power2.out",
      onUpdate: function () { el.textContent = fmt(obj.v, dp) + (suffix || ""); },
      onComplete: function () { el.textContent = fmt(target, dp) + (suffix || ""); }
    });
  }
  function setText(el, s) { if (el) el.textContent = s; }

  /* a slider paired with a number readout */
  function bindSlider(input, output, format) {
    if (!input) return;
    var show = function () { if (output) output.textContent = format(val(input)); };
    input.addEventListener("input", show);
    show();
  }

  /* segmented control returning current value */
  function seg(root, onChange) {
    if (!root) return function () { return null; };
    var current = root.querySelector(".is-on") || root.firstElementChild;
    root.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      $$(".is-on", root).forEach(function (x) { x.classList.remove("is-on"); });
      b.classList.add("is-on");
      current = b;
      onChange && onChange();
    });
    return function () { return current ? current.getAttribute("data-v") : null; };
  }

  /* ── 1 · instant rental estimate ─────────────────────────────── */
  function instant(root) {
    var area = $("[data-i-area]", root), beds = $("[data-i-beds]", root),
        type = $("[data-i-type]", root), lo = $("[data-i-lo]", root),
        hi = $("[data-i-hi]", root), yr = $("[data-i-year]", root);
    if (!area) return;
    function run() {
      var table = RATES.rents[area.value] || RATES.rents["Salford"];
      var b = Math.min(4, Math.max(1, parseInt(beds.value, 10) || 1));
      var mid = table[b] * (type && /house/i.test(type.value) ? RATES.houseFactor : 1);
      var low = Math.round(mid * (1 - RATES.estimateSpread) / 25) * 25;
      var high = Math.round(mid * (1 + RATES.estimateSpread) / 25) * 25;
      setFigure(lo, low, 0, "");
      setText(hi, "– " + fmt(high) + " pcm");
      if (yr) setText(yr, "That's roughly " + fmt(low * 12) + " – " + fmt(high * 12) + " a year before costs.");
    }
    [area, beds, type].forEach(function (c) { c && c.addEventListener("change", run); });
    run();
  }

  /* ── 2 · mortgage ────────────────────────────────────────────── */
  function mortgage() {
    var root = $("#toolMortgage");
    if (!root) return;
    var price = $("#mgPrice"), dep = $("#mgDeposit"), rate = $("#mgRate"), term = $("#mgTerm");
    var mode = seg($("#mgMode"), run);
    bindSlider(price, $("#mgPriceOut"), function (v) { return fmt(v); });
    bindSlider(dep, $("#mgDepOut"), function (v) { return fmt(v); });
    function run() {
      var P = Math.max(0, val(price) - val(dep));
      var r = val(rate) / 100 / 12;
      var n = val(term) * 12;
      var interestOnly = mode() === "io";
      var monthly = interestOnly ? P * r
        : (r === 0 ? P / Math.max(1, n) : P * r / (1 - Math.pow(1 + r, -n)));
      var ltv = val(price) ? (P / val(price)) * 100 : 0;
      setFigure($("#mgMonthly"), monthly, 0);
      setText($("#mgLoan"), fmt(P));
      setText($("#mgLtv"), ltv.toFixed(1) + "%");
      setText($("#mgTotal"), interestOnly
        ? fmt(monthly * n) + " interest over the term"
        : fmt(monthly * n - P) + " interest over the term");
    }
    [price, dep, rate, term].forEach(function (c) { c.addEventListener("input", run); });
    run();
  }

  /* ── 3 · council tax ─────────────────────────────────────────── */
  function councilTax() {
    var root = $("#toolCouncil");
    if (!root) return;
    var council = $("#ctCouncil"), band = $("#ctBand");
    function run() {
      var annual = (RATES.councilTaxBandD[council.value] || 0) * RATES.bandRatio[band.value];
      setFigure($("#ctMonthly"), annual / 12, 0);
      setText($("#ctAnnual"), fmt(annual, 2));
      setText($("#ctTen"), fmt(annual / 10, 2) + " × 10 instalments");
    }
    [council, band].forEach(function (c) { c.addEventListener("change", run); });
    run();
  }

  /* ── 4 · stamp duty ──────────────────────────────────────────── */
  function sdltFor(price, buyer) {
    var bands = RATES.sdlt.standard, tax = 0, last = 0, i, upper, rate;
    if (buyer === "ftb" && price <= RATES.sdlt.firstTimeBuyer.capAt) {
      var f = RATES.sdlt.firstTimeBuyer;
      tax = Math.max(0, price - f.nilTo) * f.rate;
      return tax;
    }
    for (i = 0; i < bands.length; i++) {
      upper = bands[i][0]; rate = bands[i][1];
      if (price > last) tax += (Math.min(price, upper) - last) * rate;
      last = upper;
    }
    if (buyer === "btl") tax += price * RATES.sdlt.surcharge;
    return tax;
  }
  function stampDuty() {
    var root = $("#toolSdlt");
    if (!root) return;
    var price = $("#sdPrice");
    var buyer = seg($("#sdBuyer"), run);
    bindSlider(price, $("#sdPriceOut"), function (v) { return fmt(v); });
    function run() {
      var p = val(price);
      var tax = sdltFor(p, buyer());
      setFigure($("#sdTax"), tax, 0);
      setText($("#sdRate"), p ? ((tax / p) * 100).toFixed(2) + "% effective rate" : "—");
      setText($("#sdTotal"), fmt(p + tax));
    }
    price.addEventListener("input", run);
    run();
  }

  /* ── 5 · rent affordability ──────────────────────────────────── */
  function afford() {
    var root = $("#toolAfford");
    if (!root) return;
    var rent = $("#afRent");
    function run() {
      var m = RATES.affordability;
      setFigure($("#afIncome"), val(rent) * m.incomeMultiple, 0);
      setText($("#afGuarantor"), fmt(val(rent) * m.guarantorMultiple) + " with a guarantor");
      setText($("#afShare"), "Sharers can combine incomes to reach it.");
    }
    rent.addEventListener("input", run);
    run();
  }

  /* ── 6 · gross yield ─────────────────────────────────────────── */
  function grossYield() {
    var root = $("#toolYield");
    if (!root) return;
    var price = $("#ylPrice"), rent = $("#ylRent");
    function run() {
      var y = val(price) ? (val(rent) * 12 / val(price)) * 100 : 0;
      var el = $("#ylFigure");
      if (el) {
        if (!window.gsap || reduce) el.textContent = y.toFixed(2) + "%";
        else {
          var from = parseFloat(el.textContent) || 0, obj = { v: from };
          gsap.to(obj, { v: y, duration: 0.7, ease: "power2.out",
            onUpdate: function () { el.textContent = obj.v.toFixed(2) + "%"; },
            onComplete: function () { el.textContent = y.toFixed(2) + "%"; } });
        }
      }
      setText($("#ylAnnual"), fmt(val(rent) * 12) + " a year");
    }
    [price, rent].forEach(function (c) { c.addEventListener("input", run); });
    run();
  }

  function boot() {
    $$("[data-inst]").forEach(instant);
    mortgage();
    councilTax();
    stampDuty();
    afford();
    grossYield();
    var asOf = $("#ratesAsOf");
    if (asOf) asOf.textContent = RATES.asOf;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

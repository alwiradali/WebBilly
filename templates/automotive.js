/* Apex Motors — bespoke automotive: a live car configurator (model,
   finish, wheels, options → live price + finance, colour tints the
   preview) and a test-drive booking form. */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var gbp = function (n) { return "£" + Math.round(n).toLocaleString("en-GB"); };

  var MODELS = [
    { name: "Apex GT", badge: "Grand Tourer", base: 48900 },
    { name: "Apex S", badge: "Sport Coupe", base: 62500 },
    { name: "Apex EV", badge: "Electric", base: 54200 },
  ];
  var COLORS = [
    { name: "Phantom Black", hex: "#0c0e12", wash: "#0c0e12", cost: 0 },
    { name: "Storm Grey", hex: "#5b6673", wash: "#6b7684", cost: 0 },
    { name: "Apex Red", hex: "#e11d48", wash: "#e11d48", cost: 950 },
    { name: "Electric Blue", hex: "#38bdf8", wash: "#38bdf8", cost: 950 },
    { name: "Pearl White", hex: "#eef2f6", wash: "#dfe6ee", cost: 1400 },
  ];
  var WHEELS = [
    { name: "19\" Alloy", cost: 0 }, { name: "20\" Sport", cost: 1500 }, { name: "21\" Forged", cost: 3200 },
  ];
  var OPTIONS = [
    { name: "Performance Pack", cost: 4500 }, { name: "Panoramic Roof", cost: 1800 },
    { name: "Premium Audio", cost: 1200 }, { name: "Winter Package", cost: 900 },
  ];

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

    /* ---- configurator ---- */
    var state = { model: 1, color: 0, wheel: 0, options: [] };

    $("#cfgColors").innerHTML = COLORS.map(function (c, i) {
      return '<button class="color' + (i === 0 ? " on" : "") + '" data-c="' + i + '" style="background:' + c.hex + '" title="' + c.name + '" aria-label="' + c.name + '"></button>';
    }).join("");
    $("#cfgWheels").innerHTML = WHEELS.map(function (w, i) {
      return '<button type="button" class="cfg-row' + (i === 0 ? " on" : "") + '" data-w="' + i + '"><span class="rn">' + w.name + '</span><span style="display:flex; align-items:center"><span class="rp">' + (w.cost ? "+" + gbp(w.cost) : "Included") + '</span><span class="box">✓</span></span></button>';
    }).join("");
    $("#cfgOptions").innerHTML = OPTIONS.map(function (o, i) {
      return '<button type="button" class="cfg-row" data-o="' + i + '"><span class="rn">' + o.name + '</span><span style="display:flex; align-items:center"><span class="rp">+' + gbp(o.cost) + '</span><span class="box">✓</span></span></button>';
    }).join("");

    function total() {
      var t = MODELS[state.model].base + COLORS[state.color].cost + WHEELS[state.wheel].cost;
      state.options.forEach(function (i) { t += OPTIONS[i].cost; });
      return t;
    }
    function render() {
      var m = MODELS[state.model], c = COLORS[state.color];
      $("#cfgName").textContent = m.name;
      $("#cfgBadge").textContent = m.badge;
      $("#cfgColorName").textContent = c.name;
      $("#cfgWash").style.background = c.wash;
      $("#paintCost").textContent = c.cost ? "+" + gbp(c.cost) : "";
      $$("#cfgModels .opt-b").forEach(function (b) { b.classList.toggle("on", +b.getAttribute("data-m") === state.model); });
      $$("#cfgColors .color").forEach(function (b) { b.classList.toggle("on", +b.getAttribute("data-c") === state.color); });
      $$("#cfgWheels .cfg-row").forEach(function (b) { b.classList.toggle("on", +b.getAttribute("data-w") === state.wheel); });
      $$("#cfgOptions .cfg-row").forEach(function (b) { b.classList.toggle("on", state.options.indexOf(+b.getAttribute("data-o")) > -1); });
      var t = total();
      $("#cfgTotal").textContent = gbp(t);
      // simple 48-mo, 9% APR flat-ish monthly estimate
      var r = 0.09 / 12, n = 48, monthly = t * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
      $("#cfgFinance").textContent = gbp(monthly);
    }
    $("#cfgModels").addEventListener("click", function (e) { var b = e.target.closest(".opt-b"); if (b) { state.model = +b.getAttribute("data-m"); render(); } });
    $("#cfgColors").addEventListener("click", function (e) { var b = e.target.closest(".color"); if (b) { state.color = +b.getAttribute("data-c"); render(); } });
    $("#cfgWheels").addEventListener("click", function (e) { var b = e.target.closest(".cfg-row"); if (b) { state.wheel = +b.getAttribute("data-w"); render(); } });
    $("#cfgOptions").addEventListener("click", function (e) {
      var b = e.target.closest(".cfg-row"); if (!b) return;
      var i = +b.getAttribute("data-o"), at = state.options.indexOf(i);
      if (at > -1) state.options.splice(at, 1); else state.options.push(i);
      render();
    });
    $("#cfgReserve").addEventListener("click", function () {
      var m = MODELS[state.model];
      $("#cfgDoneMsg").textContent = "Your " + m.name + " in " + COLORS[state.color].name + " (" + gbp(total()) + ") is reserved — a specialist will call to arrange your handover.";
      this.style.display = "none"; $("#cfgDone").classList.add("show");
    });
    render();

    /* ---- test drive ---- */
    var form = $("#tdForm"), ok = $("#tdOk");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = $("#tName").value.trim(), phone = $("#tPhone").value.trim(), email = $("#tEmail").value.trim();
      if (!name) { $("#tName").focus(); return; }
      if (!phone) { $("#tPhone").focus(); return; }
      if (!/.+@.+\..+/.test(email)) { $("#tEmail").focus(); return; }
      $("#tdMsg").textContent = "Thanks, " + name.split(" ")[0] + " — your " + $("#tModel").value + " test drive (" + $("#tWhen").value.toLowerCase() + ") is requested. We'll call " + phone + " to confirm.";
      form.style.display = "none"; ok.classList.add("show");
    });
  });
})();

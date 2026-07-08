/* Ember & Oak — bespoke cafe: an order-ahead menu with category filter,
   a live order bag (add / qty / remove), pickup-time selection and an
   order confirmation with a ticket number. */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var gbp = function (n) { return "£" + n.toFixed(2); };

  var MENU = [
    { c: "espresso", ic: "☕", name: "Espresso", desc: "Double shot, house blend", price: 2.6 },
    { c: "espresso", ic: "🥛", name: "Flat White", desc: "Silky microfoam", price: 3.2 },
    { c: "espresso", ic: "☕", name: "Cortado", desc: "Equal parts, bold", price: 3.0 },
    { c: "espresso", ic: "🫖", name: "Cappuccino", desc: "Classic, dusted", price: 3.4 },
    { c: "filter", ic: "🫗", name: "Batch Brew", desc: "Today's single origin", price: 2.8 },
    { c: "filter", ic: "⏳", name: "V60 Pour-Over", desc: "Hand-brewed to order", price: 4.0 },
    { c: "filter", ic: "🧊", name: "Cold Brew", desc: "18-hour steeped", price: 3.6 },
    { c: "food", ic: "🥑", name: "Avo Toast", desc: "Sourdough, chilli, lime", price: 6.5 },
    { c: "food", ic: "🥓", name: "Bacon Roll", desc: "Brioche bun, brown sauce", price: 5.0 },
    { c: "pastry", ic: "🥐", name: "Butter Croissant", desc: "Baked this morning", price: 3.2 },
    { c: "pastry", ic: "🍫", name: "Pain au Chocolat", desc: "Two batons of dark choc", price: 3.4 },
    { c: "pastry", ic: "🍌", name: "Banana Bread", desc: "Toasted, salted butter", price: 3.0 },
  ];

  document.addEventListener("DOMContentLoaded", function () {
    var burger = $("#burger"), navLinks = $("#navLinks");
    if (burger) burger.addEventListener("click", function () { navLinks.classList.toggle("open"); });
    $$("#navLinks a").forEach(function (a) { a.addEventListener("click", function () { navLinks.classList.remove("open"); }); });

    if ("IntersectionObserver" in window && !reduce) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      $$(".rv").forEach(function (el) { io.observe(el); });
    } else $$(".rv").forEach(function (el) { el.classList.add("in"); });

    /* ---- menu render + filter ---- */
    var list = $("#menuList");
    list.innerHTML = MENU.map(function (m, i) {
      return '<div class="mitem" data-c="' + m.c + '" data-i="' + i + '">' +
        '<div class="mi-ic">' + m.ic + '</div>' +
        '<div class="mi-main"><h4>' + m.name + '</h4><div class="mi-desc">' + m.desc + '</div></div>' +
        '<div class="mi-price">' + gbp(m.price) + '</div>' +
        '<button class="mi-add" data-i="' + i + '" aria-label="Add ' + m.name + '">＋</button></div>';
    }).join("");
    $("#menuTabs").addEventListener("click", function (e) {
      var b = e.target.closest(".mtab"); if (!b) return;
      $$(".mtab", this).forEach(function (x) { x.classList.remove("on"); }); b.classList.add("on");
      var c = b.getAttribute("data-c");
      $$(".mitem", list).forEach(function (it) { it.classList.toggle("hide", c !== "all" && it.getAttribute("data-c") !== c); });
    });

    /* ---- order bag ---- */
    var bag = {};
    list.addEventListener("click", function (e) {
      var b = e.target.closest(".mi-add"); if (!b) return;
      var i = +b.getAttribute("data-i"), m = MENU[i];
      if (bag[i]) bag[i].qty++; else bag[i] = { name: m.name, price: m.price, qty: 1 };
      render();
    });
    function render() {
      var keys = Object.keys(bag), total = 0, count = 0;
      var wrap = $("#bagItems"); $$(".bitem", wrap).forEach(function (n) { n.remove(); });
      keys.forEach(function (k) {
        var it = bag[k]; total += it.qty * it.price; count += it.qty;
        var row = document.createElement("div"); row.className = "bitem";
        row.innerHTML = '<div><div class="bn">' + it.name + '</div>' +
          '<div class="bq"><button data-k="' + k + '" data-d="-1">−</button><span>' + it.qty + '</span><button data-k="' + k + '" data-d="1">+</button>' +
          '<span class="bp">· ' + gbp(it.price) + ' ea</span></div></div>' +
          '<div class="bt">' + gbp(it.qty * it.price) + '</div>';
        wrap.appendChild(row);
      });
      $("#bagEmpty").style.display = keys.length ? "none" : "block";
      $("#bagTotal").textContent = gbp(total);
      $("#placeOrder").disabled = keys.length === 0;
    }
    $("#bagItems").addEventListener("click", function (e) {
      var q = e.target.closest("[data-d]"); if (!q) return;
      var k = q.getAttribute("data-k"); bag[k].qty += +q.getAttribute("data-d"); if (bag[k].qty <= 0) delete bag[k]; render();
    });

    var ticket = 42;
    $("#placeOrder").addEventListener("click", function () {
      var keys = Object.keys(bag); if (!keys.length) return;
      var total = 0, count = 0; keys.forEach(function (k) { total += bag[k].qty * bag[k].price; count += bag[k].qty; });
      ticket++;
      $("#doneMsg").textContent = count + " item" + (count === 1 ? "" : "s") + " · " + gbp(total) + " · ready " + $("#pickTime").value.toLowerCase() + ".";
      $("#orderNo").textContent = "Order #" + ticket;
      $("#bagItems").style.display = "none"; $(".pickup").style.display = "none"; $(".bag-total").style.display = "none";
      $("#placeOrder").style.display = "none"; $("#bagDone").classList.add("show");
      bag = {};
    });
    $("#newOrder").addEventListener("click", function () {
      $("#bagDone").classList.remove("show"); $("#bagItems").style.display = ""; $(".pickup").style.display = "";
      $(".bag-total").style.display = ""; $("#placeOrder").style.display = ""; render();
    });
    render();
  });
})();

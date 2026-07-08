/* Forge Labs — bespoke supplements store: variant-aware cart with a
   free-shaker progress bar, a goal filter, and a build-a-bundle tool
   (pick 3 → 15% off, Subscribe & Save → 20%) that adds a discounted
   bundle line to the cart. */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var SHAKER = 45;

  document.addEventListener("DOMContentLoaded", function () {
    var burger = $("#burger"), navLinks = $("#navLinks");
    if (burger) burger.addEventListener("click", function () { navLinks.classList.toggle("open"); });

    if ("IntersectionObserver" in window && !reduce) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      $$(".rv").forEach(function (el) { io.observe(el); });
    } else $$(".rv").forEach(function (el) { el.classList.add("in"); });

    /* ---- variant pills ---- */
    $$("#prods .prod").forEach(function (prod) {
      $$(".pill", prod).forEach(function (pl) {
        pl.addEventListener("click", function () { $$(".pill", prod).forEach(function (x) { x.classList.remove("on"); }); pl.classList.add("on"); });
      });
    });

    /* ---- cart ---- */
    var cart = {}, cartEl = $("#cart"), ov = $("#ov");
    function openCart() { cartEl.classList.add("open"); ov.classList.add("open"); document.body.style.overflow = "hidden"; }
    function closeCart() { cartEl.classList.remove("open"); ov.classList.remove("open"); document.body.style.overflow = ""; }
    $("#cartBtn").addEventListener("click", openCart);
    $("#cartClose").addEventListener("click", closeCart);
    ov.addEventListener("click", closeCart);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && cartEl.classList.contains("open")) closeCart(); });

    function addItem(name, variant, price, img) {
      var key = name + "|" + variant;
      if (cart[key]) cart[key].qty++; else cart[key] = { name: name, shade: variant, price: price, img: img, qty: 1 };
      render();
    }
    $("#prods").addEventListener("click", function (e) {
      var b = e.target.closest(".add"); if (!b) return;
      var prod = b.closest(".prod"), v = ($(".pill.on", prod) || {}).textContent || "";
      addItem(prod.getAttribute("data-name"), v, +prod.getAttribute("data-price"), prod.getAttribute("data-img"));
      openCart(); b.textContent = "✓ Added"; b.classList.add("added");
      setTimeout(function () { b.textContent = "＋ Add"; b.classList.remove("added"); }, 1100);
    });

    function totals() { var c = 0, s = 0; Object.keys(cart).forEach(function (k) { c += cart[k].qty; s += cart[k].qty * cart[k].price; }); return { count: c, sub: s }; }
    function render() {
      var items = Object.keys(cart), t = totals();
      $("#cartCount").textContent = t.count;
      $("#cartFoot").style.display = items.length ? "" : "none";
      $("#cartEmpty").style.display = items.length ? "none" : "block";
      var wrap = $("#cartItems"); $$(".citem", wrap).forEach(function (n) { n.remove(); });
      items.forEach(function (k) {
        var it = cart[k], row = document.createElement("div"); row.className = "citem";
        row.innerHTML = '<img class="ci-img" src="' + it.img + '" alt="">' +
          '<div><h4>' + it.name + '</h4>' + (it.shade ? '<div class="var">' + it.shade + '</div>' : "") +
          '<div class="qty"><button data-k="' + k + '" data-d="-1">−</button><span>' + it.qty + '</span><button data-k="' + k + '" data-d="1">+</button></div></div>' +
          '<div class="ci-right"><div class="ci-price">£' + (it.qty * it.price) + '</div><button class="rm" data-rm="' + k + '">Remove</button></div>';
        wrap.appendChild(row);
      });
      $("#cartSub").textContent = "£" + t.sub;
      var pct = Math.min(100, t.sub / SHAKER * 100);
      $("#shipFill").style.width = pct + "%";
      $("#shipText").innerHTML = t.sub >= SHAKER ? "⚡ You've unlocked a <b>free shaker!</b>" : "Add <b>£" + (SHAKER - t.sub) + "</b> more for a free shaker ⚡";
    }
    $("#cartItems").addEventListener("click", function (e) {
      var q = e.target.closest("[data-d]"), rm = e.target.closest("[data-rm]");
      if (q) { var k = q.getAttribute("data-k"); cart[k].qty += +q.getAttribute("data-d"); if (cart[k].qty <= 0) delete cart[k]; render(); }
      else if (rm) { delete cart[rm.getAttribute("data-rm")]; render(); }
    });
    $("#checkout").addEventListener("click", function () {
      var t = totals(); if (!t.count) return;
      $("#doneMsg").textContent = t.count + " item" + (t.count === 1 ? "" : "s") + " · £" + t.sub + (t.sub >= SHAKER ? " — free shaker included ⚡" : "") + ". Next-day dispatch confirmed.";
      $("#cartItems").style.display = "none"; $("#cartFoot").style.display = "none"; $(".ship-bar").style.display = "none";
      $("#cartDone").classList.add("show"); cart = {}; $("#cartCount").textContent = "0";
    });
    $("#keepShop").addEventListener("click", function () {
      $("#cartDone").classList.remove("show"); $("#cartItems").style.display = ""; $(".ship-bar").style.display = "";
      render(); closeCart();
    });

    /* ---- goal filter ---- */
    var prods = $$("#prods .prod"), noProd = $("#noProd");
    function filter(goal) {
      var shown = 0;
      prods.forEach(function (p) { var ok = goal === "all" || p.getAttribute("data-goal") === goal; p.classList.toggle("hide", !ok); if (ok) shown++; });
      noProd.classList.toggle("show", shown === 0);
    }
    $("#goals").addEventListener("click", function (e) {
      var b = e.target.closest(".goal"); if (!b) return;
      $$(".goal", this).forEach(function (x) { x.classList.remove("on"); }); b.classList.add("on");
      filter(b.getAttribute("data-goal"));
    });

    /* ---- bundle builder ---- */
    var pool = prods.map(function (p) { return { name: p.getAttribute("data-name"), price: +p.getAttribute("data-price"), img: p.getAttribute("data-img") }; });
    var selected = [], subscribe = false;
    $("#bbPool").innerHTML = pool.map(function (p, i) {
      return '<div class="bb-item" data-i="' + i + '"><img class="bi-img" src="' + p.img + '" alt="">' +
        '<div><div class="bi-t">' + p.name + '</div><div class="bi-p">£' + p.price + '</div></div>' +
        '<div class="bi-check">✓</div></div>';
    }).join("");
    function bbRender() {
      var sub = selected.reduce(function (a, i) { return a + pool[i].price; }, 0);
      var full = selected.length === 3;
      var rate = subscribe ? 0.20 : (full ? 0.15 : 0);
      var disc = Math.round(sub * rate), total = sub - disc;
      $("#bbCount").textContent = selected.length + " / 3";
      $("#bbSubtotal").textContent = "£" + sub;
      $("#bbDiscLabel").textContent = subscribe ? "Subscribe −20%" : (full ? "Bundle −15%" : "Discount");
      $("#bbDiscount").textContent = "−£" + disc;
      $("#bbTotal").textContent = "£" + total;
      $("#bbHint").textContent = full ? (subscribe ? "Subscribed — 20% off + free shaker 🎉" : "Bundle ready — 15% off applied 🎉") : "Select " + (3 - selected.length) + " more to unlock 15% off";
      $("#bbAdd").disabled = !full;
      $$("#bbPool .bb-item").forEach(function (el, i) { el.classList.toggle("sel", selected.indexOf(i) > -1); });
    }
    $("#bbPool").addEventListener("click", function (e) {
      var it = e.target.closest(".bb-item"); if (!it) return;
      var i = +it.getAttribute("data-i"), at = selected.indexOf(i);
      if (at > -1) selected.splice(at, 1);
      else if (selected.length < 3) selected.push(i);
      bbRender();
    });
    $("#subToggle").addEventListener("click", function () { subscribe = !subscribe; this.classList.toggle("on", subscribe); bbRender(); });
    $("#bbAdd").addEventListener("click", function () {
      if (selected.length !== 3) return;
      var sub = selected.reduce(function (a, i) { return a + pool[i].price; }, 0);
      var rate = subscribe ? 0.20 : 0.15, total = Math.round(sub * (1 - rate));
      var names = selected.map(function (i) { return pool[i].name; });
      var key = "BUNDLE|" + names.join("+") + (subscribe ? "|sub" : "");
      cart[key] = { name: (subscribe ? "Subscription Bundle" : "3-Product Bundle"), shade: names.join(" + "), price: total, img: pool[selected[0]].img, qty: 1 };
      render(); openCart();
      selected = []; subscribe = false; $("#subToggle").classList.remove("on"); bbRender();
    });
    bbRender();

    $("#newsForm").addEventListener("submit", function (e) { e.preventDefault(); $("#newsOk").classList.add("show"); this.reset(); });
    render();
  });
})();

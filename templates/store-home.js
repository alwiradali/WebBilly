/* Maison & Co — bespoke homeware store: room filter, product quick-view
   modal, and a cart drawer with a free-delivery-over-£75 progress bar. */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var FREE = 75;

  document.addEventListener("DOMContentLoaded", function () {
    var burger = $("#burger"), navLinks = $("#navLinks");
    if (burger) burger.addEventListener("click", function () { navLinks.classList.toggle("open"); });

    if ("IntersectionObserver" in window && !reduce) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      $$(".rv").forEach(function (el) { io.observe(el); });
    } else $$(".rv").forEach(function (el) { el.classList.add("in"); });

    /* ---- shade selection ---- */
    $$("#prods .prod").forEach(function (prod) {
      $$(".swatch", prod).forEach(function (sw) {
        sw.addEventListener("click", function (e) { e.stopPropagation(); $$(".swatch", prod).forEach(function (x) { x.classList.remove("on"); }); sw.classList.add("on"); });
      });
    });

    /* ---- cart ---- */
    var cart = {}, cartEl = $("#cart"), ov = $("#ov");
    function openCart() { cartEl.classList.add("open"); ov.classList.add("open"); document.body.style.overflow = "hidden"; }
    function closeCart() { cartEl.classList.remove("open"); ov.classList.remove("open"); document.body.style.overflow = ""; }
    $("#cartBtn").addEventListener("click", openCart);
    $("#cartClose").addEventListener("click", closeCart);
    ov.addEventListener("click", closeCart);

    function shade(prod) { var s = $(".swatch.on", prod); return s ? s.getAttribute("data-shade") : ""; }
    function add(prod) {
      var name = prod.getAttribute("data-name"), price = +prod.getAttribute("data-price"),
          img = prod.getAttribute("data-img"), sh = shade(prod), key = name + "|" + sh;
      if (cart[key]) cart[key].qty++; else cart[key] = { name: name, shade: sh, price: price, img: img, qty: 1 };
      render(); openCart();
    }
    $("#prods").addEventListener("click", function (e) {
      var b = e.target.closest(".add"); if (!b) return;
      add(b.closest(".prod"));
      b.textContent = "✓ Added"; b.classList.add("added");
      setTimeout(function () { b.textContent = "Add"; b.classList.remove("added"); }, 1100);
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
      var pct = Math.min(100, t.sub / FREE * 100);
      $("#shipFill").style.width = pct + "%";
      $("#shipText").innerHTML = t.sub >= FREE ? "🎉 You've unlocked <b>free delivery!</b>" : "Add <b>£" + (FREE - t.sub) + "</b> more for free delivery 🚚";
    }
    $("#cartItems").addEventListener("click", function (e) {
      var q = e.target.closest("[data-d]"), rm = e.target.closest("[data-rm]");
      if (q) { var k = q.getAttribute("data-k"); cart[k].qty += +q.getAttribute("data-d"); if (cart[k].qty <= 0) delete cart[k]; render(); }
      else if (rm) { delete cart[rm.getAttribute("data-rm")]; render(); }
    });
    $("#checkout").addEventListener("click", function () {
      var t = totals(); if (!t.count) return;
      $("#doneMsg").textContent = t.count + " item" + (t.count === 1 ? "" : "s") + " · £" + t.sub + (t.sub >= FREE ? " with free delivery." : ".") + " A confirmation is on its way.";
      $("#cartItems").style.display = "none"; $("#cartFoot").style.display = "none"; $(".ship-bar").style.display = "none";
      $("#cartDone").classList.add("show"); cart = {}; $("#cartCount").textContent = "0";
    });
    $("#keepShop").addEventListener("click", function () {
      $("#cartDone").classList.remove("show"); $("#cartItems").style.display = ""; $(".ship-bar").style.display = "";
      render(); closeCart();
    });

    /* ---- quick view ---- */
    var qv = $("#qv"), qvProd = null;
    function openQV(prod) {
      qvProd = prod;
      $("#qvImg").src = prod.getAttribute("data-img"); $("#qvImg").alt = prod.getAttribute("data-name");
      $("#qvTitle").textContent = prod.getAttribute("data-name");
      $("#qvSub").textContent = $(".sub", prod).textContent;
      $("#qvPrice").innerHTML = $(".price", prod).innerHTML;
      $("#qvDesc").textContent = prod.getAttribute("data-desc");
      $("#qvSpecs").innerHTML =
        "<li><span>Material</span><b>" + prod.getAttribute("data-mat") + "</b></li>" +
        "<li><span>Dimensions</span><b>" + prod.getAttribute("data-dim") + "</b></li>" +
        "<li><span>Care</span><b>" + prod.getAttribute("data-care") + "</b></li>";
      qv.classList.add("open"); document.body.style.overflow = "hidden"; $("#qvClose").focus();
    }
    function closeQV() { qv.classList.remove("open"); if (!cartEl.classList.contains("open")) document.body.style.overflow = ""; }
    $("#prods").addEventListener("click", function (e) {
      var q = e.target.closest(".quick"); if (q) { e.preventDefault(); openQV(q.closest(".prod")); }
    });
    $("#qvClose").addEventListener("click", closeQV);
    $("#qvOv").addEventListener("click", closeQV);
    $("#qvAdd").addEventListener("click", function () { if (qvProd) { add(qvProd); closeQV(); } });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (qv.classList.contains("open")) closeQV();
      else if (cartEl.classList.contains("open")) closeCart();
    });

    /* ---- room filter ---- */
    var prods = $$("#prods .prod"), noProd = $("#noProd");
    function filter(room) {
      var shown = 0;
      prods.forEach(function (p) { var ok = room === "all" || p.getAttribute("data-room") === room; p.classList.toggle("hide", !ok); if (ok) shown++; });
      noProd.classList.toggle("show", shown === 0);
    }
    $("#rooms").addEventListener("click", function (e) {
      var b = e.target.closest(".room"); if (!b) return;
      $$(".room", this).forEach(function (x) { x.classList.remove("on"); }); b.classList.add("on");
      filter(b.getAttribute("data-room"));
    });
    $$('#navLinks a[data-room]').forEach(function (a) {
      a.addEventListener("click", function () {
        navLinks.classList.remove("open");
        var room = a.getAttribute("data-room");
        $$("#rooms .room").forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-room") === room); });
        filter(room);
      });
    });

    $("#newsForm").addEventListener("submit", function (e) { e.preventDefault(); $("#newsOk").classList.add("show"); this.reset(); });
    render();
  });
})();

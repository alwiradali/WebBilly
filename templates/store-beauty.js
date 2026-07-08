/* Lume Beauty — bespoke beauty store: shade-aware cart drawer with a
   free-gift progress bar, category filter, reviews reveal, newsletter. */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var GIFT = 40;

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
        sw.addEventListener("click", function () {
          $$(".swatch", prod).forEach(function (x) { x.classList.remove("on"); }); sw.classList.add("on");
        });
      });
    });

    /* ---- cart ---- */
    var cart = {};
    var cartEl = $("#cart"), ov = $("#cartOv");
    function open() { cartEl.classList.add("open"); ov.classList.add("open"); document.body.style.overflow = "hidden"; }
    function close() { cartEl.classList.remove("open"); ov.classList.remove("open"); document.body.style.overflow = ""; }
    $("#cartBtn").addEventListener("click", open);
    $("#cartClose").addEventListener("click", close);
    ov.addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && cartEl.classList.contains("open")) close(); });

    function add(prod) {
      var name = prod.getAttribute("data-name"), price = +prod.getAttribute("data-price"),
          img = prod.getAttribute("data-img"), shade = ($(".swatch.on", prod) || {}).getAttribute ? $(".swatch.on", prod).getAttribute("data-shade") : "";
      var key = name + "|" + shade;
      if (cart[key]) cart[key].qty++;
      else cart[key] = { name: name, shade: shade, price: price, img: img, qty: 1 };
      render(); open();
    }
    $("#prods").addEventListener("click", function (e) {
      var b = e.target.closest(".add"); if (!b) return;
      add(b.closest(".prod"));
      b.textContent = "✓ Added"; b.classList.add("added");
      setTimeout(function () { b.textContent = "＋ Add"; b.classList.remove("added"); }, 1100);
    });

    function render() {
      var items = Object.keys(cart), count = 0, sub = 0;
      items.forEach(function (k) { count += cart[k].qty; sub += cart[k].qty * cart[k].price; });
      $("#cartCount").textContent = count;
      $("#cartFoot").style.display = items.length ? "" : "none";
      $("#cartEmpty").style.display = items.length ? "none" : "block";
      var wrap = $("#cartItems");
      $$(".citem", wrap).forEach(function (n) { n.remove(); });
      items.forEach(function (k) {
        var it = cart[k], row = document.createElement("div"); row.className = "citem";
        row.innerHTML =
          '<img class="ci-img" src="' + it.img + '" alt="">' +
          '<div><h4>' + it.name + '</h4>' + (it.shade ? '<div class="var">' + it.shade + '</div>' : "") +
          '<div class="qty"><button data-k="' + k + '" data-d="-1">−</button><span>' + it.qty + '</span><button data-k="' + k + '" data-d="1">+</button></div></div>' +
          '<div class="ci-right"><div class="ci-price">£' + (it.qty * it.price) + '</div><button class="rm" data-rm="' + k + '">Remove</button></div>';
        wrap.appendChild(row);
      });
      $("#cartSub").textContent = "£" + sub;
      // gift progress
      var pct = Math.min(100, sub / GIFT * 100);
      $("#giftFill").style.width = pct + "%";
      $("#giftText").innerHTML = sub >= GIFT ? "🎉 You've unlocked a <b>free gift!</b>" : "Add <b>£" + (GIFT - sub) + "</b> more for a free gift 🎁";
    }
    $("#cartItems").addEventListener("click", function (e) {
      var q = e.target.closest("[data-d]"), rm = e.target.closest("[data-rm]");
      if (q) { var k = q.getAttribute("data-k"); cart[k].qty += +q.getAttribute("data-d"); if (cart[k].qty <= 0) delete cart[k]; render(); }
      else if (rm) { delete cart[rm.getAttribute("data-rm")]; render(); }
    });

    $("#checkout").addEventListener("click", function () {
      var items = Object.keys(cart); if (!items.length) return;
      var count = 0, sub = 0; items.forEach(function (k) { count += cart[k].qty; sub += cart[k].qty * cart[k].price; });
      $("#doneMsg").textContent = count + " item" + (count === 1 ? "" : "s") + " · £" + sub + (sub >= GIFT ? " — free gift included 🎁" : "") + ". A confirmation is on its way!";
      $("#cartItems").style.display = "none"; $("#cartFoot").style.display = "none"; $(".gift-bar").style.display = "none";
      $("#cartDone").classList.add("show");
      cart = {}; $("#cartCount").textContent = "0";
    });
    $("#keepShop").addEventListener("click", function () {
      $("#cartDone").classList.remove("show"); $("#cartItems").style.display = ""; $(".gift-bar").style.display = "";
      render(); close();
    });

    /* ---- filter ---- */
    var prods = $$("#prods .prod"), noProd = $("#noProd");
    function filter(cat) {
      var shown = 0;
      prods.forEach(function (p) { var ok = cat === "all" || p.getAttribute("data-cat") === cat; p.classList.toggle("hide", !ok); if (ok) shown++; });
      noProd.style.display = shown ? "none" : "block";
    }
    $("#filters").addEventListener("click", function (e) {
      var b = e.target.closest(".fbtn"); if (!b) return;
      $$(".fbtn", this).forEach(function (x) { x.classList.remove("on"); }); b.classList.add("on");
      filter(b.getAttribute("data-filter"));
    });
    // nav category links
    $$('#navLinks a[data-filter]').forEach(function (a) {
      a.addEventListener("click", function () {
        navLinks.classList.remove("open");
        var cat = a.getAttribute("data-filter");
        $$("#filters .fbtn").forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-filter") === cat); });
        filter(cat);
      });
    });

    /* ---- newsletter ---- */
    $("#newsForm").addEventListener("submit", function (e) { e.preventDefault(); $("#newsOk").classList.add("show"); this.reset(); });

    render();
  });
})();

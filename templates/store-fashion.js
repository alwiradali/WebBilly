/* Atelier Noir — bespoke store: real cart (add/qty/remove/subtotal/drawer/
   checkout), product filter, sticky nav, mobile menu, reveals, newsletter. */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  document.addEventListener("DOMContentLoaded", function () {
    /* sticky nav + mobile menu */
    var nav = $("#nav"), links = $("#navLinks"), burger = $("#burger");
    var onScroll = function () { nav.classList.toggle("stuck", scrollY > 20); };
    onScroll(); addEventListener("scroll", onScroll, { passive: true });
    burger.addEventListener("click", function () { var o = links.classList.toggle("open"); burger.setAttribute("aria-expanded", o); });
    $$("#navLinks a").forEach(function (a) { a.addEventListener("click", function () { links.classList.remove("open"); }); });

    /* reveals */
    if ("IntersectionObserver" in window && !reduce) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      $$(".rv").forEach(function (el) { io.observe(el); });
    } else { $$(".rv").forEach(function (el) { el.classList.add("in"); }); }

    /* filter */
    var fbtns = $$("#filters button"), cards = $$(".pcard");
    $("#filters").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      fbtns.forEach(function (x) { x.classList.remove("on"); }); b.classList.add("on");
      var f = b.getAttribute("data-f");
      cards.forEach(function (c) { c.classList.toggle("hide", !(f === "all" || c.getAttribute("data-cat") === f)); });
    });

    /* ---------- cart ---------- */
    var cart = {};           // name -> {name, price, img, qty}
    var scrim = $("#cartScrim"), drawer = $("#cart"), itemsEl = $("#cartItems"),
        emptyEl = $("#cartEmpty"), footEl = $("#cartFoot"), totalEl = $("#cartTotal"),
        countEl = $("#cartCount"), okEl = $("#cartOk");
    var GBP = function (n) { return "£" + n.toLocaleString("en-GB"); };

    function open() { scrim.classList.add("open"); drawer.classList.add("open"); drawer.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; }
    function close() { scrim.classList.remove("open"); drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; }
    $("#cartOpen").addEventListener("click", open);
    $("#cartClose").addEventListener("click", close);
    scrim.addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

    function add(p) {
      if (cart[p.name]) cart[p.name].qty++;
      else cart[p.name] = { name: p.name, price: p.price, img: p.img, qty: 1 };
      render(); bump();
    }
    function bump() {
      var n = count();
      countEl.textContent = n; countEl.classList.toggle("on", n > 0);
      countEl.classList.remove("pop"); void countEl.offsetWidth; countEl.classList.add("pop");
    }
    function count() { var n = 0; for (var k in cart) n += cart[k].qty; return n; }
    function total() { var t = 0; for (var k in cart) t += cart[k].qty * cart[k].price; return t; }

    function render() {
      okEl.classList.remove("show");
      var keys = Object.keys(cart);
      // clear existing item rows (keep the empty placeholder node)
      $$(".citem", itemsEl).forEach(function (n) { n.remove(); });
      if (!keys.length) { emptyEl.style.display = ""; footEl.hidden = true; totalEl.textContent = "£0"; return; }
      emptyEl.style.display = "none"; footEl.hidden = false;
      keys.forEach(function (k) {
        var it = cart[k], row = document.createElement("div"); row.className = "citem";
        row.innerHTML =
          '<img src="' + it.img + '" alt="' + esc(it.name) + '">' +
          '<div><div class="nm">' + esc(it.name) + '</div><div class="pr">' + GBP(it.price) + '</div>' +
          '<div class="qty"><button aria-label="Decrease" data-a="dec">–</button><span>' + it.qty + '</span><button aria-label="Increase" data-a="inc">+</button></div></div>' +
          '<button class="rm" data-a="rm">Remove</button>';
        row.querySelector('[data-a=inc]').addEventListener("click", function () { it.qty++; render(); bump(); });
        row.querySelector('[data-a=dec]').addEventListener("click", function () { it.qty--; if (it.qty <= 0) delete cart[k]; render(); bump(); });
        row.querySelector('[data-a=rm]').addEventListener("click", function () { delete cart[k]; render(); bump(); });
        itemsEl.appendChild(row);
      });
      totalEl.textContent = GBP(total());
    }

    $$(".pcard .padd").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var card = btn.closest(".pcard");
        add({ name: card.getAttribute("data-name"), price: +card.getAttribute("data-price"), img: card.getAttribute("data-img") });
        open();
      });
    });

    $("#checkout").addEventListener("click", function () {
      if (!count()) return;
      var n = count(), t = total();
      $("#cartOkMsg").textContent = n + (n === 1 ? " piece" : " pieces") + " · " + GBP(t) + " — a confirmation is on its way to your inbox.";
      cart = {}; render(); bump();
      footEl.hidden = true; emptyEl.style.display = "none";
      okEl.classList.add("show");
    });
    $("#cartOkClose").addEventListener("click", close);

    /* newsletter */
    $("#news").addEventListener("submit", function (e) { e.preventDefault(); this.innerHTML = '<p style="margin:0;font-weight:600">Thank you — check your inbox.</p>'; });
  });

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
})();

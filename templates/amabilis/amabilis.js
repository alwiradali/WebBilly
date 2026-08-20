/* ===========================================================================
   BAKED WITH AMABILIS — rendering + motion
   ---------------------------------------------------------------------------
   Content comes from data.js; this file turns it into DOM and choreographs it.
   Everything degrades: no GSAP, no WebGL, or prefers-reduced-motion all leave a
   complete, readable, navigable page behind.
   =========================================================================== */
(function () {
  "use strict";

  var D        = window.AMABILIS;
  var reduce   = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var touch    = matchMedia("(hover: none)").matches;
  var narrow   = matchMedia("(max-width: 820px)");
  var hasGSAP  = !!(window.gsap && window.ScrollTrigger);
  var animate  = hasGSAP && !reduce;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var el = function (tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); };
  var money = function (n) { return "£" + n; };

  /* =========================================================================
     1. THE MARK
     The supplied logo is authoritative: if the file resolves it is used as-is,
     untouched, everywhere. The typographic stand-in below only ever shows when
     that file is absent — it is deliberately set in the site's own faces so it
     can't be mistaken for the real signature artwork.
     ====================================================================== */
  function mark () {
    var slots = $$("[data-mark], .badge");   /* stand-ins are already in the markup */
    var probe = new Image();
    probe.onload = function () {
      slots.forEach(function (s) {
        s.innerHTML = '<img class="mark-img" src="' + esc(D.studio.logo) +
                      '" alt="' + esc(D.studio.name) + ' — ' + esc(D.studio.tagline) + '"' +
                      (s.classList.contains("badge") ? ' style="width:86%;height:86%;border-radius:50%;object-fit:contain"' : '') + '>';
      });
    };
    probe.src = D.studio.logo;
  }

  /* =========================================================================
     2. RENDER
     ====================================================================== */
  function renderCakes () {
    var track = $("[data-cake-track]");
    if (!track) return;
    D.cakes.forEach(function (c, i) {
      var a = el("article", "cake" + (i % 2 ? " cake--tall" : ""));
      a.innerHTML =
        '<div class="cake-fig" data-tilt>' +
          '<span class="cake-idx">' + String(i + 1).padStart(2, "0") + '</span>' +
          '<img src="' + esc(c.img) + '" alt="' + esc(c.alt) + '" loading="lazy" decoding="async" width="640" height="1240">' +
        '</div>' +
        '<div class="cake-body">' +
          '<div class="cake-top"><h3>' + esc(c.name) + '</h3><span class="cake-occ">' + esc(c.occasion) + '</span></div>' +
          '<p class="cake-line">' + esc(c.line) + '</p>' +
          '<div class="cake-foot"><span>Serves ' + esc(c.serves) + '</span><span>From ' + money(c.from) + '</span></div>' +
        '</div>';
      track.appendChild(a);
    });
  }

  function renderFeature () {
    var stage = $("[data-feat-stage]"), list = $("[data-feat-list]");
    if (!stage || !list) return;
    var picks = D.cakes.slice(0, 3);
    picks.forEach(function (c, i) {
      var img = el("img");
      img.src = c.detail || c.img;
      img.alt = c.alt;
      img.loading = "lazy";
      img.decoding = "async";
      if (i === 0) img.className = "on";
      stage.appendChild(img);

      var item = el("article", "feat-item");
      item.setAttribute("data-feat-i", i);
      item.innerHTML =
        '<span class="feat-no">' + String(i + 1).padStart(2, "0") + " / " + String(picks.length).padStart(2, "0") + '</span>' +
        '<h3>' + esc(c.name) + '</h3>' +
        '<figure class="feat-shot"><img src="' + esc(c.detail || c.img) + '" alt="' + esc(c.alt) + '" loading="lazy" decoding="async"></figure>' +
        '<p class="body">' + esc(c.note) + '</p>' +
        '<div class="feat-spec"><span>Finish <b>' + esc(c.finish) + '</b></span>' +
        '<span>Serves <b>' + esc(c.serves) + '</b></span>' +
        '<span>From <b>' + money(c.from) + '</b></span></div>';
      list.appendChild(item);
    });
    var f = D.cakes[0];
    $("[data-feat-name]").textContent = f.name;
    $("[data-feat-occ]").textContent = f.occasion;
  }

  /* The first and last frames are her own work. The three in between are stock
     process shots — she has no photographs of her own kitchen mid-bake yet, and
     they are listed as replaceable in assets/amabilis/README.md. */
  var CRAFT_SHOTS = [
    { src: "../../assets/amabilis/stock/craft-spatula.webp",
      alt: "A hand smoothing pink buttercream onto a cake with a small spatula" },
    { src: "../../assets/amabilis/stock/mix-cocoa.webp",
      alt: "Cocoa powder and flour sifted together in a glass bowl beside cracked eggs" },
    { src: "../../assets/amabilis/stock/craft-piping.webp",
      alt: "Hands piping buttercream detail onto a tray of cakes" },
    { src: "../../assets/amabilis/stock/craft-drip.webp",
      alt: "Chocolate being piped in drips down the side of a pink cake" },
    { src: "../../assets/amabilis/stock/cake-rose.webp",
      alt: "A finished blush vintage-piped cake ready for collection" }
  ];
  function renderCraft () {
    var stage = $("[data-craft-stage]");
    if (!stage) return;
    CRAFT_SHOTS.forEach(function (shot, i) {
      var img = el("img");
      img.src = shot.src; img.alt = shot.alt;
      img.loading = "lazy"; img.decoding = "async";
      if (i === 0) img.className = "on";
      stage.appendChild(img);
    });
  }

  function renderAtmosphere () {
    var box = $("[data-atmos]");
    if (!box || !D.atmosphere) return;
    D.atmosphere.forEach(function (a) {
      var f = el("figure", "atmos-i");
      f.innerHTML = '<img src="' + esc(a.img) + '" alt="' + esc(a.alt) +
                    '" loading="lazy" decoding="async">' +
                    "<figcaption>" + esc(a.cap) + "</figcaption>";
      box.appendChild(f);
    });
  }

  function renderServices () {
    var box = $("[data-services]");
    if (!box) return;
    D.services.forEach(function (s, i) {
      var row = el("a", "svc");
      row.href = "#order";
      row.setAttribute("data-img", s.img);
      row.innerHTML =
        '<span class="svc-n">' + String(i + 1).padStart(2, "0") + '</span>' +
        '<span class="svc-mid"><h3>' + esc(s.name) + '</h3><span class="svc-note">' + esc(s.note) + '</span></span>' +
        '<span class="svc-go" aria-hidden="true">→</span>';
      box.appendChild(row);
    });
  }

  function renderBoxes () {
    var box = $("[data-boxes]");
    if (!box) return;
    D.boxes.kinds.forEach(function (k) {
      var rows = D.boxes.sizes.map(function (s) {
        return '<div><dt>Box of ' + s.qty + '</dt><b class="num">' + money(s.price) + '</b></div>';
      }).join("");
      var flav = k.flavours.map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("");
      var a = el("article", "box");
      a.setAttribute("data-fade", "");
      a.innerHTML =
        '<h3>' + esc(k.name) + '</h3>' +
        '<dl class="box-prices">' + rows + '</dl>' +
        '<ul class="box-flav">' + flav + '</ul>' +
        '<p class="box-note">Five days’ notice. Mix flavours across a box — tell her which when you order.</p>';
      box.appendChild(a);
    });
  }

  function renderPricing () {
    var box = $("[data-pricing]");
    if (!box) return;
    D.pricing.forEach(function (p) {
      var a = el("article", "price");
      a.setAttribute("data-fade", "");
      a.innerHTML =
        '<span class="price-tier">' + esc(p.tier) + '</span>' +
        '<span class="price-from"><b class="num">' + money(p.from) + '</b><span>from</span></span>' +
        '<p class="body" style="font-size:.9rem">' + esc(p.note) + '</p>' +
        '<ul>' + p.includes.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + '</ul>';
      box.appendChild(a);
    });
  }

  function renderProcess () {
    var box = $("[data-process]");
    if (!box) return;
    D.process.forEach(function (s) {
      var a = el("article", "step");
      a.setAttribute("data-fade", "");
      a.innerHTML = '<span class="step-n">' + esc(s.n) + '</span><h3>' + esc(s.title) +
                    '</h3><p>' + esc(s.note) + '</p>';
      box.appendChild(a);
    });
  }

  function renderVoices () {
    var stage = $("[data-voices]"), nav = $("[data-voice-nav]");
    if (!stage) return;
    D.testimonials.forEach(function (t, i) {
      var f = el("figure", "voice" + (i ? "" : " on"));
      f.innerHTML = '<blockquote>“' + esc(t.quote) + '”</blockquote>' +
                    '<figcaption><cite>' + esc(t.who) + " · " + esc(t.what) + '</cite></figcaption>';
      stage.appendChild(f);
      var b = el("button", i ? "" : "on", "<i></i>");
      b.type = "button";
      b.setAttribute("aria-label", "Show review " + (i + 1));
      nav.appendChild(b);
    });
  }

  function renderFeed () {
    var box = $("[data-feed]");
    if (!box) return;
    var shots = [];
    var lead = D.cakes.filter(function (c) { return c.slug === "bloom"; })
                      .concat(D.cakes.filter(function (c) { return c.slug !== "bloom"; }));
    lead.forEach(function (c) {
      shots.push({ src: c.img, alt: c.alt, name: c.name });
      if (c.detail) shots.push({ src: c.detail, alt: c.alt, name: c.name });
    });
    shots.slice(0, 9).forEach(function (s, i) {
      var a = el("a", "feed-i" + (i === 0 ? " feed-a" : ""));
      a.href = D.studio.instagram;
      a.target = "_blank";
      a.rel = "noopener";
      a.innerHTML = '<img src="' + esc(s.src) + '" alt="' + esc(s.alt) + '" loading="lazy" decoding="async">' +
                    '<figcaption>' + esc(s.name) + ' <span aria-hidden="true">↗</span></figcaption>';
      box.appendChild(a);
    });
  }

  function renderPolicy () {
    var box = $("[data-policy]");
    if (!box) return;
    D.policy.forEach(function (p, i) {
      var item = el("div", "acc-i" + (i ? "" : " on"));
      item.innerHTML =
        '<h3 style="margin:0"><button class="acc-btn" type="button" aria-expanded="' + (i ? "false" : "true") +
          '" aria-controls="pol-' + i + '"><span class="d4" style="font-family:var(--display)">' + esc(p.h) +
          '</span><span class="pm" aria-hidden="true"></span></button></h3>' +
        '<div class="acc-panel" id="pol-' + i + '"><p>' + esc(p.p) + '</p></div>';
      box.appendChild(item);
    });
    $$(".acc-i", box).forEach(function (item) {
      var btn = $(".acc-btn", item), panel = $(".acc-panel", item);
      if (item.classList.contains("on")) panel.style.height = panel.scrollHeight + "px";
      btn.addEventListener("click", function () {
        var open = item.classList.toggle("on");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        panel.style.height = open ? panel.scrollHeight + "px" : "0px";
        if (hasGSAP) setTimeout(function () { ScrollTrigger.refresh(); }, 520);
      });
    });
    addEventListener("resize", function () {
      $$(".acc-i.on .acc-panel", box).forEach(function (p) { p.style.height = p.scrollHeight + "px"; });
    });
  }

  function renderForm () {
    var f = $("[data-order-form]");
    if (!f) return;
    function fill (sel, list, blank) {
      var s = $(sel, f);
      if (!s) return;
      s.appendChild(new Option(blank, ""));
      list.forEach(function (v) { s.appendChild(new Option(v, v)); });
    }
    fill("#f-type", D.order.types, "Choose one…");
    fill("#f-budget", D.order.budgets, "Rather not say");
  }

  /* =========================================================================
     3. ORDER FORM — writes the enquiry in the order the studio asks for it
     ====================================================================== */
  function orderForm () {
    var f = $("[data-order-form]");
    if (!f) return;
    var out = $("[data-order-out]"), pre = $("[data-order-text]");

    function fail (name, msg) {
      var s = $('[data-err="' + name + '"]', f);
      if (s) s.textContent = msg || "";
      return !msg;
    }

    f.addEventListener("submit", function (e) {
      e.preventDefault();
      if (f.botcheck.value) return;                    /* honeypot */

      var v = {};
      $$("input,select,textarea", f).forEach(function (i) { v[i.name] = (i.value || "").trim(); });

      var ok = true;
      ok = fail("name", v.name ? "" : "Please add your name") && ok;
      ok = fail("contact", v.contact ? "" : "How should she reach you?") && ok;
      ok = fail("date", v.date ? "" : "Pick a collection date") && ok;
      ok = fail("type", v.type ? "" : "Choose what you'd like") && ok;
      if (!ok) { $(".err:not(:empty)", f).closest(".field").querySelector("input,select").focus(); return; }

      /* Lead time is the studio's own: a week for cakes, five days otherwise. */
      var days = Math.round((new Date(v.date) - new Date().setHours(0, 0, 0, 0)) / 864e5);
      var cakey = /cake|cupcake/i.test(v.type);
      var need = cakey ? 7 : 5;
      var warn = days < need
        ? "\n\nNote: this is " + (days < 0 ? "in the past" : days + " day" + (days === 1 ? "" : "s") + " away") +
          ", inside the usual " + need + "-day notice for " + (cakey ? "cakes" : "brownies and cookies") +
          " — asking anyway in case you can fit it in."
        : "";

      var d = new Date(v.date);
      var pretty = isNaN(d) ? v.date : d.toLocaleDateString("en-GB",
        { weekday: "long", day: "numeric", month: "long", year: "numeric" });

      var lines = [
        "Hi! I'd love to order from you.",
        "",
        "Name: " + v.name,
        "Collection date: " + pretty,
        "What I'd like: " + v.type
      ];
      if (v.qty)     lines.push("Quantity / servings: " + v.qty);
      if (v.flavour) lines.push("Flavour: " + v.flavour);
      if (v.theme)   lines.push("Colour scheme / theme: " + v.theme);
      if (v.budget)  lines.push("Budget: " + v.budget);
      if (v.notes)   lines.push("", "Inspiration: " + v.notes);
      lines.push("", "Best contact: " + v.contact);

      pre.textContent = lines.join("\n") + warn;
      out.hidden = false;
      if (hasGSAP) ScrollTrigger.refresh();
      out.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
    });

    var copyBtn = $("[data-copy]"), label = $("[data-copy-label]");
    if (copyBtn) copyBtn.addEventListener("click", function () {
      var text = pre.textContent;
      var done = function () {
        label.textContent = "Copied";
        setTimeout(function () { label.textContent = "Copy message"; }, 2200);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, done);
      else {
        var t = el("textarea"); t.value = text; document.body.appendChild(t);
        t.select(); try { document.execCommand("copy"); } catch (e) {}
        document.body.removeChild(t); done();
      }
    });
  }

  /* =========================================================================
     3b. THE SHOP AND THE BASKET
     Fixed-price boxes, sizes and flavours chosen per box. No card form: she
     takes bank transfer, so checkout writes the order and hands it over. The
     basket survives a reload.
     ====================================================================== */
  var Cart = (function () {
    var KEY = "amabilis.cart.v1";
    var items = [];
    try { items = JSON.parse(localStorage.getItem(KEY) || "[]") || []; } catch (e) { items = []; }
    if (!Array.isArray(items)) items = [];

    function save () {
      try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
      paint();
    }
    function count () { return items.reduce(function (n, i) { return n + i.qty; }, 0); }
    function total () { return items.reduce(function (n, i) { return n + i.price * i.qty; }, 0); }
    function key (i) { return i.id + "|" + i.size + "|" + i.flavours.join(","); }

    function add (item) {
      var k = key(item);
      var hit = items.filter(function (i) { return key(i) === k; })[0];
      if (hit) hit.qty += item.qty; else items.push(item);
      save();
    }
    function setQty (idx, q) {
      if (!items[idx]) return;
      items[idx].qty = Math.max(0, q);
      if (!items[idx].qty) items.splice(idx, 1);
      save();
    }
    function clear () { items = []; save(); }

    function paint () {
      var badge = $(".cart-btn .count");
      if (badge) {
        badge.textContent = count();
        badge.classList.toggle("on", count() > 0);
      }
      var btn = $(".cart-btn");
      if (btn) btn.setAttribute("aria-label", "Basket, " + count() + " item" + (count() === 1 ? "" : "s"));
      var body = $(".cart-body"), foot = $(".cart-foot");
      if (!body) return;
      if (!items.length) {
        body.innerHTML = '<div class="cart-empty"><p class="body">Your basket is empty.</p>' +
          '<a class="link" href="#shop" data-cart-close>Back to the boxes <span aria-hidden="true">→</span></a></div>';
        if (foot) foot.hidden = true;
        return;
      }
      if (foot) foot.hidden = false;
      body.innerHTML = items.map(function (i, n) {
        return '<div class="line">' +
          '<img src="' + esc(i.img) + '" alt="" loading="lazy">' +
          '<div><h4>' + esc(i.name) + '</h4>' +
            '<p class="meta">Box of ' + i.size + '<br>' + esc(i.flavours.join(" · ")) + '</p>' +
            '<button class="rm" type="button" data-rm="' + n + '">Remove</button></div>' +
          '<div class="line-right"><span class="line-price">' + money(i.price * i.qty) + '</span>' +
            '<span class="qty"><button type="button" data-dec="' + n + '" aria-label="One fewer">–</button>' +
            '<span>' + i.qty + '</span>' +
            '<button type="button" data-inc="' + n + '" aria-label="One more">+</button></span></div>' +
        "</div>";
      }).join("");
      var t = $(".cart-total b");
      if (t) t.textContent = money(total());
    }

    return { add: add, setQty: setQty, clear: clear, paint: paint,
             count: count, total: function () { return total(); },
             items: function () { return items.slice(); } };
  })();

  function renderShop () {
    var box = $("[data-shop]");
    if (!box || !D.shop) return;
    D.shop.forEach(function (p) {
      var art = el("article", "prod");
      art.setAttribute("data-fade", "");
      art.setAttribute("data-prod", p.id);
      art.innerHTML =
        '<figure class="prod-fig"><img src="' + esc(p.img) + '" alt="' + esc(p.alt) +
          '" loading="lazy" decoding="async">' +
          '<figcaption class="prod-lead">' + p.lead + " days' notice</figcaption></figure>" +
        '<div class="prod-body">' +
          "<h3>" + esc(p.name) + "</h3>" +
          '<p class="prod-blurb">' + esc(p.blurb) + "</p>" +
          '<div class="opt"><span class="opt-label" id="sz-' + p.id + '">Box size</span>' +
            '<div class="pills" role="group" aria-labelledby="sz-' + p.id + '">' +
              p.sizes.map(function (sz, i) {
                return '<button class="pill pill--size" type="button" data-size="' + sz.qty +
                       '" data-price="' + sz.price + '" aria-pressed="' + (i === 0) + '">' +
                       sz.qty + " <b>" + money(sz.price) + "</b></button>";
              }).join("") +
            "</div></div>" +
          '<div class="opt"><span class="opt-label" id="fl-' + p.id + '">Flavours — pick as many as you like</span>' +
            '<div class="pills" role="group" aria-labelledby="fl-' + p.id + '">' +
              p.flavours.map(function (f, i) {
                return '<button class="pill pill--flav" type="button" aria-pressed="' + (i === 0) + '">' +
                       esc(f) + "</button>";
              }).join("") +
            "</div></div>" +
          '<p class="prod-err" data-prod-err></p>' +
          '<div class="prod-foot">' +
            '<span class="prod-price"><b data-prod-price>' + money(p.sizes[0].price) + "</b><span>per box</span></span>" +
            '<span class="qty"><button type="button" data-q="-1" aria-label="One fewer box">–</button>' +
              '<span data-prod-qty>1</span>' +
              '<button type="button" data-q="1" aria-label="One more box">+</button></span>' +
          "</div>" +
          '<button class="btn magnetic" type="button" data-add style="justify-content:center">' +
            "<span>Add to basket</span><span class=\"arw\" aria-hidden=\"true\">→</span></button>" +
        "</div>";
      box.appendChild(art);
    });

    /* one delegated listener for every card */
    box.addEventListener("click", function (e) {
      var card = e.target.closest("[data-prod]");
      if (!card) return;
      var p = D.shop.filter(function (x) { return x.id === card.getAttribute("data-prod"); })[0];
      var sizeBtn = e.target.closest(".pill--size");
      var flavBtn = e.target.closest(".pill--flav");
      var qBtn = e.target.closest("[data-q]");
      var addBtn = e.target.closest("[data-add]");
      var qtyEl = $("[data-prod-qty]", card), err = $("[data-prod-err]", card);

      if (sizeBtn) {
        $$(".pill--size", card).forEach(function (b) { b.setAttribute("aria-pressed", String(b === sizeBtn)); });
        $("[data-prod-price]", card).textContent = money(+sizeBtn.getAttribute("data-price"));
      }
      if (flavBtn) {
        var on = flavBtn.getAttribute("aria-pressed") === "true";
        flavBtn.setAttribute("aria-pressed", String(!on));
        err.textContent = "";
      }
      if (qBtn) {
        qtyEl.textContent = Math.max(1, Math.min(20, +qtyEl.textContent + +qBtn.getAttribute("data-q")));
      }
      if (addBtn) {
        var size = $(".pill--size[aria-pressed='true']", card);
        var flavs = $$(".pill--flav[aria-pressed='true']", card).map(function (b) { return b.textContent.trim(); });
        if (!flavs.length) { err.textContent = "Pick at least one flavour."; return; }
        err.textContent = "";
        Cart.add({ id: p.id, name: p.name, img: p.img,
                   size: +size.getAttribute("data-size"),
                   price: +size.getAttribute("data-price"),
                   flavours: flavs, qty: +qtyEl.textContent, lead: p.lead });
        openCart();
      }
    });
  }

  function openCart () {
    var d = $(".cart"), sc = $(".cart-scrim");
    if (!d) return;
    d.classList.add("on"); sc.classList.add("on");
    d.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    var c = $(".cart-close", d); if (c) c.focus();
  }
  function closeCart () {
    var d = $(".cart"), sc = $(".cart-scrim");
    if (!d) return;
    d.classList.remove("on"); sc.classList.remove("on");
    d.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function cartWiring () {
    var d = $(".cart");
    if (!d) return;
    Cart.paint();
    var btn = $(".cart-btn"); if (btn) btn.addEventListener("click", openCart);
    var sc = $(".cart-scrim"); if (sc) sc.addEventListener("click", closeCart);
    addEventListener("keydown", function (e) { if (e.key === "Escape") closeCart(); });
    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-cart-close]")) closeCart();
      if (e.target.closest(".cart-close")) closeCart();
    });
    d.addEventListener("click", function (e) {
      var inc = e.target.closest("[data-inc]"), dec = e.target.closest("[data-dec]"),
          rm = e.target.closest("[data-rm]");
      var list = Cart.items();
      if (inc) Cart.setQty(+inc.getAttribute("data-inc"), list[+inc.getAttribute("data-inc")].qty + 1);
      if (dec) Cart.setQty(+dec.getAttribute("data-dec"), list[+dec.getAttribute("data-dec")].qty - 1);
      if (rm)  Cart.setQty(+rm.getAttribute("data-rm"), 0);
      if (e.target.closest("[data-checkout]")) showCheckout();
    });
  }

  function showCheckout () {
    var foot = $(".cart-foot");
    if (!foot || !Cart.items().length) return;
    var lead = Cart.items().reduce(function (n, i) { return Math.max(n, i.lead || 5); }, 5);
    var min = new Date(); min.setDate(min.getDate() + lead);
    foot.innerHTML =
      '<form class="checkout" data-checkout-form novalidate>' +
        '<div class="field"><label for="c-name">Your name</label>' +
          '<input id="c-name" name="name" autocomplete="name" required><span class="err" data-err="name"></span></div>' +
        '<div class="field"><label for="c-contact">Instagram handle or email</label>' +
          '<input id="c-contact" name="contact" required><span class="err" data-err="contact"></span></div>' +
        '<div class="field"><label for="c-date">Collection date</label>' +
          '<input id="c-date" name="date" type="date" required min="' + min.toISOString().slice(0, 10) +
          '"><span class="err" data-err="date"></span></div>' +
        '<p class="cart-note">' + esc(D.payment.note) + " Collection from " + esc(D.studio.town) + ".</p>" +
        '<button class="btn magnetic" type="submit" style="justify-content:center">' +
          "<span>Write my order</span><span class=\"arw\" aria-hidden=\"true\">→</span></button>" +
      "</form>";
    var f = $("[data-checkout-form]", foot);
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = {}; $$("input", f).forEach(function (i) { v[i.name] = (i.value || "").trim(); });
      var ok = true;
      [["name", "Please add your name"], ["contact", "How should she reach you?"],
       ["date", "Pick a collection date"]].forEach(function (pair) {
        var m = v[pair[0]] ? "" : pair[1];
        $('[data-err="' + pair[0] + '"]', f).textContent = m;
        if (m) ok = false;
      });
      if (!ok) return;
      var d = new Date(v.date);
      var pretty = isNaN(d) ? v.date : d.toLocaleDateString("en-GB",
        { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      var lines = ["Hi! I'd like to order:", ""];
      Cart.items().forEach(function (i) {
        lines.push("• " + i.qty + " × " + i.name + ", box of " + i.size +
                   " — " + i.flavours.join(", ") + " — " + money(i.price * i.qty));
      });
      lines.push("", "Total: " + money(Cart.total()),
                 "Collection: " + pretty, "Name: " + v.name, "Contact: " + v.contact,
                 "", "Happy to pay by bank transfer — please send details.");
      foot.innerHTML =
        '<div class="cart-out"><p class="eyebrow">Your order</p><pre>' + esc(lines.join("\n")) + "</pre>" +
        '<button class="btn magnetic" type="button" data-cart-copy style="justify-content:center">' +
          '<span data-cart-copy-label>Copy order</span></button>' +
        '<a class="btn btn--ghost magnetic" href="' + esc(D.studio.instagram) + '" target="_blank" rel="noopener" style="justify-content:center">' +
          '<span>Send on Instagram</span><span class="arw" aria-hidden="true">↗</span></a>' +
        '<p class="cart-note">Paste it into a DM to <b>@' + esc(D.studio.handle) + "</b>.</p></div>";
      var cp = $("[data-cart-copy]", foot);
      cp.addEventListener("click", function () {
        var lbl = $("[data-cart-copy-label]", foot), txt = $("pre", foot).textContent;
        var done = function () { lbl.textContent = "Copied"; setTimeout(function () { lbl.textContent = "Copy order"; }, 2200); };
        if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, done);
        else done();
      });
    });
  }

  /* -- the counter: rows of everything she makes, always moving ----------- */
  function renderCounter () {
    var rows = $$("[data-counter]");
    if (!rows.length || !D.counter) return;
    rows.forEach(function (row, n) {
      var src = n ? D.counter.slice().reverse() : D.counter;
      var html = src.map(function (u) {
        return '<figure class="counter-i"><img src="' + esc(u) + '" alt="" loading="lazy" decoding="async"></figure>';
      }).join("");
      row.innerHTML = html + html;          /* doubled, so the loop has no seam */
    });
  }

  /* =========================================================================
     4. CHROME — cursor, nav, drawer, progress
     ====================================================================== */
  function cursor () {
    if (touch) return;
    var dot = $(".cur"), ring = $(".cur-ring"), txt = $(".cur-txt");
    if (!dot) return;
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener("pointermove", function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = "translate(" + mx + "px," + my + "px)";
      dot.classList.add("live"); ring.classList.add("live");
    }, { passive: true });
    (function loop () {
      rx += (mx - rx) * 0.15; ry += (my - ry) * 0.15;
      ring.style.transform = "translate(" + rx + "px," + ry + "px)";
      requestAnimationFrame(loop);
    })();
    document.addEventListener("pointerover", function (e) {
      var hot = e.target.closest("a,button,.svc,.cake,.reel,input,select,textarea");
      ring.classList.toggle("hot", !!hot);
      var label = hot && hot.closest(".reel") ? "Play" : hot && hot.closest(".cake") ? "View" : "";
      txt.textContent = label;
      ring.classList.toggle("txt", !!label);
    });
  }

  function magnetic () {
    if (touch || reduce) return;
    $$(".magnetic").forEach(function (n) {
      n.addEventListener("pointermove", function (e) {
        var r = n.getBoundingClientRect();
        n.style.transform = "translate(" + (e.clientX - r.left - r.width / 2) * 0.28 + "px," +
                                           (e.clientY - r.top - r.height / 2) * 0.4 + "px)";
      });
      n.addEventListener("pointerleave", function () { n.style.transform = ""; });
    });
  }

  function chrome () {
    var nav = $(".nav"), bar = $(".prog i"), burger = $(".burger"), drawer = $("#drawer");
    var last = 0;

    /* dark chapters: the nav inverts while one is behind it */
    var darks = $$('.dark, [data-gl="dark"]');
    function tick () {
      var y = scrollY;
      if (nav) {
        nav.classList.toggle("solid", y > 40);
        nav.classList.toggle("hide", y > 400 && y > last && !drawer.classList.contains("on"));
        var probe = 46;
        nav.classList.toggle("dark", darks.some(function (s) {
          var r = s.getBoundingClientRect();
          return r.top <= probe && r.bottom >= probe;
        }));
      }
      if (bar) {
        var h = document.documentElement.scrollHeight - innerHeight;
        bar.style.transform = "scaleX(" + (h > 0 ? y / h : 0) + ")";
      }
      last = y;
    }
    addEventListener("scroll", tick, { passive: true });
    addEventListener("resize", tick);
    tick();

    /* drawer */
    if (burger && drawer) {
      var open = false;
      var set = function (v) {
        open = v;
        drawer.hidden = false;
        drawer.classList.toggle("on", v);
        burger.classList.toggle("on", v);
        burger.setAttribute("aria-expanded", v ? "true" : "false");
        burger.setAttribute("aria-label", v ? "Close menu" : "Open menu");
        document.body.style.overflow = v ? "hidden" : "";
        if (v) $$("a", drawer).forEach(function (a, i) { a.style.transitionDelay = (0.12 + i * 0.05) + "s"; });
        else   $$("a", drawer).forEach(function (a) { a.style.transitionDelay = "0s"; });
      };
      burger.addEventListener("click", function () { set(!open); });
      drawer.addEventListener("click", function (e) { if (e.target.closest("a")) set(false); });
      addEventListener("keydown", function (e) { if (e.key === "Escape" && open) { set(false); burger.focus(); } });
    }

    /* active section in the nav */
    var links = $$(".nav-links a");
    var targets = links.map(function (a) { return $(a.getAttribute("href")); }).filter(Boolean);
    if (targets.length && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (rows) {
        rows.forEach(function (r) {
          if (!r.isIntersecting) return;
          links.forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#" + r.target.id); });
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      targets.forEach(function (t) { io.observe(t); });
    }

    /* in-page links, routed through Lenis when it's running */
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute("href");
      if (id.length < 2) return;
      var t = $(id);
      if (!t) return;
      e.preventDefault();
      if (window.__lenis) window.__lenis.scrollTo(t, { offset: -10 });
      else t.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
      history.replaceState(null, "", id);
    });
  }

  /* =========================================================================
     5. THE CHOCOLATE DRIP
     A band of couverture poured over the edge of the chapter above, running
     down into the one below. The edge is generated per instance so no two
     bands repeat, and a few beads let go and fall.
     ====================================================================== */
  function rng (seed) {                       /* mulberry32 — small and stable */
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* A run of chocolate leaves the edge wide, pulls in to a waist, then hangs
     in a bead that is wider than the waist. Drawing it as a straight peg with a
     rounded end is what made the first two attempts look like pegs. */
  function dripRuns (seed, W, H) {
    var r = rng(seed), x = -8, runs = [];
    while (x < W) {
      var neck = 15 + r() * 26;
      var roll = r();
      /* most are barely a bulge; a few really run */
      var len = roll < 0.16 ? H * (0.55 + r() * 0.42)
              : roll < 0.42 ? H * (0.24 + r() * 0.28)
                            : H * (0.05 + r() * 0.13);
      runs.push({ cx: x + neck / 2, neck: neck, len: len });
      x += neck + 6 + r() * 30;
    }
    return runs;
  }

  function runPath (d, band) {
    var cx = d.cx, w0 = d.neck / 2;
    var w1 = Math.max(1.6, w0 * 0.36);              /* the waist */
    var r  = Math.max(2.6, w1 * 1.8);               /* the bead, wider than the waist */
    var L  = Math.max(d.len, r * 2.2);
    var yb = band + L - r;                          /* bead centre */
    var yk = band + L * 0.58;                       /* waist height */
    var f = function (n) { return n.toFixed(1); };
    return "M" + f(cx - w0) + "," + f(band) +
      " C" + f(cx - w0) + "," + f(band + L * 0.20) + " " + f(cx - w1) + "," + f(yk - L * 0.20) + " " + f(cx - w1) + "," + f(yk) +
      " C" + f(cx - w1) + "," + f(yb - r * 0.75) + " " + f(cx - r) + "," + f(yb - r * 0.85) + " " + f(cx - r) + "," + f(yb) +
      " A" + f(r) + "," + f(r) + " 0 1 0 " + f(cx + r) + "," + f(yb) +
      " C" + f(cx + r) + "," + f(yb - r * 0.85) + " " + f(cx + w1) + "," + f(yb - r * 0.75) + " " + f(cx + w1) + "," + f(yk) +
      " C" + f(cx + w1) + "," + f(yk - L * 0.20) + " " + f(cx + w0) + "," + f(band + L * 0.20) + " " + f(cx + w0) + "," + f(band) +
      " Z";
  }

  function drips () {
    var W = 1440, H = 130, BAND = 30;
    $$("[data-drip]").forEach(function (node, i) {
      var cream = node.classList.contains("drip--cream");
      var seed = (parseInt(node.getAttribute("data-drip"), 10) || (i + 7) * 131) | 0;
      var id = "dg" + i, gl = "gl" + i;
      var runs = dripRuns(seed, W, H - BAND);
      var body = runs.map(function (d) { return '<path d="' + runPath(d, BAND) + '"/>'; }).join("");
      /* the light sits along the top of the band and catches the fattest beads */
      /* a catchlight on the shoulder of every bead that actually hangs */
      var gloss = runs.filter(function (d) { return d.len > (H - BAND) * 0.22; })
        .map(function (d) {
          var w1 = Math.max(1.6, (d.neck / 2) * 0.36), r = Math.max(2.6, w1 * 1.8);
          return '<ellipse cx="' + (d.cx - r * 0.36).toFixed(1) + '" cy="' +
                 (BAND + Math.max(d.len, r * 2.2) - r * 1.28).toFixed(1) +
                 '" rx="' + (r * 0.30).toFixed(1) + '" ry="' + (r * 0.46).toFixed(1) +
                 '" transform="rotate(-18 ' + d.cx.toFixed(1) + " " +
                 (BAND + d.len).toFixed(1) + ')"/>';
        }).join("");
      var stops = cream
        ? '<stop offset="0" stop-color="#fffaf1"/><stop offset=".42" stop-color="#f6e7cf"/>' +
          '<stop offset="1" stop-color="#e3cba6"/>'
        : '<stop offset="0" stop-color="#4a2b1c"/><stop offset=".38" stop-color="#331d14"/>' +
          '<stop offset=".82" stop-color="#26150e"/><stop offset="1" stop-color="#3d2317"/>';

      node.innerHTML =
        '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" aria-hidden="true">' +
          "<defs>" +
            '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' + stops + "</linearGradient>" +
            '<linearGradient id="' + gl + '" x1="0" y1="0" x2="0" y2="1">' +
              '<stop offset="0" stop-color="#fff" stop-opacity=".16"/>' +
              '<stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
          "</defs>" +
          '<g class="runs" fill="url(#' + id + ')">' +
            '<rect x="0" y="0" width="' + W + '" height="' + (BAND + 2) + '"/>' + body +
          "</g>" +
          '<rect class="lip" x="0" y="0" width="' + W + '" height="' + (BAND * 0.55).toFixed(1) +
            '" fill="url(#' + gl + ')"/>' +
          '<g class="beads" fill="#fff" opacity="' + (cream ? ".55" : ".22") + '">' + gloss + "</g>" +
        "</svg>";
    });
  }

  /* =========================================================================
     5b. HERO FILM
     Muted, looping, and only ever playing while it is on screen.
     ====================================================================== */
  function heroFilm () {
    var wrap = $(".hero-video");
    if (!wrap) return;
    var v = $("video", wrap);
    if (!v) return;
    if (reduce) { v.remove(); return; }       /* the poster frame stands alone */

    var sources = $$("source[data-src]", v);
    var loaded = false;
    function load () {
      if (loaded) return;
      loaded = true;
      sources.forEach(function (s) { s.src = s.getAttribute("data-src"); });
      v.load();
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
      v.addEventListener("playing", function () { v.classList.add("on"); }, { once: true });
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (rows) {
        rows.forEach(function (r) {
          if (r.isIntersecting) { load(); if (v.paused) { var q = v.play(); if (q && q.catch) q.catch(function () {}); } }
          else if (!v.paused) v.pause();
        });
      }, { threshold: 0.05 }).observe(wrap);
    } else load();
  }

  /* =========================================================================
     6. TEXT PREPARATION — lines for masking, words for the manifesto reveal
     ====================================================================== */
  function splitLines () {
    $$("[data-split]").forEach(function (h) {
      var parts = h.innerHTML.split(/<br\s*\/?>/i);
      h.classList.add("split");
      h.innerHTML = parts.map(function (p) {
        return '<span class="ln"><span>' + p + "</span></span>";
      }).join("");
    });
  }

  function splitWords () {
    $$("[data-words]").forEach(function (root) {
      (function wrap (node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (c) {
          if (c.nodeType === 3) {
            var frag = document.createDocumentFragment();
            c.textContent.split(/(\s+)/).forEach(function (tok) {
              if (!tok) return;
              if (/^\s+$/.test(tok)) frag.appendChild(document.createTextNode(tok));
              else {
                var s = el("span", "word");
                s.textContent = tok;
                frag.appendChild(s);
              }
            });
            node.replaceChild(frag, c);
          } else if (c.nodeType === 1) wrap(c);
        });
      })(root);
    });
  }

  /* =========================================================================
     7. STATIC FALLBACK — no GSAP, or reduced motion
     ====================================================================== */
  function staticMode () {
    document.body.classList.remove("is-loading");
    var l = $(".loader"); if (l) l.remove();
    $$("[data-fade],[data-fade-x]").forEach(function (n) { n.style.opacity = 1; n.style.transform = "none"; });
    $$(".hero-sub,.hero-actions,.hero-meta,.hero-plate figcaption,.cue").forEach(function (n) { n.style.opacity = 1; });
    var hf = $(".hero-frame"); if (hf) hf.style.clipPath = "none";
    $$(".manifesto .word,.pull .word").forEach(function (w) { w.classList.add("on"); });
    var cp = $(".craft-pin"); if (cp) cp.classList.add("flat");
    var stage = $("[data-craft-stage]"); if (stage) stage.parentNode.style.display = "none";
    voices();
  }

  /* =========================================================================
     8. SCROLL CHOREOGRAPHY
     ====================================================================== */
  function motion () {
    gsap.registerPlugin(ScrollTrigger);

    /* -- smooth scroll --------------------------------------------------- */
    if (window.Lenis) {
      var lenis = new Lenis({
        duration: 1.15,
        easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
        smoothWheel: true
      });
      window.__lenis = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    /* -- loader ----------------------------------------------------------- */
    var loader = $(".loader"), num = $(".loader-num"), bar = $(".loader-bar i");
    var counter = { v: 0 };
    gsap.timeline({ onComplete: function () {
        if (loader) loader.remove();
        document.body.classList.remove("is-loading");
        ScrollTrigger.refresh();
      } })
      .to(counter, { v: 100, duration: 1.15, ease: "power2.inOut",
        onUpdate: function () { if (num) num.textContent = Math.round(counter.v); } }, 0)
      .to(bar, { scaleX: 1, duration: 1.15, ease: "power2.inOut" }, 0)
      .to(".loader-in", { y: -26, opacity: 0, duration: .55, ease: "power2.in" }, 1.15)
      .to(loader, { yPercent: -100, duration: .9, ease: "power4.inOut" }, 1.28)
      .add(hero, 1.55);

    /* -- hero entrance ---------------------------------------------------- */
    function hero () {
      gsap.timeline({ defaults: { ease: "power4.out" } })
        .from(".hero h1 .ln > span", { yPercent: 116, duration: 1.15, stagger: .075 }, 0)
        .from(".hero .eyebrow", { opacity: 0, y: 14, duration: .8 }, .1)
        .to(".hero-frame", { clipPath: "inset(0% 0 0 0)", duration: 1.35, ease: "power4.inOut" }, .25)
        .from(".hero-frame img", { scale: 1.35, duration: 1.8, ease: "power3.out" }, .25)
        .to(".hero-sub", { opacity: 1, duration: .9 }, .75)
        .to(".hero-actions", { opacity: 1, duration: .9 }, .88)
        .to(".hero-meta", { opacity: 1, duration: .9 }, 1)
        .to(".hero-plate figcaption", { opacity: 1, duration: .8 }, 1)
        .to(".cue", { opacity: 1, duration: .8 }, 1.05)
        .from(".seal", { opacity: 0, scale: .8, duration: 1.1 }, .8)
        .from(".badge", { y: -60, opacity: 0, duration: .9, ease: "back.out(1.6)", clearProps: "all" }, .2)
        .from(".fly", { scale: 0, opacity: 0, duration: .8, ease: "back.out(2)", stagger: .07, clearProps: "opacity,scale" }, .5);
    }

    /* -- hero scroll: layers drift apart --------------------------------- */
    gsap.timeline({ scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: .6 } })
      .to(".hero-type", { yPercent: -18, opacity: .25, ease: "none" }, 0)
      .to(".hero-plate", { yPercent: -34, ease: "none" }, 0)
      .to(".hero-frame img", { scale: 1.16, ease: "none" }, 0)
      .to(".seal", { rotate: 55, opacity: 0, ease: "none" }, 0);

    /* the floating pieces fly past the camera on the way out */
    $$(".fly").forEach(function (piece, i) {
      var f = parseFloat(piece.getAttribute("data-fly")) || .6;
      var dir = i % 2 ? 1 : -1;
      gsap.to(piece, {
        yPercent: -180 * f - 60, xPercent: dir * 90 * f,
        scale: 1 + f * .7, rotation: dir * 10 * f, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: .4 }
      });
    });

    /* -- generic reveals --------------------------------------------------- */
    $$("[data-fade]").forEach(function (n) {
      gsap.to(n, { opacity: 1, y: 0, duration: 1, ease: "power3.out",
        scrollTrigger: { trigger: n, start: "top 88%" } });
    });
    $$("[data-fade-x]").forEach(function (n) {
      gsap.to(n, { opacity: 1, duration: 1.1, ease: "power3.out",
        scrollTrigger: { trigger: n, start: "top 88%" } });
    });
    $$("[data-split]").forEach(function (h) {
      gsap.from($$(".ln > span", h), { yPercent: 112, duration: 1.05, ease: "power4.out", stagger: .08,
        scrollTrigger: { trigger: h, start: "top 86%" } });
    });

    /* -- manifesto + pull quote: words warm up as they pass --------------- */
    $$("[data-words]").forEach(function (root) {
      var words = $$(".word", root);
      ScrollTrigger.create({
        trigger: root, start: "top 82%", end: "bottom 58%", scrub: true,
        onUpdate: function (self) {
          var n = Math.round(self.progress * words.length);
          words.forEach(function (w, i) { w.classList.toggle("on", i < n); });
        }
      });
    });

    /* -- about: mask wipe + slow parallax --------------------------------- */
    var aboutMask = $(".about-fig .mask");
    if (aboutMask) {
      gsap.to(aboutMask, { scaleX: 0, transformOrigin: "right", duration: 1.3, ease: "power4.inOut",
        scrollTrigger: { trigger: ".about-fig", start: "top 82%" } });
      gsap.fromTo(".about-fig img", { yPercent: -7 }, { yPercent: 7, ease: "none",
        scrollTrigger: { trigger: ".about-fig", start: "top bottom", end: "bottom top", scrub: true } });
    }

    /* -- signature: the rail moves because the page moves ------------------ */
    (function horizontal () {
      var section = $(".h-scroll"), track = $(".h-track"), rail = $(".h-rail i");
      if (!section || !track) return;
      section.classList.add("h-on");
      var amount = function () { return Math.max(0, track.scrollWidth - innerWidth + 40); };
      /* CSS sticky does the pinning, so this works the same on a phone as on
         a desktop — the section is tall, the sticky viewport rides inside it,
         and scroll progress drives the x. No GSAP pin, no touch jank. */
      var size = function () { section.style.height = (amount() + innerHeight) + "px"; };
      size();
      var tween = gsap.to(track, {
        x: function () { return -amount(); }, ease: "none",
        scrollTrigger: {
          trigger: section, start: "top top", end: "bottom bottom",
          scrub: .6, invalidateOnRefresh: true,
          onRefreshInit: size,
          onUpdate: function (self) { if (rail) rail.style.transform = "scaleX(" + self.progress + ")"; }
        }
      });
      addEventListener("resize", size);
      /* depth: each photo drifts against its card */
      $$(".cake-fig img", track).forEach(function (img) {
        gsap.fromTo(img, { xPercent: 4 }, { xPercent: -4, ease: "none",
          scrollTrigger: { trigger: img, containerAnimation: tween, start: "left right", end: "right left", scrub: true } });
      });
    })();

    /* -- anatomy: the stage follows whichever entry is being read --------- */
    (function feature () {
      var imgs = $$("[data-feat-stage] img");
      var items = $$(".feat-item");
      var nameEl = $("[data-feat-name]"), occEl = $("[data-feat-occ]");
      if (!imgs.length || !items.length) return;
      items.forEach(function (item, i) {
        ScrollTrigger.create({
          trigger: item, start: "top 62%", end: "bottom 62%",
          onToggle: function (self) {
            if (!self.isActive) return;
            imgs.forEach(function (im, j) { im.classList.toggle("on", i === j); });
            var c = D.cakes[i];
            if (c) { nameEl.textContent = c.name; occEl.textContent = c.occasion; }
          }
        });
      });
    })();

    /* -- craft: five beats across one pinned screen ----------------------- */
    (function craft () {
      var pin = $(".craft-pin");
      var steps = $$(".craft-step"), shots = $$("[data-craft-stage] img"), pips = $$(".craft-rail i");
      var index = $$(".craft-index li");
      if (!pin || !steps.length) return;
      var cur = -1;
      ScrollTrigger.create({
        trigger: pin, start: "top top", end: "bottom bottom", scrub: true,
        onUpdate: function (self) {
          var i = Math.min(steps.length - 1, Math.floor(self.progress * steps.length * 0.999));
          if (i === cur) return;
          cur = i;
          steps.forEach(function (s, j) { s.classList.toggle("on", i === j); });
          shots.forEach(function (s, j) { s.classList.toggle("on", i === j); });
          pips.forEach(function (p, j) { p.classList.toggle("on", j <= i); });
          index.forEach(function (n, j) {
            n.classList.toggle("on", j === i);
            n.classList.toggle("done", j < i);
          });
        }
      });
      gsap.fromTo("[data-craft-stage]", { scale: .94 }, { scale: 1, ease: "none",
        scrollTrigger: { trigger: pin, start: "top top", end: "bottom bottom", scrub: true } });
    })();

    /* -- 3D: cards lean towards the pointer ------------------------------- */
    if (!touch) {
      $$("[data-tilt]").forEach(function (card) {
        var img = $("img", card);
        card.style.perspective = "900px";
        card.addEventListener("pointermove", function (e) {
          var r = card.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
          gsap.to(card, { rotateY: x * 9, rotateX: -y * 9, duration: .6, ease: "power3.out",
                          transformPerspective: 900 });
          if (img) gsap.to(img, { x: x * -14, y: y * -14, scale: 1.06, duration: .8, ease: "power3.out" });
        });
        card.addEventListener("pointerleave", function () {
          gsap.to(card, { rotateY: 0, rotateX: 0, duration: .9, ease: "power3.out" });
          if (img) gsap.to(img, { x: 0, y: 0, scale: 1, duration: 1, ease: "power3.out" });
        });
      });
    }

    /* -- the counter: rows drift, and lean with the scroll ---------------- */
    (function counter () {
      var rows = $$("[data-counter]");
      if (!rows.length) return;
      rows.forEach(function (row, n) {
        gsap.set(row, { xPercent: n ? -50 : 0 });
        var loop = gsap.to(row, {
          xPercent: n ? 0 : -50, repeat: -1, ease: "none",
          duration: 46 + n * 9
        });
        ScrollTrigger.create({
          trigger: row, start: "top bottom", end: "bottom top",
          onUpdate: function (self) {
            var v = self.getVelocity();
            /* scrolling down speeds the row up, scrolling up drags it back */
            loop.timeScale(gsap.utils.clamp(-4, 5, 1 + v / 700));
          }
        });
      });
      /* the whole band leans a few degrees with the scroll, then settles */
      var skew = $(".counter-skew");
      if (skew) {
        var s2 = { v: 0 };
        ScrollTrigger.create({
          trigger: skew, start: "top bottom", end: "bottom top",
          onUpdate: function (self) {
            var target = gsap.utils.clamp(-5, 5, self.getVelocity() / 340);
            gsap.to(s2, { v: target, duration: .35, overwrite: true,
              onUpdate: function () { gsap.set(skew, { skewY: s2.v * 0.5, rotate: s2.v * 0.16 }); } });
            gsap.to(s2, { v: 0, duration: 1.1, delay: .12, overwrite: false,
              onUpdate: function () { gsap.set(skew, { skewY: s2.v * 0.5, rotate: s2.v * 0.16 }); } });
          }
        });
      }
    })();

    /* -- marquee, velocity-aware ------------------------------------------ */
    $$(".marq-in").forEach(function (row) {
      var loop = gsap.to(row, { xPercent: -50, repeat: -1, duration: 26, ease: "none" });
      ScrollTrigger.create({
        trigger: row, start: "top bottom", end: "bottom top",
        onUpdate: function (self) { loop.timeScale(1 + Math.min(3, Math.abs(self.getVelocity()) / 900)); }
      });
    });

    /* -- services hover peek ---------------------------------------------- */
    (function peek () {
      if (touch) return;
      var box = $(".svc-peek");
      if (!box) return;
      var img = $("img", box), x = 0, y = 0, tx = 0, ty = 0, live = false;
      $$(".svc").forEach(function (row) {
        row.addEventListener("pointerenter", function () {
          img.src = row.getAttribute("data-img") || "";
          box.classList.add("on"); live = true;
        });
        row.addEventListener("pointerleave", function () { box.classList.remove("on"); live = false; });
      });
      addEventListener("pointermove", function (e) { tx = e.clientX + 150; ty = e.clientY; }, { passive: true });
      (function loop () {
        requestAnimationFrame(loop);
        if (!live) return;
        x += (tx - x) * .12; y += (ty - y) * .12;
        box.style.left = x + "px"; box.style.top = y + "px";
      })();
    })();

    /* -- cta ring turns with the scroll ----------------------------------- */
    gsap.to(".cta-ring", { rotate: 90, ease: "none",
      scrollTrigger: { trigger: ".cta", start: "top bottom", end: "bottom top", scrub: true } });

    voices();
    ScrollTrigger.refresh();
    ScrollTrigger.addEventListener("refresh", function () {
      if (window.__gl) window.__gl.refresh();
    });
    addEventListener("load", function () {
      ScrollTrigger.refresh();
      if (window.__gl) window.__gl.refresh();
    });
  }

  /* =========================================================================
     10. VOICES
     ====================================================================== */
  function voices () {
    var slides = $$(".voice"), pips = $$(".voice-nav button");
    if (slides.length < 2) return;
    var i = 0, timer = null;
    function show (n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, j) { s.classList.toggle("on", i === j); });
      pips.forEach(function (p, j) {
        p.classList.remove("on");
        if (i === j) { void p.offsetWidth; p.classList.add("on"); }
      });
    }
    function run () { clearInterval(timer); if (!reduce) timer = setInterval(function () { show(i + 1); }, 6000); }
    pips.forEach(function (p, j) { p.addEventListener("click", function () { show(j); run(); }); });
    var stage = $(".voice-stage");
    if (stage) {
      stage.addEventListener("pointerenter", function () { clearInterval(timer); });
      stage.addEventListener("pointerleave", run);
    }
    show(0); run();
  }

  /* =========================================================================
     11. BOOT
     ====================================================================== */
  function boot () {
    if (!D) return;
    var y = $("[data-year]"); if (y) y.textContent = new Date().getFullYear();
    var dateInput = $("#f-date");
    if (dateInput) {
      var min = new Date(); min.setDate(min.getDate() + 5);
      dateInput.min = min.toISOString().slice(0, 10);
    }

    mark();
    renderCakes();
    renderFeature();
    renderCraft();
    renderAtmosphere();
    renderShop();
    renderCounter();
    renderServices();
    renderBoxes();
    renderPricing();
    renderProcess();
    renderVoices();
    renderFeed();
    renderPolicy();
    renderForm();
    orderForm();
    cartWiring();

    splitLines();
    splitWords();

    drips();
    cursor();
    magnetic();
    chrome();
    heroFilm();
    if (window.AmabilisGL) window.__gl = window.AmabilisGL.start();

    if (animate) motion(); else staticMode();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

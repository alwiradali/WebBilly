/* ============================================================
   Strictly Sprinkles — page engine.
   Vanilla, no build step. Everything the shop sells lives in
   strictly-sprinkles-data.js; this file only renders it and
   makes it move.
   ============================================================ */
(function () {
  "use strict";

  var D = window.SS;
  if (!D) return;
  var B = D.business;
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var A = "/assets/strictly/";

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function el(t, a, txt) {
    var n = document.createElement(t);
    if (a) for (var k in a) if (a[k] != null) n.setAttribute(k, a[k]);
    if (txt != null) n.textContent = txt;
    return n;
  }
  function money(n) { return "£" + (n % 1 ? n.toFixed(2) : n); }

  /* ============================================================
     1. SPRINKLES
     Each sprinkle is transformed on its own. iOS will not paint a
     moving composited layer wider than about 4096 device pixels,
     so the layer itself never moves — only its children do.
     ============================================================ */
  var SPRINKLE_DARK = ["#4e4175", "#6a5a95", "#b98b46", "#c98fa8", "#8a76b8"];
  var SPRINKLE_LIGHT = ["#fdeae8", "#f3c14b", "#e8b5c4", "#cdbde6", "#ffffff"];

  function sprinkle(layer) {
    if (reduced) return;
    var n = parseInt(layer.getAttribute("data-sprinkles"), 10) || 14;
    if (innerWidth < 700) n = Math.round(n * 0.55);   /* phones pay for every layer */
    var onDark = layer.hasAttribute("data-sprinkles-light");
    var pal = onDark ? SPRINKLE_LIGHT : SPRINKLE_DARK;
    /* dark ink on a cream ground reads as specks of dirt at full strength —
       it needs to be roughly half what the cream ink can carry on purple */
    var lo = onDark ? 0.28 : 0.10, hi = onDark ? 0.34 : 0.14;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < n; i++) {
      var b = el("i");
      var dur = 14 + Math.random() * 16;
      b.style.cssText =
        "left:" + (Math.random() * 100).toFixed(2) + "%;" +
        "top:" + (Math.random() * 100).toFixed(2) + "%;" +
        "background:" + pal[i % pal.length] + ";" +
        "opacity:" + (lo + Math.random() * hi).toFixed(2) + ";" +
        "--rot:" + Math.round(Math.random() * 360) + "deg;" +
        "--dx:" + (Math.random() * 120 - 60).toFixed(0) + "px;" +
        "--dy:" + (Math.random() * 150 - 75).toFixed(0) + "px;" +
        "animation:drift " + dur.toFixed(1) + "s ease-in-out " +
        (-Math.random() * dur).toFixed(1) + "s infinite alternate;";
      frag.appendChild(b);
    }
    layer.appendChild(frag);
  }

  /* ============================================================
     2. RENDER — everything below reads from the data file
     ============================================================ */

  /* -- the marquee -- */
  (function marquee() {
    var mq = $("#mq"); if (!mq) return;
    var words = ["Celebration cakes", "Bespoke cookies", "Party platters", "Treatboxes",
                 "Cakesicles", "Macarons", "Baby boxes", "100% Halal", "Made in Teesside"];
    var row = el("div", { class: "mq-row" });
    /* two identical runs, so when the first has scrolled past there is an
       identical one behind it and the jump back is invisible */
    for (var r = 0; r < 2; r++) {
      words.forEach(function (w) { row.appendChild(el("span", null, w)); });
    }
    mq.appendChild(row);
    if (reduced) return;
    /* Each word is transformed on its own, never the row. The row is ~2930px
       wide, which at dpr 3 is 8800 device pixels — iOS refuses to paint a
       moving composited layer that wide and simply shows nothing, with no
       error. Nineteen small layers all carrying the same offset look
       identical and paint everywhere.

       The travel is measured from the children's own widths, not the row's
       scrollWidth: once a child is translated it changes the parent's
       scrollable overflow, so reading it back feeds a shrinking number in. */
    var kids = $$("span", row);
    var half = 0;
    for (var i = 0; i < kids.length / 2; i++) half += kids[i].offsetWidth;
    var x = 0, last = performance.now();
    (function tick(now) {
      var dt = Math.min(now - last, 50); last = now;
      x -= dt * 0.032;
      if (half && x <= -half) x += half;     /* the second run is already there */
      var t = "translate3d(" + x.toFixed(2) + "px,0,0)";
      for (var k = 0; k < kids.length; k++) kids[k].style.transform = t;
      requestAnimationFrame(tick);
    })(last);
  })();

  /* -- category tiles -- */
  (function tiles() {
    var host = $("#tiles"); if (!host) return;
    D.categories.forEach(function (c, i) {
      var count = c.groups
        ? c.groups.reduce(function (a, g) { return a + g.items.length; }, 0)
        : c.items.length;
      var a = el("a", { class: "tile" + (i === 0 || i === D.categories.length - 1 ? " wide" : ""),
                        href: catHref(c), "data-rv": "", "data-rv-d": String((i % 3) + 1) });
      var art = el("span", { class: "tile-art" });
      art.appendChild(el("img", { src: A + c.img, alt: "", loading: "lazy" }));
      a.appendChild(art);
      a.appendChild(el("span", { class: "tile-count" }, count + (count === 1 ? " option" : " options")));
      var body = el("span", { class: "tile-body" });
      body.appendChild(el("h3", null, c.label));
      body.appendChild(el("p", null, c.note));
      body.appendChild(el("span", { class: "tile-from" }, priceFrom(c)));
      a.appendChild(body);
      host.appendChild(a);
    });
  })();

  function allItems(c) {
    return c.groups ? c.groups.reduce(function (a, g) { return a.concat(g.items); }, []) : c.items;
  }
  function priceFrom(c) {
    var p = allItems(c).map(function (i) { return i.price; }).filter(function (n) { return typeof n === "number"; });
    return p.length ? "From " + money(Math.min.apply(null, p)) : "Price on enquiry";
  }

  /* -- price lists -- */
  (function priceLists() {
    var host = $("#priceLists"); if (!host) return;

    /* Platters run full width; the written lists sit in two columns on a wide
       screen, because six stacked lists is four thousand pixels of scrolling
       for something people want to scan. */
    var colA = el("div"), colB = el("div");
    var cols = el("div", { class: "menu-cols" });
    cols.appendChild(colA); cols.appendChild(colB);

    function block(title, sub, build, where, catId) {
      var d = el("div", { class: "menu-block", "data-rv": "" });
      var h = el("h3", null, title);
      if (sub) h.appendChild(el("small", null, sub));
      var cc = catId && catBySlug(catId);
      if (cc) h.appendChild(el("a", { class: "block-more", href: catHref(cc) }, "See the options"));
      d.appendChild(h);
      build(d);
      (where || host).appendChild(d);
    }
    function list(items, unit) {
      var ul = el("ul", { class: "plist" });
      items.forEach(function (it) {
        var li = el("li");
        var nm = el("span", { class: "nm" });
        nm.appendChild(document.createTextNode(it.name));
        if (it.blurb) nm.appendChild(el("span", { class: "sub" }, it.blurb));
        li.appendChild(nm);
        li.appendChild(el("span", { class: "dots" }));
        li.appendChild(typeof it.price === "number"
          ? el("span", { class: "pr" }, money(it.price) + (it.unit ? " " + it.unit : (unit ? " " + unit : "")))
          : el("span", { class: "pr soft" }, "On enquiry"));
        ul.appendChild(li);
      });
      return ul;
    }

    block("Party platters", "the full spread", function (d) {
      var g = el("div", { class: "platters" });
      g.style.marginTop = "22px";
      D.platters.forEach(function (p, i) {
        var c = el("article", { class: "platter", "data-rv": "", "data-rv-d": String(i + 1) });
        var art = el("div", { class: "platter-art" });
        art.appendChild(el("img", { src: A + p.img, alt: "", loading: "lazy" }));
        c.appendChild(art);
        var inn = el("div", { class: "platter-in" });
        inn.appendChild(el("h3", null, p.name));
        inn.appendChild(el("p", { class: "cnt" }, p.count + " desserts"));
        var ul = el("ul");
        p.includes.forEach(function (x) { ul.appendChild(el("li", null, x)); });
        inn.appendChild(ul);
        var pr = el("div", { class: "price" });
        pr.appendChild(el("b", null, money(p.price)));
        pr.appendChild(el("span", { class: "cnt" }, "per platter"));
        inn.appendChild(pr);
        c.appendChild(inn);
        g.appendChild(c);
      });
      d.appendChild(g);
    }, null, "platters");

    host.appendChild(cols);
    block("Cakes", "each", function (d) { d.appendChild(list(D.cakes)); }, colA, "cakes");
    block("Cookies", "per dozen", function (d) { d.appendChild(list(D.cookies)); }, colA, "cookies");
    block("Treatboxes", "quoted per order", function (d) { d.appendChild(list(D.treatboxes)); }, colA, "treatboxes");

    block("Individual treats", "per dozen only", function (d) {
      D.individual.forEach(function (g) {
        d.appendChild(el("h4", { class: "grp" }, g.group));
        d.appendChild(list(g.items, "per dozen"));
      });
    }, colB, "individual");
    block("Baby boxes", "quoted per order", function (d) { d.appendChild(list(D.babyboxes)); }, colB, "babyboxes");
  })();

  /* ---------- a category's own page ----------
     One renderer, six pages: <body data-cat="cakes"> picks the category out of
     the data file and everything on the page comes from there. */
  var PAGE_CAT = document.body.getAttribute("data-cat");
  function catBySlug(x) {
    return D.categories.filter(function (c) { return c.id === x || c.slug === x; })[0];
  }
  function catHref(c) { return "/templates/strictly-sprinkles-" + c.slug; }
  function enquireHref(itemId) {
    return "/templates/strictly-sprinkles" + (itemId ? "?item=" + encodeURIComponent(itemId) : "") + "#enquire";
  }

  (function categoryPage() {
    if (!PAGE_CAT) return;
    var c = catBySlug(PAGE_CAT); if (!c) return;

    var on = $("#catOptsNote"); if (on) on.textContent = c.optsNote || "";
    var t = $("#catTitle");   if (t) t.textContent = c.label;
    var bl = $("#catBlurb");  if (bl) bl.textContent = c.blurb || c.note || "";
    var cr = $("#catCrumb");  if (cr) cr.textContent = c.label;
    document.title = c.label + " — Strictly Sprinkles";
    var hi = $("#catHeroImg");
    if (hi) { hi.src = A + c.img; hi.alt = c.label + " by Strictly Sprinkles"; }
    var ce = $("#catEnquire"); if (ce) ce.href = enquireHref(null);

    /* the options */
    var host = $("#catOptions"); if (!host) return;
    function card(it) {
      var a = el("article", { class: "opt-card", "data-rv": "" });
      var art = el("div", { class: "opt-art" });
      art.appendChild(el("img", { src: A + it.img, alt: "", loading: "lazy" }));
      a.appendChild(art);
      var inn = el("div", { class: "opt-in" });
      inn.appendChild(el("h3", null, it.name));
      if (it.blurb) inn.appendChild(el("p", { class: "opt-blurb" }, it.blurb));
      if (it.includes) {
        var ul = el("ul", { class: "opt-inc" });
        it.includes.forEach(function (x) { ul.appendChild(el("li", null, x)); });
        inn.appendChild(ul);
      }
      var foot = el("div", { class: "opt-foot" });
      foot.appendChild(typeof it.price === "number"
        ? el("b", null, money(it.price) + (it.unit ? " " + it.unit : (c.unit === "dozen" ? " per dozen" : "")))
        : el("b", { class: "soft" }, "Price on enquiry"));
      foot.appendChild(el("a", { class: "btn btn-line btn-sm", href: enquireHref(it.id) }, "Enquire"));
      inn.appendChild(foot);
      a.appendChild(inn);
      return a;
    }
    if (c.groups) {
      c.groups.forEach(function (g) {
        host.appendChild(el("h2", { class: "opt-group", "data-rv": "" }, g.group));
        var grid = el("div", { class: "opt-grid" });
        g.items.forEach(function (it) { grid.appendChild(card(it)); });
        host.appendChild(grid);
      });
    } else {
      var grid = el("div", { class: "opt-grid" });
      c.items.forEach(function (it) { grid.appendChild(card(it)); });
      host.appendChild(grid);
    }

    /* the flavour lists this category actually uses */
    var fh = $("#catFlavours");
    if (fh) {
      var sets = [];
      if ((c.opts || []).indexOf("sponge") > -1) {
        sets.push(["Sponge", D.flavours.sponge], ["Filling", D.flavours.filling], ["Frosting", D.flavours.frosting]);
      } else if (c.id === "cookies") {
        sets.push(["Finishes", ["Royal icing — flooded and hand-piped", "Fondant — smooth tops and embossed detail", "Edible images", "Personalised names and dates"]]);
      } else {
        sets.push(["Cheesecake", D.flavours.cheesecake], ["Macaron", D.flavours.macaron],
                  ["Cake pots and mini cakes", D.flavours.cakepot], ["Cupcakes", D.flavours.cupcake],
                  ["Brownies", D.flavours.brownie]);
      }
      sets.forEach(function (pair, i) {
        var col = el("div", { class: "flav-col", "data-rv": "", "data-rv-d": String((i % 3) + 1) });
        col.appendChild(el("h3", null, pair[0]));
        var ul = el("ul", { class: "chips" });
        pair[1].forEach(function (x) { ul.appendChild(el("li", null, x)); });
        col.appendChild(ul);
        fh.appendChild(col);
      });
    }

    /* the other five, so nobody has to go back to find them */
    var oh = $("#catOthers");
    if (oh) {
      D.categories.filter(function (x) { return x.id !== c.id; }).forEach(function (x, i) {
        var a = el("a", { class: "tile", href: catHref(x), "data-rv": "", "data-rv-d": String((i % 3) + 1) });
        var art = el("span", { class: "tile-art" });
        art.appendChild(el("img", { src: A + x.img, alt: "", loading: "lazy" }));
        a.appendChild(art);
        var body = el("span", { class: "tile-body" });
        body.appendChild(el("h3", null, x.label));
        body.appendChild(el("span", { class: "tile-from" }, priceFrom(x)));
        a.appendChild(body);
        oh.appendChild(a);
      });
    }
  })();

  /* -- seasonal collections (menu page) -- */
  (function seasons() {
    var host = $("#seasons"); if (!host || !D.seasonal) return;
    D.seasonal.forEach(function (x, i) {
      var c = el("article", { class: "season", "data-rv": "", "data-rv-d": String((i % 3) + 1) });
      var art = el("div", { class: "season-art" });
      art.appendChild(el("img", { src: A + x.img, alt: "", loading: "lazy" }));
      c.appendChild(art);
      var inn = el("div", { class: "season-in" });
      inn.appendChild(el("p", { class: "season-when" }, x.when));
      inn.appendChild(el("h3", null, x.name));
      if (x.blurb) inn.appendChild(el("p", { class: "season-blurb" }, x.blurb));
      inn.appendChild(el("p", { class: "season-price" },
        typeof x.price === "number" ? money(x.price) : "Price on enquiry"));
      c.appendChild(inn);
      host.appendChild(c);
    });
  })();

  /* -- flavours -- */
  (function flavours() {
    var host = $("#flavours-grid"); if (!host) return;
    var f = D.flavours;
    [["Cake flavours", f.sponge], ["Filling options", f.filling], ["Frosting options", f.frosting]]
      .forEach(function (pair, i) {
        var col = el("div", { class: "flav-col", "data-rv": "", "data-rv-d": String(i + 1) });
        col.appendChild(el("h3", null, pair[0]));
        var ul = el("ul", { class: "chips" });
        pair[1].forEach(function (x) { ul.appendChild(el("li", null, x)); });
        col.appendChild(ul);
        host.appendChild(col);
      });
  })();

  /* The allergy note stands on its own: it belongs to every page that lists
     flavours, and it was being skipped on the category pages because it sat
     inside a function that returns early without the home flavour grid. */
  (function allergy() {
    var an = $("#allergyNote"); if (an) an.textContent = D.allergyNote;
  })();

  /* -- gallery -- */
  (function gallery() {
    var host = $("#gallery"); if (!host) return;
    /* All hers. Order is deliberate: the two showpieces open, then a rhythm
       of box / cake / box so the masonry never stacks two cakes together. */
    var shots = [
      ["work/nikkah-cake.webp",        "Nikkah cake — pearls and gold monogram"],
      ["work/nikkah-box.webp",         "Nikkah treatbox"],
      ["work/tiered-blue-gold.webp",   "Three-tier birthday cake"],
      ["work/macaron-boxes.webp",      "Macarons, boxed"],
      ["work/vintage-heart-cake.webp", "Vintage heart cake"],
      ["work/baby-girl-box.webp",      "Baby announcement boxes"],
      ["work/umrah-cupcakes.webp",     "Umrah Mubarak cupcakes"],
      ["work/nikkah-cookies.webp",     "Personalised nikkah cookies"],
      ["work/vintage-pink-cake.webp",  "Bridal shower cake"],
      ["work/date-boxes.webp",         "Ramadan date boxes"],
      ["work/duck-cake.webp",          "First birthday cake"],
      ["work/mehndi-box.webp",         "Mehndi treatbox"],
      ["work/dessert-table.webp",      "Mehndi dessert table"],
      ["work/grad-cupcakes.webp",      "Black Forest graduation cupcakes"],
      ["work/pawpatrol-cake.webp",     "Character birthday cake"],
      ["work/baby-boy-box.webp",       "Baby announcement boxes"],
      ["work/lamborghini-cake.webp",   "Sculpted birthday cake"],
      ["work/chaat-table.webp",        "Chaat table"]
    ];
    shots.forEach(function (s, i) {
      var fig = el("figure", { "data-rv": "", "data-rv-d": String((i % 4) + 1) });
      fig.appendChild(el("img", { src: A + s[0], alt: s[1], loading: "lazy" }));
      fig.appendChild(el("figcaption", null, s[1]));
      host.appendChild(fig);
    });
  })();

  /* -- terms, care, faq -- */
  (function policies() {
    var t = $("#termsCol"); if (!t) return;
    D.terms.forEach(function (sec, i) {
      var d = el("div", { class: "pol", "data-rv": "", "data-rv-d": String(i + 1) });
      if (i) d.style.marginTop = "34px";
      d.appendChild(el("h3", null, sec.h));
      var ul = el("ul");
      sec.l.forEach(function (x) { ul.appendChild(el("li", null, x)); });
      d.appendChild(ul);
      t.appendChild(d);
    });
    var c = $("#careCol");
    var head = el("div", { class: "pol", "data-rv": "" });
    head.appendChild(el("h3", null, "Looking after it"));
    c.appendChild(head);
    D.cakeCare.forEach(function (sec, i) {
      var d = el("div", { class: "pol", "data-rv": "", "data-rv-d": String(i + 1) });
      d.style.marginTop = "22px";
      d.appendChild(el("h3", { style: "font-size:clamp(1.15rem,2.2vw,1.45rem)" }, sec.h));
      d.appendChild(el("p", null, sec.p));
      c.appendChild(d);
    });

    var faq = $("#faq");
    D.faq.forEach(function (q) {
      var det = el("details");
      det.appendChild(el("summary", null, q.q));
      det.appendChild(el("div", { class: "a" }, q.a));
      faq.appendChild(det);
    });
  })();

  /* -- reviews -- */
  (function reviews() {
    if (!$("#rvs")) return;
    function stars(n) {
      var w = el("span", { class: "stars", "aria-label": n + " out of 5" });
      for (var i = 0; i < n; i++) {
        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("aria-hidden", "true");
        var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
        p.setAttribute("d", "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z");
        svg.appendChild(p); w.appendChild(svg);
      }
      return w;
    }
    var head = $("#rvHead");
    var sc = el("div", { class: "rv-score" });
    sc.appendChild(el("b", null, "5.0"));
    sc.appendChild(stars(5));
    head.appendChild(sc);
    if (D.reviewsAreExamples) {
      head.appendChild(el("span", { class: "rv-note" }, "Examples only — her real reviews go here"));
    }
    var host = $("#rvs");
    D.reviews.forEach(function (r, i) {
      var c = el("article", { class: "rv", "data-rv": "", "data-rv-d": String(i + 1) });
      c.appendChild(stars(r.stars));
      c.appendChild(el("p", null, "“" + r.text + "”"));
      var f = el("footer");
      f.appendChild(el("b", null, r.name));
      if (r.when && r.when !== "—") f.appendChild(el("span", null, r.when));
      c.appendChild(f);
      host.appendChild(c);
    });
  })();

  /* -- socials, footer, links -- */
  var IG = "https://instagram.com/" + B.instagram;
  var TT = "https://www.tiktok.com/@" + B.tiktok;
  var FB = B.facebook;

  function waLink(text) {
    return "https://wa.me/" + B.whatsapp + (text ? "?text=" + encodeURIComponent(text) : "");
  }
  function mailLink(subject, body) {
    return "mailto:" + B.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }

  (function socials() {
    var host = $("#socials");   /* only the contact grid is optional */
    var ICONS = {
      ig: "M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.6.22 1 .48 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 3.1A6.7 6.7 0 1 0 18.7 12 6.7 6.7 0 0 0 12 5.3zm0 11a4.3 4.3 0 1 1 4.3-4.3 4.3 4.3 0 0 1-4.3 4.3zm6.9-11.2a1.6 1.6 0 1 1-1.6-1.6 1.6 1.6 0 0 1 1.6 1.6z",
      tt: "M16.6 5.8a4.8 4.8 0 0 1-1.2-3.2h-3v13a2.8 2.8 0 1 1-2-2.7v-3a5.8 5.8 0 1 0 5 5.7V9a7.8 7.8 0 0 0 4.5 1.4v-3a4.8 4.8 0 0 1-3.3-1.6z",
      fb: "M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z",
      wa: "M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.1-.6.2s-.7.9-.9 1.1c-.2.2-.3.2-.6.1a8 8 0 0 1-2.4-1.5 9 9 0 0 1-1.6-2c-.2-.3 0-.5.1-.6l.5-.5.3-.5v-.5c0-.2-.6-1.6-.9-2.2-.2-.5-.4-.5-.6-.5h-.6a1 1 0 0 0-.8.4 3.2 3.2 0 0 0-1 2.4 5.6 5.6 0 0 0 1.2 3A12.7 12.7 0 0 0 12.6 16c.7.3 1.2.5 1.6.6a3.9 3.9 0 0 0 1.8.1 3 3 0 0 0 2-1.4 2.4 2.4 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.4zM12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3.1.8.8-3-.2-.3a8.2 8.2 0 1 1 7 3.8z",
      mail: "M2 5.5A1.5 1.5 0 0 1 3.5 4h17A1.5 1.5 0 0 1 22 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 18.5zm2.2.5 7.8 5.6L19.8 6zM20 7.9l-7.4 5.3a1 1 0 0 1-1.2 0L4 7.9V18h16z"
    };
    function card(icon, title, sub, href) {
      var a = el("a", { class: "soc", href: href, target: "_blank", rel: "noopener", "data-rv": "" });
      var ic = el("div", { class: "soc-ic" });
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("aria-hidden", "true");
      var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", ICONS[icon]); svg.appendChild(p); ic.appendChild(svg);
      a.appendChild(ic);
      var t = el("div", { class: "t" });
      t.appendChild(el("b", null, title));
      t.appendChild(el("span", null, sub));
      a.appendChild(t);
      return a;
    }
    var intro = "Hi! I found you through your website — I'd like to ask about an order.";
    if (host) {
      host.appendChild(card("wa", "WhatsApp", B.phone, waLink(intro)));
      host.appendChild(card("ig", "Instagram", "@" + B.instagram, IG));
      host.appendChild(card("mail", "Email", B.email, mailLink("Enquiry from your website", intro)));
      host.appendChild(card("tt", "TikTok", "@" + B.tiktok, TT));
      host.appendChild(card("fb", "Facebook", B.name, FB));
      host.appendChild(card("ig", "The studio", "@" + B.instagramStudio, "https://instagram.com/" + B.instagramStudio));
    }

    var ig = $("#igBtn"); if (ig) ig.href = IG;
    var dw = $("#dockWa"); if (dw) dw.href = waLink(intro);

    var fc = $("#footContact");
    if (fc) [["WhatsApp " + B.phone, waLink(intro)],
     ["@" + B.instagram, IG],
     [B.email, mailLink("Enquiry from your website", intro)],
     ["TikTok", TT], ["Facebook", FB]].forEach(function (p) {
      var li = el("li");
      li.appendChild(el("a", { href: p[1], target: "_blank", rel: "noopener" }, p[0]));
      fc.appendChild(li);
    });
    var fcp = $("#footCopy"); if (fcp) fcp.textContent = "© " + new Date().getFullYear() + " " + B.name + " · " + B.town + " · Halal";

    var cta = $("#notListedCta"); if (!cta) return;
    cta.appendChild(el("a", { class: "btn btn-fill", href: waLink("Hi! Is this something you could make? "), target: "_blank", rel: "noopener" }, "Ask on WhatsApp"));
    cta.appendChild(el("a", { class: "btn btn-line", href: mailLink("A question about something not on the menu", "Hi,\n\nI'd like to ask about something that isn't on the menu:\n\n") }, "Ask by email"));
  })();

  /* ============================================================
     3. THE ORDER BUILDER
     ============================================================ */
  var state = { cat: null, item: null, sponge: "", filling: "", frosting: "", treat: "" };

  var catOpts = $("#catOpts"), itemOpts = $("#itemOpts"),
      itemHeading = $("#itemHeading"), itemNote = $("#itemNote"),
      stepFlavour = $("#stepFlavour"), flavourFields = $("#flavourFields");
  /* the menu page has no builder; every step below checks for it */
  var HAS_BUILDER = !!catOpts;

  if (HAS_BUILDER) {
    D.categories.forEach(function (c) {
      catOpts.appendChild(el("button", { type: "button", class: "opt-btn", "aria-pressed": "false", "data-id": c.id }, c.label));
    });
    catOpts.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-id]"); if (b) setCat(b.getAttribute("data-id"));
    });
  }

  function cat() { return D.categories.filter(function (c) { return c.id === state.cat; })[0]; }

  function setCat(id, silent) {
    if (!HAS_BUILDER) return;
    state.cat = id; state.item = null; state.treat = "";
    $$("button", catOpts).forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-id") === id));
    });
    var c = cat();
    itemHeading.textContent = c.groups ? "Pick your treats" : "Pick a size";
    itemNote.textContent = c.note || "";
    renderItems(c);
    renderFlavourStep(c);
    summarise();
    if (!silent) {
      var sec = $("#enquire");
      if (sec) sec.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    }
  }

  function itemButton(it, unit) {
    var b = el("button", { type: "button", class: "item", "aria-pressed": "false", "data-item": it.id });
    b.appendChild(el("img", { src: A + it.img, alt: "", loading: "lazy" }));
    var t = el("div", { class: "t" });
    t.appendChild(el("b", null, it.name));
    t.appendChild(el("span", null, typeof it.price === "number"
      ? money(it.price) + (it.unit ? " " + it.unit : (unit === "dozen" ? " per dozen" : ""))
      : "On enquiry"));
    b.appendChild(t);
    return b;
  }

  function renderItems(c) {
    if (!itemOpts) return;
    itemOpts.textContent = "";
    if (c.groups) {
      c.groups.forEach(function (g) {
        var wrap = el("div", { class: "item-group" });
        wrap.appendChild(el("h4", null, g.group));
        var grid = el("div", { class: "items" });
        g.items.forEach(function (it) { grid.appendChild(itemButton(it, c.unit)); });
        wrap.appendChild(grid);
        itemOpts.appendChild(wrap);
      });
    } else {
      var grid = el("div", { class: "items" });
      c.items.forEach(function (it) { grid.appendChild(itemButton(it, c.unit)); });
      itemOpts.appendChild(grid);
    }
  }

  if (itemOpts) itemOpts.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-item]"); if (!b) return;
    var id = b.getAttribute("data-item");
    state.item = state.item === id ? null : id;
    $$("button[data-item]", itemOpts).forEach(function (x) {
      x.setAttribute("aria-pressed", String(x.getAttribute("data-item") === state.item));
    });
    summarise();
  });

  /* which flavour questions this category asks */
  function renderFlavourStep(c) {
    if (!flavourFields) return;
    flavourFields.textContent = "";
    var opts = c.opts || [];
    var asks = false;

    function selectField(id, label, list, key) {
      var f = el("div", { class: "field" });
      f.appendChild(el("label", { for: id }, label));
      var s = el("select", { id: id });
      s.appendChild(el("option", { value: "" }, "No preference — I'll advise"));
      list.forEach(function (x) { s.appendChild(el("option", { value: x }, x)); });
      s.value = state[key] || "";
      s.addEventListener("change", function () { state[key] = s.value; summarise(); });
      f.appendChild(s);
      flavourFields.appendChild(f);
      asks = true;
    }

    if (opts.indexOf("sponge") > -1) {
      var two = el("div", { class: "fields two" });
      flavourFields.appendChild(two);
      selectField("fSponge", "Sponge", D.flavours.sponge, "sponge");
      selectField("fFilling", "Filling", D.flavours.filling, "filling");
      selectField("fFrosting", "Frosting", D.flavours.frosting, "frosting");
      /* move the three into the two-column grid */
      $$(".field", flavourFields).forEach(function (f) { two.appendChild(f); });
    }
    if (opts.indexOf("treatFlavour") > -1 || opts.indexOf("platterFlavours") > -1) {
      var f = el("div", { class: "field" });
      f.appendChild(el("label", { for: "fTreat" }, "Flavours you'd like"));
      var i = el("input", { id: "fTreat", type: "text",
        placeholder: "e.g. Biscoff cakesicles, pistachio macarons, raspberry cheesecake" });
      i.value = state.treat || "";
      i.addEventListener("input", function () { state.treat = i.value; summarise(); });
      f.appendChild(i);
      var menus = [];
      if (D.flavours.cheesecake) menus.push("Cheesecake: " + D.flavours.cheesecake.join(", "));
      if (D.flavours.macaron) menus.push("Macaron: " + D.flavours.macaron.join(", "));
      if (D.flavours.cakepot) menus.push("Cake pots and mini cakes: " + D.flavours.cakepot.join(", "));
      if (D.flavours.cupcake) menus.push("Cupcakes: " + D.flavours.cupcake.join(", "));
      if (D.flavours.brownie) menus.push("Brownies: " + D.flavours.brownie.join(", "));
      f.appendChild(el("p", { class: "hint" }, menus.join(" · ")));
      flavourFields.appendChild(f);
      asks = true;
    }
    stepFlavour.hidden = !asks;
    $("#nDetails").textContent = asks ? "4" : "3";
    $("#nYou").textContent = asks ? "5" : "4";
  }

  /* quantity stepper */
  var qty = $("#fQty");
  if (qty) {
    $("#qtyMinus").addEventListener("click", function () { qty.value = Math.max(1, (+qty.value || 1) - 1); summarise(); });
    $("#qtyPlus").addEventListener("click", function () { qty.value = Math.min(99, (+qty.value || 1) + 1); summarise(); });
    qty.addEventListener("input", summarise);
  }

  /* occasions */
  (function occ() {
    var s = $("#fOccasion"); if (!s) return;
    s.appendChild(el("option", { value: "" }, "Choose one (optional)"));
    D.occasions.forEach(function (o) { s.appendChild(el("option", { value: o }, o)); });
    s.addEventListener("change", summarise);
  })();

  /* the date cannot be in the past */
  (function dateMin() {
    var d = $("#fDate"); if (!d) return;
    var t = new Date(); t.setHours(0, 0, 0, 0);
    d.min = t.toISOString().slice(0, 10);
    d.addEventListener("change", summarise);
  })();

  ["fColours", "fInspo", "fNotes", "fName", "fContact"].forEach(function (id) {
    var n = $("#" + id); if (n) n.addEventListener("input", summarise);
  });

  function chosenItem() {
    var c = cat(); if (!c || !state.item) return null;
    return allItems(c).filter(function (i) { return i.id === state.item; })[0] || null;
  }

  function val(id) { var n = $("#" + id); return n && typeof n.value === "string" ? n.value.trim() : ""; }

  function prettyDate(iso) {
    if (!iso) return "";
    var p = iso.split("-"); if (p.length !== 3) return iso;
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }

  /* the summary panel and the running total */
  function summarise() {
    if (!HAS_BUILDER || !qty) return;
    var c = cat(), it = chosenItem(), n = Math.max(1, +qty.value || 1);
    var rows = [];
    rows.push(["What", c ? c.label : ""]);
    rows.push(["Item", it ? it.name : ""]);
    if (c && (c.opts || []).indexOf("sponge") > -1) {
      rows.push(["Sponge", state.sponge]);
      rows.push(["Filling", state.filling]);
      rows.push(["Frosting", state.frosting]);
    }
    if (state.treat) rows.push(["Flavours", state.treat]);
    rows.push(["How many", it ? n + " × " + (it.unit ? "dozen" : (c && c.unit) || "item") : ""]);
    rows.push(["Date", prettyDate(val("fDate"))]);
    rows.push(["Occasion", val("fOccasion")]);
    rows.push(["Colours", val("fColours")]);
    rows.push(["Inspo", val("fInspo")]);
    rows.push(["Notes", val("fNotes")]);

    var host = $("#sumList"); host.textContent = "";
    rows.forEach(function (r) {
      if (!r[1] && r[0] !== "What" && r[0] !== "Item") return;
      var li = el("li");
      li.appendChild(el("span", { class: "k" }, r[0]));
      li.appendChild(el("span", { class: "v" + (r[1] ? "" : " empty") }, r[1] || "Not chosen yet"));
      host.appendChild(li);
    });

    var total = $("#sumTotal"), note = $("#sumNote");
    if (it && typeof it.price === "number") {
      total.textContent = money(it.price * n);
      note.textContent = n > 1
        ? money(it.price) + " each, before any extra detail."
        : "Before any extra detail — toppers, edible images and sculpted work are quoted on top.";
    } else if (it) {
      total.textContent = "On enquiry";
      note.textContent = "This one is quoted per order. Send the details and I'll price it.";
    } else {
      total.textContent = "—";
      note.textContent = "Pick an item and the price appears here.";
    }
  }

  /* what's missing, in the order the form asks for it */
  function missing() {
    if (!state.cat) return "Pick what you're after first.";
    if (!state.item) return "Choose a size or a treat.";
    if (!val("fName")) return "Add your name so I know who I'm talking to.";
    if (!val("fContact")) return "Add a phone number or an email so I can reply.";
    return null;
  }
  function flagFirst() {
    var order = [["fName", !val("fName")], ["fContact", !val("fContact")]];
    order.forEach(function (p) {
      var n = $("#" + p[0]); if (!n) return;
      if (p[1]) n.setAttribute("aria-invalid", "true"); else n.removeAttribute("aria-invalid");
    });
    if (!state.cat) { catOpts.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" }); return; }
    if (!state.item) { itemOpts.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" }); return; }
    var bad = $("[aria-invalid='true']");
    if (bad) { bad.focus(); bad.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" }); }
  }

  /* the message — built once, sent down either route */
  function compose() {
    var c = cat(), it = chosenItem(), n = Math.max(1, +qty.value || 1);
    var L = [];
    L.push("Order enquiry from your website");
    L.push("");
    L.push("Name: " + val("fName"));
    L.push("Contact: " + val("fContact"));
    L.push("");
    L.push("What: " + (c ? c.label : ""));
    L.push("Item: " + (it ? it.name : ""));
    L.push("How many: " + n + (it && it.unit ? " dozen" : ""));
    if (it && typeof it.price === "number") L.push("Listed price: " + money(it.price * n));
    if (state.sponge) L.push("Sponge: " + state.sponge);
    if (state.filling) L.push("Filling: " + state.filling);
    if (state.frosting) L.push("Frosting: " + state.frosting);
    if (state.treat) L.push("Flavours: " + state.treat);
    if (val("fDate")) L.push("Date needed: " + prettyDate(val("fDate")));
    if (val("fOccasion")) L.push("Occasion: " + val("fOccasion"));
    if (val("fColours")) L.push("Colours / theme: " + val("fColours"));
    if (val("fInspo")) L.push("Inspiration: " + val("fInspo"));
    if (val("fNotes")) { L.push(""); L.push("Notes: " + val("fNotes")); }
    return L.join("\n");
  }

  function say(kind, text) {
    var box = $("#sumMsg");
    box.textContent = "";
    box.appendChild(el("div", { class: kind === "ok" ? "sum-ok" : "sum-err" }, text));
  }

  /* Safari blocks a navigation that happens after an await, so the handover
     runs inside the click itself, and clicks a real anchor rather than
     assigning location.href — which some in-app browsers ignore. */
  function handover(href) {
    var a = el("a", { href: href, target: "_blank", rel: "noopener" });
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { a.remove(); }, 0);
  }

  if (HAS_BUILDER) $("#sendWa").addEventListener("click", function () {
    var m = missing();
    if (m) { say("err", m); flagFirst(); return; }
    handover(waLink(compose()));
    say("ok", "WhatsApp is opening with your enquiry written out. Press send — and add your inspiration pictures straight into the chat.");
  });

  if (HAS_BUILDER) $("#sendMail").addEventListener("click", function () {
    var m = missing();
    if (m) { say("err", m); flagFirst(); return; }
    var it = chosenItem();
    handover(mailLink("Order enquiry — " + (it ? it.name : "Strictly Sprinkles"), compose()));
    say("ok", "Your email app is opening with your enquiry written out. Attach your inspiration pictures and send.");
  });

  if (HAS_BUILDER) {
    $("#builder").addEventListener("submit", function (e) { e.preventDefault(); });

    /* A category page sends people here with ?item=<id>. Find which category
       owns it, select both, and let the #enquire hash do the scrolling. */
    var want = null;
    try { want = new URLSearchParams(location.search).get("item"); } catch (e) {}
    var owner = null;
    if (want) {
      for (var k = 0; k < D.categories.length; k++) {
        if (allItems(D.categories[k]).some(function (i) { return i.id === want; })) { owner = D.categories[k]; break; }
      }
    }
    if (owner) {
      setCat(owner.id, true);
      state.item = want;
      $$("button[data-item]", itemOpts).forEach(function (x) {
        x.setAttribute("aria-pressed", String(x.getAttribute("data-item") === want));
      });
      summarise();
    } else {
      setCat(D.categories[0].id, true);   /* start on cakes */
    }
  }

  /* ============================================================
     4. MOTION
     ============================================================ */

  /* smooth scroll */
  var lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new window.Lenis({ duration: 1.1, smoothWheel: true, touchMultiplier: 1.6 });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
  }
  function goTo(target) {
    if (lenis) lenis.scrollTo(target, { offset: -74, duration: 1.2 });
    else target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]'); if (!a) return;
    var id = a.getAttribute("href");
    if (id === "#" || id.length < 2) return;
    var t = document.querySelector(id); if (!t) return;
    e.preventDefault();
    closeMenu();
    goTo(t);
    history.replaceState(null, "", id);
  });

  /* reveals */
  (function reveals() {
    var items = $$("[data-rv]");
    if (reduced || !("IntersectionObserver" in window)) {
      items.forEach(function (n) { n.classList.add("in"); });
      $$(".rise").forEach(function (n) { n.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0 });
    items.forEach(function (n) { io.observe(n); });
    /* Anything already on screen at load is revealed outright. The observer's
       -12% bottom margin means an element sitting low in the first viewport
       never intersects until you scroll, so it just sat there invisible —
       which is what happened to the hero's fact row. */
    requestAnimationFrame(function () {
      items.forEach(function (n) {
        if (n.getBoundingClientRect().top < innerHeight) { n.classList.add("in"); io.unobserve(n); }
      });
    });
    /* the hero headline plays on load, not on scroll */
    setTimeout(function () { $$(".rise").forEach(function (n) { n.classList.add("in"); }); }, 340);
  })();

  /* observe anything added to the DOM after the first pass */
  function reobserve() {
    if (reduced) { $$("[data-rv]").forEach(function (n) { n.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0 });
    $$("[data-rv]:not(.in)").forEach(function (n) { io.observe(n); });
  }
  reobserve();

  /* the hero collage drifts as you scroll */
  (function floaty() {
    if (reduced) return;
    var cards = $$("[data-float-rate]");
    if (!cards.length) return;
    var ticking = false;
    function frame() {
      var y = scrollY;
      if (y < innerHeight * 1.3) {
        cards.forEach(function (c) {
          c.style.transform = "translate3d(0," + (y * parseFloat(c.getAttribute("data-float-rate"))).toFixed(1) + "px,0)";
        });
      }
      ticking = false;
    }
    addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }, { passive: true });
    frame();
  })();

  /* nav state + the phone dock */
  (function chrome() {
    var nav = $("#nav"), dock = $("#dock"), hero = $("#hero");
    /* The bar goes cream only once the dark block at the top of the page has
       actually scrolled away. Switching at 40px turned it white while the
       hero photograph was still behind it, which put a white bar between two
       dark ones — it read as a fault, and it was. */
    /* [data-dark] marks the run of dark blocks at the top of the page — the
       hero, the photograph under it and the marquee. The bar goes cream when
       the last of them has gone, not before: a cream bar over any of them
       reads as a fault. */
    var darkRun = $$("[data-dark]");
    var lastDark = darkRun.length ? darkRun[darkRun.length - 1] : null;
    function frame() {
      var edge = 40;
      if (lastDark) edge = Math.max(40, lastDark.offsetTop + lastDark.offsetHeight - nav.offsetHeight);
      nav.classList.toggle("solid", scrollY > edge);
      if (dock && hero) dock.classList.toggle("up", scrollY > hero.offsetHeight * 0.7);
    }
    addEventListener("scroll", frame, { passive: true });
    addEventListener("resize", frame);
    frame();
  })();

  /* drawer */
  var menu = $("#menu"), menuOpen = $("#menuOpen"), menuClose = $("#menuClose");
  if (!menu) { menu = el("div"); menuOpen = el("button"); menuClose = el("button"); }
  function openMenu() {
    menu.classList.add("open"); menu.setAttribute("aria-hidden", "false");
    menuOpen.setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-on");
    if (lenis) lenis.stop();
    menuClose.focus();
  }
  function closeMenu() {
    if (!menu.classList.contains("open")) return;
    menu.classList.remove("open"); menu.setAttribute("aria-hidden", "true");
    menuOpen.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-on");
    if (lenis) lenis.start();
  }
  menuOpen.addEventListener("click", openMenu);
  menuClose.addEventListener("click", closeMenu);
  addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });

  /* loader */
  function done() {
    var l = $("#loader"); if (!l) return;
    l.classList.add("gone");
    setTimeout(function () { l.remove(); }, 900);
  }
  if (document.readyState === "complete") setTimeout(done, 500);
  else addEventListener("load", function () { setTimeout(done, 500); });
  setTimeout(done, 3600);   /* never let a slow image hold the page hostage */

  /* ---------- the hero's sprinkles ----------
     A canvas, not DOM nodes. Eighty elements each running its own CSS
     animation shuttle back and forth along a line — `alternate` makes every
     dot stop dead and reverse, which reads as jitter rather than drift. Here
     each particle travels outward from the mark continuously and is reseeded
     at the ring when it reaches the edge, so the stream never stops and never
     doubles back. One canvas also costs one layer instead of eighty, which is
     what pays for four times as many dots. */
  (function dust() {
    var layer = $("#heroDust"), mark = $(".hero-mark"), hero = $("#hero");
    if (!layer || !mark || !hero || reduced) return;
    var cv = el("canvas"); cv.setAttribute("aria-hidden", "true");
    layer.appendChild(cv);
    var ctx = cv.getContext("2d"); if (!ctx) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);   /* 3 buys nothing for soft dots */
    var W = 0, H = 0, cx = 0, cy = 0, r0 = 0, maxR = 0;
    var parts = [], live = true, last = 0;

    function measure() {
      var hb = hero.getBoundingClientRect(), mb = mark.getBoundingClientRect();
      W = Math.round(hb.width); H = Math.round(hb.height);
      if (!W || !H) return false;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = W + "px"; cv.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#fdeae8";                 /* setTransform resets nothing else, but a
                                                    resized canvas loses its fill style */
      cx = mb.left - hb.left + mb.width / 2;
      cy = mb.top - hb.top + mb.height / 2;
      r0 = mb.width * 0.42;                      /* just inside her speckled ring */
      maxR = Math.max(W, H) * 0.92;
      return true;
    }

    /* `spread` seeds a particle anywhere along its journey, so the field is
       already full on the first frame instead of puffing out all at once */
    function seed(p, spread) {
      p.a = Math.random() * Math.PI * 2;
      p.r = spread ? r0 + Math.random() * (maxR - r0) : r0 * (0.9 + Math.random() * 0.2);
      p.sp = 4 + Math.random() * 13;             /* px per second, outward */
      p.spin = (Math.random() - 0.5) * 0.05;     /* radians per second, a slow swirl */
      p.size = 0.45 + Math.random() * 1.5;
      p.al = 0.16 + Math.random() * 0.46;
      return p;
    }

    function build() {
      if (!measure()) return;
      var n = innerWidth < 700 ? 150 : 300;
      parts = [];
      for (var i = 0; i < n; i++) parts.push(seed({}, true));
    }

    function frame(now) {
      requestAnimationFrame(frame);
      if (!live || !W) { last = now; return; }
      var dt = Math.min((now - last) / 1000, 0.05); last = now;   /* cap after a tab switch */
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.r += p.sp * dt;
        p.a += p.spin * dt;
        if (p.r > maxR) seed(p, false);
        var t = (p.r - r0) / (maxR - r0);                  /* 0 at the ring, 1 at the edge */
        var fade = Math.min(t / 0.10, 1) * (1 - Math.max(0, (t - 0.45) / 0.55));
        if (fade <= 0) continue;
        var x = cx + Math.cos(p.a) * p.r;
        var y = cy + Math.sin(p.a) * p.r * 0.86;           /* the hero is wider than tall */
        if (x < -4 || x > W + 4 || y < -4 || y > H + 4) continue;
        ctx.globalAlpha = p.al * fade;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    build();
    last = performance.now();
    requestAnimationFrame(frame);

    /* nothing is drawn while the hero is off screen */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { live = es[0].isIntersecting; }).observe(hero);
    }
    var t; addEventListener("resize", function () { clearTimeout(t); t = setTimeout(build, 200); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
  })();

  /* sprinkles last — they are decoration and cost frames */
  $$("[data-sprinkles]").forEach(sprinkle);

})();

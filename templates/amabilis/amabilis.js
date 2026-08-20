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
    var slots = $$("[data-mark]");     /* the stand-in is already in the markup */
    var probe = new Image();
    probe.onload = function () {
      slots.forEach(function (s) {
        s.innerHTML = '<img class="mark-img" src="' + esc(D.studio.logo) +
                      '" alt="' + esc(D.studio.name) + ' — ' + esc(D.studio.tagline) + '">';
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
    { src: "../../assets/amabilis/cakes/bloom-detail.webp",
      alt: "A finished blush cake crowned with fresh roses and hydrangea" },
    { src: "../../assets/amabilis/stock/mix-cocoa.webp",
      alt: "Cocoa powder and flour sifted together in a glass bowl beside cracked eggs" },
    { src: "../../assets/amabilis/stock/pipe-kisses.webp",
      alt: "A piping bag setting rows of buttercream kisses onto a cake" },
    { src: "../../assets/amabilis/stock/drip-pour.webp",
      alt: "Ganache being poured over the edge of a pink buttercream cake" },
    { src: "../../assets/amabilis/cakes/heirloom.webp",
      alt: "A finished blush cake boxed under clear organza and tied with ribbon" }
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

  function renderReels () {
    var row = $("[data-reels]");
    if (!row) return;
    D.cakes.filter(function (c) { return c.reel; }).forEach(function (c) {
      var f = el("figure", "reel");
      f.innerHTML =
        '<img src="' + esc(c.poster) + '" alt="' + esc(c.alt) + '" loading="lazy" decoding="async">' +
        '<video muted loop playsinline preload="none" poster="' + esc(c.poster) + '" aria-label="' + esc(c.name) + ' — film"></video>' +
        '<span class="reel-sound" aria-hidden="true">MUTE</span>' +
        '<figcaption><span class="reel-name">' + esc(c.name) + '</span><span>' + esc(c.occasion) + '</span></figcaption>';
      var v = f.querySelector("video");
      v.setAttribute("data-src", c.reel);
      if (c.reelWebm) v.setAttribute("data-webm", c.reelWebm);
      row.appendChild(f);
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

  function dripPath (seed, W, H) {
    var r = rng(seed), rest = H * 0.13, x = 0, pts = [];
    while (x < W) {
      /* slim segments, or the runs read as blobs rather than drips */
      var seg = 13 + r() * 26;
      var deep = r() < 0.30;
      pts.push({ x: Math.min(x + seg / 2, W), w: seg,
                 d: rest + (deep ? H * (0.30 + r() * 0.62) : H * (0.02 + r() * 0.13)) });
      x += seg;
    }
    var d = "M0," + rest.toFixed(1), prev = 0;
    pts.forEach(function (p) {
      var l = Math.max(0, p.x - p.w / 2), rr = Math.min(W, p.x + p.w / 2);
      d += " C" + ((prev + l) / 2).toFixed(1) + "," + rest.toFixed(1) +
           " " + l.toFixed(1) + "," + p.d.toFixed(1) +
           " " + p.x.toFixed(1) + "," + p.d.toFixed(1);
      d += " C" + rr.toFixed(1) + "," + p.d.toFixed(1) +
           " " + rr.toFixed(1) + "," + rest.toFixed(1) +
           " " + Math.min(W, rr + 2).toFixed(1) + "," + rest.toFixed(1);
      prev = rr;
    });
    return d + " L" + W + ",0 L0,0 Z";
  }

  function drips () {
    var W = 1000, H = 100;
    $$("[data-drip]").forEach(function (node, i) {
      var cream = node.classList.contains("drip--cream");
      var seed = (parseInt(node.getAttribute("data-drip"), 10) || (i + 7) * 131) | 0;
      var id = "dg" + i;                       /* gradient ids must not collide */
      var r = rng(seed + 99);
      var stops = cream
        ? '<stop offset="0" stop-color="#fbf3e6"/><stop offset=".6" stop-color="#f6e7cf"/>' +
          '<stop offset="1" stop-color="#e8d3b4"/>'
        : '<stop offset="0" stop-color="#3f2318"/><stop offset=".55" stop-color="#2e1a12"/>' +
          '<stop offset="1" stop-color="#4a2a1c"/>';
      var beads = "";
      for (var b = 0; b < 3; b++) {
        beads += '<circle class="bead" fill="url(#' + id + ')" cx="' +
                 (90 + r() * 820).toFixed(0) + '" cy="' + (H * 0.4).toFixed(0) +
                 '" r="' + (4 + r() * 3.4).toFixed(1) + '"/>';
      }
      node.innerHTML =
        '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" aria-hidden="true">' +
          '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' + stops +
          "</linearGradient></defs>" +
          '<g class="runs">' +
            '<path fill="url(#' + id + ')" d="' + dripPath(seed, W, H) + '"/>' +
            '<path class="sheen" d="' + dripPath(seed + 13, W, H * 0.42) + '"/>' +
          "</g>" + beads +
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
    reels();
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
        .from(".seal", { opacity: 0, scale: .8, duration: 1.1 }, .8);
    }

    /* -- hero scroll: layers drift apart --------------------------------- */
    gsap.timeline({ scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: .6 } })
      .to(".hero-type", { yPercent: -18, opacity: .25, ease: "none" }, 0)
      .to(".hero-plate", { yPercent: -34, ease: "none" }, 0)
      .to(".hero-frame img", { scale: 1.16, ease: "none" }, 0)
      .to(".seal", { rotate: 55, opacity: 0, ease: "none" }, 0);

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

    /* -- signature: pinned horizontal run --------------------------------- */
    (function horizontal () {
      var section = $(".h-scroll"), track = $(".h-track"), rail = $(".h-rail i");
      if (!section || !track || narrow.matches) return;
      var amount = function () { return Math.max(0, track.scrollWidth - innerWidth + 40); };
      section.style.height = "auto";
      var tween = gsap.to(track, {
        x: function () { return -amount(); }, ease: "none",
        scrollTrigger: {
          trigger: section, start: "top top",
          end: function () { return "+=" + amount(); },
          pin: true, scrub: .8, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: function (self) { if (rail) rail.style.transform = "scaleX(" + self.progress + ")"; }
        }
      });
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

    reels();
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
     9. REELS — nothing downloads until a clip is actually wanted
     ====================================================================== */
  function reels () {
    var list = $$(".reel");
    if (!list.length) return;

    function load (fig) {
      var v = $("video", fig);
      if (!v || v.dataset.loaded) return v;
      var webm = v.getAttribute("data-webm"), mp4 = v.getAttribute("data-src");
      /* VP9 first for the bandwidth, H.264 behind it for everything else */
      if (webm) v.appendChild(Object.assign(document.createElement("source"),
                                            { src: webm, type: "video/webm" }));
      if (mp4)  v.appendChild(Object.assign(document.createElement("source"),
                                            { src: mp4,  type: "video/mp4" }));
      v.dataset.loaded = "1";
      v.load();
      return v;
    }
    function play (fig) {
      var v = load(fig);
      if (!v) return;
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
      v.classList.add("on");
    }
    function stop (fig) {
      var v = $("video", fig);
      if (!v) return;
      v.pause();
      v.classList.remove("on");
    }

    if (touch) {
      /* on a phone, whichever reel is centred plays — one at a time */
      if (!("IntersectionObserver" in window)) return;
      var io = new IntersectionObserver(function (rows) {
        rows.forEach(function (r) { r.isIntersecting && r.intersectionRatio > .7 ? play(r.target) : stop(r.target); });
      }, { threshold: [0, .7, 1], rootMargin: "-15% 0px -15% 0px" });
      list.forEach(function (f) { io.observe(f); });
    } else {
      list.forEach(function (f) {
        f.addEventListener("pointerenter", function () { play(f); });
        f.addEventListener("pointerleave", function () { stop(f); });
        f.addEventListener("focusin", function () { play(f); });
        f.addEventListener("focusout", function () { stop(f); });
      });
      /* warm the posters' clips once the row is close, so hover is instant */
      if ("IntersectionObserver" in window) {
        var pre = new IntersectionObserver(function (rows) {
          rows.forEach(function (r) { if (r.isIntersecting) { load(r.target); pre.unobserve(r.target); } });
        }, { rootMargin: "300px" });
        list.forEach(function (f) { pre.observe(f); });
      }
    }
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
    renderReels();
    renderServices();
    renderBoxes();
    renderPricing();
    renderProcess();
    renderVoices();
    renderFeed();
    renderPolicy();
    renderForm();
    orderForm();

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

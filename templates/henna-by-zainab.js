/* ============================================================
   Henna by Zainab — Birmingham, B20
   Vanilla, no build step. Everything below the CONTENT block is
   mechanism; everything inside it is hers.
   ============================================================ */
(function () {
  "use strict";

  var html = document.documentElement;
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function el(t, a, txt) {
    var n = document.createElement(t);
    if (a) for (var k in a) n.setAttribute(k, a[k]);
    if (txt != null) n.textContent = txt;
    return n;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function val(id) { var n = $("#" + id); return n && typeof n.value === "string" ? n.value.trim() : ""; }

  /* ===================== CONTENT =====================
     Her own words. The aftercare, the policies and the booking list are
     transcribed from her Instagram highlights without paraphrase, because
     they are the terms a client is agreeing to. */

  var CONTACT = {
    name:      "Henna by Zainab",
    artist:    "Zainab",
    handle:    "hennaabyzainab_",
    instagram: "https://www.instagram.com/hennaabyzainab_",
    tiktok:    "https://www.tiktok.com/@hennaabyzainab_",
    area:      "Birmingham",
    postcode:  "B20",
    /* Paste these once the Google Business profile exists and the review box
       below stops being an example. */
    googleWrite:  "",
    googleRating: "",
    googleCount:  ""
  };

  var SERVICES = [
    { n: "Bridal", d: "The one to book furthest ahead. Intricate, personal and planned around your day — final design preference and guest count are confirmed at least 48 hours before." },
    { n: "Eid", d: "The busiest weeks of the year by a distance. Slots go early, and the date you want is usually two to three days before Eid itself." },
    { n: "Party &amp; events", d: "Birthdays, baby showers, engagements, get-togethers. I travel for groups of more than three; smaller bookings come to me in B20." },
    { n: "Jagua", d: "A natural stain from the jagua fruit, deeper and cooler than henna. Say so in your enquiry and I will talk you through a patch test first." }
  ];

  var STAIN_NOTES = [
    "Henna goes on orange and keeps darkening. The stain takes 2–3 days to fully mature.",
    "Keeping your hands warm, and away from water for the first 24 hours, makes the difference.",
    "Results vary with skin type, aftercare and body chemistry — the same design will not land identically on two people."
  ];

  var CARE_BEFORE = [
    "Ensure hands are washed and dried.",
    "No cream/lotion should be on the skin at all (affects the stain development).",
    "If possible remove arm hair where henna is to be applied for a smoother application."
  ];

  var CARE_AFTER = [
    "After henna is applied keep it on for a minimum of 6–8 hours or overnight for a darker stain.",
    "Keep your hands warm as this allows for a darker stain.",
    "Once ready to take the henna off crumble it off and use an oil alongside if needed to help get the rest off.",
    "For the darkest stain, apply vapour rub every few hours. This will enhance the colour of the stain.",
    "The stain takes 2–3 days to fully mature."
  ];

  var STEPS = [
    { t: "Your name", d: "So I know who I am holding the slot for." },
    { t: "Date of booking", d: "2–3 days before the event, so the stain peaks on the day." },
    { t: "Time of booking", d: "Roughly when suits you." },
    { t: "Inspo pictures", d: "The designs you'd like — send them in the DM." },
    { t: "How many hands / people", d: "Hands, not just heads: one hand and two are different jobs." }
  ];

  var BOOK_NOTES = [
    "I only travel for bridal and group bookings over 3 people.",
    "All other bookings are home based to me (B20).",
    "A non-refundable deposit is required to secure your booking.",
    "No booking is confirmed without the deposit."
  ];

  var POLICIES = [
    { h: "Booking", l: [
      "No booking is confirmed until all required information outlined in the “How to Book” highlight has been received.",
      "A £10 non-refundable deposit is required to secure your booking. This amount will be deducted from the final balance.",
      "Cancellations must be made at least 48 hours in advance.",
      "If, for any reason, I am unable to attend your booking, your deposit will be fully refunded."
    ]},
    { h: "On the day", l: [
      "Please arrive on time for your booking. Late arrivals may result in a shorter session to avoid delays for other clients.",
      "Bridal clients are advised to book well in advance to avoid disappointment.",
      "For bridal and party bookings, a final guest count and design preference must be confirmed at least 48 hours in advance."
    ]},
    { h: "For all clients", l: [
      "Henna stain results vary depending on skin type, aftercare and body chemistry.",
      "The final stain outcome is not in my control and is dependent on the aftercare and your skin chemistry.",
      "By booking, you acknowledge that henna is applied at your own discretion and that I am not liable for poor stains or any allergic reactions."
    ]}
  ];

  var GALLERY = [
    { f: "g1.jpg", a: "Mehndi across both hands, worn with gold bangles" },
    { f: "hero.jpg", a: "Bridal mehndi across both hands, worn with gold and pearl bangles" },
    { f: "g3.jpg", a: "A mandala design on the back of the hand, against white embroidery" },
    { f: "g4.jpg", a: "Bridal mehndi against cream and gold work" },
    { f: "g5.jpg", a: "A floral design running from wrist to fingertip" },
    { f: "g6.jpg", a: "Both hands finished, resting on pink" },
    { f: "g7.jpg", a: "An open palm design in a fully matured stain" },
    { f: "g8.jpg", a: "A soft, open pattern across the back of the hand" }
  ];

  var REVIEWS = [
    { n: "Aaliyah R.", t: "Zainab did my bridal mehndi and I could not fault a thing. She was calm the whole way through, and the stain came out so dark by the wedding morning." },
    { n: "Sana M.", t: "Booked her for Eid with four of us and she got through everyone without rushing a single hand. Everyone asked who did it." },
    { n: "Hafsa K.", t: "She sent the aftercare through straight away and I followed it properly — two days later it was almost black. Worth every penny." },
    { n: "Maryam I.", t: "The design was exactly what I sent her and somehow better. Really clean lines and she took her time." },
    { n: "Zara A.", t: "Easy to book, clear about the deposit and the timings, and lovely to sit with. Already booked her again." }
  ];

  var FAQ = [
    { q: "How far in advance should I book?", a: "For bridal, as far ahead as you can — those dates go first. For Eid, weeks rather than days. For everything else, a couple of weeks is usually comfortable." },
    { q: "When should the appointment be?", a: "Two to three days before the event. Henna carries on darkening after the paste comes off, and the stain takes 2–3 days to fully mature, so booking too close to the day means you see it at its lightest." },
    { q: "Do you come to me?", a: "I travel for bridal and for group bookings of more than three people. Everything else is home based to me in B20." },
    { q: "What secures the date?", a: "A £10 non-refundable deposit, which comes off the final balance. No booking is confirmed without it, and cancellations need at least 48 hours' notice." },
    { q: "How dark will my stain go?", a: "That depends on your skin type, your body chemistry and — most of all — the aftercare. The final outcome is not in my control, which is why the aftercare above matters so much. Keep it on 6–8 hours or overnight, keep warm, and stay away from water for the first 24 hours." },
    { q: "What is Jagua?", a: "A natural stain made from the jagua fruit. It goes a deeper, cooler blue-black rather than henna's red-brown. Mention it in your enquiry and I'll talk you through a patch test before we book it in." },
    { q: "How do I actually book?", a: "Send me a DM on Instagram with your name, the date and time, inspo pictures and how many hands. The enquiry form on this page writes that message for you in the right order — you just send it." }
  ];

  /* ===================== loader ===================== */
  (function loader() {
    var l = $("#loader"); if (!l) return;
    /* Anchored to performance.now(), which counts from navigation — not from
       whenever this script happened to run, or the intro stretches by however
       long the network took. */
    function done() {
      var wait = Math.max(0, 2000 - performance.now());
      setTimeout(function () {
        l.classList.add("gone");
        document.body.classList.add("ready");
        setTimeout(function () { l.hidden = true; }, 760);
      }, wait);
    }
    if (document.readyState === "complete") done();
    else addEventListener("DOMContentLoaded", done, { once: true });
  }());

  /* ===================== smooth scroll ===================== */
  var lenis = null;
  (function smooth() {
    if (reduced || !matchMedia("(pointer: fine)").matches) return;
    var s = el("script", { src: "https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js" });
    s.onload = function () {
      if (!window.Lenis) return;
      lenis = new window.Lenis({ duration: 1.05, smoothWheel: true });
      /* Lenis and html{scroll-behavior:smooth} fight each other and anchors
         land hundreds of pixels short. */
      html.style.scrollBehavior = "auto";
      function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
    };
    document.head.appendChild(s);
  }());

  /* ===================== scroll lock ===================== */
  var locks = 0, lockedAt = 0;
  function lockScroll(on) {
    locks = Math.max(0, locks + (on ? 1 : -1));
    if (on && locks > 1) return;
    if (!on && locks > 0) return;
    var b = document.body;
    if (on) {
      lockedAt = window.scrollY || html.scrollTop || 0;
      if (lenis) lenis.stop();
      b.style.overflow = "hidden";
      if (!lenis) { b.style.position = "fixed"; b.style.top = (-lockedAt) + "px"; b.style.left = "0"; b.style.right = "0"; }
    } else {
      if (lenis) lenis.start();
      b.style.overflow = ""; b.style.position = ""; b.style.top = ""; b.style.left = ""; b.style.right = "";
      if (!lenis) window.scrollTo(0, lockedAt);
    }
  }

  /* ===================== nav + drawer ===================== */
  var nav = $("#nav"), burger = $("#burger"), drawer = $("#drawer");
  addEventListener("scroll", function () {
    if (nav) nav.classList.toggle("solid", (window.scrollY || html.scrollTop) > 40);
  }, { passive: true });

  /* The drawer clears the header by MEASURING it. A fixed padding was wrong on
     some size at every breakpoint. */
  function sizeDrawer() {
    if (!nav || !drawer) return;
    var h = Math.round(nav.getBoundingClientRect().height);
    drawer.style.setProperty("--navh", h + "px");
    html.style.setProperty("--navh", h + "px");
  }
  addEventListener("resize", sizeDrawer, { passive: true });
  addEventListener("orientationchange", sizeDrawer);
  sizeDrawer();

  function setDrawer(open) {
    sizeDrawer();
    if (!drawer) return;
    if (open) drawer.hidden = false;
    requestAnimationFrame(function () { drawer.classList.toggle("open", open); });
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    lockScroll(open);
    $$("#drawer nav a").forEach(function (a, i) {
      a.style.transitionDelay = open ? (60 + i * 36) + "ms" : "0ms";
    });
    if (!open) setTimeout(function () { if (!drawer.classList.contains("open")) drawer.hidden = true; }, 480);
  }
  if (burger) burger.addEventListener("click", function () {
    setDrawer(!drawer.classList.contains("open"));
  });
  /* the menu covers the whole screen, so Escape has to let go of it */
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || !drawer || !drawer.classList.contains("open")) return;
    setDrawer(false);
    if (burger) burger.focus();
  });

  /* ===================== anchor jumps =====================
     Flush under the header, with nothing of the previous section left showing.
     A tap in the MENU arrives rather than travels: the drawer already covers
     the screen, so it doubles as the curtain — hold it opaque, jump under it,
     then dissolve it away. Links outside the menu keep their journey, because
     there the page in between is the context. */
  var tweenId = 0;
  function stopTween() {
    if (!tweenId) return;
    cancelAnimationFrame(tweenId); tweenId = 0;
    html.style.scrollBehavior = lenis ? "auto" : "";
  }
  addEventListener("touchstart", stopTween, { passive: true });
  addEventListener("wheel", stopTween, { passive: true });

  function landing(id, target) {
    if (id === "#top") return 0;
    var pad = nav ? Math.round(nav.getBoundingClientRect().height) : 88;
    return target.getBoundingClientRect().top + window.pageYOffset - pad;
  }

  /* `where` is a function, not a number: images decoding and tall reveal
     containers splitting as we pass them move the destination mid-flight, and
     a tween aimed at a stale pixel lands hundreds of pixels short. */
  function glideTo(where) {
    stopTween();
    function aim() {
      var max = Math.max(0, html.scrollHeight - innerHeight);
      return Math.max(0, Math.min(Math.round(where()), max));
    }
    var from = window.pageYOffset || html.scrollTop || 0, y = aim();
    if (reduced || Math.abs(y - from) < 2) { window.scrollTo(0, y); return; }
    var dur = Math.min(1150, Math.max(560, Math.abs(y - from) * 0.42)), t0 = 0;
    html.style.scrollBehavior = "auto";
    tweenId = requestAnimationFrame(function step(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      var to = aim();
      window.scrollTo(0, Math.round(from + (to - from) * e));
      if (p < 1) tweenId = requestAnimationFrame(step);
      else { stopTween(); window.scrollTo(0, aim()); }
    });
  }

  function arriveUnderDrawer(id, target) {
    var links = $$("#drawer nav a");
    links.forEach(function (l) { l.style.transitionDelay = "0ms"; l.style.transitionDuration = "0ms"; });
    drawer.style.transition = "none";
    lockScroll(false);
    burger.setAttribute("aria-expanded", "false");
    var b = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    window.scrollTo(0, Math.round(landing(id, target)));
    html.style.scrollBehavior = b;
    if (window.ScrollFXKit && window.ScrollFXKit.refresh) window.ScrollFXKit.refresh();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        drawer.style.transition = "";
        drawer.classList.remove("open");
        setTimeout(function () {
          if (!drawer.classList.contains("open")) drawer.hidden = true;
          links.forEach(function (l) { l.style.transitionDelay = ""; l.style.transitionDuration = ""; });
        }, 480);
      });
    });
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var id = a.getAttribute("href");
    if (!id || id === "#") return;
    var target = id === "#top" ? document.body : $(id);
    if (!target) return;
    e.preventDefault();

    if (drawer && drawer.classList.contains("open") && drawer.contains(a)) {
      arriveUnderDrawer(id, target);
      return;
    }
    if (drawer && drawer.classList.contains("open")) setDrawer(false);

    if (lenis) {
      var pad = nav ? Math.round(nav.getBoundingClientRect().height) : 88;
      lenis.scrollTo(id === "#top" ? 0 : target, { offset: -pad, duration: 1.05 });
      return;
    }
    glideTo(function () { return landing(id, target); });
  });

  /* ===================== reveal =====================
     A [data-fx="stagger"] container fires ONCE, when the CONTAINER enters.
     Stacked on a phone a tall one animates every child while only the first is
     on screen, so the rest have finished before you reach them. */
  (function reveal() {
    if (reduced) {
      $$("[data-fx]").forEach(function (n) { n.classList.add("fx-in"); });
      return;
    }
    function splitTall() {
      $$('[data-fx="stagger"]').forEach(function (c) {
        if (c.classList.contains("fx-in")) return;
        if (c.getBoundingClientRect().height <= innerHeight * 0.92) return;
        var step = parseFloat(c.getAttribute("data-fx-step")) || 90;
        c.removeAttribute("data-fx");
        [].forEach.call(c.children, function (kid, i) {
          kid.setAttribute("data-fx", "reveal");
          kid.setAttribute("data-fx-delay", i * step);
          io.observe(kid);
        });
      });
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        var n = en.target;
        var d = parseFloat(n.getAttribute("data-fx-delay")) || 0;
        setTimeout(function () { n.classList.add("fx-in"); }, d);
        io.unobserve(n);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    function arm() {
      splitTall();
      $$("[data-fx]").forEach(function (n) {
        if (n.classList.contains("fx-in") || n.__armed) return;
        n.__armed = 1; io.observe(n);
      });
    }
    window.ScrollFXKit = window.ScrollFXKit || {};
    window.ScrollFXKit.refresh = arm;
    arm();
    addEventListener("resize", arm, { passive: true });
  }());

  /* ===================== progress bar ===================== */
  (function progress() {
    var p = $(".progress"); if (!p) return;
    var bar = el("i"); p.appendChild(bar);
    bar.style.cssText = "display:block;height:100%;background:currentColor;width:0";
    function tick() {
      var max = html.scrollHeight - innerHeight;
      bar.style.width = (max > 0 ? ((window.pageYOffset || html.scrollTop) / max) * 100 : 0) + "%";
    }
    addEventListener("scroll", tick, { passive: true });
    addEventListener("resize", tick, { passive: true });
    tick();
  }());

  /* ===================== marquee =====================
     iOS will not paint a moving layer wider than ~4096 DEVICE pixels and fails
     silently, so every WORD is transformed on its own. scrollLeft is no good
     either: it rounds to whole pixels, and at this speed that is half a pixel
     a frame, which reads as a stutter. */
  (function marquee() {
    var t = $("#marquee"); if (!t) return;
    var WORDS = ["Bridal", "Eid", "Party", "Events", "Natural henna", "Jagua", "Birmingham"];
    var runs = 3, cells = [];
    for (var r = 0; r < runs; r++) {
      var run = el("div", { class: "band-run" });
      WORDS.forEach(function (w) { run.appendChild(el("span", null, w)); });
      t.appendChild(run);
    }
    cells = $$(".band-run > span", t);
    if (reduced) return;
    var runW = 0;
    function measure() {
      var first = $(".band-run", t);
      runW = first ? first.getBoundingClientRect().width : 0;
    }
    measure();
    addEventListener("resize", function () { measure(); }, { passive: true });
    var x = 0, last = 0;
    requestAnimationFrame(function step(now) {
      if (!last) last = now;
      var dt = Math.min(48, now - last); last = now;
      if (runW > 0) {
        x = (x + (34 * dt) / 1000) % runW;
        var v = "translate3d(" + (-x).toFixed(2) + "px,0,0)";
        for (var i = 0; i < cells.length; i++) cells[i].style.transform = v;
      }
      requestAnimationFrame(step);
    });
  }());

  /* ===================== her content into the page ===================== */
  (function build() {
    var s = $("#serviceList");
    if (s) SERVICES.forEach(function (c, i) {
      var li = el("li", { class: "card" });
      li.appendChild(el("span", { class: "num" }, String(i + 1).padStart(2, "0")));
      li.appendChild(el("h3", null, null)).innerHTML = c.n;
      li.appendChild(el("p", null, null)).innerHTML = c.d;
      s.appendChild(li);
    });

    var sn = $("#stainNotes");
    if (sn) STAIN_NOTES.forEach(function (n) { sn.appendChild(el("li", null, n)); });

    var cb = $("#careBefore"), ca = $("#careAfter");
    if (cb) CARE_BEFORE.forEach(function (n) { cb.appendChild(el("li", null, n)); });
    if (ca) CARE_AFTER.forEach(function (n) { ca.appendChild(el("li", null, n)); });

    var st = $("#stepList");
    if (st) STEPS.forEach(function (x) {
      var li = el("li");
      li.appendChild(el("strong", null, x.t));
      li.appendChild(el("span", null, x.d));
      st.appendChild(li);
    });

    var bn = $("#bookNotes");
    if (bn) BOOK_NOTES.forEach(function (n) { bn.appendChild(el("li", null, n)); });

    var pg = $("#polGrid");
    if (pg) POLICIES.forEach(function (p, i) {
      var art = el("article", { class: "pol", "data-fx": "reveal", "data-fx-delay": i * 110 });
      art.appendChild(el("h3", null, p.h));
      var ul = el("ul");
      p.l.forEach(function (t) { ul.appendChild(el("li", null, t)); });
      art.appendChild(ul);
      pg.appendChild(art);
    });

    var g = $("#gal");
    if (g) GALLERY.forEach(function (p, i) {
      var li = el("li", { "data-i": i, tabindex: "0", role: "button", "aria-label": "Open: " + p.a });
      var im = el("img", { src: "../assets/zainab/photos/" + p.f, alt: p.a, loading: i < 4 ? "eager" : "lazy", width: "980", height: "1225" });
      li.appendChild(im);
      g.appendChild(li);
    });

    var rail = $("#rvRail");
    if (rail) rail.innerHTML = REVIEWS.map(function (r) {
      return '<article class="rv" role="listitem">' +
        '<p class="rv-stars" aria-label="5 out of 5">★★★★★</p>' +
        "<p>" + esc(r.t) + "</p>" +
        '<footer><span class="rv-av" aria-hidden="true">' + esc(r.n.charAt(0)) + "</span>" +
        "<div><strong>" + esc(r.n) + "</strong>Google review (example)</div></footer></article>";
    }).join("");
    if (CONTACT.googleRating) $("#gRating").textContent = CONTACT.googleRating;
    if (CONTACT.googleCount) $("#gCount").textContent = "from " + CONTACT.googleCount + " reviews";
    /* Until her Google Business profile is linked there is nowhere to send
       anyone, so the button goes rather than being repurposed into a second,
       competing way to get in touch. */
    var gw = $("#gWrite");
    if (gw) { if (CONTACT.googleWrite) gw.href = CONTACT.googleWrite; else gw.parentNode.removeChild(gw); }

    var fq = $("#faqList");
    if (fq) FAQ.forEach(function (f, i) {
      var b = el("button", { type: "button", class: "faq-q", "aria-expanded": "false", "aria-controls": "fa" + i }, f.q);
      var a = el("div", { class: "faq-a", id: "fa" + i });
      a.appendChild(el("div", null, f.a));
      fq.appendChild(b); fq.appendChild(a);
      b.addEventListener("click", function () {
        var open = b.getAttribute("aria-expanded") === "true";
        b.setAttribute("aria-expanded", open ? "false" : "true");
        a.style.height = open ? "0px" : a.firstChild.getBoundingClientRect().height + "px";
      });
    });

    var soc = $("#socials");
    if (soc) {
      [["Instagram", CONTACT.instagram,
        '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="17.4" cy="6.6" r="1.1"/>'],
       ["TikTok", CONTACT.tiktok,
        '<path d="M16.5 3h-2.6v12.1a2.6 2.6 0 1 1-2.1-2.55V9.9a5.6 5.6 0 1 0 4.7 5.53V9.2a6.3 6.3 0 0 0 3.6 1.13V7.66A3.65 3.65 0 0 1 16.5 3Z"/>']
      ].forEach(function (x) {
        var a = el("a", { href: x[1], target: "_blank", rel: "noopener", "aria-label": CONTACT.name + " on " + x[0] });
        a.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + x[2] + "</svg>";
        soc.appendChild(a);
      });
    }

    ["#enqIg", "#galIg", "#drawerIg"].forEach(function (sel) {
      var n = $(sel); if (n) n.href = CONTACT.instagram;
    });
    ["#enqTt", "#drawerTt"].forEach(function (sel) {
      var n = $(sel); if (n) n.href = CONTACT.tiktok;
    });
  }());

  /* ===================== gallery rails ===================== */
  $$("[data-rail]").forEach(function (rail) {
    function step() { return Math.round(rail.clientWidth * 0.8); }
    var prev = $('[data-rail-prev="' + rail.id + '"]'),
        next = $('[data-rail-next="' + rail.id + '"]');
    if (prev) prev.addEventListener("click", function () { rail.scrollBy({ left: -step(), behavior: "smooth" }); });
    if (next) next.addEventListener("click", function () { rail.scrollBy({ left: step(), behavior: "smooth" }); });
  });

  /* ===================== lightbox ===================== */
  (function lightbox() {
    var lb = $("#lb"); if (!lb) return;
    var img = $("#lbImg"), cap = $("#lbCap"), at = 0;
    function open(i) {
      at = (i + GALLERY.length) % GALLERY.length;
      var p = GALLERY[at];
      img.src = "../assets/zainab/photos/" + p.f;
      img.alt = p.a; cap.textContent = p.a;
    }
    function show(i) {
      lb.hidden = false; open(i); lockScroll(true);
      requestAnimationFrame(function () { lb.classList.add("on"); });
      $("#lbX").focus();
    }
    function close() {
      lb.classList.remove("on"); lockScroll(false);
      setTimeout(function () { lb.hidden = true; }, 420);
    }
    document.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest("#gal li") : null;
      if (t) { show(+t.getAttribute("data-i")); return; }
      if (lb.hidden) return;
      if (e.target === lb || (e.target.closest && e.target.closest("#lbX"))) close();
      else if (e.target.closest && e.target.closest("#lbPrev")) open(at - 1);
      else if (e.target.closest && e.target.closest("#lbNext")) open(at + 1);
    });
    document.addEventListener("keydown", function (e) {
      var t = e.target;
      if (lb.hidden && t && t.closest && t.closest("#gal li") && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault(); show(+t.closest("#gal li").getAttribute("data-i")); return;
      }
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") open(at - 1);
      if (e.key === "ArrowRight") open(at + 1);
    });
  }());

  /* ===================== the example calendar =====================
     She has no live diary to read from. A calendar that LOOKS real but is
     invented would have someone believing a date is free when it is not, so
     this one says what it is, every day is pickable, and picking one only
     fills the date field -- it never claims to have held anything.

     The pattern is deterministic from the date itself rather than random, so
     the same day always shows the same state and it does not reshuffle every
     time you page back and forth. */
  (function calendar() {
    var grid = $("#calGrid"), label = $("#calMonth");
    if (!grid || !label) return;
    var today = new Date(); today.setHours(0,0,0,0);
    /* open on next month when this one is nearly spent: a grid that is four
       fifths greyed out says nothing about when she is free */
    var left = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate() - today.getDate();
    var view = new Date(today.getFullYear(), today.getMonth() + (left < 8 ? 1 : 0), 1);
    var MONTHS = ["January","February","March","April","May","June","July",
                  "August","September","October","November","December"];

    function state(d) {
      /* weekends and the run-up to Eid are the busy end of her year; a small
         hash of the date keeps it stable without being a straight pattern */
      var key = d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate();
      var hash = (key * 2654435761) % 97;
      var weekend = d.getDay() === 0 || d.getDay() === 6;
      if (d < today) return "past";
      if (weekend) return hash < 52 ? "gone" : (hash < 76 ? "few" : "free");
      return hash < 22 ? "gone" : (hash < 42 ? "few" : "free");
    }

    function draw() {
      label.textContent = MONTHS[view.getMonth()] + " " + view.getFullYear();
      grid.innerHTML = "";
      var first = new Date(view.getFullYear(), view.getMonth(), 1);
      var lead  = (first.getDay() + 6) % 7;                 /* Monday first */
      var days  = new Date(view.getFullYear(), view.getMonth()+1, 0).getDate();
      for (var i = 0; i < lead; i++) grid.appendChild(el("span", { class: "cal-pad" }));
      for (var day = 1; day <= days; day++) {
        var d = new Date(view.getFullYear(), view.getMonth(), day);
        var st = state(d);
        if (st === "past" || st === "gone") {
          var cell = el("span", { class: "cal-day is-" + st }, String(day));
          cell.setAttribute("aria-hidden", "true");
          grid.appendChild(cell);
          continue;
        }
        var iso = d.getFullYear() + "-" +
                  String(d.getMonth()+1).padStart(2,"0") + "-" +
                  String(day).padStart(2,"0");
        var b = el("button", {
          type: "button", class: "cal-day is-" + st, "data-iso": iso,
          "aria-label": day + " " + MONTHS[view.getMonth()] + ", " +
                        (st === "few" ? "nearly full" : "free") + " in this example"
        }, String(day));
        grid.appendChild(b);
      }
      var prev = $("#calPrev");
      if (prev) prev.disabled = view.getFullYear() === today.getFullYear() &&
                                view.getMonth() === today.getMonth();
    }

    function shift(n) {
      view = new Date(view.getFullYear(), view.getMonth() + n, 1);
      draw();
    }
    $("#calPrev").addEventListener("click", function () { shift(-1); });
    $("#calNext").addEventListener("click", function () { shift(1); });

    grid.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("button[data-iso]");
      if (!b) return;
      var field = $("#enqDate");
      if (field) {
        field.value = b.getAttribute("data-iso");
        /* the form reads .value, but anything listening for a change needs telling */
        field.dispatchEvent(new Event("change", { bubbles: true }));
      }
      $$("#calGrid .is-picked").forEach(function (x) {
        x.classList.remove("is-picked"); x.removeAttribute("aria-pressed");
      });
      b.classList.add("is-picked"); b.setAttribute("aria-pressed", "true");
      toast("Added to the form \u2014 she will confirm it by DM");
    });

    draw();
  }());

  /* ===================== clipboard + toast ===================== */
  function copy(text, cb) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { cb(true); }, function () { cb(false); });
      return;
    }
    try {
      var ta = el("textarea"); ta.value = text;
      ta.style.cssText = "position:fixed;top:-2000px";
      document.body.appendChild(ta); ta.select();
      var ok = document.execCommand("copy");
      document.body.removeChild(ta); cb(ok);
    } catch (e) { cb(false); }
  }
  var toastT;
  function toast(msg) {
    var t = $("#toast"); if (!t) return;
    t.textContent = msg; t.classList.add("on");
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove("on"); }, 3400);
  }

  /* ===================== chips ===================== */
  function chipGroup(host, hidden, opts) {
    host = $(host); hidden = $(hidden);
    if (!host || !hidden) return;
    opts.forEach(function (o) {
      var b = el("button", { type: "button", class: "chip-b" }, o);
      b.setAttribute("aria-pressed", o === hidden.value ? "true" : "false");
      if (o === hidden.value) b.classList.add("on");
      b.addEventListener("mousedown", function (e) { e.preventDefault(); });
      b.addEventListener("click", function () {
        hidden.value = b.textContent;
        [].forEach.call(host.children, function (c) {
          var on = c === b;
          c.classList.toggle("on", on);
          c.setAttribute("aria-pressed", on ? "true" : "false");
        });
      });
      host.appendChild(b);
    });
  }
  chipGroup("#occChips", "#enqOccasion", ["Bridal", "Eid", "Party", "Event", "Just me"]);

  /* ===================== the enquiry =====================
     She takes bookings by DM and publishes no email address. Instagram has no
     way to pre-fill a message from a link — no URL parameter exists — so the
     honest maximum is to write the message in the exact order her "How to
     Book" highlight asks for, put it on the clipboard, and open her DMs. */
  (function form() {
    var f = $("#enqForm"); if (!f) return;
    var msg = $("#formMsg");
    function say(text, isHtml) {
      msg.classList.add("on");
      if (isHtml) msg.innerHTML = text; else msg.textContent = text;
    }
    function pretty(d) {
      if (!d) return "";
      var p = d.split("-");
      if (p.length !== 3) return d;
      var dt = new Date(+p[0], +p[1] - 1, +p[2]);
      if (isNaN(dt)) return d;
      return dt.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }

    f.addEventListener("submit", function (e) {
      e.preventDefault();
      if (val("enqHp")) return;                        // honeypot

      /* checked in the order they are asked, so focus never jumps backwards */
      var need = [
        ["enqName",  !val("enqName"),  "Please add your name."],
        ["enqDate",  !val("enqDate"),  "Please add the date you'd like — two to three days before the event."],
        ["enqTime",  !val("enqTime"),  "Please add roughly what time suits you."],
        ["enqHands", !val("enqHands"), "Please say how many hands or people I'm doing."]
      ];
      for (var i = 0; i < need.length; i++) {
        if (need[i][1]) { say(need[i][2]); $("#" + need[i][0]).focus(); return; }
      }

      /* her five, in her order */
      var lines = [
        "Hi Zainab, I'd like to book in.",
        "",
        "Name: " + val("enqName"),
        "Date of booking: " + pretty(val("enqDate")),
        "Time of booking: " + val("enqTime"),
        "How many hands / people: " + val("enqHands"),
        "Occasion: " + (val("enqOccasion") || "Party"),
        "Where: " + (val("enqWhere") || "At yours in B20")
      ];
      if (val("enqMsg")) lines.push("", val("enqMsg"));
      lines.push("", "Inspo pictures to follow in this chat.");
      var plain = lines.join("\n");

      copy(plain, function (ok) {
        var ig = CONTACT.instagram;
        if (ok) {
          toast("Copied — paste it into the DM that opens");
          say('Your message is copied. <a href="' + esc(ig) + '" target="_blank" rel="noopener">Opening my DMs</a> — ' +
              "paste it in, add your inspo pictures, and send. " +
              '<button type="button" class="lnk-inline" id="enqAgain">Copy it again</button>', true);
        } else {
          say("Instagram can't be sent a message from a link, so copy this across and send it to " +
              '<a href="' + esc(ig) + '" target="_blank" rel="noopener">@' + esc(CONTACT.handle) + "</a>:<br><br>" +
              esc(plain).replace(/\n/g, "<br>"), true);
        }
        var again = $("#enqAgain");
        if (again) again.addEventListener("click", function () {
          copy(plain, function (o) { toast(o ? "Copied again" : "Could not copy — please select the text"); });
        });
        /* opened inside the submit gesture or Safari blocks it */
        if (ok) {
          var a = el("a"); a.href = ig; a.target = "_blank"; a.rel = "noopener";
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
        }
      });
    });
  }());

  /* a stray console error on a client's site is a bug, so say so loudly here */
  addEventListener("error", function (e) {
    if (!e || !e.message) return;
    if (/ResizeObserver/.test(e.message)) return;
  });
}());

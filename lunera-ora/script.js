/* ═══════════════════════════════════════════════════════════════════════════
   LUNERA ORA · MOBILE SMILE STUDIO — page behaviour
   Everything she may want changed lives in CONFIG / SERVICES / REVIEWS below.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ───────────────────────── her details ───────────────────────── */
  var CONFIG = {
    // Her Square booking site (decoded from the QR code in her "Booking" story).
    // The site's booking API (worker/lunera/booking.js): free times, bookings
    // and deposits go through it to her Square, with her token.
    api: "/api/lunera",
    // Her Square booking page — for reference; the site never sends customers there.
    booking: "https://book.squareup.com/appointments/ya807bsxg2r71v/location/L8EH27QVVN1GN/services",
    // While true, the "Book" buttons open the launch-promo service in Square and
    // the cards show launch prices. Set false when the first 10 spots are gone.
    launchPromo: true,
    phone: "+16479835983",
    phoneLabel: "(647) 983-5983",
    email: "lunera.mobilestudio@gmail.com",
    instagram: "https://www.instagram.com/luneraora.mobilestudio/",
    instagramDM: "https://ig.me/m/luneraora.mobilestudio",
    founderInstagram: "https://www.instagram.com/luneraora.mobilestudio/",
    // Paste a Web3Forms access key to have enquiries emailed straight to her.
    // Until then the enquiry is handed back as a ready-written text / email / DM.
    web3formsKey: "",
    google: {
      reviewUrl: "",   // her "Ask for reviews" link from Google Business Profile
      profileUrl: "",  // her Google Maps listing
      rating: null,    // e.g. 5.0 once reviews exist
      count: null
    },
    base: { name: "Beaumont", lat: 53.3572, lng: -113.4147 },
    roadFactor: 1.35  // straight-line km × this ≈ km by road around Edmonton’s grid
  };

  // Her services on Square (ids read from her booking page). `launchIds` are the
  // "Launch promo-" versions, used while CONFIG.launchPromo is true.
  var SERVICES = {
    aura:     { name: "The Aura", tag: "The subtle refresh", time: "1 hr", mins: 60, price: 149, launchPrice: 119, img: "lips-aura",
                ids: { service: "36FBOJEGYBT62O2QGPZKSBAI", variation: "TF2UNCPOH3I4OZFO7HKX3NY7" },
                launchIds: { service: "FOABZNCYESK4TVSB7MRHTB4S", variation: "B2PUH46HJKJI7QHS7RTG2Z2D" } },
    radiance: { name: "The Radiance", tag: "The signature experience", time: "1 hr", mins: 60, price: 179, launchPrice: 139, img: "lips-radiance",
                ids: { service: "OQ5Y7FBISU2SIDVJEW2JFAMF", variation: "KH6OBDR37HWXJ7QKQ6K6LWW3" },
                launchIds: { service: "NEZSBKHLOYX565LJMZG6ILSW", variation: "TCSCFBWSGXDH6SXEKYURNH2C" } },
    lumina:   { name: "The Lumina", tag: "The ultimate experience", time: "1 hr 30 min + follow-up", mins: 90, price: 249, launchPrice: 199, img: "lips-lumina",
                ids: { service: "4VMQHVFHAHWQLKIMGJQL5HGK", variation: "D6QW4UIBB5OJXPSEAMCCZYFV" },
                launchIds: { service: "TAMV25J24HFGHYYIWWEQ2JGB", variation: "EFNBDZQST6J2WJOL5U7STXPY" } },
    bridal:   { name: "Bride & Bridesmaids", tag: "For the bridal party", time: "1 hr", mins: 60, price: 159,
                ids: { service: "UW4YFXE73MMCSJGVHOTRJO7E", variation: "AIEJXQEJUKTEUSZRXENUEOTV" } }
  };
  function svcIds(key) { var s = SERVICES[key]; return (CONFIG.launchPromo && s.launchIds) || s.ids; }
  function svcPrice(key) { var s = SERVICES[key]; return (CONFIG.launchPromo && s.launchPrice) || s.price; }

  // Booking hours from her Square page, minutes after midnight (Mountain Time).
  var HOURS = { 0: [540, 1200], 1: [540, 1200], 2: [1110, 1260], 3: [1110, 1260], 4: [1110, 1260], 5: [1050, 1260], 6: [540, 1200] };

  // Areas for the travel estimate. Coordinates are public town / neighbourhood centres.
  var TOWNS = [
    { id: "beaumont", name: "Beaumont", short: "", lat: 53.3572, lng: -113.4147 },
    { id: "leduc", lab: "s", name: "Leduc", short: "Leduc", lat: 53.2594, lng: -113.5492 },
    { id: "nisku", lab: "w", name: "Nisku", short: "Nisku", lat: 53.3370, lng: -113.5300 },
    { id: "millwoods", lab: "e", name: "Edmonton · Mill Woods", short: "Mill Woods", lat: 53.4550, lng: -113.4200 },
    { id: "downtown", lab: "e", name: "Edmonton · Downtown", short: "Downtown", lat: 53.5461, lng: -113.4938 },
    { id: "windermere", lab: "w", name: "Edmonton · Windermere", short: "Windermere", lat: 53.4380, lng: -113.6080 },
    { id: "west", lab: "w", name: "Edmonton · West End", short: "West End", lat: 53.5225, lng: -113.6242 },
    { id: "north", lab: "n", name: "Edmonton · North", short: "North Edm.", lat: 53.6000, lng: -113.4900 },
    { id: "sherwood", lab: "e", name: "Sherwood Park", short: "Sherwood Pk", lat: 53.5413, lng: -113.2958 },
    { id: "stalbert", lab: "w", name: "St. Albert", short: "St. Albert", lat: 53.6305, lng: -113.6256 },
    { id: "devon", lab: "s", name: "Devon", short: "Devon", lat: 53.3636, lng: -113.7322 },
    { id: "calmar", lab: "w", name: "Calmar", short: "Calmar", lat: 53.2610, lng: -113.8130 },
    { id: "sarepta", lab: "e", name: "New Sarepta", short: "New Sarepta", lat: 53.2667, lng: -113.1500 },
    { id: "millet", lab: "s", name: "Millet", short: "Millet", lat: 53.0970, lng: -113.4730 },
    { id: "fortsask", lab: "e", name: "Fort Saskatchewan", short: "Fort Sask.", lat: 53.7128, lng: -113.2133 },
    { id: "sprucegrove", lab: "w", name: "Spruce Grove", short: "Spruce Grove", lat: 53.5450, lng: -113.9008 }
  ];

  // Her travel fee tiers (from her "Pricing & Details" story).
  var TIERS = [
    { max: 10, fee: "Complimentary" },
    { max: 20, fee: "$10" },
    { max: 30, fee: "$15" },
    { max: 40, fee: "$20" },
    { max: 50, fee: "$30" },
    { max: Infinity, fee: "Please inquire" }
  ];

  // Lunera Ora opened on 1 October 2026 and has no Google reviews yet. While
  // `sample` is true every card carries an "Example" chip and the section says
  // so — a made-up review presented as a real one is a lie told on her behalf.
  // Set sample:false and replace `items` with her real reviews when they exist.
  var REVIEWS = {
    sample: true,
    items: [
      { name: "Danielle R.", area: "Beaumont", service: "The Radiance", text: "Ysabel set up right in my living room and talked me through every step. Calm, professional and so personal — and my smile was visibly brighter by the end." },
      { name: "Priya S.", area: "Leduc", service: "The Aura", text: "I have sensitive teeth so I was nervous. The sensitivity screening and Ysabel’s aftercare tips made it completely stress-free. Already planning my next visit." },
      { name: "Megan T.", area: "Edmonton", service: "The Lumina", text: "Booked The Lumina before my sister’s wedding. Both appointments were at home, and the difference in photos was honestly amazing." },
      { name: "Alyssa K.", area: "Edmonton", service: "Bride & Bridesmaids", text: "We did the bridal party the morning of my bachelorette — such a fun, glowy way to start the weekend. Everyone loved it!" },
      { name: "Jasmine L.", area: "Beaumont", service: "The Aura", text: "No waiting room, no driving across town. Ysabel came to me after work and it felt like a little spa evening at home." }
    ]
  };

  /* ───────────────────────── helpers ───────────────────────── */
  var doc = document, root = doc.documentElement;
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function hdrH() { return $("[data-hdr]").offsetHeight || 76; }
  function store(get, k, v) { try { return get ? sessionStorage.getItem(k) : sessionStorage.setItem(k, v); } catch (e) { return null; } }

  var toastT;
  function toast(msg) {
    var t = $("[data-toast]"); if (!t) return;
    t.textContent = msg; t.classList.add("is-on");
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("is-on"); }, 3200);
  }

  /* ───────────────────────── links ───────────────────────── */
  // Every "Book" button leads to the booking calendar on this page — customers
  // book and pay the deposit here, never on Square's own pages.
  // On the booking page they jump to the calendar; elsewhere they open the
  // booking page with that experience already chosen.
  var ON_BOOK = !!$("[data-cal]");
  $$("[data-book]").forEach(function (a) {
    var k = a.getAttribute("data-book");
    a.setAttribute("href", ON_BOOK ? "#reserve" : "/lunera-ora/book" + (k ? "?exp=" + k : "") + "#reserve");
    a.removeAttribute("target"); a.removeAttribute("rel");
  });
  $$("[data-sms]").forEach(function (a) { a.href = "sms:" + CONFIG.phone; });
  $$("[data-tel]").forEach(function (a) { a.href = "tel:" + CONFIG.phone; });
  $$("[data-mail]").forEach(function (a) { a.href = "mailto:" + CONFIG.email; });
  $$("[data-ig]").forEach(function (a) { a.href = CONFIG.instagram; });
  $$("[data-founder-ig]").forEach(function (a) { a.href = CONFIG.founderInstagram; });
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // prices follow the promo switch
  $$("[data-exp]").forEach(function (card) {
    var s = SERVICES[card.getAttribute("data-exp")]; if (!s || !s.launchPrice) return;
    var now = $("[data-price-now]", card), was = $("[data-price-was]", card);
    if (CONFIG.launchPromo) { now.textContent = "$" + s.launchPrice; was.textContent = "Reg. $" + s.price; }
    else { now.textContent = "$" + s.price; was.textContent = ""; }
  });
  if (!CONFIG.launchPromo) {
    $$("[data-launch-only]").forEach(function (el) { el.hidden = true; });
    var pill = $("[data-promo-pill] span:nth-child(2)");
    if (pill) pill.innerHTML = "<b>Refer 5 friends</b> · get a free whitening";
  }

  /* ───────────────────────── opening veil ───────────────────────── */
  var veil = $("[data-veil]");
  function ready() {
    if (root.classList.contains("is-ready")) return;
    if (veil) veil.classList.add("is-gone");
    root.classList.add("is-ready");
    store(false, "lo-veil", "1");
  }
  if (veil) {
    if (reduce) { veil.remove(); ready(); }
    else {
      var seen = store(true, "lo-veil");
      if (seen) veil.classList.add("is-quick");
      var minT = seen ? 550 : 1750, t0 = performance.now();
      var go = function () { setTimeout(ready, Math.max(0, minT - (performance.now() - t0))); };
      (doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve()).then(go, go);
      setTimeout(ready, 3600);
      veil.addEventListener("click", ready);
    }
  } else ready();

  /* ───────────────────────── smooth scroll ───────────────────────── */
  var lenis = null;
  if (window.Lenis && fine && !reduce) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 1 });
    if (hasGSAP) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    }
  }

  function jumpVeil() { return $(".jump-veil") || doc.body.appendChild(Object.assign(doc.createElement("div"), { className: "jump-veil" })); }
  function goTo(target, fade) {
    var el = typeof target === "string" ? $(target) : target;
    if (!el) return;
    var off = -hdrH() - 8;
    if (el.id === "top" && !fade) { if (lenis) lenis.scrollTo(0, { duration: 1.6 }); else window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); return; }
    // An absolute target from the page's layout: Lenis's own idea of the scroll
    // position goes stale after a jump it didn't make (find-in-page, a focus),
    // and a box still mid fade-up would be measured 30px low.
    var y = 0, n = el;
    while (n) { y += n.offsetTop; n = n.offsetParent; }
    y += off;
    // A far jump fades through a veil instead of scrolling past everything.
    if (fade && !reduce) {
      var v = jumpVeil();
      v.classList.add("is-on");
      setTimeout(function () {
        if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo({ top: y, behavior: "instant" });
        if (hasGSAP) ScrollTrigger.update();
        requestAnimationFrame(function () { requestAnimationFrame(function () { v.classList.remove("is-on"); }); });
      }, 400);
      return;
    }
    if (lenis) lenis.scrollTo(y, { duration: 1.6, easing: function (x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; } });
    else window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
  }
  // links between her pages fade out, and the new page fades in
  (function () {
    if (reduce) return;
    var v = jumpVeil(); v.classList.add("is-on", "is-instant");
    requestAnimationFrame(function () { requestAnimationFrame(function () { v.classList.remove("is-instant", "is-on"); }); });
    window.addEventListener("pageshow", function (e) { if (e.persisted) v.classList.remove("is-on"); });
  })();
  doc.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="/lunera-ora"]');
    if (!a || reduce || e.metaKey || e.ctrlKey || e.shiftKey || a.target === "_blank") return;
    var u = new URL(a.href, location.href);
    if (u.pathname.replace(/\.html$/, "") === location.pathname.replace(/\.html$/, "") && u.hash) return;
    e.preventDefault();
    closeDrawer();
    jumpVeil().classList.add("is-on");
    setTimeout(function () { location.href = u.href; }, 380);
  });
  doc.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href");
    if (id.length < 2 || !$(id)) return;
    e.preventDefault();
    closeDrawer();
    var topic = a.getAttribute("data-enquire");
    if (topic) setTopic(topic);
    if (a.hasAttribute("data-book") && cal) cal.choose(a.getAttribute("data-book"));
    goTo(id, true);
    if (history.replaceState) history.replaceState(null, "", id);
  });

  /* ───────────────────────── header, rail, dock ───────────────────────── */
  var hdr = $("[data-hdr]"), rail = $("[data-rail]"), dock = $("[data-dock]");
  function onScroll() {
    var y = window.scrollY, vh = window.innerHeight;
    hdr.classList.toggle("is-solid", y > vh * 0.55 || root.classList.contains("drawer-open"));
    if (rail) rail.classList.toggle("is-on", y > vh * 0.7);
    if (dock) dock.classList.toggle("is-on", y > vh * 0.75);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // shade-guide tabs: darker (before) at the top, pearl at the bottom
  if (rail) {
    var tabs = $$("a", rail), A = [229, 201, 146], B = [253, 250, 244];
    tabs.forEach(function (a, i) {
      var k = i / (tabs.length - 1), c = A.map(function (v, j) { return Math.round(v + (B[j] - v) * k); });
      a.querySelector("i").style.setProperty("--tab", "rgb(" + c.join(",") + ")");
    });
  }
  // which section is in view → rail + header nav
  var navMap = {};
  $$(".hdr-nav a").forEach(function (a) { navMap[a.getAttribute("href").slice(1)] = a; });
  if ("IntersectionObserver" in window) {
    var secIO = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.id;
        if (rail) $$("a", rail).forEach(function (a) { a.classList.toggle("is-on", a.getAttribute("data-sec") === id); });
        Object.keys(navMap).forEach(function (k) { navMap[k].classList.toggle("is-on", k === id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("main section[id]").forEach(function (s) { secIO.observe(s); });
  }

  /* ───────────────────────── drawer ───────────────────────── */
  var drawer = $("[data-drawer]"), burger = $("[data-burger]");
  function openDrawer() {
    drawer.hidden = false;
    requestAnimationFrame(function () { requestAnimationFrame(function () { drawer.classList.add("is-open"); }); });
    burger.setAttribute("aria-expanded", "true"); burger.setAttribute("aria-label", "Close menu");
    root.classList.add("drawer-open"); onScroll();
    if (lenis) lenis.stop(); else doc.body.style.overflow = "hidden";
    setTimeout(function () { var f = $("a", drawer); if (f) f.focus({ preventScroll: true }); }, 300);
  }
  function closeDrawer() {
    if (!drawer || drawer.hidden) return;
    drawer.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false"); burger.setAttribute("aria-label", "Open menu");
    root.classList.remove("drawer-open"); onScroll();
    if (lenis) lenis.start(); else doc.body.style.overflow = "";
    setTimeout(function () { if (!drawer.classList.contains("is-open")) drawer.hidden = true; }, 800);
  }
  if (burger) burger.addEventListener("click", function () { drawer.hidden || !drawer.classList.contains("is-open") ? openDrawer() : closeDrawer(); });
  doc.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });

  /* ───────────────────────── text splitting ───────────────────────── */
  function splitWords(el, cls, inner) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var frag = doc.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(doc.createTextNode(" ")); return; }
            var w = doc.createElement("span"); w.className = cls;
            if (inner) { var s = doc.createElement("span"); s.textContent = part; s.style.setProperty("--i", i); w.appendChild(s); }
            else w.textContent = part;
            i++; frag.appendChild(w);
          });
          node.replaceChild(frag, c);
        } else if (c.nodeType === 1) walk(c);
      });
    })(el);
    return i;
  }
  $$("[data-split]").forEach(function (el) { splitWords(el, "w", true); el.classList.add("split"); el.setAttribute("data-reveal-split", ""); });
  $$("[data-words]").forEach(function (el) { splitWords(el, "wd", false); });

  /* ───────────────────────── ritual (sideways pin) — pins first ───────────────────────── */
  var ritual = $("[data-ritual]"), track = $("[data-ritual-track]"), rbar = $("[data-ritual-bar]");
  var wide = matchMedia("(min-width: 961px)");
  if (!wide.matches || reduce || !hasGSAP) $$(".r-panel").forEach(function (p) { p.setAttribute("data-reveal", ""); });
  if (hasGSAP && !reduce && ritual && track) {
    var mm = gsap.matchMedia();
    mm.add("(min-width: 961px)", function () {
      var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
      var tween = gsap.to(track, {
        x: function () { return -dist(); }, ease: "none",
        scrollTrigger: {
          trigger: ritual, start: "top top", end: function () { return "+=" + dist(); },
          pin: true, scrub: 0.9, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: function (self) { if (rbar) rbar.style.transform = "scaleX(" + self.progress.toFixed(4) + ")"; }
        }
      });
      $$(".r-panel", track).forEach(function (p) {
        var art = $(".r-art", p), copy = $(".r-copy", p) || p;
        if (art) gsap.fromTo(art, { scale: 0.86, rotate: -2, opacity: 0.35 }, { scale: 1, rotate: 0, opacity: 1, ease: "none", scrollTrigger: { trigger: p, containerAnimation: tween, start: "left 95%", end: "left 45%", scrub: true } });
        var img = art && $("img", art);
        if (img) gsap.fromTo(img, { xPercent: -6, scale: 1.16 }, { xPercent: 6, scale: 1.16, ease: "none", scrollTrigger: { trigger: p, containerAnimation: tween, start: "left right", end: "right left", scrub: true } });
        var last = p.classList.contains("r-outro");
        gsap.fromTo(copy, { x: 80, opacity: 0 }, { x: 0, opacity: 1, ease: "none", scrollTrigger: { trigger: p, containerAnimation: tween, start: last ? "left 100%" : "left 85%", end: last ? "left 62%" : "left 35%", scrub: true } });
      });
      return function () { if (rbar) rbar.style.transform = ""; };
    });
  }

  /* ───────────────────────── reveals ───────────────────────── */
  // stagger siblings
  $$("[data-reveal]").forEach(function (el) {
    var sibs = Array.prototype.filter.call(el.parentElement.children, function (c) { return c.hasAttribute("data-reveal") && c.getAttribute("data-reveal") !== "mask"; });
    var i = sibs.indexOf(el);
    if (i > 0 && sibs.length > 1) el.style.setProperty("--d", Math.min(i, 6) * 0.08 + "s");
  });
  var revealEls = $$("[data-reveal], [data-reveal-split], [data-insta], [data-shade-scale]");
  $$("[data-insta] a").forEach(function (a, i) { a.style.setProperty("--i", i); a.style.setProperty("--rot", (i % 2 ? 2 : -2) + "deg"); });
  if ("IntersectionObserver" in window && !reduce) {
    // A fully clipped element never "intersects" in Chrome, so the curtain
    // reveals ([data-reveal="mask"]) are watched through their parent.
    var watch = new Map();
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        (watch.get(en.target) || []).forEach(function (el) { el.classList.add("in"); });
        rio.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach(function (el) {
      var t = el.getAttribute("data-reveal") === "mask" ? el.parentElement : el;
      if (!watch.has(t)) watch.set(t, []);
      watch.get(t).push(el);
      rio.observe(t);
    });
  } else revealEls.forEach(function (el) { el.classList.add("in"); });
  // the promo rings draw when their card reveals
  // (the .in on .promo comes from data-reveal)

  /* ───────────────────────── scrubbed bits ───────────────────────── */
  if (hasGSAP && !reduce) {
    // words light up as the story title passes
    $$("[data-words]").forEach(function (el) {
      var words = $$(".wd", el);
      ScrollTrigger.create({
        trigger: el, start: "top 82%", end: "bottom 42%", scrub: true,
        onUpdate: function (self) {
          var n = Math.round(self.progress * words.length);
          words.forEach(function (w, i) { w.classList.toggle("lit", i < n); });
        }
      });
    });
    // parallax photographs
    $$("[data-parallax]").forEach(function (img) {
      var f = parseFloat(img.getAttribute("data-parallax")) || -0.08;
      img.style.transition = "none";
      gsap.fromTo(img, { yPercent: -f * 60, scale: 1.18 }, { yPercent: f * 60, scale: 1.18, ease: "none", scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
    });
    // hero drifts and softens as you leave it
    var heroIn = $("[data-hero]");
    if (heroIn) gsap.to(heroIn, { yPercent: 14, opacity: 0.15, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    // booking steps fill as you read them
    var steps = $("[data-steps]");
    if (steps) {
      var lis = $$("li", steps);
      ScrollTrigger.create({
        trigger: steps, start: "top 68%", end: "bottom 62%", scrub: true,
        onUpdate: function (self) {
          steps.style.setProperty("--p", self.progress.toFixed(3));
          var n = Math.ceil(self.progress * lis.length - 0.001);
          lis.forEach(function (li, i) { li.classList.toggle("is-lit", i < Math.max(1, n)); });
        }
      });
    }
    // the header turns espresso while it sits over the dark ritual and footer
    // (the wrapper, not the pinned section: its height includes the whole sideways run)
    ["[data-ritual-wrap]", ".foot"].forEach(function (sel) {
      var el = $(sel); if (!el) return;
      ScrollTrigger.create({ trigger: el, start: function () { return "top " + hdrH(); }, end: function () { return "bottom " + hdrH(); }, toggleClass: { targets: hdr, className: "is-dark" } });
    });
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  } else {
    $$("[data-words] .wd").forEach(function (w) { w.classList.add("lit"); });
    var st = $("[data-steps]"); if (st) { st.style.setProperty("--p", 1); $$("li", st).forEach(function (li) { li.classList.add("is-lit"); }); }
  }

  /* ───────────────────────── ribbon ─────────────────────────
     Each phrase and sparkle is its own small layer, moved with a sub-pixel
     transform and wrapped round when it leaves on the left. Nothing wide ever
     moves (iOS won't paint a moving layer much wider than ~4096 device px),
     and nothing snaps to whole pixels — that was the jitter of scrollLeft. */
  var ribbon = $("[data-ribbon]");
  if (ribbon) {
    var proto = Array.prototype.slice.call(ribbon.children), items = [], total = 0, GAP = 34;
    var build = function () {
      ribbon.innerHTML = ""; items = []; total = 0;
      var need = window.innerWidth + 400;
      do {
        proto.forEach(function (n) { var c = n.cloneNode(true); c.classList.add("rb-i"); ribbon.appendChild(c); items.push({ el: c, x: 0, w: 0 }); });
      } while (items.length < proto.length * 8 && (function () { var w = 0; items.forEach(function (it) { w += it.el.getBoundingClientRect().width + GAP; }); return w < need * 1.2; })());
      items.forEach(function (it) { it.w = it.el.getBoundingClientRect().width; it.x = total; total += it.w + GAP; });
    };
    ribbon.classList.add("is-live");
    build();
    var rw = window.innerWidth;
    window.addEventListener("resize", function () { if (window.innerWidth !== rw) { rw = window.innerWidth; build(); } });
    var ribbonAt = function (off) {
      for (var i = 0; i < items.length; i++) {
        var it = items[i], x = ((it.x - off) % total + total) % total;
        if (x > total - it.w - GAP) x -= total;          // wrap smoothly off the left edge
        it.el.style.transform = "translate3d(" + x.toFixed(2) + "px,-50%,0)";
      }
    };
    ribbonAt(0);
    if (!reduce) {
      var rOn = true, rLast = performance.now(), off = 0;
      if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { rOn = es[0].isIntersecting; }).observe(ribbon);
      (function tick(t) {
        var dt = Math.min(50, t - rLast); rLast = t;
        if (rOn) { off += 42 * dt / 1000; ribbonAt(off); }
        requestAnimationFrame(tick);
      })(rLast);
    }
  }

  /* ───────────────────────── experiences: tilt + finder ───────────────────────── */
  if (fine && !reduce) {
    $$(".exp").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.setProperty("--ry", ((x - 0.5) * 7).toFixed(2) + "deg");
        card.style.setProperty("--rx", ((0.5 - y) * 6).toFixed(2) + "deg");
        card.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
        card.style.setProperty("--my", (y * 100).toFixed(1) + "%");
      });
      card.addEventListener("pointerleave", function () { card.style.setProperty("--rx", "0deg"); card.style.setProperty("--ry", "0deg"); });
    });
  }
  var finder = $("[data-finder]"), grid = $("[data-exp-grid]"), note = $("[data-finder-note]");
  var NOTE0 = note ? note.textContent : "";
  var PICK_NOTE = {
    aura: "The Aura suits mild staining — a gentle refresh, or maintaining results you already love.",
    radiance: "The Radiance suits mild to moderate staining — our signature, visibly brighter experience.",
    lumina: "The Lumina suits moderate to severe staining — two appointments for the most noticeable results.",
    bridal: "Bride & Bridesmaids brings The Radiance to your whole bridal party or bachelorette."
  };
  if (finder) finder.addEventListener("click", function (e) {
    var b = e.target.closest("[data-pick]"); if (!b) return;
    var on = b.getAttribute("aria-pressed") !== "true", key = b.getAttribute("data-pick");
    $$("[data-pick]", finder).forEach(function (x) { x.setAttribute("aria-pressed", x === b && on ? "true" : "false"); });
    grid.classList.toggle("has-pick", on);
    $$("[data-exp]").forEach(function (c) { c.classList.toggle("is-picked", on && c.getAttribute("data-exp") === key); });
    note.textContent = on ? PICK_NOTE[key] + " I’ll confirm the right choice at your consultation." : NOTE0;
    if (on) {
      var card = $('[data-exp="' + key + '"]'), r = card.getBoundingClientRect();
      if (r.top < hdrH() || r.bottom > window.innerHeight) goTo(card);
    }
  });

  /* ───────────────────────── before / after ───────────────────────── */
  var ba = $("[data-ba]"), baRange = $("[data-ba-range]");
  if (ba) {
    var setPos = function (p) { p = clamp(p, 0, 100); ba.style.setProperty("--pos", p + "%"); if (baRange) baRange.value = Math.round(p); };
    var fromX = function (x) { var r = ba.getBoundingClientRect(); return (x - r.left) / r.width * 100; };
    var dragging = false, intro = null;
    ba.addEventListener("pointerdown", function (e) {
      dragging = true; if (intro) intro.kill && intro.kill();
      setPos(fromX(e.clientX));
      if (e.pointerType === "mouse") ba.setPointerCapture(e.pointerId);
    });
    ba.addEventListener("pointermove", function (e) { if (dragging) setPos(fromX(e.clientX)); });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) { ba.addEventListener(ev, function () { dragging = false; }); });
    if (baRange) baRange.addEventListener("input", function () { setPos(+baRange.value); });
    ba.setAttribute("data-cursor-label", "Drag");
    // a gentle sweep the first time it is seen, so people know it moves
    if (!reduce && "IntersectionObserver" in window) {
      var bio = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return; bio.disconnect();
        if (!hasGSAP) return;
        var o = { p: 50 };
        intro = gsap.timeline({ delay: 0.4, onUpdate: function () { setPos(o.p); } })
          .to(o, { p: 18, duration: 1.1, ease: "power2.inOut" })
          .to(o, { p: 82, duration: 1.5, ease: "power2.inOut" })
          .to(o, { p: 50, duration: 1.0, ease: "power2.inOut" });
      }, { threshold: 0.6 });
      bio.observe(ba);
    }
  }
  // the shade journey, S28 → S18 (eleven tabs, darker to brighter)
  var scale = $("[data-shade-scale] .shade-tabs");
  if (scale) {
    var S0 = [227, 196, 140], S1 = [246, 236, 212];
    for (var si = 0; si <= 10; si++) {
      var k = si / 10, c = S0.map(function (v, j) { return Math.round(v + (S1[j] - v) * k); });
      var tab = doc.createElement("i");
      tab.style.setProperty("--c", "rgb(" + c.join(",") + ")"); tab.style.setProperty("--i", si);
      if (si === 0) tab.className = "is-before"; if (si === 10) tab.className = "is-after";
      scale.appendChild(tab);
    }
  }

  /* ───────────────────────── travel radar + calculator ───────────────────────── */
  var KM = 4.2, KM_MAX = 57; // svg units per km; anything further sits on the outer ring
  function haversine(a, b) {
    var R = 6371, toR = Math.PI / 180, dLat = (b.lat - a.lat) * toR, dLng = (b.lng - a.lng) * toR;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function roadKm(p) { return haversine(CONFIG.base, p) * CONFIG.roadFactor; }
  function tierOf(km) { for (var i = 0; i < TIERS.length; i++) if (km <= TIERS[i].max) return i; return TIERS.length - 1; }
  function place(p, km) { // svg position along the true bearing, at road distance
    var dx = (p.lng - CONFIG.base.lng) * 111.32 * Math.cos(CONFIG.base.lat * Math.PI / 180);
    var dy = (p.lat - CONFIG.base.lat) * 110.57;
    var d = Math.sqrt(dx * dx + dy * dy) || 1, r = Math.min(km, KM_MAX) * KM;
    return { x: dx / d * r, y: -dy / d * r };
  }
  var radar = $("[data-radar]"), ringsG = $("[data-rings]"), townsG = $("[data-towns]"), youG = $("[data-you]");
  var kmIn = $("[data-km]"), kmOut = $("[data-km-out]"), outPlace = $("[data-calc-place]"), outFee = $("[data-calc-fee]");
  var chipsBox = $("[data-town-chips]"), tierLis = $$("[data-tiers] li");
  var NS = "http://www.w3.org/2000/svg";
  function svg(tag, attrs, parent) { var el = doc.createElementNS(NS, tag); for (var k in attrs) el.setAttribute(k, attrs[k]); if (parent) parent.appendChild(el); return el; }
  if (radar && ringsG) {
    var fills = ["rgba(236,213,204,.55)", "rgba(236,213,204,.42)", "rgba(236,213,204,.3)", "rgba(236,213,204,.2)", "rgba(236,213,204,.12)"];
    svg("circle", { r: KM_MAX * KM, style: "--rf:rgba(236,213,204,.06)", "stroke-dasharray": "3 6" }, ringsG);
    for (var ri = 4; ri >= 0; ri--) svg("circle", { r: (ri + 1) * 10 * KM, style: "--rf:" + fills[ri], "data-ring": ri }, ringsG);
    for (var li = 0; li < 5; li++) {
      var rr = (li + 1) * 10 * KM;
      var ka = 1.05; // km labels ride a diagonal no town sits on (south-south-east)
      svg("text", { x: (Math.cos(ka) * (rr - 7)).toFixed(1), y: (Math.sin(ka) * (rr - 7) + 3).toFixed(1) }, ringsG).textContent = (li + 1) * 10 + " km";
      var mid = (li + 0.5) * 10 * KM;
      var fee = svg("text", { x: mid.toFixed(1), y: -3, "class": "fee" }, ringsG);
      fee.textContent = li === 0 ? "free" : TIERS[li].fee;
    }
    var ray = svg("line", { "class": "ray", x1: 0, y1: 0, x2: 0, y2: 0, visibility: "hidden" }, townsG);
    TOWNS.forEach(function (t) {
      t.km = roadKm(t);
      if (t.id === "beaumont") return;
      var p = place(t, t.km), g = svg("g", { "data-town": t.id, tabindex: "-1" }, townsG);
      svg("circle", { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 4.5 }, g);
      var o = { n: [0, -10, "middle"], s: [0, 17, "middle"], e: [9, 4, "start"], w: [-9, 4, "end"] }[t.lab || "n"];
      var label = svg("text", { x: (p.x + o[0]).toFixed(1), y: (p.y + o[1]).toFixed(1), "text-anchor": o[2] }, g); label.textContent = t.short;
      var title = svg("title", {}, g); title.textContent = t.name + " · ≈ " + Math.round(t.km) + " km";
      g.addEventListener("click", function () { pickTown(t.id); });
      t.pos = p;
    });
    TOWNS.forEach(function (t) {
      var b = doc.createElement("button"); b.type = "button"; b.textContent = t.name; b.setAttribute("data-town-chip", t.id); b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () { pickTown(t.id); });
      chipsBox.appendChild(b);
    });
  }
  function showFee(km, label) {
    var i = tierOf(km);
    outPlace.textContent = label + " · ≈ " + Math.round(km) + " km";
    outFee.textContent = TIERS[i].fee === "Complimentary" ? "Free travel" : TIERS[i].fee === "Please inquire" ? "Please inquire" : TIERS[i].fee + " travel";
    tierLis.forEach(function (li, j) { li.classList.toggle("is-on", j === i); });
    $$("[data-ring]", ringsG).forEach(function (c) { c.classList.toggle("is-on", +c.getAttribute("data-ring") === Math.min(i, 4) && i < 5); });
    kmIn.value = Math.min(70, Math.round(km)); kmOut.textContent = Math.round(km) + (km > 70 ? "+" : "");
    kmIn.style.setProperty("--fill", (Math.min(70, km) / 70 * 100).toFixed(1) + "%");
  }
  function pickTown(id) {
    var t = TOWNS.filter(function (x) { return x.id === id; })[0]; if (!t) return;
    $$("[data-town]", townsG).forEach(function (g) { g.classList.toggle("is-on", g.getAttribute("data-town") === id); });
    $$("[data-town-chip]", chipsBox).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-town-chip") === id ? "true" : "false"); });
    var ray = $(".ray", townsG);
    if (t.pos) { ray.setAttribute("x2", t.pos.x.toFixed(1)); ray.setAttribute("y2", t.pos.y.toFixed(1)); ray.setAttribute("visibility", "visible"); }
    else ray.setAttribute("visibility", "hidden");
    showFee(t.km, t.name);
  }
  if (kmIn) {
    kmIn.addEventListener("input", function () {
      $$("[data-town]", townsG).forEach(function (g) { g.classList.remove("is-on"); });
      $$("[data-town-chip]", chipsBox).forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
      var ray = $(".ray", townsG); if (ray) ray.setAttribute("visibility", "hidden");
      showFee(+kmIn.value, "Your distance");
      if (+kmIn.value >= 70) kmOut.textContent = "70+";
    });
    showFee(0, "Beaumont");
    outPlace.textContent = "Pick your area or slide to your distance";
    outFee.textContent = "Free travel";
  }
  var geoBtn = $("[data-geo]");
  if (geoBtn) {
    if (!navigator.geolocation) geoBtn.hidden = true;
    geoBtn.addEventListener("click", function () {
      geoBtn.disabled = true; $("span", geoBtn).textContent = "Finding you…";
      navigator.geolocation.getCurrentPosition(function (pos) {
        geoBtn.disabled = false; $("span", geoBtn).textContent = "Use my location";
        var me = { lat: pos.coords.latitude, lng: pos.coords.longitude }, km = roadKm(me);
        $$("[data-town]", townsG).forEach(function (g) { g.classList.remove("is-on"); });
        $$("[data-town-chip]", chipsBox).forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
        if (km <= 80) {
          var p = place(me, km); youG.setAttribute("transform", "translate(" + p.x.toFixed(1) + " " + p.y.toFixed(1) + ")"); youG.hidden = false;
          var ray = $(".ray", townsG); ray.setAttribute("x2", p.x.toFixed(1)); ray.setAttribute("y2", p.y.toFixed(1)); ray.setAttribute("visibility", "visible");
        }
        showFee(km, "Your location");
      }, function () {
        geoBtn.disabled = false; $("span", geoBtn).textContent = "Use my location";
        toast("Location isn’t available — pick your area instead.");
      }, { enableHighAccuracy: false, timeout: 9000, maximumAge: 600000 });
    });
  }

  /* ───────────────────────── accordions ───────────────────────── */
  $$("[data-acc] details").forEach(function (d) {
    var sum = $("summary", d), body = $(".acc-b", d);
    sum.addEventListener("click", function (e) {
      if (reduce || !body.animate) return;
      e.preventDefault();
      if (d.open) {
        var h = body.offsetHeight;
        body.animate([{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 420, easing: "cubic-bezier(.16,1,.3,1)" }).onfinish = function () { d.open = false; };
      } else {
        d.open = true;
        var h2 = body.offsetHeight;
        body.animate([{ height: "0px", opacity: 0 }, { height: h2 + "px", opacity: 1 }], { duration: 560, easing: "cubic-bezier(.16,1,.3,1)" });
      }
    });
  });

  /* ───────────────────────── care guide switch ───────────────────────── */
  var care = $("[data-care]");
  if (care) {
    $$("[data-care-tab]", care).forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-care-tab");
        $$("[data-care-tab]", care).forEach(function (x) { x.setAttribute("aria-selected", x === b ? "true" : "false"); });
        care.classList.toggle("is-pause", k === "pause");
        $$("[data-care-panel]", care).forEach(function (p) {
          var on = p.getAttribute("data-care-panel") === k; p.hidden = !on;
          if (on) $$("li", p).forEach(function (li, i) { li.style.animation = "none"; void li.offsetWidth; li.style.animation = ""; li.style.setProperty("--i", i); });
        });
      });
    });
    $$("[data-care-panel] li", care).forEach(function (li, i) { li.style.setProperty("--i", i % 9); });
  }

  /* ───────────────────────── reviews ───────────────────────── */
  var rv = $("[data-rail-scroll]");
  if (rv) {
    var star = '<svg><use href="#i-star"/></svg>';
    REVIEWS.items.forEach(function (r) {
      var card = doc.createElement("article"); card.className = "rv";
      card.innerHTML =
        '<div class="rv-top"><span class="rv-stars" aria-label="5 out of 5 stars">' + star + star + star + star + star + "</span>" +
        (REVIEWS.sample ? '<span class="rv-chip">Example</span>' : "") + "</div>" +
        "<q></q>" +
        '<div class="rv-who"><span class="rv-av" aria-hidden="true"></span><div><b></b><small></small></div><svg class="rv-g" aria-hidden="true"><use href="#i-google"/></svg></div>';
      $("q", card).textContent = r.text;
      $(".rv-av", card).textContent = r.name.charAt(0);
      $(".rv-who b", card).textContent = r.name;
      $(".rv-who small", card).textContent = r.area + " · " + r.service;
      rv.appendChild(card);
    });
    if (REVIEWS.sample) $("[data-sample-note]").hidden = false;
    var g = CONFIG.google, gs = $("[data-g-summary]");
    if (g.rating && g.count) gs.textContent = g.rating.toFixed(1) + " · " + g.count + " review" + (g.count === 1 ? "" : "s");
    var gBadge = $("[data-gbadge]");
    if (g.profileUrl && gBadge) { var wrapA = doc.createElement("a"); wrapA.href = g.profileUrl; wrapA.target = "_blank"; wrapA.rel = "noopener"; wrapA.className = gBadge.className; wrapA.innerHTML = gBadge.innerHTML; wrapA.style.textDecoration = "none"; gBadge.replaceWith(wrapA); }
    var gBtn = $("[data-g-review]"); if (g.reviewUrl && gBtn) { gBtn.href = g.reviewUrl; gBtn.hidden = false; }

    // arrows + grab-and-throw (mouse); touch keeps its own momentum
    var prev = $("[data-rail-prev]"), next = $("[data-rail-next]");
    var step = function () { var c = $(".rv", rv); return c ? c.offsetWidth + 18 : 300; };
    var ease = function (to) {
      if (reduce) { rv.scrollLeft = to; return; }
      var from = rv.scrollLeft, t0 = performance.now(), D = 650;
      rv.style.scrollSnapType = "none";
      (function f(t) { var k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3); rv.scrollLeft = from + (to - from) * e; if (k < 1) requestAnimationFrame(f); else rv.style.scrollSnapType = ""; })(t0);
    };
    var arrows = function () { prev.disabled = rv.scrollLeft < 4; next.disabled = rv.scrollLeft > rv.scrollWidth - rv.clientWidth - 4; };
    prev.addEventListener("click", function () { ease(Math.max(0, rv.scrollLeft - step())); });
    next.addEventListener("click", function () { ease(Math.min(rv.scrollWidth - rv.clientWidth, rv.scrollLeft + step())); });
    rv.addEventListener("scroll", arrows, { passive: true }); arrows(); window.addEventListener("resize", arrows);
    var down = false, sx = 0, sl = 0, moved = 0, vx = 0, lx = 0, lt = 0;
    rv.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse") return; down = true; moved = 0; sx = lx = e.clientX; sl = rv.scrollLeft; lt = performance.now(); rv.setPointerCapture(e.pointerId); });
    rv.addEventListener("pointermove", function (e) {
      if (!down) return; var dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx));
      if (moved > 4) rv.classList.add("is-drag");
      var now = performance.now(); vx = (e.clientX - lx) / Math.max(1, now - lt); lx = e.clientX; lt = now;
      rv.scrollLeft = sl - dx;
    });
    var up = function () {
      if (!down) return; down = false; rv.classList.remove("is-drag");
      if (moved > 4) { var target = rv.scrollLeft - vx * 260, s = step(); ease(clamp(Math.round(target / s) * s, 0, rv.scrollWidth - rv.clientWidth)); }
    };
    rv.addEventListener("pointerup", up); rv.addEventListener("pointercancel", up);
    rv.addEventListener("keydown", function (e) { if (e.key === "ArrowRight") { e.preventDefault(); next.click(); } if (e.key === "ArrowLeft") { e.preventDefault(); prev.click(); } });
  }

  /* ───────────────────────── today’s hours ───────────────────────── */
  (function () {
    var parts;
    try {
      parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Edmonton", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date());
    } catch (e) { return; }
    var get = function (t) { var p = parts.filter(function (x) { return x.type === t; })[0]; return p ? p.value : ""; };
    var day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
    var mins = (+get("hour") % 24) * 60 + (+get("minute"));
    if (day < 0) return;
    var fmt = function (m) { var h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? "p.m." : "a.m."; h = h % 12 || 12; return h + ":" + (mm < 10 ? "0" : "") + mm + " " + ap; };
    var today = HOURS[day], msg;
    if (mins >= today[0] && mins < today[1]) msg = "Open now · until " + fmt(today[1]);
    else if (mins < today[0]) msg = "Closed · opens " + fmt(today[0]) + " today";
    else { var nd = (day + 1) % 7; msg = "Closed · opens " + fmt(HOURS[nd][0]) + " tomorrow"; }
    msg += " (Mountain Time)";
    $$("[data-today], [data-today-2]").forEach(function (el) { el.textContent = msg; });
    var row = $('[data-hours] tr[data-day="' + day + '"]'); if (row) row.classList.add("is-today");
  })();

  /* ───────────────────────── booking calendar ─────────────────────────
     The whole booking happens here — customers never leave for Square:
       1 experience · 2 day · 3 time · 4 details · 5 deposit · done.
     Behind it is worker/lunera/booking.js, which talks to her Square with
     her token, so the booking lands in her real Square calendar and the
     deposit in her Square balance.

     Two modes, chosen by /api/lunera/config:
     · booking — Square is connected: her live free times, the card fields
       (Square's own, inside this page) and an instant booking.
     · request — not connected yet: her published hours give preferred
       times, and the form is sent to her as a request (or, if requests
       aren't switched on, handed back as a ready-written text / email).
     Nothing on this calendar claims a time is free unless Square said so. */
  var cal = (function () {
    var root = $("[data-cal]");
    if (!root) return null;
    var TZ = "America/Edmonton", AHEAD = 5;
    var grid = $("[data-cal-grid]", root), title = $("[data-cal-title]", root);
    var prevB = $("[data-cal-prev]", root), nextB = $("[data-cal-next]", root);
    var expsBox = $("[data-cal-exps]", root), dayBox = $("[data-cal-day]", root), step3 = $("[data-cal-step3]", root);
    var go = $("[data-cal-go]", root), goLabel = $("[data-cal-go-label]", root), fine = $("[data-cal-fine]", root);
    var co = $("[data-cal-co]", root), form = $("[data-co-form]", root), coErr = $("[data-co-err]", root);
    var submit = $("[data-co-submit]", root), submitLabel = $("[data-co-submit-label]", root);
    var done = $("[data-cal-done]", root);
    var S = { exp: null, view: null, day: null, time: null, any: false };
    var CFG = { live: false, booking: false, appId: null, locationId: null, sdk: null };
    var feeds = {};          // "variation|from" → { state, byDay: { ymd: [iso…] } }

    /* — dates, always in her time zone — */
    function nowParts() {
      var p = {};
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hourCycle: "h23" })
          .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
      } catch (e) { var d = new Date(); p = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours(), minute: d.getMinutes() }; }
      return { y: +p.year, m: +p.month, d: +p.day, mins: (+p.hour % 24) * 60 + (+p.minute) };
    }
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function ymd(y, m, d) { return y + "-" + pad(m) + "-" + pad(d); }
    function parse(s) { var a = s.split("-"); return { y: +a[0], m: +a[1], d: +a[2] }; }
    function dow(s) { var p = parse(s); return new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay(); }
    function daysIn(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
    function addMonths(v, n) { var t = v.y * 12 + (v.m - 1) + n; return { y: Math.floor(t / 12), m: t % 12 + 1 }; }
    function cmpView(a, b) { return (a.y * 12 + a.m) - (b.y * 12 + b.m); }
    function fmtDay(s, opts) { var p = parse(s); return new Intl.DateTimeFormat("en-CA", Object.assign({ timeZone: "UTC" }, opts)).format(new Date(Date.UTC(p.y, p.m - 1, p.d, 12))); }
    function longDay(s) { return fmtDay(s, { weekday: "long", month: "long", day: "numeric" }); }
    function shortDay(s) { return fmtDay(s, { weekday: "short", month: "short", day: "numeric" }); }
    function fmtMins(m) { var h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? "p.m." : "a.m."; h = h % 12 || 12; return h + ":" + pad(mm) + " " + ap; }
    var timeFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
    var dayFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
    var hourFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hourCycle: "h23" });
    function slotDay(iso) { var p = {}; dayFmt.formatToParts(new Date(iso)).forEach(function (x) { p[x.type] = x.value; }); return p.year + "-" + p.month + "-" + p.day; }
    function slotHour(iso) { return +hourFmt.format(new Date(iso)) % 24; }
    function money(c) { return "$" + (c / 100).toFixed(2).replace(/\.00$/, ""); }
    function money2(c) { return "$" + (c / 100).toFixed(2); }

    var now = nowParts(), today = ymd(now.y, now.m, now.d), first = { y: now.y, m: now.m };
    S.view = { y: now.y, m: now.m };

    function open(s) {
      if (s < today) return false;
      if (s > today) return true;
      return now.mins < HOURS[dow(s)][1] - 60;
    }
    function evening(s) { return HOURS[dow(s)][0] >= 15 * 60; }

    /* — the chosen time: a live slot (ISO) or a preferred time (minutes) — */
    function timeLabel() {
      if (S.any) return "Any time";
      if (S.time == null) return "";
      return typeof S.time === "string" ? timeFmt.format(new Date(S.time)) : fmtMins(S.time);
    }
    // preferred starts from her hours, on the hour, finishing by closing time
    function prefTimes(s) {
      var h = HOURS[dow(s)], len = S.exp ? SERVICES[S.exp].mins : 60, out = [];
      for (var m = Math.ceil(h[0] / 60) * 60; m + len <= h[1]; m += 60) {
        if (s === today && m < now.mins + 90) continue;
        out.push(m);
      }
      return out;
    }

    /* — live free times — */
    function feedKey() {
      if (!S.exp || !CFG.live) return null;
      var v = S.view, from = cmpView(v, first) === 0 ? today : ymd(v.y, v.m, 1);
      return svcIds(S.exp).variation + "|" + from;
    }
    function feed() { var k = feedKey(); return k ? feeds[k] : null; }
    function load(force) {
      var k = feedKey();
      if (!k || (feeds[k] && !force)) return;
      var parts = k.split("|"), f = feeds[k] = { state: "loading", byDay: {} };
      fetch(CONFIG.api + "/availability?variation=" + parts[0] + "&from=" + parts[1] + "&days=31", { headers: { Accept: "application/json" } })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (j) {
          if (!j || j.live !== true || !Array.isArray(j.slots)) throw new Error("not live");
          j.slots.forEach(function (iso) { var d = slotDay(iso); (f.byDay[d] = f.byDay[d] || []).push(iso); });
          f.state = "ok";
        })
        .catch(function () { f.state = "fail"; })
        .then(render);
    }

    /* — experiences — */
    Object.keys(SERVICES).forEach(function (key) {
      var s = SERVICES[key], price = svcPrice(key), was = price !== s.price ? s.price : null;
      var l = doc.createElement("label");
      l.className = "cal-x"; l.setAttribute("data-x", key);
      l.innerHTML =
        '<input type="radio" name="cal-exp" value="' + key + '">' +
        '<span class="cal-x-img" aria-hidden="true">' + (s.img ? '<img src="/assets/lunera-ora/photos/' + s.img + '.webp" alt="" loading="lazy" decoding="async">' : '<svg><use href="#i-people"/></svg>') + "</span>" +
        '<span class="cal-x-t"><b></b><small></small><small class="cal-x-time"></small></span>' +
        '<span class="cal-x-p"><b>$' + price + "</b>" + (was ? "<s>$" + was + "</s>" : "") + "</span>";
      $("b", l).textContent = s.name;
      $("small", l).textContent = s.tag;
      $(".cal-x-time", l).textContent = s.time;
      $("input", l).addEventListener("change", function () { choose(key, true); });
      expsBox.appendChild(l);
    });
    // towns for the address field (and the travel estimate)
    var dl = $("[data-co-towns]", root);
    if (dl) TOWNS.forEach(function (t) { var o = doc.createElement("option"); o.value = t.name; dl.appendChild(o); });

    function choose(key, fromList) {
      if (!SERVICES[key]) return;
      if (S.stage === "co" || S.stage === "done") back(true);
      if (S.exp !== key) { S.time = null; S.any = false; }
      S.exp = key;
      $$(".cal-x", expsBox).forEach(function (l) {
        var on = l.getAttribute("data-x") === key;
        l.classList.toggle("is-on", on); $("input", l).checked = on;
      });
      load(); render();
      if (fromList && !S.day && innerWidth < 961) nudge($(".cal-month", root));
    }

    /* — rendering: the picker — */
    function render() {
      var v = S.view, f = feed(), liveNow = !!(f && f.state === "ok"), loading = !!(f && f.state === "loading");
      title.textContent = fmtDay(ymd(v.y, v.m, 1), { month: "long", year: "numeric" });
      prevB.disabled = cmpView(v, first) <= 0;
      nextB.disabled = cmpView(v, addMonths(first, AHEAD)) >= 0;
      root.classList.toggle("is-live", CFG.live);
      grid.classList.toggle("is-loading", loading);

      var html = "", lead = new Date(Date.UTC(v.y, v.m - 1, 1)).getUTCDay(), n = daysIn(v.y, v.m);
      for (var i = 0; i < lead; i++) html += '<span class="cal-d is-blank" aria-hidden="true"></span>';
      for (var d = 1; d <= n; d++) {
        var s = ymd(v.y, v.m, d), ok = open(s), h = HOURS[dow(s)], cls = "cal-d", label = longDay(s);
        var slots = liveNow ? (f.byDay[s] || []) : null;
        if (!ok) { cls += " is-past"; label += ", not available"; }
        else if (slots) {
          cls += slots.length ? " has-slots" : " is-full";
          label += slots.length ? ", " + slots.length + " free time" + (slots.length > 1 ? "s" : "") : ", fully booked";
        } else label += ", " + fmtMins(h[0]) + " to " + fmtMins(h[1]);
        if (s === today) cls += " is-today";
        if (s === S.day) cls += " is-on";
        html += '<button type="button" class="' + cls + '" data-ymd="' + s + '"' + (ok ? "" : " disabled") +
          ' aria-pressed="' + (s === S.day) + '" aria-label="' + label + '"><span class="n">' + d + "</span>" +
          (slots && slots.length ? '<i class="dot" aria-hidden="true"></i>' : '<svg class="g" aria-hidden="true"><use href="#i-' + (evening(s) ? "moon" : "sun") + '"/></svg>') + "</button>";
      }
      grid.innerHTML = html;
      renderDay(f, liveNow, loading);
      renderSum(liveNow);
    }

    function chip(val, label, on) {
      return '<button type="button" class="cal-t' + (on ? " is-on" : "") + '" data-t="' + val + '" aria-pressed="' + on + '">' + label + "</button>";
    }
    function group(list, hourOf, chipOf) {
      var g = { Morning: [], Afternoon: [], Evening: [] }, out = "";
      list.forEach(function (x) { var hr = hourOf(x); g[hr < 12 ? "Morning" : hr < 17 ? "Afternoon" : "Evening"].push(x); });
      Object.keys(g).forEach(function (k) { if (g[k].length) out += '<p class="cal-g">' + k + '</p><div class="cal-slots">' + g[k].map(chipOf).join("") + "</div>"; });
      return out;
    }

    function renderDay(f, liveNow, loading) {
      step3.textContent = "Choose a time";
      if (!S.day) {
        dayBox.innerHTML = '<p class="cal-empty">' + (S.exp ? "Pick a day on the calendar." : "Choose your experience, then pick a day on the calendar.") + "</p>";
        return;
      }
      var h = HOURS[dow(S.day)], out = '<h4 class="cal-dname">' + longDay(S.day) + "</h4>";
      out += '<p class="cal-hours"><svg class="ic"><use href="#i-' + (evening(S.day) ? "moon" : "sun") + '"/></svg>My hours <b>' + fmtMins(h[0]) + " – " + fmtMins(h[1]) + "</b></p>";
      var L = 480, R = 1320, a = (h[0] - L) / (R - L) * 100, w = (h[1] - h[0]) / (R - L) * 100;
      out += '<div class="cal-line" aria-hidden="true"><i style="left:' + a.toFixed(1) + "%;width:" + w.toFixed(1) + '%"></i>' +
        '<span style="left:7.1%">9a</span><span style="left:28.6%">12p</span><span style="left:50%">3p</span><span style="left:71.4%">6p</span><span style="left:92.9%">9p</span></div>';
      if (loading) {
        out += '<div class="cal-slots is-skel" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>';
      } else if (liveNow) {
        var slots = f.byDay[S.day] || [];
        if (slots.length) {
          out += group(slots, slotHour, function (iso) { return chip(iso, timeFmt.format(new Date(iso)), iso === S.time); });
        } else {
          var next = Object.keys(f.byDay).filter(function (k) { return k > S.day && f.byDay[k].length; }).sort()[0];
          out += '<p class="cal-note">Fully booked on this day.' + (next ? "" : " Try the next month, or text me — I may be able to fit you in.") + "</p>";
          if (next) out += '<button type="button" class="btn btn-ghost btn-sm cal-next" data-goto="' + next + '"><span>Next free day: ' + shortDay(next) + '</span><svg class="ic"><use href="#i-arrow"/></svg></button>';
        }
      } else {
        var pref = S.exp ? prefTimes(S.day) : [];
        if (!S.exp) out += '<p class="cal-note">Choose your experience to see times.</p>';
        else if (!pref.length) out += '<p class="cal-note">No times left today — please pick another day.</p>';
        else {
          out += '<p class="cal-note cal-pref-note"><svg class="ic"><use href="#i-clock"/></svg>Choose a preferred start — I’ll confirm it with you.</p>';
          out += group(pref, function (m) { return Math.floor(m / 60); }, function (m) { return chip(m, fmtMins(m), !S.any && m === S.time); });
          out += '<div class="cal-slots cal-any">' + chip("any", "Any time that day", S.any) + "</div>";
        }
      }
      dayBox.innerHTML = out;
    }

    function renderSum(liveNow) {
      var e = S.exp && SERVICES[S.exp], price = e ? svcPrice(S.exp) : 0;
      $("[data-sum-exp]", root).textContent = e ? e.name + " · $" + price + (price !== e.price ? " (reg. $" + e.price + ")" : "") : "—";
      $("[data-sum-day]", root).textContent = S.day ? shortDay(S.day) : "—";
      $("[data-sum-time-row]", root).hidden = false;
      $("[data-sum-time]", root).textContent = timeLabel() || "—";
      $("[data-sum-dep]", root).textContent = e ? money2(price * 20) + " (20%)" : "20% of your total";
      var ready = !!(S.exp && S.day && (S.time != null || S.any));
      goLabel.textContent = !S.exp ? "Choose your experience" : !S.day ? "Choose a day" : !ready ? "Choose a time" : "Continue to your details";
      fine.textContent = CFG.booking
        ? "Next: your details and the 20% deposit — secure card payment, all on this page."
        : "Next: your details — I’ll confirm your time and your 20% deposit.";
      go.classList.toggle("is-wait", !ready);
      go.setAttribute("aria-disabled", ready ? "false" : "true");
    }

    function nudge(el) {
      if (!el) return;
      var r = el.getBoundingClientRect();
      if (r.top < hdrH() || r.top > innerHeight * 0.72) goTo(el);
    }

    /* — picker events — */
    prevB.addEventListener("click", function () { S.view = addMonths(S.view, -1); load(); render(); });
    nextB.addEventListener("click", function () { S.view = addMonths(S.view, 1); load(); render(); });
    grid.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-ymd]"); if (!b || b.disabled) return;
      if (S.day !== b.getAttribute("data-ymd")) { S.time = null; S.any = false; }
      S.day = b.getAttribute("data-ymd");
      render();
      var again = $('button[data-ymd="' + S.day + '"]', grid); if (again) again.focus({ preventScroll: true });
      if (innerWidth < 961) nudge($(".cal-day", root));
    });
    grid.addEventListener("keydown", function (e) {
      var step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      var b = e.target.closest("button[data-ymd]"); if (!step || !b) return;
      e.preventDefault();
      var p = parse(b.getAttribute("data-ymd")), t = new Date(Date.UTC(p.y, p.m - 1, p.d + step));
      var s = ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()), v = { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1 };
      if (cmpView(v, S.view) !== 0) {
        if (cmpView(v, first) < 0 || cmpView(v, addMonths(first, AHEAD)) > 0) return;
        S.view = v; load(); render();
      }
      var nb = $('button[data-ymd="' + s + '"]', grid); if (nb) nb.focus();
    });
    dayBox.addEventListener("click", function (e) {
      var t = e.target.closest("[data-t]"), g = e.target.closest("[data-goto]");
      if (t) {
        var v = t.getAttribute("data-t");
        S.any = v === "any"; S.time = S.any ? null : (/^\d+$/.test(v) ? +v : v);
        render();
        var again = $('[data-t="' + v + '"]', dayBox); if (again) again.focus({ preventScroll: true });
        if (innerWidth < 961) nudge($(".cal-sum", root));
      }
      if (g) {
        var p = parse(g.getAttribute("data-goto"));
        S.day = g.getAttribute("data-goto"); S.time = null; S.any = false;
        if (p.y !== S.view.y || p.m !== S.view.m) { S.view = { y: p.y, m: p.m }; load(); }
        render();
      }
    });
    go.addEventListener("click", function () {
      if (go.getAttribute("aria-disabled") === "true") {
        var target = !S.exp ? $(".cal-pick", root) : !S.day ? $(".cal-month", root) : $(".cal-day", root);
        target.classList.remove("is-ask"); void target.offsetWidth; target.classList.add("is-ask");
        if (innerWidth < 961) nudge(target);
        var f = !S.exp ? $("input", expsBox) : !S.day ? $("button[data-ymd]:not([disabled])", grid) : $("[data-t]", dayBox);
        if (f) f.focus({ preventScroll: innerWidth >= 961 });
        return;
      }
      checkout();
    });

    /* — 4 + 5: details and deposit — */
    function priceCents() { return svcPrice(S.exp) * 100; }
    function depositCents() { return Math.round(priceCents() * 0.2); }
    function travelFor(city) {
      var c = String(city || "").toLowerCase().trim();
      if (!c) return null;
      var t = TOWNS.filter(function (x) { return x.name.toLowerCase() === c; })[0] ||
              TOWNS.filter(function (x) { var n = x.name.toLowerCase().replace("edmonton · ", ""); return n.length > 3 && c.indexOf(n) > -1; })[0];
      return t ? TIERS[tierOf(roadKm(t))].fee : null;
    }
    function fillSummary() {
      var e = SERVICES[S.exp], price = svcPrice(S.exp);
      $("[data-co-img]", root).innerHTML = e.img ? '<img src="/assets/lunera-ora/photos/' + e.img + '.webp" alt="">' : '<svg><use href="#i-people"/></svg>';
      $("[data-co-name]", root).textContent = e.name;
      $("[data-co-when]", root).textContent = longDay(S.day) + " · " + timeLabel();
      $("[data-co-pref]", root).hidden = CFG.booking && typeof S.time === "string";
      $("[data-co-price]", root).textContent = "$" + price + (price !== e.price ? " (reg. $" + e.price + ")" : "");
      $("[data-co-len]", root).textContent = e.time;
      updateTravel();
    }
    function updateTravel() {
      var fee = travelFor(form.elements.city.value), dep = depositCents();
      $("[data-co-travel]", root).textContent = fee ? (fee === "Complimentary" ? "Complimentary" : fee === "Please inquire" ? "Please inquire" : "≈ " + fee) : "By distance";
      var extra = fee && /^\$/.test(fee) ? +fee.slice(1) * 100 : 0;
      $("[data-co-dep]", root).textContent = money2(dep);
      $("[data-co-bal]", root).textContent = money2(priceCents() - dep + extra) + (fee && fee !== "Please inquire" ? "" : " + travel");
    }
    form.elements.city.addEventListener("input", updateTravel);

    var payments = null, card = null, sdkLoading = null;
    function loadSdk() {
      if (window.Square) return Promise.resolve();
      if (sdkLoading) return sdkLoading;
      sdkLoading = new Promise(function (ok, no) {
        var s = doc.createElement("script"); s.src = CFG.sdk; s.async = true;
        s.onload = function () { window.Square ? ok() : no(new Error("no Square")); };
        s.onerror = function () { sdkLoading = null; no(new Error("sdk")); };
        doc.head.appendChild(s);
      });
      return sdkLoading;
    }
    function mountCard() {
      if (card) return Promise.resolve(card);
      var box = $("[data-co-card]", root);
      return loadSdk().then(function () {
        payments = window.Square.payments(CFG.appId, CFG.locationId);
        return payments.card({
          style: {
            ".input-container": { borderColor: "#d9c9c0", borderRadius: "14px" },
            ".input-container.is-focus": { borderColor: "#6b5341" },
            ".input-container.is-error": { borderColor: "#b4553f" },
            input: { color: "#3b2d26", fontSize: "16px" },
            "input::placeholder": { color: "#a8968c" },
            ".message-text": { color: "#76625a" },
            ".message-icon": { color: "#76625a" }
          }
        });
      }).then(function (c) {
        box.innerHTML = "";
        return c.attach("#lo-card").then(function () { card = c; return c; });
      }).catch(function () {
        box.innerHTML = '<p class="cal-card-wait">The secure card form didn’t load. Check your connection and <button type="button" class="link-btn" data-card-retry>try again</button>, or text me to book.</p>';
        throw new Error("card");
      });
    }
    root.addEventListener("click", function (e) { if (e.target.closest("[data-card-retry]")) mountCard().catch(function () {}); });

    function checkout() {
      S.stage = "co";
      fillSummary();
      var book = CFG.booking && typeof S.time === "string";
      $("[data-co-pay]", root).hidden = !book;
      $("[data-co-reqnote]", root).hidden = book;
      submitLabel.textContent = book ? "Pay " + money2(depositCents()) + " deposit & book" : "Send booking request";
      coErr.hidden = true;
      root.classList.add("is-co");
      co.hidden = false; done.hidden = true;
      if (book) mountCard().catch(function () {});
      goTo(root);
      setTimeout(function () { var n = form.elements.name; if (n && !n.value && innerWidth >= 961) n.focus({ preventScroll: true }); }, 700);
    }
    function back(silent) {
      S.stage = "pick";
      root.classList.remove("is-co", "is-done");
      co.hidden = true; done.hidden = true;
      if (!silent) goTo(root);
    }
    $("[data-cal-back]", root).addEventListener("click", function () { back(); });

    function readForm() {
      var el = form.elements, d = {};
      ["name", "email", "phone", "postal", "address", "city", "notes"].forEach(function (k) { d[k] = String(el[k].value || "").trim(); });
      d.consent = el.consent.checked; d.botcheck = el.botcheck.checked;
      return d;
    }
    function check(d) {
      var bad = [];
      if (!d.name) bad.push(["name", "your name"]);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) bad.push(["email", "a valid email"]);
      if (d.phone.replace(/\D/g, "").length < 10) bad.push(["phone", "a phone number"]);
      if (!d.address) bad.push(["address", "your street address"]);
      if (!d.city) bad.push(["city", "your town or area"]);
      $$(".fld", form).forEach(function (f) { var i = $("input,textarea", f); f.classList.toggle("is-bad", bad.some(function (b) { return b[0] === i.name; })); });
      return bad;
    }
    function fail(msg, focusEl) {
      coErr.textContent = msg; coErr.hidden = false;
      if (focusEl) focusEl.focus();
    }
    function busy(on, label) {
      submit.disabled = on; submit.classList.toggle("is-busy", on);
      if (label) submitLabel.textContent = label;
    }
    form.addEventListener("input", function (e) { var f = e.target.closest(".fld"); if (f) f.classList.remove("is-bad"); coErr.hidden = true; });
    form.addEventListener("change", function () { coErr.hidden = true; });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      coErr.hidden = true;
      var d = readForm();
      if (d.botcheck) return;
      var bad = check(d);
      if (bad.length) return fail("Please add " + bad.map(function (b) { return b[1]; }).join(", ").replace(/, ([^,]*)$/, " and $1") + ".", form.elements[bad[0][0]]);
      if (!d.consent) return fail("Please agree to the booking policies.", form.elements.consent);
      var book = CFG.booking && typeof S.time === "string";
      return book ? payAndBook(d) : sendRequest(d);
    });

    function payAndBook(d) {
      var label = submitLabel.textContent, parts = d.name.split(/\s+/), dep = depositCents();
      if (!card) return mountCard().then(function () { fail("The card form is ready — please add your card."); }, function () { fail("The secure card form didn’t load — please try again, or text me to book."); });
      busy(true, "Securing your time…");
      card.tokenize().then(function (t) {
        if (!t || t.status !== "OK") throw { card: true, msg: (t && t.errors && t.errors[0] && t.errors[0].message) || "Please check your card details." };
        var details = {
          amount: (dep / 100).toFixed(2), currencyCode: "CAD", intent: "CHARGE",
          billingContact: { givenName: parts[0], familyName: parts.slice(1).join(" "), email: d.email, phone: d.phone, addressLines: [d.address], city: d.city, postalCode: d.postal, countryCode: "CA" }
        };
        var verify = payments.verifyBuyer ? payments.verifyBuyer(t.token, details).then(function (v) { return v && v.token; }, function () { return ""; }) : Promise.resolve("");
        return verify.then(function (vt) {
          return fetch(CONFIG.api + "/book", {
            method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
              variation: svcIds(S.exp).variation, start_at: S.time, card_token: t.token, verification_token: vt || "",
              name: d.name, email: d.email, phone: d.phone, address: d.address, city: d.city, postal: d.postal,
              area: d.city, notes: d.notes, consent: true, idem: "lo-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
            })
          });
        });
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, j: j }; });
      }).then(function (res) {
        busy(false, label);
        if (res.j && res.j.ok) return finish("booked", d, res.j);
        if (res.status === 409) {
          feeds = {}; S.time = null;
          back(); load(); render();
          return toast(res.j.error || "That time was just taken — please choose another.");
        }
        if (res.status === 402) return fail(res.j.error || "Your card couldn’t be charged. Please try another card.");
        fail((res.j && res.j.error) || "Something went wrong — nothing was charged. Please try again, or text me.");
      }).catch(function (err) {
        busy(false, label);
        fail(err && err.card ? err.msg : "We couldn’t reach the booking system — nothing was charged. Please try again.");
      });
    }

    function composed(d) {
      return [
        "Hi Ysabel — I’d like to book through your website ✨", "",
        "Experience: " + SERVICES[S.exp].name, "Day: " + longDay(S.day), "Preferred time: " + timeLabel(),
        "Name: " + d.name, "Email: " + d.email, "Phone: " + d.phone,
        "Address: " + d.address + ", " + d.city + (d.postal ? " " + d.postal : ""),
        d.notes ? "Notes: " + d.notes : ""
      ].filter(Boolean).join("\n");
    }
    function sendRequest(d) {
      var label = submitLabel.textContent;
      busy(true, "Sending…");
      fetch(CONFIG.api + "/request", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ service: SERVICES[S.exp].name, day: shortDay(S.day), time: timeLabel(), name: d.name, email: d.email, phone: d.phone, address: d.address, city: d.city, postal: d.postal, area: d.city, notes: d.notes, consent: true })
      }).then(function (r) { return r.json().catch(function () { return {}; }); }, function () { return {}; })
        .then(function (j) { busy(false, label); finish(j && j.sent ? "requested" : "handoff", d, j); });
    }

    /* — done — */
    function ics(d, j) {
      var start = new Date(j.booking.start_at), end = new Date(start.getTime() + SERVICES[S.exp].mins * 60000);
      var f = function (t) { return t.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); };
      var esc = function (s) { return String(s).replace(/[\\,;]/g, "\\$&").replace(/\n/g, "\\n"); };
      return "data:text/calendar;charset=utf-8," + encodeURIComponent([
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Lunera Ora//Booking//EN", "BEGIN:VEVENT",
        "UID:" + j.booking.id + "@luneraora", "DTSTAMP:" + f(new Date()), "DTSTART:" + f(start), "DTEND:" + f(end),
        "SUMMARY:" + esc("Lunera Ora — " + SERVICES[S.exp].name),
        "LOCATION:" + esc(d.address + ", " + d.city),
        "DESCRIPTION:" + esc("Mobile teeth whitening with Ysabel. Allow treatment time + 15 minutes. Questions: text " + CONFIG.phoneLabel + "."),
        "END:VEVENT", "END:VCALENDAR"
      ].join("\r\n"));
    }
    function finish(kind, d, j) {
      S.stage = "done";
      var fname = d.name.split(/\s+/)[0], when = longDay(S.day) + " · " + timeLabel();
      var h = $("[data-done-h]", done), p = $("[data-done-p]", done), lines = $("[data-done-lines]", done);
      var icsA = $("[data-done-ics]", done), smsA = $("[data-done-sms]", done), mailA = $("[data-done-mail]", done);
      icsA.hidden = smsA.hidden = mailA.hidden = true;
      var rows = [["Experience", SERVICES[S.exp].name], ["When", when], ["Where", d.address + ", " + d.city]];
      if (kind === "booked") {
        h.textContent = "You’re booked, " + fname + " ✨";
        p.textContent = j.deposit_taken ? "You’re in my calendar and your deposit is paid." : "You’re in my calendar. Your deposit is held on your card and I will confirm it.";
        rows.push(["Deposit paid", money2(j.deposit_cents)]);
        icsA.href = ics(d, j); icsA.hidden = false;
      } else if (kind === "requested") {
        h.textContent = "Request sent, " + fname + " ✨";
        p.textContent = "I’ll confirm your time by text or email — usually the same day — and send your 20% deposit request to secure it.";
      } else {
        var text = composed(d);
        h.textContent = "Almost there, " + fname;
        p.textContent = "Your booking request is written and ready — send it to me and I’ll confirm your time and deposit. Nothing has been sent yet.";
        smsA.href = "sms:" + CONFIG.phone + "?&body=" + encodeURIComponent(text); smsA.hidden = false;
        mailA.href = "mailto:" + CONFIG.email + "?subject=" + encodeURIComponent("Booking request — " + SERVICES[S.exp].name + " · " + shortDay(S.day)) + "&body=" + encodeURIComponent(text); mailA.hidden = false;
      }
      lines.innerHTML = rows.map(function (r) { return "<div><dt></dt><dd></dd></div>"; }).join("");
      $$("div", lines).forEach(function (row, i) { $("dt", row).textContent = rows[i][0]; $("dd", row).textContent = rows[i][1]; });
      co.hidden = true; done.hidden = false;
      root.classList.remove("is-co"); root.classList.add("is-done");
      goTo(root);
      setTimeout(function () { done.focus({ preventScroll: true }); }, 400);
    }
    $("[data-done-again]", done).addEventListener("click", function () {
      S.time = null; S.any = false; S.day = null; feeds = {};
      form.reset();
      back(); load(); render();
    });

    /* — start: ask the site whether Square is connected — */
    var pre = (location.search.match(/[?&]exp=(\w+)/) || [])[1];
    if (pre && SERVICES[pre]) choose(pre);
    render();
    fetch(CONFIG.api + "/config", { headers: { Accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j) { CFG = j; CFG.live = !!j.live; CFG.booking = !!(j.booking && j.appId && j.sdk); } })
      .catch(function () {})
      .then(function () { load(); render(); });

    return { choose: choose };
  })();

  /* ───────────────────────── enquiry ───────────────────────── */
  var form = $("[data-enq]"), done = $("[data-enq-done]"), err = $("[data-enq-err]");
  function setTopic(topic) {
    if (!form) return;
    $$('input[name="topic"]', form).forEach(function (r) { r.checked = r.value === topic; });
    syncParty();
  }
  function syncParty() {
    var t = form.querySelector('input[name="topic"]:checked');
    $("[data-party-row]", form).hidden = !(t && t.value === "Bridal party or group");
  }
  if (form) {
    form.addEventListener("change", function (e) { if (e.target.name === "topic") syncParty(); });
    var compose = function (d) {
      var lines = ["Hi Ysabel — a website enquiry for Lunera Ora ✨", "", "Topic: " + d.topic, "Name: " + d.name, "Email: " + d.email];
      if (d.phone) lines.push("Phone: " + d.phone);
      if (d.area) lines.push("Area: " + d.area);
      if (d.party) lines.push("Party size: " + d.party);
      if (d.event_date) lines.push("Event date: " + d.event_date);
      lines.push("Best way to reply: " + d.reply, "", d.message);
      return lines.join("\n");
    };
    var showDone = function (d, sent, text) {
      form.hidden = true; done.hidden = false;
      var first = d.name.split(/\s+/)[0];
      $("[data-done-title]", done).textContent = sent ? "Thank you, " + first : "Almost there, " + first;
      $("[data-done-text]", done).textContent = sent
        ? "Your enquiry is with me — I’ll reply by " + d.reply.toLowerCase() + " as soon as I can."
        : "Your message is written and ready. Send it to me whichever way suits you — nothing has been sent yet.";
      var ho = $("[data-handoff]", done); ho.hidden = sent;
      if (!sent) {
        $("[data-enq-msg]", done).textContent = text;
        $("[data-ho-sms]", done).href = "sms:" + CONFIG.phone + "?&body=" + encodeURIComponent(text);
        $("[data-ho-mail]", done).href = "mailto:" + CONFIG.email + "?subject=" + encodeURIComponent("Website enquiry — " + d.topic) + "&body=" + encodeURIComponent(text);
        $("[data-ho-ig]", done).onclick = function () {
          var open = function () { window.open(CONFIG.instagramDM, "_blank", "noopener"); };
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast("Copied — paste it into the DM"); setTimeout(open, 500); }, open);
          else open();
        };
      }
      done.focus({ preventScroll: true });
      var r = done.getBoundingClientRect(); if (r.top < hdrH()) goTo(done.parentElement);
    };
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      err.hidden = true;
      var fd = new FormData(form), d = {};
      fd.forEach(function (v, k) { d[k] = typeof v === "string" ? v.trim() : v; });
      if (d.botcheck) return;
      var bad = [];
      if (!d.name) bad.push("name");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email || "")) bad.push("email");
      if (!d.message) bad.push("message");
      $$(".fld", form).forEach(function (f) { var i = $("input,textarea", f); f.classList.toggle("is-bad", bad.indexOf(i.name) > -1); });
      if (bad.length) {
        err.textContent = "Please add your " + bad.join(", ").replace(/, ([^,]*)$/, " and $1") + ".";
        err.hidden = false;
        var f0 = form.querySelector('[name="' + bad[0] + '"]'); if (f0) f0.focus();
        return;
      }
      if (d.topic !== "Bridal party or group") { delete d.party; delete d.event_date; }
      var text = compose(d), btn = $('button[type="submit"]', form);
      if (!CONFIG.web3formsKey) { showDone(d, false, text); return; }
      btn.disabled = true; $("span", btn).textContent = "Sending…";
      fetch("https://api.web3forms.com/submit", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ access_key: CONFIG.web3formsKey, subject: "Lunera Ora enquiry — " + d.topic, from_name: "Lunera Ora website", replyto: d.email, name: d.name, email: d.email, phone: d.phone || "", message: text })
      }).then(function (r) { return r.json(); }).then(function (j) {
        btn.disabled = false; $("span", btn).textContent = "Send enquiry";
        showDone(d, !!(j && j.success), text);
      }).catch(function () {
        btn.disabled = false; $("span", btn).textContent = "Send enquiry";
        showDone(d, false, text);
      });
    });
    form.addEventListener("input", function (e) { var f = e.target.closest(".fld"); if (f) f.classList.remove("is-bad"); });
    $("[data-enq-again]").addEventListener("click", function () { form.reset(); syncParty(); done.hidden = true; form.hidden = false; $("input[name=name]", form).focus(); });
  }

  /* ───────────────────────── share the glow ───────────────────────── */
  var share = $("[data-share]");
  if (share) share.addEventListener("click", function () {
    var url = location.href.split("#")[0];
    var data = { title: "Lunera Ora — Mobile Smile Studio", text: "Mobile teeth whitening by a Registered Dental Hygienist ✨ Beaumont · Leduc · Edmonton", url: url };
    if (navigator.share) navigator.share(data).catch(function () {});
    else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast("Link copied — share the glow ✨"); });
    else toast(url);
  });

  /* ───────────────────────── magnetic buttons + cursor ───────────────────────── */
  if (fine && !reduce) {
    $$("[data-magnetic]").forEach(function (el) {
      el.style.transition += ", transform .7s cubic-bezier(.16,1,.3,1)";
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.22, y = (e.clientY - r.top - r.height / 2) * 0.32;
        el.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });

    var cur = $("[data-cursor]");
    if (cur) {
      var dot = $(".cursor-dot", cur), ring = $(".cursor-ring", cur), lab = $(".cursor-label", cur);
      var cx = -100, cy = -100, rx = cx, ry = cy, lx2 = cx, ly2 = cy;
      window.addEventListener("pointermove", function (e) { if (e.pointerType !== "mouse") return; cx = e.clientX; cy = e.clientY; cur.classList.remove("is-hidden"); }, { passive: true });
      doc.addEventListener("pointerleave", function () { cur.classList.add("is-hidden"); });
      (function loop() {
        rx += (cx - rx) * 0.18; ry += (cy - ry) * 0.18; lx2 += (cx - lx2) * 0.25; ly2 += (cy - ly2) * 0.25;
        dot.style.transform = "translate(" + cx + "px," + cy + "px) translate(-50%,-50%)";
        ring.style.transform = "translate(" + rx + "px," + ry + "px) translate(-50%,-50%)";
        lab.style.left = lx2 + "px"; lab.style.top = ly2 + "px";
        requestAnimationFrame(loop);
      })();
      doc.addEventListener("pointerover", function (e) {
        var t = e.target;
        var labelEl = t.closest && t.closest("[data-cursor-label]");
        if (labelEl) { lab.textContent = labelEl.getAttribute("data-cursor-label"); cur.classList.add("is-label"); cur.classList.remove("is-link"); return; }
        cur.classList.remove("is-label");
        cur.classList.toggle("is-link", !!(t.closest && t.closest("a, button, summary, label, input[type=range], [data-town]")));
      });
    }
  }
})();

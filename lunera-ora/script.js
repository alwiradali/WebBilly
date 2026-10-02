/* ═══════════════════════════════════════════════════════════════════════════
   LUNERA ORA · MOBILE SMILE STUDIO — page behaviour
   Everything she may want changed lives in CONFIG / SERVICES / REVIEWS below.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ───────────────────────── her details ───────────────────────── */
  var CONFIG = {
    // Her Square booking site (decoded from the QR code in her "Booking" story).
    booking: "https://book.squareup.com/appointments/ya807bsxg2r71v/location/L8EH27QVVN1GN/services",
    // While true, the "Book" buttons open the launch-promo service in Square and
    // the cards show launch prices. Set false when the first 10 spots are gone.
    launchPromo: true,
    phone: "+16479835983",
    phoneLabel: "(647) 983-5983",
    email: "lunera.mobilestudio@gmail.com",
    instagram: "https://www.instagram.com/luneraora.mobilestudio/",
    instagramDM: "https://ig.me/m/luneraora.mobilestudio",
    founderInstagram: "https://www.instagram.com/ysabennett/",
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
    aura:     { name: "The Aura", tag: "The subtle refresh", time: "1 hr", price: 149, launchPrice: 119, img: "lips-aura",
                ids: { service: "36FBOJEGYBT62O2QGPZKSBAI", variation: "TF2UNCPOH3I4OZFO7HKX3NY7" },
                launchIds: { service: "FOABZNCYESK4TVSB7MRHTB4S", variation: "B2PUH46HJKJI7QHS7RTG2Z2D" } },
    radiance: { name: "The Radiance", tag: "The signature experience", time: "1 hr", price: 179, launchPrice: 139, img: "lips-radiance",
                ids: { service: "OQ5Y7FBISU2SIDVJEW2JFAMF", variation: "KH6OBDR37HWXJ7QKQ6K6LWW3" },
                launchIds: { service: "NEZSBKHLOYX565LJMZG6ILSW", variation: "TCSCFBWSGXDH6SXEKYURNH2C" } },
    lumina:   { name: "The Lumina", tag: "The ultimate experience", time: "1 hr 30 min + follow-up", price: 249, launchPrice: 199, img: "lips-lumina",
                ids: { service: "4VMQHVFHAHWQLKIMGJQL5HGK", variation: "D6QW4UIBB5OJXPSEAMCCZYFV" },
                launchIds: { service: "TAMV25J24HFGHYYIWWEQ2JGB", variation: "EFNBDZQST6J2WJOL5U7STXPY" } },
    bridal:   { name: "Bride & Bridesmaids", tag: "For the bridal party", time: "1 hr", price: 159,
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
      { name: "Priya S.", area: "Leduc", service: "The Aura", text: "I have sensitive teeth so I was nervous. The sensitivity screening and her aftercare tips made it completely stress-free. Already planning my next visit." },
      { name: "Megan T.", area: "Edmonton", service: "The Lumina", text: "Booked The Lumina before my sister’s wedding. Both appointments were at home, and the difference in photos was honestly amazing." },
      { name: "Alyssa K.", area: "Edmonton", service: "Bride & Bridesmaids", text: "We did the bridal party the morning of my bachelorette — such a fun, glowy way to start the weekend. Everyone loved it!" },
      { name: "Jasmine L.", area: "Beaumont", service: "The Aura", text: "No waiting room, no driving across town. She came to me after work and it felt like a little spa evening at home." }
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
  // Square opens on her booking flow with the experience chosen and, given a
  // day, the calendar already on that day (her booking app reads these).
  function squareUrl(key, ymd) {
    if (!SERVICES[key]) return CONFIG.booking;
    var ids = svcIds(key);
    return CONFIG.booking + "?service_id=" + ids.service + "&variation_id=" + ids.variation + (ymd ? "&date=" + ymd : "");
  }
  // Every "Book" button leads to the calendar on this page (the HTML keeps
  // her Square link for anyone without JavaScript).
  $$("[data-book]").forEach(function (a) { a.setAttribute("href", "#reserve"); a.removeAttribute("target"); a.removeAttribute("rel"); });
  $$("[data-square]").forEach(function (a) { a.href = CONFIG.booking; });
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

  function goTo(target) {
    var el = typeof target === "string" ? $(target) : target;
    if (!el) return;
    var off = -hdrH() - 8;
    if (el.id === "top") { if (lenis) lenis.scrollTo(0, { duration: 1.6 }); else window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); return; }
    // An absolute target from the page's layout: Lenis's own idea of the scroll
    // position goes stale after a jump it didn't make (find-in-page, a focus),
    // and a box still mid fade-up would be measured 30px low.
    var y = 0, n = el;
    while (n) { y += n.offsetTop; n = n.offsetParent; }
    y += off;
    if (lenis) lenis.scrollTo(y, { duration: 1.6, easing: function (x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; } });
    else window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
  }
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
    goTo(id);
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

  /* ───────────────────────── ribbon (scrolls a box — see notes on iOS) ───────────────────────── */
  var ribbon = $("[data-ribbon]");
  if (ribbon) {
    var group = doc.createElement("div"); group.className = "ribbon-group";
    while (ribbon.firstChild) group.appendChild(ribbon.firstChild);
    ribbon.appendChild(group);
    ribbon.classList.add("is-grouped");
    var fill = function () {
      while (ribbon.scrollWidth < group.offsetWidth + window.innerWidth * 1.5 && ribbon.children.length < 8) ribbon.appendChild(group.cloneNode(true));
    };
    fill(); window.addEventListener("resize", fill);
    if (!reduce) {
      var rOn = true, lastT = performance.now(), boost = 0, lastY = window.scrollY, pos = 0;
      if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { rOn = es[0].isIntersecting; }).observe(ribbon);
      (function tick(t) {
        var dt = Math.min(64, t - lastT); lastT = t;
        var y = window.scrollY; boost = boost * 0.92 + Math.min(600, Math.abs(y - lastY)) * 0.6; lastY = y;
        if (rOn) {
          pos += (36 + boost) * dt / 1000;
          var w = group.offsetWidth;
          if (w && pos >= w) pos -= w;
          ribbon.scrollLeft = pos;
        }
        requestAnimationFrame(tick);
      })(lastT);
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
    note.textContent = on ? PICK_NOTE[key] + " Ysabel confirms the right choice at your consultation." : NOTE0;
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
     Pick an experience, a day and (when her Square is connected) a time, then
     continue to Square with all of it chosen. Square takes the deposit.

     Live free times come from /api/lunera/availability (worker/lunera), which
     reads Square's Bookings API with her token. Until that token is set the
     endpoint says so, and the calendar shows her published hours for each
     day instead — Square then shows that day's free times on the next step.
     Nothing on this calendar ever claims a time is free unless Square said so. */
  var cal = (function () {
    var root = $("[data-cal]");
    if (!root) return null;
    var TZ = "America/Edmonton", AHEAD = 5; // months viewable after this one
    var grid = $("[data-cal-grid]", root), title = $("[data-cal-title]", root);
    var prevB = $("[data-cal-prev]", root), nextB = $("[data-cal-next]", root);
    var expsBox = $("[data-cal-exps]", root), dayBox = $("[data-cal-day]", root), step3 = $("[data-cal-step3]", root);
    var go = $("[data-cal-go]", root), goLabel = $("[data-cal-go-label]", root), fine = $("[data-cal-fine]", root);
    var S = { exp: null, view: null, day: null, time: null, live: null };
    var feeds = {};          // "variation|from" → { state: "loading"|"ok"|"fail", byDay: { ymd: [iso…] } }

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
    function slotTime(iso) { return timeFmt.format(new Date(iso)); }

    var now = nowParts(), today = ymd(now.y, now.m, now.d), first = { y: now.y, m: now.m };
    S.view = { y: now.y, m: now.m };

    /* A day can be asked for when it is still ahead, or today with an hour left. */
    function open(s) {
      if (s < today) return false;
      if (s > today) return true;
      return now.mins < HOURS[dow(s)][1] - 60;
    }
    function evening(s) { return HOURS[dow(s)][0] >= 15 * 60; }

    /* — live free times — */
    function feedKey() {
      if (!S.exp || S.live === false) return null;
      var v = S.view, from = cmpView(v, first) === 0 ? today : ymd(v.y, v.m, 1);
      return svcIds(S.exp).variation + "|" + from;
    }
    function feed() { var k = feedKey(); return k ? feeds[k] : null; }
    function load() {
      var k = feedKey();
      if (!k || feeds[k]) return;
      var parts = k.split("|"), f = feeds[k] = { state: "loading", byDay: {} };
      fetch("/api/lunera/availability?variation=" + parts[0] + "&from=" + parts[1] + "&days=31", { headers: { Accept: "application/json" } })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (j) {
          if (!j || j.live !== true || !Array.isArray(j.slots)) throw new Error("not live");
          j.slots.forEach(function (iso) { var d = slotDay(iso); (f.byDay[d] = f.byDay[d] || []).push(iso); });
          f.state = "ok"; S.live = true;
        })
        .catch(function () { f.state = "fail"; if (S.live !== true) S.live = false; })
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

    function choose(key, fromList) {
      if (!SERVICES[key]) return;
      if (S.exp !== key) S.time = null;
      S.exp = key;
      $$(".cal-x", expsBox).forEach(function (l) {
        var on = l.getAttribute("data-x") === key;
        l.classList.toggle("is-on", on); $("input", l).checked = on;
      });
      load(); render();
      if (fromList && !S.day && innerWidth < 961) nudge($(".cal-month", root));
    }

    /* — rendering — */
    function render() {
      var v = S.view, f = feed(), liveNow = f && f.state === "ok", loading = f && f.state === "loading";
      title.textContent = fmtDay(ymd(v.y, v.m, 1), { month: "long", year: "numeric" });
      prevB.disabled = cmpView(v, first) <= 0;
      nextB.disabled = cmpView(v, addMonths(first, AHEAD)) >= 0;
      root.classList.toggle("is-live", S.live === true);
      grid.classList.toggle("is-loading", !!loading);

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

    function renderDay(f, liveNow, loading) {
      step3.textContent = S.live === true ? "Choose a time" : "Your day";
      if (!S.day) {
        dayBox.innerHTML = '<p class="cal-empty">' + (S.exp ? "Pick a day on the calendar." : "Choose your experience, then pick a day on the calendar.") + "</p>";
        return;
      }
      var h = HOURS[dow(S.day)], out = '<h4 class="cal-dname">' + longDay(S.day) + "</h4>";
      out += '<p class="cal-hours"><svg class="ic"><use href="#i-' + (evening(S.day) ? "moon" : "sun") + '"/></svg>Ysabel’s hours <b>' + fmtMins(h[0]) + " – " + fmtMins(h[1]) + "</b></p>";
      // her working window on an 8 a.m. – 10 p.m. line
      var L = 480, R = 1320, a = (h[0] - L) / (R - L) * 100, w = (h[1] - h[0]) / (R - L) * 100;
      out += '<div class="cal-line" aria-hidden="true"><i style="left:' + a.toFixed(1) + "%;width:" + w.toFixed(1) + '%"></i>' +
        "<span style=\"left:7.1%\">9a</span><span style=\"left:28.6%\">12p</span><span style=\"left:50%\">3p</span><span style=\"left:71.4%\">6p</span><span style=\"left:92.9%\">9p</span></div>";
      if (loading) {
        out += '<div class="cal-slots is-skel" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>';
      } else if (liveNow) {
        var slots = f.byDay[S.day] || [];
        if (slots.length) {
          var groups = { Morning: [], Afternoon: [], Evening: [] };
          slots.forEach(function (iso) { var hr = +hourFmt.format(new Date(iso)) % 24; groups[hr < 12 ? "Morning" : hr < 17 ? "Afternoon" : "Evening"].push(iso); });
          Object.keys(groups).forEach(function (g) {
            if (!groups[g].length) return;
            out += '<p class="cal-g">' + g + '</p><div class="cal-slots">' + groups[g].map(function (iso) {
              return '<button type="button" class="cal-t' + (iso === S.time ? " is-on" : "") + '" data-iso="' + iso + '" aria-pressed="' + (iso === S.time) + '">' + slotTime(iso) + "</button>";
            }).join("") + "</div>";
          });
        } else {
          var next = Object.keys(f.byDay).filter(function (k) { return k > S.day && f.byDay[k].length; }).sort()[0];
          out += '<p class="cal-note">Fully booked on this day.' + (next ? "" : " Try the next month, or text Ysabel — she may be able to fit you in.") + "</p>";
          if (next) out += '<button type="button" class="btn btn-ghost btn-sm cal-next" data-goto="' + next + '"><span>Next free day: ' + shortDay(next) + '</span><svg class="ic"><use href="#i-arrow"/></svg></button>';
        }
      } else {
        out += '<p class="cal-note">Square shows the times still free on ' + shortDay(S.day) + " on the next step, with your experience already chosen.</p>";
      }
      dayBox.innerHTML = out;
    }

    function renderSum(liveNow) {
      var e = S.exp && SERVICES[S.exp], price = e ? svcPrice(S.exp) : 0;
      $("[data-sum-exp]", root).textContent = e ? e.name + " · $" + price + (price !== e.price ? " (reg. $" + e.price + ")" : "") : "—";
      $("[data-sum-day]", root).textContent = S.day ? shortDay(S.day) : "—";
      var tRow = $("[data-sum-time-row]", root);
      tRow.hidden = !(S.live === true);
      $("[data-sum-time]", root).textContent = S.time ? slotTime(S.time) : "—";
      $("[data-sum-dep]", root).textContent = e ? "$" + (price * 0.2).toFixed(2) + " (20%)" : "20% of your total";

      var ready = !!(S.exp && S.day && (!liveNow || S.time)), label, note;
      if (!S.exp) { label = "Choose your experience"; note = "Secure booking and deposit by Square. Travel fee by distance is added to your total."; }
      else if (!S.day) { label = "Choose a day"; note = "Secure booking and deposit by Square. Travel fee by distance is added to your total."; }
      else if (liveNow && !S.time) { label = "Choose a time"; note = "Times shown are free right now in Ysabel’s Square calendar (Mountain Time)."; }
      else if (liveNow) {
        label = "Secure " + slotTime(S.time) + " on Square";
        note = "Square opens on " + shortDay(S.day) + " with " + e.name + " ready — tap Add, then Next, then " + slotTime(S.time) + " Your 20% deposit is paid there; the travel fee is added to your total.";
      } else {
        label = "See free times & book";
        note = "Square opens on " + shortDay(S.day) + " with " + e.name + " ready — tap Add, then Next, to choose your time. Your 20% deposit is paid there; the travel fee is added to your total.";
      }
      goLabel.textContent = label;
      fine.textContent = note;
      go.classList.toggle("is-wait", !ready);
      go.setAttribute("aria-disabled", ready ? "false" : "true");
      go.href = ready ? squareUrl(S.exp, S.day) : "#reserve";
      if (ready) { go.target = "_blank"; go.rel = "noopener"; } else { go.removeAttribute("target"); go.removeAttribute("rel"); }
    }

    function nudge(el) {
      if (!el) return;
      var r = el.getBoundingClientRect();
      if (r.top < hdrH() || r.top > innerHeight * 0.72) goTo(el);
    }

    /* — events — */
    prevB.addEventListener("click", function () { S.view = addMonths(S.view, -1); load(); render(); });
    nextB.addEventListener("click", function () { S.view = addMonths(S.view, 1); load(); render(); });
    grid.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-ymd]"); if (!b || b.disabled) return;
      if (S.day !== b.getAttribute("data-ymd")) S.time = null;
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
      var t = e.target.closest("[data-iso]"), g = e.target.closest("[data-goto]");
      if (t) { S.time = t.getAttribute("data-iso"); render(); var again = $('[data-iso="' + S.time + '"]', dayBox); if (again) again.focus({ preventScroll: true }); }
      if (g) {
        var p = parse(g.getAttribute("data-goto"));
        S.day = g.getAttribute("data-goto"); S.time = null;
        if (p.y !== S.view.y || p.m !== S.view.m) { S.view = { y: p.y, m: p.m }; load(); }
        render();
      }
    });
    go.addEventListener("click", function (e) {
      if (go.getAttribute("aria-disabled") !== "true") return;
      e.preventDefault(); e.stopPropagation();
      var target = !S.exp ? $(".cal-pick", root) : !S.day ? $(".cal-month", root) : $(".cal-day", root);
      target.classList.remove("is-ask"); void target.offsetWidth; target.classList.add("is-ask");
      if (innerWidth < 961) nudge(target);
      var f = !S.exp ? $("input", expsBox) : !S.day ? $("button[data-ymd]:not([disabled])", grid) : $("[data-iso]", dayBox);
      if (f) f.focus({ preventScroll: innerWidth >= 961 });
    });

    render();
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
        ? "Your enquiry is with Ysabel — she’ll reply by " + d.reply.toLowerCase() + " as soon as she can."
        : "Your message is written and ready. Send it to Ysabel whichever way suits you — nothing has been sent yet.";
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

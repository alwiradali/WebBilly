/* ==========================================================================
   Westfield Garage — page behaviour

   Everything the client will want to change lives in CONFIG at the top: the
   phone number, the WhatsApp number, the email, the three social links and
   the Google review links. Nothing below CONFIG needs editing to go live.

   Scroll reveals are the shared data-fx toolkit (assets/js/scroll-fx.js), per
   the house convention. This file adds only what the toolkit does not do:
   Lenis smooth scroll, the nav, the pinned process sequence, the counters,
   the lightbox, the opening-hours clock and the two forms.
   ========================================================================== */
(function () {
  "use strict";

  /* ----------------------------------------------------------- CONFIG --- */
  var CONFIG = {
    /* From his signage. tel: wants no spaces; WhatsApp wants the international
       form with no plus and no leading zero. */
    phone:        "07949 859112",
    phoneDial:    "+447949859112",
    whatsapp:     "447949859112",
    email:        "westfieldgarage45@gmail.com",

    /* --- LINKS TO SWAP BEFORE GOING LIVE -------------------------------
       These are placeholders. Paste the garage's real profile URLs in and
       every button, card and footer icon on the page follows automatically.
       Leave one blank ("") and its button is removed rather than pointing
       nowhere. ------------------------------------------------------------ */
    facebook:     "https://www.facebook.com/",
    instagram:    "https://www.instagram.com/",
    google:       "https://www.google.com/maps",       /* the Business Profile */
    googleReview: "https://search.google.com/local/writereview?placeid=",

    /* Optional: a POST endpoint for the enquiry forms. Left empty, the forms
       hand off to WhatsApp with the enquiry pre-written, and offer email as
       the alternative — which needs no server and no secrets. */
    endpoint:     ""
  };
  window.WESTFIELD = CONFIG;

  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $  = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || doc).querySelectorAll(s)); };

  /* ------------------------------------------------- 1. contact details --
     Written into the page from CONFIG so the number lives in exactly one
     place. data-wf="tel|dial|wa|mail|fb|ig|google|review" marks the targets. */
  function waLink(text) {
    return "https://wa.me/" + CONFIG.whatsapp +
           (text ? "?text=" + encodeURIComponent(text) : "");
  }
  function applyConfig() {
    $$("[data-wf]").forEach(function (el) {
      var k = el.getAttribute("data-wf");
      if (k === "tel")    { el.textContent = CONFIG.phone; }
      if (k === "dial")   { el.setAttribute("href", "tel:" + CONFIG.phoneDial); }
      if (k === "wa")     { el.setAttribute("href", waLink(el.getAttribute("data-wf-text") || ""));
                            el.setAttribute("target", "_blank");
                            el.setAttribute("rel", "noopener"); }
      if (k === "mail")   { el.setAttribute("href", "mailto:" + CONFIG.email);
                            if (el.hasAttribute("data-wf-fill")) el.textContent = CONFIG.email; }
      if (k === "fb")     { link(el, CONFIG.facebook); }
      if (k === "ig")     { link(el, CONFIG.instagram); }
      if (k === "google") { link(el, CONFIG.google); }
      if (k === "review") { link(el, CONFIG.googleReview); }
    });
    var y = $("#yr"); if (y) y.textContent = new Date().getFullYear();
  }
  /* An unset social link would otherwise ship as a button that goes nowhere,
     which is worse than not having the button. */
  function link(el, href) {
    if (!href) { el.remove(); return; }
    el.setAttribute("href", href);
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noopener");
  }

  /* ------------------------------------------------- 2. smooth scrolling --
     Lenis drives the wheel. If it is missing or the visitor asked for less
     motion, the page falls back to the browser's own smooth anchor scrolling
     (see html.no-lenis in the stylesheet). */
  var lenis = null;
  function smoothScroll() {
    if (reduce || typeof window.Lenis === "undefined") { root.classList.add("no-lenis"); return; }
    lenis = new window.Lenis({
      lerp: 0.1,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
      smoothWheel: true
    });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
  }
  function scrollTo(target) {
    var el = typeof target === "string" ? $(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -74, duration: 1.15 });
    else el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }
  doc.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href");
    if (id.length < 2 || !$(id)) return;
    e.preventDefault();
    closeDrawer();
    scrollTo(id);
  });

  /* ------------------------------------------------------------ 3. nav --- */
  var nav = $("#nav"), burger = $("#burger"), drawer = $("#drawer");
  function closeDrawer() {
    if (!drawer || !drawer.classList.contains("on")) return;
    drawer.classList.remove("on");
    burger.setAttribute("aria-expanded", "false");
    doc.body.style.overflow = "";
    if (lenis) lenis.start();
  }
  if (burger && drawer) {
    burger.addEventListener("click", function () {
      var open = drawer.classList.toggle("on");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      doc.body.style.overflow = open ? "hidden" : "";
      if (lenis) { open ? lenis.stop() : lenis.start(); }
      /* stagger the links in behind the panel */
      $$("a", drawer).forEach(function (a, i) {
        a.style.transitionDelay = open ? (0.06 + i * 0.045) + "s" : "0s";
      });
    });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });
  }

  /* -------------------------------- 4. scroll-driven chrome (one handler) --
     The nav background, the WhatsApp button and the pinned step sequence all
     read the same scroll position, so they share one rAF-throttled pass
     rather than three listeners fighting for frames. */
  var fab = $("#wafab"), steps = $("#steps"), ticking = false;
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  function frame() {
    ticking = false;
    var y = window.pageYOffset || root.scrollTop;
    if (nav) nav.classList.toggle("stuck", y > 40);
    if (fab) fab.classList.toggle("on", y > 520);
    driveSteps();
  }

  /* --------------------------------------- 5. the pinned process sequence --
     The section is tagged data-fx="pin", so the toolkit keeps --fx-progress
     (0 → 1) up to date on it. All this does is turn that number into "which
     of the four steps is showing". */
  var stepEls = [], railEls = [];
  function driveSteps() {
    if (!steps || !stepEls.length) return;
    var p = parseFloat(getComputedStyle(steps).getPropertyValue("--fx-progress")) || 0;
    /* Spread the four steps across the middle of the scroll so the first one
       is readable on arrival and the last does not vanish before the section
       releases. */
    var i = Math.min(stepEls.length - 1, Math.max(0, Math.floor(p * stepEls.length * 1.02)));
    stepEls.forEach(function (el, n) { el.classList.toggle("on", n === i); });
    railEls.forEach(function (el, n) { el.classList.toggle("done", n <= i); });
  }

  /* ------------------------------------------------------- 6. counters --- */
  function counters() {
    var els = $$("[data-count]");
    if (!els.length) return;
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.textContent = el.getAttribute("data-count"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        run(en.target);
      });
    }, { threshold: 0.4 });
    els.forEach(function (el) { io.observe(el); });

    function run(el) {
      var to = parseFloat(el.getAttribute("data-count")) || 0;
      var dp = (el.getAttribute("data-count").split(".")[1] || "").length;
      var t0 = null, dur = 1500;
      (function step(t) {
        if (t0 === null) t0 = t;
        var k = Math.min(1, (t - t0) / dur);
        var e = 1 - Math.pow(1 - k, 4);                   /* quart-out */
        el.textContent = (to * e).toFixed(dp);
        if (k < 1) requestAnimationFrame(step);
        else el.textContent = to.toFixed(dp);
      })(performance.now());
    }
  }

  /* ------------------------------------------------------- 7. marquee ---
     Duplicated in JS rather than in the markup so the strip reads once to a
     screen reader and the CSS can translate a clean -50%. */
  function marquee() {
    $$(".mq-track").forEach(function (tr) {
      var copy = tr.firstElementChild.cloneNode(true);
      copy.setAttribute("aria-hidden", "true");
      tr.appendChild(copy);
    });
  }

  /* ------------------------------------------------------ 8. lightbox --- */
  function lightbox() {
    var lb = $("#lb"); if (!lb) return;
    var img = $("#lbi", lb), cap = $("#lbc", lb);
    var figs = $$("#gal figure"), i = 0;
    if (!figs.length) return;

    function show(n) {
      i = (n + figs.length) % figs.length;
      var f = figs[i], source = $("img", f);
      img.src = source.getAttribute("data-full") || source.src;
      img.alt = source.alt || "";
      cap.textContent = ($("figcaption", f) || {}).textContent || "";
    }
    var opener = null;
    function open(n) {
      opener = doc.activeElement;
      show(n); lb.classList.add("on"); doc.body.style.overflow = "hidden";
      if (lenis) lenis.stop();
      /* The dialog is visibility:hidden until the class lands, and nothing
         inside a hidden subtree can take focus — so move focus on the next
         frame, once the style has actually applied. */
      requestAnimationFrame(function () { $(".x", lb).focus(); });
    }
    function close() {
      lb.classList.remove("on"); doc.body.style.overflow = "";
      if (lenis) lenis.start();
      /* hand focus back to the thumbnail that opened it, so keyboard users
         carry on from where they were rather than at the top of the page */
      if (opener && opener.focus) opener.focus();
      opener = null;
    }
    figs.forEach(function (f, n) {
      f.setAttribute("tabindex", "0");
      f.setAttribute("role", "button");
      f.addEventListener("click", function () { open(n); });
      f.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(n); }
      });
    });
    $(".x", lb).addEventListener("click", close);
    $(".p", lb).addEventListener("click", function () { show(i - 1); });
    $(".n", lb).addEventListener("click", function () { show(i + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    doc.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("on")) return;
      if (e.key === "Escape")     close();
      if (e.key === "ArrowLeft")  show(i - 1);
      if (e.key === "ArrowRight") show(i + 1);
    });
  }

  /* ------------------------------------------------- 9. opening hours ----
     The hours table is the source of truth: each row carries data-open and
     data-close in 24h minutes, so "open now" can never drift out of step
     with what the page says. */
  function hours() {
    var rows = $$("#hours .row[data-day]");
    var pill = $("#openNow");
    if (!rows.length || !pill) return;
    var now  = new Date();
    var day  = now.getDay();                       /* 0 = Sunday */
    var mins = now.getHours() * 60 + now.getMinutes();
    var open = false, todayRow = null;

    rows.forEach(function (r) {
      var days = r.getAttribute("data-day").split(",").map(Number);
      if (days.indexOf(day) === -1) return;
      todayRow = r;
      r.classList.add("now");
      var o = parseInt(r.getAttribute("data-open"), 10);
      var c = parseInt(r.getAttribute("data-close"), 10);
      if (!isNaN(o) && !isNaN(c) && mins >= o && mins < c) open = true;
    });

    pill.className = "open-pill " + (open ? "yes" : "no");
    pill.innerHTML = "<i></i>" + (open ? "Open now" : "Closed now");
    if (!open) {
      var next = todayRow && todayRow.getAttribute("data-open");
      var label = todayRow && mins < parseInt(next, 10)
        ? "Opens " + fmt(parseInt(next, 10)) + " today"
        : "Call or WhatsApp any time";
      var hint = $("#openHint"); if (hint) hint.textContent = label;
    }
    function fmt(m) {
      var h = Math.floor(m / 60), n = m % 60;
      return h + (n ? ":" + String(n).padStart(2, "0") : "") + (h < 12 ? "am" : "pm");
    }
  }

  /* --------------------------------------------------------- 10. forms ---
     Two forms, one code path. Both validate in the page, then either POST to
     CONFIG.endpoint or hand the written-out enquiry to WhatsApp. Nothing is
     ever silently lost: if the POST fails, the WhatsApp handoff still runs. */
  function forms() {
    $$("form[data-enquiry]").forEach(function (f) {
      var msg = $(".formmsg", f);
      var btn = $("button[type=submit]", f);
      var label = btn ? btn.textContent : "Send";

      function say(text, kind) {
        if (!msg) return;
        msg.textContent = text;
        msg.className = "formmsg on " + kind;
      }
      function reset() { if (btn) { btn.disabled = false; btn.textContent = label; } }

      f.addEventListener("submit", function (e) {
        e.preventDefault();
        if (f.botcheck && f.botcheck.value) return;      /* honeypot */

        /* --- validate --- */
        var bad = null;
        $$("[required]", f).forEach(function (el) {
          var empty = !el.value.trim();
          el.setAttribute("aria-invalid", empty ? "true" : "false");
          if (empty && !bad) bad = el;
        });
        var em = f.email && f.email.value.trim();
        if (!bad && em && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) {
          f.email.setAttribute("aria-invalid", "true");
          bad = f.email;
        }
        if (bad) {
          bad.focus();
          say("Please fill in the fields marked * so we can get back to you.", "err");
          return;
        }

        /* --- collect, in the order a human would want to read it --- */
        var data = {}, lines = ["New enquiry — Westfield Garage website", ""];
        $$("input,select,textarea", f).forEach(function (el) {
          if (!el.name || el.name === "botcheck" || !el.value.trim()) return;
          /* the reg field is upper-cased in CSS, which is presentation only —
             without this the plate reaches us as the visitor typed it */
          var v = el.value.trim();
          if (el.name === "reg") v = v.toUpperCase();
          data[el.name] = v;
          var nice = el.getAttribute("data-label") ||
                     el.name.charAt(0).toUpperCase() + el.name.slice(1);
          lines.push(nice + ": " + v);
        });
        var text = lines.join("\n");

        if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }

        function handoff() {
          say("Opening WhatsApp with your details so it reaches us straight away — "
              + "or call " + CONFIG.phone + ".", "ok");
          window.open(waLink(text), "_blank", "noopener");
          reset();
        }

        if (!CONFIG.endpoint) { handoff(); return; }

        fetch(CONFIG.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        })
          .then(function (r) { return r.ok ? r.json() : Promise.reject(r); })
          .then(function () {
            f.reset();
            $$("[aria-invalid]", f).forEach(function (el) { el.setAttribute("aria-invalid", "false"); });
            say("Thanks " + (data.name || "").split(" ")[0] +
                " — that's come through. We'll be in touch shortly. If it's urgent, ring "
                + CONFIG.phone + ".", "ok");
            reset();
          })
          .catch(handoff);
      });

      /* clear the red ring as soon as they start fixing it */
      f.addEventListener("input", function (e) {
        if (e.target.getAttribute("aria-invalid") === "true" && e.target.value.trim()) {
          e.target.setAttribute("aria-invalid", "false");
        }
      });
    });
  }

  /* ------------------------------------------------------------- start --- */
  function init() {
    applyConfig();
    smoothScroll();
    marquee();
    counters();
    lightbox();
    hours();
    forms();

    stepEls = $$("#steps .step");
    railEls = $$("#steps .step-rail i");
    if (stepEls.length) stepEls[0].classList.add("on");

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    frame();
  }

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init);
  else init();
})();

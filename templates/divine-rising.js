/* ============================================================
   DIVINE RISING — page interactions
   Chakra journey scrub, schedule tabs, membership toggle,
   testimonial slider, booking modal, newsletter, burger nav.
   atelier.js supplies cursor / loader / reveals / h-scroll.
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGSAP = window.gsap && window.ScrollTrigger;

  // shared bridge read by divine-gl.js every frame
  var BRIDGE = (window.DIVINE = window.DIVINE || { hue: null });

  /* ---------- page progress bar ---------- */
  var pbar = document.querySelector(".page-progress i");
  function progress () {
    if (!pbar) return;
    var h = document.documentElement.scrollHeight - innerHeight;
    pbar.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + "%";
  }
  addEventListener("scroll", progress, { passive: true });
  progress();

  /* ---------- footer year ---------- */
  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- smooth anchors via the shared Lenis instance ---------- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var target = document.querySelector(a.getAttribute("href"));
    if (!target) return;
    if (window.__lenis) {
      e.preventDefault();
      window.__lenis.scrollTo(target, { offset: -64, duration: 1.4 });
    }
    if (document.body.classList.contains("nav-open")) closeNav();
  });

  /* ---------- burger nav ---------- */
  var burger = document.getElementById("burger");
  function closeNav () {
    document.body.classList.remove("nav-open");
    if (burger) { burger.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); }
  }
  if (burger) burger.addEventListener("click", function () {
    var open = document.body.classList.toggle("nav-open");
    burger.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", String(open));
  });

  /* ---------- chakra journey ---------- */
  (function journey () {
    var section = document.querySelector(".journey");
    if (!section) return;
    var steps = section.querySelectorAll(".j-step");
    var dots = section.querySelectorAll(".j-dots i");
    var sanskrit = section.querySelector(".j-sanskrit");
    var bija = ["लं", "वं", "रं", "यं", "हं", "ॐ", "✦"];
    var current = -1;

    function setStep (i) {
      if (i === current) return;
      current = i;
      var hue = steps[i].getAttribute("data-hue");
      steps.forEach(function (s, k) { s.classList.toggle("is-on", k === i); });
      dots.forEach(function (d, k) { d.classList.toggle("is-on", k <= i); });
      if (sanskrit) sanskrit.textContent = bija[i];
      document.documentElement.style.setProperty("--jc", hue);
      BRIDGE.hue = hue;
    }
    setStep(0);

    if (!hasGSAP || reduce) { section.classList.add("static"); return; }
    ScrollTrigger.create({
      trigger: section, start: "top top", end: "+=520%",
      pin: true, scrub: 0.4,
      onUpdate: function (self) {
        setStep(Math.min(steps.length - 1, Math.floor(self.progress * steps.length)));
      },
      onLeave: function () { BRIDGE.hue = null; },
      onEnterBack: function () { BRIDGE.hue = steps[current].getAttribute("data-hue"); },
      onLeaveBack: function () { BRIDGE.hue = null; }
    });
  })();

  /* ---------- schedule tabs ---------- */
  (function schedule () {
    var tabs = document.querySelectorAll(".sched-tabs button");
    var days = document.querySelectorAll(".sched-day");
    if (!tabs.length) return;
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var day = tab.getAttribute("data-day");
        tabs.forEach(function (t) { t.classList.toggle("is-on", t === tab); t.setAttribute("aria-selected", String(t === tab)); });
        days.forEach(function (d) { d.classList.toggle("is-on", d.getAttribute("data-day") === day); });
        if (hasGSAP) ScrollTrigger.refresh();
      });
    });
  })();

  /* ---------- membership toggle ---------- */
  (function pricing () {
    var buttons = document.querySelectorAll(".price-toggle button");
    if (!buttons.length) return;
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var period = btn.getAttribute("data-period");
        buttons.forEach(function (b) { b.classList.toggle("is-on", b === btn); });
        document.querySelectorAll("[data-monthly]").forEach(function (el) {
          el.textContent = el.getAttribute(period === "yearly" ? "data-yearly" : "data-monthly");
        });
      });
    });
  })();

  /* ---------- client love slider ---------- */
  (function love () {
    var slides = document.querySelectorAll(".love-slide");
    if (!slides.length) return;
    var dots = document.querySelectorAll(".love-dots button");
    var idx = 0, timer = null;

    function show (i) {
      idx = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle("is-on", k === idx); });
      dots.forEach(function (d, k) { d.classList.toggle("is-on", k === idx); });
    }
    function auto () {
      clearInterval(timer);
      if (!reduce) timer = setInterval(function () { show(idx + 1); }, 6500);
    }
    var prev = document.querySelector(".love-btn.prev");
    var next = document.querySelector(".love-btn.next");
    if (prev) prev.addEventListener("click", function () { show(idx - 1); auto(); });
    if (next) next.addEventListener("click", function () { show(idx + 1); auto(); });
    dots.forEach(function (d, k) { d.addEventListener("click", function () { show(k); auto(); }); });
    auto();
  })();

  /* ---------- booking modal ---------- */
  (function booking () {
    var modal = document.getElementById("bookModal");
    if (!modal) return;
    var select = document.getElementById("bookClass");
    var form = document.getElementById("bookForm");
    var formWrap = modal.querySelector(".modal-form");
    var done = modal.querySelector(".modal-done");
    var lastFocus = null;

    function open (className) {
      lastFocus = document.activeElement;
      if (className && select) {
        var match = Array.prototype.find.call(select.options, function (o) { return o.text === className; });
        if (!match) { match = new Option(className, className); select.add(match, 0); }
        select.value = match.value;
      }
      formWrap.hidden = false; done.hidden = true;
      modal.hidden = false;
      document.body.style.overflow = "hidden";
      if (window.__lenis && window.__lenis.stop) window.__lenis.stop();
      var first = modal.querySelector("input");
      if (first) first.focus();
    }
    function close () {
      modal.hidden = true;
      document.body.style.overflow = "";
      if (window.__lenis && window.__lenis.start) window.__lenis.start();
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    document.addEventListener("click", function (e) {
      var opener = e.target.closest && e.target.closest("[data-book]");
      if (opener) { open(opener.getAttribute("data-class") || ""); return; }
      if (e.target.closest && e.target.closest("[data-close]")) close();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) close(); });

    if (form) form.addEventListener("submit", function (e) {
      e.preventDefault();
      formWrap.hidden = true; done.hidden = false;
    });
  })();

  /* ---------- newsletter (demo) ---------- */
  (function newsletter () {
    var form = document.querySelector(".newsletter");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = form.querySelector(".nl-ok");
      var input = form.querySelector("input");
      if (ok) ok.hidden = false;
      if (input) input.value = "";
    });
  })();

  /* ---------- nav sigil spins with page scroll ---------- */
  (function sigilSpin () {
    if (reduce) return;
    var svg = document.querySelector(".brand-sigil");
    if (!svg) return;
    addEventListener("scroll", function () {
      var h = document.documentElement.scrollHeight - innerHeight;
      svg.style.transform = "rotate(" + (h > 0 ? (scrollY / h) * 360 : 0) + "deg)";
    }, { passive: true });
  })();

  /* ---------- cursor star-dust (desktop only) ---------- */
  (function stardust () {
    if (reduce || !(window.matchMedia && matchMedia("(hover:hover) and (pointer:fine)").matches)) return;
    var pool = [], N = 18, i = 0, last = 0;
    for (var k = 0; k < N; k++) {
      var s = document.createElement("span");
      s.className = "sparkle"; s.setAttribute("aria-hidden", "true");
      document.body.appendChild(s); pool.push(s);
    }
    addEventListener("pointermove", function (e) {
      var now = performance.now();
      if (now - last < 80) return;
      last = now;
      var s = pool[i = (i + 1) % N];
      var sz = 5 + Math.random() * 5;
      s.style.width = s.style.height = sz + "px";
      s.style.left = e.clientX + (Math.random() - 0.5) * 14 + "px";
      s.style.top = e.clientY + (Math.random() - 0.5) * 14 + "px";
      s.style.setProperty("--dx", ((Math.random() - 0.5) * 60).toFixed(0) + "px");
      s.style.setProperty("--dy", (18 + Math.random() * 40).toFixed(0) + "px");
      s.classList.remove("go"); void s.offsetWidth; s.classList.add("go");
    }, { passive: true });
  })();

  /* ---------- everything below needs GSAP ---------- */
  if (!hasGSAP || reduce) return;

  /* split a heading into per-character units; <em>/<br> stay whole */
  function splitChars (el) {
    el.setAttribute("aria-label", el.textContent);
    (function walk (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split("").forEach(function (c) {
            if (/\s/.test(c)) { frag.appendChild(document.createTextNode(c)); return; }
            var s = document.createElement("span");
            s.className = "ch"; s.setAttribute("aria-hidden", "true"); s.textContent = c;
            frag.appendChild(s);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== "BR") {
          child.classList.add("ch");
          child.setAttribute("aria-hidden", "true");
        }
      });
    })(el);
    return el.querySelectorAll(".ch");
  }

  /* ---------- kinetic headings: chars rise on scroll, replay on re-entry ---------- */
  gsap.utils.toArray(
    "#classes .sec-head h2, #membership .sec-head h2, #events .sec-head h2, " +
    ".feature-copy h2, #love .sec-head h2, #journal .sec-head h2, .ig-head h2, .cta h2"
  ).forEach(function (h2) {
    gsap.killTweensOf(h2);
    h2.removeAttribute("data-fade");
    gsap.set(h2, { clearProps: "all", opacity: 1 });
    var chars = splitChars(h2);
    gsap.from(chars, {
      y: "0.75em", opacity: 0, rotate: function () { return gsap.utils.random(-9, 9); },
      duration: 0.9, ease: "power4.out", stagger: 0.018,
      scrollTrigger: { trigger: h2, start: "top 87%", toggleActions: "play none none reverse" }
    });
  });
  // journey heading sits inside the pin — trigger off the section instead
  (function () {
    var h2 = document.querySelector(".j-copy h2");
    if (!h2) return;
    var chars = splitChars(h2);
    gsap.from(chars, {
      y: "0.75em", opacity: 0, duration: 0.9, ease: "power4.out", stagger: 0.02,
      scrollTrigger: { trigger: ".journey", start: "top 65%", toggleActions: "play none none reverse" }
    });
  })();

  /* ---------- gold rule + shimmer sweeps ---------- */
  gsap.utils.toArray(".sec-head h2").forEach(function (h2) {
    ScrollTrigger.create({
      trigger: h2, start: "top 82%",
      onEnter: function () { h2.classList.add("rule-in", "shine"); },
      onLeaveBack: function () { h2.classList.remove("rule-in", "shine"); }
    });
  });
  gsap.utils.toArray(".j-copy h2, .cta h2, .manifesto p").forEach(function (el) {
    ScrollTrigger.create({
      trigger: el, start: "top 78%",
      onEnter: function () { el.classList.add("shine"); },
      onLeaveBack: function () { el.classList.remove("shine"); }
    });
  });
  setTimeout(function () {
    var h1 = document.querySelector(".hero h1");
    if (h1) h1.classList.add("shine");
  }, 2600);

  /* ---------- hero dissolves upward into the sky ---------- */
  gsap.to(".hero-inner", {
    y: -70, autoAlpha: 0, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "35% top", end: "95% top", scrub: true }
  });

  /* ---------- marquee reacts to scroll velocity ---------- */
  (function liveMarquee () {
    var row = document.querySelector(".marquee-in");
    if (!row) return;
    var vel = 0;
    if (window.__lenis) window.__lenis.on("scroll", function (e) { vel = e.velocity || 0; });
    var skewTo = gsap.quickTo(row, "skewX", { duration: 0.4, ease: "power2.out" });
    gsap.ticker.add(function () {
      var base = gsap.getTweensOf(row)[0];
      var v = gsap.utils.clamp(-14, 14, vel);
      skewTo(v * -0.55);
      if (base) base.timeScale(gsap.utils.interpolate(base.timeScale(), 1 + Math.min(Math.abs(v) / 5, 2.4), 0.08));
      vel *= 0.92;
    });
  })();

  /* ---------- 3D tilt + glare on cards ---------- */
  (function tilt () {
    if (!(window.matchMedia && matchMedia("(hover:hover) and (pointer:fine)").matches)) return;
    document.querySelectorAll(".price-card, .ev-card, .jr-card, .h-card").forEach(function (el) {
      el.classList.add("tilt");
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.transform = "perspective(900px) rotateX(" + ((y - 0.5) * -7).toFixed(2) + "deg) rotateY(" + ((x - 0.5) * 7).toFixed(2) + "deg) translateY(-6px)";
        el.style.setProperty("--gx", (x * 100).toFixed(1) + "%");
        el.style.setProperty("--gy", (y * 100).toFixed(1) + "%");
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  })();

  /* ---------- schedule + instagram staggers ---------- */
  gsap.from(".sched-day.is-on .row", {
    y: 22, opacity: 0, duration: 0.6, ease: "power3.out", stagger: 0.08,
    scrollTrigger: { trigger: ".sched", start: "top 80%" }
  });
  gsap.from(".ig-grid a", {
    y: 24, scale: 0.86, opacity: 0, duration: 0.8, ease: "power3.out", stagger: 0.07,
    scrollTrigger: { trigger: ".ig-grid", start: "top 86%" }
  });
  gsap.from(".foot-brand", {
    y: 34, opacity: 0, duration: 1, ease: "power3.out",
    scrollTrigger: { trigger: ".foot", start: "top 88%" }
  });

  /* rows animate again when a new day tab is picked */
  document.querySelectorAll(".sched-tabs button").forEach(function (tab) {
    tab.addEventListener("click", function () {
      gsap.fromTo(".sched-day.is-on .row",
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power3.out", stagger: 0.06, overwrite: true, clearProps: "transform,opacity" });
    });
  });

  ScrollTrigger.refresh();
})();

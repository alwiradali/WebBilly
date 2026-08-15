/* ============================================================
   HAIR BY ELLE — interactions, scroll film & booking flow.
   GSAP + ScrollTrigger + Lenis. Degrades gracefully: without
   the libs or with reduced motion, everything is visible and
   the booking flow still works start to finish.
   ============================================================ */
(function () {
  "use strict";

  /* One config object — everything Elle will ever need to change.
     TODO(elle): drop the WhatsApp number in E.164 form, e.g. "447700900000".
     While it's empty the send button uses WhatsApp's share flow instead. */
  var ELLE = {
    whatsapp: "",
    instagram: "https://www.instagram.com/hairbyelle21",
    services: { "hair ups": 20, "half up half down": 20, "curls / pin curls": 15 },
    hours: { weekday: { open: 14, close: 19 }, saturday: { open: 15, close: 19 } },
    lastStart: 18,
    weeksBookable: 8
  };

  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var touch = window.matchMedia && matchMedia("(hover: none)").matches;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);
  if (reduce || !hasGSAP) document.body.classList.add("no-motion");
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  /* ---------- wordmark letters (for the hand-set wobble + curtain) ---------- */
  document.querySelectorAll("[data-letters]").forEach(function (el) {
    var text = el.textContent;
    el.setAttribute("aria-label", text);
    el.textContent = "";
    text.split("").forEach(function (ch) {
      var s = document.createElement("span");
      s.className = "lt";
      s.setAttribute("aria-hidden", "true");
      s.innerHTML = ch === " " ? "&nbsp;" : ch;
      el.appendChild(s);
    });
  });

  /* ---------- curtain (first visit per session, ≤1.6s) ---------- */
  (function curtain() {
    var el = document.querySelector(".curtain");
    if (!el) return;
    var seen = false;
    try { seen = sessionStorage.getItem("hbe-curtain") === "1"; } catch (e) {}
    if (seen || reduce) { el.classList.add("gone"); return; }
    try { sessionStorage.setItem("hbe-curtain", "1"); } catch (e) {}
    var letters = el.querySelectorAll(".lt");
    letters.forEach(function (l, i) { l.style.transitionDelay = (i * 40) + "ms"; });
    requestAnimationFrame(function () { el.classList.add("in"); });
    setTimeout(function () { el.classList.add("lift"); }, 950);
    setTimeout(function () { el.classList.add("gone"); }, 1600);
  })();

  /* ---------- Lenis smooth scroll ---------- */
  var lenis = null;
  if (window.Lenis && !reduce && hasGSAP) {
    lenis = new Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href");
        var target = id.length > 1 && document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        closeMenu();
        lenis.scrollTo(target, { offset: 0, duration: 1.4 });
      });
    });
  }

  /* ---------- custom cursor + magnetic buttons ---------- */
  (function cursor() {
    if (touch) return;
    var dot = document.querySelector(".cursor"), ring = document.querySelector(".cursor-ring");
    if (!dot || !ring) return;
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener("pointermove", function (e) {
      mx = e.clientX; my = e.clientY;
      document.body.classList.add("cursor-on");
      dot.style.transform = "translate(" + mx + "px," + my + "px) translate(-50%,-50%)";
    }, { passive: true });
    (function loop() { rx += (mx - rx) * 0.14; ry += (my - ry) * 0.14; ring.style.transform = "translate(" + rx + "px," + ry + "px) translate(-50%,-50%)"; requestAnimationFrame(loop); })();
    document.querySelectorAll("a,button,.pick-card,.slot-card,label").forEach(function (el) {
      el.addEventListener("pointerenter", function () { dot.classList.add("hot"); ring.classList.add("hot"); });
      el.addEventListener("pointerleave", function () { dot.classList.remove("hot"); ring.classList.remove("hot"); });
    });
    if (!reduce) document.querySelectorAll(".magnetic").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2;
        el.style.transform = "translate(" + dx * 0.28 + "px," + dy * 0.34 + "px)";
      });
      el.addEventListener("pointerleave", function () {
        el.style.transition = "transform .5s cubic-bezier(.16,1,.3,1)";
        el.style.transform = "";
        setTimeout(function () { el.style.transition = ""; }, 500);
      });
    });
  })();

  /* ---------- nav solid + page progress + mobile book bar ---------- */
  var nav = document.querySelector(".nav");
  var progress = document.querySelector(".page-progress i");
  var bookbar = document.querySelector(".bookbar");
  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var max = document.documentElement.scrollHeight - innerHeight;
      var p = max > 0 ? scrollY / max : 0;
      if (nav) nav.classList.toggle("solid", scrollY > 40);
      if (progress) progress.style.transform = "scaleX(" + p + ")";
      if (bookbar) {
        var bookEl = document.getElementById("book");
        var inBook = bookEl && bookEl.getBoundingClientRect().top < innerHeight * 0.6;
        bookbar.classList.toggle("show", p > 0.4 && !inBook);
      }
    });
  }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- overlay menu (focus trap, Esc) ---------- */
  var menu = document.getElementById("menu");
  var menuBtn = document.querySelector(".menu-btn");
  var menuOpen = false, lastFocus = null;
  function openMenu() {
    if (!menu) return;
    menuOpen = true; lastFocus = document.activeElement;
    menu.hidden = false;
    requestAnimationFrame(function () { menu.classList.add("open"); });
    menu.querySelectorAll(".menu-links a span").forEach(function (s, i) { s.style.transitionDelay = (0.06 + i * 0.05) + "s"; });
    menuBtn.setAttribute("aria-expanded", "true");
    menuBtn.querySelector(".roll span").textContent = "close";
    menuBtn.querySelectorAll(".roll span")[1].textContent = "close";
    if (lenis) lenis.stop(); else document.body.style.overflow = "hidden";
    var first = menu.querySelector("a"); if (first) first.focus();
  }
  function closeMenu() {
    if (!menu || !menuOpen) return;
    menuOpen = false;
    menu.classList.remove("open");
    setTimeout(function () { if (!menuOpen) menu.hidden = true; }, 420);
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.querySelector(".roll span").textContent = "menu";
    menuBtn.querySelectorAll(".roll span")[1].textContent = "menu";
    if (lenis) lenis.start(); else document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  if (menuBtn) menuBtn.addEventListener("click", function () { menuOpen ? closeMenu() : openMenu(); });
  addEventListener("keydown", function (e) {
    if (!menuOpen) return;
    if (e.key === "Escape") closeMenu();
    if (e.key === "Tab") {
      var focusables = [menuBtn].concat([].slice.call(menu.querySelectorAll("a")));
      var i = focusables.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); focusables[focusables.length - 1].focus(); }
      else if (!e.shiftKey && i === focusables.length - 1) { e.preventDefault(); focusables[0].focus(); }
    }
  });
  if (menu) menu.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", closeMenu); });

  /* ---------- generic reveals + draw-ins ---------- */
  var revealables = document.querySelectorAll(".sec-label,.hours-title,.studio-copy h2,.studio-copy>p,.gal-intro,.book-head h2,.book-sub,.hours-note,.note-sign");
  if (!reduce && "IntersectionObserver" in window) {
    revealables.forEach(function (el) { el.classList.add("rv"); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("on"); io.unobserve(en.target); } });
    }, { threshold: 0.2 });
    revealables.forEach(function (el) { io.observe(el); });
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("on"); io2.unobserve(en.target); } });
    }, { threshold: 0.35 });
    document.querySelectorAll(".loc-card,.book-head,.hrow").forEach(function (el) { io2.observe(el); });
  } else {
    document.querySelectorAll(".loc-card,.book-head,.hrow").forEach(function (el) { el.classList.add("on"); });
  }

  /* ---------- image reveals (clip-path mask + settle) ---------- */
  (function imgReveals() {
    var imgs = document.querySelectorAll(".img-rv");
    if (!imgs.length) return;
    if (reduce || !("IntersectionObserver" in window)) { imgs.forEach(function (el) { el.classList.add("on"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("on"); io.unobserve(en.target); } });
    }, { threshold: 0.25 });
    imgs.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- gallery video: lazy load + play only near viewport ---------- */
  (function galVideo() {
    var vid = document.querySelector(".gal-motion video");
    if (!vid) return;
    var conn = navigator.connection || {};
    if (reduce || conn.saveData) return; /* poster only */
    var start = function () { vid.play().catch(function () {}); };
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { en.isIntersecting ? start() : vid.pause(); });
      }, { rootMargin: "200px" });
      io.observe(vid);
    } else start();
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") vid.pause();
    });
  })();

  /* ---------- hero: strand drain + centre fade on scroll ---------- */
  if (hasGSAP && !reduce) {
    ScrollTrigger.create({
      trigger: ".hero", start: "top top", end: "bottom top", scrub: true,
      onUpdate: function (self) {
        if (window.HBE_STRANDS) window.HBE_STRANDS.setScroll(self.progress);
        gsap.set(".hero-center", { y: self.progress * -70, opacity: 1 - self.progress * 1.25 });
        gsap.set(".scroll-cue", { opacity: 1 - self.progress * 3 });
      }
    });
  }

  /* ---------- services: pinned beats + curl morph + counters ---------- */
  (function services() {
    var section = document.querySelector(".services");
    var pinWrap = document.querySelector(".svc-pin");
    var beats = [].slice.call(document.querySelectorAll(".svc-beat"));
    var stepsDots = [].slice.call(document.querySelectorAll(".svc-steps li"));
    var main = document.querySelector(".curl-main"), hi = document.querySelector(".curl-hi"), dotEl = document.querySelector(".curl-dot");
    if (!section || !beats.length) return;

    beats.forEach(function (b) { b.querySelector(".lead").classList.add("draw"); });

    /* three parametric curl shapes, same sample count → clean interpolation */
    var N = 64;
    function shapeUp(u) { /* hair up: stem rising into a bun spiral */
      if (u < 0.38) { var v = u / 0.38; return [100 + Math.sin(v * Math.PI * 1.3) * 11, 248 - v * 118]; }
      var w = (u - 0.38) / 0.62, ang = w * Math.PI * 4.4 - Math.PI / 2, r = 36 * (1 - w * 0.72);
      return [100 + Math.cos(ang) * r, 92 + Math.sin(ang) * r * 0.85];
    }
    function shapeHalf(u) { /* half up half down: soft S-wave */
      return [100 + Math.sin(u * Math.PI * 2.15 + 0.4) * (24 + u * 20), 26 + u * 216];
    }
    function shapeCurl(u) { /* pin curl: tightening coil */
      var ang = u * Math.PI * 6.4, r = 10 + u * 40 * (1 - u * 0.35);
      return [100 + Math.cos(ang) * r, 138 + Math.sin(ang) * r * 0.82];
    }
    var shapes = [shapeUp, shapeHalf, shapeCurl];
    function sample(fn) { var pts = []; for (var i = 0; i <= N; i++) pts.push(fn(i / N)); return pts; }
    var sets = shapes.map(sample);
    var cur = sets[0].map(function (p) { return p.slice(); });
    function render() {
      if (!main) return;
      var d = "M" + cur.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" L");
      main.setAttribute("d", d); hi.setAttribute("d", d);
      var end = cur[cur.length - 1];
      dotEl.setAttribute("cx", end[0]); dotEl.setAttribute("cy", end[1]);
    }
    render();

    var active = -1, morph = null;
    function activate(idx) {
      if (idx === active) return;
      active = idx;
      beats.forEach(function (b, i) { b.classList.toggle("on", i === idx); });
      stepsDots.forEach(function (s, i) { s.classList.toggle("on", i === idx); });
      var beat = beats[idx];
      var lead = beat.querySelector(".lead");
      lead.classList.remove("on"); void lead.offsetWidth; lead.classList.add("on");
      /* price count-up */
      var priceEl = beat.querySelector(".price"), target = +priceEl.getAttribute("data-price");
      if (hasGSAP && !reduce) {
        var obj = { v: 0 };
        gsap.to(obj, { v: target, duration: 0.9, ease: "power3.out", onUpdate: function () { priceEl.textContent = "£" + Math.round(obj.v); } });
      }
      /* curl morph */
      if (hasGSAP && !reduce && main) {
        var from = cur.map(function (p) { return p.slice(); }), to = sets[idx];
        if (morph) morph.kill();
        var t = { p: 0 };
        morph = gsap.to(t, { p: 1, duration: 1.1, ease: "power3.inOut", onUpdate: function () {
          for (var i = 0; i <= N; i++) {
            cur[i][0] = from[i][0] + (to[i][0] - from[i][0]) * t.p;
            cur[i][1] = from[i][1] + (to[i][1] - from[i][1]) * t.p;
          }
          render();
        } });
      } else { cur = sets[idx].map(function (p) { return p.slice(); }); render(); }
    }

    if (hasGSAP && !reduce && matchMedia("(min-width:1024px)").matches) {
      section.classList.add("pinned");
      ScrollTrigger.create({
        trigger: section, start: "top top", end: "+=220%", pin: pinWrap, scrub: true,
        onUpdate: function (self) { activate(Math.min(2, Math.floor(self.progress * 3))); }
      });
      activate(0);
    } else {
      /* stacked: each beat reveals on entry */
      beats.forEach(function (b, i) { b.classList.add("on"); });
      if ("IntersectionObserver" in window && !reduce) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            var i = +en.target.getAttribute("data-beat");
            en.target.querySelector(".lead").classList.add("on");
            var priceEl = en.target.querySelector(".price"), tgt = +priceEl.getAttribute("data-price");
            if (hasGSAP) { var o = { v: 0 }; gsap.to(o, { v: tgt, duration: 0.9, ease: "power3.out", onUpdate: function () { priceEl.textContent = "£" + Math.round(o.v); } }); }
            io.unobserve(en.target);
          });
        }, { threshold: 0.5 });
        beats.forEach(function (b) { io.observe(b); });
      } else beats.forEach(function (b) { b.querySelector(".lead").classList.add("on"); });
    }
  })();

  /* ---------- hours rows fill via CSS vars ---------- */
  document.querySelectorAll(".hrow[data-open]").forEach(function (row) {
    row.querySelector(".hfill").parentElement.style.setProperty("--open", row.getAttribute("data-open"));
    row.querySelector(".hfill").parentElement.style.setProperty("--span", row.getAttribute("data-span"));
    row.querySelector(".hfill").style.left = "calc(" + row.getAttribute("data-open") + " * 100%)";
    row.querySelector(".hfill").style.width = "calc(" + row.getAttribute("data-span") + " * 100%)";
  });

  /* ---------- the note: word-by-word scrub ---------- */
  (function note() {
    var q = document.querySelector(".note-quote");
    if (!q) return;
    var text = q.textContent.trim();
    q.setAttribute("aria-label", text);
    q.textContent = "";
    text.split(/\s+/).forEach(function (w, i) {
      var s = document.createElement("span");
      s.className = "wd"; s.setAttribute("aria-hidden", "true"); s.textContent = w;
      q.appendChild(s); q.appendChild(document.createTextNode(" "));
    });
    var words = q.querySelectorAll(".wd");
    if (hasGSAP && !reduce) {
      ScrollTrigger.create({
        trigger: ".note", start: "top 75%", end: "center 45%", scrub: 0.4,
        onUpdate: function (self) {
          var upto = Math.floor(self.progress * words.length);
          words.forEach(function (w, i) { w.classList.toggle("on", i <= upto); });
        }
      });
    } else words.forEach(function (w) { w.classList.add("on"); });
  })();

  /* ---------- gallery: pinned horizontal (desktop) ---------- */
  (function gallery() {
    if (!hasGSAP || reduce || !matchMedia("(min-width:1024px)").matches) return;
    var track = document.querySelector(".gal-track"), pin = document.querySelector(".gal-pin");
    if (!track) return;
    var getDist = function () { return Math.max(0, track.scrollWidth - innerWidth + 100); };
    gsap.to(track, {
      x: function () { return -getDist(); }, ease: "none",
      scrollTrigger: { trigger: ".gallery", start: "top top", end: function () { return "+=" + getDist(); }, pin: pin, scrub: 0.6, invalidateOnRefresh: true }
    });
  })();

  /* ---------- scroll-velocity skew (barely perceptible) ---------- */
  if (hasGSAP && lenis && !reduce && !touch) {
    var skewTargets = document.querySelectorAll(".svc-name,.hours-title,.note-quote,.book-head h2");
    var setters = [].map.call(skewTargets, function (el) { return gsap.quickSetter(el, "skewY", "deg"); });
    var skew = 0;
    gsap.ticker.add(function () {
      var v = (lenis.velocity || 0) * 0.045;
      v = Math.max(-4, Math.min(4, v));
      skew += (v - skew) * 0.12;
      var s = Math.abs(skew) < 0.02 ? 0 : skew;
      setters.forEach(function (set) { set(s); });
    });
  }

  /* ============================================================
     BOOKING FLOW — service → date → time → details → confirm.
     Plain JS, keyboard friendly, no backend: hands off to
     WhatsApp with the booking pre-formatted. Swap point: replace
     buildMessage()/send handlers to wire Fresha/Booksy/Cal.com.
     ============================================================ */
  (function wizard() {
    var form = document.querySelector(".wizard");
    if (!form) return;
    var steps = [].slice.call(form.querySelectorAll(".wstep"));
    var progressEls = [].slice.call(form.querySelectorAll(".wiz-progress li"));
    var live = form.querySelector(".wiz-live");
    var state = { services: [], date: null, slot: null, customWhen: "" };
    var current = 0;

    function announce(msg) { if (live) live.textContent = msg; }
    function goto(idx) {
      current = idx;
      steps.forEach(function (s, i) { s.classList.toggle("on", i === idx); });
      progressEls.forEach(function (p, i) { p.classList.toggle("on", i <= idx); });
      var legend = steps[idx].querySelector("legend");
      if (legend) legend.focus();
      announce("Step " + (idx + 1) + " of 5");
      if (idx === 4) buildSummary();
    }

    /* step 1 — services + running total */
    var totalEl = form.querySelector(".wiz-total-val");
    var lastTotal = 0;
    function total() {
      return [].reduce.call(form.querySelectorAll('input[name="service"]:checked'), function (sum, el) { return sum + (+el.getAttribute("data-cost")); }, 0);
    }
    form.querySelectorAll('input[name="service"]').forEach(function (cb) {
      cb.addEventListener("change", function () {
        var t = total();
        if (hasGSAP && !reduce) {
          var o = { v: lastTotal };
          gsap.to(o, { v: t, duration: 0.5, ease: "power2.out", onUpdate: function () { totalEl.textContent = "£" + Math.round(o.v); } });
        } else totalEl.textContent = "£" + t;
        lastTotal = t;
      });
    });

    /* step 2 — calendar: next 8 weeks, Sundays + past days off */
    var cal = form.querySelector(".cal");
    var months = ["january","february","march","april","may","june","july","august","september","october","november","december"];
    var days = ["mon","tue","wed","thu","fri","sat","sun"];
    (function buildCal() {
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var limit = new Date(today); limit.setDate(limit.getDate() + ELLE.weeksBookable * 7);
      var start = new Date(today);
      var dow = (start.getDay() + 6) % 7; /* Monday = 0 */
      start.setDate(start.getDate() - dow);
      days.forEach(function (d) { var el = document.createElement("span"); el.className = "cal-wd"; el.textContent = d; cal.appendChild(el); });
      var d = new Date(start), lastMonth = -1;
      while (d <= limit) {
        if (d.getMonth() !== lastMonth && ((d.getDay() + 6) % 7) === 0 && d >= today) {
          lastMonth = d.getMonth();
          var m = document.createElement("p"); m.className = "cal-month"; m.textContent = months[lastMonth] + (lastMonth === 0 ? " " + d.getFullYear() : "");
          cal.appendChild(m);
          days.forEach(function (dd) { var el = document.createElement("span"); el.className = "cal-wd"; el.textContent = dd; cal.appendChild(el); });
        }
        var b = document.createElement("button");
        b.type = "button"; b.textContent = d.getDate();
        b.setAttribute("aria-pressed", "false");
        var isSun = d.getDay() === 0;
        var off = d < today || d > limit || isSun;
        if (isSun) b.classList.add("sun");
        if (off) { b.disabled = true; b.setAttribute("aria-label", d.toDateString() + (isSun ? " — Sundays unavailable" : " — unavailable")); }
        else {
          (function (dateCopy) {
            b.setAttribute("aria-label", dateCopy.toDateString());
            b.addEventListener("click", function () {
              cal.querySelectorAll("button[aria-pressed='true']").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
              b.setAttribute("aria-pressed", "true");
              state.date = dateCopy;
              buildSlots();
            });
          })(new Date(d));
        }
        cal.appendChild(b);
        d.setDate(d.getDate() + 1);
      }
    })();

    /* step 3 — slots from her real hours */
    var slotsWrap = form.querySelector(".slots");
    function buildSlots() {
      slotsWrap.innerHTML = "";
      if (!state.date) return;
      var sat = state.date.getDay() === 6;
      var open = sat ? ELLE.hours.saturday.open : ELLE.hours.weekday.open;
      for (var h = open; h <= ELLE.lastStart; h++) {
        var lbl = document.createElement("label"); lbl.className = "slot";
        var input = document.createElement("input");
        input.type = "radio"; input.name = "slot"; input.value = (h < 10 ? "0" : "") + h + ":00";
        var span = document.createElement("span"); span.className = "slot-card"; span.textContent = input.value;
        lbl.appendChild(input); lbl.appendChild(span); slotsWrap.appendChild(lbl);
      }
      var custom = form.querySelector('input[name="slot"][value="custom"]');
      if (custom) custom.checked = false;
    }

    /* validation per step */
    function validate(idx) {
      var step = steps[idx], hint = step.querySelector("legend .wiz-hint");
      step.classList.remove("wiz-err");
      if (idx === 0) {
        state.services = [].map.call(form.querySelectorAll('input[name="service"]:checked'), function (el) { return el.value; });
        if (!state.services.length) { hint.textContent = "pick at least one so i know what we're doing x"; step.classList.add("wiz-err"); return false; }
        return true;
      }
      if (idx === 1) {
        if (!state.date) { hint.textContent = "pick a day that suits you x"; step.classList.add("wiz-err"); return false; }
        return true;
      }
      if (idx === 2) {
        var chosen = form.querySelector('input[name="slot"]:checked');
        if (!chosen) { hint.textContent = "pick a time — or ask me for a custom one x"; step.classList.add("wiz-err"); return false; }
        state.slot = chosen.value;
        state.customWhen = form.querySelector(".custom-when").value.trim();
        if (state.slot === "custom" && !state.customWhen) { hint.textContent = "tell me roughly what time would suit you x"; step.classList.add("wiz-err"); return false; }
        return true;
      }
      if (idx === 3) {
        var ok = true;
        ["name", "phone"].forEach(function (n) {
          var input = form.querySelector('[name="' + n + '"]');
          var bad = !input.value.trim();
          input.classList.toggle("invalid", bad);
          if (bad) ok = false;
        });
        if (!ok) { hint.textContent = "just need your name and number x"; step.classList.add("wiz-err"); }
        return ok;
      }
      return true;
    }

    form.querySelectorAll(".wnext").forEach(function (btn) {
      btn.addEventListener("click", function () { if (validate(current)) goto(current + 1); });
    });
    form.querySelectorAll(".wback").forEach(function (btn) {
      btn.addEventListener("click", function () { goto(Math.max(0, current - 1)); });
    });
    form.addEventListener("submit", function (e) { e.preventDefault(); });

    /* confirm summary + WhatsApp handoff */
    var fmtDate = function (d) {
      return ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][d.getDay()] + " " + d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
    };
    function leadRow(label, val, cls) {
      return '<div class="lead ' + (cls || "") + '"><span class="lead-label">' + label + '</span><span class="dots"></span><span class="' + (cls ? "price" : "lead-val") + '">' + val + "</span></div>";
    }
    function buildSummary() {
      var box = form.querySelector(".summary");
      var rows = state.services.map(function (s) { return leadRow(s, "£" + ELLE.services[s]); }).join("");
      rows += leadRow("date", fmtDate(state.date));
      rows += leadRow("time", state.slot === "custom" ? "asking: " + esc(state.customWhen) : state.slot);
      var name = form.querySelector('[name="name"]').value.trim();
      var occasion = form.querySelector('[name="occasion"]').value;
      if (name) rows += leadRow("name", esc(name));
      if (occasion) rows += leadRow("occasion", occasion);
      rows += '<div class="lead sum-total"><span class="lead-label">total</span><span class="dots"></span><span class="price">£' + total() + "</span></div>";
      box.innerHTML = rows;
      var wa = form.querySelector(".wa-send");
      wa.href = waLink();
    }
    function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
    function buildMessage() {
      var lines = ["hi elle! i'd love to book in x", ""];
      lines.push("services: " + state.services.map(function (s) { return s + " (£" + ELLE.services[s] + ")"; }).join(" + "));
      lines.push("date: " + fmtDate(state.date));
      lines.push("time: " + (state.slot === "custom" ? "could we do a custom time? " + state.customWhen : state.slot));
      lines.push("name: " + form.querySelector('[name="name"]').value.trim());
      lines.push("phone: " + form.querySelector('[name="phone"]').value.trim());
      var hair = form.querySelector('[name="hair"]').value;
      var occasion = form.querySelector('[name="occasion"]').value;
      var notes = form.querySelector('[name="notes"]').value.trim();
      if (hair) lines.push("hair: " + hair);
      if (occasion) lines.push("occasion: " + occasion);
      if (notes) lines.push("notes: " + notes);
      lines.push("total: £" + total());
      return lines.join("\n");
    }
    function waLink() {
      var text = encodeURIComponent(buildMessage());
      return ELLE.whatsapp ? "https://wa.me/" + ELLE.whatsapp + "?text=" + text : "https://wa.me/?text=" + text;
    }
    var copyBtn = form.querySelector(".copy-send");
    if (copyBtn) copyBtn.addEventListener("click", function () {
      var msg = buildMessage();
      var done = function () { copyBtn.textContent = "copied — paste it to elle x"; setTimeout(function () { copyBtn.textContent = "or copy the message"; }, 2600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(msg).then(done);
      else { var ta = document.createElement("textarea"); ta.value = msg; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e) {} ta.remove(); done(); }
    });
  })();

  /* ---------- newsletter (front-end demo; wire to a provider later) ---------- */
  (function news() {
    var f = document.querySelector(".news");
    if (!f) return;
    var msg = document.querySelector(".news-msg");
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = f.querySelector("input");
      var v = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { msg.textContent = "that email doesn't look quite right x"; input.focus(); return; }
      f.classList.add("sent");
      msg.textContent = "lovely — you're on the list x";
      input.value = "";
    });
  })();

})();

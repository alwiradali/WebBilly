/* ============================================================
   Henna by Zainab — Birmingham, B20
   The page is a journey down one drawn line. Everything below
   the CONTENT block is mechanism; everything inside it is hers.
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
     Hers. The aftercare, the terms and the booking list are transcribed from
     her Instagram highlights without paraphrase: they are what a client is
     agreeing to, and rewording them changes the agreement. */

  var CONTACT = {
    handle:    "hennaabyzainab_",
    instagram: "https://www.instagram.com/hennaabyzainab_",
    tiktok:    "https://www.tiktok.com/@hennaabyzainab_"
  };

  var ASK = [
    { t: "Your name",                  d: "So I know who I am holding the slot for." },
    { t: "Date of booking",            d: "2–3 days before the event, so the stain peaks on the day." },
    { t: "Time of booking",            d: "Roughly when suits you." },
    { t: "Inspo pictures",             d: "The designs you'd like — send them straight into the chat." },
    { t: "How many hands / people",    d: "Hands, not just heads: one hand and two are different jobs." }
  ];

  var ASK_FINE = [
    "I only travel for bridal and group bookings over 3 people.",
    "All other bookings are home based to me (B20).",
    "A non-refundable deposit is required to secure your booking.",
    "No booking is confirmed without the deposit."
  ];

  var WORK = [
    ["Bridal", "The one to book furthest ahead. Intricate, personal and planned around your day — final design preference and guest count confirmed at least 48 hours before."],
    ["Eid", "The busiest weeks of the year by a distance. Slots go early, and the date you want is two to three days before Eid itself, not the night before."],
    ["Party & events", "Birthdays, baby showers, engagements, get-togethers. I travel for groups of more than three; smaller bookings come to me in B20."],
    ["Jagua", "A natural stain from the jagua fruit — deeper and cooler than henna. Say so in your enquiry and I'll talk you through a patch test first."]
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

  var TERMS = [
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

  /* the real dimensions travel with each one: the filmstrip's width has to be
     known BEFORE the images arrive, or the section reserves no height and the
     track never travels */
  var STRIP = [
    { f: "g1.jpg",    w: 980, h: 760,  a: "Mehndi across both hands, worn with gold bangles" },
    { f: "g4.jpg",    w: 980, h: 742,  a: "Bridal mehndi against cream and gold work" },
    { f: "g2.jpg",    w: 980, h: 890,  a: "Two hands finished in a fine trailing pattern" },
    { f: "g6.jpg",    w: 582, h: 980,  a: "Both hands finished, resting on pink" },
    { f: "g3.jpg",    w: 980, h: 890,  a: "A mandala on the back of the hand, against white embroidery" },
    { f: "g5.jpg",    w: 980, h: 907,  a: "A floral design running from wrist to fingertip" },
    { f: "g7.jpg",    w: 582, h: 980,  a: "An open palm design in a fully matured stain" },
    { f: "g8.jpg",    w: 980, h: 758,  a: "A soft, open pattern across the back of the hand" },
    { f: "about.jpg", w: 653, h: 1100, a: "A finished design resting on white satin in late sun" }
  ];

  var QA = [
    ["How far in advance should I book?", "For bridal, as far ahead as you can — those dates go first. For Eid, weeks rather than days. For everything else a couple of weeks is usually comfortable."],
    ["When should the appointment be?", "Two to three days before the event. Henna carries on darkening after the paste comes off, so booking too close to the day means you see it at its lightest."],
    ["Do you come to me?", "I travel for bridal and for group bookings of more than three people. Everything else is home based to me in B20."],
    ["What secures the date?", "A £10 non-refundable deposit, which comes off the final balance. No booking is confirmed without it, and cancellations need at least 48 hours' notice."],
    ["How dark will my stain go?", "That depends on your skin type, your body chemistry and — most of all — the aftercare. Keep it on 6–8 hours or overnight, keep warm, and stay away from water for the first 24 hours."],
    ["What is Jagua?", "A natural stain from the jagua fruit. It goes a deeper, cooler blue-black rather than henna's red-brown. Mention it in your enquiry and I'll talk you through a patch test."]
  ];

  /* ===================== curtain ===================== */
  (function veil() {
    var v = $("#veil"); if (!v) return;
    /* anchored to performance.now(), which counts from navigation — not from
       whenever this script happened to run, or the intro stretches by however
       long the network took */
    function go() {
      setTimeout(function () {
        v.classList.add("gone");
        document.body.classList.add("ready");
        setTimeout(function () { v.hidden = true; }, 960);
      }, Math.max(0, 1750 - performance.now()));
    }
    if (document.readyState === "complete") go();
    else addEventListener("DOMContentLoaded", go, { once: true });
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
      b.style.overflow = "hidden"; b.style.position = "fixed";
      b.style.top = (-lockedAt) + "px"; b.style.left = "0"; b.style.right = "0";
    } else {
      b.style.overflow = ""; b.style.position = ""; b.style.top = ""; b.style.left = ""; b.style.right = "";
      window.scrollTo(0, lockedAt);
    }
  }

  /* ===================== her content ===================== */
  var STATIONS = [];
  (function build() {
    var a = $("#askList");
    if (a) ASK.forEach(function (x) {
      var li = el("li");
      li.appendChild(el("strong", null, x.t));
      li.appendChild(el("span", null, x.d));
      a.appendChild(li);
    });
    var af = $("#askFine");
    if (af) ASK_FINE.forEach(function (t) { af.appendChild(el("li", null, t)); });

    var w = $("#workList");
    if (w) WORK.forEach(function (x) {
      w.appendChild(el("dt", null, x[0]));
      w.appendChild(el("dd", null, x[1]));
    });

    var cb = $("#careBefore"), ca = $("#careAfter");
    if (cb) CARE_BEFORE.forEach(function (t) { cb.appendChild(el("li", null, t)); });
    if (ca) CARE_AFTER.forEach(function (t) { ca.appendChild(el("li", null, t)); });

    var tb = $("#termsBody");
    if (tb) TERMS.forEach(function (t) {
      var sec = el("section");
      sec.appendChild(el("h3", null, t.h));
      var ul = el("ul");
      t.l.forEach(function (x) { ul.appendChild(el("li", null, x)); });
      sec.appendChild(ul); tb.appendChild(sec);
    });

    var q = $("#qaList");
    if (q) QA.forEach(function (x) {
      var d = el("div");
      d.appendChild(el("h3", null, x[0]));
      d.appendChild(el("p", null, x[1]));
      q.appendChild(d);
    });

    var t = $("#stripTrack");
    if (t) STRIP.forEach(function (p, i) {
      var fig = el("figure", { "data-i": i, tabindex: "0", role: "button", "aria-label": "Open: " + p.a });
      fig.appendChild(el("img", { src: "../assets/zainab/photos/" + p.f, alt: p.a,
                                  width: p.w, height: p.h,
                                  loading: i < 3 ? "eager" : "lazy" }));
      fig.appendChild(el("figcaption", null, p.a));
      t.appendChild(fig);
    });

    /* the index rail and the menu are built from the sections themselves, so
       they can never drift out of step with the page */
    STATIONS = $$("[data-station]").map(function (s) {
      return { id: s.id, name: s.getAttribute("data-station"), node: s };
    });
    var rl = $("#railList"), ml = $("#menuList");
    STATIONS.forEach(function (s, i) {
      var no = String(i + 1).padStart(2, "0");
      if (rl) {
        var li = el("li"), a2 = el("a", { href: "#" + s.id });
        a2.appendChild(el("b", null, s.name));
        a2.appendChild(el("i"));
        li.appendChild(a2); rl.appendChild(li);
      }
      if (ml) {
        var li2 = el("li"), a3 = el("a", { href: "#" + s.id });
        a3.appendChild(el("em", null, no));
        a3.appendChild(document.createTextNode(s.name));
        li2.appendChild(a3); ml.appendChild(li2);
      }
    });

    ["#menuIg", "#endIg"].forEach(function (sel) { var n = $(sel); if (n) n.href = CONTACT.instagram; });
    ["#menuTt", "#endTt"].forEach(function (sel) { var n = $(sel); if (n) n.href = CONTACT.tiktok; });
  }());

  /* ===================== menu ===================== */
  (function menu() {
    var m = $("#menu"), open = $("#menuOpen"), close = $("#menuClose");
    if (!m || !open) return;
    function set(on, then) {
      if (on) m.hidden = false;
      requestAnimationFrame(function () {
        m.classList.toggle("on", on);
        /* focus only once the overlay is actually visible: while it is still
           visibility:hidden the button is not focusable and the call is a
           no-op, which drops a keyboard visitor back at the top of the page */
        if (then) then();
      });
      open.setAttribute("aria-expanded", on ? "true" : "false");
      document.body.classList.toggle("menu-on", on);
      lockScroll(on);
      $$("#menuList a").forEach(function (a, i) { a.style.transitionDelay = on ? (60 + i * 42) + "ms" : "0ms"; });
      if (!on) setTimeout(function () { if (!m.classList.contains("on")) m.hidden = true; }, 520);
    }
    open.addEventListener("click", function () { set(true, function () { close.focus(); }); });
    close.addEventListener("click", function () { set(false); open.focus(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && m.classList.contains("on")) { set(false); open.focus(); }
    });
    /* a tap in the menu ARRIVES: the overlay already covers the screen, so it
       doubles as the curtain — jump under it, then dissolve it away */
    m.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      e.preventDefault();
      var t = $(a.getAttribute("href")); if (!t) return;
      $$("#menuList a").forEach(function (x) { x.style.transitionDelay = "0ms"; });
      m.style.transition = "none";
      lockScroll(false);
      open.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-on");
      var b = html.style.scrollBehavior; html.style.scrollBehavior = "auto";
      window.scrollTo(0, Math.round(t.getBoundingClientRect().top + window.pageYOffset));
      html.style.scrollBehavior = b;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          m.style.transition = ""; m.classList.remove("on");
          setTimeout(function () { if (!m.classList.contains("on")) m.hidden = true; }, 520);
        });
      });
    });
  }());

  /* ===================== reveal ===================== */
  (function reveal() {
    var targets = $$(".stn > *, .day-copy > *, .plate > *, .strip-head > *, .end > *");
    if (reduced) return;
    targets.forEach(function (n, i) { n.classList.add("rv"); });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        var n = en.target;
        var sibs = [].slice.call(n.parentNode.children).filter(function (c) { return c.classList.contains("rv"); });
        n.style.transitionDelay = Math.min(sibs.indexOf(n), 6) * 70 + "ms";
        n.classList.add("in");
        io.unobserve(n);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
    targets.forEach(function (n) { io.observe(n); });
  }());

  /* ===================== the vine =====================
     One path down the whole document, revealed by scroll with
     stroke-dashoffset. getTotalLength() is measured after layout so the dash
     matches the stretched path rather than the viewBox. */
  (function vine() {
    var path = $("#vinePath"), spine = $(".spine");
    if (!path || !spine) return;
    var len = 0;
    function measure() {
      try { len = path.getTotalLength(); } catch (e) { len = 1000; }
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = reduced ? 0 : len;
    }
    measure();
    addEventListener("resize", measure, { passive: true });
    if (reduced) return;
    var ticking = false;
    function draw() {
      ticking = false;
      var max = html.scrollHeight - innerHeight;
      var p = max > 0 ? (window.pageYOffset || html.scrollTop) / max : 0;
      /* run slightly ahead of the reader so the line is always arriving */
      p = Math.max(0, Math.min(1, p * 1.12));
      path.style.strokeDashoffset = len * (1 - p);
    }
    addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(draw); }
    }, { passive: true });
    addEventListener("resize", draw, { passive: true });
    draw();
  }());

  /* ===================== the index rail ===================== */
  (function rail() {
    var links = $$("#railList a");
    if (!links.length) return;
    /* Deliberately not an IntersectionObserver with a threshold: a threshold is
       a fraction of the TARGET's own area, so a station taller than the
       observation band can never reach it and the rail just stops moving --
       which is what happened here for every long section. A reading line is
       height-independent: whichever station covers it is the one you are in. */
    var at = "", ticking = false;
    function mark() {
      ticking = false;
      var line = innerHeight * 0.35, best = "", bestTop = -Infinity;
      for (var i = 0; i < STATIONS.length; i++) {
        var r = STATIONS[i].node.getBoundingClientRect();
        if (r.top <= line && r.bottom > line && r.top > bestTop) { best = STATIONS[i].id; bestTop = r.top; }
      }
      /* above the first station, or past the last: hold the nearest one */
      if (!best) {
        var first = STATIONS[0].node.getBoundingClientRect();
        best = first.top > line ? "" : STATIONS[STATIONS.length - 1].id;
      }
      if (best === at) return;
      at = best;
      links.forEach(function (a) { a.classList.toggle("here", a.getAttribute("href") === "#" + at); });
    }
    addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(mark); }
    }, { passive: true });
    addEventListener("resize", mark, { passive: true });
    mark();
  }());

  /* ===================== the filmstrip =====================
     The section is tall; its inner panel is sticky, and the track travels
     sideways across that height. Transformed as ONE element, but kept well
     under the ~4096 device-pixel ceiling iOS silently refuses to paint by
     never letting the track exceed it — measured and asserted in the tests. */
  (function strip() {
    var sec = $("#strip"), track = $("#stripTrack");
    if (!sec || !track) return;
    /* Measured from layout, never from scrollWidth: the frames are translated
       individually now, and a translated child changes the parent's scrollable
       overflow -- so reading scrollWidth after a move fed a smaller number back
       in each time until the travel collapsed to nothing. offsetLeft and
       offsetWidth are layout values and a transform cannot touch them. */
    function contentWidth() {
      var f = $$("#stripTrack > *");
      if (!f.length) return track.scrollWidth;
      var last = f[f.length - 1];
      return (last.offsetLeft + last.offsetWidth) - track.offsetLeft;
    }
    function height() {
      var over = Math.max(0, contentWidth() - innerWidth);
      /* one screen of pinning per screen of sideways travel, plus one to read */
      sec.style.height = (innerHeight + over * 1.05) + "px";
      return over;
    }
    var over = height();
    addEventListener("resize", function () { over = height(); move(); }, { passive: true });
    /* the track's width changes as fonts settle and lazy images arrive, so the
       reserved height is recomputed whenever it actually changes rather than
       guessed once */
    if (window.ResizeObserver) {
      new ResizeObserver(function () { refreshFrames(); over = height(); move(); }).observe(track);
    }
    /* the track's own box no longer grows with its content (it is a grid item
       capped at the column), so the observer above cannot see a late image
       arrive -- ask each one directly */
    $$("#stripTrack img").forEach(function (im) {
      if (im.complete) return;
      im.addEventListener("load", function () { over = height(); move(); }, { once: true });
      im.addEventListener("error", function () { over = height(); move(); }, { once: true });
    });
    var ticking = false;
    /* Each frame is moved on its own, never the track.
       iOS will not paint a moving (composited) layer wider than about 4096
       DEVICE pixels, and it fails silently -- the whole strip just does not
       appear. The track runs to 3312 CSS px, which on an iPhone 15 Pro Max is
       9936 device px. Each figure is a few hundred px, so nine small layers
       stay well inside the limit and move as one. */
    var frames = $$("#stripTrack > *");
    function refreshFrames() { frames = $$("#stripTrack > *"); }
    function move() {
      ticking = false;
      var b = sec.getBoundingClientRect();
      var total = sec.offsetHeight - innerHeight;
      var p = total > 0 ? Math.max(0, Math.min(1, -b.top / total)) : 0;
      var x = "translate3d(" + (-over * p).toFixed(2) + "px,0,0)";
      for (var i = 0; i < frames.length; i++) frames[i].style.transform = x;
    }
    addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(move); }
    }, { passive: true });
    if (document.readyState === "complete") { refreshFrames(); over = height(); move(); }
    else addEventListener("load", function () { refreshFrames(); over = height(); move(); }, { once: true });
    refreshFrames(); move();
  }());

  /* ===================== the viewer ===================== */
  (function viewer() {
    var v = $("#view"); if (!v) return;
    var img = $("#viewImg"), cap = $("#viewCap"), at = 0;
    function put(i) {
      at = (i + STRIP.length) % STRIP.length;
      img.src = "../assets/zainab/photos/" + STRIP[at].f;
      img.alt = STRIP[at].a; cap.textContent = STRIP[at].a;
    }
    function show(i) {
      v.hidden = false; put(i); lockScroll(true);
      requestAnimationFrame(function () { v.classList.add("on"); });
      $("#viewX").focus();
    }
    function hide() {
      v.classList.remove("on"); lockScroll(false);
      setTimeout(function () { v.hidden = true; }, 420);
    }
    document.addEventListener("click", function (e) {
      var f = e.target.closest && e.target.closest("#stripTrack figure");
      if (f) { show(+f.getAttribute("data-i")); return; }
      if (v.hidden) return;
      if (e.target === v || (e.target.closest && e.target.closest("#viewX"))) hide();
      else if (e.target.closest && e.target.closest("#viewPrev")) put(at - 1);
      else if (e.target.closest && e.target.closest("#viewNext")) put(at + 1);
    });
    document.addEventListener("keydown", function (e) {
      var t = e.target;
      if (v.hidden && t && t.closest && t.closest("#stripTrack figure") && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault(); show(+t.closest("#stripTrack figure").getAttribute("data-i")); return;
      }
      if (v.hidden) return;
      if (e.key === "Escape") hide();
      if (e.key === "ArrowLeft") put(at - 1);
      if (e.key === "ArrowRight") put(at + 1);
    });
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
  (function chips() {
    var host = $("#occChips"), hidden = $("#enqOccasion");
    if (!host || !hidden) return;
    ["Bridal", "Eid", "Party", "Event", "Just me"].forEach(function (o) {
      var b = el("button", { type: "button" }, o);
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
  }());

  /* ===================== the enquiry =====================
     She takes bookings by DM and publishes no email address. Instagram has no
     way to pre-fill a message from a link — no URL parameter exists — so the
     honest maximum is to write the message in the exact order her How to Book
     highlight asks for, put it on the clipboard, and open her DMs. */
  (function form() {
    var f = $("#enqForm"); if (!f) return;
    var msg = $("#formMsg");
    function say(t, isHtml) {
      msg.classList.add("on");
      if (isHtml) msg.innerHTML = t; else msg.textContent = t;
    }
    function pretty(d) {
      if (!d) return "";
      var p = d.split("-"); if (p.length !== 3) return d;
      var dt = new Date(+p[0], +p[1] - 1, +p[2]);
      return isNaN(dt) ? d : dt.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }

    f.addEventListener("submit", function (e) {
      e.preventDefault();
      if (val("enqHp")) return;

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
              'paste it in, add your inspo pictures, and send. ' +
              '<button type="button" id="enqAgain">Copy it again</button>', true);
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
}());

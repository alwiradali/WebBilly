/* ============================================================
   FLEURÉ & CO. — one script for every page.
   Each render step guards on its own host element and returns quietly if
   the page does not have one, so the same file drives the home page and
   the work page without either knowing about the other.
   ============================================================ */
(function () {
  "use strict";

  var D = window.FLEURE;
  if (!D) return;
  var B = D.business;
  var A = "/assets/fleure/";
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "class") n.className = attrs[k]; else n.setAttribute(k, attrs[k]);
    }
    if (text != null) n.textContent = text;
    return n;
  }

  var IG = "https://instagram.com/" + B.instagram;
  var TT = "https://tiktok.com/@" + B.tiktok;
  var TH = "https://threads.net/@" + B.threads;
  function mailLink(subject, body) {
    return "mailto:" + B.email + "?subject=" + encodeURIComponent(subject) +
           "&body=" + encodeURIComponent(body);
  }
  function waLink(text) {
    return "https://wa.me/" + B.phone.replace(/\D/g, "") + "?text=" + encodeURIComponent(text);
  }

  /* ============================================================
     1. PETALS
     One canvas rather than fifty animated elements. The drift is one
     directional and each petal wraps when it leaves — an `alternate`
     animation stops every petal dead at the turn, which the eye reads as
     a stutter rather than as falling.
     ============================================================ */
  (function petals() {
    var host = $("#petals"); if (!host || reduced) return;
    var c = el("canvas"); host.appendChild(c);
    var ctx = c.getContext("2d"), dpr = Math.min(devicePixelRatio || 1, 2);
    var w = 0, h = 0, ps = [];
    var COUNT = innerWidth < 760 ? 16 : 30;

    function seed(p, fresh) {
      p.x = Math.random() * w;
      p.y = fresh ? Math.random() * h : -20;
      p.r = 3.2 + Math.random() * 6.5;
      p.sp = 8 + Math.random() * 20;          /* px per second, downward */
      p.drift = (Math.random() - 0.5) * 16;
      p.a = Math.random() * Math.PI * 2;
      p.spin = (Math.random() - 0.5) * 0.5;
      p.al = 0.16 + Math.random() * 0.4;
      p.squash = 0.45 + Math.random() * 0.4;
    }
    function size() {
      w = innerWidth; h = innerHeight;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      c.style.width = w + "px"; c.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    for (var i = 0; i < COUNT; i++) { var p = {}; seed(p, true); ps.push(p); }
    addEventListener("resize", size);

    var last = 0;
    function frame(t) {
      var dt = last ? Math.min((t - last) / 1000, 0.05) : 0.016;
      last = t;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i];
        p.y += p.sp * dt;
        p.x += Math.sin(p.a) * p.drift * dt;
        p.a += p.spin * dt;
        if (p.y - p.r > h) seed(p, false);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.globalAlpha = p.al;
        ctx.fillStyle = "#d98fb2";
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r, p.r * p.squash, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();

  /* ============================================================
     2. THE CONTENT
     ============================================================ */

  /* -- collection tiles -- */
  (function tiles() {
    var host = $("#tiles"); if (!host) return;
    D.collections.forEach(function (c, i) {
      var a = el("a", { class: "tile", href: "#enquire", "data-collection": c.id,
                        "data-rv": "", "data-rv-d": String((i % 4) + 1) });
      var art = el("div", { class: "tile-art" });
      art.appendChild(el("img", { src: A + c.img, alt: c.alt, loading: i < 2 ? "eager" : "lazy" }));
      a.appendChild(art);
      var body = el("div", { class: "tile-body" });
      body.appendChild(el("h3", null, c.name));
      body.appendChild(el("p", null, c.blurb));
      body.appendChild(el("span", { class: "tile-more" }, "Enquire"));
      a.appendChild(body);
      host.appendChild(a);
    });
  })();

  /* -- how to order -- */
  (function steps() {
    var host = $("#steps"); if (!host) return;
    D.howToOrder.forEach(function (s, i) {
      var d = el("div", { class: "step", "data-rv": "", "data-rv-d": String((i % 4) + 1) });
      d.appendChild(el("h3", null, s.h));
      d.appendChild(el("p", null, s.p));
      host.appendChild(d);
    });
    var foot = $("#stepsFoot");
    if (foot) {
      foot.appendChild(el("span", null, D.inspirationNote));
      foot.appendChild(el("span", null, D.confirmNote));
    }
  })();

  /* -- bloom baskets -- */
  (function baskets() {
    var host = $("#basketPoints"); if (!host) return;
    D.basketPoints.forEach(function (t) { host.appendChild(el("li", null, t)); });
  })();

  /* -- gallery. One ordered list in the data file; the home page asks for
        a few with data-limit, the work page leaves it off and gets all. -- */
  (function gallery() {
    var host = $("#gallery"); if (!host) return;
    var lim = parseInt(host.getAttribute("data-limit"), 10);
    var shots = (lim > 0) ? D.work.slice(0, lim) : D.work;
    shots.forEach(function (s, i) {
      var fig = el("figure", { "data-rv": "", "data-rv-d": String((i % 4) + 1) });
      fig.appendChild(el("img", { src: A + s.src, alt: s.alt, loading: i < 4 ? "eager" : "lazy" }));
      fig.appendChild(el("figcaption", null, s.alt));
      host.appendChild(fig);
    });
  })();

  /* -- policies -- */
  (function policies() {
    var host = $("#policies"); if (!host) return;
    D.policies.forEach(function (sec, i) {
      var d = el("div", { class: "pol", "data-rv": "", "data-rv-d": String(i + 1) });
      d.appendChild(el("h3", null, sec.h));
      var ul = el("ul");
      sec.l.forEach(function (t) { ul.appendChild(el("li", null, t)); });
      d.appendChild(ul);
      host.appendChild(d);
    });
  })();

  /* -- faq -- */
  (function faq() {
    var host = $("#faq"); if (!host) return;
    D.faq.forEach(function (f) {
      var d = el("details");
      d.appendChild(el("summary", null, f.q));
      d.appendChild(el("p", null, f.a));
      host.appendChild(d);
    });
  })();

  /* -- reviews -- */
  (function reviews() {
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
    if (head) {
      var sc = el("div", { class: "rv-score" });
      sc.appendChild(el("b", null, "5.0"));
      sc.appendChild(stars(5));
      head.appendChild(sc);
    }
    var host = $("#rvs"); if (!host) return;
    D.reviews.forEach(function (r, i) {
      var c = el("article", { class: "rv", "data-rv": "", "data-rv-d": String(i + 1) });
      c.appendChild(stars(r.stars));
      c.appendChild(el("p", null, "“" + r.text + "”"));
      var f = el("footer");
      f.appendChild(el("b", null, r.name));
      c.appendChild(f);
      host.appendChild(c);
    });
  })();

  /* -- contact cards, footer links, the routes out --
        Her bio advertises DMs, so Instagram is always offered. Email and
        WhatsApp appear only once the data file has an address or a number
        in it: a button that opens a blank mail window, or one addressed to
        nobody, is worse than no button. -- */
  var ICON = {
    ig: "M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.6.22 1 .48 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 3.1A6.7 6.7 0 1 0 18.7 12 6.7 6.7 0 0 0 12 5.3zm0 11A4.3 4.3 0 1 1 16.3 12 4.3 4.3 0 0 1 12 16.3zm6.9-11.3a1.6 1.6 0 1 1-1.6-1.6 1.6 1.6 0 0 1 1.6 1.6z",
    tt: "M16.6 5.8a4.8 4.8 0 0 1-1-2.8h-3v12.3a2.7 2.7 0 1 1-2.7-2.7c.2 0 .4 0 .6.1V9.6a5.9 5.9 0 0 0-.6 0 5.8 5.8 0 1 0 5.8 5.8V9.3a7.8 7.8 0 0 0 4.5 1.4V7.6a4.7 4.7 0 0 1-3.6-1.8z",
    th: "M17.1 11.2c-.1 0-.2-.1-.3-.1-.2-3.2-1.9-5-4.8-5h-.1c-1.7 0-3.2.7-4 2l1.6 1.1c.6-1 1.6-1.2 2.4-1.2 1 0 1.7.3 2.1.9.3.4.5 1 .6 1.7a12 12 0 0 0-2.6-.2c-2.7.2-4.4 1.7-4.3 3.9 0 1.1.6 2 1.6 2.6.8.5 1.8.8 2.9.7 1.4-.1 2.5-.6 3.3-1.6.6-.8.9-1.7 1.1-3 .7.4 1.2 1 1.5 1.7.4 1.1.5 2.9-1 4.4-1.3 1.3-2.9 1.9-5.3 1.9-2.7 0-4.7-.9-6-2.6C4.7 16.8 4.1 14.7 4 12c0-2.7.6-4.8 1.8-6.3C7.1 4 9.1 3.1 11.8 3.1c2.7 0 4.7.9 6 2.6.6.9 1.1 2 1.4 3.3l1.9-.5c-.3-1.6-.9-3-1.7-4.1C17.7 2.1 15.1 1 11.8 1h-.1C8.5 1 5.9 2.1 4.2 4.3 2.7 6.2 1.9 8.8 1.9 12c0 3.2.8 5.8 2.3 7.7C5.9 21.9 8.5 23 11.7 23h.1c2.9 0 5-.8 6.7-2.5 2.2-2.2 2.1-5 1.4-6.7-.5-1.2-1.4-2.1-2.8-2.6zm-4.5 4.4c-1.2.1-2.4-.5-2.5-1.6-.1-.9.6-1.8 2.5-1.9h.6c.7 0 1.3.1 1.9.2-.2 2.7-1.5 3.2-2.5 3.3z",
    mail: "M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm9 7.1L4.6 7H19.4zM4 8.3V17h16V8.3l-8 5.5z",
    wa: "M17.5 14.4c-.3-.2-1.8-.9-2-1-.3-.1-.5-.2-.7.1s-.8 1-.9 1.2-.3.2-.6.1a8 8 0 0 1-2.4-1.5 9 9 0 0 1-1.6-2c-.2-.3 0-.5.1-.6l.5-.5.3-.5v-.5l-1-2.2c-.2-.6-.4-.5-.6-.5h-.6a1.1 1.1 0 0 0-.8.4 3.3 3.3 0 0 0-1 2.4 5.7 5.7 0 0 0 1.2 3 13 13 0 0 0 5 4.4c2.2.9 2.2.6 2.6.6a3 3 0 0 0 2-1.4 2.5 2.5 0 0 0 .2-1.4zM12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2z"
  };
  function icon(kind) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("aria-hidden", "true");
    var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", ICON[kind]); svg.appendChild(p);
    return svg;
  }
  /* every route out of the site, in one list so no page can drift */
  function routes() {
    var out = [
      { kind: "ig", label: "Instagram", value: "@" + B.instagram, href: IG, ext: true }
    ];
    if (B.email) out.push({ kind: "mail", label: "Email", value: B.email,
      href: mailLink("Flower enquiry from your website",
        "Hello,\n\nI would like to ask about an order.\n\n") });
    if (B.phone) out.push({ kind: "wa", label: "WhatsApp", value: B.phone,
      href: waLink("Hi! I found you through your website — I'd like to ask about an order."), ext: true });
    out.push({ kind: "tt", label: "TikTok", value: "@" + B.tiktok, href: TT, ext: true });
    out.push({ kind: "th", label: "Threads", value: "@" + B.threads, href: TH, ext: true });
    return out;
  }

  (function contacts() {
    var host = $("#cards");
    if (host) routes().forEach(function (r, i) {
      var a = el("a", { class: "card", href: r.href, "data-rv": "", "data-rv-d": String((i % 4) + 1) });
      if (r.ext) { a.target = "_blank"; a.rel = "noopener"; }
      var ic = el("span", { class: "card-ic" }); ic.appendChild(icon(r.kind)); a.appendChild(ic);
      var t = el("span");
      t.appendChild(el("b", null, r.label));
      t.appendChild(el("span", null, r.value));
      a.appendChild(t);
      host.appendChild(a);
    });

    var fc = $("#footContact");
    if (fc) routes().forEach(function (r) {
      var li = el("li");
      var a = el("a", { href: r.href }, r.label);
      if (r.ext) { a.target = "_blank"; a.rel = "noopener"; }
      li.appendChild(a); fc.appendChild(li);
    });

    var ig = $("#igBtn"); if (ig) ig.href = IG;
    var fcp = $("#footCopy");
    if (fcp) fcp.textContent = "© " + new Date().getFullYear() + " " + B.name + " · " + B.town;
  })();

  /* ============================================================
     3. THE ENQUIRY FORM
     It asks exactly what her "How to order" highlight asks for, so the
     message that arrives is one she can price without a conversation.
     ============================================================ */
  var HAS_FORM = !!$("#enquiry");
  var state = { type: "", palette: "", occasion: "" };

  function chipRow(hostId, values, key) {
    var host = $(hostId); if (!host) return;
    values.forEach(function (v) {
      var li = el("li");
      var b = el("button", { type: "button", "aria-pressed": "false" }, v);
      b.addEventListener("click", function () {
        state[key] = (state[key] === v) ? "" : v;
        $$("button", host).forEach(function (o) {
          o.setAttribute("aria-pressed", String(o.textContent === state[key]));
        });
        preview();
      });
      li.appendChild(b); host.appendChild(li);
    });
  }
  if (HAS_FORM) {
    chipRow("#typeChips", ["Fresh bouquet", "Forever (faux)", "Bloom basket", "Not sure yet"], "type");
    chipRow("#paletteChips", D.palettes, "palette");
    var occ = $("#fOccasion");
    if (occ) D.occasions.forEach(function (o) { occ.appendChild(el("option", { value: o }, o)); });
  }

  function val(id) { var n = $("#" + id); return n ? n.value.trim() : ""; }
  function compose() {
    var L = [];
    L.push("FLOWER ENQUIRY — " + B.name);
    L.push("");
    if (state.type) L.push("What: " + state.type);
    if (val("fOccasion")) L.push("Occasion: " + val("fOccasion"));
    if (state.palette) L.push("Colours: " + state.palette);
    if (val("fBudget")) L.push("Budget: " + val("fBudget"));
    if (val("fDate")) L.push("Date needed: " + val("fDate"));
    if (val("fWhen")) L.push("Collection or delivery: " + val("fWhen"));
    L.push("");
    if (val("fNotes")) { L.push("Notes: " + val("fNotes")); L.push(""); }
    L.push("From: " + val("fName"));
    if (val("fContact")) L.push("Reach me on: " + val("fContact"));
    return L.join("\n");
  }
  function preview() {
    var box = $("#preview"); if (!box) return;
    box.textContent = compose();
  }
  function missing() {
    var need = [];
    if (!val("fName")) need.push("fName");
    if (!state.type) need.push("typeChips");
    if (!val("fDate")) need.push("fDate");
    if (!val("fContact")) need.push("fContact");
    return need;
  }
  function say(kind, text) {
    var box = $("#formMsg"); if (!box) return;
    box.textContent = "";
    box.appendChild(el("div", { class: kind === "ok" ? "sum-ok" : "sum-err" }, text));
  }
  function flag(ids) {
    $$(".field").forEach(function (f) { f.classList.remove("bad"); });
    ids.forEach(function (id) {
      var n = $("#" + id);
      if (n && n.closest(".field")) n.closest(".field").classList.add("bad");
    });
    var first = $("#" + ids[0]);
    if (first && first.focus) first.focus();
  }
  /* Safari blocks a navigation that happens after an await, and some in-app
     browsers ignore an assignment to location.href — so the handover clicks
     a real anchor inside the click that triggered it. */
  function handover(href, blank) {
    var a = el("a", { href: href });
    if (blank) { a.target = "_blank"; a.rel = "noopener"; }
    a.style.display = "none";
    document.body.appendChild(a); a.click();
    setTimeout(function () { a.remove(); }, 0);
  }

  if (HAS_FORM) {
    $("#enquiry").addEventListener("submit", function (e) { e.preventDefault(); });
    $$("#enquiry input, #enquiry select, #enquiry textarea").forEach(function (n) {
      n.addEventListener("input", preview);
      n.addEventListener("change", preview);
    });
    preview();

    var sendMail = $("#sendMail");
    /* No address in the data file yet: rather than open a mail window
       addressed to nobody, the button removes itself and Instagram — the
       route her own bio advertises — carries the enquiry. */
    if (sendMail && !B.email) sendMail.remove();
    if (sendMail && B.email) sendMail.addEventListener("click", function () {
      var m = missing();
      if (m.length) { say("err", "Just a couple of things missing before this can be sent."); flag(m); return; }
      handover(mailLink("Flower enquiry — " + (state.type || B.name), compose()));
      say("ok", "Your email app is opening with the enquiry written out. Attach your inspiration photo and send.");
    });

    var sendIg = $("#sendIg");
    if (sendIg) sendIg.addEventListener("click", function () {
      var m = missing();
      if (m.length) { say("err", "Just a couple of things missing before this can be sent."); flag(m); return; }
      var text = compose();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          say("ok", "Your enquiry is copied. Instagram is opening — paste it into a message to @" +
                    B.instagram + " and add your inspiration photo.");
        }, function () {
          say("ok", "Instagram is opening. Copy your enquiry from the box above into a message to @" + B.instagram + ".");
        });
      } else {
        say("ok", "Instagram is opening. Copy your enquiry from the box above into a message to @" + B.instagram + ".");
      }
      handover(IG, true);
    });

    var copyBtn = $("#copyBtn");
    if (copyBtn) copyBtn.addEventListener("click", function () {
      var text = compose();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { say("ok", "Copied. Paste it wherever you like."); });
      }
    });

    /* a tile says which collection it was, so the form opens on it */
    $$("[data-collection]").forEach(function (t) {
      t.addEventListener("click", function () {
        var map = { fresh: "Fresh bouquet", forever: "Forever (faux)", baskets: "Bloom basket", bespoke: "Not sure yet" };
        var want = map[t.getAttribute("data-collection")];
        var host = $("#typeChips"); if (!host || !want) return;
        state.type = want;
        $$("button", host).forEach(function (o) { o.setAttribute("aria-pressed", String(o.textContent === want)); });
        preview();
      });
    });
  }

  /* ============================================================
     4. CHROME
     ============================================================ */

  /* -- marquee. Each word is transformed, never the row: a track wide
        enough to loop is the easiest way to build a composited layer that
        iOS silently refuses to paint. -- */
  (function marquee() {
    var row = $("#mqRow"); if (!row) return;
    var words = ["Fresh & faux florals", "Personalised", "Made to order",
                 "Nottingham", "Collection or delivery", "Custom orders welcome"];
    var set = words.concat(words);
    set.forEach(function (t) { row.appendChild(el("span", null, t)); });
    if (reduced) return;
    var kids = $$("span", row);
    /* measure from offsetLeft + offsetWidth: once a child is translated the
       parent's scrollWidth no longer tells you how wide the content was */
    var one = 0;
    for (var i = 0; i < words.length; i++) one = kids[i].offsetLeft + kids[i].offsetWidth;
    var x = 0, last = 0;
    function step(t) {
      var dt = last ? Math.min((t - last) / 1000, 0.05) : 0.016;
      last = t;
      x = (x + 26 * dt) % one;
      for (var i = 0; i < kids.length; i++) kids[i].style.transform = "translateX(" + (-x) + "px)";
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  })();

  /* -- smooth scroll -- */
  var lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new window.Lenis({ duration: 1.1, smoothWheel: true, touchMultiplier: 1.6 });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
  }
  function goTo(target) {
    if (lenis) lenis.scrollTo(target, { offset: -70, duration: 1.2 });
    else target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }
  /* A tap in the drawer should land you at the section, not take you on a
     ride through the whole page. The drawer takes half a second to fade, so
     the move happens behind it. html carries scroll-behavior:smooth as the
     no-Lenis fallback, and that alone turns this jump back into a glide —
     off for the assignment, back on the next frame. */
  function jumpTo(target) {
    var y = target.getBoundingClientRect().top + (window.scrollY || window.pageYOffset || 0) - 70;
    var root = document.documentElement, prev = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
    else scrollTo(0, y);
    requestAnimationFrame(function () { root.style.scrollBehavior = prev; });
  }

  /* -- drawer -- */
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

  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]'); if (!a) return;
    var id = a.getAttribute("href");
    if (id === "#" || id.length < 2) return;
    var t = document.querySelector(id); if (!t) return;
    var fromDrawer = !!a.closest("#menu");
    e.preventDefault();
    closeMenu();
    if (fromDrawer) jumpTo(t); else goTo(t);
    history.replaceState(null, "", id);
  });

  /* -- nav state. The bar goes light only once the dark block at the top
        has actually scrolled away: switching at 40px puts a pale bar over a
        dark hero, which reads as a fault. -- */
  (function chrome() {
    var nav = $("#nav"); if (!nav) return;
    /* Only the run of dark blocks that STARTS at the top of the page counts.
       Taking the last [data-dark] on the page picked the reviews section
       near the bottom, so the bar believed it was over a dark block from
       the first pixel and went cream-on-blush — invisible. */
    var lastDark = null;
    (function () {
      var marks = $$("[data-dark]");
      var edge = nav.offsetHeight;
      for (var i = 0; i < marks.length; i++) {
        var m = marks[i];
        if (m.offsetTop > edge + 4) break;      /* the run has ended */
        lastDark = m;
        edge = m.offsetTop + m.offsetHeight;
      }
    })();
    function frame() {
      var edge = 40;
      if (lastDark) edge = Math.max(40, lastDark.offsetTop + lastDark.offsetHeight - nav.offsetHeight);
      var past = scrollY > edge;
      nav.classList.toggle("solid", past);
      /* cream links only while the bar is actually over a dark block */
      nav.classList.toggle("over-dark", !!lastDark && !past);
    }
    addEventListener("scroll", frame, { passive: true });
    addEventListener("resize", frame);
    frame();
  })();

  /* -- reveals. Anything already on screen when the page loads is revealed
        outright: the observer's bottom margin means a element low in the
        first viewport would otherwise sit invisible until you scrolled. -- */
  (function reveals() {
    var items = $$("[data-rv]");
    if (reduced || !("IntersectionObserver" in window)) {
      items.forEach(function (n) { n.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0 });
    items.forEach(function (n) {
      if (n.getBoundingClientRect().top < innerHeight) { n.classList.add("in"); return; }
      io.observe(n);
    });
  })();

  /* -- loader -- */
  function done() {
    var l = $("#loader"); if (!l) return;
    l.classList.add("gone");
    setTimeout(function () { l.remove(); }, 900);
  }
  if (document.readyState === "complete") setTimeout(done, 400);
  else addEventListener("load", function () { setTimeout(done, 400); });
  setTimeout(done, 4000);   /* never leave anybody looking at a loader */
})();

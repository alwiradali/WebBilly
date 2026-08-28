/* ════════════════════════════════════════════════════════════════
   MEGACITY PROPERTIES — motion & interaction system
   GSAP + ScrollTrigger. One reusable vocabulary — fadeUp, mask
   reveals, parallax, staggers, counters, magnetic CTAs — driven
   by data-fx attributes, so every page animates the same way.

   Degrades cleanly: without GSAP, with reduced-motion, or with
   JS off entirely, every page is fully readable and usable.

   The 360° platform (billy360) is never re-implemented here.
   This file only *launches* it — a full-screen frame with a
   "back" control — and everything inside the frame is the
   existing engine untouched.
   ════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var D = window.MEGACITY || null;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var touch = window.matchMedia && matchMedia("(hover: none)").matches;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);
  var motion = hasGSAP && !reduce;
  if (motion) gsap.registerPlugin(ScrollTrigger);

  document.documentElement.classList.remove("no-js");

  /* ── shared chrome: menu, footer, overlays, cursor, veil ──────── */
  var PAGES = [
    ["megacity-properties", "Properties"],
    ["megacity-landlords", "Landlords"],
    ["megacity-tenants", "Tenants"],
    ["megacity-tours", "360° Tours"],
    ["megacity-tools", "Tools"],
    ["megacity-about", "About"],
    ["megacity-contact", "Contact"]
  ];
  var here = location.pathname.replace(/\/+$/, "").split("/").pop().replace(/\.html$/, "");

  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }
  var svgArrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>';
  var svgHeart = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 20.3S4 15 4 9.6C4 6.9 6.1 5 8.4 5c1.5 0 2.8.8 3.6 2 .8-1.2 2.1-2 3.6-2C17.9 5 20 6.9 20 9.6c0 5.4-8 10.7-8 10.7z"/></svg>';

  /* the visitor's shortlist — hearts, kept on their own device */
  var saved = (function () {
    var KEY = "megacity:saved", list = [];
    try { list = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) {}
    function persist() { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} }
    return {
      has: function (id) { return list.indexOf(id) !== -1; },
      all: function () { return list.slice(); },
      toggle: function (id) {
        var i = list.indexOf(id);
        if (i === -1) list.push(id); else list.splice(i, 1);
        persist();
        return i === -1;
      }
    };
  })();

  /* recently viewed — recorded by property pages */
  var viewed = (function () {
    var KEY = "megacity:viewed";
    function all() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } }
    return {
      all: all,
      add: function (id) {
        var list = all().filter(function (x) { return x !== id; });
        list.unshift(id);
        try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 8))); } catch (e) {}
      }
    };
  })();

  /* the wordmark everywhere follows the Studio's brand fields */
  function applyBrand() {
    if (!D || !D.biz.brandName) return;
    $$b(".nav-brand").forEach(function (a) {
      a.innerHTML = esc(D.biz.brandName) + "<small>" + esc(D.biz.brandSub || "") + "</small>";
    });
    var lw = document.querySelector(".loader-word");
    if (lw) lw.innerHTML = "<b>" + esc(D.biz.brandName) + "</b>";
    var ls = document.querySelector(".loader-sub");
    if (ls) ls.textContent = (D.biz.brandSub || "") + " · Manchester";
    fitFooterWord();
    addEventListener("resize", fitFooterWord);
  }
  /* the giant closing word always shows in full — whatever the brand is renamed to */
  function fitFooterWord() {
    var fw = document.querySelector(".footer-word");
    if (!fw || !fw.parentElement) return;
    fw.style.fontSize = "";
    var ratio = fw.parentElement.clientWidth / Math.max(1, fw.scrollWidth);
    if (ratio < 1) fw.style.fontSize = (parseFloat(getComputedStyle(fw).fontSize) * ratio * 0.97) + "px";
  }
  function $$b(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  function buildChrome() {
    var body = document.body;

    /* cursor + veil + grain */
    body.appendChild(el('<div class="grain" aria-hidden="true"></div>'));
    body.appendChild(el('<div class="cursor" aria-hidden="true"></div>'));
    body.appendChild(el('<div class="cursor-ring" aria-hidden="true"><span></span></div>'));
    body.appendChild(el('<div class="veil" aria-hidden="true"></div>'));

    /* full-screen menu */
    var links = PAGES.map(function (p, i) {
      var on = here === p[0] ? ' aria-current="page"' : "";
      return '<li><a href="' + p[0] + '"' + on + '><i>0' + (i + 1) + '</i>' + p[1] + "</a></li>";
    }).join("");
    body.appendChild(el(
      '<nav class="menu" id="mcMenu" aria-label="Menu" aria-hidden="true">' +
      '<div class="menu-top"><a class="nav-brand" href="megacity">' + esc(D ? D.biz.brandName : "Megacity") + "<small>" + esc(D ? D.biz.brandSub : "Properties") + "</small></a>" +
      '<button class="menu-close" aria-label="Close menu">&#10005;</button></div>' +
      '<ul class="menu-links">' + links + "</ul>" +
      '<div class="menu-foot"><a class="btn btn--solid" href="megacity-valuation">Request a valuation</a>' +
      '<a href="' + (D ? D.biz.phoneHref : "#") + '">' + (D ? D.biz.phone : "") + "</a>" +
      '<a href="mailto:' + (D ? D.biz.email : "") + '">' + (D ? D.biz.email : "") + "</a></div></nav>"
    ));

    /* footer — identical on every page */
    var mount = document.getElementById("mcFooter");
    if (mount && D) {
      mount.outerHTML =
        '<footer class="footer" id="mcFooter">' +
        '<div class="wrap footer-cta"><p class="eyebrow" data-fx="fade">One conversation to start</p>' +
        '<h2 class="t-1" data-fx="fade" style="margin-top:20px">What’s your property <em>worth</em>?</h2>' +
        '<p class="lead" data-fx="fade" style="margin-top:22px">Get in touch with the Megacity team to discuss your property — a valuation costs nothing.</p>' +
        '<div class="hero-actions" data-fx="fade"><a class="btn btn--solid btn--lg magnetic" href="megacity-valuation">Request a valuation ' + svgArrow + "</a>" +
        '<a class="btn btn--ghost btn--lg" href="' + D.biz.phoneHref + '">Call ' + D.biz.phone + "</a></div></div>" +
        '<div class="wrap footer-grid">' +
        '<div class="footer-brand"><a class="nav-brand" href="megacity">' + esc(D.biz.brandName) + "<small>" + esc(D.biz.brandSub) + "</small></a>" +
        "<p>" + esc(D.biz.tagline ? D.biz.tagline + " — " : "") + (D.biz.tagline ? D.biz.strap.charAt(0).toLowerCase() + D.biz.strap.slice(1) : D.biz.strap) + ". Every managed home presented properly — photography, floor plans and a 360° tour you can walk before you visit.</p></div>" +
        '<div><h4>Explore</h4><ul><li><a href="megacity-properties">Properties</a></li><li><a href="megacity-tours">360° Tours</a></li><li><a href="megacity-tools">Tools &amp; calculators</a></li><li><a href="megacity-about">About</a></li><li><a href="megacity-contact">Contact</a></li></ul></div>' +
        '<div><h4>With us</h4><ul><li><a href="megacity-landlords">Landlords</a></li><li><a href="megacity-tenants">Tenants</a></li><li><a href="megacity-valuation">Valuation</a></li></ul></div>' +
        '<div><h4>Office</h4><ul>' +
        '<li><a href="' + D.biz.mapsHref + '" target="_blank" rel="noopener">' + D.biz.office + "</a></li>" +
        '<li><a href="' + D.biz.phoneHref + '">' + D.biz.phone + "</a></li>" +
        '<li><a href="mailto:' + D.biz.email + '">' + D.biz.email + "</a></li>" +
        '<li><a href="' + D.biz.facebook + '" target="_blank" rel="noopener">Facebook</a></li>' +
        '<li><a href="' + D.biz.linkedin + '" target="_blank" rel="noopener">LinkedIn</a></li></ul></div></div>' +
        '<div class="wrap footer-legal"><span>© <span id="mcYear"></span> ' + esc(D.biz.brandName + " " + D.biz.brandSub) + " · Company no. " + D.biz.companyNo + "</span>" +
        "<span>ARLA Propertymark · Client Money Protection · The Property Ombudsman T06217 · DPS · NRLA</span>" +
        '<span style="margin-left:auto">Redesign concept by <a href="/" target="_blank" rel="noopener">Billy Digitals</a></span></div>' +
        '<div class="wrap"><div class="footer-word" aria-hidden="true" data-fx="footer-word">' + esc((D.biz.brandName || "MEGACITY").toUpperCase()) + "</div></div></footer>";
      var y = document.getElementById("mcYear");
      if (y) y.textContent = new Date().getFullYear();
    }

    /* the 360 launch frame + photo lightbox live once per page */
    body.appendChild(el(
      '<div class="tour-overlay" id="mcTour" role="dialog" aria-modal="true" aria-label="360° virtual tour">' +
      '<div class="tour-overlay-bar"><button class="tour-back" id="mcTourBack">← Back to property</button>' +
      '<div style="min-width:0"><b id="mcTourName"></b><br><span>360° tour · drag to look · tap a ring to walk</span></div></div>' +
      '<div class="tour-frame" id="mcTourFrame"></div></div>'
    ));
    body.appendChild(el(
      '<div class="lightbox" id="mcLightbox" role="dialog" aria-modal="true" aria-label="Photo gallery">' +
      '<div class="lightbox-top"><p id="mcLbCaption"></p><button class="tour-back" id="mcLbClose">Close ×</button></div>' +
      '<div class="lightbox-stage"><button class="lightbox-nav lightbox-nav--prev" id="mcLbPrev" aria-label="Previous photo">←</button>' +
      '<img id="mcLbImg" alt=""><button class="lightbox-nav lightbox-nav--next" id="mcLbNext" aria-label="Next photo">→</button></div>' +
      '<div class="lightbox-thumbs" id="mcLbThumbs"></div></div>'
    ));
  }

  /* ── custom cursor ────────────────────────────────────────────── */
  function cursor() {
    if (touch || reduce) return;
    var dot = document.querySelector(".cursor"), ring = document.querySelector(".cursor-ring");
    if (!dot || !ring) return;
    var label = ring.querySelector("span");
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener("pointermove", function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = "translate(" + mx + "px," + my + "px) translate(-50%,-50%)";
    }, { passive: true });
    (function loop() {
      rx += (mx - rx) * 0.15; ry += (my - ry) * 0.15;
      ring.style.transform = "translate(" + rx + "px," + ry + "px) translate(-50%,-50%)";
      requestAnimationFrame(loop);
    })();
    document.addEventListener("pointerover", function (e) {
      var tagged = e.target.closest && e.target.closest("[data-cursor]");
      var hot = e.target.closest && e.target.closest("a,button,select,input,textarea,label");
      if (tagged) {
        label.textContent = tagged.getAttribute("data-cursor");
        ring.classList.add("is-label"); ring.classList.remove("is-hot");
      } else {
        ring.classList.remove("is-label");
        ring.classList.toggle("is-hot", !!hot);
      }
    });
  }

  /* ── magnetic CTAs ────────────────────────────────────────────── */
  function magnetic() {
    if (touch || reduce) return;
    document.querySelectorAll(".magnetic").forEach(function (elm) {
      elm.addEventListener("pointermove", function (e) {
        var r = elm.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.22;
        var y = (e.clientY - r.top - r.height / 2) * 0.3;
        elm.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
      });
      elm.addEventListener("pointerleave", function () { elm.style.transform = ""; });
    });
  }

  /* ── navigation: condense on scroll, full-screen menu ─────────── */
  function navigation() {
    var nav = document.querySelector(".nav");
    if (nav) {
      var onScroll = function () { nav.classList.toggle("is-solid", scrollY > 60); };
      addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      var path = here;
      nav.querySelectorAll(".nav-links a").forEach(function (a) {
        var target = (a.getAttribute("href") || "").split(/[?#]/)[0];
        if (target === path) a.classList.add("is-here");
      });
    }
    var burger = document.querySelector(".nav-burger");
    var menu = document.getElementById("mcMenu");
    if (!burger || !menu) return;
    var closeBtn = menu.querySelector(".menu-close");
    var items = menu.querySelectorAll(".menu-links li");
    var open = false;
    function setMenu(want) {
      open = want;
      burger.setAttribute("aria-expanded", String(want));
      menu.setAttribute("aria-hidden", String(!want));
      document.body.style.overflow = want ? "hidden" : "";
      if (!motion) { menu.classList.toggle("is-open", want); return; }
      if (want) {
        menu.classList.add("is-open");
        gsap.fromTo(menu, { yPercent: -100 }, { yPercent: 0, duration: 0.55, ease: "power4.out" });
        gsap.fromTo(items, { y: 44, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.06, delay: 0.18, ease: "power3.out" });
        gsap.fromTo(menu.querySelector(".menu-foot"), { opacity: 0 }, { opacity: 1, duration: 0.5, delay: 0.45 });
      } else {
        gsap.to(menu, {
          yPercent: -100, duration: 0.45, ease: "power3.in",
          onComplete: function () { menu.classList.remove("is-open"); gsap.set(menu, { yPercent: 0 }); }
        });
      }
    }
    burger.addEventListener("click", function () { setMenu(!open); if (open) closeBtn.focus(); });
    closeBtn.addEventListener("click", function () { setMenu(false); burger.focus(); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    addEventListener("keydown", function (e) { if (e.key === "Escape" && open) { setMenu(false); burger.focus(); } });
  }

  /* ── loader + hero entrance ───────────────────────────────────── */
  function intro() {
    var loader = document.querySelector(".loader");
    var seen = false;
    try { seen = sessionStorage.getItem("mc-seen") === "1"; sessionStorage.setItem("mc-seen", "1"); } catch (e) {}

    function hero() {
      if (!motion) return;
      var tl = gsap.timeline({ defaults: { ease: "power4.out" } });
      var media = document.querySelector(".hero-media img");
      if (media) tl.fromTo(media, { scale: 1.14 }, { scale: 1, duration: 2.2, ease: "power2.out" }, 0);
      tl.from(".nav", { y: -26, opacity: 0, duration: 0.9 }, 0.15);
      var lines = document.querySelectorAll(".hero .ln > span");
      if (lines.length) tl.from(lines, { yPercent: 118, duration: 1.15, stagger: 0.1 }, 0.3);
      var rest = document.querySelectorAll("[data-hero-fade]");
      if (rest.length) tl.from(rest, { y: 26, opacity: 0, duration: 0.9, stagger: 0.1 }, 0.85);
      tl.from(".scroll-cue", { opacity: 0, duration: 0.8 }, 1.2);
      tl.add(function () { ScrollTrigger.refresh(); });
    }

    if (!loader || !motion || seen) {
      if (loader) loader.style.display = "none";
      hero();
      return;
    }
    var fill = loader.querySelector(".loader-bar i");
    var tl = gsap.timeline({
      onComplete: function () { loader.style.display = "none"; hero(); }
    });
    tl.to(fill, { width: "100%", duration: 0.7, ease: "power2.inOut" })
      .to(loader.querySelector(".loader-in"), { yPercent: -24, opacity: 0, duration: 0.4, ease: "power2.in" }, 0.72)
      .to(loader, { yPercent: -100, duration: 0.6, ease: "power4.inOut" }, 0.85);
  }

  /* ── page transitions ─────────────────────────────────────────── */
  function transitions() {
    var veil = document.querySelector(".veil");
    if (!veil || !motion) return;
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a) return;
      var href = a.getAttribute("href");
      if (e.metaKey || e.ctrlKey || e.shiftKey || a.target === "_blank") return;
      if (!href || /^(https?:|mailto:|tel:|#)/.test(href) || href.indexOf("#") === 0) return;
      if (href.indexOf("/billy360/") === 0) return;           /* the tour opens in-place */
      e.preventDefault();
      gsap.fromTo(veil, { scaleY: 0, transformOrigin: "bottom" },
        { scaleY: 1, duration: 0.38, ease: "power3.inOut", onComplete: function () { location.href = href; } });
    });
    addEventListener("pageshow", function (e) { if (e.persisted) gsap.set(veil, { scaleY: 0 }); });
    gsap.set(veil, { scaleY: 0 });
  }

  /* ── the reusable scroll vocabulary ───────────────────────────── */
  var fx = {
    fadeUp: function (elm, opts) {
      gsap.fromTo(elm, { y: 40, opacity: 0 }, Object.assign({
        y: 0, opacity: 1, duration: 1, ease: "power3.out",
        scrollTrigger: { trigger: elm, start: "top 88%" }
      }, opts || {}));
    },
    revealImage: function (fig) {
      var mask = fig.querySelector(".mask");
      var img = fig.querySelector("img");
      if (mask) gsap.to(mask, {
        scaleX: 0, transformOrigin: "right", duration: 1.15, ease: "power4.inOut",
        scrollTrigger: { trigger: fig, start: "top 82%" }
      });
      if (img) gsap.fromTo(img, { scale: 1.15 }, {
        scale: 1, duration: 1.5, ease: "power3.out",
        scrollTrigger: { trigger: fig, start: "top 82%" }
      });
    },
    parallaxImage: function (elm, amount) {
      var img = elm.tagName === "IMG" ? elm : elm.querySelector("img");
      if (!img) return;
      gsap.fromTo(img, { yPercent: -(amount || 8) }, {
        yPercent: (amount || 8), ease: "none",
        scrollTrigger: { trigger: elm, start: "top bottom", end: "bottom top", scrub: true }
      });
    },
    scaleOnScroll: function (elm) {
      gsap.fromTo(elm, { scale: 0.94 }, {
        scale: 1, ease: "none",
        scrollTrigger: { trigger: elm, start: "top 95%", end: "top 40%", scrub: true }
      });
    },
    staggerChildren: function (elm) {
      gsap.fromTo(elm.children, { y: 44, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.9, ease: "power3.out", stagger: 0.09,
        scrollTrigger: { trigger: elm, start: "top 86%" }
      });
    },
    counter: function (elm) {
      var target = parseFloat(elm.getAttribute("data-count"));
      var suffix = elm.getAttribute("data-suffix") || "";
      var obj = { v: 0 };
      ScrollTrigger.create({
        trigger: elm, start: "top 90%", once: true,
        onEnter: function () {
          gsap.to(obj, {
            v: target, duration: 1.5, ease: "power2.out",
            onUpdate: function () { elm.textContent = Math.round(obj.v) + suffix; },
            onComplete: function () { elm.textContent = target + suffix; }
          });
        }
      });
    }
  };

  function scrollFx(scope) {
    var root = scope || document;
    if (!motion) {
      root.querySelectorAll(".mask").forEach(function (m) { m.style.display = "none"; });
      return;
    }
    root.querySelectorAll('[data-fx="fade"]').forEach(function (e) { fx.fadeUp(e); });
    root.querySelectorAll('[data-fx="mask"]').forEach(fx.revealImage);
    root.querySelectorAll('[data-fx="parallax"]').forEach(function (e) {
      fx.parallaxImage(e, parseFloat(e.getAttribute("data-amount")) || 8);
    });
    /* a slow, always-on breath so cinematic imagery is never frozen —
       composes with the scroll parallax (scale vs. translate) */
    root.querySelectorAll(".city-fig img, .s360-media img").forEach(function (img, i) {
      gsap.fromTo(img, { scale: 1.02 }, {
        scale: 1.08, duration: 11 + i * 2.3, ease: "sine.inOut",
        yoyo: true, repeat: -1, delay: i * 1.4
      });
    });
    root.querySelectorAll('[data-fx="scale"]').forEach(fx.scaleOnScroll);
    root.querySelectorAll('[data-fx="stagger"]').forEach(fx.staggerChildren);
    root.querySelectorAll("[data-count]").forEach(fx.counter);
    root.querySelectorAll('[data-fx="footer-word"]').forEach(function (e) {
      gsap.fromTo(e, { yPercent: 46, opacity: 0 }, {
        yPercent: 0, opacity: 1, duration: 1.2, ease: "power3.out",
        scrollTrigger: { trigger: e, start: "top 96%" }
      });
    });
  }

  /* ── property cards ───────────────────────────────────────────── */
  function cardHTML(p) {
    var badge360 = p.tour
      ? '<span class="badge badge--360"><i></i>360° tour</span>' : "";
    return '<div class="prop-shell">' +
      '<a class="prop-card" data-cursor="View" href="megacity-property?id=' + p.id + '" aria-label="' + p.name + ", " + p.area + ", " + p.priceLabel + '">' +
      '<span class="prop-media"><img src="' + p.cover + '" alt="' + p.name + " — " + p.type + " in " + p.area + '" loading="lazy" decoding="async">' +
      '<span class="prop-flags"><span class="badge badge--' + p.status + '">' + p.statusLabel + "</span>" + badge360 + "</span>" +
      '<span class="prop-cta">View home ' + svgArrow + "</span></span>" +
      '<span class="prop-info"><span class="prop-price">£' + p.price.toLocaleString("en-GB") + "<small>" + (p.priceLabel && p.priceLabel.indexOf("bills") !== -1 ? "pcm · bills inc." : "pcm") + "</small></span>" +
      '<span class="prop-where">' + p.area + (p.postcode ? " · " + p.postcode : "") + "</span></span>" +
      '<span class="prop-meta"><i>' + p.beds + " bed</i><i>" + p.baths + " bath</i><i>" + p.type + "</i></span>" +
      '<span class="prop-name">' + p.name + "</span></a>" +
      '<button class="prop-save' + (saved.has(p.id) ? " is-on" : "") + '" data-save="' + p.id +
      '" aria-label="Save ' + p.name + ' to your shortlist" aria-pressed="' + saved.has(p.id) + '">' + svgHeart + "</button></div>";
  }

  /* hearts: toggle everywhere, refresh any saved-counts on the page */
  function bindSaves() {
    document.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-save]");
      if (!b) return;
      var on = saved.toggle(b.getAttribute("data-save"));
      $$b('[data-save="' + b.getAttribute("data-save") + '"]').forEach(function (x) {
        x.classList.toggle("is-on", on);
        x.setAttribute("aria-pressed", String(on));
      });
      if (motion) gsap.fromTo(b, { scale: 0.8 }, { scale: 1, duration: 0.4, ease: "back.out(3)" });
      updateSavedCount();
      document.dispatchEvent(new CustomEvent("mc:saved-changed"));
    });
  }
  function updateSavedCount() {
    $$b("[data-saved-count]").forEach(function (el) {
      var n = saved.all().length;
      el.textContent = n ? "Saved · " + n : "Saved";
      el.classList.toggle("has-saves", n > 0);
    });
  }

  /* a card plus its own "enter the tour" action — for the 360 directory */
  function tourCardHTML(p) {
    return '<div>' + cardHTML(p) +
      '<div style="margin-top:16px"><button class="btn btn--ghost" data-cursor="360°" data-tour="' + p.id + '">Enter 360° tour ' + svgArrow + "</button></div></div>";
  }

  /* grids that render themselves from the shared data */
  function autoGrids() {
    if (!D) return;
    var feat = document.getElementById("mcFeatured");
    if (feat) {
      var ids = (feat.getAttribute("data-ids") || "").split(",").filter(Boolean);
      var list = ids.length ? ids.map(D.byId).filter(Boolean) : D.properties.slice(0, 3);
      feat.innerHTML = list.map(cardHTML).join("");
    }
    var tg = document.getElementById("mcToursGrid");
    if (tg) tg.innerHTML = D.withTours().map(tourCardHTML).join("");

    /* "similar homes" — same area, or within 20% of the price */
    $$b("[data-similar]").forEach(function (grid) {
      var base = D.byId(grid.getAttribute("data-similar"));
      var section = grid.closest("[data-similar-section]");
      if (!base) { if (section) section.hidden = true; return; }
      var list = D.properties.filter(function (p) {
        if (p.id === base.id) return false;
        return p.area === base.area || Math.abs(p.price - base.price) <= base.price * 0.2;
      }).slice(0, 3);
      if (!list.length) { if (section) section.hidden = true; return; }
      if (section) section.hidden = false;
      grid.innerHTML = list.map(cardHTML).join("");
    });

    /* recently-viewed strips — hidden until the visitor has a history */
    $$b("[data-recent]").forEach(function (grid) {
      var exclude = grid.getAttribute("data-exclude");
      var list = viewed.all().filter(function (id) { return id !== exclude; })
        .map(D.byId).filter(Boolean).slice(0, 3);
      var section = grid.closest("[data-recent-section]");
      if (!list.length) { if (section) section.hidden = true; return; }
      if (section) section.hidden = false;
      grid.innerHTML = list.map(cardHTML).join("");
    });
  }

  /* ── discovery: filters, chips, count, empty state ────────────── */
  function discover() {
    var grid = document.getElementById("mcGrid");
    if (!grid || !D) return;
    var controls = document.querySelectorAll("[data-filter]");
    var chipsBox = document.getElementById("mcChips");
    var countBox = document.getElementById("mcCount");
    var emptyBox = document.getElementById("mcEmpty");
    var status = document.getElementById("mcStatus");
    var sortSel = document.getElementById("mcSort");

    /* arrive with intent: honour ?area=&beds=&max=&tours=&q= from the quick search */
    var q = new URLSearchParams(location.search);
    controls.forEach(function (c) {
      var k = c.getAttribute("data-filter");
      if (q.has(k)) { if (c.type === "checkbox") c.checked = q.get(k) === "1"; else c.value = q.get(k); }
    });

    /* shortlist-only toggle */
    var savedToggle = document.getElementById("mcSavedToggle");
    var savedOnly = q.get("saved") === "1";
    function syncSavedToggle() {
      if (!savedToggle) return;
      savedToggle.classList.toggle("is-on", savedOnly);
      savedToggle.setAttribute("aria-pressed", String(savedOnly));
    }
    if (savedToggle) {
      savedToggle.addEventListener("click", function () { savedOnly = !savedOnly; syncSavedToggle(); apply(); });
      document.addEventListener("mc:saved-changed", function () { if (savedOnly) apply(); });
      syncSavedToggle();
    }

    function current() {
      var f = {};
      controls.forEach(function (c) {
        var k = c.getAttribute("data-filter");
        f[k] = c.type === "checkbox" ? (c.checked ? "1" : "") : c.value;
      });
      return f;
    }
    function apply() {
      var f = current();
      var shortlist = saved.all();
      var list = D.properties.filter(function (p) {
        if (savedOnly && shortlist.indexOf(p.id) === -1) return false;
        if (f.area && p.area !== f.area) return false;
        if (f.type && p.type.indexOf(f.type) === -1) return false;
        if (f.beds && p.beds < +f.beds) return false;
        if (f.min && p.price < +f.min) return false;
        if (f.max && p.price > +f.max) return false;
        if (f.tours && !p.tour) return false;
        if (f.q) {
          var hay = (p.name + " " + p.area + " " + p.postcode + " " + p.type).toLowerCase();
          if (hay.indexOf(f.q.toLowerCase()) === -1) return false;
        }
        return true;
      });
      var sort = sortSel ? sortSel.value : "featured";
      if (sort === "price-asc") list.sort(function (a, b) { return a.price - b.price; });
      if (sort === "price-desc") list.sort(function (a, b) { return b.price - a.price; });
      if (sort === "beds") list.sort(function (a, b) { return b.beds - a.beds; });

      grid.innerHTML = list.map(cardHTML).join("");
      if (countBox) countBox.textContent = list.length + (list.length === 1 ? " home" : " homes");
      if (status) status.textContent = list.length + " properties shown";
      if (emptyBox) emptyBox.hidden = list.length !== 0;
      grid.hidden = list.length === 0;

      /* active filter chips */
      if (chipsBox) {
        var chips = [];
        var names = { area: "", type: "", beds: "+ beds", min: "from £", max: "to £", tours: "360° tours", q: "“”" };
        Object.keys(f).forEach(function (k) {
          if (!f[k]) return;
          var label = k === "beds" ? f[k] + "+ beds"
            : k === "min" ? "From £" + (+f[k]).toLocaleString("en-GB")
            : k === "max" ? "To £" + (+f[k]).toLocaleString("en-GB")
            : k === "tours" ? "360° tour available"
            : k === "q" ? "“" + f[k] + "”" : f[k];
          chips.push('<button class="chip" data-clear="' + k + '">' + label + " <i>×</i></button>");
        });
        chipsBox.innerHTML = chips.join("");
      }
      if (motion) {
        gsap.fromTo(grid.children, { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, stagger: 0.05, ease: "power3.out" });
        ScrollTrigger.refresh();
      }
    }
    controls.forEach(function (c) { c.addEventListener("change", apply); c.addEventListener("input", function () {
      if (c.type === "search" || c.type === "text") apply();
    }); });
    if (sortSel) sortSel.addEventListener("change", apply);
    if (chipsBox) chipsBox.addEventListener("click", function (e) {
      var b = e.target.closest("[data-clear]");
      if (!b) return;
      var k = b.getAttribute("data-clear");
      controls.forEach(function (c) {
        if (c.getAttribute("data-filter") !== k) return;
        if (c.type === "checkbox") c.checked = false; else c.value = "";
      });
      apply();
    });
    document.querySelectorAll("[data-clear-all]").forEach(function (b) {
      b.addEventListener("click", function () {
        controls.forEach(function (c) { if (c.type === "checkbox") c.checked = false; else c.value = ""; });
        apply();
      });
    });

    /* mobile filter drawer */
    var drawer = document.getElementById("mcDrawer");
    var openBtn = document.getElementById("mcDrawerOpen");
    if (drawer && openBtn) {
      var setDrawer = function (want) {
        drawer.classList.toggle("is-open", want);
        document.body.style.overflow = want ? "hidden" : "";
      };
      openBtn.addEventListener("click", function () { setDrawer(true); });
      drawer.addEventListener("click", function (e) {
        if (e.target.closest("[data-drawer-close]")) setDrawer(false);
      });
    }
    apply();
  }

  /* ── 360 launch — the existing platform, full screen ──────────── */
  var tour = (function () {
    var overlay, frame, nameEl, backBtn, lastFocus = null, loaded = "";
    function refs() {
      overlay = document.getElementById("mcTour");
      frame = document.getElementById("mcTourFrame");
      nameEl = document.getElementById("mcTourName");
      backBtn = document.getElementById("mcTourBack");
      if (backBtn && !backBtn._wired) {
        backBtn._wired = true;
        backBtn.addEventListener("click", close);
        addEventListener("keydown", function (e) {
          if (e.key === "Escape" && overlay.classList.contains("is-open")) close();
        });
      }
    }
    function open(id, room) {
      refs();
      if (!overlay || !D) return;
      var p = D.byId(id);
      var url = D.tourUrl(p, room);
      if (!url) return;
      lastFocus = document.activeElement;
      nameEl.textContent = p.name + " · " + p.area;
      /* the engine loads only now — never on page load */
      if (loaded !== url) {
        frame.innerHTML = '<iframe src="' + url + '" title="360° tour — ' + p.name + '" allow="fullscreen; accelerometer; gyroscope; xr-spatial-tracking" allowfullscreen></iframe>';
        loaded = url;
      }
      overlay.classList.add("is-open");
      document.body.style.overflow = "hidden";
      if (motion) gsap.fromTo(overlay, { opacity: 0, scale: 1.02 }, { opacity: 1, scale: 1, duration: 0.45, ease: "power3.out" });
      backBtn.focus();
    }
    function close() {
      if (!overlay) return;
      var done = function () { overlay.classList.remove("is-open"); };
      if (motion) gsap.to(overlay, { opacity: 0, duration: 0.3, ease: "power2.in", onComplete: function () { done(); gsap.set(overlay, { opacity: 1 }); } });
      else done();
      document.body.style.overflow = "";
      if (lastFocus) lastFocus.focus();
    }
    function bind() {
      document.addEventListener("click", function (e) {
        var b = e.target.closest && e.target.closest("[data-tour]");
        if (!b) return;
        e.preventDefault();
        open(b.getAttribute("data-tour"), b.getAttribute("data-tour-room") || null);
      });
    }
    return { open: open, close: close, bind: bind };
  })();

  /* ── photo lightbox ───────────────────────────────────────────── */
  var gallery = (function () {
    var box, img, cap, thumbs, photos = [], i = 0, lastFocus = null;
    function refs() {
      box = document.getElementById("mcLightbox");
      img = document.getElementById("mcLbImg");
      cap = document.getElementById("mcLbCaption");
      thumbs = document.getElementById("mcLbThumbs");
      if (box && !box._wired) {
        box._wired = true;
        document.getElementById("mcLbClose").addEventListener("click", close);
        document.getElementById("mcLbPrev").addEventListener("click", function () { show(i - 1); });
        document.getElementById("mcLbNext").addEventListener("click", function () { show(i + 1); });
        addEventListener("keydown", function (e) {
          if (!box.classList.contains("is-open")) return;
          if (e.key === "Escape") close();
          if (e.key === "ArrowLeft") show(i - 1);
          if (e.key === "ArrowRight") show(i + 1);
        });
        var sx = 0;
        box.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
        box.addEventListener("touchend", function (e) {
          var dx = e.changedTouches[0].clientX - sx;
          if (Math.abs(dx) > 48) show(dx > 0 ? i - 1 : i + 1);
        }, { passive: true });
      }
    }
    function show(n) {
      i = (n + photos.length) % photos.length;
      var ph = photos[i];
      if (motion) gsap.fromTo(img, { opacity: 0, scale: 0.985 }, { opacity: 1, scale: 1, duration: 0.45, ease: "power2.out" });
      img.src = ph.src; img.alt = ph.caption || "";
      cap.textContent = (ph.room ? ph.room + " — " : "") + (ph.caption || "") + "  ·  " + (i + 1) + " / " + photos.length;
      thumbs.querySelectorAll("button").forEach(function (b, n2) { b.classList.toggle("is-on", n2 === i); });
    }
    function open(list, n) {
      refs();
      if (!box) return;
      photos = list; lastFocus = document.activeElement;
      thumbs.innerHTML = list.map(function (p, n2) {
        return '<button aria-label="Photo ' + (n2 + 1) + '"><img src="' + p.src + '" alt="" loading="lazy"></button>';
      }).join("");
      thumbs.querySelectorAll("button").forEach(function (b, n2) { b.addEventListener("click", function () { show(n2); }); });
      box.classList.add("is-open");
      document.body.style.overflow = "hidden";
      show(n || 0);
      document.getElementById("mcLbClose").focus();
    }
    function close() {
      box.classList.remove("is-open");
      document.body.style.overflow = "";
      if (lastFocus) lastFocus.focus();
    }
    return { open: open, close: close };
  })();

  /* ── forms: honest submission — opens a pre-filled email ──────── */
  function forms() {
    /* forms with data-api post JSON to the site worker (real send) */
    document.querySelectorAll("form[data-api]").forEach(function (f) {
      f.addEventListener("submit", function (e) {
        e.preventDefault();
        var data = {};
        f.querySelectorAll("input,select,textarea").forEach(function (c) {
          if (!c.name || c.type === "submit") return;
          data[c.name] = c.type === "checkbox" ? (c.checked ? "yes" : "") : c.value;
        });
        var btn = f.querySelector('button[type="submit"]');
        var note = f.querySelector(".form-note");
        if (btn) { btn.disabled = true; btn.style.opacity = ".6"; }
        fetch(f.getAttribute("data-api"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(data)
        }).then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (jr) { return { ok: r.ok, body: jr }; });
        }).then(function (res) {
          if (btn) { btn.disabled = false; btn.style.opacity = ""; }
          if (!res.ok) throw new Error((res.body && res.body.error) || "something went wrong");
          var done = f.querySelector(".form-done");
          if (done) {
            done.hidden = false;
            if (motion) gsap.from(done, { y: 16, opacity: 0, duration: 0.6, ease: "power3.out" });
          }
          f.querySelectorAll("input:not([type=hidden]),textarea").forEach(function (c) { c.value = ""; });
        }).catch(function (err) {
          if (btn) { btn.disabled = false; btn.style.opacity = ""; }
          if (note) note.textContent = "Could not send — " + err.message + ". Please call the office on " + (D ? D.biz.phone : "") + " instead.";
        });
      });
    });
    document.querySelectorAll("form[data-mailto]").forEach(function (f) {
      f.addEventListener("submit", function (e) {
        e.preventDefault();
        var subject = f.getAttribute("data-subject") || "Website enquiry";
        var lines = [];
        f.querySelectorAll("input,select,textarea").forEach(function (c) {
          if (!c.name || c.type === "submit") return;
          var v = c.type === "checkbox" ? (c.checked ? "yes" : "no") : c.value;
          if (v) lines.push(c.name + ": " + v);
        });
        var to = (D ? D.biz.email : "");
        location.href = "mailto:" + to + "?subject=" + encodeURIComponent(subject) +
          "&body=" + encodeURIComponent(lines.join("\n"));
        var done = f.querySelector(".form-done");
        if (done) {
          done.hidden = false;
          if (motion) gsap.from(done, { y: 16, opacity: 0, duration: 0.6, ease: "power3.out" });
        }
      });
    });
  }

  /* ── boot ─────────────────────────────────────────────────────── */
  function boot() {
    buildChrome();
    applyBrand();
    cursor();
    navigation();
    tour.bind();
    bindSaves();
    updateSavedCount();
    forms();
    if (!motion) {
      var l = document.querySelector(".loader"); if (l) l.style.display = "none";
      document.querySelectorAll(".mask").forEach(function (m) { m.style.display = "none"; });
    }
    autoGrids();
    intro();
    transitions();
    scrollFx();
    discover();
    magnetic();
    if (motion) ScrollTrigger.refresh();
  }

  window.MC = { fx: fx, cardHTML: cardHTML, tour: tour, gallery: gallery, scrollFx: scrollFx, arrow: svgArrow, saved: saved, viewed: viewed };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

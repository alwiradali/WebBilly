/* ============================================================
   MAISON NOIR — interaction & motion
   GSAP + ScrollTrigger + Lenis. Degrades gracefully:
   if libs are missing or reduced-motion is set, the page is
   fully visible and usable with no animation.
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGSAP = window.gsap && window.ScrollTrigger;
  var touch = window.matchMedia && matchMedia("(hover: none)").matches;

  /* ---------- custom cursor + magnetic ---------- */
  (function cursor () {
    if (touch) return;
    var dot = document.querySelector(".cursor");
    var ring = document.querySelector(".cursor-ring");
    if (!dot || !ring) return;
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener("pointermove", function (e) { mx = e.clientX; my = e.clientY; dot.style.transform = "translate(" + mx + "px," + my + "px) translate(-50%,-50%)"; }, { passive: true });
    (function loop () { rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16; ring.style.transform = "translate(" + rx + "px," + ry + "px) translate(-50%,-50%)"; requestAnimationFrame(loop); })();
    document.querySelectorAll("a,button,.magnetic,.svc,.h-card").forEach(function (el) {
      el.addEventListener("pointerenter", function () { dot.classList.add("hot"); ring.classList.add("hot"); });
      el.addEventListener("pointerleave", function () { dot.classList.remove("hot"); ring.classList.remove("hot"); });
    });
    // magnetic buttons
    document.querySelectorAll(".magnetic").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.35;
        var y = (e.clientY - r.top - r.height / 2) * 0.45;
        el.style.transform = "translate(" + x + "px," + y + "px)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  })();

  /* ---------- nav solid on scroll ---------- */
  var nav = document.querySelector(".nav");
  addEventListener("scroll", function () { if (nav) nav.classList.toggle("solid", scrollY > 40); }, { passive: true });

  /* ---------- services hover peek ---------- */
  (function peek () {
    if (touch) return;
    var box = document.querySelector(".svc-peek");
    if (!box) return;
    var img = box.querySelector("img");
    document.querySelectorAll(".svc").forEach(function (row) {
      var src = row.getAttribute("data-img");
      row.addEventListener("pointerenter", function () { if (src) img.src = src; box.classList.add("on"); });
      row.addEventListener("pointerleave", function () { box.classList.remove("on"); });
    });
    addEventListener("pointermove", function (e) { box.style.top = e.clientY + "px"; box.style.left = e.clientX + "px"; }, { passive: true });
  })();

  /* ---------- loader ---------- */
  function hideLoader (cb) {
    var loader = document.querySelector(".loader");
    if (!loader) { cb && cb(); return; }
    if (!hasGSAP || reduce) { loader.style.display = "none"; cb && cb(); return; }
    var tl = gsap.timeline({ onComplete: function () { loader.style.display = "none"; cb && cb(); } });
    tl.to(".loader-num", { textContent: 100, duration: 1.1, snap: { textContent: 1 }, ease: "power2.inOut",
        onUpdate: function () { var n = document.querySelector(".loader-num"); if (n) n.textContent = Math.round(this.targets()[0].textContent); } }, 0)
      .to(".loader-inner", { yPercent: -30, opacity: 0, duration: 0.6, ease: "power2.in" }, 1.15)
      .to(".loader", { yPercent: -100, duration: 0.8, ease: "power4.inOut" }, 1.3);
  }

  if (!hasGSAP || reduce) {
    // Static fallback: reveal everything.
    document.querySelectorAll("[data-fade],.hero-eyebrow,.hero-foot p,.hero-sub,.hero-actions,.hero-meta,.hero-ui").forEach(function (el) { el.style.opacity = 1; el.style.transform = "none"; });
    document.querySelectorAll(".hero h1 .ln > span").forEach(function (el) { el.style.transform = "none"; });
    document.querySelectorAll(".manifesto .word").forEach(function (el) { el.classList.add("on"); });
    var l0 = document.querySelector(".loader"); if (l0) l0.style.display = "none";
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Lenis smooth scroll ---------- */
  var lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ duration: 1.1, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------- split manifesto into words ---------- */
  document.querySelectorAll("[data-words]").forEach(function (el) {
    var html = el.innerHTML;
    // keep <em> wrappers: split on spaces but preserve tags roughly by tokenising text nodes
    var tmp = document.createElement("div"); tmp.innerHTML = html;
    function wrap (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (tok) {
            if (/^\s+$/.test(tok) || tok === "") { frag.appendChild(document.createTextNode(tok)); }
            else { var s = document.createElement("span"); s.className = "word"; s.textContent = tok; frag.appendChild(s); }
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) { wrap(child); }
      });
    }
    wrap(tmp);
    el.innerHTML = tmp.innerHTML;
  });

  hideLoader(function () {
    // hero entrance
    var tl = gsap.timeline({ defaults: { ease: "power4.out" } });
    tl.from(".hero h1 .ln > span", { yPercent: 115, duration: 1.1, stagger: 0.08 }, 0)
      .to(".hero-eyebrow", { opacity: 1, y: 0, duration: 0.8 }, 0.3)
      .to(".hero-sub, .hero-actions, .hero-meta", { opacity: 1, duration: 0.9, stagger: 0.12 }, 0.55)
      .from(".hero-ui", { opacity: 0, y: 40, scale: 0.94, duration: 1.2, ease: "power3.out" }, 0.35)
      .from(".scroll-cue", { opacity: 0, duration: 0.8 }, 0.7);
    ScrollTrigger.refresh();
  });

  /* ---------- generic fade-ups ---------- */
  gsap.utils.toArray("[data-fade]").forEach(function (el) {
    gsap.to(el, { opacity: 1, y: 0, duration: 1, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 86%" } });
  });

  /* ---------- hero parallax ---------- */
  gsap.to(".hero-media", { yPercent: 16, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

  /* ---------- manifesto word reveal ---------- */
  document.querySelectorAll("[data-words]").forEach(function (el) {
    var words = el.querySelectorAll(".word");
    ScrollTrigger.create({
      trigger: el, start: "top 80%", end: "bottom 55%", scrub: true,
      onUpdate: function (self) {
        var n = Math.round(self.progress * words.length);
        words.forEach(function (w, i) { w.classList.toggle("on", i < n); });
      }
    });
  });

  /* ---------- horizontal pinned gallery ---------- */
  (function hScroll () {
    var pin = document.querySelector(".h-pin");
    var track = document.querySelector(".h-track");
    var bar = document.querySelector(".h-progress i");
    if (!pin || !track) return;
    // On mobile the horizontal pin overlaps neighbouring sections — let the
    // cards fall into normal vertical flow instead (handled by CSS).
    if (window.matchMedia && matchMedia("(max-width: 820px)").matches) return;
    function amount () { return Math.max(0, track.scrollWidth - window.innerWidth); }
    var tween = gsap.to(track, {
      x: function () { return -amount(); }, ease: "none",
      scrollTrigger: {
        trigger: ".h-scroll", start: "top top",
        end: function () { return "+=" + amount(); },
        pin: true, scrub: 1, invalidateOnRefresh: true,
        onUpdate: function (self) { if (bar) bar.style.width = (self.progress * 100).toFixed(1) + "%"; }
      }
    });
    // subtle parallax inside each card image
    document.querySelectorAll(".h-figure img").forEach(function (img) {
      gsap.fromTo(img, { x: 30 }, { x: -30, ease: "none",
        scrollTrigger: { trigger: ".h-scroll", start: "top top", end: function () { return "+=" + amount(); }, scrub: true, containerAnimation: tween, trigger: img } });
    });
  })();

  /* ---------- feature mask wipe + parallax ---------- */
  document.querySelectorAll(".feature-fig").forEach(function (fig) {
    var mask = fig.querySelector(".mask");
    var img = fig.querySelector("img");
    if (mask) gsap.to(mask, { scaleX: 0, transformOrigin: "right", duration: 1.2, ease: "power4.inOut",
      scrollTrigger: { trigger: fig, start: "top 80%" } });
    if (img) gsap.fromTo(img, { yPercent: -8 }, { yPercent: 8, ease: "none",
      scrollTrigger: { trigger: fig, start: "top bottom", end: "bottom top", scrub: true } });
  });

  /* ---------- stat counters ---------- */
  document.querySelectorAll("[data-count]").forEach(function (el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var suffix = el.getAttribute("data-suffix") || "";
    var obj = { v: 0 };
    ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: function () {
      gsap.to(obj, { v: target, duration: 1.6, ease: "power2.out",
        onUpdate: function () { el.textContent = Math.round(obj.v) + suffix; },
        onComplete: function () { el.textContent = target + suffix; } });
    } });
  });

  /* ---------- marquee ---------- */
  document.querySelectorAll(".marquee-in").forEach(function (row, i) {
    gsap.to(row, { xPercent: -50, repeat: -1, duration: 22, ease: "none" });
  });

  ScrollTrigger.refresh();
})();

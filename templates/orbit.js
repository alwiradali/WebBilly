/* ============================================================
   ORBIT — "The Orbital Field": a cosmic system of glowing nodes
   orbiting a luminous core on tilted concentric rings, over a
   drifting nebula and a slow starfield. Canvas 2D (light, mobile-
   friendly), pointer-parallax, and scroll-reactive (the whole
   system shifts blue -> violet -> magenta as you descend).
   A deliberately DIFFERENT signature from the Meridian flagship.
   Degrades to the CSS backdrop under reduced-motion.
   ============================================================ */
(function () {
  "use strict";
  var canvas = document.getElementById("orbit-gl");
  if (!canvas) return;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobile = window.matchMedia && matchMedia("(max-width: 820px)").matches;
  if (reduce) { canvas.style.display = "none"; return; }
  var ctx = canvas.getContext("2d");
  if (!ctx) { canvas.style.display = "none"; return; }

  var DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
  var W, H, cx, cy, R;
  function size() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx = W * 0.5; cy = H * 0.5; R = Math.min(W, H);
  }
  size(); window.addEventListener("resize", size);

  // ---- build the rings + orbiting nodes ----
  var RINGS = mobile ? 4 : 7;
  var rings = [];
  for (var i = 0; i < RINGS; i++) {
    var frac = 0.14 + (i / (RINGS - 1)) * 0.82;      // ring radius as fraction of R/2
    var count = 3 + (i % 3);                           // 3..5 nodes per ring
    var nodes = [];
    for (var j = 0; j < count; j++) {
      nodes.push({
        ang: (j / count) * Math.PI * 2 + i * 0.7,
        sp: (0.5 + (i % 2 ? 0.3 : -0.45)) * (1 - i * 0.05),
        hueOff: (j * 26) - 20,
        sz: 1.8 + (j % 2) * 1.7
      });
    }
    rings.push({ frac: frac, tilt: 0.34 + i * 0.03, nodes: nodes, spin: (i % 2 ? 1 : -1) * (0.5 + i * 0.08), base: i * 0.5 });
  }
  var stars = [], SN = mobile ? 80 : 150;
  for (var s = 0; s < SN; s++) stars.push({ x: Math.random(), y: Math.random(), z: Math.random() * 0.85 + 0.15 });

  // Pre-render glow sprites once (hue-bucketed) so we never allocate a gradient
  // per node per frame — that churn is what spikes memory/GPU during recording.
  var GLOW = [], HUE_MIN = 180, HUE_STEP = 16, GN = 16;
  (function buildGlow() {
    for (var g = 0; g < GN; g++) {
      var sc = document.createElement("canvas"), SZ = 48; sc.width = SZ; sc.height = SZ;
      var sx = sc.getContext("2d"), h = HUE_MIN + g * HUE_STEP;
      var gg = sx.createRadialGradient(SZ / 2, SZ / 2, 0, SZ / 2, SZ / 2, SZ / 2);
      gg.addColorStop(0, "hsla(" + h + ",95%,76%,0.95)");
      gg.addColorStop(0.45, "hsla(" + h + ",95%,66%,0.35)");
      gg.addColorStop(1, "hsla(" + h + ",95%,60%,0)");
      sx.fillStyle = gg; sx.fillRect(0, 0, SZ, SZ);
      GLOW.push(sc);
    }
  })();
  function glowFor(h) { var i = Math.round((h - HUE_MIN) / HUE_STEP); return GLOW[i < 0 ? 0 : (i >= GN ? GN - 1 : i)]; }

  var mx = 0, my = 0, tmx = 0, tmy = 0, prog = 0, tprog = 0, rot = 0;
  window.addEventListener("pointermove", function (e) { tmx = e.clientX / window.innerWidth - 0.5; tmy = e.clientY / window.innerHeight - 0.5; }, { passive: true });
  var scrolling = false, scrollT = null;
  window.addEventListener("scroll", function () {
    var d = document.documentElement.scrollHeight - window.innerHeight;
    tprog = Math.min(Math.max((window.pageYOffset || 0) / (d || 1), 0), 1);
    if (mobile) { scrolling = true; if (scrollT) clearTimeout(scrollT); scrollT = setTimeout(function () { scrolling = false; }, 150); }
  }, { passive: true });

  var last = performance.now(), lastDraw = 0, minDelta = mobile ? (1000 / 30) : 0, raf = null;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    // hand the frame budget back to the scroller while actively scrolling (mobile)
    if (mobile && scrolling) { last = now; return; }
    if (now - lastDraw < minDelta) return;
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; lastDraw = now;

    mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
    prog += (tprog - prog) * 0.06; rot += dt * 0.04;
    var ox = cx + mx * 34, oy = cy + my * 26;
    var hue0 = 212 + prog * 120;                       // blue -> violet/magenta with scroll

    ctx.clearRect(0, 0, W, H);

    // nebula
    var g = ctx.createRadialGradient(ox, oy, 0, cx, cy, R * 0.82);
    g.addColorStop(0, "hsla(" + hue0 + ",92%,62%,0.24)");
    g.addColorStop(0.4, "hsla(" + (hue0 + 24) + ",82%,54%,0.09)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // starfield
    for (var k = 0; k < stars.length; k++) {
      var st = stars[k], sx = st.x * W + mx * 22 * st.z, sy = st.y * H + my * 18 * st.z;
      ctx.globalAlpha = st.z * 0.5; ctx.fillStyle = "#c3d4ff";
      var ss = st.z * 1.7; ctx.fillRect(sx, sy, ss, ss);
    }
    ctx.globalAlpha = 1;

    // rings + nodes
    for (var i = 0; i < rings.length; i++) {
      var ring = rings[i], rad = ring.frac * R * 0.52, ry = rad * ring.tilt;
      ring.base += ring.spin * dt * 0.12;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(rot * ring.spin * 0.5 + ring.base * 0.15 + mx * 0.12);
      // orbit path
      ctx.beginPath(); ctx.ellipse(0, 0, rad, ry, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "hsla(" + (hue0 + i * 8) + ",72%,74%,0.16)"; ctx.lineWidth = 1; ctx.stroke();
      // nodes on this ring
      for (var j = 0; j < ring.nodes.length; j++) {
        var nd = ring.nodes[j]; nd.ang += nd.sp * dt * 0.5;
        var nx = Math.cos(nd.ang) * rad, ny = Math.sin(nd.ang) * ry;
        var hue = hue0 + nd.hueOff;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(nx, ny);
        ctx.strokeStyle = "hsla(" + hue + ",85%,66%,0.09)"; ctx.lineWidth = 1; ctx.stroke();
        var spr = glowFor(hue), d = nd.sz * 11;
        ctx.globalCompositeOperation = "lighter";
        ctx.drawImage(spr, nx - d / 2, ny - d / 2, d, d);
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(nx, ny, nd.sz * 0.62, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // luminous core
    var cg = ctx.createRadialGradient(ox, oy, 0, ox, oy, R * 0.1);
    cg.addColorStop(0, "hsla(" + hue0 + ",95%,78%,0.55)");
    cg.addColorStop(0.5, "hsla(" + (hue0 + 15) + ",95%,64%,0.14)");
    cg.addColorStop(1, "hsla(" + hue0 + ",95%,60%,0)");
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(ox, oy, R * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "hsla(" + hue0 + ",98%,85%,0.9)"; ctx.beginPath(); ctx.arc(ox, oy, 2.4, 0, Math.PI * 2); ctx.fill();
  }
  raf = requestAnimationFrame(frame);
})();

/* ============================================================
   ORBIT — scroll-assembled product window
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var app = document.getElementById("app");
  if (!app) return;
  var g = window.gsap, ST = window.ScrollTrigger;
  var sideItems = app.querySelectorAll('[data-app="side"]');
  var cards = app.querySelectorAll('[data-app="card"]');
  var pill = app.querySelector('[data-app="pill"]');
  var cur = document.getElementById("app-cursor");
  if (!g || !ST || reduce) { if (cur) cur.style.opacity = 0; return; }
  g.registerPlugin(ST);
  g.set(app, { rotateX: 16, scale: 0.92, opacity: 0.45, transformPerspective: 1200, transformOrigin: "50% 100%" });
  g.set(sideItems, { x: -14, opacity: 0 });
  g.set(cards, { y: 26, opacity: 0, scale: 0.96 });
  if (pill) g.set(pill, { opacity: 0, y: -6 });
  if (cur) g.set(cur, { opacity: 0 });
  var tl = g.timeline({ scrollTrigger: { trigger: ".showcase", start: "top top", end: "+=160%", scrub: 0.6, pin: ".stage", pinSpacing: true, invalidateOnRefresh: true } });
  tl.to(app, { rotateX: 0, scale: 1, opacity: 1, duration: 1.1, ease: "power3.out" }, 0)
    .to(sideItems, { x: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: "power2.out" }, 0.5)
    .to(pill || {}, { opacity: 1, y: 0, duration: 0.5 }, 0.7)
    .to(cards, { y: 0, opacity: 1, scale: 1, duration: 0.7, stagger: 0.09, ease: "power2.out" }, 0.9);
  if (cur) {
    tl.to(cur, { opacity: 1, duration: 0.3 }, 1.2)
      .to(cur, { x: 120, y: -60, duration: 1.0, ease: "power1.inOut" }, 1.3)
      .to(cur, { scale: 0.8, duration: 0.12, yoyo: true, repeat: 1 }, 2.2)
      .to(cur, { x: 40, y: 30, duration: 0.9, ease: "power1.inOut" }, 2.5)
      .to(cur, { opacity: 0, duration: 0.4 }, 3.3);
  }
})();

/* ============================================================
   ORBIT — 3D tilt on image feature cards
   ============================================================ */
(function () {
  "use strict";
  var touch = window.matchMedia && matchMedia("(hover: none)").matches;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (touch || reduce) return;
  document.querySelectorAll("[data-tilt]").forEach(function (el) {
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transition = "transform 0s";
      el.style.transform = "perspective(800px) rotateY(" + (px * 7).toFixed(2) + "deg) rotateX(" + (-py * 7).toFixed(2) + "deg)";
    });
    el.addEventListener("pointerleave", function () {
      el.style.transition = "transform .5s cubic-bezier(.2,.7,.2,1)";
      el.style.transform = "";
    });
  });
})();

/* ============================================================
   ORBIT — animated dashboard (line draws, bars grow)
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var stroke = document.querySelector(".dash-stroke");
  var area = document.querySelector(".dash-area");
  var bars = document.querySelectorAll(".dash-bars i");
  if (!stroke && !bars.length) return;
  var g = window.gsap, ST = window.ScrollTrigger;
  if (!g || !ST || reduce) {
    if (stroke) stroke.style.strokeDasharray = "none";
    bars.forEach(function (b) { b.style.transform = "none"; });
    return;
  }
  g.registerPlugin(ST);
  var trig = { trigger: ".dash-panel", start: "top 80%", once: true };
  if (stroke) {
    var len = stroke.getTotalLength();
    g.set(stroke, { strokeDasharray: len, strokeDashoffset: len });
    g.to(stroke, { strokeDashoffset: 0, duration: 1.9, ease: "power2.out", scrollTrigger: trig });
  }
  if (area) { g.set(area, { opacity: 0 }); g.to(area, { opacity: 1, duration: 1.5, ease: "power1.out", scrollTrigger: trig }); }
  if (bars.length) g.to(bars, { scaleY: 1, duration: 0.7, stagger: 0.06, ease: "power2.out", scrollTrigger: trig });
})();

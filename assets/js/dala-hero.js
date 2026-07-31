/* ============================================================
   Billy Digitals — DALA constellation backdrop (canvas 2D)
   ONE cloud of tiny triangle glyphs, fixed behind the whole page,
   that MORPHS shape as you scroll: lightbulb (hero) → globe
   (services / mid) → swirl vortex (contact / end). Violet + amber
   + white on black velvet, pointer-reactive, twinkling. Light:
   no WebGL, no deps, capped on mobile, paused when hidden, static
   under reduced-motion.
   ============================================================ */
(function () {
  "use strict";
  var canvas = document.getElementById("dalaHero");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) { canvas.style.display = "none"; return; }
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobile = window.matchMedia && matchMedia("(max-width: 720px)").matches;

  var DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.6 : 2);
  var VW = 0, VH = 0;                         // viewport CSS px
  var COLORS = ["#8052ff", "#a78bfa", "#ffb829", "#e9ddff", "#ffffff", "#8052ff"];
  var COUNT = mobile ? 640 : 1500;

  /* ---------- shape generators: return arrays of [x,y] centred on
     the viewport, sized to fit. All normalised to the same count so
     particles can morph 1:1 between them. ---------- */
  function sampleFill(drawFn, w, h) {
    var oc = document.createElement("canvas"); oc.width = w; oc.height = h;
    var o = oc.getContext("2d"); o.fillStyle = "#fff"; drawFn(o, w, h);
    var d = o.getImageData(0, 0, w, h).data, pts = [];
    var step = Math.max(3, Math.round(Math.min(w, h) / 150));
    for (var y = 0; y < h; y += step) for (var x = 0; x < w; x += step)
      if (d[(y * w + x) * 4 + 3] > 128) pts.push([x, y]);
    return pts;
  }
  function resample(pts, n) {                 // force to exactly n points
    if (!pts.length) return null;
    var out = [];
    for (var i = 0; i < n; i++) out.push(pts[(i * 997) % pts.length]);
    return out;
  }

  function bulbShape() {
    var w = VW, h = VH, s = Math.min(w, h);
    return resample(sampleFill(function (o) {
      var cx = w / 2, cy = h * 0.46, r = s * 0.2;
      o.beginPath(); o.arc(cx, cy, r, 0, 7); o.fill();
      var bw = r * 0.9, bt = cy + r * 0.78;
      o.fillRect(cx - bw / 2, bt, bw, r * 0.28);
      o.fillRect(cx - bw * 0.42, bt + r * 0.34, bw * 0.84, r * 0.22);
      o.fillRect(cx - bw * 0.32, bt + r * 0.62, bw * 0.64, r * 0.2);
    }, w, h), COUNT);
  }
  function globeShape() {                      // fibonacci sphere → projected
    var cx = VW / 2, cy = VH * 0.46, R = Math.min(VW, VH) * 0.26;
    var g = Math.PI * (3 - Math.sqrt(5)), out = [];
    for (var i = 0; i < COUNT; i++) {
      var y = 1 - (i / (COUNT - 1)) * 2, r = Math.sqrt(1 - y * y), th = g * i;
      out.push([cx + Math.cos(th) * r * R, cy + y * R * 0.98]);
    }
    return out;
  }
  function swirlShape() {                      // two-arm logarithmic spiral
    var cx = VW / 2, cy = VH * 0.46, max = Math.min(VW, VH) * 0.34, out = [];
    for (var i = 0; i < COUNT; i++) {
      var t = i / COUNT, arm = (i % 2) * Math.PI;
      var ang = t * Math.PI * 5 + arm, rad = Math.pow(t, 0.62) * max;
      out.push([cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad * 0.82]);
    }
    return out;
  }

  var SHAPES = [];
  // scroll keyframes: fraction of page → shape index
  var KEYS = [[0, 0], [0.22, 0], [0.5, 1], [0.8, 2], [1, 2]];

  var parts = [];
  function buildShapes() { SHAPES = [bulbShape(), globeShape(), swirlShape()]; }
  function seed() {
    parts = [];
    for (var i = 0; i < COUNT; i++) {
      parts.push({
        x: Math.random() * VW, y: Math.random() * VH,
        roam: Math.random() < 0.14,
        rx: Math.random() * VW, ry: Math.random() * VH,
        rvx: (Math.random() - 0.5) * 0.25, rvy: (Math.random() - 0.5) * 0.25,
        r: 0.8 + Math.random() * 1.9, c: COLORS[(Math.random() * COLORS.length) | 0],
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.02,
        ph: Math.random() * 6.28, sp: 0.6 + Math.random() * 1.4
      });
    }
  }
  function resize() {
    VW = window.innerWidth; VH = window.innerHeight;
    canvas.width = VW * DPR; canvas.height = VH * DPR;
    canvas.style.width = VW + "px"; canvas.style.height = VH + "px";
    buildShapes(); if (!parts.length) seed();
  }

  // current blended target for a given particle index, from scroll
  function blend() {
    var doc = document.documentElement;
    var p = (window.scrollY || doc.scrollTop) / ((doc.scrollHeight - VH) || 1);
    p = Math.min(1, Math.max(0, p));
    var a = KEYS[0], b = KEYS[KEYS.length - 1];
    for (var k = 0; k < KEYS.length - 1; k++) {
      if (p >= KEYS[k][0] && p <= KEYS[k + 1][0]) { a = KEYS[k]; b = KEYS[k + 1]; break; }
    }
    var span = (b[0] - a[0]) || 1, f = (p - a[0]) / span;
    f = f * f * (3 - 2 * f);                  // smoothstep
    return { A: SHAPES[a[1]], B: SHAPES[b[1]], f: f };
  }

  var mx = -9999, my = -9999;
  window.addEventListener("pointermove", function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
  window.addEventListener("pointerleave", function () { mx = my = -9999; });

  function tri(x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.9, s * 0.7); ctx.lineTo(-s * 0.9, s * 0.7);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  var t = 0, raf = null, hidden = false;
  function frame() {
    raf = requestAnimationFrame(frame);
    t += 0.016;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.scale(DPR, DPR); ctx.globalCompositeOperation = "lighter";
    var bl = blend(), A = bl.A, B = bl.B, f = bl.f, n = parts.length;
    for (var i = 0; i < n; i++) {
      var p = parts[i], gx, gy;
      if (p.roam || !A) {                     // ambient drifting sparks
        p.rx += p.rvx; p.ry += p.rvy;
        if (p.rx < 0 || p.rx > VW) p.rvx *= -1;
        if (p.ry < 0 || p.ry > VH) p.rvy *= -1;
        gx = p.rx; gy = p.ry;
      } else {
        var a = A[i], b = B[i];
        gx = a[0] + (b[0] - a[0]) * f + Math.cos(t * p.sp + p.ph) * 2.2;
        gy = a[1] + (b[1] - a[1]) * f + Math.sin(t * p.sp + p.ph) * 2.2;
      }
      var dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
      if (d2 < 11000) { var fo = (11000 - d2) / 11000 * 0.9, dd = Math.sqrt(d2 + 0.1); p.x += dx / dd * fo * 6; p.y += dy / dd * fo * 6; }
      p.x += (gx - p.x) * 0.06; p.y += (gy - p.y) * 0.06; p.rot += p.vr;
      ctx.globalAlpha = (p.roam ? 0.4 : 0.62) * (0.55 + 0.45 * Math.sin(t * p.sp + p.ph)) + 0.18;
      ctx.fillStyle = p.c; tri(p.x, p.y, p.r, p.rot);
    }
    ctx.restore();
  }
  function staticDraw() {
    resize();
    ctx.save(); ctx.scale(DPR, DPR); ctx.globalCompositeOperation = "lighter";
    var A = SHAPES[0];
    for (var i = 0; i < parts.length; i++) { var p = parts[i], a = A && A[i]; ctx.globalAlpha = 0.8; ctx.fillStyle = p.c; tri(a ? a[0] : p.rx, a ? a[1] : p.ry, p.r, p.rot); }
    ctx.restore();
  }
  function start() { if (raf == null && !hidden) raf = requestAnimationFrame(frame); }
  function stop() { if (raf != null) { cancelAnimationFrame(raf); raf = null; } }

  seed(); resize();
  var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(resize, 160); });
  if (reduce) { staticDraw(); return; }
  start();
  document.addEventListener("visibilitychange", function () { hidden = document.hidden; hidden ? stop() : start(); });
})();

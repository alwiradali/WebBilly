/* ============================================================
   Billy Digitals — DALA constellation hero (canvas 2D)
   A cloud of tiny triangle glyphs that assembles into a light-
   bulb (ideas), drifts and twinkles, reacts to the pointer, and
   scatters as you scroll the hero away. Violet + amber + white on
   black velvet — the Dala look, but light: no WebGL, no vendor
   deps, capped on mobile, static under reduced-motion.
   ============================================================ */
(function () {
  "use strict";
  var canvas = document.getElementById("dalaHero");
  if (!canvas) return;
  var host = document.querySelector(".hero") || canvas.parentElement;
  var ctx = canvas.getContext("2d");
  if (!ctx) { canvas.style.display = "none"; return; }
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobile = window.matchMedia && matchMedia("(max-width: 720px)").matches;

  var DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.6 : 2);
  var W = 0, H = 0;
  var COLORS = ["#8052ff", "#a78bfa", "#ffb829", "#e9ddff", "#ffffff", "#38bdf8"];
  var COUNT = mobile ? 720 : 1700;

  /* ---- build the lightbulb target point-cloud from an offscreen draw ---- */
  function bulbTargets(w, h) {
    var oc = document.createElement("canvas");
    var vh = Math.min(h, window.innerHeight || h);
    var s = Math.min(w, vh);
    oc.width = w; oc.height = h;
    var o = oc.getContext("2d");
    o.fillStyle = "#fff";
    var cx = w * 0.5, cy = Math.min(h * 0.5, vh * 0.46), r = s * 0.2;
    // glass bulb
    o.beginPath(); o.arc(cx, cy, r, 0, Math.PI * 2); o.fill();
    // neck + screw base
    var bw = r * 0.9, bt = cy + r * 0.78;
    o.fillRect(cx - bw / 2, bt, bw, r * 0.28);
    o.fillRect(cx - bw * 0.42, bt + r * 0.34, bw * 0.84, r * 0.22);
    o.fillRect(cx - bw * 0.32, bt + r * 0.62, bw * 0.64, r * 0.20);
    var img = o.getImageData(0, 0, w, h).data;
    var pts = [];
    var step = Math.max(3, Math.round(s / 170));
    for (var y = 0; y < h; y += step) {
      for (var x = 0; x < w; x += step) {
        if (img[(y * w + x) * 4 + 3] > 128) pts.push([x, y]);
      }
    }
    return pts;
  }

  var parts = [];
  function seed() {
    var pts = bulbTargets(W / DPR, H / DPR);
    parts = [];
    for (var i = 0; i < COUNT; i++) {
      var onShape = pts.length && Math.random() < 0.82;
      var t = onShape ? pts[(Math.random() * pts.length) | 0] : null;
      parts.push({
        x: Math.random() * (W / DPR), y: Math.random() * (H / DPR),
        tx: t ? t[0] : Math.random() * (W / DPR),
        ty: t ? t[1] : Math.random() * (H / DPR),
        // scatter home (where it drifts to when the hero is scrolled away)
        sx: (Math.random() - 0.5) * (W / DPR) * 1.5 + (W / DPR) / 2,
        sy: (Math.random() - 0.5) * (H / DPR) * 1.5 + (H / DPR) / 2,
        r: (onShape ? 1.2 : 0.8) + Math.random() * 1.7,
        c: COLORS[(Math.random() * COLORS.length) | 0],
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.02,
        ph: Math.random() * Math.PI * 2, sp: 0.6 + Math.random() * 1.4,
        onShape: onShape
      });
    }
  }

  function resize() {
    W = host.clientWidth * DPR; H = (host.clientHeight || window.innerHeight) * DPR;
    canvas.width = W; canvas.height = H;
    canvas.style.width = host.clientWidth + "px";
    canvas.style.height = (host.clientHeight || window.innerHeight) + "px";
    seed();
  }

  var mx = -9999, my = -9999;
  window.addEventListener("pointermove", function (e) {
    var r = host.getBoundingClientRect();
    mx = e.clientX - r.left; my = e.clientY - r.top;
  }, { passive: true });
  window.addEventListener("pointerleave", function () { mx = my = -9999; });

  function tri(x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, -s); ctx.lineTo(s * 0.9, s * 0.7); ctx.lineTo(-s * 0.9, s * 0.7);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  // hero scroll progress 0 (top) -> 1 (hero scrolled one viewport)
  function scatterAmt() {
    var r = host.getBoundingClientRect();
    var p = Math.min(1, Math.max(0, -r.top / (host.offsetHeight || window.innerHeight)));
    return p;
  }

  var t = 0, raf = null, onScreen = true;
  function frame() {
    raf = requestAnimationFrame(frame);
    t += 0.016;
    ctx.clearRect(0, 0, W, H);
    ctx.save(); ctx.scale(DPR, DPR);
    ctx.globalCompositeOperation = "lighter";
    var sc = scatterAmt();
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      // target = blend of shape position and scatter home based on scroll
      var gx = p.tx + (p.sx - p.tx) * sc;
      var gy = p.ty + (p.sy - p.ty) * sc;
      // gentle idle shimmer around the target
      gx += Math.cos(t * p.sp + p.ph) * 2.2;
      gy += Math.sin(t * p.sp + p.ph) * 2.2;
      // pointer repel
      var dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
      if (d2 < 12000) { var f = (12000 - d2) / 12000 * 0.9; p.x += dx / Math.sqrt(d2 + 0.1) * f * 6; p.y += dy / Math.sqrt(d2 + 0.1) * f * 6; }
      p.x += (gx - p.x) * 0.055;
      p.y += (gy - p.y) * 0.055;
      p.rot += p.vr;
      ctx.globalAlpha = (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * p.sp + p.ph))) * (1 - sc * 0.55);
      ctx.fillStyle = p.c;
      tri(p.x, p.y, p.r, p.rot);
    }
    ctx.restore();
  }

  function staticDraw() {
    ctx.clearRect(0, 0, W, H); ctx.save(); ctx.scale(DPR, DPR);
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i]; ctx.globalAlpha = 0.85; ctx.fillStyle = p.c; tri(p.tx, p.ty, p.r, p.rot);
    }
    ctx.restore();
  }

  function start() { if (raf == null && onScreen && !document.hidden) raf = requestAnimationFrame(frame); }
  function stop() { if (raf != null) { cancelAnimationFrame(raf); raf = null; } }

  resize();
  window.addEventListener("resize", function () { var id; clearTimeout(id); id = setTimeout(resize, 150); });
  if (reduce) { staticDraw(); return; }
  start();
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { onScreen = e.isIntersecting; onScreen ? start() : stop(); });
    }, { threshold: 0 }).observe(host);
  }
})();

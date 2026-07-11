/* ============================================================
   Billy Digitals — Section particle ambience
   Drops a lightweight drifting glow-particle canvas behind any
   section tagged .fx-alive, so the whole page feels alive as you
   scroll. Pure 2D canvas (cheap). Only visible sections animate.
   Respects reduced-motion (paints one static frame).
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobile = window.matchMedia && matchMedia("(max-width: 720px)").matches;
  var COLORS = ["#2b7fff", "#22d3ee", "#7c3aed", "#38bdf8"];

  document.querySelectorAll(".fx-alive").forEach(function (section) {
    var canvas = document.createElement("canvas");
    canvas.className = "fx-canvas";
    canvas.setAttribute("aria-hidden", "true");
    section.insertBefore(canvas, section.firstChild);
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var W = 0, H = 0, parts = [], raf = null, running = false, onScreen = false;

    function size() {
      W = section.clientWidth; H = section.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function seed() {
      var n = Math.min(mobile ? 22 : 48, Math.round((W * H) / 26000));
      parts = [];
      for (var i = 0; i < n; i++) {
        var z = 0.35 + Math.random() * 0.65; // depth
        parts.push({
          x: Math.random() * W, y: Math.random() * H, z: z,
          r: (mobile ? 1.1 : 1.6) * z + Math.random() * 1.4,
          vx: (Math.random() - 0.5) * 0.18 * z, vy: (-0.12 - Math.random() * 0.22) * z,
          c: COLORS[i % COLORS.length], a: 0.16 + Math.random() * 0.34, tw: Math.random() * 6.28
        });
      }
    }
    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
        var tw = 0.6 + 0.4 * Math.sin(t * 0.001 + p.tw);
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
        g.addColorStop(0, hexA(p.c, p.a * tw));
        g.addColorStop(1, hexA(p.c, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 6, 0, 6.2832); ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }
    function frame(now) { if (!running) return; raf = requestAnimationFrame(frame); draw(now); }
    function play() { if (running || reduce) { if (reduce) draw(0); return; } running = true; raf = requestAnimationFrame(frame); }
    function pause() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }
    function sync() { (onScreen && document.visibilityState !== "hidden") ? play() : pause(); }

    function hexA(hex, a) {
      hex = hex.replace("#", ""); var n = parseInt(hex, 16);
      return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a.toFixed(3) + ")";
    }

    size(); seed();
    if ("ResizeObserver" in window) new ResizeObserver(function () { size(); seed(); }).observe(section);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { onScreen = e.isIntersecting; sync(); }); }, { threshold: 0 }).observe(section);
    } else { onScreen = true; sync(); }
    document.addEventListener("visibilitychange", sync);
  });
})();

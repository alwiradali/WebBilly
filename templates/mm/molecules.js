/* Molecular Miracles — flying molecules background
   Canvas particle system: drifting atoms with dynamic bonds + benzene rings.
   Performance: DPR-capped, pauses when tab hidden or canvas offscreen,
   density scales to viewport, fully disabled under prefers-reduced-motion. */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var canvas = document.getElementById('molecules');
  if (!canvas) return;
  var ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  var PALETTE = ['#12A594', '#3B82F6', '#8B5CF6'];
  var W = 0, H = 0, DPR = 1;
  var atoms = [], rings = [], raf = null, running = false;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    build();
  }

  function build() {
    var area = W * H;
    var count = Math.round(area / 26000);           // density by area
    count = Math.max(14, Math.min(count, 64));       // clamp
    var ringCount = W < 700 ? 2 : (W < 1200 ? 3 : 5);

    atoms = [];
    for (var i = 0; i < count; i++) {
      atoms.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: rand(-0.22, 0.22),
        vy: rand(-0.22, 0.22),
        r: rand(1.8, 3.8),
        c: PALETTE[(Math.random() * PALETTE.length) | 0]
      });
    }

    rings = [];
    for (var j = 0; j < ringCount; j++) {
      rings.push({
        x: Math.random() * W,
        y: Math.random() * H,
        s: rand(24, 52),
        a: Math.random() * Math.PI * 2,
        va: rand(-0.0022, 0.0022),
        vx: rand(-0.13, 0.13),
        vy: rand(-0.11, 0.11),
        c: PALETTE[(Math.random() * PALETTE.length) | 0]
      });
    }
  }

  function hexPath(cx, cy, s, a) {
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var ang = a + i * Math.PI / 3;
      var px = cx + Math.cos(ang) * s;
      var py = cy + Math.sin(ang) * s;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
  }

  function wrap(p, pad) {
    if (p.x < -pad) p.x = W + pad;
    if (p.x > W + pad) p.x = -pad;
    if (p.y < -pad) p.y = H + pad;
    if (p.y > H + pad) p.y = -pad;
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);

    // benzene rings
    for (var r = 0; r < rings.length; r++) {
      var g = rings[r];
      g.x += g.vx; g.y += g.vy; g.a += g.va;
      wrap(g, g.s + 10);

      ctx.strokeStyle = g.c;
      ctx.globalAlpha = 0.13;
      ctx.lineWidth = 1.6;
      hexPath(g.x, g.y, g.s, g.a);
      ctx.stroke();

      ctx.globalAlpha = 0.09;
      hexPath(g.x, g.y, g.s * 0.62, g.a);
      ctx.stroke();

      ctx.globalAlpha = 0.20;
      ctx.fillStyle = g.c;
      for (var v = 0; v < 6; v++) {
        var ang = g.a + v * Math.PI / 3;
        ctx.beginPath();
        ctx.arc(g.x + Math.cos(ang) * g.s, g.y + Math.sin(ang) * g.s, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // bonds
    var maxD = W < 700 ? 108 : 132;
    for (var i = 0; i < atoms.length; i++) {
      var a = atoms[i];
      a.x += a.vx; a.y += a.vy;
      wrap(a, 24);

      for (var k = i + 1; k < atoms.length; k++) {
        var b = atoms[k];
        var dx = a.x - b.x, dy = a.y - b.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < maxD * maxD) {
          var d = Math.sqrt(d2);
          ctx.globalAlpha = (1 - d / maxD) * 0.16;
          ctx.strokeStyle = a.c;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // atoms
    for (var n = 0; n < atoms.length; n++) {
      var p = atoms[n];
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }

  function start() { if (!running) { running = true; raf = requestAnimationFrame(frame); } }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  // static, still-beautiful fallback
  function paintStatic() {
    resize();
    ctx.clearRect(0, 0, W, H);
    for (var r = 0; r < rings.length; r++) {
      var g = rings[r];
      ctx.strokeStyle = g.c; ctx.globalAlpha = 0.13; ctx.lineWidth = 1.6;
      hexPath(g.x, g.y, g.s, g.a); ctx.stroke();
    }
    for (var n = 0; n < atoms.length; n++) {
      var p = atoms[n];
      ctx.globalAlpha = 0.36; ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { reduce ? paintStatic() : resize(); }, 180);
  }, { passive: true });

  if (reduce) { paintStatic(); return; }

  resize();

  document.addEventListener('visibilitychange', function () {
    document.hidden ? stop() : start();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.isIntersecting ? start() : stop(); });
    }, { threshold: 0 }).observe(canvas);
  } else {
    start();
  }
})();

/* SMARTin SCIENCE — flying letters background
   ------------------------------------------------------------------
   Canvas particle system built from LETTERS rather than molecules:
   drifting element symbols, Greek characters and equation fragments,
   linked by faint bonds, with slowly rotating periodic-table tiles
   spelling out the brand.

   Performance: DPR-capped, density scales to viewport, pauses when the
   tab is hidden or the canvas scrolls out of view, and drops to a
   still-beautiful static paint under prefers-reduced-motion.          */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var canvas = document.getElementById('letters');
  if (!canvas) return;
  var ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  /* brand palette — primary blues/greens, with lime and amber as accents */
  var PALETTE = ['#0457ac', '#308fac', '#37bd79', '#a7e237', '#ffba53'];
  var DIS = "'Futura','Futura PT','Jost','Century Gothic',system-ui,sans-serif";

  /* single glyphs: element symbols + the Greek that GCSE Science actually uses */
  var GLYPHS = ('H He Li C N O F Na Mg Al Si P S Cl K Ca Fe Cu Zn Ag Au I ' +
                'λ Ω Δ μ π α β γ ρ θ ∑ ± ≈ → ⇌').split(' ');

  /* short fragments: real GCSE Combined Science formulae and equations */
  var FRAGS = ['H₂O', 'CO₂', 'CH₄', 'NaCl', 'O₂', 'NH₃', 'H₂SO₄', 'CaCO₃',
               'F = ma', 'E = mc²', 'v = fλ', 'PV = nRT', 'pH', 'DNA', 'ATP',
               'P = IV', 'Q = mcΔT', 'a = Δv/t', 'E = ½mv²', 'n = m/M'];

  /* the brand, spelled out in periodic-table tiles */
  var TILES = 'S M A R T i n S C I E N C E'.split(' ');

  var W = 0, H = 0, DPR = 1;
  var glyphs = [], tiles = [], raf = null, running = false;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }

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
    var count = Math.round((W * H) / 24000);
    count = Math.max(16, Math.min(count, 64));

    glyphs = [];
    for (var i = 0; i < count; i++) {
      // roughly one in four is a formula fragment rather than a lone letter
      var frag = Math.random() < 0.26;
      glyphs.push({
        t: frag ? pick(FRAGS) : pick(GLYPHS),
        frag: frag,
        x: Math.random() * W,
        y: Math.random() * H,
        vx: rand(-0.20, 0.20),
        vy: rand(-0.20, 0.20),
        s: frag ? rand(13, 19) : rand(16, 34),
        a: rand(-0.24, 0.24),          // resting tilt
        va: rand(-0.0016, 0.0016),     // slow spin
        o: frag ? rand(0.20, 0.34) : rand(0.26, 0.50),
        c: pick(PALETTE)
      });
    }

    var tileCount = W < 700 ? 3 : (W < 1200 ? 5 : 7);
    tiles = [];
    for (var j = 0; j < tileCount; j++) {
      tiles.push({
        t: TILES[j % TILES.length],
        n: 1 + ((j * 5 + 3) % 92),     // a plausible atomic number, deterministic
        x: Math.random() * W,
        y: Math.random() * H,
        s: rand(46, 82),
        a: rand(-0.3, 0.3),
        va: rand(-0.0013, 0.0013),
        vx: rand(-0.12, 0.12),
        vy: rand(-0.10, 0.10),
        c: pick(PALETTE)
      });
    }
  }

  function wrap(p, pad) {
    if (p.x < -pad) p.x = W + pad;
    if (p.x > W + pad) p.x = -pad;
    if (p.y < -pad) p.y = H + pad;
    if (p.y > H + pad) p.y = -pad;
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawTile(g) {
    var s = g.s;
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.a);

    ctx.globalAlpha = 0.30;
    ctx.strokeStyle = g.c;
    ctx.lineWidth = 2;
    roundRect(-s / 2, -s * 0.56, s, s * 1.12, s * 0.17);
    ctx.stroke();

    ctx.globalAlpha = 0.055;
    ctx.fillStyle = g.c;
    ctx.fill();

    ctx.globalAlpha = 0.42;
    ctx.fillStyle = g.c;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 ' + (s * 0.46).toFixed(1) + 'px ' + DIS;
    ctx.fillText(g.t, 0, s * 0.02);

    ctx.globalAlpha = 0.30;
    ctx.font = '500 ' + (s * 0.16).toFixed(1) + 'px ' + DIS;
    ctx.textAlign = 'left';
    ctx.fillText(String(g.n), -s * 0.36, -s * 0.36);

    ctx.restore();
  }

  function drawGlyph(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.a);
    ctx.globalAlpha = p.o;
    ctx.fillStyle = p.c;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = (p.frag ? '600 ' : '700 ') + p.s.toFixed(1) + 'px ' + DIS;
    ctx.fillText(p.t, 0, 0);
    ctx.restore();
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);

    for (var t = 0; t < tiles.length; t++) {
      var g = tiles[t];
      g.x += g.vx; g.y += g.vy; g.a += g.va;
      wrap(g, g.s);
      drawTile(g);
    }

    // bonds between nearby letters — the network that says "science"
    var maxD = W < 700 ? 104 : 128;
    for (var i = 0; i < glyphs.length; i++) {
      var a = glyphs[i];
      a.x += a.vx; a.y += a.vy; a.a += a.va;
      wrap(a, 40);

      for (var k = i + 1; k < glyphs.length; k++) {
        var b = glyphs[k];
        var dx = a.x - b.x, dy = a.y - b.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < maxD * maxD) {
          var d = Math.sqrt(d2);
          ctx.globalAlpha = (1 - d / maxD) * 0.22;
          ctx.strokeStyle = a.c;
          ctx.lineWidth = 1.25;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    for (var n = 0; n < glyphs.length; n++) drawGlyph(glyphs[n]);

    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }

  function start() { if (!running) { running = true; raf = requestAnimationFrame(frame); } }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  function paintStatic() {
    resize();
    ctx.clearRect(0, 0, W, H);
    for (var t = 0; t < tiles.length; t++) drawTile(tiles[t]);
    for (var n = 0; n < glyphs.length; n++) drawGlyph(glyphs[n]);
    ctx.globalAlpha = 1;
  }

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { reduce ? paintStatic() : resize(); }, 180);
  }, { passive: true });

  // Web fonts land after first paint; repaint once they do so the glyphs are
  // set in Futura/Jost rather than the fallback they were measured in.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { if (reduce) paintStatic(); });
  }

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

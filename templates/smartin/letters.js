/* SMARTin SCIENCE — flying letters background
   ------------------------------------------------------------------
   A canvas field built from LETTERS rather than molecules: drifting
   element symbols, Greek characters and equation fragments, linked by
   faint bonds, with slowly rotating periodic-table tiles spelling out
   the brand.

   Composed in three planes so it reads as depth rather than confetti:

     · an ambient colour wash — three huge, slow, out-of-focus brand
       blooms that give the page tonal movement instead of flat paper
     · the letter field — every glyph carries a depth value that drives
       its size, opacity and speed together, so far letters are small,
       faint and slow and near ones are larger, clearer and quicker
     · the brand tiles, ghosted right back, as a watermark

   Everything is deliberately quiet. This sits behind body copy, so the
   words always have to win: the field is there to be felt, not read.

   Colour follows the logo — the blues, teal and green carry the field,
   with lime and amber used as sparingly as the flame on the flask.

   Performance: DPR-capped, density scales to viewport, the wash renders
   at a sixth scale and is stretched (free blur, cheap fill), pauses when
   the tab is hidden or the canvas scrolls out of view, and drops to a
   still-beautiful static paint under prefers-reduced-motion.          */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var canvas = document.getElementById('letters');
  if (!canvas) return;
  var ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  /* brand palette, split by the job each colour does on the logo:
     the cool three carry the field, lime and amber are the flame */
  var COOL = ['#0457ac', '#308fac', '#37bd79'];
  var ACCENT = ['#a7e237', '#ffba53'];
  var ACCENT_RATE = 0.13;
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
  function colour() { return Math.random() < ACCENT_RATE ? pick(ACCENT) : pick(COOL); }

  /* ---------- ambient wash ----------
     Three soft brand blooms drifting on slow sine paths. Painted onto a
     sixth-scale offscreen canvas and stretched across the viewport: the
     upscale blurs them for nothing, and filling three full-screen radial
     gradients every frame at device resolution would not be free.      */
  var wash = document.createElement('canvas');
  var wctx = wash.getContext('2d');
  var WW = 0, WH = 0;

  var BLOOMS = [
    { c: '4,87,172',   a: 0.15, r: 0.66, ph: 0.0, fq: 0.0016, ox: 0.20, oy: 0.20, sx: 0.15, sy: 0.12 },
    { c: '55,189,121', a: 0.15, r: 0.60, ph: 2.1, fq: 0.0013, ox: 0.82, oy: 0.32, sx: 0.13, sy: 0.15 },
    { c: '48,143,172', a: 0.13, r: 0.74, ph: 4.0, fq: 0.0011, ox: 0.48, oy: 0.86, sx: 0.17, sy: 0.10 }
  ];

  function drawWash() {
    wctx.clearRect(0, 0, WW, WH);
    var span = Math.max(WW, WH);
    for (var i = 0; i < BLOOMS.length; i++) {
      var b = BLOOMS[i];
      var cx = (b.ox + Math.cos(clock * b.fq + b.ph) * b.sx) * WW;
      var cy = (b.oy + Math.sin(clock * b.fq * 0.8 + b.ph) * b.sy) * WH;
      var r = b.r * span;
      var g = wctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(' + b.c + ',' + b.a + ')');
      g.addColorStop(1, 'rgba(' + b.c + ',0)');
      wctx.fillStyle = g;
      wctx.fillRect(0, 0, WW, WH);
    }
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    WW = Math.max(2, Math.round(W / 6));
    WH = Math.max(2, Math.round(H / 6));
    wash.width = WW; wash.height = WH;
    drawWash();
    build();
  }

  function build() {
    var count = Math.round((W * H) / 20000);
    count = Math.max(18, Math.min(count, 68));

    glyphs = [];
    for (var i = 0; i < count; i++) {
      // roughly one in four is a formula fragment rather than a lone letter
      var frag = Math.random() < 0.26;
      // depth: 0 is far back, 1 is close. One value drives size, opacity
      // and speed together — that agreement is what reads as distance.
      var z = Math.random();
      var sp = 0.14 + z * 0.46;
      glyphs.push({
        t: frag ? pick(FRAGS) : pick(GLYPHS),
        frag: frag,
        z: z,
        x: Math.random() * W,
        y: Math.random() * H,
        vx: rand(-0.52, 0.52) * sp,
        vy: rand(-0.52, 0.52) * sp,
        s: frag ? 11 + z * 10 : 13 + z * 25,
        a: rand(-0.24, 0.24),          // resting tilt
        va: rand(-0.0052, 0.0052) * sp,  // spin
        // a slow sway on top of the drift, so nothing travels in a dead
        // straight line — this is what reads as "floating" rather than "sliding"
        ph: Math.random() * Math.PI * 2,
        fq: rand(0.006, 0.014),
        am: rand(3, 10) * sp,
        o: frag ? 0.14 + z * 0.23 : 0.17 + z * 0.33,
        c: colour()
      });
    }
    // near letters paint last, so they sit in front of the far ones
    glyphs.sort(function (a, b) { return a.z - b.z; });

    var tileCount = W < 700 ? 2 : (W < 1200 ? 3 : 4);
    tiles = [];
    for (var j = 0; j < tileCount; j++) {
      tiles.push({
        t: TILES[j % TILES.length],
        n: 1 + ((j * 5 + 3) % 92),     // a plausible atomic number, deterministic
        x: Math.random() * W,
        y: Math.random() * H,
        s: rand(58, 108),
        a: rand(-0.3, 0.3),
        va: rand(-0.0040, 0.0040) * 0.5,
        vx: rand(-0.34, 0.34) * 0.4,
        vy: rand(-0.30, 0.30) * 0.4,
        ph: Math.random() * Math.PI * 2,
        fq: rand(0.004, 0.009),
        am: rand(4, 11) * 0.4,
        c: colour()
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
    ctx.translate(g.x + (g.dx || 0), g.y + (g.dy || 0));
    ctx.rotate(g.a);

    ctx.globalAlpha = 0.20;
    ctx.strokeStyle = g.c;
    ctx.lineWidth = 1.5;
    roundRect(-s / 2, -s * 0.56, s, s * 1.12, s * 0.17);
    ctx.stroke();

    ctx.globalAlpha = 0.032;
    ctx.fillStyle = g.c;
    ctx.fill();

    ctx.globalAlpha = 0.27;
    ctx.fillStyle = g.c;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 ' + (s * 0.46).toFixed(1) + 'px ' + DIS;
    ctx.fillText(g.t, 0, s * 0.02);

    ctx.globalAlpha = 0.18;
    ctx.font = '500 ' + (s * 0.16).toFixed(1) + 'px ' + DIS;
    ctx.textAlign = 'left';
    ctx.fillText(String(g.n), -s * 0.36, -s * 0.36);

    ctx.restore();
  }

  function drawGlyph(p) {
    ctx.save();
    ctx.translate(p.x + (p.dx || 0), p.y + (p.dy || 0));
    ctx.rotate(p.a);
    ctx.globalAlpha = p.o;
    ctx.fillStyle = p.c;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 ' + p.s.toFixed(1) + 'px ' + DIS;
    ctx.fillText(p.t, 0, 0);
    ctx.restore();
  }

  var clock = 0;

  function sway(p) {
    p.dx = Math.cos(clock * p.fq * 0.72 + p.ph) * p.am * 0.6;
    p.dy = Math.sin(clock * p.fq + p.ph) * p.am;
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    clock++;

    // the blooms move slowly enough that refreshing them every sixth
    // frame is invisible, and it keeps the per-frame cost to one blit
    if (clock % 6 === 0) drawWash();
    ctx.globalAlpha = 1;
    ctx.drawImage(wash, 0, 0, W, H);

    for (var t = 0; t < tiles.length; t++) {
      var g = tiles[t];
      g.x += g.vx; g.y += g.vy; g.a += g.va;
      sway(g);
      wrap(g, g.s);
      drawTile(g);
    }

    // bonds between nearby letters — the network that says "science"
    var maxD = W < 700 ? 96 : 118;
    for (var i = 0; i < glyphs.length; i++) {
      var a = glyphs[i];
      a.x += a.vx; a.y += a.vy; a.a += a.va;
      sway(a);
      wrap(a, 40);

      for (var k = i + 1; k < glyphs.length; k++) {
        var b = glyphs[k];
        // only bond letters sitting at a similar depth — a line joining
        // the far plane to the near one flattens the whole field
        if (Math.abs(a.z - b.z) > 0.34) continue;
        // bonds are drawn between the swayed positions, so a line never
        // detaches from the letter it is joined to
        var dx = (a.x + a.dx) - (b.x + b.dx), dy = (a.y + a.dy) - (b.y + b.dy);
        var d2 = dx * dx + dy * dy;
        if (d2 < maxD * maxD) {
          var d = Math.sqrt(d2);
          ctx.globalAlpha = (1 - d / maxD) * 0.17 * (0.5 + a.z * 0.5);
          ctx.strokeStyle = a.c;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x + a.dx, a.y + a.dy);
          ctx.lineTo(b.x + b.dx, b.y + b.dy);
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
    glyphs.forEach(sway); tiles.forEach(sway);
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.drawImage(wash, 0, 0, W, H);
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

/* Heat Fix — animated hero background: a live heating circuit.
 *
 * Draws an orthogonal pipe network in very pale navy, then sends pulses of
 * flow along it: cool blue on the way out, warm amber on the way back. It is
 * meant to read as a central heating system running, not as decoration for
 * its own sake. The ambient glow behind it is CSS, not canvas.
 *
 * Usage:  <div data-heatfx="circuit"></div>
 * The element is filled with a canvas sized to its box. Nothing else needed.
 *
 * Cheap on purpose: two stacked canvases. The pipework is painted once and
 * never touched again; the frame loop only clears and strokes the pulse layer,
 * so nothing full-surface happens per frame. Pauses when scrolled out of view
 * or the tab is hidden, and paints one still frame under prefers-reduced-motion.
 */
(function () {
  'use strict';

  var HOSTS = [].slice.call(document.querySelectorAll('[data-heatfx="circuit"]'));
  if (!HOSTS.length || !window.requestAnimationFrame) return;

  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PIPE    = 'rgba(13,42,99,';       /* --navy */
  var COOL    = ['#2f9fd6', '#0f4f86']; /* head, tail */
  var WARM    = ['#f5a52e', '#c2620a'];

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }

  /* ---- build one orthogonal pipe run as a dense polyline ---------------- */
  function makePath(w, h, cell) {
    var r = cell * 0.34, pts = [], corners = [];
    var horizontal = Math.random() < 0.5;
    var x, y, dx, dy;

    if (horizontal) { x = -cell; y = Math.round(rnd(0, h / cell)) * cell; dx = 1; dy = 0; }
    else            { x = Math.round(rnd(0, w / cell)) * cell; y = -cell; dx = 0; dy = 1; }

    corners.push({ x: x, y: y });
    var steps = (rnd(7, 13) | 0), guard = 0;
    while (steps-- > 0 && guard++ < 40) {
      var run = (rnd(1, 4) | 0) * cell;
      x += dx * run; y += dy * run;
      corners.push({ x: x, y: y });
      /* turn 90 degrees, biased so the run keeps crossing the canvas */
      if (dx) { dx = 0; dy = y < h * 0.5 ? 1 : -1; }
      else    { dy = 0; dx = x < w * 0.5 ? 1 : -1; }
      if (x < -cell * 2 || x > w + cell * 2 || y < -cell * 2 || y > h + cell * 2) break;
    }

    /* walk the corners, rounding each elbow into an arc */
    function push(px, py) {
      var n = pts.length;
      if (n && Math.abs(pts[n - 1].x - px) < 0.4 && Math.abs(pts[n - 1].y - py) < 0.4) return;
      pts.push({ x: px, y: py });
    }
    function line(a, b, from, to) {
      var len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 0.5) return;
      var n = Math.max(2, (len / 9) | 0);
      for (var i = 0; i <= n; i++) {
        var t = from + (to - from) * (i / n);
        push(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
      }
    }
    for (var i = 0; i < corners.length - 1; i++) {
      var a = corners[i], b = corners[i + 1], c = corners[i + 2];
      var lenAB = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      var head = i === 0 ? 0 : Math.min(0.5, r / lenAB);
      var tail = c ? 1 - Math.min(0.5, r / lenAB) : 1;
      line(a, b, head, tail);
      if (!c) break;
      /* quadratic elbow through b */
      var lenBC = Math.hypot(c.x - b.x, c.y - b.y) || 1;
      var p0 = { x: b.x + (a.x - b.x) * Math.min(0.5, r / lenAB),
                 y: b.y + (a.y - b.y) * Math.min(0.5, r / lenAB) };
      var p2 = { x: b.x + (c.x - b.x) * Math.min(0.5, r / lenBC),
                 y: b.y + (c.y - b.y) * Math.min(0.5, r / lenBC) };
      for (var k = 0; k <= 6; k++) {
        var t = k / 6, u = 1 - t;
        push(u * u * p0.x + 2 * u * t * b.x + t * t * p2.x,
             u * u * p0.y + 2 * u * t * b.y + t * t * p2.y);
      }
    }
    return { pts: pts, corners: corners };
  }

  function start(host) {
    /* Two layers. The pipework is painted once onto the lower canvas and then
       never touched, so the frame loop only ever clears and strokes the small
       pulse layer — no full-surface blit, no per-frame gradient fills. */
    var LAY = 'position:absolute;inset:0;display:block;width:100%;height:100%';
    var still = document.createElement('canvas');
    still.setAttribute('aria-hidden', 'true');
    still.style.cssText = LAY;
    var cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = LAY;
    host.appendChild(still);
    host.appendChild(cv);
    var ctx = cv.getContext('2d');
    var sctx = still.getContext('2d');
    if (!ctx || !sctx) return;

    var W = 0, H = 0, dpr = 1, paths = [], pulses = [], raf = 0, t0 = 0, visible = true;

    function build() {
      var box = host.getBoundingClientRect();
      W = Math.max(320, box.width | 0);
      H = Math.max(240, box.height | 0);
      var sdpr = Math.min(2, window.devicePixelRatio || 1);
      dpr = 1;                            /* pulse layer — soft edges, 1x is plenty */
      still.width  = (W * sdpr) | 0;  still.height  = (H * sdpr) | 0;
      cv.width     = (W * dpr)  | 0;  cv.height     = (H * dpr)  | 0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sctx.setTransform(sdpr, 0, 0, sdpr, 0, 0);

      var small = W < 700;
      var cell  = small ? 62 : 88;
      var count = small ? 7 : 13;

      paths = [];
      for (var i = 0; i < count; i++) paths.push(makePath(W, H, cell));

      /* static layer: the pipework itself, plus a dot at every elbow */
      sctx.clearRect(0, 0, W, H);
      sctx.lineCap = 'round';
      sctx.lineJoin = 'round';
      paths.forEach(function (p) {
        sctx.beginPath();
        p.pts.forEach(function (q, i) { i ? sctx.lineTo(q.x, q.y) : sctx.moveTo(q.x, q.y); });
        sctx.lineWidth = 8;    sctx.strokeStyle = PIPE + '0.075)'; sctx.stroke();
        sctx.lineWidth = 2.3;  sctx.strokeStyle = PIPE + '0.24)';  sctx.stroke();
      });
      paths.forEach(function (p) {
        p.corners.forEach(function (c) {
          if (c.x < -20 || c.x > W + 20 || c.y < -20 || c.y > H + 20) return;
          sctx.beginPath();
          sctx.arc(c.x, c.y, 3.1, 0, 6.2832);
          sctx.fillStyle = PIPE + '0.34)';
          sctx.fill();
        });
      });

      /* pulses — about one in three carries heat back */
      pulses = [];
      var n = small ? 9 : 18;
      for (var j = 0; j < n; j++) {
        var p = paths[j % paths.length];
        var warm = Math.random() < 0.34;
        pulses.push({
          path: p,
          at: rnd(0, p.pts.length),
          speed: rnd(22, 52) / (small ? 1.25 : 1),
          trail: (small ? 26 : 40) + (rnd(0, 20) | 0),
          warm: warm,
          w: warm ? rnd(3.4, 4.6) : rnd(2.8, 4.0),
          wait: rnd(0, 3)
        });
      }

    }

    function drawPulse(p) {
      var pts = p.path.pts, n = pts.length;
      if (n < 8) return;
      var head = ((p.at % n) + n) % n;
      var tail = head - p.trail;
      if (tail < 0) tail = 0;
      var hp = pts[head | 0], tp = pts[tail | 0];
      if (!hp || !tp) return;

      var col = p.warm ? WARM : COOL;
      var h0 = head | 0, t0i = tail | 0;
      var mid = t0i + (((h0 - t0i) * 0.62) | 0);

      /* faint tail, then a brighter run into the head. Two flat strokes — no
         gradient object is allocated on any frame. */
      ctx.beginPath();
      ctx.moveTo(tp.x, tp.y);
      for (var i = t0i + 1; i <= mid; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = col[1] + '5c';
      ctx.lineWidth = p.w * 0.8;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(pts[mid].x, pts[mid].y);
      for (var k2 = mid + 1; k2 <= h0; k2++) ctx.lineTo(pts[k2].x, pts[k2].y);
      ctx.strokeStyle = col[0] + 'ff';
      ctx.lineWidth = p.w;
      ctx.stroke();

      /* the bright head — two flat arcs, no gradient allocation per frame */
      ctx.beginPath();
      ctx.arc(hp.x, hp.y, p.w * 2.6, 0, 6.2832);
      ctx.fillStyle = col[0] + '47';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(hp.x, hp.y, p.w * 0.85, 0, 6.2832);
      ctx.fillStyle = col[0];
      ctx.fill();
    }

    /* 30fps is indistinguishable for glows this slow, and it halves the number
       of composited surface updates — which is what actually costs on a phone. */
    var FRAME_MS = 1000 / 30, lastPaint = 0;

    function frame(ms) {
      raf = 0;
      if (!visible) return;
      if (ms - lastPaint < FRAME_MS) { raf = requestAnimationFrame(frame); return; }
      var dt = t0 ? Math.min(0.08, (ms - t0) / 1000) : 0.033;
      t0 = ms; lastPaint = ms;

      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (var i = 0; i < pulses.length; i++) {
        var p = pulses[i];
        if (p.wait > 0) { p.wait -= dt; continue; }
        p.at += p.speed * dt;
        if (p.at - p.trail > p.path.pts.length) { p.at = 0; p.wait = rnd(0.4, 3.4); }
        drawPulse(p);
      }
      raf = requestAnimationFrame(frame);
    }

    function stillFrame() {
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      pulses.forEach(function (p) { p.at = rnd(p.trail, p.path.pts.length); drawPulse(p); });
    }

    function run() {
      if (REDUCED) { stillFrame(); return; }
      if (!raf) { t0 = 0; lastPaint = 0; raf = requestAnimationFrame(frame); }
    }
    function halt() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

    build();
    run();

    if (window.ResizeObserver) {
      var last = 0, ro = new ResizeObserver(function () {
        var w = host.getBoundingClientRect().width | 0;
        if (Math.abs(w - last) < 40) return;   /* ignore mobile URL-bar reflow */
        last = w;
        halt(); build(); run();
      });
      ro.observe(host);
    }

    if (window.IntersectionObserver) {
      new IntersectionObserver(function (rows) {
        visible = rows[0].isIntersecting;
        visible ? run() : halt();
      }, { rootMargin: '80px' }).observe(host);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) halt(); else if (visible) run();
    });
  }

  HOSTS.forEach(start);
})();

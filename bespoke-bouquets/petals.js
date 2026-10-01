/* =====================================================================
   Floating petals behind the whole site.
   One fixed canvas sits between the section backgrounds and the content
   (see .petal-sky in style.css): petals drift through the empty space
   and pass BEHIND text, photographs and buttons, never over them.
   Off under reduced motion; paused when the tab is hidden.
   ===================================================================== */
(() => {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas');
  c.className = 'petal-sky';
  c.setAttribute('aria-hidden', 'true');
  document.body.prepend(c);
  const ctx = c.getContext('2d');

  const PINKS = [
    ['#ffd9e0', '#f4a7b8'], ['#fbe3e7', '#eeb3c0'], ['#f9c9d3', '#e48ea4'],
    ['#fff1f3', '#f6c3cd'], ['#f5b8c6', '#d9718c'], ['#fde8d9', '#f2c2a6']
  ];
  let W, H, dpr, list = [], raf = 0, last = 0, running = true;

  function size() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    c.width = W * dpr; c.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const want = W < 640 ? 14 : W < 1100 ? 20 : 26;
    while (list.length < want) list.push(make(true));
    list.length = want;
  }
  function make(anywhere) {
    const [a, b] = PINKS[(Math.random() * PINKS.length) | 0];
    const blossom = Math.random() < 0.18;
    return {
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : -40 - Math.random() * 120,
      s: blossom ? 7 + Math.random() * 6 : 9 + Math.random() * 13,
      vy: 14 + Math.random() * 20,
      vx: -6 + Math.random() * 12,
      sway: 14 + Math.random() * 22,
      ph: Math.random() * 6.28,
      tumble: 0.6 + Math.random() * 1.2,
      r: Math.random() * 6.28,
      vr: -0.5 + Math.random(),
      a: 0.55 + Math.random() * 0.4,
      c1: a, c2: b, blossom
    };
  }
  function petal(p) {
    const s = p.s;
    const g = ctx.createLinearGradient(0, -s, 0, s);
    g.addColorStop(0, p.c1); g.addColorStop(1, p.c2);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, s);
    ctx.bezierCurveTo(-s * 0.95, s * 0.35, -s * 0.8, -s * 0.85, -s * 0.12, -s * 0.95);
    ctx.quadraticCurveTo(0, -s * 0.7, s * 0.12, -s * 0.95);
    ctx.bezierCurveTo(s * 0.8, -s * 0.85, s * 0.95, s * 0.35, 0, s);
    ctx.fill();
    ctx.globalAlpha *= 0.5;
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(0, s * 0.8); ctx.quadraticCurveTo(s * 0.1, 0, 0, -s * 0.6); ctx.stroke();
  }
  function blossom(p) {
    const s = p.s;
    ctx.fillStyle = p.c1;
    for (let i = 0; i < 5; i++) {
      ctx.save(); ctx.rotate(i * 1.2566);
      ctx.beginPath(); ctx.ellipse(0, -s * 0.62, s * 0.42, s * 0.62, 0, 0, 6.2832); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = p.c2;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, 6.2832); ctx.fill();
  }
  function tick(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    ctx.clearRect(0, 0, W, H);
    for (const p of list) {
      p.ph += dt * p.tumble;
      p.y += p.vy * dt;
      p.x += (p.vx + Math.sin(p.ph) * p.sway) * dt;
      p.r += p.vr * dt;
      if (p.y > H + 40 || p.x < -60 || p.x > W + 60) Object.assign(p, make(false));
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(p.ph)));   // gentle 3D tumble
      ctx.globalAlpha = p.a;
      p.blossom ? blossom(p) : petal(p);
      ctx.restore();
    }
    raf = requestAnimationFrame(tick);
  }
  size();
  addEventListener('resize', size);
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) { last = 0; raf = requestAnimationFrame(tick); } else cancelAnimationFrame(raf);
  });
  raf = requestAnimationFrame(tick);
})();

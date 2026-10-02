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

  /* Each petal is drawn once into a small sprite; every frame just stamps
     the sprites, which keeps the animation smooth on phones. */
  const SPRITES = [];
  function sprite(c1, c2, isBlossom) {
    const S = 48, s = 18, k = document.createElement('canvas');
    k.width = k.height = S;
    const g2 = k.getContext('2d');
    g2.translate(S / 2, S / 2);
    if (isBlossom) {
      g2.fillStyle = c1;
      for (let i = 0; i < 5; i++) {
        g2.save(); g2.rotate(i * 1.2566);
        g2.beginPath(); g2.ellipse(0, -s * 0.62, s * 0.42, s * 0.62, 0, 0, 6.2832); g2.fill();
        g2.restore();
      }
      g2.fillStyle = c2;
      g2.beginPath(); g2.arc(0, 0, s * 0.3, 0, 6.2832); g2.fill();
    } else {
      const g = g2.createLinearGradient(0, -s, 0, s);
      g.addColorStop(0, c1); g.addColorStop(1, c2);
      g2.fillStyle = g;
      g2.beginPath();
      g2.moveTo(0, s);
      g2.bezierCurveTo(-s * 0.95, s * 0.35, -s * 0.8, -s * 0.85, -s * 0.12, -s * 0.95);
      g2.quadraticCurveTo(0, -s * 0.7, s * 0.12, -s * 0.95);
      g2.bezierCurveTo(s * 0.8, -s * 0.85, s * 0.95, s * 0.35, 0, s);
      g2.fill();
      g2.globalAlpha = 0.5;
      g2.strokeStyle = 'rgba(255,255,255,.8)'; g2.lineWidth = 0.8;
      g2.beginPath(); g2.moveTo(0, s * 0.8); g2.quadraticCurveTo(s * 0.1, 0, 0, -s * 0.6); g2.stroke();
    }
    return k;
  }
  for (const [a, b] of PINKS) SPRITES.push([sprite(a, b, false), sprite(a, b, true)]);

  function size() {
    dpr = Math.min(1.5, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    c.width = W * dpr; c.height = H * dpr;
    const want = W < 640 ? 11 : W < 1100 ? 16 : 22;
    while (list.length < want) list.push(make(true));
    list.length = want;
  }
  function make(anywhere) {
    const blossom = Math.random() < 0.18;
    return {
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : -40 - Math.random() * 120,
      s: blossom ? 7 + Math.random() * 6 : 9 + Math.random() * 13,
      vy: 7 + Math.random() * 9,          // slow, gentle fall
      vx: -3 + Math.random() * 6,
      sway: 8 + Math.random() * 12,
      ph: Math.random() * 6.28,
      tumble: 0.3 + Math.random() * 0.5,
      r: Math.random() * 6.28,
      vr: -0.25 + Math.random() * 0.5,
      a: 0.55 + Math.random() * 0.4,
      img: SPRITES[(Math.random() * SPRITES.length) | 0][blossom ? 1 : 0]
    };
  }
  function tick(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    for (const p of list) {
      p.ph += dt * p.tumble;
      p.y += p.vy * dt;
      p.x += (p.vx + Math.sin(p.ph) * p.sway) * dt;
      p.r += p.vr * dt;
      if (p.y > H + 40 || p.x < -60 || p.x > W + 60) Object.assign(p, make(false));
      const sc = p.s / 18, cos = Math.cos(p.r), sin = Math.sin(p.r);
      const sy = sc * (0.35 + 0.65 * Math.abs(Math.cos(p.ph)));   // gentle 3D tumble
      ctx.setTransform(cos * sc * dpr, sin * sc * dpr, -sin * sy * dpr, cos * sy * dpr, p.x * dpr, p.y * dpr);
      ctx.globalAlpha = p.a;
      ctx.drawImage(p.img, -24, -24);
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

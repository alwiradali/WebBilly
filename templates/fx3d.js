/* ============================================================
   Billy Digitals — 3D hero animation layer for sample templates
   Floating 3D centerpiece + depth particles + parallax + tilt,
   inspired by product-hero parallax showcases.
   Shared by all templates; per-page particles below.
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return; // static heroes for reduced-motion users

  var PARTICLES = {
    restaurant: ["🌶️", "🧄", "🍃", "🫓", "✨"],
    corporate:  ["💼", "📊", "🧭", "✉️", "✨"],
    portfolio:  ["🖌️", "🎭", "📐", "🖼️", "✨"],
    realestate: ["🏠", "🔑", "📍", "🏗️", "✨"],
    medical:    ["💊", "➕", "🧬", "🩹", "✨"],
    education:  ["📚", "✏️", "🧠", "🔬", "✨"],
    saas:       ["⚙️", "☁️", "🔗", "💡", "✨"],
    fitness:    ["💪", "🔥", "🥇", "⏱️", "✨"],
    travel:     ["✈️", "🧳", "🗺️", "☀️", "✨"],
  };

  var page = (location.pathname.split("/").pop() || "").replace(".html", "");
  var set = PARTICLES[page] || ["✨", "✦", "✨", "✦", "✨"];

  var hero = document.querySelector(".dhero");
  var art = document.querySelector(".dhero-art");
  var emoji = document.querySelector(".dhero-art .art-emoji");
  var h1 = document.querySelector(".dhero h1");
  if (!hero || !art || !emoji) return;

  /* ---------- 1. Centerpiece: float + spin + ground shadow ---------- */
  hero.classList.add("fx3d");
  art.classList.add("fx3d-stage");
  emoji.classList.add("fx3d-hero");
  var shadow = document.createElement("span");
  shadow.className = "fx3d-shadow";
  art.appendChild(shadow);

  /* ---------- 2. Depth particles ---------- */
  // Pseudo-random but stable per page (no Math.random → consistent layout)
  var seeds = [
    { x: 12, y: 18, s: 1.6, d: 14, depth: 0.9 },
    { x: 78, y: 12, s: 1.1, d: 18, depth: 0.5 },
    { x: 68, y: 72, s: 1.9, d: 16, depth: 1.2 },
    { x: 8,  y: 66, s: 1.0, d: 20, depth: 0.4 },
    { x: 88, y: 44, s: 1.3, d: 12, depth: 0.7 },
  ];
  var parts = [];
  seeds.forEach(function (cfg, i) {
    var p = document.createElement("span");
    p.className = "fx3d-p";
    p.textContent = set[i % set.length];
    p.style.left = cfg.x + "%";
    p.style.top = cfg.y + "%";
    p.style.fontSize = cfg.s + "rem";
    p.style.animationDuration = cfg.d + "s";
    p.style.animationDelay = -(i * 2.7) + "s";
    p.dataset.depth = cfg.depth;
    hero.appendChild(p);
    parts.push(p);
  });

  /* ---------- 3. Extruded 3D headline ---------- */
  if (h1) h1.classList.add("fx3d-title");

  /* ---------- 4. Mouse tilt + scroll parallax ---------- */
  var mx = 0, my = 0, tx = 0, ty = 0, scrollY = 0, raf = null;

  function onMove(e) {
    var r = hero.getBoundingClientRect();
    mx = ((e.clientX - r.left) / r.width - 0.5) * 2;   // -1 … 1
    my = ((e.clientY - r.top) / r.height - 0.5) * 2;
    schedule();
  }
  function onScroll() {
    scrollY = window.scrollY || 0;
    schedule();
  }
  function schedule() {
    if (!raf) raf = requestAnimationFrame(apply);
  }
  function apply() {
    raf = null;
    // ease toward target for buttery motion
    tx += (mx - tx) * 0.12;
    ty += (my - ty) * 0.12;
    var sp = Math.min(scrollY / 600, 1); // scroll progress within hero

    emoji.style.transform =
      "translateY(" + sp * 70 + "px)" +
      " rotateX(" + (-ty * 10) + "deg)" +
      " rotateY(" + (tx * 14) + "deg)";
    shadow.style.transform = "translateX(-50%) scale(" + (1 - sp * 0.35) + ")";
    shadow.style.opacity = 0.55 - sp * 0.3;

    if (h1) {
      h1.style.transform =
        "perspective(700px) rotateX(" + (-ty * 2.4) + "deg) rotateY(" + (tx * 3.2) + "deg)";
    }
    parts.forEach(function (p) {
      var d = parseFloat(p.dataset.depth);
      p.style.translate =
        (tx * 18 * d) + "px " + (ty * 12 * d - sp * 90 * d) + "px";
    });

    // keep easing while pointer target not reached
    if (Math.abs(mx - tx) > 0.001 || Math.abs(my - ty) > 0.001) schedule();
  }

  hero.addEventListener("pointermove", onMove);
  hero.addEventListener("pointerleave", function () { mx = 0; my = 0; schedule(); });
  window.addEventListener("scroll", onScroll, { passive: true });
  apply();
})();

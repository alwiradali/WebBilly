/* ============================================================
   Billy Digitals — per-template signature hero animations.
   Each sample template gets its own distinct animation style.
   Vanilla JS + CSS (see fx3d section of demo.css). No deps.
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  var hero = document.querySelector(".dhero");
  var art = document.querySelector(".dhero-art");
  var emoji = document.querySelector(".dhero-art .art-emoji");
  var h1 = document.querySelector(".dhero h1");
  if (!hero || !art || !emoji) return;

  var page = (location.pathname.split("/").pop() || "").replace(".html", "");

  /* ---------- shared helpers ---------- */
  function el(cls, txt, parent) {
    var s = document.createElement("span");
    s.className = cls;
    if (txt) s.textContent = txt;
    (parent || hero).appendChild(s);
    return s;
  }
  function mouseTilt(target, strength) {
    var mx = 0, my = 0, tx = 0, ty = 0, raf = null;
    function apply() {
      raf = null;
      tx += (mx - tx) * 0.12; ty += (my - ty) * 0.12;
      target.style.transform = "rotateX(" + (-ty * strength) + "deg) rotateY(" + (tx * strength * 1.3) + "deg)";
      if (Math.abs(mx - tx) > 0.001 || Math.abs(my - ty) > 0.001) schedule();
    }
    function schedule() { if (!raf) raf = requestAnimationFrame(apply); }
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      my = ((e.clientY - r.top) / r.height - 0.5) * 2;
      schedule();
    });
    hero.addEventListener("pointerleave", function () { mx = 0; my = 0; schedule(); });
  }

  hero.classList.add("fx", "fx-" + page);
  art.classList.add("fx-stage");

  var STYLES = {

    /* 🍛 Orbiting ingredients + steam */
    restaurant: function () {
      emoji.classList.add("fx-bob");
      var ring = el("fx-orbit", null, art);
      ["🌶️", "🧄", "🍃", "🫓"].forEach(function (t, i) {
        var item = el("fx-orbit-item", null, ring);
        item.style.transform = "rotate(" + (i * 90) + "deg) translateX(150px) rotate(" + (-i * 90) + "deg)";
        el("fx-orbit-emoji", t, item);
      });
      for (var i = 0; i < 3; i++) {
        var s = el("fx-steam", "", art);
        s.style.left = (42 + i * 8) + "%";
        s.style.animationDelay = (i * 1.1) + "s";
      }
      mouseTilt(emoji, 8);
    },

    /* 📈 Bar chart grows + deep extruded headline */
    corporate: function () {
      if (h1) { h1.classList.add("fx-extrude"); mouseTilt(h1, 3); }
      emoji.classList.add("fx-bob");
      var chart = el("fx-chart", null, art);
      [38, 62, 46, 78, 95].forEach(function (h, i) {
        var b = el("fx-bar", null, chart);
        b.style.setProperty("--h", h + "%");
        b.style.animationDelay = (i * 0.18) + "s";
      });
    },

    /* 🎨 Cursor paint trail + tilting canvas */
    portfolio: function () {
      emoji.classList.add("fx-bob");
      mouseTilt(art, 10);
      var hues = [340, 45, 200, 270, 150];
      var n = 0, last = 0;
      hero.addEventListener("pointermove", function (e) {
        var now = Date.now();
        if (now - last < 40) return; // rate-limit
        last = now;
        var r = hero.getBoundingClientRect();
        var d = el("fx-paint");
        d.style.left = (e.clientX - r.left) + "px";
        d.style.top = (e.clientY - r.top) + "px";
        d.style.background = "hsl(" + hues[n++ % hues.length] + " 85% 60%)";
        setTimeout(function () { d.remove(); }, 900);
      });
    },

    /* 🏙️ Layered skyline parallax */
    realestate: function () {
      emoji.classList.add("fx-bob");
      var layers = [
        { txt: "🏢🏬🏢🏦🏢🏬🏢", cls: "far" },
        { txt: "🏙️🏢🏙️🏢🏙️", cls: "mid" },
        { txt: "🏗️🏠🏘️🏠🏗️", cls: "near" },
      ];
      var planes = layers.map(function (l) {
        var p = el("fx-sky fx-sky-" + l.cls, l.txt, hero);
        return p;
      });
      hero.addEventListener("pointermove", function (e) {
        var r = hero.getBoundingClientRect();
        var x = ((e.clientX - r.left) / r.width - 0.5) * 2;
        planes.forEach(function (p, i) {
          p.style.translate = (x * (i + 1) * -14) + "px 0";
        });
      });
      window.addEventListener("scroll", function () {
        var y = window.scrollY || 0;
        planes.forEach(function (p, i) {
          p.style.translate = "0 " + Math.min(y / (4 - i), 120) + "px";
        });
      }, { passive: true });
    },

    /* 🩺 Heartbeat pulse + ECG line */
    medical: function () {
      emoji.classList.add("fx-pulse");
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "fx-ecg");
      svg.setAttribute("viewBox", "0 0 600 80");
      svg.setAttribute("preserveAspectRatio", "none");
      svg.innerHTML = '<path d="M0 40 H150 L170 40 180 12 192 66 202 40 H300 L320 40 330 12 342 66 352 40 H460 L480 40 490 12 502 66 512 40 H600" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
      hero.appendChild(svg);
      for (var i = 0; i < 4; i++) {
        var b = el("fx-bubble", "➕");
        b.style.left = (12 + i * 24) + "%";
        b.style.animationDelay = (i * 1.6) + "s";
      }
    },

    /* 🎓 Slow 3D flip + floating books */
    education: function () {
      emoji.classList.add("fx-flip");
      ["📚", "✏️", "🧠", "🔬"].forEach(function (t, i) {
        var f = el("fx-floaty", t);
        f.style.left = (10 + i * 24) + "%";
        f.style.top = (18 + (i % 2) * 52) + "%";
        f.style.animationDelay = (i * 1.3) + "s";
      });
      if (h1) mouseTilt(h1, 2);
    },

    /* 📊 Morphing liquid blob + orbiting satellites */
    saas: function () {
      var blob = el("fx-blob", null, art);
      art.insertBefore(blob, art.firstChild);
      emoji.classList.add("fx-bob");
      mouseTilt(emoji, 10);
      ["⚙️", "☁️"].forEach(function (t, i) {
        var orb = el("fx-sat fx-sat-" + i, null, art);
        el("fx-sat-emoji", t, orb);
      });
    },

    /* 🏋️ Power bounce + shockwave rings */
    fitness: function () {
      emoji.classList.add("fx-slam");
      emoji.addEventListener("animationiteration", function () {
        var ring = el("fx-ring", null, art);
        setTimeout(function () { ring.remove(); }, 700);
      });
      for (var i = 0; i < 3; i++) {
        var f = el("fx-ember", "🔥");
        f.style.left = (20 + i * 28) + "%";
        f.style.animationDelay = (i * 1.4) + "s";
      }
    },

    /* 🌍 Plane flight path + clouds + spinning globe */
    travel: function () {
      emoji.classList.add("fx-spin-slow");
      el("fx-plane", "✈️");
      ["☁️", "☁️", "☁️"].forEach(function (t, i) {
        var c = el("fx-cloud", t);
        c.style.top = (14 + i * 26) + "%";
        c.style.animationDuration = (26 + i * 9) + "s";
        c.style.animationDelay = -(i * 8) + "s";
        c.style.fontSize = (1.4 + i * 0.5) + "rem";
      });
    },
  };

  (STYLES[page] || STYLES.saas)();
})();

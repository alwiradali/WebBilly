/* ============================================================
   Skyline Estates — 3D virtual house tour
   A furnished, open-plan interior you can look around (drag) and
   zoom into every corner (scroll / pinch). Three viewpoints:
   Living room · Kitchen · Bedroom. Self-contained Three.js — no
   external assets. Fails safe (hides the stage if WebGL is off).
   ============================================================ */
import * as THREE from "three";

(function () {
  "use strict";
  var host = document.getElementById("tourStage");
  var canvas = document.getElementById("tourGL");
  if (!host || !canvas) return;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  var renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false }); }
  catch (e) { host.style.display = "none"; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  var W = host.clientWidth, H = host.clientHeight || Math.round(W * 0.62);
  renderer.setSize(W, H, false);

  var scene = new THREE.Scene();
  scene.background = new THREE.Color("#0e1116");
  scene.fog = new THREE.Fog("#0e1116", 22, 40);

  var camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 100);

  /* ---------- lights ---------- */
  scene.add(new THREE.HemisphereLight("#f4f0e6", "#3a3730", 0.95));
  var sun = new THREE.DirectionalLight("#fff4df", 1.15);
  sun.position.set(-6, 8, 6); scene.add(sun);
  var warm = new THREE.PointLight("#ffd9a0", 0.5, 30); warm.position.set(2, 3.2, 1.5); scene.add(warm);

  /* ---------- material + mesh helpers ---------- */
  function mat(color, rough, metal) {
    return new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: rough == null ? 0.85 : rough, metalness: metal || 0 });
  }
  function box(w, h, d, color, x, y, z, rough, metal) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, rough, metal));
    m.position.set(x, y, z); scene.add(m); return m;
  }
  function cyl(rt, rb, h, color, x, y, z, rough) {
    var m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 20), mat(color, rough));
    m.position.set(x, y, z); scene.add(m); return m;
  }

  /* ---------- shell: floor + two walls + ceiling ---------- */
  box(13, 0.2, 10, "#b48a5e", 0, -0.1, 0, 0.9);           // wood floor
  box(0.2, 4.2, 10, "#ece7de", -6.4, 2.0, 0, 0.95);        // left wall
  box(13, 4.2, 0.2, "#e7e1d6", 0, 2.0, -4.9, 0.95);        // back wall
  box(13, 0.2, 10, "#f3efe8", 0, 4.1, 0, 1);               // ceiling

  // large window on the back wall (glowing sky)
  var win = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.6), new THREE.MeshBasicMaterial({ color: "#cfe8ff" }));
  win.position.set(2.4, 2.1, -4.78); scene.add(win);
  box(4.9, 0.16, 0.16, "#cfc7ba", 2.4, 3.42, -4.74, 0.8);  // window frame top/bottom/mid
  box(4.9, 0.16, 0.16, "#cfc7ba", 2.4, 0.8, -4.74, 0.8);
  box(0.14, 2.7, 0.14, "#cfc7ba", 2.4, 2.1, -4.72, 0.8);
  // soft light spilling from the window
  var winLight = new THREE.RectAreaLight ? null : null;
  var wl = new THREE.PointLight("#dcefff", 0.6, 22); wl.position.set(2.4, 2.2, -3.4); scene.add(wl);

  // area rug
  box(5.4, 0.04, 3.6, "#cbb7a0", -1.6, 0.02, 1.0, 1);

  /* ---------- LIVING ROOM (centre-left) ---------- */
  // L-sofa
  var sofaCol = "#8f7f6b";
  box(3.6, 0.55, 1.3, sofaCol, -2.0, 0.42, 0.2, 0.9);       // seat base
  box(3.6, 0.7, 0.35, sofaCol, -2.0, 0.85, -0.35, 0.9);     // backrest
  box(0.35, 0.62, 1.3, sofaCol, -3.7, 0.6, 0.2, 0.9);       // left arm
  box(1.3, 0.55, 1.7, sofaCol, -0.55, 0.42, 1.55, 0.9);     // chaise
  box(0.9, 0.22, 1.0, "#e7ddce", -2.3, 0.72, 0.3, 0.85);    // cushions
  box(0.9, 0.22, 1.0, "#dcd0bd", -1.3, 0.72, 0.3, 0.85);
  // coffee table
  box(1.5, 0.12, 0.85, "#4a3a2c", -1.6, 0.5, 1.5, 0.6);
  box(0.1, 0.4, 0.1, "#3a2e23", -2.25, 0.25, 1.15); box(0.1, 0.4, 0.1, "#3a2e23", -0.95, 0.25, 1.15);
  box(0.1, 0.4, 0.1, "#3a2e23", -2.25, 0.25, 1.85); box(0.1, 0.4, 0.1, "#3a2e23", -0.95, 0.25, 1.85);
  cyl(0.12, 0.16, 0.22, "#c06a3e", -1.6, 0.66, 1.5, 0.7);   // vase on table
  // TV wall unit + screen (against left wall)
  box(0.3, 0.7, 3.2, "#2c2a2e", -6.1, 0.35, -1.4, 0.5);
  var tv = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.5), new THREE.MeshBasicMaterial({ color: "#0b0d12" }));
  tv.rotation.y = Math.PI / 2; tv.position.set(-6.22, 2.0, -1.4); scene.add(tv);
  // floor lamp
  cyl(0.03, 0.03, 2.0, "#2a2a2e", -4.2, 1.0, -0.4); cyl(0.28, 0.34, 0.4, "#f0e6cf", -4.2, 2.1, -0.4, 0.6);

  /* ---------- KITCHEN (right side) ---------- */
  box(0.7, 1.0, 6.0, "#33403a", 5.6, 0.5, -1.0, 0.7);       // base cabinets
  box(0.75, 0.12, 6.1, "#eceae4", 5.6, 1.06, -1.0, 0.5, 0.1); // worktop
  box(0.6, 1.0, 3.2, "#33403a", 5.6, 3.0, -2.4, 0.7);       // upper cabinets
  // island
  box(2.4, 1.0, 1.2, "#33403a", 2.6, 0.5, 2.6, 0.7);
  box(2.6, 0.12, 1.4, "#eceae4", 2.6, 1.06, 2.6, 0.5, 0.1);
  // stools
  cyl(0.22, 0.22, 0.12, "#c9a24b", 1.7, 0.78, 3.4, 0.6, 0.3); cyl(0.04, 0.04, 0.78, "#7a7a7a", 1.7, 0.4, 3.4, 0.4, 0.6);
  cyl(0.22, 0.22, 0.12, "#c9a24b", 2.6, 0.78, 3.4, 0.6, 0.3); cyl(0.04, 0.04, 0.78, "#7a7a7a", 2.6, 0.4, 3.4, 0.4, 0.6);
  cyl(0.22, 0.22, 0.12, "#c9a24b", 3.5, 0.78, 3.4, 0.6, 0.3); cyl(0.04, 0.04, 0.78, "#7a7a7a", 3.5, 0.4, 3.4, 0.4, 0.6);
  // pendant lights over island
  var pA = cyl(0.16, 0.10, 0.24, "#1c1c1e", 2.0, 2.5, 2.6, 0.5); var pB = cyl(0.16, 0.10, 0.24, "#1c1c1e", 3.2, 2.5, 2.6, 0.5);
  scene.add(new THREE.PointLight("#ffdca0", 0.35, 9).translateX ? (function () { var l = new THREE.PointLight("#ffdca0", 0.4, 10); l.position.set(2.6, 2.3, 2.6); return l; })() : new THREE.Object3D());

  /* ---------- BEDROOM (back-left corner) ---------- */
  box(3.0, 0.5, 2.4, "#4a3a2c", -4.3, 0.28, -3.3, 0.7);     // bed base
  box(3.0, 0.35, 2.2, "#efe7d8", -4.3, 0.62, -3.3, 0.9);    // mattress
  box(3.0, 1.0, 0.2, "#6b5a44", -4.3, 0.7, -4.45, 0.85);    // headboard
  box(1.1, 0.28, 0.6, "#dfe6ea", -3.7, 0.9, -4.0, 0.9);     // pillow
  box(1.1, 0.28, 0.6, "#e7edf0", -4.9, 0.9, -4.0, 0.9);
  box(2.2, 0.16, 1.4, "#c98b6b", -4.3, 0.78, -2.7, 0.9);    // throw blanket
  box(0.6, 0.5, 0.5, "#3a2e23", -2.5, 0.25, -4.0, 0.7);     // bedside table
  cyl(0.14, 0.2, 0.3, "#e7d9b8", -2.5, 0.62, -4.0, 0.6);    // lamp

  /* ---------- greenery + art ---------- */
  cyl(0.28, 0.22, 0.5, "#b5643c", 4.6, 0.25, 3.7, 0.8);     // plant pot
  var foliage = mat("#4f7a44", 0.9);
  var fol = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), foliage); fol.position.set(4.6, 0.95, 3.7); scene.add(fol);
  var fol2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 0), foliage); fol2.position.set(4.6, 1.4, 3.7); scene.add(fol2);
  // wall art on back wall
  function art(x, c) { var a = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.5), new THREE.MeshBasicMaterial({ color: c })); a.position.set(x, 2.3, -4.77); scene.add(a); box(1.24, 1.64, 0.06, "#2b2620", x, 2.3, -4.82, 0.6); }
  art(-3.2, "#c9986a"); art(-1.7, "#7d93a8");

  /* ---------- camera orbit control ---------- */
  var VIEWS = {
    living: { tx: -1.6, ty: 1.15, tz: 0.8, az: 0.62, pol: 1.34, rad: 6.6 },
    kitchen: { tx: 3.4, ty: 1.2, tz: 1.2, az: -0.5, pol: 1.4, rad: 5.6 },
    bedroom: { tx: -3.9, ty: 1.0, tz: -3.0, az: 0.95, pol: 1.42, rad: 4.9 }
  };
  var cur = { tx: -1.6, ty: 1.15, tz: 0.8, az: 0.62, pol: 1.34, rad: 6.6 };
  var dst = Object.assign({}, cur);

  function applyCam() {
    var st = cur;
    var x = st.tx + st.rad * Math.sin(st.pol) * Math.sin(st.az);
    var y = st.ty + st.rad * Math.cos(st.pol);
    var z = st.tz + st.rad * Math.sin(st.pol) * Math.cos(st.az);
    camera.position.set(x, y, z);
    camera.lookAt(st.tx, st.ty, st.tz);
  }
  applyCam();

  function goTo(name) {
    var v = VIEWS[name]; if (!v) return;
    dst.tx = v.tx; dst.ty = v.ty; dst.tz = v.tz; dst.az = v.az; dst.pol = v.pol; dst.rad = v.rad;
  }

  /* ---------- interaction: drag look + wheel/pinch zoom ---------- */
  var dragging = false, lx = 0, ly = 0, pinch = 0;
  function down(x, y) { dragging = true; lx = x; ly = y; }
  function move(x, y) {
    if (!dragging) return;
    dst.az -= (x - lx) * 0.006; dst.pol += (y - ly) * 0.005;
    dst.pol = Math.max(0.75, Math.min(1.62, dst.pol));
    lx = x; ly = y;
  }
  function up() { dragging = false; }
  canvas.addEventListener("mousedown", function (e) { down(e.clientX, e.clientY); });
  window.addEventListener("mousemove", function (e) { move(e.clientX, e.clientY); });
  window.addEventListener("mouseup", up);
  canvas.addEventListener("wheel", function (e) { e.preventDefault(); dst.rad = Math.max(1.4, Math.min(9, dst.rad + e.deltaY * 0.006)); }, { passive: false });
  canvas.addEventListener("touchstart", function (e) {
    if (e.touches.length === 1) down(e.touches[0].clientX, e.touches[0].clientY);
    else if (e.touches.length === 2) pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
  }, { passive: true });
  canvas.addEventListener("touchmove", function (e) {
    if (e.touches.length === 1) move(e.touches[0].clientX, e.touches[0].clientY);
    else if (e.touches.length === 2) {
      var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (pinch) { dst.rad = Math.max(1.4, Math.min(9, dst.rad - (d - pinch) * 0.02)); }
      pinch = d;
      if (e.cancelable) e.preventDefault();
    }
  }, { passive: false });
  canvas.addEventListener("touchend", function () { dragging = false; pinch = 0; });

  var buttons = host.querySelectorAll("[data-room]");
  Array.prototype.forEach.call(buttons, function (b) {
    b.addEventListener("click", function () {
      Array.prototype.forEach.call(buttons, function (o) { o.classList.remove("on"); });
      b.classList.add("on"); goTo(b.getAttribute("data-room"));
    });
  });

  /* ---------- loop (pauses off-screen) ---------- */
  var raf = null, onScreen = true, autoAz = true;
  function frame() {
    raf = requestAnimationFrame(frame);
    // ease toward destination
    for (var k in dst) cur[k] += (dst[k] - cur[k]) * 0.08;
    if (!dragging && autoAz && !reduce) dst.az += 0.0011;   // gentle idle drift
    applyCam();
    renderer.render(scene, camera);
  }
  function start() { if (raf == null && onScreen && !document.hidden) frame(); }
  function stop() { if (raf != null) { cancelAnimationFrame(raf); raf = null; } }
  canvas.addEventListener("pointerdown", function () { autoAz = false; });
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { es.forEach(function (e) { onScreen = e.isIntersecting; onScreen ? start() : stop(); }); }, { threshold: 0.01 }).observe(host);
  }
  start();

  function resize() {
    W = host.clientWidth; H = host.clientHeight || Math.round(W * 0.62);
    camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H, false);
  }
  window.addEventListener("resize", resize);
})();

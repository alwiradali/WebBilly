/* ============================================================
   Skyline Estates — 3D virtual house tour (architectural render)
   A furnished, realistically-lit open-plan interior you can look
   around (drag) and zoom into every corner (scroll / pinch), with
   Living / Kitchen / Bedroom viewpoints. Image-based lighting
   (RoomEnvironment), soft shadows, ACES tone mapping and procedural
   PBR wood / marble / fabric. Self-contained · fails safe.
   ============================================================ */
import * as THREE from "three";
import { RoomEnvironment } from "./vendor/jsm/environments/RoomEnvironment.js";

(function () {
  "use strict";
  var host = document.getElementById("tourStage");
  var canvas = document.getElementById("tourGL");
  if (!host || !canvas) return;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobile = window.matchMedia && matchMedia("(max-width: 720px)").matches;

  var renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false }); }
  catch (e) { host.style.display = "none"; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.6 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !mobile;              // shadows desktop-only for perf
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  var W = host.clientWidth, H = host.clientHeight || Math.round(W * 0.62);
  renderer.setSize(W, H, false);

  var scene = new THREE.Scene();
  scene.background = new THREE.Color("#0d0f13");

  var camera = new THREE.PerspectiveCamera(58, W / H, 0.05, 100);

  /* ---------- realistic image-based lighting ---------- */
  try {
    var pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  } catch (e) {}
  var sun = new THREE.DirectionalLight("#fff1d8", mobile ? 1.3 : 2.4);
  sun.position.set(-3, 8.5, 7);
  if (!mobile) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    var sc = sun.shadow.camera; sc.near = 1; sc.far = 42; sc.left = -13; sc.right = 13; sc.top = 12; sc.bottom = -12;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  }
  scene.add(sun);
  var warm = new THREE.PointLight("#ffcf94", 12, 22, 2); warm.position.set(1.5, 3.2, 1.8); scene.add(warm);

  /* ---------- procedural PBR textures (canvas) ---------- */
  function cvs(s) { var c = document.createElement("canvas"); c.width = c.height = s; return c; }
  function tex(c, rx, ry) { var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx || 1, ry || 1); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function woodTex() {
    var c = cvs(512), g = c.getContext("2d"), ph = 74;
    for (var y = -ph; y < 512; y += ph) {
      var l = rnd(26, 36);
      g.fillStyle = "hsl(" + rnd(24, 32) + "," + rnd(34, 46) + "%," + l + "%)";
      g.fillRect(0, y, 512, ph - 2);
      for (var i = 0; i < 48; i++) {
        g.strokeStyle = "rgba(30,18,8," + rnd(0.03, 0.10).toFixed(3) + ")"; g.lineWidth = rnd(0.6, 1.6);
        var yy = y + Math.random() * ph; g.beginPath(); g.moveTo(0, yy);
        g.bezierCurveTo(170, yy + rnd(-4, 4), 340, yy + rnd(-4, 4), 512, yy + rnd(-3, 3)); g.stroke();
      }
      g.fillStyle = "rgba(15,9,4,0.55)"; g.fillRect(0, y + ph - 2, 512, 2);
    }
    return c;
  }
  function marbleTex() {
    var c = cvs(512), g = c.getContext("2d");
    g.fillStyle = "#eceae4"; g.fillRect(0, 0, 512, 512);
    for (var i = 0; i < 22; i++) {
      g.strokeStyle = "rgba(120,124,130," + rnd(0.05, 0.18).toFixed(3) + ")"; g.lineWidth = rnd(0.6, 2.4);
      g.beginPath(); var x = rnd(-40, 512), y = rnd(-40, 40); g.moveTo(x, y);
      for (var s = 0; s < 6; s++) { x += rnd(40, 110); y += rnd(30, 120); g.lineTo(x + rnd(-30, 30), y); } g.stroke();
    }
    return c;
  }
  function fabricTex(base) {
    var c = cvs(256), g = c.getContext("2d");
    g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    for (var i = 0; i < 9000; i++) { g.fillStyle = "rgba(255,255,255," + rnd(0.01, 0.05).toFixed(3) + ")"; g.fillRect(Math.random() * 256, Math.random() * 256, 1, 1); }
    for (var j = 0; j < 9000; j++) { g.fillStyle = "rgba(0,0,0," + rnd(0.01, 0.05).toFixed(3) + ")"; g.fillRect(Math.random() * 256, Math.random() * 256, 1, 1); }
    return c;
  }

  var woodMap = tex(woodTex(), 4, 3);
  var marbleMap = tex(marbleTex(), 1, 1);

  function pbr(o) { return new THREE.MeshStandardMaterial(o); }
  var M = {
    floor: pbr({ map: woodMap, roughness: 0.5, metalness: 0.0 }),
    wall: pbr({ color: "#efe9df", roughness: 0.97 }),
    ceil: pbr({ color: "#f6f2ec", roughness: 1 }),
    marble: pbr({ map: marbleMap, roughness: 0.22, metalness: 0.02 }),
    cab: pbr({ color: "#2f3d38", roughness: 0.5, metalness: 0.15 }),
    sofa: pbr({ map: tex(fabricTex("#8d7c67"), 1, 1), roughness: 0.95 }),
    cushion: pbr({ map: tex(fabricTex("#d9cdb8"), 1, 1), roughness: 0.95 }),
    woodDark: pbr({ color: "#4a3a2c", roughness: 0.55 }),
    metal: pbr({ color: "#c9cdd2", roughness: 0.32, metalness: 0.9 }),
    brass: pbr({ color: "#c99a4b", roughness: 0.34, metalness: 0.85 }),
    bed: pbr({ map: tex(fabricTex("#efe7d8"), 1, 1), roughness: 0.95 }),
    throwm: pbr({ map: tex(fabricTex("#c98b6b"), 1, 1), roughness: 0.95 }),
    dark: pbr({ color: "#1b1c20", roughness: 0.5 }),
    rug: pbr({ map: tex(fabricTex("#c8b6a0"), 1, 1), roughness: 1 }),
    plant: pbr({ color: "#4f7a44", roughness: 0.8 }),
    terra: pbr({ color: "#b5643c", roughness: 0.7 })
  };

  function box(w, h, d, m, x, y, z, cast) {
    var me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    me.position.set(x, y, z); me.castShadow = cast !== false; me.receiveShadow = true; scene.add(me); return me;
  }
  function cyl(rt, rb, h, m, x, y, z, seg) {
    var me = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 24), m);
    me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; scene.add(me); return me;
  }

  /* ---------- shell ---------- */
  var floor = box(13, 0.2, 10, M.floor, 0, -0.1, 0, false);
  box(0.2, 4.2, 10, M.wall, -6.4, 2.0, 0, false);
  box(13, 4.2, 0.2, M.wall, 0, 2.0, -4.9, false);
  box(13, 0.2, 10, M.ceil, 0, 4.1, 0, false);

  // window (bright exterior) — no shadow-cast
  var sky = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.6), new THREE.MeshBasicMaterial({ color: "#dcefff" }));
  sky.position.set(2.4, 2.1, -4.78); scene.add(sky);
  box(4.9, 0.14, 0.14, M.wall, 2.4, 3.42, -4.73, false); box(4.9, 0.14, 0.14, M.wall, 2.4, 0.8, -4.73, false);
  box(0.12, 2.7, 0.12, M.wall, 2.4, 2.1, -4.71, false);
  box(0.12, 2.7, 0.12, M.wall, 0.3, 2.1, -4.71, false); box(0.12, 2.7, 0.12, M.wall, 4.5, 2.1, -4.71, false);

  box(5.4, 0.04, 3.6, M.rug, -1.6, 0.02, 1.0, false);   // rug

  /* ---------- living room ---------- */
  box(3.6, 0.5, 1.3, M.sofa, -2.0, 0.42, 0.2);
  box(3.6, 0.66, 0.32, M.sofa, -2.0, 0.86, -0.35);
  box(0.34, 0.6, 1.3, M.sofa, -3.72, 0.6, 0.2); box(0.34, 0.6, 1.3, M.sofa, -0.28, 0.6, 0.2);
  box(1.3, 0.5, 1.7, M.sofa, -0.55, 0.42, 1.5);          // chaise
  box(0.86, 0.24, 0.9, M.cushion, -2.35, 0.7, 0.28); box(0.86, 0.24, 0.9, M.cushion, -1.4, 0.7, 0.28);
  box(0.7, 0.22, 0.7, M.cushion, -0.55, 0.7, 1.5);
  box(1.5, 0.1, 0.85, M.woodDark, -1.6, 0.5, 1.55);      // coffee table top
  box(0.09, 0.4, 0.09, M.metal, -2.25, 0.25, 1.2); box(0.09, 0.4, 0.09, M.metal, -0.95, 0.25, 1.2);
  box(0.09, 0.4, 0.09, M.metal, -2.25, 0.25, 1.9); box(0.09, 0.4, 0.09, M.metal, -0.95, 0.25, 1.9);
  cyl(0.11, 0.15, 0.22, M.terra, -1.6, 0.66, 1.55);
  box(0.28, 0.7, 3.0, M.dark, -6.05, 0.35, -1.4);        // media unit
  var tv = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.45), new THREE.MeshStandardMaterial({ color: "#07080c", roughness: 0.15, metalness: 0.3 }));
  tv.rotation.y = Math.PI / 2; tv.position.set(-6.2, 2.0, -1.4); tv.receiveShadow = true; scene.add(tv);
  cyl(0.03, 0.03, 2.0, M.metal, -4.4, 1.0, -0.6); cyl(0.3, 0.36, 0.42, M.cushion, -4.4, 2.12, -0.6);  // floor lamp

  /* ---------- kitchen ---------- */
  box(0.7, 1.0, 6.0, M.cab, 5.7, 0.5, -1.0);
  box(0.78, 0.1, 6.1, M.marble, 5.7, 1.06, -1.0, false);
  box(0.55, 0.95, 3.2, M.cab, 5.75, 3.0, -2.4);
  box(2.4, 1.0, 1.2, M.cab, 2.6, 0.5, 2.6);
  box(2.62, 0.1, 1.42, M.marble, 2.6, 1.06, 2.6, false);
  var sx = [1.7, 2.6, 3.5];
  for (var q = 0; q < 3; q++) { cyl(0.22, 0.2, 0.1, M.brass, sx[q], 0.8, 3.5); cyl(0.035, 0.035, 0.78, M.metal, sx[q], 0.4, 3.5); }
  cyl(0.16, 0.1, 0.24, M.dark, 2.1, 2.55, 2.6); cyl(0.16, 0.1, 0.24, M.dark, 3.1, 2.55, 2.6);
  var isl = new THREE.PointLight("#ffd9a0", 6, 9, 2); isl.position.set(2.6, 2.3, 2.6); scene.add(isl);

  /* ---------- bedroom ---------- */
  box(3.0, 0.45, 2.4, M.woodDark, -4.3, 0.26, -3.3);
  box(2.9, 0.34, 2.2, M.bed, -4.3, 0.6, -3.3);
  box(3.0, 1.05, 0.18, M.bed, -4.3, 0.72, -4.45);
  box(1.05, 0.26, 0.58, M.cushion, -3.75, 0.88, -4.0); box(1.05, 0.26, 0.58, M.cushion, -4.85, 0.88, -4.0);
  box(2.2, 0.14, 1.3, M.throwm, -4.3, 0.76, -2.75);
  box(0.6, 0.5, 0.5, M.woodDark, -2.4, 0.25, -4.1); cyl(0.14, 0.2, 0.3, M.cushion, -2.4, 0.62, -4.1);

  /* ---------- greenery + art ---------- */
  cyl(0.28, 0.22, 0.5, M.terra, 4.7, 0.25, 3.8);
  var f1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), M.plant); f1.position.set(4.7, 0.98, 3.8); f1.castShadow = true; scene.add(f1);
  var f2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 1), M.plant); f2.position.set(4.7, 1.42, 3.8); f2.castShadow = true; scene.add(f2);
  function art(x, c) { var a = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.5), new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 })); a.position.set(x, 2.35, -4.76); scene.add(a); box(1.22, 1.62, 0.05, M.dark, x, 2.35, -4.8, false); }
  art(-3.4, "#c2905f"); art(-1.85, "#7d93a8");

  /* ---------- camera orbit + presets ---------- */
  var VIEWS = {
    living: { tx: -1.6, ty: 1.15, tz: 0.9, az: 0.6, pol: 1.36, rad: 6.4 },
    kitchen: { tx: 3.4, ty: 1.2, tz: 1.4, az: -0.5, pol: 1.42, rad: 5.4 },
    bedroom: { tx: -3.9, ty: 1.0, tz: -3.0, az: 0.98, pol: 1.44, rad: 4.7 }
  };
  var cur = Object.assign({}, VIEWS.living), dst = Object.assign({}, VIEWS.living);
  function applyCam() {
    var s = cur;
    camera.position.set(
      s.tx + s.rad * Math.sin(s.pol) * Math.sin(s.az),
      s.ty + s.rad * Math.cos(s.pol),
      s.tz + s.rad * Math.sin(s.pol) * Math.cos(s.az));
    camera.lookAt(s.tx, s.ty, s.tz);
  }
  applyCam();
  function goTo(n) { var v = VIEWS[n]; if (v) { for (var k in v) dst[k] = v[k]; } }

  /* ---------- interaction ---------- */
  var dragging = false, lx = 0, ly = 0, pinch = 0, autoAz = true;
  function down(x, y) { dragging = true; lx = x; ly = y; autoAz = false; }
  function move(x, y) { if (!dragging) return; dst.az -= (x - lx) * 0.006; dst.pol += (y - ly) * 0.005; dst.pol = Math.max(0.72, Math.min(1.6, dst.pol)); lx = x; ly = y; }
  canvas.addEventListener("mousedown", function (e) { down(e.clientX, e.clientY); });
  window.addEventListener("mousemove", function (e) { move(e.clientX, e.clientY); });
  window.addEventListener("mouseup", function () { dragging = false; });
  canvas.addEventListener("wheel", function (e) { e.preventDefault(); autoAz = false; dst.rad = Math.max(1.3, Math.min(9, dst.rad + e.deltaY * 0.006)); }, { passive: false });
  canvas.addEventListener("touchstart", function (e) { if (e.touches.length === 1) down(e.touches[0].clientX, e.touches[0].clientY); else if (e.touches.length === 2) { pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); autoAz = false; } }, { passive: true });
  canvas.addEventListener("touchmove", function (e) {
    if (e.touches.length === 1) move(e.touches[0].clientX, e.touches[0].clientY);
    else if (e.touches.length === 2) { var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); if (pinch) dst.rad = Math.max(1.3, Math.min(9, dst.rad - (d - pinch) * 0.02)); pinch = d; if (e.cancelable) e.preventDefault(); }
  }, { passive: false });
  canvas.addEventListener("touchend", function () { dragging = false; pinch = 0; });
  var buttons = host.querySelectorAll("[data-room]");
  Array.prototype.forEach.call(buttons, function (b) {
    b.addEventListener("click", function () { Array.prototype.forEach.call(buttons, function (o) { o.classList.remove("on"); }); b.classList.add("on"); goTo(b.getAttribute("data-room")); autoAz = false; });
  });

  /* ---------- loop ---------- */
  var raf = null, onScreen = true;
  function frame() {
    raf = requestAnimationFrame(frame);
    for (var k in dst) cur[k] += (dst[k] - cur[k]) * 0.08;
    if (!dragging && autoAz && !reduce) dst.az += 0.0011;
    applyCam(); renderer.render(scene, camera);
  }
  function start() { if (raf == null && onScreen && !document.hidden) frame(); }
  function stop() { if (raf != null) { cancelAnimationFrame(raf); raf = null; } }
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { es.forEach(function (e) { onScreen = e.isIntersecting; onScreen ? start() : stop(); }); }, { threshold: 0.01 }).observe(host);
  start();
  window.addEventListener("resize", function () { W = host.clientWidth; H = host.clientHeight || Math.round(W * 0.62); camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H, false); });
})();

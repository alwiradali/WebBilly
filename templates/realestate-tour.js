/* ============================================================
   Skyline Estates — 360° virtual house tour
   Stand INSIDE and look all the way around (drag) · zoom into any
   corner (scroll / pinch) · jump between Living / Kitchen / Bedroom.

   REAL PHOTOS: to use genuine 360° photos of a property, drop an
   equirectangular (2:1) image URL into PHOTO below for each room —
   that room instantly becomes a real photo-sphere. Leave null to use
   the built-in realistic 3D room. Example:
     var PHOTO = { living:"assets/pano-living.jpg", ... };

   Realistic 3D fallback: image-based lighting (RoomEnvironment), soft
   shadows, ACES tone mapping, procedural PBR wood / marble / fabric.
   Self-contained · fails safe.
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

  /* ---- real 360° photos go here (equirectangular 2:1). null = 3D room ---- */
  var PHOTO = { living: null, kitchen: null, bedroom: null };

  var renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false }); }
  catch (e) { host.style.display = "none"; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.6 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  var W = host.clientWidth, H = host.clientHeight || Math.round(W * 0.62);
  renderer.setSize(W, H, false);

  var scene = new THREE.Scene();
  scene.background = new THREE.Color("#0d0f13");
  var room = new THREE.Group(); scene.add(room);              // 3D furniture group (hidden in photo mode)

  var camera = new THREE.PerspectiveCamera(74, W / H, 0.05, 120);

  /* ---------- lighting ---------- */
  try { var pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; } catch (e) {}
  var sun = new THREE.DirectionalLight("#fff1d8", mobile ? 1.3 : 2.4);
  sun.position.set(-3, 8.5, 7);
  if (!mobile) { sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); var sc = sun.shadow.camera; sc.near = 1; sc.far = 42; sc.left = -13; sc.right = 13; sc.top = 12; sc.bottom = -12; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; }
  scene.add(sun);
  scene.add(new THREE.PointLight("#ffcf94", 12, 22, 2).translateX ? (function () { var l = new THREE.PointLight("#ffcf94", 12, 22, 2); l.position.set(1.5, 3.2, 1.8); return l; })() : new THREE.Object3D());

  /* ---------- procedural PBR textures ---------- */
  function cvs(s) { var c = document.createElement("canvas"); c.width = c.height = s; return c; }
  function tex(c, rx, ry) { var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx || 1, ry || 1); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function woodTex() {
    var c = cvs(512), g = c.getContext("2d"), ph = 74;
    for (var y = -ph; y < 512; y += ph) {
      g.fillStyle = "hsl(" + rnd(24, 32) + "," + rnd(34, 46) + "%," + rnd(26, 36) + "%)"; g.fillRect(0, y, 512, ph - 2);
      for (var i = 0; i < 48; i++) { g.strokeStyle = "rgba(30,18,8," + rnd(0.03, 0.10).toFixed(3) + ")"; g.lineWidth = rnd(0.6, 1.6); var yy = y + Math.random() * ph; g.beginPath(); g.moveTo(0, yy); g.bezierCurveTo(170, yy + rnd(-4, 4), 340, yy + rnd(-4, 4), 512, yy + rnd(-3, 3)); g.stroke(); }
      g.fillStyle = "rgba(15,9,4,0.55)"; g.fillRect(0, y + ph - 2, 512, 2);
    } return c;
  }
  function marbleTex() {
    var c = cvs(512), g = c.getContext("2d"); g.fillStyle = "#eceae4"; g.fillRect(0, 0, 512, 512);
    for (var i = 0; i < 22; i++) { g.strokeStyle = "rgba(120,124,130," + rnd(0.05, 0.18).toFixed(3) + ")"; g.lineWidth = rnd(0.6, 2.4); g.beginPath(); var x = rnd(-40, 512), y = rnd(-40, 40); g.moveTo(x, y); for (var s = 0; s < 6; s++) { x += rnd(40, 110); y += rnd(30, 120); g.lineTo(x + rnd(-30, 30), y); } g.stroke(); } return c;
  }
  function fabricTex(base) {
    var c = cvs(256), g = c.getContext("2d"); g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    for (var i = 0; i < 9000; i++) { g.fillStyle = "rgba(255,255,255," + rnd(0.01, 0.05).toFixed(3) + ")"; g.fillRect(Math.random() * 256, Math.random() * 256, 1, 1); }
    for (var j = 0; j < 9000; j++) { g.fillStyle = "rgba(0,0,0," + rnd(0.01, 0.05).toFixed(3) + ")"; g.fillRect(Math.random() * 256, Math.random() * 256, 1, 1); } return c;
  }
  var woodMap = tex(woodTex(), 4, 3), marbleMap = tex(marbleTex(), 1, 1);
  function pbr(o) { return new THREE.MeshStandardMaterial(o); }
  var M = {
    floor: pbr({ map: woodMap, roughness: 0.5 }), wall: pbr({ color: "#efe9df", roughness: 0.97 }), ceil: pbr({ color: "#f6f2ec", roughness: 1 }),
    marble: pbr({ map: marbleMap, roughness: 0.22, metalness: 0.02 }), cab: pbr({ color: "#2f3d38", roughness: 0.5, metalness: 0.15 }),
    sofa: pbr({ map: tex(fabricTex("#8d7c67")), roughness: 0.95 }), cushion: pbr({ map: tex(fabricTex("#d9cdb8")), roughness: 0.95 }),
    woodDark: pbr({ color: "#4a3a2c", roughness: 0.55 }), metal: pbr({ color: "#c9cdd2", roughness: 0.32, metalness: 0.9 }), brass: pbr({ color: "#c99a4b", roughness: 0.34, metalness: 0.85 }),
    bed: pbr({ map: tex(fabricTex("#efe7d8")), roughness: 0.95 }), throwm: pbr({ map: tex(fabricTex("#c98b6b")), roughness: 0.95 }), dark: pbr({ color: "#1b1c20", roughness: 0.5 }),
    rug: pbr({ map: tex(fabricTex("#c8b6a0")), roughness: 1 }), plant: pbr({ color: "#4f7a44", roughness: 0.8 }), terra: pbr({ color: "#b5643c", roughness: 0.7 })
  };
  function box(w, h, d, m, x, y, z, cast) { var me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); me.castShadow = cast !== false; me.receiveShadow = true; room.add(me); return me; }
  function cyl(rt, rb, h, m, x, y, z, seg) { var me = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 24), m); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; room.add(me); return me; }

  /* ---------- shell + furniture ---------- */
  box(13, 0.2, 10, M.floor, 0, -0.1, 0, false);
  box(0.2, 4.2, 10, M.wall, -6.4, 2.0, 0, false); box(13, 4.2, 0.2, M.wall, 0, 2.0, -4.9, false);
  box(13, 4.2, 0.2, M.wall, 0, 2.0, 4.9, false); box(0.2, 4.2, 10, M.wall, 6.4, 2.0, 0, false);   // near walls (so photo-sphere feels enclosed)
  box(13, 0.2, 10, M.ceil, 0, 4.1, 0, false);
  var sky = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.6), new THREE.MeshBasicMaterial({ color: "#dcefff" })); sky.position.set(2.4, 2.1, -4.78); room.add(sky);
  box(4.9, 0.14, 0.14, M.wall, 2.4, 3.42, -4.73, false); box(4.9, 0.14, 0.14, M.wall, 2.4, 0.8, -4.73, false); box(0.12, 2.7, 0.12, M.wall, 2.4, 2.1, -4.71, false);
  box(0.12, 2.7, 0.12, M.wall, 0.3, 2.1, -4.71, false); box(0.12, 2.7, 0.12, M.wall, 4.5, 2.1, -4.71, false);
  box(5.4, 0.04, 3.6, M.rug, -1.6, 0.02, 1.0, false);
  // living
  box(3.6, 0.5, 1.3, M.sofa, -2.0, 0.42, 0.2); box(3.6, 0.66, 0.32, M.sofa, -2.0, 0.86, -0.35);
  box(0.34, 0.6, 1.3, M.sofa, -3.72, 0.6, 0.2); box(0.34, 0.6, 1.3, M.sofa, -0.28, 0.6, 0.2); box(1.3, 0.5, 1.7, M.sofa, -0.55, 0.42, 1.5);
  box(0.86, 0.24, 0.9, M.cushion, -2.35, 0.7, 0.28); box(0.86, 0.24, 0.9, M.cushion, -1.4, 0.7, 0.28); box(0.7, 0.22, 0.7, M.cushion, -0.55, 0.7, 1.5);
  box(1.5, 0.1, 0.85, M.woodDark, -1.6, 0.5, 1.55);
  box(0.09, 0.4, 0.09, M.metal, -2.25, 0.25, 1.2); box(0.09, 0.4, 0.09, M.metal, -0.95, 0.25, 1.2); box(0.09, 0.4, 0.09, M.metal, -2.25, 0.25, 1.9); box(0.09, 0.4, 0.09, M.metal, -0.95, 0.25, 1.9);
  cyl(0.11, 0.15, 0.22, M.terra, -1.6, 0.66, 1.55);
  box(0.28, 0.7, 3.0, M.dark, -6.05, 0.35, -1.4);
  var tv = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.45), pbr({ color: "#07080c", roughness: 0.15, metalness: 0.3 })); tv.rotation.y = Math.PI / 2; tv.position.set(-6.2, 2.0, -1.4); room.add(tv);
  cyl(0.03, 0.03, 2.0, M.metal, -4.4, 1.0, -0.6); cyl(0.3, 0.36, 0.42, M.cushion, -4.4, 2.12, -0.6);
  // kitchen
  box(0.7, 1.0, 6.0, M.cab, 5.7, 0.5, -1.0); box(0.78, 0.1, 6.1, M.marble, 5.7, 1.06, -1.0, false); box(0.55, 0.95, 3.2, M.cab, 5.75, 3.0, -2.4);
  box(2.4, 1.0, 1.2, M.cab, 2.6, 0.5, 2.6); box(2.62, 0.1, 1.42, M.marble, 2.6, 1.06, 2.6, false);
  var sx = [1.7, 2.6, 3.5]; for (var q = 0; q < 3; q++) { cyl(0.22, 0.2, 0.1, M.brass, sx[q], 0.8, 3.5); cyl(0.035, 0.035, 0.78, M.metal, sx[q], 0.4, 3.5); }
  cyl(0.16, 0.1, 0.24, M.dark, 2.1, 2.55, 2.6); cyl(0.16, 0.1, 0.24, M.dark, 3.1, 2.55, 2.6);
  scene.add((function () { var l = new THREE.PointLight("#ffd9a0", 6, 9, 2); l.position.set(2.6, 2.3, 2.6); return l; })());
  // bedroom
  box(3.0, 0.45, 2.4, M.woodDark, -4.3, 0.26, -3.3); box(2.9, 0.34, 2.2, M.bed, -4.3, 0.6, -3.3); box(3.0, 1.05, 0.18, M.bed, -4.3, 0.72, -4.45);
  box(1.05, 0.26, 0.58, M.cushion, -3.75, 0.88, -4.0); box(1.05, 0.26, 0.58, M.cushion, -4.85, 0.88, -4.0); box(2.2, 0.14, 1.3, M.throwm, -4.3, 0.76, -2.75);
  box(0.6, 0.5, 0.5, M.woodDark, -2.4, 0.25, -4.1); cyl(0.14, 0.2, 0.3, M.cushion, -2.4, 0.62, -4.1);
  // greenery + art
  cyl(0.28, 0.22, 0.5, M.terra, 4.7, 0.25, 3.8);
  var f1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), M.plant); f1.position.set(4.7, 0.98, 3.8); f1.castShadow = true; room.add(f1);
  var f2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 1), M.plant); f2.position.set(4.7, 1.42, 3.8); f2.castShadow = true; room.add(f2);
  function art(x, c) { var a = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.5), pbr({ color: c, roughness: 0.6 })); a.position.set(x, 2.35, -4.76); room.add(a); box(1.22, 1.62, 0.05, M.dark, x, 2.35, -4.8, false); }
  art(-3.4, "#c2905f"); art(-1.85, "#7d93a8");

  /* ---------- photo-sphere (used when a real 360° photo is provided) ---------- */
  var sphere = null, loader = new THREE.TextureLoader();
  function ensureSphere() {
    if (sphere) return sphere;
    var g = new THREE.SphereGeometry(30, 60, 40); g.scale(-1, 1, 1);   // view from inside
    sphere = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: "#1a1e26" }));
    sphere.visible = false; scene.add(sphere); return sphere;
  }

  /* ---------- first-person look-around ---------- */
  // standing spot inside the room + initial look for each viewpoint
  var SPOT = {
    living: { px: 0.6, py: 1.58, pz: 3.4, yaw: -0.32, pitch: -0.02 },
    kitchen: { px: 3.4, py: 1.62, pz: 4.3, yaw: -0.24, pitch: -0.05 },
    bedroom: { px: -1.9, py: 1.6, pz: -1.2, yaw: -0.86, pitch: -0.06 }
  };
  var cur = { px: 0.6, py: 1.55, pz: 3.4, yaw: -0.32, pitch: -0.04, fov: 74 };
  var dst = Object.assign({}, cur);
  var photoMode = false;

  function applyCam() {
    if (photoMode) camera.position.set(0, 1.6, 0);
    else camera.position.set(cur.px, cur.py, cur.pz);
    var cp = Math.cos(cur.pitch);
    camera.lookAt(
      camera.position.x + Math.sin(cur.yaw) * cp,
      camera.position.y + Math.sin(cur.pitch),
      camera.position.z - Math.cos(cur.yaw) * cp);
    if (Math.abs(camera.fov - cur.fov) > 0.01) { camera.fov = cur.fov; camera.updateProjectionMatrix(); }
  }
  applyCam();

  function goTo(name) {
    var s = SPOT[name]; if (!s) return;
    dst.yaw = s.yaw; dst.pitch = s.pitch; dst.fov = 74;
    if (PHOTO[name]) {
      // real 360° photo → show sphere
      ensureSphere(); photoMode = true; room.visible = false; sphere.visible = true;
      loader.load(PHOTO[name], function (t) { t.colorSpace = THREE.SRGBColorSpace; sphere.material.map = t; sphere.material.color.set("#ffffff"); sphere.material.needsUpdate = true; });
    } else {
      photoMode = false; room.visible = true; if (sphere) sphere.visible = false;
      dst.px = s.px; dst.py = s.py; dst.pz = s.pz;
    }
  }
  goTo("living");
  for (var k in cur) cur[k] = dst[k];   // snap to first view

  /* ---------- interaction: drag look + wheel/pinch zoom (FOV) ---------- */
  var dragging = false, lx = 0, ly = 0, pinch = 0, autoYaw = true;
  function down(x, y) { dragging = true; lx = x; ly = y; autoYaw = false; }
  function move(x, y) { if (!dragging) return; dst.yaw -= (x - lx) * 0.0042; dst.pitch -= (y - ly) * 0.0042; dst.pitch = Math.max(-1.15, Math.min(1.15, dst.pitch)); lx = x; ly = y; }
  canvas.addEventListener("mousedown", function (e) { down(e.clientX, e.clientY); });
  window.addEventListener("mousemove", function (e) { move(e.clientX, e.clientY); });
  window.addEventListener("mouseup", function () { dragging = false; });
  canvas.addEventListener("wheel", function (e) { e.preventDefault(); autoYaw = false; dst.fov = Math.max(32, Math.min(88, dst.fov + e.deltaY * 0.03)); }, { passive: false });
  canvas.addEventListener("touchstart", function (e) { if (e.touches.length === 1) down(e.touches[0].clientX, e.touches[0].clientY); else if (e.touches.length === 2) { pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); autoYaw = false; } }, { passive: true });
  canvas.addEventListener("touchmove", function (e) {
    if (e.touches.length === 1) move(e.touches[0].clientX, e.touches[0].clientY);
    else if (e.touches.length === 2) { var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); if (pinch) dst.fov = Math.max(32, Math.min(88, dst.fov + (pinch - d) * 0.12)); pinch = d; if (e.cancelable) e.preventDefault(); }
  }, { passive: false });
  canvas.addEventListener("touchend", function () { dragging = false; pinch = 0; });
  var buttons = host.querySelectorAll("[data-room]");
  Array.prototype.forEach.call(buttons, function (b) { b.addEventListener("click", function () { Array.prototype.forEach.call(buttons, function (o) { o.classList.remove("on"); }); b.classList.add("on"); goTo(b.getAttribute("data-room")); autoYaw = false; }); });

  /* ---------- loop ---------- */
  var raf = null, onScreen = true;
  function frame() {
    raf = requestAnimationFrame(frame);
    for (var k in dst) cur[k] += (dst[k] - cur[k]) * 0.09;
    if (!dragging && autoYaw && !reduce) dst.yaw += 0.0009;   // slow idle pan
    applyCam(); renderer.render(scene, camera);
  }
  function start() { if (raf == null && onScreen && !document.hidden) frame(); }
  function stop() { if (raf != null) { cancelAnimationFrame(raf); raf = null; } }
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { es.forEach(function (e) { onScreen = e.isIntersecting; onScreen ? start() : stop(); }); }, { threshold: 0.01 }).observe(host);
  start();
  window.addEventListener("resize", function () { W = host.clientWidth; H = host.clientHeight || Math.round(W * 0.62); camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H, false); });
})();

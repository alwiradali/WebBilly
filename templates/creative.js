/* ============================================================
   AETHER — Creative Studio
   Bespoke WebGL hero: a polished black-crystal gem that turns
   slowly with crisp studio reflections, an iridescent edge sheen,
   a soft violet core and a ring of shards that breathe outward.
   Opaque glossy material (no transmission) so it stays buttery
   smooth even on integrated graphics. Original work.
   ============================================================ */
import * as THREE from "three";
import { EffectComposer } from "./vendor/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./vendor/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./vendor/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "./vendor/jsm/postprocessing/OutputPass.js";

(function () {
  "use strict";
  var canvas = document.getElementById("gem");
  if (!canvas) return;
  var stage = canvas.parentElement;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var W = stage.clientWidth, H = stage.clientHeight;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(W, H);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(36, W / H, 0.1, 100);
  camera.position.set(0, 0, 9.4);

  // ---- Studio environment (soft bright bars → crisp reflections) ----
  function makeEnv() {
    var c = document.createElement("canvas"); c.width = 1024; c.height = 512;
    var x = c.getContext("2d");
    var g = x.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, "#10101e"); g.addColorStop(0.5, "#06060d"); g.addColorStop(1, "#000000");
    x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
    function bar(cx, w, a, col) {
      var bg = x.createLinearGradient(cx - w, 0, cx + w, 0);
      bg.addColorStop(0, "rgba(0,0,0,0)"); bg.addColorStop(0.5, col); bg.addColorStop(1, "rgba(0,0,0,0)");
      x.globalAlpha = a; x.fillStyle = bg; x.fillRect(cx - w, 40, 2 * w, 432);
    }
    bar(210, 55, 0.95, "rgba(255,255,255,1)");
    bar(500, 34, 0.7, "rgba(206,196,255,1)");
    bar(720, 70, 0.85, "rgba(150,175,255,1)");
    bar(900, 30, 0.6, "rgba(255,255,255,1)");
    x.globalAlpha = 1;
    var t = new THREE.CanvasTexture(c);
    t.mapping = THREE.EquirectangularReflectionMapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  var pmrem = new THREE.PMREMGenerator(renderer);
  var envRT = pmrem.fromEquirectangular(makeEnv());
  scene.environment = envRT.texture;

  var group = new THREE.Group();
  scene.add(group);

  // ---- Obsidian material (dark, glossy, iridescent edges) ----
  var glass = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#0a0a13"),
    metalness: 0.12,
    roughness: 0.02,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    iridescence: 1.0,
    iridescenceIOR: 1.45,
    iridescenceThicknessRange: [100, 640],
    envMapIntensity: 2.6,
    reflectivity: 1.0,
    flatShading: true
  });

  // ---- Core gem — a bold faceted crystal ----
  var gem = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 1), glass);
  group.add(gem);

  // ---- Inner violet glow (drives bloom) ----
  var coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#8b6dff"), transparent: true, opacity: 0.85 });
  var core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), coreMat);
  group.add(core);

  // ---- Ring of orbiting shards (the "bloom") ----
  var shards = [];
  var SHARD_N = 9;
  var shardGeo = new THREE.OctahedronGeometry(0.34, 0);
  for (var i = 0; i < SHARD_N; i++) {
    var m = new THREE.Mesh(shardGeo, glass);
    var a = (i / SHARD_N) * Math.PI * 2;
    var tilt = (i % 2 ? 1 : -1) * 0.5;
    m.userData = { a: a, tilt: tilt, base: 2.5, phase: (i / SHARD_N) * Math.PI * 2, rx: 0.3 + (i % 3) * 0.12, ry: 0.4 + (i % 4) * 0.1 };
    m.scale.setScalar(0.6 + (i % 3) * 0.12);
    group.add(m);
    shards.push(m);
  }

  // ---- Dust particles (depth) ----
  var pGeo = new THREE.BufferGeometry();
  var PCOUNT = 130, pos = new Float32Array(PCOUNT * 3);
  for (var p = 0; p < PCOUNT; p++) {
    var rr = 4 + (p % 7);
    var th = p * 2.399963, ph = (p % 11) / 11 * Math.PI;
    pos[p * 3] = Math.cos(th) * rr * Math.sin(ph);
    pos[p * 3 + 1] = (((p * 53) % 100) / 100 - 0.5) * 10;
    pos[p * 3 + 2] = Math.sin(th) * rr * Math.sin(ph) - 2;
  }
  pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  var particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x9a8cff, size: 0.03, transparent: true, opacity: 0.5, depthWrite: false }));
  scene.add(particles);

  // ---- Lights ----
  var key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(5, 6, 7); scene.add(key);
  var rim = new THREE.DirectionalLight(0x8b5cf6, 2.6); rim.position.set(-6, -1, -4); scene.add(rim);
  var fill = new THREE.PointLight(0x6d4bff, 1.2, 30); fill.position.set(-3, 3, 5); scene.add(fill);

  // ---- Post: subtle bloom ----
  var composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  var bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.55, 0.6, 0.85);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---- Interaction ----
  var mx = 0, my = 0, tmx = 0, tmy = 0;
  window.addEventListener("pointermove", function (e) {
    var rect = stage.getBoundingClientRect();
    tmx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    tmy = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  }, { passive: true });

  function resize() {
    W = stage.clientWidth; H = stage.clientHeight;
    camera.aspect = W / H; camera.updateProjectionMatrix();
    renderer.setSize(W, H); composer.setSize(W, H); bloom.setSize(W, H);
  }
  window.addEventListener("resize", resize);

  // ---- Single-instance loop (no double-run jank) ----
  var t = 0, last = 0, rafId = null;
  function start() { if (rafId == null) { last = performance.now(); rafId = requestAnimationFrame(frame); } }
  function stop() { if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; } }
  function frame(now) {
    rafId = requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    t += dt;

    mx += (tmx - mx) * 0.045; my += (tmy - my) * 0.045;

    group.rotation.y += dt * (reduce ? 0.05 : 0.16);
    group.rotation.x += (my * 0.28 - group.rotation.x) * 0.05;
    group.rotation.z += (mx * 0.06 - group.rotation.z) * 0.05;
    gem.rotation.y -= dt * 0.06;
    gem.rotation.x += dt * 0.03;

    var breathe = reduce ? 0.2 : (Math.sin(t * 0.5) * 0.5 + 0.5);
    for (var i = 0; i < shards.length; i++) {
      var sd = shards[i], u = sd.userData;
      var rad = u.base + breathe * 0.9 + Math.sin(t * 1.1 + u.phase) * 0.1;
      var ang = u.a + t * 0.1;
      sd.position.set(Math.cos(ang) * rad, u.tilt * rad * 0.5 + Math.sin(t * 0.8 + u.phase) * 0.2, Math.sin(ang) * rad);
      sd.rotation.x += dt * u.rx; sd.rotation.y += dt * u.ry;
    }
    var pulse = 1 + (reduce ? 0 : Math.sin(t * 1.3) * 0.1);
    core.scale.setScalar(pulse);
    coreMat.opacity = 0.55 + (reduce ? 0.15 : Math.sin(t * 1.3) * 0.2 + 0.2);

    particles.rotation.y += dt * 0.02;

    camera.position.x += (mx * 0.7 - camera.position.x) * 0.04;
    camera.position.y += (-my * 0.5 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);

    composer.render();
  }
  start();

  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { (e.isIntersecting && !document.hidden) ? start() : stop(); });
    }, { threshold: 0.01 }).observe(stage);
  }
})();

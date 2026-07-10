/* ============================================================
   AETHER — Creative Studio
   Bespoke WebGL hero: a dark refractive crystal that slowly
   rotates while a ring of shards blooms in and out, lit by an
   inner violet core and finished with an UnrealBloom glow.
   Original work — inspired by the premium "dark crystal" look,
   built from scratch on three.js.
   ============================================================ */
import * as THREE from "three";
import { RoomEnvironment } from "./vendor/jsm/environments/RoomEnvironment.js";
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
  renderer.toneMappingExposure = 1.05;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
  camera.position.set(0, 0, 9.4);

  // Environment — reflections + refraction source
  var pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  var group = new THREE.Group();
  scene.add(group);

  // ---- Core crystal (refractive glass gem) ----
  var gemGeo = new THREE.IcosahedronGeometry(1.12, 0);
  var gemMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#2a2140"),
    metalness: 0.0,
    roughness: 0.06,
    transmission: 1.0,
    thickness: 2.2,
    ior: 1.9,
    iridescence: 1.0,
    iridescenceIOR: 1.35,
    iridescenceThicknessRange: [120, 520],
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.05,
    attenuationColor: new THREE.Color("#7c3aed"),
    attenuationDistance: 2.4,
    transparent: true
  });
  var gem = new THREE.Mesh(gemGeo, gemMat);
  group.add(gem);

  // ---- Glowing inner core (drives the bloom) ----
  var coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#a78bfa"), transparent: true, opacity: 0.9 });
  var core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), coreMat);
  group.add(core);

  // ---- Faceted outer shell (catches edge light) ----
  var shellMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#12101c"), metalness: 0.3, roughness: 0.25,
    transmission: 0.6, thickness: 1.2, ior: 1.6, envMapIntensity: 1.2,
    clearcoat: 1, transparent: true, opacity: 0.55, side: THREE.BackSide
  });
  var shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 0), shellMat);
  group.add(shell);

  // ---- Orbiting shards (the "bloom") ----
  var shards = [];
  var SHARD_N = 22;
  var shardMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#171226"), metalness: 0.2, roughness: 0.12,
    transmission: 0.9, thickness: 1.0, ior: 1.75, iridescence: 0.8,
    iridescenceIOR: 1.3, clearcoat: 1, envMapIntensity: 1.0, transparent: true
  });
  var shardGeo = new THREE.TetrahedronGeometry(0.26, 0);
  for (var i = 0; i < SHARD_N; i++) {
    var m = new THREE.Mesh(shardGeo, shardMat);
    // even-ish distribution on a sphere (golden spiral)
    var y = 1 - (i / (SHARD_N - 1)) * 2;
    var r = Math.sqrt(Math.max(0, 1 - y * y));
    var phi = i * 2.399963229728653; // golden angle
    var dir = new THREE.Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r);
    var s = 0.6 + (i % 5) * 0.14;
    m.userData = {
      dir: dir,
      base: 1.72 + (i % 3) * 0.1,
      spin: new THREE.Vector3((Math.random ? 0 : 0), 0, 0), // filled below deterministically
      phase: (i / SHARD_N) * Math.PI * 2,
      rx: 0.3 + (i % 4) * 0.15,
      ry: 0.4 + (i % 3) * 0.2
    };
    m.scale.setScalar(s);
    group.add(m);
    shards.push(m);
  }

  // ---- Lights ----
  var key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(4, 5, 6); scene.add(key);
  var rim = new THREE.DirectionalLight(0x8b5cf6, 3.0); rim.position.set(-6, -2, -4); scene.add(rim);
  var fill = new THREE.PointLight(0x6d4bff, 1.4, 30); fill.position.set(-3, 3, 4); scene.add(fill);

  // ---- Post-processing (bloom) ----
  var composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  var bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.5, 0.6, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---- Interaction ----
  var mx = 0, my = 0, tmx = 0, tmy = 0;
  function onMove(e) {
    var p = e.touches ? e.touches[0] : e;
    var rect = stage.getBoundingClientRect();
    tmx = ((p.clientX - rect.left) / rect.width - 0.5) * 2;
    tmy = ((p.clientY - rect.top) / rect.height - 0.5) * 2;
  }
  window.addEventListener("pointermove", onMove, { passive: true });

  // ---- Resize ----
  function resize() {
    W = stage.clientWidth; H = stage.clientHeight;
    camera.aspect = W / H; camera.updateProjectionMatrix();
    renderer.setSize(W, H);
    composer.setSize(W, H);
    bloom.setSize(W, H);
  }
  window.addEventListener("resize", resize);

  // ---- Loop ----
  var t = 0, running = true, last = performance.now ? performance.now() : 0;
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    t += dt;

    // ease mouse
    mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;

    // core rotation
    group.rotation.y += dt * (reduce ? 0.04 : 0.14);
    group.rotation.x = my * 0.25;
    group.rotation.z = mx * 0.08;
    gem.rotation.y -= dt * 0.1;
    gem.rotation.x += dt * 0.05;
    shell.rotation.y += dt * 0.06;

    // bloom breathing of shards
    var breathe = reduce ? 0 : (Math.sin(t * 0.6) * 0.5 + 0.5); // 0..1
    for (var i = 0; i < shards.length; i++) {
      var sd = shards[i], u = sd.userData;
      var rad = u.base + breathe * 1.15 + Math.sin(t * 1.2 + u.phase) * 0.12;
      sd.position.copy(u.dir).multiplyScalar(rad);
      sd.rotation.x += dt * u.rx;
      sd.rotation.y += dt * u.ry;
      var op = 0.35 + breathe * 0.5;
      sd.material.opacity = op;
    }
    // core pulse
    var pulse = 1 + (reduce ? 0 : Math.sin(t * 1.4) * 0.12);
    core.scale.setScalar(pulse);
    coreMat.opacity = 0.6 + (reduce ? 0.2 : Math.sin(t * 1.4) * 0.25 + 0.2);

    // subtle camera drift
    camera.position.x += (mx * 0.6 - camera.position.x) * 0.04;
    camera.position.y += (-my * 0.4 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);

    composer.render();
  }
  requestAnimationFrame(frame);

  // pause when off-screen / tab hidden
  document.addEventListener("visibilitychange", function () {
    running = !document.hidden;
    if (running) { last = performance.now(); requestAnimationFrame(frame); }
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        running = e.isIntersecting && !document.hidden;
        if (running) { last = performance.now(); requestAnimationFrame(frame); }
      });
    }, { threshold: 0.01 }).observe(stage);
  }
})();

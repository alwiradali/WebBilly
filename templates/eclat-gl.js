/* ============================================================
   Éclat — WebGL hero centrepiece.
   A slow-turning ribbon of liquid gold (a polished torus knot)
   floating on light, lit by real studio IBL for believable
   reflections. Answers the cursor. Pauses offscreen / on a
   hidden tab; reduced-motion renders a single still frame.
   ============================================================ */
import * as THREE from "three";
import { RoomEnvironment } from "./vendor/jsm/environments/RoomEnvironment.js";

(function () {
  "use strict";
  var canvas = document.querySelector(".hero-gl");
  if (!canvas) return;

  var ok;
  try { ok = canvas.getContext("webgl2") || canvas.getContext("webgl"); }
  catch (e) { ok = null; }
  if (!ok) { canvas.classList.add("gl-off"); return; }

  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 6.2);

  var pmrem = new THREE.PMREMGenerator(renderer);
  var env = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pmrem.dispose();
  scene.environment = env;

  var key = new THREE.DirectionalLight(0xffffff, 2.0); key.position.set(4, 6, 5); scene.add(key);
  var warm = new THREE.PointLight(0xffd9a0, 40, 40, 2); warm.position.set(-5, 2, 4); scene.add(warm);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe8dfce, 0.5));

  var gold = new THREE.MeshPhysicalMaterial({
    color: 0xd9a441, metalness: 1.0, roughness: 0.16,
    clearcoat: 1.0, clearcoatRoughness: 0.12,
    envMapIntensity: 1.35
  });
  var knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.15, 0.36, 240, 32, 2, 3), gold);
  scene.add(knot);

  var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  var host = canvas.closest(".hero") || canvas;
  host.addEventListener("pointermove", function (e) {
    var r = canvas.getBoundingClientRect();
    pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    pointer.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
  });
  host.addEventListener("pointerleave", function () { pointer.tx = 0; pointer.ty = 0; });

  function resize() {
    var w = Math.max(canvas.clientWidth, 2), h = Math.max(canvas.clientHeight, 2);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  resize();
  var ro = ("ResizeObserver" in window) ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(canvas); else window.addEventListener("resize", resize);

  var running = false, rafId = null, onScreen = true, visible = true, last = 0;
  function frame(now) {
    rafId = requestAnimationFrame(frame);
    var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016; last = now;
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    knot.rotation.y += dt * 0.35 + pointer.x * dt * 1.4;
    knot.rotation.x += dt * 0.12;
    knot.rotation.z = pointer.y * 0.25;
    renderer.render(scene, camera);
  }
  function play() { if (running) return; running = true; last = 0; rafId = requestAnimationFrame(frame); }
  function pause() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = null; }
  function sync() { (onScreen && visible && !reduce) ? play() : pause(); }

  if (reduce) { renderer.render(scene, camera); }

  var io = new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; sync(); }, { threshold: 0.01 });
  io.observe(canvas);
  document.addEventListener("visibilitychange", function () { visible = document.visibilityState !== "hidden"; sync(); });
  sync();
})();

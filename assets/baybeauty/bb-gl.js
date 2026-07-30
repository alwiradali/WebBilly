/* ============================================================
   BAY BEAUTY — WebGL hero centrepiece.
   A slow-turning ribbon of liquid champagne-gold + pearl core
   floating in soft blush light, wrapped in drifting golden dust.
   • No video  → light blush scene + bloom (on-brand, premium)
   • Has video → transparent overlay (gold jewel + dust over reel)
   Answers the cursor · pauses offscreen / hidden tab ·
   reduced-motion renders one still, elegant frame.
   ============================================================ */
import * as THREE from "three";
import { RoomEnvironment } from "/templates/vendor/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "/templates/vendor/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "/templates/vendor/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "/templates/vendor/jsm/postprocessing/UnrealBloomPass.js";

(function () {
  "use strict";
  const canvas = document.querySelector(".hero-gl");
  if (!canvas) return;

  let gl;
  try { gl = canvas.getContext("webgl2") || canvas.getContext("webgl"); }
  catch (e) { gl = null; }
  if (!gl) { canvas.classList.add("gl-off"); return; }

  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = window.matchMedia && matchMedia("(max-width:880px)").matches;

  // is a real hero video present? (mirrors bb.js logic; avoids race)
  const src = document.querySelector(".hero-video source");
  const hasVideo = !!(src && src.getAttribute("src") && src.getAttribute("src").trim() && !/PUT-VIDEO-HERE/.test(src.getAttribute("src")));

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.3 : 1.6));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 7);

  // ---- soft blush backdrop (only when there's no video behind) ----
  if (!hasVideo) scene.background = gradientTex();
  function gradientTex() {
    const c = document.createElement("canvas"); c.width = 4; c.height = 512;
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, "#fdf7f1"); g.addColorStop(.45, "#f7e6da");
    g.addColorStop(.8, "#f1d5c6"); g.addColorStop(1, "#f5ddcf");
    x.fillStyle = g; x.fillRect(0, 0, 4, 512);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.03).texture;
  pmrem.dispose();

  // ---- lights (warm, feminine) ----
  const key = new THREE.DirectionalLight(0xfff2e2, 2.2); key.position.set(4, 5, 6); scene.add(key);
  const rose = new THREE.PointLight(0xffc4b2, 30, 40, 2); rose.position.set(-5, -1, 4); scene.add(rose);
  const gold = new THREE.PointLight(0xffcf8f, 26, 40, 2); gold.position.set(5, 3, 2); scene.add(gold);
  scene.add(new THREE.HemisphereLight(0xfff6ee, 0xf0d9c8, 0.55));

  const group = new THREE.Group(); scene.add(group);

  // ---- liquid gold ribbon (torus knot) ----
  const knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1.16, 0.3, 240, 40, 2, 3),
    new THREE.MeshPhysicalMaterial({
      color: 0xc99a6a, metalness: 1.0, roughness: 0.16,
      clearcoat: 1.0, clearcoatRoughness: 0.2, reflectivity: 1.0,
      iridescence: 0.3, iridescenceIOR: 1.3, sheen: 0.5, sheenColor: 0xffd9c0
    })
  );
  knot.rotation.set(0.5, 0.2, 0); group.add(knot);

  // ---- pearl core (soft blush glass) ----
  const pearl = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 64, 64),
    new THREE.MeshPhysicalMaterial({
      color: 0xfbeae0, metalness: 0.1, roughness: 0.06,
      transmission: 0.7, thickness: 1.1, ior: 1.4, iridescence: 0.6, clearcoat: 1
    })
  );
  group.add(pearl);

  // ---- golden dust ----
  const N = mobile ? 300 : 620;
  const pg = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), spd = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = 2.6 + Math.random() * 6.5, a = Math.random() * Math.PI * 2, y = (Math.random() - 0.5) * 12;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = y; pos[i * 3 + 2] = Math.sin(a) * r - 1;
    spd[i] = 0.2 + Math.random() * 0.7;
  }
  pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const sprite = makeDot();
  const dust = new THREE.Points(pg, new THREE.PointsMaterial({
    size: hasVideo ? 0.15 : 0.1, map: sprite, alphaMap: sprite, transparent: true,
    color: hasVideo ? 0xffe0b0 : 0xcaa06e,
    blending: hasVideo ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: false, opacity: hasVideo ? 0.9 : 0.62, sizeAttenuation: true
  }));
  scene.add(dust);
  function makeDot() {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.35, "rgba(255,222,186,.85)");
    g.addColorStop(1, "rgba(255,210,170,0)");
    x.fillStyle = g; x.beginPath(); x.arc(32, 32, 32, 0, 7); x.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  // ---- bloom (skipped over video so the reel stays visible) ----
  const useBloom = !hasVideo;
  let composer = null;
  if (useBloom) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.75, 0.85));
  }

  // ---- layout: push the jewel toward the right column ----
  function layout() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1, ar = w / h;
    if (ar < 0.9) { group.position.set(0, 0.4, 0); camera.position.z = 8.6; }      // stacked / mobile
    else { group.position.set(1.7, 0, 0); camera.position.z = 7; }                  // desktop → right side
  }

  function size() {
    const w = canvas.clientWidth || canvas.offsetWidth, h = canvas.clientHeight || canvas.offsetHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); if (composer) composer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix(); layout();
  }
  size(); addEventListener("resize", size);

  // ---- pointer parallax ----
  const tgt = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  addEventListener("pointermove", (e) => {
    tgt.x = (e.clientX / innerWidth - 0.5); tgt.y = (e.clientY / innerHeight - 0.5);
  }, { passive: true });

  // ---- visibility guards ----
  let visible = true, running = true;
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0.01 }).observe(canvas);
  document.addEventListener("visibilitychange", () => { running = !document.hidden; });

  const clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    if (!visible || !running) return;
    const t = clock.getElapsedTime();
    cur.x += (tgt.x - cur.x) * 0.05; cur.y += (tgt.y - cur.y) * 0.05;

    if (!reduce) {
      knot.rotation.y = t * 0.22; knot.rotation.x = 0.4 + Math.sin(t * 0.3) * 0.12;
      group.rotation.y = cur.x * 0.5; group.rotation.x = cur.y * 0.32;
      pearl.rotation.y = -t * 0.15;
      const p = dust.geometry.attributes.position.array;
      for (let i = 0; i < N; i++) { p[i * 3 + 1] += spd[i] * 0.006; if (p[i * 3 + 1] > 6) p[i * 3 + 1] = -6; }
      dust.geometry.attributes.position.needsUpdate = true;
      dust.rotation.y = t * 0.02;
    } else { knot.rotation.set(0.5, 0.7, 0); }

    const baseX = group.position.x;
    group.position.x = baseX + (cur.x * 0.25);
    if (composer) composer.render(); else renderer.render(scene, camera);
    group.position.x = baseX;
  }
  frame();
  canvas.classList.add("gl-on");
})();

/* ============================================================
   DIVINE RISING — the living sky.
   One fixed WebGL canvas behind the whole page:
   · aurora gradient sky (dawn cream → midnight) via fbm shader
   · a starfield that only wakes when the page scrolls into night
   · drifting gold incense motes
   · the brand sigil — triangle + crescent — floating in real 3D
     over the hero, lit by studio IBL, answering the cursor.
   Sections tagged [data-sky="night"] pull the sky into darkness
   as they enter the viewport; the chakra journey tints the
   aurora through window.DIVINE.hue. Pauses on hidden tabs;
   reduced-motion renders still frames on scroll only.
   ============================================================ */
import * as THREE from "three";
import { RoomEnvironment } from "./vendor/jsm/environments/RoomEnvironment.js";

(function () {
  "use strict";
  var canvas = document.querySelector(".gl-sky");
  if (!canvas) return;

  var gl;
  try { gl = canvas.getContext("webgl2") || canvas.getContext("webgl"); }
  catch (e) { gl = null; }
  if (!gl) { document.body.classList.add("no-gl"); canvas.style.display = "none"; return; }

  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobile = window.matchMedia && matchMedia("(max-width: 820px)").matches;
  var BRIDGE = (window.DIVINE = window.DIVINE || { hue: null });

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.3 : 1.8));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 7);

  /* ---------- aurora sky (fullscreen quad) ---------- */
  var sky = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      depthWrite: false, depthTest: false,
      uniforms: {
        uTime: { value: 0 },
        uNight: { value: 0 },
        uTint: { value: new THREE.Color("#8f7bd8") },
        uTintAmt: { value: 0 },
        uPointer: { value: new THREE.Vector2(0, 0) }
      },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }",
      fragmentShader: [
        "precision highp float;",
        "varying vec2 vUv;",
        "uniform float uTime, uNight, uTintAmt;",
        "uniform vec3 uTint;",
        "uniform vec2 uPointer;",
        "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
        "float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);",
        "  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }",
        "float fbm(vec2 p){ float v = 0.0, a = 0.5;",
        "  for(int k=0;k<4;k++){ v += a*noise(p); p = p*2.03 + 11.7; a *= 0.5; } return v; }",
        "void main(){",
        "  vec2 uv = vUv;",
        "  vec2 drift = uPointer * 0.03;",
        "  /* dawn palette */",
        "  vec3 dawnTop = vec3(0.968, 0.945, 0.894);",
        "  vec3 dawnBot = vec3(0.918, 0.862, 0.760);",
        "  /* midnight palette */",
        "  vec3 nightTop = vec3(0.030, 0.024, 0.075);",
        "  vec3 nightBot = vec3(0.075, 0.058, 0.145);",
        "  vec3 day = mix(dawnBot, dawnTop, uv.y);",
        "  vec3 night = mix(nightBot, nightTop, uv.y);",
        "  vec3 sky = mix(day, night, uNight);",
        "  /* aurora ribbons, warped by fbm, brighter at night */",
        "  float t = uTime * 0.03;",
        "  float w = fbm(uv * vec2(2.2, 3.4) + vec2(t, -t*0.6) + drift);",
        "  float band = sin((uv.y + w*0.45 - uv.x*0.28) * 6.28318) * 0.5 + 0.5;",
        "  band = pow(band, 3.0) * smoothstep(0.05, 0.55, w);",
        "  vec3 dayGlow = vec3(0.937, 0.788, 0.573);",
        "  vec3 nightGlow = mix(vec3(0.435, 0.365, 0.760), uTint, uTintAmt);",
        "  vec3 glow = mix(dayGlow, nightGlow, uNight);",
        "  float amt = mix(0.16, 0.34, uNight);",
        "  sky += glow * band * amt;",
        "  /* soft halo where the crescent moon lives */",
        "  float halo = 1.0 - distance(uv + drift, vec2(0.74, 0.68));",
        "  sky += mix(vec3(0.965, 0.878, 0.690), vec3(0.878, 0.827, 0.690), uNight) * pow(max(halo, 0.0), 5.0) * mix(0.32, 0.5, uNight);",
        "  /* vignette */",
        "  float v = smoothstep(1.25, 0.35, distance(uv, vec2(0.5, 0.45)));",
        "  sky *= mix(0.92, 1.0, v);",
        "  gl_FragColor = vec4(sky, 1.0);",
        "}"
      ].join("\n")
    })
  );
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  scene.add(sky);

  /* ---------- starfield (wakes with the night) ---------- */
  var starCount = mobile ? 650 : 1500;
  var starGeo = new THREE.BufferGeometry();
  var pos = new Float32Array(starCount * 3);
  var seed = new Float32Array(starCount);
  for (var i = 0; i < starCount; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 44;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 26;
    pos[i * 3 + 2] = -6 - Math.random() * 22;
    seed[i] = Math.random() * 6.28318;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  starGeo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  var starMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uNight: { value: 0 }, uPx: { value: 1 } },
    vertexShader: [
      "attribute float aSeed; varying float vTw;",
      "uniform float uTime, uPx;",
      "void main(){",
      "  vTw = 0.55 + 0.45 * sin(uTime * (0.4 + fract(aSeed) * 1.4) + aSeed * 7.0);",
      "  vec4 mv = modelViewMatrix * vec4(position, 1.0);",
      "  gl_PointSize = (1.4 + fract(aSeed * 3.7) * 2.4) * uPx * (10.0 / -mv.z) * 3.0;",
      "  gl_Position = projectionMatrix * mv;",
      "}"
    ].join("\n"),
    fragmentShader: [
      "precision mediump float; varying float vTw; uniform float uNight;",
      "void main(){",
      "  float d = distance(gl_PointCoord, vec2(0.5));",
      "  float a = smoothstep(0.5, 0.08, d) * vTw * uNight;",
      "  gl_FragColor = vec4(vec3(0.98, 0.94, 0.82), a);",
      "}"
    ].join("\n")
  });
  var stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  /* ---------- gold incense motes (always drifting) ---------- */
  var moteCount = mobile ? 40 : 90;
  var moteGeo = new THREE.BufferGeometry();
  var mpos = new Float32Array(moteCount * 3);
  var mseed = new Float32Array(moteCount);
  for (var m = 0; m < moteCount; m++) {
    mpos[m * 3] = (Math.random() - 0.5) * 14;
    mpos[m * 3 + 1] = (Math.random() - 0.5) * 9;
    mpos[m * 3 + 2] = -1 - Math.random() * 6;
    mseed[m] = Math.random() * 6.28318;
  }
  moteGeo.setAttribute("position", new THREE.BufferAttribute(mpos, 3));
  moteGeo.setAttribute("aSeed", new THREE.BufferAttribute(mseed, 1));
  var moteMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uNight: { value: 0 }, uPx: { value: 1 } },
    vertexShader: [
      "attribute float aSeed; varying float vA;",
      "uniform float uTime, uPx;",
      "void main(){",
      "  vec3 p = position;",
      "  p.y += sin(uTime * 0.12 + aSeed) * 0.9;",
      "  p.x += cos(uTime * 0.09 + aSeed * 2.0) * 0.7;",
      "  vA = 0.4 + 0.6 * fract(aSeed * 5.3);",
      "  vec4 mv = modelViewMatrix * vec4(p, 1.0);",
      "  gl_PointSize = (2.0 + fract(aSeed * 2.9) * 3.2) * uPx * (10.0 / -mv.z) * 2.2;",
      "  gl_Position = projectionMatrix * mv;",
      "}"
    ].join("\n"),
    fragmentShader: [
      "precision mediump float; varying float vA; uniform float uNight;",
      "void main(){",
      "  float d = distance(gl_PointCoord, vec2(0.5));",
      "  float a = smoothstep(0.5, 0.05, d) * vA * mix(0.28, 0.5, uNight);",
      "  gl_FragColor = vec4(mix(vec3(0.76, 0.60, 0.36), vec3(0.90, 0.80, 0.55), uNight), a);",
      "}"
    ].join("\n")
  });
  var motes = new THREE.Points(moteGeo, moteMat);
  scene.add(motes);

  /* ---------- the sigil — triangle + crescent, liquid gold ---------- */
  var pmrem = new THREE.PMREMGenerator(renderer);
  var env = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pmrem.dispose();
  scene.environment = env;

  var key = new THREE.DirectionalLight(0xfff3dd, 1.6); key.position.set(4, 6, 5); scene.add(key);
  var warm = new THREE.PointLight(0xffd9a0, 26, 40, 2); warm.position.set(-5, 2, 4); scene.add(warm);

  var goldMat = new THREE.MeshPhysicalMaterial({
    color: 0xd2a558, metalness: 1.0, roughness: 0.18,
    clearcoat: 1.0, clearcoatRoughness: 0.14,
    envMapIntensity: 1.25, transparent: true, opacity: 1
  });

  // thin outline triangle — matches the letterhead mark, not a solid slab
  function triangleRing () {
    var s = new THREE.Shape();
    s.moveTo(-1.18, 0.92); s.lineTo(1.18, 0.92); s.lineTo(0, -1.28); s.closePath();
    var hole = new THREE.Path();
    hole.moveTo(-1.04, 0.83); hole.lineTo(1.04, 0.83); hole.lineTo(0, -1.13); hole.closePath();
    s.holes.push(hole);
    return new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 8 });
  }
  var sigil = new THREE.Group();
  var tri = new THREE.Mesh(triangleRing(), goldMat);
  sigil.add(tri);
  // true crescent: a thin torus arc cupping the triangle's tip, rounded ends
  var ARC = Math.PI * 1.15;
  var moon = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 16, 72, ARC), goldMat);
  moon.rotation.z = -Math.PI / 2 - ARC / 2;
  moon.position.set(0, -0.9, 0);
  sigil.add(moon);
  [1, -1].forEach(function (side) {
    var cap = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), goldMat);
    cap.position.set(side * 0.603, -0.755, 0);
    sigil.add(cap);
  });
  sigil.scale.setScalar(mobile ? 0.5 : 1);
  scene.add(sigil);

  function placeSigil () {
    if (mobile) { sigil.position.set(0, 1.1, 0); sigil.scale.setScalar(0.5); goldMat.opacity = 0.5; }
    else { sigil.position.set(2.35, 0.25, 0); }
  }
  placeSigil();

  /* ---------- pointer ---------- */
  var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener("pointermove", function (e) {
    pointer.tx = (e.clientX / innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });

  /* ---------- night amount from [data-sky="night"] coverage ---------- */
  var nightZones = Array.prototype.slice.call(document.querySelectorAll('[data-sky="night"]'));
  var night = 0;
  function targetNight () {
    var vh = innerHeight, best = 0;
    for (var z = 0; z < nightZones.length; z++) {
      var r = nightZones[z].getBoundingClientRect();
      var overlap = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      if (overlap > 0) best = Math.max(best, Math.min(1, (overlap / vh) * 1.5));
    }
    return best;
  }

  /* ---------- chakra tint bridge ---------- */
  var tint = new THREE.Color("#8f7bd8");
  var tintTarget = new THREE.Color("#8f7bd8");
  var tintAmt = 0;

  /* ---------- resize ---------- */
  function resize () {
    var w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    var px = renderer.getPixelRatio();
    starMat.uniforms.uPx.value = px;
    moteMat.uniforms.uPx.value = px;
  }
  addEventListener("resize", function () { resize(); if (reduce) renderOnce(); });
  resize();

  /* ---------- frame ---------- */
  var clock = new THREE.Clock();
  var hidden = false;
  document.addEventListener("visibilitychange", function () {
    hidden = document.hidden;
    if (!hidden && !reduce) { clock.getDelta(); loop(); }
  });

  function frame (t) {
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    night += (targetNight() - night) * 0.07;
    var hue = BRIDGE.hue;
    if (hue) { tintTarget.set(hue); tintAmt += (1 - tintAmt) * 0.06; }
    else { tintAmt += (0 - tintAmt) * 0.06; }
    tint.lerp(tintTarget, 0.06);

    sky.material.uniforms.uTime.value = t;
    sky.material.uniforms.uNight.value = night;
    sky.material.uniforms.uTint.value.copy(tint);
    sky.material.uniforms.uTintAmt.value = tintAmt;
    sky.material.uniforms.uPointer.value.set(pointer.x, pointer.y);
    starMat.uniforms.uTime.value = t;
    starMat.uniforms.uNight.value = night;
    moteMat.uniforms.uTime.value = t;
    moteMat.uniforms.uNight.value = night;

    // sigil floats over the hero, bows out as you scroll past it
    var heroP = Math.min(1, Math.max(0, scrollY / (innerHeight * 0.85)));
    sigil.visible = heroP < 1;
    if (sigil.visible) {
      var base = mobile ? 0.5 : 1;
      sigil.scale.setScalar(base * (1 - heroP * 0.25));
      sigil.position.y = (mobile ? 1.1 : 0.25) + Math.sin(t * 0.6) * 0.08 + heroP * 2.4;
      sigil.rotation.y = Math.sin(t * 0.22) * 0.5 + pointer.x * 0.35;
      sigil.rotation.x = Math.cos(t * 0.19) * 0.16 + pointer.y * 0.22;
      goldMat.opacity = (mobile ? 0.5 : 1) * (1 - heroP);
    }

    camera.position.x = pointer.x * 0.25;
    camera.position.y = -pointer.y * 0.18;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }

  function loop () {
    if (hidden || reduce) return;
    frame(clock.getElapsedTime());
    requestAnimationFrame(loop);
  }

  /* reduced motion: still frames, updated on scroll only */
  var onceQueued = false;
  function renderOnce () {
    if (onceQueued) return;
    onceQueued = true;
    requestAnimationFrame(function () {
      onceQueued = false;
      night = targetNight();
      tintAmt = BRIDGE.hue ? 1 : 0;
      if (BRIDGE.hue) { tintTarget.set(BRIDGE.hue); tint.copy(tintTarget); }
      frame(12);
    });
  }

  if (reduce) {
    addEventListener("scroll", renderOnce, { passive: true });
    renderOnce();
  } else {
    loop();
  }
})();

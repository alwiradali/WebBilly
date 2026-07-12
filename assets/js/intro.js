/* ============================================================
   Billy Digitals — Cinematic intro (a real scene)
   Letterbox opens · particles rush out of deep space and form
   "BILLY DIGITALS" as the camera pushes in · a title-card tagline
   fades up · on first scroll the camera flies THROUGH the wordmark
   as it bursts, a light flash hits, the bars open and the homepage
   is revealed. Atmospheric dust + bloom (desktop). Plays once per
   visit; Skip button; reduced-motion & failure safe.
   ============================================================ */
import * as THREE from "three";
import { EffectComposer } from "../../templates/vendor/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "../../templates/vendor/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "../../templates/vendor/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "../../templates/vendor/jsm/postprocessing/OutputPass.js";

(function () {
  "use strict";
  var overlay = document.getElementById("intro");
  var canvas = document.getElementById("introGL");
  if (!overlay || !canvas) return;

  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobile = window.matchMedia && matchMedia("(max-width: 720px)").matches;
  var seen = false;
  try { seen = sessionStorage.getItem("bdIntroSeen") === "1"; } catch (e) {}

  document.body.classList.add("page-ready");

  function signalDone() { try { document.dispatchEvent(new CustomEvent("bd:introdone")); } catch (e) {} }
  function finishInstant() {
    document.body.classList.remove("intro-lock");
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    signalDone();
  }
  if (reduce || seen) { finishInstant(); return; }

  var renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: true, powerPreference: "high-performance" }); }
  catch (e) { finishInstant(); return; }

  try { sessionStorage.setItem("bdIntroSeen", "1"); } catch (e) {}
  document.body.classList.add("intro-lock");

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.4 : 1.8));
  var W = window.innerWidth, H = window.innerHeight;
  renderer.setSize(W, H);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 120);
  camera.position.set(0, 0, 24);          // start wide/far — we'll push in

  /* ---------- wordmark points ---------- */
  function sampleText() {
    var c = document.createElement("canvas");
    var cw = 1600, ch = 560; c.width = cw; c.height = ch;
    var x = c.getContext("2d");
    x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle";
    x.font = "700 210px 'Space Grotesk', 'Arial Black', sans-serif";
    x.fillText("BILLY", cw / 2, ch * 0.31);
    x.font = "700 158px 'Space Grotesk', 'Arial Black', sans-serif";
    x.fillText("DIGITALS", cw / 2, ch * 0.73);
    var data = x.getImageData(0, 0, cw, ch).data;
    var pts = [], minX = cw, maxX = 0, minY = ch, maxY = 0, step = 4;
    for (var py = 0; py < ch; py += step) for (var px = 0; px < cw; px += step) {
      if (data[(py * cw + px) * 4 + 3] > 130) {
        pts.push([px, py]);
        if (px < minX) minX = px; if (px > maxX) maxX = px;
        if (py < minY) minY = py; if (py > maxY) maxY = py;
      }
    }
    return { pts: pts, bw: (maxX - minX) || cw, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
  }
  var s = sampleText();
  var N = s.pts.length;
  if (N < 200) { renderer.dispose(); finishInstant(); return; }

  // Size to fit at the closest point of the camera drift (z≈12.5) so the
  // title never clips the screen edges while it's held.
  var halfH = 12.5 * Math.tan(55 * Math.PI / 360);
  var visW = 2 * halfH * (W / H);
  var span = Math.min(visW * 0.86, 22);
  var scale = span / s.bw;
  var target = new Float32Array(N * 3), start = new Float32Array(N * 3),
      cur = new Float32Array(N * 3), vel = new Float32Array(N * 3), col = new Float32Array(N * 3);
  var C1 = new THREE.Color("#3b8bff"), C2 = new THREE.Color("#39e0ff"), C3 = new THREE.Color("#9b7cff");
  for (var i = 0; i < N; i++) {
    var px = s.pts[i][0], py = s.pts[i][1];
    var tx = (px - s.cx) * scale, ty = -(py - s.cy) * scale, tz = (Math.random() - 0.5) * 0.7;
    target[i * 3] = tx; target[i * 3 + 1] = ty; target[i * 3 + 2] = tz;
    // rush in from deep space (mostly from behind/around, biased far in −z)
    var r = 20 + Math.random() * 26, th = Math.random() * 6.2832, ph = Math.acos(2 * Math.random() - 1);
    start[i * 3] = Math.sin(ph) * Math.cos(th) * r;
    start[i * 3 + 1] = Math.sin(ph) * Math.sin(th) * r * 0.7;
    start[i * 3 + 2] = -18 - Math.random() * 30;
    cur[i * 3] = start[i * 3]; cur[i * 3 + 1] = start[i * 3 + 1]; cur[i * 3 + 2] = start[i * 3 + 2];
    var m = (tx / span) + 0.5;
    var cc = m < 0.5 ? C1.clone().lerp(C2, Math.max(0, m) * 2) : C2.clone().lerp(C3, (m - 0.5) * 2);
    col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
  }
  var geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(cur, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  var uniforms = { uSize: { value: mobile ? 40 : 46 }, uPix: { value: renderer.getPixelRatio() }, uFade: { value: 1 } };
  var mat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: [
      "uniform float uSize; uniform float uPix; attribute vec3 color; varying vec3 vC;",
      "void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.0);",
      "gl_PointSize=uSize*uPix*(1.0/-mv.z); gl_Position=projectionMatrix*mv; }"
    ].join("\n"),
    fragmentShader: [
      "precision highp float; uniform float uFade; varying vec3 vC;",
      "void main(){ vec2 uv=gl_PointCoord-0.5; float d=length(uv); float a=smoothstep(0.5,0.04,d);",
      "if(a<=0.001) discard; vec3 col=vC*1.3 + smoothstep(0.42,0.0,d)*0.4; gl_FragColor=vec4(col, a*uFade); }"
    ].join("\n"),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false
  });
  var points = new THREE.Points(geo, mat);
  scene.add(points);

  /* ---------- atmospheric dust (depth + parallax) ---------- */
  var DN = mobile ? 220 : 520;
  var dpos = new Float32Array(DN * 3), dcol = new Float32Array(DN * 3);
  var DA = new THREE.Color("#3b6bff"), DB = new THREE.Color("#22d3ee");
  for (var d2 = 0; d2 < DN; d2++) {
    dpos[d2 * 3] = (Math.random() - 0.5) * 46;
    dpos[d2 * 3 + 1] = (Math.random() - 0.5) * 30;
    dpos[d2 * 3 + 2] = -Math.random() * 42 - 2;
    var dc = DA.clone().lerp(DB, Math.random());
    dcol[d2 * 3] = dc.r; dcol[d2 * 3 + 1] = dc.g; dcol[d2 * 3 + 2] = dc.b;
  }
  var dgeo = new THREE.BufferGeometry();
  dgeo.setAttribute("position", new THREE.BufferAttribute(dpos, 3));
  dgeo.setAttribute("color", new THREE.BufferAttribute(dcol, 3));
  var dmat = new THREE.ShaderMaterial({
    uniforms: { uPix: { value: renderer.getPixelRatio() } },
    vertexShader: [
      "uniform float uPix; attribute vec3 color; varying vec3 vC; varying float vZ;",
      "void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.0); vZ=-mv.z;",
      "gl_PointSize=(mv.z<-0.1? (70.0*uPix/ -mv.z):0.0); gl_Position=projectionMatrix*mv; }"
    ].join("\n"),
    fragmentShader: [
      "precision highp float; varying vec3 vC; varying float vZ;",
      "void main(){ vec2 uv=gl_PointCoord-0.5; float d=length(uv); float a=smoothstep(0.5,0.0,d);",
      "a*=clamp(1.0-(vZ-6.0)/40.0,0.05,0.6); gl_FragColor=vec4(vC, a); }"
    ].join("\n"),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false
  });
  var dust = new THREE.Points(dgeo, dmat);
  scene.add(dust);

  /* ---------- bloom (desktop) ---------- */
  var composer = null, bloom = null;
  if (!mobile) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.7, 0.7, 0.15);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }
  function render() { if (composer) composer.render(); else renderer.render(scene, camera); }

  /* ---------- DOM cinema layers ---------- */
  var cue = overlay.querySelector(".intro-cue");
  var tag = overlay.querySelector(".intro-tag");
  var skip = overlay.querySelector(".intro-skip");
  requestAnimationFrame(function () { overlay.classList.add("cinema"); }); // bars slide in

  var mxr = 0, myr = 0;
  window.addEventListener("pointermove", function (e) { mxr = (e.clientX / window.innerWidth - 0.5); myr = (e.clientY / window.innerHeight - 0.5); }, { passive: true });

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H);
    if (composer) { composer.setSize(W, H); bloom.setSize(W, H); }
    uniforms.uPix.value = renderer.getPixelRatio();
  }
  window.addEventListener("resize", resize);

  var phase = 0, t = 0, last = 0, holdAt = 0, raf = null, burstT = 0;

  function triggerBurst() {
    if (phase >= 2) return;
    phase = 2; burstT = 0;
    if (cue) cue.classList.remove("show");
    if (tag) tag.classList.remove("show");
    overlay.classList.add("flash");            // light flash
    overlay.classList.add("opening");          // letterbox opens
    for (var i = 0; i < N; i++) {
      var x = cur[i * 3], y = cur[i * 3 + 1], z = cur[i * 3 + 2];
      var len = Math.sqrt(x * x + y * y + z * z) || 1;
      var sp = 12 + Math.random() * 30;
      vel[i * 3] = (x / len) * sp + (Math.random() - 0.5) * 7;
      vel[i * 3 + 1] = (y / len) * sp + (Math.random() - 0.5) * 7 + 3;
      vel[i * 3 + 2] = 14 + Math.random() * 22;   // fly toward / past the camera
    }
    setTimeout(function () { if (overlay) overlay.classList.add("gone"); }, 1150);
  }
  ["wheel", "touchmove", "keydown", "click"].forEach(function (ev) {
    window.addEventListener(ev, function () { if (phase < 2) triggerBurst(); }, { passive: true });
  });
  if (skip) skip.addEventListener("click", function (e) { e.stopPropagation(); if (phase < 2) triggerBurst(); });

  function cleanup() {
    window.removeEventListener("resize", resize);
    document.body.classList.remove("intro-lock");
    try { geo.dispose(); mat.dispose(); dgeo.dispose(); dmat.dispose(); renderer.dispose();
      var ext = renderer.getContext().getExtension("WEBGL_lose_context"); if (ext) ext.loseContext(); } catch (e) {}
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    signalDone();
  }

  var posAttr = geo.getAttribute("position");
  function loop(now) {
    raf = requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; t += dt;

    if (phase === 0) {
      for (var i = 0; i < N; i++) {
        cur[i * 3] += (target[i * 3] - cur[i * 3]) * 0.14;
        cur[i * 3 + 1] += (target[i * 3 + 1] - cur[i * 3 + 1]) * 0.14;
        cur[i * 3 + 2] += (target[i * 3 + 2] - cur[i * 3 + 2]) * 0.14;
      }
      camera.position.z += (15 - camera.position.z) * 0.035;      // push in
      if (t > 1.1) { phase = 1; holdAt = t; if (cue) cue.classList.add("show"); if (tag) tag.classList.add("show"); }
    } else if (phase === 1) {
      for (var j = 0; j < N; j++) {
        cur[j * 3] += (target[j * 3] - cur[j * 3]) * 0.1 + Math.sin(t * 1.6 + j) * 0.0016;
        cur[j * 3 + 1] += (target[j * 3 + 1] - cur[j * 3 + 1]) * 0.1;
        cur[j * 3 + 2] += (target[j * 3 + 2] - cur[j * 3 + 2]) * 0.1;
      }
      camera.position.z += (12.5 - camera.position.z) * 0.02;     // slow drift in
      if (t - holdAt > 7) triggerBurst();
    } else {
      burstT += dt;
      for (var k = 0; k < N; k++) {
        cur[k * 3] += vel[k * 3] * dt; cur[k * 3 + 1] += vel[k * 3 + 1] * dt; cur[k * 3 + 2] += vel[k * 3 + 2] * dt;
        vel[k * 3 + 1] -= 4 * dt;
      }
      camera.position.z += (3 - camera.position.z) * 0.06;        // fly through
      uniforms.uFade.value = Math.max(0, uniforms.uFade.value - dt * 1.1);
    }

    dust.rotation.y += dt * 0.02;
    dust.rotation.x = myr * 0.05;
    camera.position.x += (mxr * 1.6 - camera.position.x) * 0.04;
    camera.position.y += (-myr * 1.1 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, phase === 2 ? camera.position.z - 10 : 0);
    posAttr.needsUpdate = true;
    render();
  }
  last = performance.now();
  raf = requestAnimationFrame(loop);

  overlay.addEventListener("transitionend", function (e) {
    if (e.propertyName === "opacity" && overlay.classList.contains("gone")) { cancelAnimationFrame(raf); cleanup(); }
  });
  setTimeout(function () { if (document.getElementById("intro")) { cancelAnimationFrame(raf); cleanup(); } }, 16000);
})();

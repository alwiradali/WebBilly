/* ============================================================
   Billy Digitals — Cinematic intro
   Particles explode in, assemble into "BILLY DIGITALS", then burst
   across the screen on first scroll and reveal the homepage.
   Plays once per visit (sessionStorage). Skips under reduced-motion
   or if the session already saw it. Three.js, additive soft points.
   ============================================================ */
import * as THREE from "three";

(function () {
  "use strict";
  var overlay = document.getElementById("intro");
  var canvas = document.getElementById("introGL");
  if (!overlay || !canvas) return;

  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var seen = false;
  try { seen = sessionStorage.getItem("bdIntroSeen") === "1"; } catch (e) {}

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

  var mobile = window.matchMedia && matchMedia("(max-width: 720px)").matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.4 : 1.8));
  var W = window.innerWidth, H = window.innerHeight;
  renderer.setSize(W, H);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 100);
  camera.position.set(0, 0, 16);

  // ---- Sample the wordmark into target points ----
  function sampleText() {
    var c = document.createElement("canvas");
    var cw = 1600, ch = 500; c.width = cw; c.height = ch;
    var x = c.getContext("2d");
    x.fillStyle = "#fff";
    x.textAlign = "center"; x.textBaseline = "middle";
    // Two lines so it reads big on any aspect
    x.font = "700 190px 'Space Grotesk', 'Arial Black', sans-serif";
    x.fillText("BILLY", cw / 2, ch * 0.33);
    x.font = "700 132px 'Space Grotesk', 'Arial Black', sans-serif";
    x.fillText("DIGITALS", cw / 2, ch * 0.72);
    var data = x.getImageData(0, 0, cw, ch).data;
    var pts = [];
    var step = mobile ? 6 : 5;
    for (var py = 0; py < ch; py += step) {
      for (var px = 0; px < cw; px += step) {
        if (data[(py * cw + px) * 4 + 3] > 130) {
          pts.push([px, py]);
        }
      }
    }
    return { pts: pts, cw: cw, ch: ch };
  }
  var s = sampleText();
  var N = s.pts.length;
  if (N < 200) { renderer.dispose(); finishInstant(); return; }

  var span = mobile ? 12 : 15;                 // world width of the wordmark
  var scale = span / s.cw;
  var target = new Float32Array(N * 3);
  var start = new Float32Array(N * 3);
  var cur = new Float32Array(N * 3);
  var vel = new Float32Array(N * 3);
  var col = new Float32Array(N * 3);
  var C1 = new THREE.Color("#2b7fff"), C2 = new THREE.Color("#22d3ee"), C3 = new THREE.Color("#7c3aed");
  for (var i = 0; i < N; i++) {
    var px = s.pts[i][0], py = s.pts[i][1];
    var tx = (px - s.cw / 2) * scale;
    var ty = -(py - s.ch / 2) * scale;
    var tz = (Math.random() - 0.5) * 0.6;
    target[i * 3] = tx; target[i * 3 + 1] = ty; target[i * 3 + 2] = tz;
    // start scattered on a big shell (the "explosion" seed)
    var r = 14 + Math.random() * 16, th = Math.random() * 6.2832, ph = Math.acos(2 * Math.random() - 1);
    start[i * 3] = Math.sin(ph) * Math.cos(th) * r;
    start[i * 3 + 1] = Math.sin(ph) * Math.sin(th) * r;
    start[i * 3 + 2] = Math.cos(ph) * r - 4;
    cur[i * 3] = start[i * 3]; cur[i * 3 + 1] = start[i * 3 + 1]; cur[i * 3 + 2] = start[i * 3 + 2];
    // colour by horizontal position (blue → cyan → violet)
    var m = (tx / span) + 0.5;
    var cc = m < 0.5 ? C1.clone().lerp(C2, m * 2) : C2.clone().lerp(C3, (m - 0.5) * 2);
    col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
  }

  var geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(cur, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));

  var uniforms = { uSize: { value: mobile ? 15 : 20 }, uPix: { value: renderer.getPixelRatio() }, uFade: { value: 1 } };
  var mat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: [
      "uniform float uSize; uniform float uPix; attribute vec3 color; varying vec3 vC;",
      "void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.0);",
      "gl_PointSize=uSize*uPix*(1.0/-mv.z); gl_Position=projectionMatrix*mv; }"
    ].join("\n"),
    fragmentShader: [
      "precision highp float; uniform float uFade; varying vec3 vC;",
      "void main(){ vec2 uv=gl_PointCoord-0.5; float d=length(uv); float a=smoothstep(0.5,0.05,d);",
      "if(a<=0.001) discard; gl_FragColor=vec4(vC, a*uFade); }"
    ].join("\n"),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false
  });
  var points = new THREE.Points(geo, mat);
  scene.add(points);

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H);
    uniforms.uPix.value = renderer.getPixelRatio();
  }
  window.addEventListener("resize", resize);

  // ---- Phases: 0 assemble → 1 hold → 2 burst → done ----
  var phase = 0, t = 0, last = 0, holdAt = 0, raf = null;
  var cue = overlay.querySelector(".intro-cue");
  var mxr = 0, myr = 0;
  window.addEventListener("pointermove", function (e) { mxr = (e.clientX / window.innerWidth - 0.5); myr = (e.clientY / window.innerHeight - 0.5); }, { passive: true });

  function triggerBurst() {
    if (phase >= 2) return;
    phase = 2; t = 0;
    if (cue) cue.classList.remove("show");
    // wall-clock guarantee: reveal the page ~1.2s after the burst begins,
    // independent of how fast the rAF loop is running on this device.
    setTimeout(function () { if (overlay) overlay.classList.add("gone"); }, 1200);
    for (var i = 0; i < N; i++) {
      var x = cur[i * 3], y = cur[i * 3 + 1], z = cur[i * 3 + 2];
      var len = Math.sqrt(x * x + y * y + z * z) || 1;
      var sp = 10 + Math.random() * 26;
      vel[i * 3] = (x / len) * sp + (Math.random() - 0.5) * 6;
      vel[i * 3 + 1] = (y / len) * sp + (Math.random() - 0.5) * 6 + 3;
      vel[i * 3 + 2] = (z / len) * sp + Math.random() * 10;
    }
  }

  // burst on first intent to enter
  ["wheel", "touchmove", "keydown", "click"].forEach(function (ev) {
    window.addEventListener(ev, function () { if (phase < 2) triggerBurst(); }, { passive: true });
  });
  var skip = overlay.querySelector(".intro-skip");
  if (skip) skip.addEventListener("click", function (e) { e.stopPropagation(); if (phase < 2) triggerBurst(); });

  function cleanup() {
    window.removeEventListener("resize", resize);
    document.body.classList.remove("intro-lock");
    try { geo.dispose(); mat.dispose(); renderer.dispose(); var ext = renderer.getContext().getExtension("WEBGL_lose_context"); if (ext) ext.loseContext(); } catch (e) {}
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    signalDone();
  }

  var posAttr = geo.getAttribute("position");
  function loop(now) {
    raf = requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; t += dt;

    if (phase === 0) {
      var ease = 0;
      for (var i = 0; i < N; i++) {
        cur[i * 3] += (target[i * 3] - cur[i * 3]) * 0.05;
        cur[i * 3 + 1] += (target[i * 3 + 1] - cur[i * 3 + 1]) * 0.05;
        cur[i * 3 + 2] += (target[i * 3 + 2] - cur[i * 3 + 2]) * 0.05;
      }
      if (t > 2.4) { phase = 1; holdAt = t; if (cue) cue.classList.add("show"); }
    } else if (phase === 1) {
      // gentle shimmer while holding the wordmark
      for (var j = 0; j < N; j++) {
        cur[j * 3] += (target[j * 3] - cur[j * 3]) * 0.08 + Math.sin(t * 2 + j) * 0.002;
        cur[j * 3 + 1] += (target[j * 3 + 1] - cur[j * 3 + 1]) * 0.08;
        cur[j * 3 + 2] += (target[j * 3 + 2] - cur[j * 3 + 2]) * 0.08;
      }
      if (t - holdAt > 6.5) triggerBurst();   // auto-enter if they don't scroll
    } else if (phase === 2) {
      for (var k = 0; k < N; k++) {
        cur[k * 3] += vel[k * 3] * dt; cur[k * 3 + 1] += vel[k * 3 + 1] * dt; cur[k * 3 + 2] += vel[k * 3 + 2] * dt;
        vel[k * 3 + 1] -= 4 * dt; // slight gravity
      }
      camera.position.z += (7 - camera.position.z) * 0.05;         // dolly in through the burst
      uniforms.uFade.value = Math.max(0, uniforms.uFade.value - dt * 1.2);
      if (uniforms.uFade.value <= 0.02) { overlay.classList.add("gone"); }
    }

    // parallax
    camera.position.x += (mxr * 2 - camera.position.x) * 0.04;
    camera.position.y += (-myr * 1.4 - camera.position.y) * 0.04;
    if (phase < 2) camera.lookAt(0, 0, 0);
    posAttr.needsUpdate = true;
    renderer.render(scene, camera);
  }
  last = performance.now();
  raf = requestAnimationFrame(loop);

  // when the fade transition ends, tear everything down
  overlay.addEventListener("transitionend", function (e) {
    if (e.propertyName === "opacity" && overlay.classList.contains("gone")) { cancelAnimationFrame(raf); cleanup(); }
  });
  // hard safety: never trap the user
  setTimeout(function () { if (document.getElementById("intro")) { cancelAnimationFrame(raf); cleanup(); } }, 16000);
})();

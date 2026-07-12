/* ============================================================
   Billy Digitals — Cinematic intro
   A living, flowing nebula (domain-warped GPU noise) fades up as
   letterbox bars open · GPU particles rush out of deep space and
   assemble into "Welcome to / Billy Digitals" · the tagline "where
   you grow" fades in · on first scroll the camera flies through the
   wordmark as it bursts and the homepage is revealed. Bloom + dust
   (desktop). Fast (~1s to form). Once per visit · Skip · plays under
   reduced-motion · failure safe.
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
  if (seen) { finishInstant(); return; }

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
  camera.position.set(0, 0, 22);

  overlay.classList.add("cinema"); // letterbox slides in immediately

  var cue = overlay.querySelector(".intro-cue");
  var tag = overlay.querySelector(".intro-tag");
  var skip = overlay.querySelector(".intro-skip");

  /* ---------- atmospheric dust ---------- */
  var DN = mobile ? 200 : 480;
  var dpos = new Float32Array(DN * 3), dcol = new Float32Array(DN * 3);
  var DA = new THREE.Color("#3b6bff"), DB = new THREE.Color("#22d3ee");
  for (var d2 = 0; d2 < DN; d2++) {
    dpos[d2 * 3] = (Math.random() - 0.5) * 48;
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
    vertexShader: "uniform float uPix; attribute vec3 color; varying vec3 vC; varying float vZ;" +
      "void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.0); vZ=-mv.z;" +
      "gl_PointSize=(mv.z<-0.1?(66.0*uPix/-mv.z):0.0); gl_Position=projectionMatrix*mv; }",
    fragmentShader: "precision highp float; varying vec3 vC; varying float vZ;" +
      "void main(){ vec2 uv=gl_PointCoord-0.5; float d=length(uv); float a=smoothstep(0.5,0.0,d);" +
      "a*=clamp(1.0-(vZ-6.0)/40.0,0.05,0.55); gl_FragColor=vec4(vC,a); }",
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false
  });
  var dust = new THREE.Points(dgeo, dmat); scene.add(dust);

  /* ---------- moving nebula backdrop ---------- */
  var OCT = mobile ? 3 : 4;
  var nebFrag = [
    "precision highp float;",
    "uniform float uTime; uniform float uOpacity;",
    "varying vec2 vUv;",
    "vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}",
    "vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}",
    "vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}",
    "float snoise(vec2 v){const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);",
    "vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);",
    "vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);",
    "vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod289(i);",
    "vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));",
    "vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);m=m*m;m=m*m;",
    "vec3 x=2.0*fract(p*C.www)-1.0;vec3 h=abs(x)-0.5;vec3 ox=floor(x+0.5);vec3 a0=x-ox;",
    "m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);",
    "vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.0*dot(m,g);}",
    "float fbm(vec2 p){float s=0.0,a=0.5;for(int i=0;i<" + OCT + ";i++){s+=a*snoise(p);p*=2.03;a*=0.5;}return s;}",
    "void main(){vec2 uv=vUv;uv.x*=1.58;float t=uTime*0.045;",
    "vec2 q=vec2(fbm(uv*3.0+vec2(0.0,t)),fbm(uv*3.0+vec2(5.2,1.3)-t));",
    "float n=fbm(uv*3.0+q*1.75+vec2(t*0.7,-t*0.5));n=n*0.5+0.5;",
    "float cloud=smoothstep(0.30,0.94,n);",
    "vec3 deep=vec3(0.012,0.028,0.085);vec3 blue=vec3(0.07,0.30,0.85);",
    "vec3 cyan=vec3(0.10,0.68,0.92);vec3 viol=vec3(0.44,0.22,0.82);",
    "vec3 col=mix(deep,blue,cloud);",
    "col=mix(col,cyan,smoothstep(0.62,1.0,n)*0.7);",
    "col=mix(col,viol,smoothstep(0.35,0.78,fbm(uv*2.0-t*0.8))*0.38);",
    "float vig=smoothstep(1.18,0.12,length(vUv-0.5)*1.32);col*=vig;",
    "float alpha=(0.5+cloud*0.5)*uOpacity;",
    "gl_FragColor=vec4(col,alpha);}"
  ].join("\n");
  var nebUni = { uTime: { value: 0 }, uOpacity: { value: 0 } };
  var nebMat = new THREE.ShaderMaterial({
    uniforms: nebUni,
    vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
    fragmentShader: nebFrag,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.NormalBlending
  });
  var neb = new THREE.Mesh(new THREE.PlaneGeometry(300, 190), nebMat);
  neb.position.set(0, 0, -52); neb.renderOrder = -10;
  scene.add(neb);

  /* ---------- bloom (desktop) ---------- */
  var composer = null, bloom = null;
  if (!mobile) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.72, 0.7, 0.14);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }
  function render() { if (composer) composer.render(); else renderer.render(scene, camera); }

  /* ---------- interaction / lifecycle wiring (works even before points build) ---------- */
  var phase = 0, t = 0, last = 0, holdAt = 0, raf = null, built = false, points = null, geo = null, mat = null;
  var N = 0, target, launch, delay, cur, vel, uniforms, posAttr, minTx = 0, maxTx = 1;
  var SWEEP = 0.22, FORM = 0.72;
  var mxr = 0, myr = 0;
  window.addEventListener("pointermove", function (e) { mxr = (e.clientX / window.innerWidth - 0.5); myr = (e.clientY / window.innerHeight - 0.5); }, { passive: true });

  function triggerBurst() {
    if (phase >= 2 || !built) { if (!built) { hardExit(); } return; }
    phase = 2; t = 0;
    if (cue) cue.classList.remove("show"); if (tag) tag.classList.remove("show");
    overlay.classList.add("flash"); overlay.classList.add("opening");
    for (var i = 0; i < N; i++) {
      var x = cur[i * 3], y = cur[i * 3 + 1], z = cur[i * 3 + 2];
      var len = Math.sqrt(x * x + y * y + z * z) || 1, sp = 12 + Math.random() * 30;
      vel[i * 3] = (x / len) * sp + (Math.random() - 0.5) * 7;
      vel[i * 3 + 1] = (y / len) * sp + (Math.random() - 0.5) * 7 + 3;
      vel[i * 3 + 2] = 14 + Math.random() * 22;
    }
    setTimeout(function () { if (overlay) overlay.classList.add("gone"); }, 1150);
  }
  function hardExit() { overlay.classList.add("opening"); overlay.classList.add("gone"); }
  ["wheel", "touchmove", "keydown", "click"].forEach(function (ev) {
    window.addEventListener(ev, function () { if (phase < 2) triggerBurst(); }, { passive: true });
  });
  if (skip) skip.addEventListener("click", function (e) { e.stopPropagation(); if (phase < 2) triggerBurst(); });

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H);
    if (composer) { composer.setSize(W, H); bloom.setSize(W, H); }
    if (uniforms) uniforms.uPix.value = renderer.getPixelRatio();
    dmat.uniforms.uPix.value = renderer.getPixelRatio();
  }
  window.addEventListener("resize", resize);

  function cleanup() {
    window.removeEventListener("resize", resize);
    document.body.classList.remove("intro-lock");
    try { if (geo) geo.dispose(); if (mat) mat.dispose(); dgeo.dispose(); dmat.dispose(); neb.geometry.dispose(); nebMat.dispose(); renderer.dispose();
      var ext = renderer.getContext().getExtension("WEBGL_lose_context"); if (ext) ext.loseContext(); } catch (e) {}
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    signalDone();
  }
  overlay.addEventListener("transitionend", function (e) {
    if (e.propertyName === "opacity" && overlay.classList.contains("gone")) { if (raf) cancelAnimationFrame(raf); cleanup(); }
  });
  setTimeout(function () { if (document.getElementById("intro")) { if (raf) cancelAnimationFrame(raf); cleanup(); } }, 16000);

  /* ---------- build the wordmark once the font is ready ---------- */
  function sampleText() {
    var c = document.createElement("canvas"), cw = 1900, ch = 620; c.width = cw; c.height = ch;
    var x = c.getContext("2d");
    x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle";
    x.font = "italic 600 120px 'Playfair Display', Georgia, serif";
    x.fillText("Welcome to", cw / 2, ch * 0.24);
    x.font = "800 188px 'Playfair Display', Georgia, serif";
    x.fillText("Billy Digitals", cw / 2, ch * 0.63);
    var data = x.getImageData(0, 0, cw, ch).data, pts = [], nx = cw, xx = 0, ny = ch, xy = 0, step = mobile ? 5 : 4;
    for (var py = 0; py < ch; py += step) for (var px = 0; px < cw; px += step) {
      if (data[(py * cw + px) * 4 + 3] > 130) { pts.push([px, py]); if (px < nx) nx = px; if (px > xx) xx = px; if (py < ny) ny = py; if (py > xy) xy = py; }
    }
    return { pts: pts, bw: (xx - nx) || cw, cx: (nx + xx) / 2, cy: (ny + xy) / 2 };
  }

  function build() {
    if (built) return;
    var s = sampleText();
    N = s.pts.length;
    if (N < 200) { hardExit(); return; }
    var halfH = 12.5 * Math.tan(55 * Math.PI / 360), visW = 2 * halfH * (W / H);
    var span = Math.min(visW * 0.88, 26), scale = span / s.bw;
    target = new Float32Array(N * 3); launch = new Float32Array(N * 3);
    cur = new Float32Array(N * 3); vel = new Float32Array(N * 3); delay = new Float32Array(N);
    var col = new Float32Array(N * 3);
    var C1 = new THREE.Color("#4a97ff"), C2 = new THREE.Color("#57e2ff"), C3 = new THREE.Color("#b79bff");
    minTx = -span / 2; maxTx = span / 2;
    var i, tx;
    for (i = 0; i < N; i++) {
      tx = (s.pts[i][0] - s.cx) * scale;
      var ty = -(s.pts[i][1] - s.cy) * scale, tz = (Math.random() - 0.5) * 0.7;
      target[i * 3] = tx; target[i * 3 + 1] = ty; target[i * 3 + 2] = tz;
      // launch as motes of the nebula itself — scattered across the cloud
      // at its depth, then rush forward and coalesce into the wordmark
      launch[i * 3] = (Math.random() - 0.5) * span * 1.9;
      launch[i * 3 + 1] = (Math.random() - 0.5) * span * 1.15;
      launch[i * 3 + 2] = -16 - Math.random() * 34;
      cur[i * 3] = launch[i * 3]; cur[i * 3 + 1] = launch[i * 3 + 1]; cur[i * 3 + 2] = launch[i * 3 + 2];
      // near-simultaneous assembly with a tiny random stagger (fast, not sequential)
      delay[i] = Math.random() * SWEEP;
      var m = (tx / span) + 0.5;
      var cc = m < 0.5 ? C1.clone().lerp(C2, Math.max(0, m) * 2) : C2.clone().lerp(C3, Math.min(1, (m - 0.5) * 2));
      col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
    }
    geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(cur, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    uniforms = { uSize: { value: mobile ? 58 : 42 }, uPix: { value: renderer.getPixelRatio() }, uFade: { value: 1 }, uBright: { value: mobile ? 1.85 : 1.3 } };
    mat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: "uniform float uSize; uniform float uPix; attribute vec3 color; varying vec3 vC;" +
        "void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.0);" +
        "gl_PointSize=uSize*uPix*(1.0/-mv.z); gl_Position=projectionMatrix*mv; }",
      fragmentShader: "precision highp float; uniform float uFade; uniform float uBright; varying vec3 vC;" +
        "void main(){ vec2 uv=gl_PointCoord-0.5; float d=length(uv); float a=smoothstep(0.5,0.04,d);" +
        "if(a<=0.001) discard; vec3 col=vC*uBright + smoothstep(0.42,0.0,d)*0.5; gl_FragColor=vec4(col, a*uFade); }",
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false
    });
    points = new THREE.Points(geo, mat); scene.add(points);
    posAttr = geo.getAttribute("position");
    built = true; t = 0; last = performance.now();
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; t += dt;

    if (built) {
      if (phase === 0) {
        var i, k, ke, lo;
        for (i = 0; i < N; i++) {
          lo = t - delay[i];
          if (lo <= 0) {
            cur[i * 3] = launch[i * 3] + Math.sin(t * 3 + i) * 0.5;
            cur[i * 3 + 1] = launch[i * 3 + 1] + Math.cos(t * 2.2 + i) * 0.5;
            cur[i * 3 + 2] = launch[i * 3 + 2];
          } else {
            k = Math.min(lo / FORM, 1); ke = 1 - Math.pow(1 - k, 3);
            cur[i * 3] = launch[i * 3] + (target[i * 3] - launch[i * 3]) * ke;
            cur[i * 3 + 1] = launch[i * 3 + 1] + (target[i * 3 + 1] - launch[i * 3 + 1]) * ke + Math.sin(t * 6 + i) * (1 - ke) * 0.7;
            cur[i * 3 + 2] = launch[i * 3 + 2] + (target[i * 3 + 2] - launch[i * 3 + 2]) * ke;
          }
        }
        camera.position.z += (15 - camera.position.z) * 0.05;
        if (t > SWEEP + FORM + 0.12) { phase = 1; holdAt = t; if (tag) tag.classList.add("show"); }
      } else if (phase === 1) {
        for (var j = 0; j < N; j++) {
          cur[j * 3] += (target[j * 3] - cur[j * 3]) * 0.16;
          cur[j * 3 + 1] += (target[j * 3 + 1] - cur[j * 3 + 1]) * 0.16 + Math.sin(t * 1.5 + j) * 0.0016;
          cur[j * 3 + 2] += (target[j * 3 + 2] - cur[j * 3 + 2]) * 0.16;
        }
        camera.position.z += (12.5 - camera.position.z) * 0.02;
        // auto-advance quickly — a brief beat to read, then fly through (no scroll needed)
        if (t - holdAt > 1.25) triggerBurst();
      } else {
        for (var m2 = 0; m2 < N; m2++) {
          cur[m2 * 3] += vel[m2 * 3] * dt; cur[m2 * 3 + 1] += vel[m2 * 3 + 1] * dt; cur[m2 * 3 + 2] += vel[m2 * 3 + 2] * dt;
          vel[m2 * 3 + 1] -= 4 * dt;
        }
        camera.position.z += (3 - camera.position.z) * 0.06;
        uniforms.uFade.value = Math.max(0, uniforms.uFade.value - dt * 1.1);
      }
      posAttr.needsUpdate = true;
    }

    nebUni.uTime.value = t;
    nebUni.uOpacity.value += ((phase < 2 ? 1 : 0) - nebUni.uOpacity.value) * (phase < 2 ? 0.06 : 0.16);
    neb.rotation.z += dt * 0.006;
    neb.position.x = mxr * 1.2; neb.position.y = -myr * 0.9;
    dust.rotation.y += dt * 0.02; dust.rotation.x = myr * 0.05;
    camera.position.x += (mxr * 1.6 - camera.position.x) * 0.04;
    camera.position.y += (-myr * 1.1 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, phase === 2 ? camera.position.z - 10 : 0);
    render();
  }
  last = performance.now(); raf = requestAnimationFrame(loop);

  // Build as soon as the elegant font is ready (max ~700ms wait), then run.
  var fr;
  if (document.fonts && document.fonts.load) {
    fr = Promise.race([
      Promise.all([document.fonts.load("italic 600 90px 'Playfair Display'"), document.fonts.load("800 90px 'Playfair Display'")]),
      new Promise(function (res) { setTimeout(res, 750); })
    ]);
  } else { fr = Promise.resolve(); }
  fr.then(build, build);
})();

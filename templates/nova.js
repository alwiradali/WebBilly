/* ============================================================
   NOVA — GPU particle field flagship
   24k points on a sphere, displaced live by 3D simplex noise in
   the vertex shader, additive-blended, run through UnrealBloom.
   Reacts to the pointer and morphs/dollies as you scroll.
   Three.js + EffectComposer. Original work. Degrades to nothing
   (canvas hidden) under reduced-motion or missing WebGL.
   ============================================================ */
import * as THREE from "three";
import { EffectComposer } from "./vendor/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./vendor/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./vendor/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "./vendor/jsm/postprocessing/OutputPass.js";

(function () {
  "use strict";
  var canvas = document.getElementById("nova-gl");
  if (!canvas) return;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobile = window.matchMedia && matchMedia("(max-width: 820px)").matches;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  } catch (e) { canvas.style.display = "none"; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.3 : 1.75));

  var host = canvas.parentElement;
  var W = host.clientWidth, H = host.clientHeight || window.innerHeight;
  renderer.setSize(W, H);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 100);
  camera.position.set(0, 0, 15);

  // ---- Fibonacci sphere of points ----
  var N = mobile ? 11000 : 24000;
  var R = 6.2;
  var positions = new Float32Array(N * 3);
  var rnd = new Float32Array(N);
  var golden = Math.PI * (3 - Math.sqrt(5));
  for (var i = 0; i < N; i++) {
    var y = 1 - (i / (N - 1)) * 2;
    var r = Math.sqrt(1 - y * y);
    var th = golden * i;
    positions[i * 3] = Math.cos(th) * r * R;
    positions[i * 3 + 1] = y * R;
    positions[i * 3 + 2] = Math.sin(th) * r * R;
    rnd[i] = Math.random();
  }
  var geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aRnd", new THREE.BufferAttribute(rnd, 1));

  // ---- Shaders (simplex noise displacement) ----
  var noiseGLSL = [
    "vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}",
    "vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}",
    "vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}",
    "vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}",
    "float snoise(vec3 v){",
    "  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);",
    "  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);",
    "  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);",
    "  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;",
    "  i=mod289(i);",
    "  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));",
    "  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;",
    "  vec4 j=p-49.0*floor(p*ns.z*ns.z);",
    "  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);",
    "  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);",
    "  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);",
    "  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));",
    "  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;",
    "  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);",
    "  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));",
    "  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;",
    "  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;",
    "  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));",
    "}"
  ].join("\n");

  var vert = [
    "uniform float uTime; uniform float uProgress; uniform float uSize; uniform float uPix; uniform vec3 uMouse;",
    "attribute float aRnd; varying float vN; varying float vY; varying float vD;",
    noiseGLSL,
    "void main(){",
    "  vec3 p = position;",
    "  float n = snoise(p*0.28 + vec3(0.0, uTime*0.12, 0.0));",
    "  float n2 = snoise(p*0.7 - uTime*0.09);",
    "  float amp = mix(0.55, 2.2, uProgress);",
    "  vec3 dir = normalize(p);",
    "  vec3 disp = p + dir*(n*amp + n2*0.5);",
    "  float ang = uProgress*3.14159*1.4 + n*0.35;",
    "  mat2 Rz = mat2(cos(ang),-sin(ang),sin(ang),cos(ang));",
    "  disp.xz = Rz*disp.xz;",
    "  // pointer ripple",
    "  float md = distance(disp, uMouse);",
    "  disp += dir * (1.2/(1.0+md*md)) * 0.9;",
    "  vN = n; vY = disp.y; vD = clamp(abs(n)*0.8+abs(n2)*0.4,0.0,1.0);",
    "  vec4 mv = modelViewMatrix * vec4(disp,1.0);",
    "  gl_PointSize = uSize * uPix * (1.0/ -mv.z) * (0.55 + aRnd*0.9);",
    "  gl_Position = projectionMatrix * mv;",
    "}"
  ].join("\n");

  var frag = [
    "precision highp float;",
    "uniform vec3 uCA; uniform vec3 uCB; uniform vec3 uCC; uniform float uProgress;",
    "varying float vN; varying float vY; varying float vD;",
    "void main(){",
    "  vec2 uv = gl_PointCoord - 0.5; float d = length(uv);",
    "  float a = smoothstep(0.5, 0.02, d);",
    "  if(a<=0.001) discard;",
    "  vec3 col = mix(uCA, uCB, smoothstep(-1.0,1.0,vN));",
    "  col = mix(col, uCC, smoothstep(-0.5,0.9, vY*0.15 + uProgress*0.3));",
    "  col += vD*0.35;",
    "  gl_FragColor = vec4(col, a*0.92);",
    "}"
  ].join("\n");

  var uniforms = {
    uTime: { value: 0 }, uProgress: { value: 0 }, uSize: { value: mobile ? 46 : 60 },
    uPix: { value: renderer.getPixelRatio() }, uMouse: { value: new THREE.Vector3(999, 999, 999) },
    uCA: { value: new THREE.Color("#2b6bff") }, uCB: { value: new THREE.Color("#d946ef") }, uCC: { value: new THREE.Color("#22d3ee") }
  };
  var mat = new THREE.ShaderMaterial({
    uniforms: uniforms, vertexShader: vert, fragmentShader: frag,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false
  });
  var points = new THREE.Points(geo, mat);
  var group = new THREE.Group(); group.add(points); scene.add(group);

  // ---- Post: bloom ----
  var composer = null, bloom = null;
  if (!mobile) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(W, H), reduce ? 0.4 : 0.9, 0.75, 0.2);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  // ---- Interaction ----
  var tmx = 0, tmy = 0, mx = 0, my = 0;
  window.addEventListener("pointermove", function (e) {
    tmx = (e.clientX / window.innerWidth - 0.5) * 2;
    tmy = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  function progress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
  }

  function resize() {
    W = host.clientWidth; H = host.clientHeight || window.innerHeight;
    camera.aspect = W / H; camera.updateProjectionMatrix();
    renderer.setSize(W, H); if (composer) { composer.setSize(W, H); bloom.setSize(W, H); }
    uniforms.uPix.value = renderer.getPixelRatio();
  }
  window.addEventListener("resize", resize);

  var t = 0, last = 0, raf = null, prog = 0;
  function start() { if (raf == null) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  function stop() { if (raf != null) { cancelAnimationFrame(raf); raf = null; } }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    t += dt * (reduce ? 0.25 : 1);
    uniforms.uTime.value = t;
    prog += (progress() - prog) * 0.06;
    uniforms.uProgress.value = prog;

    mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
    // pointer position projected loosely into world space near the sphere front
    uniforms.uMouse.value.set(mx * 6, -my * 5, 5);

    group.rotation.y += dt * (reduce ? 0.02 : 0.055) + mx * 0.0009;
    group.rotation.x += (my * 0.25 - group.rotation.x) * 0.03;
    camera.position.z = 15 - prog * 5.5;      // dolly in on scroll
    camera.position.x += (mx * 1.2 - camera.position.x) * 0.04;
    camera.position.y += (-my * 0.9 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);

    if (composer) composer.render(); else renderer.render(scene, camera);
  }
  start();

  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { (e.isIntersecting && !document.hidden) ? start() : stop(); });
    }, { threshold: 0 }).observe(host);
  }
})();

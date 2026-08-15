/* ============================================================
   HAIR BY ELLE — "Strand Field" hero.
   GPU-instanced hair strands as thin tapered ribbons, driven by
   simplex-noise flow in the vertex shader. The pointer is a
   force that parts the field with a springy recovery; strands
   catch a warm candlelit highlight along their length
   (Kajiya-Kay style anisotropic spec). Strands part around the
   centred wordmark, and drain upward as the page takes over
   (uScroll, scrubbed from the main script via HBE_STRANDS).

   Tiered: strand count + DPR scale with device capability.
   Reduced motion / no WebGL → the static SVG poster underneath.
   Pauses offscreen and on hidden tabs.
   ============================================================ */
import * as THREE from "three";

(function () {
  "use strict";
  var canvas = document.querySelector(".strands");
  if (!canvas) return;

  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return; /* poster stays */

  var gl;
  try { gl = canvas.getContext("webgl2") || canvas.getContext("webgl"); } catch (e) { gl = null; }
  if (!gl) return; /* poster stays */

  /* ---- capability tier → strand count + DPR cap ---- */
  var cores = navigator.hardwareConcurrency || 4;
  var mem = navigator.deviceMemory || 4;
  var small = matchMedia("(max-width: 768px)").matches;
  var tier = (cores >= 8 && mem >= 8 && !small) ? 2 : (cores >= 4 && mem >= 4) ? 1 : 0;
  var COUNT = [650, 1050, 1600][tier];
  if (small) COUNT = Math.round(COUNT * 0.6);
  var DPR = Math.min(window.devicePixelRatio || 1, [1.25, 1.5, 2][tier]);

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(DPR);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
  camera.position.set(0, 0, 5);
  var HALF_H = Math.tan(THREE.MathUtils.degToRad(21)) * 5;

  /* ---- base ribbon strip: position.x = side (0|1), position.y = t (0→1) ---- */
  var SEG = 22;
  var base = new Float32Array((SEG + 1) * 2 * 3);
  for (var s = 0; s <= SEG; s++) {
    var t = s / SEG;
    base.set([0, t, 0], (s * 2) * 3);
    base.set([1, t, 0], (s * 2 + 1) * 3);
  }
  var idx = [];
  for (var q = 0; q < SEG; q++) {
    var a = q * 2, b = a + 1, c = a + 2, d = a + 3;
    idx.push(a, b, c, b, d, c);
  }
  var geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(base, 3));
  geo.setIndex(idx);
  geo.instanceCount = COUNT;

  /* ---- per-strand attributes ---- */
  var roots = new Float32Array(COUNT * 3);
  var seeds = new Float32Array(COUNT);
  var lens = new Float32Array(COUNT);
  var wids = new Float32Array(COUNT);
  var tints = new Float32Array(COUNT * 2); /* x: red-strand flag, y: base alpha */
  var rnd = function (lo, hi) { return lo + Math.random() * (hi - lo); };
  for (var i = 0; i < COUNT; i++) {
    roots[i * 3] = rnd(-3.8, 3.8);
    roots[i * 3 + 1] = rnd(1.35, 2.5);
    roots[i * 3 + 2] = rnd(-1.3, 0.9);
    seeds[i] = Math.random() * 100;
    lens[i] = rnd(2.4, 4.6);
    wids[i] = rnd(0.004, 0.012);
    tints[i * 2] = Math.random() < 0.02 ? 1 : 0;
    tints[i * 2 + 1] = rnd(0.13, 0.4);
  }
  geo.setAttribute("aRoot", new THREE.InstancedBufferAttribute(roots, 3));
  geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
  geo.setAttribute("aLen", new THREE.InstancedBufferAttribute(lens, 1));
  geo.setAttribute("aWid", new THREE.InstancedBufferAttribute(wids, 1));
  geo.setAttribute("aTint", new THREE.InstancedBufferAttribute(tints, 2));

  var uniforms = {
    uTime: { value: 0 },
    uScroll: { value: 0 },
    uPointer: { value: new THREE.Vector2(99, 99) },
    uForce: { value: 0 },
    uInk: { value: new THREE.Color("#3D3F5E") },
    uRed: { value: new THREE.Color("#E8261C") },
    uAmber: { value: new THREE.Color("#F2C48A") }
  };

  var material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: [
      "attribute vec3 aRoot;",
      "attribute float aSeed;",
      "attribute float aLen;",
      "attribute float aWid;",
      "attribute vec2 aTint;",
      "uniform float uTime, uScroll, uForce;",
      "uniform vec2 uPointer;",
      "varying float vT, vSide, vSpec, vTint, vAlpha;",
      /* Ashima simplex 3D noise */
      "vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}",
      "vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}",
      "vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}",
      "vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}",
      "float snoise(vec3 v){",
      "  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);",
      "  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);",
      "  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g;",
      "  vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);",
      "  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;",
      "  i=mod289(i);",
      "  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));",
      "  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;",
      "  vec4 j=p-49.0*floor(p*ns.z*ns.z);",
      "  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);",
      "  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy;",
      "  vec4 h=1.0-abs(x)-abs(y);",
      "  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);",
      "  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0;",
      "  vec4 sh=-step(h,vec4(0.0));",
      "  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;",
      "  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y);",
      "  vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);",
      "  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));",
      "  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;",
      "  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;",
      "  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));",
      "}",
      /* how deep inside the wordmark clearing a point sits (0→1) */
      "float logoFade(vec3 p){",
      "  vec2 e=vec2(p.x/2.15, p.y/0.9);",
      "  return exp(-dot(e,e)*1.35)*0.75;",
      "}",
      /* centreline of one strand at parameter t */
      "vec3 strandPos(float t){",
      "  vec3 p=aRoot;",
      "  p.y-=t*aLen;",
      "  float n1=snoise(vec3(aRoot.x*0.5+aSeed, t*1.05, uTime*0.14));",
      "  float n2=snoise(vec3(aRoot.y*0.7-aSeed, t*1.7+5.0, uTime*0.1+3.0));",
      "  p.x+=n1*(0.13+0.42*t);",
      "  p.z+=n2*(0.07+0.24*t);",
      "  p.y+=n2*0.06*t;",
      /* the pointer is a hand through the field */
      "  vec2 d=p.xy-uPointer;",
      "  float fall=exp(-dot(d,d)*2.4);",
      "  p.xy+=normalize(d+vec2(1e-4))*fall*uForce*(0.35+0.65*t);",
      /* strands part gently around the wordmark's bounding box */
      "  vec2 e=vec2(p.x/2.15, p.y/0.9);",
      "  float logo=exp(-dot(e,e)*1.35);",
      "  p.x+=sign(p.x+1e-3)*logo*0.5;",
      "  p.y+=logo*0.08;",
      /* scroll: the field compresses and drains upward */
      "  p.y+=uScroll*uScroll*(2.8*t+0.7);",
      "  p.x*=1.0-0.28*uScroll;",
      "  return p;",
      "}",
      "void main(){",
      "  float side=position.x; float t=position.y;",
      "  vec3 pA=strandPos(t);",
      "  vec3 pB=strandPos(min(t+0.045,1.0));",
      "  vec3 tang=normalize(pB-pA+vec3(0.0,-1e-4,0.0));",
      "  vec2 nrm=normalize(vec2(-tang.y,tang.x));",
      "  float w=aWid*(1.0-0.68*t);",
      "  vec3 p=pA; p.xy+=nrm*(side-0.5)*w*2.0;",
      /* warm key light raking from upper-left (studio lamp) */
      "  vec3 L=normalize(vec3(-0.55,0.65,0.52));",
      "  vec3 H=normalize(L+vec3(0.0,0.0,1.0));",
      "  float TdH=clamp(dot(tang,H),-1.0,1.0);",
      "  vSpec=pow(sqrt(max(0.0,1.0-TdH*TdH)),42.0);",
      "  vT=t; vSide=side; vTint=aTint.x;",
      /* thin the field further inside the wordmark clearing */
      "  vAlpha=aTint.y*(1.0-logoFade(pA))*(1.0-uScroll*0.95);",
      "  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);",
      "}"
    ].join("\n"),
    fragmentShader: [
      "precision mediump float;",
      "uniform vec3 uInk, uRed, uAmber;",
      "varying float vT, vSide, vSpec, vTint, vAlpha;",
      "void main(){",
      "  float edge=smoothstep(0.0,0.4,vSide)*smoothstep(1.0,0.6,vSide);",
      "  float tip=smoothstep(1.0,0.82,vT)*smoothstep(0.0,0.06,vT);",
      "  vec3 col=mix(uInk,uRed,vTint);",
      "  col=mix(col,uAmber,vSpec*0.6);",
      "  float a=vAlpha*edge*tip;",
      "  if(a<0.004) discard;",
      "  gl_FragColor=vec4(col,a);",
      "}"
    ].join("\n")
  });

  var mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  scene.add(mesh);

  /* ---- pointer as a force with springy recovery ---- */
  var ptr = { x: 99, y: 99, force: 0, vel: 0, target: 0, lastX: 0, lastY: 0, lastT: 0 };
  var hero = canvas.closest(".hero") || canvas;
  function toWorld(clientX, clientY) {
    var r = canvas.getBoundingClientRect();
    var nx = (clientX - r.left) / r.width * 2 - 1;
    var ny = -((clientY - r.top) / r.height * 2 - 1);
    return { x: nx * HALF_H * camera.aspect, y: ny * HALF_H };
  }
  hero.addEventListener("pointermove", function (e) {
    var w = toWorld(e.clientX, e.clientY);
    var now = performance.now();
    var dt = Math.max(16, now - (ptr.lastT || now));
    var speed = Math.hypot(w.x - ptr.lastX, w.y - ptr.lastY) / dt * 1000;
    ptr.lastX = w.x; ptr.lastY = w.y; ptr.lastT = now;
    ptr.x = w.x; ptr.y = w.y;
    ptr.target = Math.min(0.85, ptr.target + speed * 0.05);
  }, { passive: true });
  hero.addEventListener("pointerleave", function () { ptr.target = 0; });

  /* mobile: no cursor — a slow autonomous drift moves through the field */
  var autonomous = matchMedia("(hover: none)").matches;

  /* ---- resize ---- */
  function resize() {
    var w = Math.max(canvas.clientWidth, 2), h = Math.max(canvas.clientHeight, 2);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener("resize", resize);

  /* ---- scroll hook for the main script ---- */
  window.HBE_STRANDS = { setScroll: function (p) { uniforms.uScroll.value = p; } };

  /* ---- render loop: pause offscreen / hidden tab ---- */
  var running = false, rafId = null, onScreen = true, visible = true, started = false, t0 = performance.now();
  function frame(now) {
    rafId = requestAnimationFrame(frame);
    var t = (now - t0) / 1000;
    uniforms.uTime.value = t;
    if (autonomous) {
      ptr.x = Math.sin(t * 0.21) * 1.6;
      ptr.y = Math.cos(t * 0.16) * 0.8 - 0.2;
      ptr.target = 0.3;
    }
    /* spring toward the target force, then let it decay — elastic recovery */
    ptr.vel += (ptr.target - ptr.force) * 0.09;
    ptr.vel *= 0.84;
    ptr.force += ptr.vel;
    ptr.target *= 0.94;
    uniforms.uForce.value = ptr.force;
    uniforms.uPointer.value.set(ptr.x, ptr.y);
    renderer.render(scene, camera);
    if (!started) { started = true; canvas.classList.add("live"); document.body.classList.add("gl-live"); }
  }
  function play() { if (running) return; running = true; rafId = requestAnimationFrame(frame); }
  function pause() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = null; }
  function sync() { (onScreen && visible) ? play() : pause(); }

  var io = new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; sync(); }, { threshold: 0.01 });
  io.observe(canvas);
  document.addEventListener("visibilitychange", function () { visible = document.visibilityState !== "hidden"; sync(); });
  sync();
})();

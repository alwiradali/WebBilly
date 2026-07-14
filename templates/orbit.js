/* ============================================================
   ORBIT — "The Core": a living, morphing iridescent alien
   organism. A high-detail icosahedron displaced by 3D simplex
   noise in the vertex shader, shaded with a shifting thin-film
   iridescence + fresnel rim, wrapped in a glow shell and a slow
   starfield, run through UnrealBloom. Warps toward the pointer,
   breathes, and dollies on scroll. Original work.
   Degrades to nothing (canvas hidden) under reduced-motion or
   missing WebGL — the CSS aurora behind it carries the hero.
   ============================================================ */
import * as THREE from "three";
import { EffectComposer } from "./vendor/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./vendor/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./vendor/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "./vendor/jsm/postprocessing/OutputPass.js";

(function () {
  "use strict";
  var canvas = document.getElementById("orbit-gl");
  if (!canvas) return;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobile = window.matchMedia && matchMedia("(max-width: 820px)").matches;
  if (reduce) { canvas.style.display = "none"; return; }

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  } catch (e) { canvas.style.display = "none"; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.1 : 1.6));
  canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); canvas.style.display = "none"; }, false);

  var host = canvas.parentElement;
  var W = host.clientWidth, H = host.clientHeight || window.innerHeight;
  renderer.setSize(W, H);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
  camera.position.set(0, 0, 4.7);

  // ---------- simplex noise (Ashima) ----------
  var noiseGLSL = [
    "vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}",
    "vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}",
    "vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}",
    "vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}",
    "float snoise(vec3 v){const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);",
    "vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);",
    "vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);",
    "vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);",
    "vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));",
    "float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.0*floor(p*ns.z*ns.z);",
    "vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);",
    "vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));",
    "vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;",
    "vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);",
    "vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;",
    "vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;",
    "return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}"
  ].join("\n");

  var uniforms = {
    uTime: { value: 0 }, uAmp: { value: 0.34 }, uProg: { value: 0 },
    uMouse: { value: new THREE.Vector3(0, 0, 1) }
  };

  var vert = [
    "uniform float uTime; uniform float uAmp; uniform vec3 uMouse; uniform float uProg;",
    "varying vec3 vN; varying vec3 vView; varying float vD;",
    noiseGLSL,
    "void main(){",
    "  vec3 p = position;",
    "  float n  = snoise(p*1.3 + vec3(0.0, uTime*0.28, 0.0));",
    "  float n2 = snoise(p*2.7 - uTime*0.22);",
    "  float n3 = snoise(p*5.5 + uTime*0.15);",
    "  float disp = (n*0.62 + n2*0.26 + n3*0.10) * (uAmp + uProg*0.5);",
    "  float md = distance(normalize(p), normalize(uMouse));",
    "  disp += (0.5/(1.0+md*md*7.0)) * uAmp;",   // pointer bulge
    "  vec3 np = p + normal * disp;",
    "  vD = disp;",
    "  vN = normalize(normalMatrix * normal);",
    "  vec4 mv = modelViewMatrix * vec4(np,1.0);",
    "  vView = -mv.xyz;",
    "  gl_Position = projectionMatrix * mv;",
    "}"
  ].join("\n");

  var frag = [
    "precision highp float;",
    "uniform float uTime;",
    "varying vec3 vN; varying vec3 vView; varying float vD;",
    "vec3 pal(float t){ return 0.5 + 0.5*cos(6.28318*(t + vec3(0.00,0.33,0.67))); }",
    "void main(){",
    "  vec3 V = normalize(vView); vec3 N = normalize(vN);",
    "  float fres = pow(1.0 - max(dot(V,N),0.0), 2.6);",
    "  float t = fres*1.15 + vD*1.7 + uTime*0.05;",
    "  vec3 irid = pal(t);",
    "  irid = mix(irid, vec3(0.20,0.55,1.0), 0.35);",       // bias toward alien blue
    "  vec3 col = mix(vec3(0.02,0.03,0.08), irid*0.7, clamp(fres*1.15+0.10,0.0,1.0));",
    "  col += fres * vec3(0.30,0.52,0.95) * 0.55;",          // subtle glowing rim (bloom catches this)
    "  col += pow(fres,5.0) * vec3(0.8,0.7,1.1) * 0.5;",     // hot violet edge, tamed
    "  gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n");

  var geo = new THREE.IcosahedronGeometry(1.55, mobile ? 5 : 7);
  var mat = new THREE.ShaderMaterial({ uniforms: uniforms, vertexShader: vert, fragmentShader: frag });
  var core = new THREE.Mesh(geo, mat);
  var group = new THREE.Group(); group.add(core); group.position.x = 1.15; scene.add(group);

  // faint outer glow shell
  var shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.9, 2),
    new THREE.MeshBasicMaterial({ color: 0x2b6bff, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, wireframe: true })
  );
  group.add(shell);

  // ---------- starfield ----------
  var SN = mobile ? 1400 : 3200;
  var sp = new Float32Array(SN * 3), ss = new Float32Array(SN);
  for (var i = 0; i < SN; i++) {
    var r = 8 + Math.pow((i % 100) / 100, 0.5) * 26;
    var th = (i * 2.399963), ph = Math.acos(1 - 2 * ((i * 0.61803) % 1));
    sp[i * 3] = r * Math.sin(ph) * Math.cos(th);
    sp[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    sp[i * 3 + 2] = r * Math.cos(ph) - 6;
    ss[i] = 0.4 + ((i * 0.123) % 1) * 0.9;
  }
  var sgeo = new THREE.BufferGeometry();
  sgeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  sgeo.setAttribute("aS", new THREE.BufferAttribute(ss, 1));
  var stars = new THREE.Points(sgeo, new THREE.ShaderMaterial({
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    uniforms: { uPix: { value: renderer.getPixelRatio() } },
    vertexShader: "attribute float aS; uniform float uPix; varying float vA; void main(){ vA=aS; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=aS*2.2*uPix*(1.0/-mv.z)*14.0; gl_Position=projectionMatrix*mv; }",
    fragmentShader: "varying float vA; void main(){ vec2 c=gl_PointCoord-0.5; float d=length(c); float a=smoothstep(0.5,0.0,d); gl_FragColor=vec4(vec3(0.7,0.82,1.0), a*vA*0.7); }"
  }));
  scene.add(stars);

  // ---------- bloom (desktop only) ----------
  var composer = null, bloom = null;
  if (!mobile) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.5, 0.6, 0.4);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  // ---------- interaction ----------
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
  }
  window.addEventListener("resize", resize);

  var t = 0, last = 0, raf = null, prog = 0;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    t += dt; uniforms.uTime.value = t;
    prog += (progress() - prog) * 0.06; uniforms.uProg.value = prog;
    mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
    uniforms.uMouse.value.set(mx * 1.6, -my * 1.6, 1.0);
    group.rotation.y += dt * 0.12 + mx * 0.0008;
    group.rotation.x += (my * 0.4 - group.rotation.x) * 0.03;
    stars.rotation.y += dt * 0.01;
    camera.position.z = 4.7 - prog * 1.1;
    camera.position.x += (mx * 0.5 - camera.position.x) * 0.04;
    camera.position.y += (-my * 0.4 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
    if (composer) composer.render(); else renderer.render(scene, camera);
  }
  function start() { if (raf == null) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  function stop() { if (raf != null) { cancelAnimationFrame(raf); raf = null; } }
  start();
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { (e.isIntersecting && !document.hidden) ? start() : stop(); });
    }, { threshold: 0 }).observe(host);
  }
})();

/* ============================================================
   ORBIT — scroll-assembled product window
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var app = document.getElementById("app");
  if (!app) return;
  var g = window.gsap, ST = window.ScrollTrigger;
  var sideItems = app.querySelectorAll('[data-app="side"]');
  var cards = app.querySelectorAll('[data-app="card"]');
  var pill = app.querySelector('[data-app="pill"]');
  var cur = document.getElementById("app-cursor");
  if (!g || !ST || reduce) { if (cur) cur.style.opacity = 0; return; }
  g.registerPlugin(ST);
  g.set(app, { rotateX: 16, scale: 0.92, opacity: 0.45, transformPerspective: 1200, transformOrigin: "50% 100%" });
  g.set(sideItems, { x: -14, opacity: 0 });
  g.set(cards, { y: 26, opacity: 0, scale: 0.96 });
  if (pill) g.set(pill, { opacity: 0, y: -6 });
  if (cur) g.set(cur, { opacity: 0 });
  var tl = g.timeline({ scrollTrigger: { trigger: ".showcase", start: "top top", end: "+=160%", scrub: 0.6, pin: ".stage", pinSpacing: true, invalidateOnRefresh: true } });
  tl.to(app, { rotateX: 0, scale: 1, opacity: 1, duration: 1.1, ease: "power3.out" }, 0)
    .to(sideItems, { x: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: "power2.out" }, 0.5)
    .to(pill || {}, { opacity: 1, y: 0, duration: 0.5 }, 0.7)
    .to(cards, { y: 0, opacity: 1, scale: 1, duration: 0.7, stagger: 0.09, ease: "power2.out" }, 0.9);
  if (cur) {
    tl.to(cur, { opacity: 1, duration: 0.3 }, 1.2)
      .to(cur, { x: 120, y: -60, duration: 1.0, ease: "power1.inOut" }, 1.3)
      .to(cur, { scale: 0.8, duration: 0.12, yoyo: true, repeat: 1 }, 2.2)
      .to(cur, { x: 40, y: 30, duration: 0.9, ease: "power1.inOut" }, 2.5)
      .to(cur, { opacity: 0, duration: 0.4 }, 3.3);
  }
})();

/* ============================================================
   ORBIT — 3D tilt on image feature cards
   ============================================================ */
(function () {
  "use strict";
  var touch = window.matchMedia && matchMedia("(hover: none)").matches;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (touch || reduce) return;
  document.querySelectorAll("[data-tilt]").forEach(function (el) {
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transition = "transform 0s";
      el.style.transform = "perspective(800px) rotateY(" + (px * 7).toFixed(2) + "deg) rotateX(" + (-py * 7).toFixed(2) + "deg)";
    });
    el.addEventListener("pointerleave", function () {
      el.style.transition = "transform .5s cubic-bezier(.2,.7,.2,1)";
      el.style.transform = "";
    });
  });
})();

/* ============================================================
   ORBIT — animated dashboard (line draws, bars grow)
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var stroke = document.querySelector(".dash-stroke");
  var area = document.querySelector(".dash-area");
  var bars = document.querySelectorAll(".dash-bars i");
  if (!stroke && !bars.length) return;
  var g = window.gsap, ST = window.ScrollTrigger;
  if (!g || !ST || reduce) {
    if (stroke) stroke.style.strokeDasharray = "none";
    bars.forEach(function (b) { b.style.transform = "none"; });
    return;
  }
  g.registerPlugin(ST);
  var trig = { trigger: ".dash-panel", start: "top 80%", once: true };
  if (stroke) {
    var len = stroke.getTotalLength();
    g.set(stroke, { strokeDasharray: len, strokeDashoffset: len });
    g.to(stroke, { strokeDashoffset: 0, duration: 1.9, ease: "power2.out", scrollTrigger: trig });
  }
  if (area) { g.set(area, { opacity: 0 }); g.to(area, { opacity: 1, duration: 1.5, ease: "power1.out", scrollTrigger: trig }); }
  if (bars.length) g.to(bars, { scaleY: 1, duration: 0.7, stagger: 0.06, ease: "power2.out", scrollTrigger: trig });
})();

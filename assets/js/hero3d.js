/* ============================================================
   Billy Digitals — Homepage hero 3D particle field
   ~16k points on a sphere, displaced by 3D simplex noise in the
   vertex shader, additive, through UnrealBloom. Brand blue/cyan/
   violet. Pointer parallax + gentle auto-rotate. Renders into the
   existing #heroGL canvas. Pauses when the hero scrolls off-screen.
   ============================================================ */
import * as THREE from "three";
import { EffectComposer } from "../../templates/vendor/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "../../templates/vendor/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "../../templates/vendor/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "../../templates/vendor/jsm/postprocessing/OutputPass.js";

(function () {
  "use strict";
  var canvas = document.getElementById("heroGL");
  if (!canvas) return;
  var host = document.querySelector(".hero") || canvas.parentElement;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobile = window.matchMedia && matchMedia("(max-width: 720px)").matches;

  var renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: true, powerPreference: "high-performance" }); }
  catch (e) { canvas.style.display = "none"; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.3 : 1.7));
  var W = host.clientWidth, H = host.clientHeight || window.innerHeight;
  renderer.setSize(W, H);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 100);
  camera.position.set(0, 0, 14);

  var N = mobile ? 8000 : 16000, R = 6.0;
  var pos = new Float32Array(N * 3), rnd = new Float32Array(N);
  var golden = Math.PI * (3 - Math.sqrt(5));
  for (var i = 0; i < N; i++) {
    var y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = golden * i;
    pos[i * 3] = Math.cos(th) * r * R; pos[i * 3 + 1] = y * R; pos[i * 3 + 2] = Math.sin(th) * r * R;
    rnd[i] = Math.random();
  }
  var geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aRnd", new THREE.BufferAttribute(rnd, 1));

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
  var vert = [
    "uniform float uTime; uniform float uSize; uniform float uPix; uniform vec3 uMouse;",
    "attribute float aRnd; varying float vN; varying float vY;",
    noiseGLSL,
    "void main(){vec3 p=position;float n=snoise(p*0.32+vec3(0.0,uTime*0.13,0.0));float n2=snoise(p*0.72-uTime*0.09);",
    "vec3 dir=normalize(p);vec3 disp=p+dir*(n*1.05+n2*0.45);",
    "float md=distance(disp,uMouse);disp+=dir*(1.1/(1.0+md*md))*0.8;",
    "vN=n;vY=disp.y;vec4 mv=modelViewMatrix*vec4(disp,1.0);",
    "gl_PointSize=uSize*uPix*(1.0/-mv.z)*(0.55+aRnd*0.9);gl_Position=projectionMatrix*mv;}"
  ].join("\n");
  var frag = [
    "precision highp float;uniform vec3 uCA;uniform vec3 uCB;uniform vec3 uCC;varying float vN;varying float vY;",
    "void main(){vec2 uv=gl_PointCoord-0.5;float d=length(uv);float a=smoothstep(0.5,0.02,d);if(a<=0.001)discard;",
    "vec3 col=mix(uCA,uCB,smoothstep(-1.0,1.0,vN));col=mix(col,uCC,smoothstep(-0.6,0.9,vY*0.16));gl_FragColor=vec4(col,a*0.9);}"
  ].join("\n");

  var uniforms = {
    uTime: { value: 0 }, uSize: { value: mobile ? 40 : 50 }, uPix: { value: renderer.getPixelRatio() },
    uMouse: { value: new THREE.Vector3(999, 999, 999) },
    uCA: { value: new THREE.Color("#2b7fff") }, uCB: { value: new THREE.Color("#22d3ee") }, uCC: { value: new THREE.Color("#7c3aed") }
  };
  var mat = new THREE.ShaderMaterial({ uniforms: uniforms, vertexShader: vert, fragmentShader: frag, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
  var group = new THREE.Group(); group.add(new THREE.Points(geo, mat)); scene.add(group);

  var composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  var bloom = new UnrealBloomPass(new THREE.Vector2(W, H), reduce ? 0.35 : 0.8, 0.75, 0.2);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  var tmx = 0, tmy = 0, mx = 0, my = 0;
  window.addEventListener("pointermove", function (e) { tmx = (e.clientX / window.innerWidth - 0.5) * 2; tmy = (e.clientY / window.innerHeight - 0.5) * 2; }, { passive: true });
  function resize() {
    W = host.clientWidth; H = host.clientHeight || window.innerHeight;
    camera.aspect = W / H; camera.updateProjectionMatrix();
    renderer.setSize(W, H); composer.setSize(W, H); bloom.setSize(W, H); uniforms.uPix.value = renderer.getPixelRatio();
  }
  window.addEventListener("resize", resize);

  var t = 0, last = 0, raf = null, onScreen = true;
  function start() { if (raf == null && onScreen && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  function stop() { if (raf != null) { cancelAnimationFrame(raf); raf = null; } }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    t += dt * (reduce ? 0.3 : 1); uniforms.uTime.value = t;
    mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
    uniforms.uMouse.value.set(mx * 6, -my * 5, 5);
    group.rotation.y += dt * (reduce ? 0.02 : 0.055);
    group.rotation.x += (my * 0.2 - group.rotation.x) * 0.03;
    camera.position.x += (mx * 1.0 - camera.position.x) * 0.04;
    camera.position.y += (-my * 0.7 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
    composer.render();
  }
  start();
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { onScreen = e.isIntersecting; onScreen ? start() : stop(); });
    }, { threshold: 0 }).observe(host);
  }
})();

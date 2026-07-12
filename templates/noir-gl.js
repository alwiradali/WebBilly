/* ============================================================
   Noir District — WebGL hero.
   A slow river of liquid obsidian threaded with champagne-gold
   light, rendered as a domain-warped fbm shader on a full-screen
   quad. Deliberately restrained: dark, quiet, expensive. Pauses
   offscreen / on a hidden tab; honours reduced-motion with a
   single still frame.
   ============================================================ */
import * as THREE from "three";

(function () {
  "use strict";
  var canvas = document.querySelector(".hero-gl");
  if (!canvas) return;

  var gl;
  try { gl = canvas.getContext("webgl2") || canvas.getContext("webgl"); }
  catch (e) { gl = null; }
  if (!gl) { canvas.classList.add("gl-off"); return; }   // CSS gradient fallback

  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  var scene = new THREE.Scene();
  var camera = new THREE.Camera();

  var uniforms = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) }
  };

  var mat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: [
      "varying vec2 vUv;",
      "void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }"
    ].join("\n"),
    fragmentShader: [
      "precision highp float;",
      "varying vec2 vUv;",
      "uniform float uTime;",
      "uniform vec2 uRes;",
      "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }",
      "float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);",
      "  float a=hash(i), b=hash(i+vec2(1.0,0.0)), c=hash(i+vec2(0.0,1.0)), d=hash(i+vec2(1.0,1.0));",
      "  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }",
      "float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<6;i++){ v+=a*noise(p); p*=2.02; a*=0.5; } return v; }",
      "void main(){",
      "  vec2 uv = vUv; vec2 p = uv * 3.0; p.x *= uRes.x / max(uRes.y, 1.0);",
      "  float t = uTime * 0.05;",
      "  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, -t)));",
      "  vec2 r = vec2(fbm(p + 2.0*q + vec2(1.7, 9.2) + t*0.5), fbm(p + 2.0*q + vec2(8.3, 2.8) - t*0.5));",
      "  float f = fbm(p + 2.5*r);",
      "  vec3 obsidian = vec3(0.028, 0.028, 0.042);",
      "  vec3 deep     = vec3(0.065, 0.055, 0.075);",
      "  vec3 gold     = vec3(0.86, 0.67, 0.37);",
      "  vec3 col = mix(obsidian, deep, clamp(f*1.4, 0.0, 1.0));",
      "  float vein = smoothstep(0.60, 0.96, f + 0.35*r.x);",
      "  col = mix(col, gold, vein*0.9);",
      "  float d = distance(uv, vec2(0.5, 0.42));",
      "  col += gold * 0.06 * smoothstep(0.7, 0.0, d);",     // warm core glow
      "  col *= smoothstep(1.18, 0.32, d);",                 // vignette
      "  gl_FragColor = vec4(col, 1.0);",
      "}"
    ].join("\n")
  });

  var quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  scene.add(quad);

  function resize() {
    var w = Math.max(canvas.clientWidth, 2), h = Math.max(canvas.clientHeight, 2);
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w, h);
  }
  resize();
  var ro = ("ResizeObserver" in window) ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(canvas); else window.addEventListener("resize", resize);

  var running = false, rafId = null, onScreen = true, visible = true, last = 0;

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016; last = now;
    uniforms.uTime.value += dt;
    renderer.render(scene, camera);
  }
  function play() { if (running) return; running = true; last = 0; rafId = requestAnimationFrame(frame); }
  function pause() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = null; }
  function sync() { (onScreen && visible && !reduce) ? play() : pause(); }

  if (reduce) { renderer.render(scene, camera); }   // one still frame, then rest

  var io = new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; sync(); }, { threshold: 0.01 });
  io.observe(canvas);
  document.addEventListener("visibilitychange", function () { visible = document.visibilityState !== "hidden"; sync(); });
  sync();
})();

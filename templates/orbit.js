/* ============================================================
   ORBIT — live aurora background (raw WebGL2, no libraries)
   A fullscreen fragment shader: domain-warped fbm aurora ribbons
   in brand blue / cyan / violet, warped by the pointer and dimmed
   as you scroll. Original work. Degrades to a CSS gradient if
   WebGL2 is unavailable or reduced-motion is set.
   ============================================================ */
(function () {
  "use strict";
  var canvas = document.getElementById("orbit-gl");
  if (!canvas) return;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance" });
  if (!gl) { canvas.style.display = "none"; return; }

  var VERT =
    "#version 300 es\n" +
    "void main(){ vec2 p[3]=vec2[3](vec2(-1.,-1.),vec2(3.,-1.),vec2(-1.,3.)); gl_Position=vec4(p[gl_VertexID],0.,1.); }";

  var FRAG =
    "#version 300 es\n" +
    "precision highp float;\n" +
    "uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uScroll;\n" +
    "out vec4 o;\n" +
    "float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }\n" +
    "float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);\n" +
    "  float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));\n" +
    "  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }\n" +
    "float fbm(vec2 p){ float v=0.,a=.5; mat2 m=mat2(1.6,1.2,-1.2,1.6);\n" +
    "  for(int i=0;i<6;i++){ v+=a*noise(p); p=m*p; a*=.5; } return v; }\n" +
    "void main(){\n" +
    "  vec2 uv=(gl_FragCoord.xy-0.5*uRes)/uRes.y;\n" +
    "  vec2 m=(uMouse-0.5*uRes)/uRes.y;\n" +
    "  float t=uTime*0.06;\n" +
    "  vec2 q=vec2(fbm(uv*1.5+t), fbm(uv*1.5-t+3.7));\n" +
    "  vec2 r=vec2(fbm(uv*1.5+q*1.8+t*1.3+1.7), fbm(uv*1.5+q*1.8-t*1.1+9.2));\n" +
    "  float f=fbm(uv*1.5+r*2.2+m*0.55);\n" +
    "  float band=sin(uv.y*3.0+f*3.2+t*4.0)*0.5+0.5;\n" +
    "  vec3 c1=vec3(0.10,0.30,1.00);\n" +
    "  vec3 c2=vec3(0.14,0.83,0.97);\n" +
    "  vec3 c3=vec3(0.72,0.28,0.95);\n" +
    "  vec3 col=mix(c1,c2,f);\n" +
    "  col=mix(col,c3,clamp(r.x*0.8,0.0,1.0));\n" +
    "  col*=0.32+band*0.95;\n" +
    "  col*=1.0-uScroll*0.4;\n" +
    "  float vig=smoothstep(1.35,0.15,length(uv));\n" +
    "  col*=vig;\n" +
    "  col=mix(vec3(0.02,0.03,0.09),col,clamp(f*1.35+0.12,0.0,1.0));\n" +
    "  col=col/(col+0.6);\n" +               // soft tonemap
    "  o=vec4(col,1.0);\n" +
    "}";

  function sh(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { return null; }
    return s;
  }
  var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { canvas.style.display = "none"; return; }
  var prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.style.display = "none"; return; }
  gl.useProgram(prog);
  var uRes = gl.getUniformLocation(prog, "uRes");
  var uTime = gl.getUniformLocation(prog, "uTime");
  var uMouse = gl.getUniformLocation(prog, "uMouse");
  var uScroll = gl.getUniformLocation(prog, "uScroll");
  var vao = gl.createVertexArray(); gl.bindVertexArray(vao);

  var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  var mx = 0, my = 0, tmx = 0, tmy = 0, scroll = 0;
  function resize() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener("resize", resize); resize();
  window.addEventListener("pointermove", function (e) {
    tmx = e.clientX * dpr; tmy = (window.innerHeight - e.clientY) * dpr;
  }, { passive: true });
  window.addEventListener("scroll", function () {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    scroll = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
  }, { passive: true });

  var t0 = performance.now(), raf = null, running = false;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
    var t = (now - t0) / 1000 * (reduce ? 0.25 : 1);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, t);
    gl.uniform2f(uMouse, mx, my);
    gl.uniform1f(uScroll, scroll);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function start() { if (!running) { running = true; raf = requestAnimationFrame(frame); } }
  function stop() { if (running) { running = false; cancelAnimationFrame(raf); } }
  start();
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { (e.isIntersecting && !document.hidden) ? start() : stop(); });
    }, { threshold: 0 }).observe(canvas);
  }
})();

/* ============================================================
   ORBIT — scroll-assembled product window
   Pins the app mock and builds it piece-by-piece as you scroll:
   window tilts flat, sidebar + cards stagger in, a cursor drifts
   in and "clicks". Uses the GSAP/ScrollTrigger already loaded by
   atelier.js. Degrades to a fully-visible static window.
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

  if (!g || !ST || reduce) {
    // static reveal
    if (cur) cur.style.opacity = 0;
    return;
  }
  g.registerPlugin(ST);

  g.set(app, { rotateX: 16, scale: 0.92, opacity: 0.45, transformPerspective: 1200, transformOrigin: "50% 100%" });
  g.set(sideItems, { x: -14, opacity: 0 });
  g.set(cards, { y: 26, opacity: 0, scale: 0.96 });
  if (pill) g.set(pill, { opacity: 0, y: -6 });
  if (cur) g.set(cur, { opacity: 0 });

  var tl = g.timeline({
    scrollTrigger: {
      trigger: ".showcase", start: "top top",
      end: "+=160%", scrub: 0.6, pin: ".stage", pinSpacing: true, invalidateOnRefresh: true
    }
  });
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

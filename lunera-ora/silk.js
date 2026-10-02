/* ═══════════════════════════════════════════════════════════════════════════
   LUNERA ORA · SILK
   The liquid satin behind the hero and the closing call to book — her whole
   brand is shot on satin, so the page is too. One WebGL canvas, fixed behind
   the page; sections that want satin are simply transparent "windows" onto it
   (`[data-silk-window]`). The render loop runs only while a window is on
   screen, at a capped pixel ratio, and stops under reduced motion (one still
   frame is drawn instead). With no WebGL the canvas is removed and the CSS
   fallback (a still of this same shader, /assets/lunera-ora/satin.webp) shows.

   The surface is a height field: two layers of domain-warped folds, a slow
   drift, and a soft swell that follows the pointer. Its normal is lit like
   satin — a broad diffuse, a long anisotropic sheen and a sharp specular —
   in her pearl, blush and taupe. A few glints twinkle on the brightest
   crests (her captions use ✨ on almost every post).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var canvas = document.querySelector("[data-silk]");
  if (!canvas) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var gl = canvas.getContext("webgl", { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: "high-performance" });
  if (!gl) { canvas.remove(); document.documentElement.classList.add("no-silk"); return; }

  var VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";

  var SCALE = "5.0";
  var FRAG = [
    "precision highp float;",
    "uniform vec2 uRes;uniform float uTime;uniform vec2 uMouse;uniform float uPress;uniform float uScroll;",
    "uniform vec3 uBase;uniform vec3 uShade;uniform vec3 uBlush;uniform vec3 uDeep;",

    // Folds: warped sine sheets. Sines (not noise) give the long continuous
    // ridges real satin makes; the two warps bend them into S-curves.
    "float folds(vec2 p,float t){",
    "  vec2 q=p;",
    "  q+=0.95*vec2(sin(q.y*0.85+t*0.9),cos(q.x*0.75-t*0.7));",
    "  q+=0.42*vec2(sin(q.y*1.90-t*0.6+1.7),cos(q.x*1.70+t*0.8+0.4));",
    "  float a=sin(q.x*2.05+q.y*0.80+t*0.35);",
    "  float b=sin(-q.x*0.70+q.y*2.15-t*0.30+2.1);",
    "  float c=sin((q.x-q.y)*3.4+t*0.25);",
    "  return a*0.58+b*0.46+c*0.10;",
    "}",

    "float height(vec2 p,float t){",
    "  vec2 d=p-uMouse;",
    "  float r=dot(d,d);",
    "  return folds(p,t)+0.42*exp(-r*1.4)*(0.7+0.5*uPress);", // the swell under the pointer
    "}",

    "float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",

    "void main(){",
    "  vec2 uv=gl_FragCoord.xy/uRes;",
    "  float asp=uRes.x/uRes.y;",
    "  vec2 p=(uv-0.5)*vec2(asp,1.0)*"+SCALE+";",
    "  p.y+=uScroll;",
    "  float t=uTime*0.11;",
    "  float e=0.003;",
    "  float h=height(p,t);",
    "  float hx=height(p+vec2(e,0.),t)-h;",
    "  float hy=height(p+vec2(0.,e),t)-h;",
    "  vec3 n=normalize(vec3(-hx/e*0.30,-hy/e*0.30,1.0));",

    "  vec3 L=normalize(vec3(-0.35+uMouse.x*0.03,0.55+uMouse.y*0.03,0.80));",
    "  vec3 H=normalize(L+vec3(0.,0.,1.));",
    "  float d=dot(n,L);",
    "  float nh=clamp(dot(n,H),0.,1.);",

    // colour: deep in the creases, shade on the turned-away slopes, pearl on
    // the faces, a broad satin streak and a crisp line where they meet the light
    "  float blushMix=smoothstep(0.0,1.0,uv.x*0.55+(1.0-uv.y)*0.45+0.18*sin(t*1.3+p.y*0.6))*0.5;",
    "  vec3 base=mix(uBase,uBlush,blushMix);",
    "  vec3 col=mix(uDeep,uShade,smoothstep(0.10,0.52,d));",
    "  col=mix(col,base,smoothstep(0.50,0.86,d));",
    "  col=mix(col,vec3(1.0,0.992,0.988),smoothstep(0.958,0.9995,nh)*0.72);",
    "  col+=vec3(1.0,0.99,0.985)*pow(nh,160.0)*0.45;",

    // glints on the brightest crests
    "  vec2 g=floor(gl_FragCoord.xy/3.0);",
    "  float star=step(0.9972,hash(g));",
    "  float tw=0.5+0.5*sin(uTime*2.2+hash(g+3.1)*40.0);",
    "  col+=star*tw*smoothstep(0.985,0.999,nh)*0.9;",

    // a soft pool of light where the logo sits
    "  float v=smoothstep(1.15,0.15,length((uv-vec2(0.5,0.54))*vec2(asp*0.62,1.0)));",
    "  col=mix(col,vec3(0.975,0.962,0.955),0.42*v);",
    "  gl_FragColor=vec4(col,1.0);",
    "}"
  ].join("\n");

  function shader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  var vs = shader(gl.VERTEX_SHADER, VERT), fs = shader(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { canvas.remove(); document.documentElement.classList.add("no-silk"); return; }
  var prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); document.documentElement.classList.add("no-silk"); return; }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var U = {};
  ["uRes", "uTime", "uMouse", "uPress", "uScroll", "uBase", "uShade", "uBlush", "uDeep"].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });

  function hex(h) { var n = parseInt(h.replace("#", ""), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
  // Sampled from her own satin backdrops (story covers + the pink founder post).
  gl.uniform3fv(U.uBase, hex("#f3ece8"));
  gl.uniform3fv(U.uShade, hex("#c7b3ab"));
  gl.uniform3fv(U.uBlush, hex("#e7c6ba"));
  gl.uniform3fv(U.uDeep, hex("#a28a80"));

  var small = window.matchMedia("(max-width: 700px)").matches;
  var DPR = Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5);
  var W = 0, H = 0;
  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    // On phones the toolbar resizing the viewport would restart the frame;
    // only re-allocate when the width changes or the height grows a lot.
    if (w === W && Math.abs(h - H) < 120 && W) return;
    W = w; H = h;
    canvas.width = Math.round(w * DPR);
    canvas.height = Math.round(h * DPR);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    if (!running) draw(performance.now());
  }

  // pointer in the shader's coordinate space, eased
  var mx = 0.35, my = 0.15, tx = mx, ty = my, press = 0, tpress = 0;
  window.addEventListener("pointermove", function (e) {
    var asp = W / H;
    tx = (e.clientX / W - 0.5) * asp * +SCALE;
    ty = (0.5 - e.clientY / H) * +SCALE;
  }, { passive: true });
  window.addEventListener("pointerdown", function () { tpress = 1; }, { passive: true });
  window.addEventListener("pointerup", function () { tpress = 0; }, { passive: true });

  var scrollY = 0;
  var t0 = performance.now(), last = t0, clock = 0;
  function draw(now) {
    var dt = Math.min(64, now - last); last = now;
    clock += dt / 1000;
    mx += (tx - mx) * 0.045; my += (ty - my) * 0.045;
    press += (tpress - press) * 0.06;
    gl.uniform1f(U.uTime, reduce ? 4.0 : clock + 6.0);
    gl.uniform2f(U.uMouse, mx, my + scrollY);
    gl.uniform1f(U.uPress, press);
    gl.uniform1f(U.uScroll, scrollY);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  var running = false, visible = 0, raf = 0, seen = [];
  function loop(now) {
    if (!running) return;
    scrollY = window.scrollY / Math.max(1, H) * 0.35;
    draw(now);
    raf = requestAnimationFrame(loop);
  }
  function start() { if (running || reduce || document.hidden) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  var windows = document.querySelectorAll("[data-silk-window]");
  if ("IntersectionObserver" in window && windows.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var i = seen.indexOf(en.target);
        if (en.isIntersecting && i < 0) seen.push(en.target);
        if (!en.isIntersecting && i > -1) seen.splice(i, 1);
      });
      visible = seen.length;
      canvas.style.visibility = visible ? "visible" : "hidden";
      if (visible) start(); else stop();
    }, { rootMargin: "80px 0px" });
    windows.forEach(function (w) { io.observe(w); });
  } else start();

  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else if (visible) start(); });
  window.addEventListener("resize", resize);
  resize();
  draw(performance.now());
  document.documentElement.classList.add("has-silk");
})();

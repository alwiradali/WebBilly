/* ============================================================
   ORBIT — living caustic-silk background (raw WebGL, zero deps).
   Same technique as the Meridian flagship, in ORBIT's own
   colourway: cool cyan-blue at the top of the page, a drifting
   blue/violet spectrum through the middle, warming to violet-
   magenta toward the end. Reacts to the pointer and scroll.
   Degrades to the CSS backdrop under reduced-motion / no WebGL.
   ============================================================ */
(function () {
  "use strict";
  var canvas = document.getElementById("orbit-gl");
  if (!canvas) return;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobile = window.matchMedia && matchMedia("(max-width: 820px)").matches;
  if (reduce) { canvas.style.display = "none"; return; }

  var gl = null;
  try {
    gl = canvas.getContext("webgl", { antialias: false, alpha: true, powerPreference: "high-performance" })
      || canvas.getContext("experimental-webgl");
  } catch (e) {}
  if (!gl) { canvas.style.display = "none"; return; }
  canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); canvas.style.display = "none"; }, false);

  var FS = [
    'precision highp float;',
    'uniform vec2 uRes; uniform float uT; uniform vec2 uM; uniform float uWarm; uniform float uAmp; uniform float uProg;',
    'vec2 h2(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return -1.+2.*fract(sin(p)*43758.5453);}',
    'float nz(vec2 p){const float K1=.366025404,K2=.211324865;',
    ' vec2 i=floor(p+(p.x+p.y)*K1),a=p-i+(i.x+i.y)*K2;float m=step(a.y,a.x);vec2 o=vec2(m,1.-m),b=a-o+K2,c=a-1.+2.*K2;',
    ' vec3 h=max(.5-vec3(dot(a,a),dot(b,b),dot(c,c)),0.);',
    ' vec3 n=h*h*h*h*vec3(dot(a,h2(i)),dot(b,h2(i+o)),dot(c,h2(i+1.)));return dot(n,vec3(70.));}',
    'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<OCT;i++){v+=a*nz(p);p*=2.03;a*=.5;}return v;}',
    'void main(){',
    ' vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;',
    ' float t=uT*.038;',
    ' vec2 m=(uM-.5)*vec2(uRes.x/uRes.y,1.)*2.;',
    ' float md=length(uv-m);',
    ' vec2 p=uv*1.55;',
    ' p+=.20*vec2(fbm(p+vec2(0.,t)),fbm(p+vec2(t,3.1)));',
    ' p+=.11*vec2(fbm(p*2.2+vec2(t*1.4,5.2)),fbm(p*2.2+vec2(1.7,-t*1.1)));',
    ' p+=.07*normalize(uv-m+1e-4)*exp(-md*2.4);',
    ' float f1=pow(1.-abs(fbm(p*1.35+t*.5)),9.);',
    ' float f2=pow(1.-abs(fbm(p*2.7-t*.8)),15.);',
    ' float g=(f1*.72+f2*.5)*uAmp;',
    ' g*=smoothstep(1.4,.05,length(uv*vec2(.85,1.)));',
    // ORBIT colourway: cyan-blue -> violet -> magenta (no green/amber)
    ' float uCool=smoothstep(.16,0.,uProg);',
    ' float hue=.37+.11*fbm(p*.95+t*.5)+.06*uv.x+.04*sin(t*.7)+g*.05;',
    ' hue=mix(hue,.34,uCool*.7);',
    ' vec3 spec=.5+.5*cos(6.2831853*(hue+vec3(0.,.33,.67)));',
    ' vec3 mag=vec3(1.,.24,.56);',
    ' vec3 cold=mix(vec3(.02,.03,.10),spec,g);',
    ' vec3 warm=mix(vec3(.06,.02,.08),mix(vec3(.66,.30,1.),mag,.62),g);',
    ' vec3 col=mix(cold,warm,uWarm);',
    ' vec3 spec2=.5+.5*cos(6.2831853*(hue+.12+vec3(0.,.33,.67)));',
    ' col+=spec2*pow(f2,1.4)*.22*(1.-uWarm);',
    ' col+=vec3(.05,.05,.15)*pow(g,2.0);',
    ' gl_FragColor=vec4(col,1.);}'
  ].join('\n');
  var VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';

  function mk(type, src) {
    var o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o);
    return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null;
  }
  var vsh = mk(gl.VERTEX_SHADER, VS), fsh = mk(gl.FRAGMENT_SHADER, FS.replace('OCT', mobile ? '3' : '4'));
  if (!vsh || !fsh) { canvas.style.display = "none"; return; }
  var pr = gl.createProgram(); gl.attachShader(pr, vsh); gl.attachShader(pr, fsh); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { canvas.style.display = "none"; return; }
  gl.useProgram(pr);
  var bf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var la = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(la); gl.vertexAttribPointer(la, 2, gl.FLOAT, false, 0, 0);
  var U = {
    res: gl.getUniformLocation(pr, 'uRes'), t: gl.getUniformLocation(pr, 'uT'), m: gl.getUniformLocation(pr, 'uM'),
    w: gl.getUniformLocation(pr, 'uWarm'), a: gl.getUniformLocation(pr, 'uAmp'), pg: gl.getUniformLocation(pr, 'uProg')
  };
  var SC = mobile ? 0.42 : 0.62;
  function size() {
    var w = Math.max(1, Math.round(window.innerWidth * SC)), h = Math.max(1, Math.round(window.innerHeight * SC));
    canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); gl.uniform2f(U.res, w, h);
  }
  size(); window.addEventListener('resize', size);

  var M = { x: .5, y: .42, tx: .5, ty: .42 }, S = { prog: 0, pgS: 0 };
  var T0 = performance.now(), raf = null;
  var lastDraw = 0, minDelta = mobile ? (1000 / 30) : 0;   // cap mobile to ~30fps to ease GPU/battery
  function lerp(a, b, k) { return a + (b - a) * k; }
  function clamp(v, a, b) { return Math.min(Math.max(v, a), b); }
  window.addEventListener('pointermove', function (e) { M.tx = e.clientX / window.innerWidth; M.ty = 1 - e.clientY / window.innerHeight; }, { passive: true });
  function onScroll() {
    var doc = document.documentElement.scrollHeight - window.innerHeight;
    S.prog = clamp((window.pageYOffset || 0) / (doc || 1), 0, 1);
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (document.hidden) return;
    if (now - lastDraw < minDelta) return;   // frame throttle (mobile)
    lastDraw = now;
    M.x = lerp(M.x, M.tx, .045); M.y = lerp(M.y, M.ty, .045);
    var pw = S.prog;                                 // Lenis already smooths scroll
    var warm = clamp((pw - 0.6) / 0.4, 0, 1);        // warms to violet-magenta toward the end
    var amp = 1.0 - pw * 0.10;
    gl.uniform1f(U.t, (now - T0) / 1000);
    gl.uniform2f(U.m, M.x, M.y);
    gl.uniform1f(U.w, warm);
    gl.uniform1f(U.a, amp);
    gl.uniform1f(U.pg, pw);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  raf = requestAnimationFrame(loop);
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

/* ===========================================================================
   BAKED WITH AMABILIS — background field
   ---------------------------------------------------------------------------
   One fixed WebGL2 canvas behind the whole page. Two passes:

     1. a slow domain-warped fold, the way buttercream sits after it is poured
     2. a real 3-D field of sugar pearls — the pearls that finish almost every
        cake she makes — with perspective, depth of field, and a camera that
        dollies forward as you scroll

   The canvas does not sit *behind* the sections; it *is* their background. It
   renders whatever colour that chapter would have painted, so contrast is
   unchanged and the motion is a modulation of the ground rather than something
   showing through it. Sections only give up their own background once this has
   started successfully (`html.gl-on`), so any failure leaves the flat design
   exactly as it was.

   Costs one context, one buffer and one RAF. Nothing here runs under
   prefers-reduced-motion.
   =========================================================================== */
window.AmabilisGL = (function () {
  "use strict";

  /* Palettes are the CSS tokens, so the canvas reproduces the ground exactly.
     base/accent drive the fold; pearl/alpha/size/fold drive the field. */
  var TONES = {
    paper: { base: [0.969, 0.945, 0.941], accent: [0.925, 0.847, 0.867],
             pearl: [0.816, 0.612, 0.522], alpha: 0.155, size: 2.30, fold: 0.10 },
    blush: { base: [0.925, 0.847, 0.867], accent: [0.980, 0.949, 0.953],
             pearl: [1.000, 0.976, 0.949], alpha: 0.230, size: 1.95, fold: 0.11 },
    dark:  { base: [0.071, 0.051, 0.051], accent: [0.180, 0.128, 0.235],
             pearl: [0.902, 0.875, 0.894], alpha: 0.280, size: 1.05, fold: 0.20 }
  };

  var VS_FOLD =
    "#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";

  var FS_FOLD =
    "#version 300 es\nprecision highp float;out vec4 o;" +
    "uniform vec2 uRes;uniform float uTime;uniform vec2 uPtr;" +
    "uniform vec3 uBase;uniform vec3 uAccent;uniform float uFold;uniform float uCam;" +
    "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}" +
    "float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);" +
      "return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}" +
    "float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n(p);p*=2.03;a*=.5;}return s;}" +
    "void main(){" +
      "vec2 uv=gl_FragCoord.xy/uRes;vec2 p=uv;p.x*=uRes.x/uRes.y;" +
      /* the fold drifts with the camera, so the ground recedes with the scroll */
      "p.y+=uCam*0.06;" +
      "vec2 q=vec2(fbm(p*1.6+uTime*.030),fbm(p*1.6+vec2(5.2,1.3)+uTime*.024));" +
      "vec2 s=vec2(fbm(p*1.9+q*1.7+vec2(1.7,9.2)+uTime*.020)," +
                  "fbm(p*1.9+q*1.7+vec2(8.3,2.8)-uTime*.017));" +
      "float f=fbm(p*1.5+s*1.4);" +
      /* amplitude stays small on purpose — the cakes are the contrast, not this */
      "vec3 c=mix(uBase,uAccent,smoothstep(.30,.80,f)*uFold*2.0);" +
      "float d=length((uv-uPtr)*vec2(uRes.x/uRes.y,1.));" +
      "c=mix(c,uAccent,smoothstep(.55,0.,d)*uFold*0.7);" +
      "c=mix(c,uBase,smoothstep(.30,1.05,length(uv-.5)*1.25)*.45);" +
      "o=vec4(c,1.);}";

  var VS_PEARL =
    "#version 300 es\nprecision highp float;" +
    "in vec3 seed;" +
    "uniform vec2 uRes;uniform float uTime;uniform float uCam;uniform vec2 uPtr;" +
    "uniform float uDpr;uniform float uSize;uniform float uMaxPt;" +
    "out float vDepth;out float vSeed;" +
    "const float NEAR=0.62;const float FAR=9.0;" +
    "void main(){" +
      "float span=FAR-NEAR;" +
      /* the field is endless: depth wraps as the camera travels through it */
      "float z=NEAR+mod(seed.z*span-uCam+uTime*0.045,span);" +
      "float ph=seed.x*31.7+seed.y*17.3;" +
      "vec2 p=vec2(seed.x*3.6+sin(uTime*0.11+ph)*0.10," +
                  "seed.y*3.6+cos(uTime*0.09+ph*1.3)*0.10);" +
      /* near pearls answer the pointer more than far ones — that is the depth */
      "p+=uPtr*(0.30/z);" +
      "float aspect=uRes.x/uRes.y;" +
      "gl_Position=vec4(vec2(p.x/aspect,p.y)/z,0.,1.);" +
      "float r=0.011+fract(seed.x*seed.y*91.7)*0.017;" +
      "gl_PointSize=min(uRes.y*r*uSize/z*uDpr,uMaxPt);" +
      "vDepth=(z-NEAR)/span;vSeed=fract(ph);}";

  var FS_PEARL =
    "#version 300 es\nprecision highp float;" +
    "in float vDepth;in float vSeed;out vec4 o;" +
    "uniform vec3 uPearl;uniform float uAlpha;uniform float uFocus;" +
    "void main(){" +
      "vec2 c=gl_PointCoord*2.-1.;float d=dot(c,c);if(d>1.)discard;" +
      /* depth of field: the further from the focus plane, the softer the edge */
      "float blur=clamp(abs(vDepth-uFocus)*2.4,0.07,0.9);" +
      "float a=smoothstep(1.,1.-blur,d);" +
      "float body=sqrt(max(0.,1.-d));" +
      "vec2 lp=c-vec2(-0.34,0.34);float spec=exp(-dot(lp,lp)*5.5);" +
      "vec3 col=uPearl*(0.72+0.34*body)+spec*0.42;" +
      /* fade in at the far plane and out at the near one so none of them pop */
      "float edge=smoothstep(0.,0.12,vDepth)*(1.-smoothstep(0.78,1.,vDepth));" +
      "o=vec4(col,a*uAlpha*edge*(0.55+0.45*vSeed));}";

  function compile (gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      if (window.console) console.warn("[amabilis-gl]", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }
  function link (gl, vs, fs) {
    var a = compile(gl, gl.VERTEX_SHADER, vs), b = compile(gl, gl.FRAGMENT_SHADER, fs);
    if (!a || !b) return null;
    var p = gl.createProgram();
    gl.attachShader(p, a); gl.attachShader(p, b); gl.linkProgram(p);
    return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
  }
  function uniforms (gl, p, names) {
    var u = {};
    names.forEach(function (n) { u[n] = gl.getUniformLocation(p, n); });
    return u;
  }
  function lerp (a, b, t) { return a + (b - a) * t; }

  function start () {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return null;

    var cv = document.createElement("canvas");
    cv.className = "site-gl";
    cv.setAttribute("aria-hidden", "true");
    document.body.insertBefore(cv, document.body.firstChild);

    var gl = cv.getContext("webgl2", {
      alpha: false, antialias: false, depth: false, stencil: false,
      powerPreference: "low-power", preserveDrawingBuffer: false
    });
    if (!gl) { cv.remove(); return null; }               /* flat design stands */

    var pFold  = link(gl, VS_FOLD,  FS_FOLD);
    var pPearl = link(gl, VS_PEARL, FS_PEARL);
    if (!pFold || !pPearl) { cv.remove(); return null; }

    var uFold  = uniforms(gl, pFold,  ["uRes","uTime","uPtr","uBase","uAccent","uFold","uCam"]);
    var uPearl = uniforms(gl, pPearl, ["uRes","uTime","uCam","uPtr","uDpr","uSize","uMaxPt",
                                       "uPearl","uAlpha","uFocus"]);

    /* fullscreen triangle */
    var quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    var aQuad = gl.getAttribLocation(pFold, "p");

    /* the pearl field — count scales with the area it has to fill */
    var touch = matchMedia("(hover: none)").matches;
    var area  = innerWidth * innerHeight;
    var COUNT = Math.round(Math.max(touch ? 55 : 90, Math.min(touch ? 130 : 260, area / 9000)));
    var seeds = new Float32Array(COUNT * 3);
    for (var i = 0; i < COUNT; i++) {
      seeds[i*3]   = Math.random() * 2 - 1;
      seeds[i*3+1] = Math.random() * 2 - 1;
      seeds[i*3+2] = Math.random();
    }
    var field = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, field);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
    var aSeed = gl.getAttribLocation(pPearl, "seed");

    var maxPt = (gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) || [1, 64])[1] || 64;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    /* ---- chapters: which ground the canvas should be painting ------------ */
    var chapters = [];
    function measure () {
      chapters = [];
      Array.prototype.forEach.call(document.querySelectorAll("[data-gl]"), function (el) {
        if (!el.offsetParent && el.offsetHeight === 0) return;     /* e.g. the no-JS panel */
        var r = el.getBoundingClientRect();
        chapters.push({
          top: r.top + scrollY, bottom: r.bottom + scrollY,
          tone: TONES[el.getAttribute("data-gl")] || TONES.paper
        });
      });
    }
    measure();

    /* Sample the chapter under the viewport centre. Weighting by raw overlap
       averaged a dark hero into the light chapter below it and produced grey,
       so the window is deliberately narrow: a chapter holds its own colour
       until the boundary is close, then hands over quickly. */
    var blend = { base: [0,0,0], accent: [0,0,0], pearl: [0,0,0], alpha: 0, size: 1, fold: 0 };
    function sample () {
      var mid = scrollY + innerHeight * 0.5;
      var band = innerHeight * 0.22;              /* how far a hand-over reaches */
      var total = 0;
      var b = [0,0,0], a = [0,0,0], p = [0,0,0], al = 0, sz = 0, fo = 0;
      for (var i = 0; i < chapters.length; i++) {
        var c = chapters[i];
        var w;
        if (mid >= c.top + band && mid <= c.bottom - band) w = 1;
        else if (mid < c.top - band || mid > c.bottom + band) continue;
        else if (mid < c.top + band) w = (mid - (c.top - band)) / (2 * band);
        else w = ((c.bottom + band) - mid) / (2 * band);
        w = Math.max(0, Math.min(1, w));
        w = w * w * (3 - 2 * w);                  /* smoothstep the hand-over */
        if (w <= 0) continue;
        total += w;
        for (var k = 0; k < 3; k++) {
          b[k] += c.tone.base[k] * w; a[k] += c.tone.accent[k] * w; p[k] += c.tone.pearl[k] * w;
        }
        al += c.tone.alpha * w; sz += c.tone.size * w; fo += c.tone.fold * w;
      }
      if (!total) return TONES.paper;
      for (var j = 0; j < 3; j++) { b[j] /= total; a[j] /= total; p[j] /= total; }
      return { base: b, accent: a, pearl: p, alpha: al/total, size: sz/total, fold: fo/total };
    }
    /* seed the smoothed palette so the first frame is already the right ground */
    (function seed () {
      var t = sample();
      blend.base = t.base.slice(); blend.accent = t.accent.slice(); blend.pearl = t.pearl.slice();
      blend.alpha = t.alpha; blend.size = t.size; blend.fold = t.fold;
    })();

    /* ---- pointer + scroll ------------------------------------------------ */
    var ptrX = 0.5, ptrY = 0.5, tPtrX = 0.5, tPtrY = 0.5;
    addEventListener("pointermove", function (e) {
      tPtrX = e.clientX / innerWidth; tPtrY = 1 - e.clientY / innerHeight;
    }, { passive: true });

    var dpr = 1;
    function size () {
      dpr = Math.min(devicePixelRatio || 1, touch ? 1 : 1.5);
      var w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
      if (cv.width !== w || cv.height !== h) {
        cv.width = w; cv.height = h;
        gl.viewport(0, 0, w, h);
      }
    }
    size();

    var running = true;
    document.addEventListener("visibilitychange", function () {
      running = !document.hidden;
      if (running) requestAnimationFrame(frame);
    });
    addEventListener("resize", function () { size(); measure(); }, { passive: true });

    var t0 = performance.now();
    function frame (now) {
      if (!running) return;
      requestAnimationFrame(frame);
      size();

      var t = (now - t0) / 1000;
      /* the camera dollies forward through the field as the page scrolls */
      var cam = scrollY / innerHeight * 0.85;
      ptrX += (tPtrX - ptrX) * 0.045;
      ptrY += (tPtrY - ptrY) * 0.045;

      var tone = sample();
      /* Adaptive easing: a small drift glides, but a hard chapter change (paper
         straight into a dark one) has to land quickly or a fast scroll spends a
         second looking at the average of the two, which is mud. */
      var dist = Math.abs(tone.base[0] - blend.base[0]) +
                 Math.abs(tone.base[1] - blend.base[1]) +
                 Math.abs(tone.base[2] - blend.base[2]);
      var k = Math.min(0.5, 0.09 + dist * 0.55);
      for (var i = 0; i < 3; i++) {
        blend.base[i]   = lerp(blend.base[i],   tone.base[i],   k);
        blend.accent[i] = lerp(blend.accent[i], tone.accent[i], k);
        blend.pearl[i]  = lerp(blend.pearl[i],  tone.pearl[i],  k);
      }
      blend.alpha = lerp(blend.alpha, tone.alpha, k);
      blend.size  = lerp(blend.size,  tone.size,  k);
      blend.fold  = lerp(blend.fold,  tone.fold,  k);

      /* the hero carries a little more of everything, decaying over one screen */
      var boost = 1 + 0.45 * Math.max(0, 1 - scrollY / innerHeight);
      var focus = 0.34 + Math.sin(t * 0.07) * 0.18;

      /* --- fold --- */
      gl.useProgram(pFold);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(aQuad);
      gl.vertexAttribPointer(aQuad, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(uFold.uRes, cv.width, cv.height);
      gl.uniform1f(uFold.uTime, t);
      gl.uniform2f(uFold.uPtr, ptrX, ptrY);
      gl.uniform3fv(uFold.uBase, blend.base);
      gl.uniform3fv(uFold.uAccent, blend.accent);
      gl.uniform1f(uFold.uFold, blend.fold * boost);
      gl.uniform1f(uFold.uCam, cam);
      gl.disable(gl.BLEND);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.enable(gl.BLEND);

      /* --- pearls --- */
      gl.useProgram(pPearl);
      gl.bindBuffer(gl.ARRAY_BUFFER, field);
      gl.enableVertexAttribArray(aSeed);
      gl.vertexAttribPointer(aSeed, 3, gl.FLOAT, false, 0, 0);
      gl.uniform2f(uPearl.uRes, cv.width, cv.height);
      gl.uniform1f(uPearl.uTime, t);
      gl.uniform1f(uPearl.uCam, cam);
      gl.uniform2f(uPearl.uPtr, (ptrX - 0.5) * 2, (ptrY - 0.5) * 2);
      gl.uniform1f(uPearl.uDpr, dpr);
      gl.uniform1f(uPearl.uSize, blend.size);
      gl.uniform1f(uPearl.uMaxPt, maxPt);
      gl.uniform3fv(uPearl.uPearl, blend.pearl);
      gl.uniform1f(uPearl.uAlpha, blend.alpha * boost);
      gl.uniform1f(uPearl.uFocus, focus);
      gl.drawArrays(gl.POINTS, 0, COUNT);
    }

    document.documentElement.classList.add("gl-on");
    requestAnimationFrame(frame);
    requestAnimationFrame(function () { cv.style.opacity = "1"; });

    return { refresh: measure, count: COUNT };
  }

  return { start: start, TONES: TONES };
})();

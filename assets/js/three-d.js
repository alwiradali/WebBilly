/* ============================================================
   Billy Digitals — 3D layer
   1) Real-time WebGL raymarched glass object in the hero
   2) Interactive 3D tilt on service / template / plan cards
   Self-contained, no dependencies. Degrades gracefully.
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Hero WebGL glass object ----------
     Superseded by assets/js/hero3d.js (Three.js particle field),
     which owns the #heroGL canvas. Kept disabled to avoid claiming
     a second WebGL context on the same canvas. */
  (function heroGL() {
    return;
    /* eslint-disable no-unreachable */
    var cv = document.getElementById("heroGL");
    if (!cv || reduce) { if (cv) cv.style.display = "none"; return; }
    var gl = cv.getContext("webgl") || cv.getContext("experimental-webgl");
    if (!gl) { cv.style.display = "none"; return; }

    var vsrc = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
    var fsrc = [
      "precision highp float;",
      "uniform vec2 u_res; uniform float u_time; uniform vec2 u_ptr;",
      "mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0., 0.,c,-s, 0.,s,c);}",
      "mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,s, 0.,1.,0., -s,0.,c);}",
      "mat3 rotZ(float a){float c=cos(a),s=sin(a);return mat3(c,-s,0., s,c,0., 0.,0.,1.);}",
      "mat3 gRot;",
      "float sdTorus(vec3 p, vec2 t){vec2 q=vec2(length(p.xz)-t.x,p.y);return length(q)-t.y;}",
      "float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}",
      "float map(vec3 p){",
      "  p = gRot * p;",
      "  float a = sdTorus(p, vec2(1.02,0.34));",
      "  vec3 q = rotX(1.5708)*p; q += vec3(0.60,0.0,0.0);",
      "  float b = sdTorus(q, vec2(0.70,0.28));",
      "  vec3 r = rotZ(1.05)*p; r += vec3(0.0,0.0,0.30);",
      "  float c = sdTorus(r, vec2(0.55,0.22));",
      "  return smin(smin(a,b,0.5), c, 0.42);",
      "}",
      "vec3 calcN(vec3 p){vec2 e=vec2(.0018,0.);return normalize(vec3(",
      "  map(p+e.xyy)-map(p-e.xyy), map(p+e.yxy)-map(p-e.yxy), map(p+e.yyx)-map(p-e.yyx)));}",
      "vec3 aces(vec3 x){return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.,1.);}",
      "void main(){",
      "  vec2 uv=(gl_FragCoord.xy-.5*u_res)/u_res.y;",
      "  float t = u_time*0.26;",
      "  gRot = rotY(t + u_ptr.x*0.5) * rotX(0.5 + sin(u_time*0.2)*0.26 + u_ptr.y*0.32);",
      "  vec3 ro=vec3(0.,0.,12.5);",
      "  vec3 rd=normalize(vec3(uv.x, uv.y-0.02, -2.7));",
      "  float d=0., dist=0., glow=0.; vec3 p; float hit=0.;",
      "  for(int i=0;i<96;i++){",
      "    p=ro+rd*dist; d=map(p);",
      "    glow += 0.011/(0.03 + d*d);",
      "    if(d<0.0015){hit=1.;break;}",
      "    dist+=d*0.9; if(dist>18.)break;",
      "  }",
      "  vec3 col=vec3(0.); float alpha=0.;",
      "  glow = clamp(glow*0.024, 0.0, 1.05);",
      "  vec3 aura = mix(vec3(0.10,0.36,0.98), vec3(0.55,0.20,0.98), 0.5+0.5*sin(u_time*0.3));",
      "  col += aura*glow*0.62; alpha += glow*0.34;",
      "  if(hit>.5){",
      "    vec3 n=calcN(p); vec3 v=-rd;",
      "    float fres=pow(1.-max(dot(v,n),0.),3.4);",
      "    vec3 refl=reflect(rd,n);",
      "    vec3 L1=normalize(vec3(0.55,0.8,0.45));",
      "    vec3 L2=normalize(vec3(-0.7,-0.15,0.5));",
      "    float dif1=max(dot(n,L1),0.), dif2=max(dot(n,L2),0.);",
      "    vec3 cCyan=vec3(0.22,0.74,1.0), cMag=vec3(0.90,0.26,1.0);",
      "    vec3 irid=0.5+0.5*cos(6.2831*(fres*1.7 + vec3(0.0,0.33,0.66) + u_time*0.03));",
      "    vec3 base = vec3(0.008,0.012,0.03);",          // near-black obsidian body
      "    base += cCyan*dif1*0.26 + cMag*dif2*0.20;",     // faint coloured fills
      "    base += irid*fres*2.6;",                        // bright iridescent contour
      "    float up=refl.y*0.5+0.5;",
      "    base += mix(vec3(0.01,0.03,0.09), vec3(0.30,0.60,1.0), up)*fres*0.9;",
      "    float spec=pow(max(dot(refl,L1),0.),90.);  base += spec*vec3(1.0)*1.8;",
      "    float spec2=pow(max(dot(refl,L2),0.),120.); base += spec2*cMag*1.6;",
      "    base += fres*vec3(0.35,0.7,1.0)*0.8;",
      "    col += base; alpha = 1.0;",
      "  }",
      "  col = aces(col*1.15); col = pow(col, vec3(0.88));",
      "  gl_FragColor=vec4(col, clamp(alpha,0.,1.));",
      "}"
    ].join("\n");

    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { return null; }
      return s;
    }
    var vs = sh(gl.VERTEX_SHADER, vsrc), fs = sh(gl.FRAGMENT_SHADER, fsrc);
    if (!vs || !fs) { cv.style.display = "none"; return; }
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { cv.style.display = "none"; return; }
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uRes = gl.getUniformLocation(prog, "u_res");
    var uT = gl.getUniformLocation(prog, "u_time");
    var uPtr = gl.getUniformLocation(prog, "u_ptr");

    // Gentle pointer parallax — the gem leans toward the cursor.
    var ptrX = 0, ptrY = 0, tgtX = 0, tgtY = 0;
    if (window.matchMedia && matchMedia("(hover: hover)").matches) {
      window.addEventListener("pointermove", function (e) {
        tgtX = (e.clientX / window.innerWidth - 0.5) * 2;
        tgtY = (e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });
    }

    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      var r = cv.getBoundingClientRect();
      cv.width = Math.max(2, (r.width * dpr) | 0);
      cv.height = Math.max(2, (r.height * dpr) | 0);
      gl.viewport(0, 0, cv.width, cv.height);
    }
    size();
    window.addEventListener("resize", size);

    var start = 0, running = true;
    document.addEventListener("visibilitychange", function () {
      running = !document.hidden;
      if (running) requestAnimationFrame(frame);
    });
    function frame(ts) {
      if (!running) return;
      if (!start) start = ts;
      ptrX += (tgtX - ptrX) * 0.05;
      ptrY += (tgtY - ptrY) * 0.05;
      gl.uniform2f(uRes, cv.width, cv.height);
      gl.uniform1f(uT, (ts - start) / 1000);
      gl.uniform2f(uPtr, ptrX, ptrY);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();

  /* ---------- 2. Interactive 3D card tilt ---------- */
  (function cardTilt() {
    if (reduce || !window.matchMedia || !matchMedia("(hover: hover)").matches) return;
    var cards = document.querySelectorAll(".card, .tcard, .plan");
    cards.forEach(function (el) {
      var glare = document.createElement("span");
      glare.className = "tilt-glare";
      el.appendChild(glare);
      el.classList.add("tilt");
      var raf = 0;
      el.addEventListener("pointermove", function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          var r = el.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width;
          var py = (e.clientY - r.top) / r.height;
          var rx = (0.5 - py) * 9;
          var ry = (px - 0.5) * 11;
          el.style.transform = "perspective(760px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg) translateY(-6px)";
          el.style.setProperty("--gx", (px * 100).toFixed(1) + "%");
          el.style.setProperty("--gy", (py * 100).toFixed(1) + "%");
        });
      });
      el.addEventListener("pointerleave", function () {
        el.style.transform = "";
      });
    });
  })();
})();

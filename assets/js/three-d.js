/* ============================================================
   Billy Digitals — 3D layer
   1) Real-time WebGL raymarched glass object in the hero
   2) Interactive 3D tilt on service / template / plan cards
   Self-contained, no dependencies. Degrades gracefully.
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Hero WebGL glass object ---------- */
  (function heroGL() {
    var cv = document.getElementById("heroGL");
    if (!cv || reduce) { if (cv) cv.style.display = "none"; return; }
    var gl = cv.getContext("webgl") || cv.getContext("experimental-webgl");
    if (!gl) { cv.style.display = "none"; return; }

    var vsrc = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
    var fsrc = [
      "precision highp float;",
      "uniform vec2 u_res; uniform float u_time;",
      "mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0., 0.,c,-s, 0.,s,c);}",
      "mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,s, 0.,1.,0., -s,0.,c);}",
      "float sdTorus(vec3 p, vec2 t){vec2 q=vec2(length(p.xz)-t.x,p.y);return length(q)-t.y;}",
      "float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}",
      "float map(vec3 p){",
      "  p = rotY(u_time*.35) * rotX(.6+sin(u_time*.25)*.35) * p;",
      "  float a = sdTorus(p, vec2(1.0,0.36));",
      "  vec3 q = rotX(1.5708)*p; q += vec3(0.62,0.0,0.0);",
      "  float b = sdTorus(q, vec2(0.72,0.30));",
      "  return smin(a,b,0.45);",
      "}",
      "vec3 calcN(vec3 p){vec2 e=vec2(.0016,0.);return normalize(vec3(",
      "  map(p+e.xyy)-map(p-e.xyy), map(p+e.yxy)-map(p-e.yxy), map(p+e.yyx)-map(p-e.yyx)));}",
      "vec3 pal(float t){return .5+.5*cos(6.28318*(vec3(1.0)*t+vec3(0.55,0.40,0.28)));}",
      "void main(){",
      "  vec2 uv=(gl_FragCoord.xy-.5*u_res)/u_res.y;",
      "  vec3 ro=vec3(0.,0.,4.9);",
      "  vec3 rd=normalize(vec3(uv,-2.25));",
      "  float t=0.; vec3 p; float hit=0.;",
      "  for(int i=0;i<96;i++){ p=ro+rd*t; float d=map(p);",
      "    if(d<0.0012){hit=1.;break;} t+=d*0.85; if(t>7.)break; }",
      "  vec3 col=vec3(0.); float alpha=0.;",
      "  if(hit>.5){",
      "    vec3 n=calcN(p);",
      "    float fres=pow(1.-max(dot(-rd,n),0.),3.0);",
      "    vec3 refl=reflect(rd,n);",
      "    float up=refl.y*.5+.5;",
      "    vec3 env=mix(vec3(.015,.04,.11), vec3(.55,.82,1.0), up);",
      "    vec3 irid=pal(dot(n,vec3(.4,.6,.3))*.5 + u_time*.02);",
      "    col=mix(irid*.55, env, .5);",
      "    col+=fres*vec3(.65,.82,1.0)*1.35;",
      "    float spec=pow(max(dot(refl,normalize(vec3(.5,.85,.35))),0.),42.);",
      "    col+=spec*vec3(1.);",
      "    col+=pal(fres+u_time*.04)*fres*.35;",
      "    alpha=1.;",
      "  }",
      "  col=pow(col,vec3(.85));",
      "  gl_FragColor=vec4(col,alpha);",
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
      gl.uniform2f(uRes, cv.width, cv.height);
      gl.uniform1f(uT, (ts - start) / 1000);
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

/* ═══════════════════════════════════════════════════════════════════════════
   MEGACITY · 360° VIDEO

   Equirectangular video on a sphere, in about two hundred lines and its own
   WebGL context. Deliberately NOT part of the billy360 tour engine: that is
   the code a tenant's whole experience of a property runs through, it has
   been measured and tuned to stay smooth on an old phone, and a per-frame
   texture upload is precisely the kind of work that broke it before.

   WHAT MAKES 360 VIDEO DIFFERENT FROM A 360 PHOTOGRAPH

   A photograph is uploaded to the GPU once. A video has to be uploaded again
   every time it shows a new frame, and that upload is synchronous main-thread
   work — there is no asynchronous texture upload in WebGL 1. So the question
   is not whether it is expensive; it is what gives way when it is.

   The answer here: the VIDEO gives way, never the panning. If an upload costs
   more than the frame budget allows, frames are uploaded less often — the
   footage gets choppier — while dragging stays at the screen's refresh rate.
   A tenant can always look where they want; sometimes the picture updates at
   fifteen frames a second instead of thirty. The other way round would be a
   viewer that fights back when you touch it, which is how this feels broken.

   Nothing downloads until the visitor presses play.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var VS = "attribute vec2 p;varying vec2 uv;void main(){uv=p;gl_Position=vec4(p,0.,1.);}";
  /* one ray per pixel into an equirectangular map: no geometry, no mesh, and
     nothing to tessellate badly at the poles */
  var FS = [
    "precision highp float;varying vec2 uv;uniform sampler2D t;",
    "uniform vec2 res;uniform float yaw,pitch,fov;",
    "void main(){",
    "  float f=1.0/tan(fov*0.5);",
    "  vec3 d=normalize(vec3(uv.x*res.x/res.y,uv.y,-f));",
    "  float cp=cos(pitch),sp=sin(pitch);",
    "  d=vec3(d.x,d.y*cp-d.z*sp,d.y*sp+d.z*cp);",
    "  float cy=cos(yaw),sy=sin(yaw);",
    "  d=vec3(d.x*cy+d.z*sy,d.y,-d.x*sy+d.z*cy);",
    "  float u=atan(d.z,d.x)*0.15915494+0.5;",
    "  float v=acos(clamp(d.y,-1.0,1.0))*0.31830989;",
    "  gl_FragColor=texture2D(t,vec2(u,v));",
    "}"
  ].join("\n");

  var DEG = Math.PI / 180;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function pot(v) { var n = 1; while (n * 2 <= v && n < 4096) n *= 2; return n; }
  function isPot(v) { return v > 0 && (v & (v - 1)) === 0; }

  function build(host) {
    var src = host.getAttribute("data-src");
    if (!src) return;
    var label = host.getAttribute("data-title") || "360° video";
    var poster = host.getAttribute("data-poster") || "";

    /* the poster and a play button, and nothing else, until it is asked for */
    host.innerHTML = '<button type="button" class="v360-start"' + (poster ? ' style="background-image:url(' + JSON.stringify(poster) + ')"' : "") +
      ' aria-label="Play the 360 degree video, ' + esc(label) + '">' +
      '<span class="v360-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg></span>' +
      '<span class="v360-cap">360&deg; video &middot; tap to play, then drag to look around</span></button>';

    host.querySelector(".v360-start").addEventListener("click", function () { start(host, src, label); }, { once: true });
  }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function start(host, src, label) {
    var video = document.createElement("video");
    video.src = src; video.crossOrigin = "anonymous";
    video.loop = true; video.muted = true; video.playsInline = true;
    video.setAttribute("playsinline", ""); video.setAttribute("webkit-playsinline", "");
    video.preload = "auto";

    var canvas = document.createElement("canvas");
    canvas.className = "v360-canvas";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", label + " — drag to look around");
    canvas.tabIndex = 0;

    var gl = null;
    try { gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, powerPreference: "low-power" }) || canvas.getContext("experimental-webgl"); }
    catch (e) { gl = null; }
    if (!gl) return fallback(host, src, label, "This browser cannot show a 360° video.");

    host.innerHTML = "";
    host.appendChild(canvas);
    host.appendChild(controls(host, video));

    var prog = compile(gl);
    if (!prog) return fallback(host, src, label, "This browser cannot show a 360° video.");
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = { res: gl.getUniformLocation(prog, "res"), yaw: gl.getUniformLocation(prog, "yaw"),
      pitch: gl.getUniformLocation(prog, "pitch"), fov: gl.getUniformLocation(prog, "fov"), t: gl.getUniformLocation(prog, "t") };
    gl.uniform1i(U.t, 0);

    var tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([10, 12, 20]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    /* REPEAT needs a power-of-two width in WebGL 1. 4096x2048 footage gets a
       seamless join at 0°; anything else is clamped, which leaves a hairline
       at the back rather than refusing to play it. */
    var wrapSet = false;

    var cam = { yaw: 0, pitch: 0, fov: 75 };
    var drag = null, raf = 0, dead = false;
    /* How often a video frame is pushed to the GPU.
       Driven by the measured frame interval, NOT by timing the upload call:
       texImage2D from a video returns long before the work is done, so timing
       it reports 3ms for something that costs fifty. The honest signal is how
       far apart frames actually land. Measured here, 2048x1024 footage, CPU
       throttled 6x, software renderer:
           upload every frame  -> 16fps on screen
           every 2nd           -> 29fps
           every 4th           -> 59fps, the same as an empty page
       So the footage drops to fifteen frames a second and the panning stays
       at sixty, which is the right way round. On a machine that can afford it
       this settles back to 1 within a second and nothing is lost. */
    var everyNth = 1, tick = 0, lastFrameTime = -1;

    /* The shader costs one ray per pixel, so the number of pixels IS the cost.
       On a machine that cannot keep up, the picture is drawn at a lower
       resolution and scaled up by the browser — softer, and still the right
       picture, moving at the rate the finger is moving. Reducing the frame
       rate instead would make the viewer feel like it is fighting back, which
       is the thing people call broken. Starts optimistic and settles within a
       second or so, up as well as down. */
    var scale = Math.min(window.devicePixelRatio || 1, 2), frameMs = 0, lastAt = 0;
    var SCALE_MIN = 0.5, startedAt = 0, slow = 0, fast = 0;
    function pace(now) {
      if (!startedAt) startedAt = now;
      if (lastAt) {
        var dt = now - lastAt;
        frameMs = frameMs ? frameMs * 0.85 + dt * 0.15 : dt;
        /* The first second is the video opening, decoding its first frames and
           the shader compiling. Reacting to that would hand a fast phone a
           soft picture for the rest of the visit because of how it started. */
        if (now - startedAt < 1000) { lastAt = now; return; }
        /* and a single slow frame is noise, not a verdict */
        slow = frameMs > 24 ? slow + 1 : 0;
        fast = frameMs < 19 ? fast + 1 : 0;
        if (slow < 8 && fast < 40) { lastAt = now; return; }
        slow = 0; fast = 0;
        /* Frames first: skipping video frames costs the viewer nothing they
           can act on, and it is reversed the moment the device keeps up.
           Resolution is the second lever, and only if pacing was not enough —
           a softer picture is a change people notice. */
        if (frameMs > 24) { if (everyNth < 6) everyNth++; else if (scale > SCALE_MIN) scale = Math.max(SCALE_MIN, scale - 0.25); }
        else {
          var top = Math.min(window.devicePixelRatio || 1, 2);
          if (scale < top) scale = Math.min(top, scale + 0.125);
          else if (everyNth > 1) everyNth--;
        }
      }
      lastAt = now;
    }

    function size() {
      var w = Math.max(1, Math.round(host.clientWidth * scale)), h = Math.max(1, Math.round(host.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    }

    function upload() {
      if (video.readyState < 2 || !video.videoWidth) return;
      if (!wrapSet) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, isPot(video.videoWidth) ? gl.REPEAT : gl.CLAMP_TO_EDGE);
        wrapSet = true;
      }
      /* the same frame twice is the most expensive way to draw nothing new */
      if (video.currentTime === lastFrameTime) return;
      lastFrameTime = video.currentTime;
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video); } catch (e) { /* not ready */ }
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    }

    function frame(now) {
      if (dead) return;
      raf = requestAnimationFrame(frame);
      pace(now || performance.now());
      size();
      if (!video.paused && (tick++ % everyNth === 0)) upload();
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform1f(U.yaw, cam.yaw * DEG);
      gl.uniform1f(U.pitch, cam.pitch * DEG);
      gl.uniform1f(U.fov, cam.fov * DEG);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    /* ── looking around ─────────────────────────────────────────────────── */
    function at(e) { var t = e.touches && e.touches[0]; return { x: t ? t.clientX : e.clientX, y: t ? t.clientY : e.clientY }; }
    function down(e) { drag = at(e); canvas.setPointerCapture && e.pointerId != null && canvas.setPointerCapture(e.pointerId); }
    function move(e) {
      if (!drag) return;
      var p = at(e), k = cam.fov / canvas.clientHeight * 1.6;
      cam.yaw = (cam.yaw - (p.x - drag.x) * k) % 360;
      cam.pitch = clamp(cam.pitch + (p.y - drag.y) * k, -85, 85);
      drag = p;
      if (e.cancelable) e.preventDefault();
    }
    function up() { drag = null; }
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    canvas.addEventListener("wheel", function (e) { cam.fov = clamp(cam.fov + (e.deltaY > 0 ? 4 : -4), 35, 100); e.preventDefault(); }, { passive: false });
    canvas.addEventListener("keydown", function (e) {
      var step = 6;
      if (e.key === "ArrowLeft") cam.yaw -= step; else if (e.key === "ArrowRight") cam.yaw += step;
      else if (e.key === "ArrowUp") cam.pitch = clamp(cam.pitch - step, -85, 85);
      else if (e.key === "ArrowDown") cam.pitch = clamp(cam.pitch + step, -85, 85);
      else if (e.key === " " || e.key === "Enter") { video.paused ? video.play() : video.pause(); }
      else return;
      e.preventDefault();
    });

    /* a tab in the background must not keep decoding video and uploading it */
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { video.pause(); cancelAnimationFrame(raf); raf = 0; }
      else if (!dead) { video.play().catch(function () {}); if (!raf) frame(); }
    });
    /* nor must one scrolled far off screen */
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (en.isIntersecting) { if (!dead && !raf) frame(); }
          else { video.pause(); cancelAnimationFrame(raf); raf = 0; }
        });
      }, { threshold: 0.05 }).observe(host);
    }

    video.addEventListener("error", function () {
      dead = true; cancelAnimationFrame(raf);
      fallback(host, src, label, "That 360° video could not be played.");
    });
    video.play().catch(function () { /* a browser that refuses autoplay still draws the first frame */ });
    frame();
  }

  function controls(host, video) {
    var bar = document.createElement("div");
    bar.className = "v360-bar";
    bar.innerHTML = '<button type="button" class="v360-btn" data-pp aria-label="Pause">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h3v14H8zM13 5h3v14h-3z"/></svg></button>' +
      '<span class="v360-hint">Drag to look around</span>';
    bar.querySelector("[data-pp]").addEventListener("click", function () {
      if (video.paused) { video.play().catch(function () {}); this.setAttribute("aria-label", "Pause"); this.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h3v14H8zM13 5h3v14h-3z"/></svg>'; }
      else { video.pause(); this.setAttribute("aria-label", "Play"); this.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>'; }
    });
    return bar;
  }

  function fallback(host, src, label, why) {
    host.innerHTML = '<div class="v360-fallback"><p>' + esc(why) + "</p>" +
      '<p><a class="jr-link" href="' + esc(src) + '" download>Download the video instead</a></p></div>';
  }

  function compile(gl) {
    function sh(type, code) {
      var s = gl.createShader(type);
      gl.shaderSource(s, code); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var v = sh(gl.VERTEX_SHADER, VS), f = sh(gl.FRAGMENT_SHADER, FS);
    if (!v || !f) return null;
    var p = gl.createProgram();
    gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
    return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
  }

  function init() {
    var nodes = document.querySelectorAll(".pd-v360[data-src]");
    for (var i = 0; i < nodes.length; i++) build(nodes[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.MCVideo360 = { init: init, _internals: { pot: pot, isPot: isPot, clamp: clamp, FS: FS } };
})();

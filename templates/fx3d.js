/* ============================================================================
   Billy Digitals — real WebGL hero scenes.
   Each sample template gets its own signature 3D moment, rendered with Three.js
   (vendored, r160) — PBR materials, a procedural environment map for real
   reflections, ACES tone mapping, and camera-parallax that follows the cursor.

   Built to the craft bar of the 3d-animation skill:
     • Custom easing tokens (never linear) — one hand made the whole thing.
     • Timing hierarchy — slow, deliberate hero entrances; snappy micro-motion.
     • Restraint — one signature object per scene, not a carnival.
     • Everything responds — cursor + a breathing idle drift so it's never dead.
     • Performance is a constraint — dpr clamp [1,2], pause offscreen / hidden,
       full geometry+material+texture disposal, one render loop.
     • Accessibility — prefers-reduced-motion shows the static, still-beautiful
       emoji; no WebGL falls back to a gentle CSS float. Honoured live.

   No build step, no CDN. Vanilla JS that dynamically imports the vendored ESM.
   ========================================================================== */
(function () {
  "use strict";

  /* ---- shared motion tokens (from the skill's easings.js) ---------------- */
  var DUR = { hero: 1.1 };                 // seconds — hero entrance
  var easeBrand = cubicBezier(0.16, 1, 0.30, 1);   // the "premium" curve
  var easeOut = cubicBezier(0.22, 1, 0.36, 1);

  function cubicBezier(x1, y1, x2, y2) {
    function A(a, b) { return 1 - 3 * b + 3 * a; }
    function B(a, b) { return 3 * b - 6 * a; }
    function C(a) { return 3 * a; }
    function calc(t, a, b) { return ((A(a, b) * t + B(a, b)) * t + C(a)) * t; }
    function slope(t, a, b) { return 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a); }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var t = x;
      for (var i = 0; i < 5; i++) {
        var d = slope(t, x1, x2);
        if (d < 1e-5) break;
        t -= (calc(t, x1, x2) - x) / d;
      }
      return calc(t, y1, y2);
    };
  }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  /* ---- element + page resolution ---------------------------------------- */
  var art = document.querySelector(".dhero-art");
  if (!art) return;
  var emoji = art.querySelector(".art-emoji");
  var scriptURL = (document.currentScript && document.currentScript.src) || location.href;

  var page = (location.pathname.split("/").pop() || "").replace(".html", "");
  // store-* pages share the premium-showcase scene, tinted per brand.
  var SCENE_KEY = {
    "store-beauty": "beauty", "store-fashion": "fashion",
    "store-home": "home", "store-supplements": "supplements"
  };
  var key = SCENE_KEY[page] || page;

  /* ---- reduced-motion is honoured live ---------------------------------- */
  var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false, addEventListener: function () {} };
  var teardown = null;
  var libsPromise = null;

  // Three.js + the post-processing camera layer (bloom / DoF / grade) + a
  // procedural studio environment for real reflections. `three` resolves via
  // the page's <script type="importmap">; the jsm modules import it too, so
  // everyone shares one Three instance.
  function loadLibs() {
    if (!libsPromise) {
      var v = function (p) { return import(new URL("./vendor/jsm/" + p, scriptURL).href); };
      libsPromise = Promise.all([
        import("three"),
        v("postprocessing/EffectComposer.js"),
        v("postprocessing/RenderPass.js"),
        v("postprocessing/UnrealBloomPass.js"),
        v("postprocessing/BokehPass.js"),
        v("postprocessing/ShaderPass.js"),
        v("postprocessing/OutputPass.js"),
        v("environments/RoomEnvironment.js")
      ]).then(function (m) {
        return {
          THREE: m[0],
          EffectComposer: m[1].EffectComposer,
          RenderPass: m[2].RenderPass,
          UnrealBloomPass: m[3].UnrealBloomPass,
          BokehPass: m[4].BokehPass,
          ShaderPass: m[5].ShaderPass,
          OutputPass: m[6].OutputPass,
          RoomEnvironment: m[7].RoomEnvironment
        };
      });
    }
    return libsPromise;
  }

  function webglOK() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext &&
        (c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) { return false; }
  }

  function evaluate() {
    if (teardown) { teardown(); teardown = null; }
    if (mq.matches) { setEmoji(true); return; }        // static, respect preference
    if (!webglOK()) { teardown = cssFallback(); return; }

    var state = { cancelled: false, dispose: null };
    teardown = function () { state.cancelled = true; if (state.dispose) state.dispose(); };
    loadLibs().then(function (libs) {
      if (state.cancelled) { return; }
      state.dispose = boot(libs);
    }).catch(function () {
      if (state.cancelled) return;
      state.dispose = cssFallback();
    });
  }

  function setEmoji(show) {
    if (!emoji) return;
    emoji.style.transition = "opacity .5s ease";
    emoji.style.opacity = show ? "1" : "0";
  }

  /* Gentle CSS float when WebGL isn't available (still beautiful, still calm) */
  function cssFallback() {
    art.classList.add("gl-fallback");
    return function () { art.classList.remove("gl-fallback"); };
  }

  if (mq.addEventListener) mq.addEventListener("change", evaluate);
  else if (mq.addListener) mq.addListener(evaluate);
  evaluate();

  /* ======================================================================
     Boot — shared renderer / scene / loop discipline for every template.
     Each scene builder gets (THREE, root, palette, ctx) and returns
     { update(t, dt, pointer, intro) }.  boot owns root.scale (intro) and a
     universal camera parallax so every scene answers the cursor.
     ====================================================================== */
  function boot(libs) {
    var THREE = libs.THREE;
    var W = Math.max(art.clientWidth, 2), H = Math.max(art.clientHeight, 2);
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    var renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;   // applied once, by OutputPass
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    var canvas = renderer.domElement;
    canvas.className = "gl-canvas";
    art.appendChild(canvas);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    camera.position.set(0, 0, 7);

    var palette = readPalette(THREE);
    // Brand-gradient backdrop rendered INTO the scene, so the camera layer
    // (vignette, DoF, grain) works on a fully composed frame.
    scene.background = makeGradientBg(THREE, palette);
    // Real studio IBL for believable reflections (procedural — no HDRI binary).
    var pmrem = new THREE.PMREMGenerator(renderer);
    var env = pmrem.fromScene(new libs.RoomEnvironment(renderer), 0.04).texture;
    pmrem.dispose();
    scene.environment = env;
    scene.environmentIntensity = 0.85;
    rigLights(THREE, scene, palette);

    var root = new THREE.Group();
    scene.add(root);
    var build = SCENES[key] || SCENES.saas;   // scene builders are assigned below the IIFE flow
    var api = build(THREE, root, palette, { camera: camera, renderer: renderer });

    /* ---- post-processing: the photographic "camera" layer ---------------- */
    var composer = new libs.EffectComposer(renderer);
    composer.setPixelRatio(dpr);
    composer.setSize(W, H);
    composer.addPass(new libs.RenderPass(scene, camera));
    // Bloom — selective; high threshold so only genuinely emissive pixels glow
    // (diffuse whites must NOT bloom — over-bloom is the classic "cheap 3D" tell).
    var bloom = new libs.UnrealBloomPass(new THREE.Vector2(W, H), 0.32, 0.6, 1.0);
    composer.addPass(bloom);
    // Subtle depth of field — reads as "shot on a real lens".
    var bokeh = new libs.BokehPass(scene, camera, { focus: 7.0, aperture: 0.00035, maxblur: 0.006, width: W, height: H });
    composer.addPass(bokeh);
    // Merged grade pass: chromatic aberration + vignette + film grain.
    var grade = new libs.ShaderPass(GRADE_SHADER);
    composer.addPass(grade);
    composer.addPass(new libs.OutputPass());   // ACES + sRGB, once, last

    /* pointer (smoothed) — universal cursor response */
    var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    var hero = art.closest(".dhero") || art;
    function onMove(e) {
      var r = art.getBoundingClientRect();
      pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      pointer.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    }
    function onLeave() { pointer.tx = 0; pointer.ty = 0; }
    hero.addEventListener("pointermove", onMove);
    hero.addEventListener("pointerleave", onLeave);

    /* resize — keep renderer, camera, composer and bloom resolution in sync */
    var ro = new ResizeObserver(function () {
      var w = art.clientWidth, h = art.clientHeight;
      if (w < 2 || h < 2) return;
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      if (bloom.setSize) bloom.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(art);

    /* loop — paused offscreen / on hidden tab */
    var clock = new THREE.Clock();
    var t = 0, running = false, rafId = null, onScreen = true, visible = true;
    art.classList.add("gl-ready");
    setEmoji(false);

    function frame() {
      rafId = requestAnimationFrame(frame);
      var dt = Math.min(clock.getDelta(), 0.05);
      t += dt;
      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;
      var intro = easeBrand(clamp01(t / DUR.hero));
      root.scale.setScalar(0.0001 + intro);
      // universal camera parallax toward the cursor — camera motion sells 3D
      camera.position.x += (pointer.x * 0.55 - camera.position.x) * 0.05;
      camera.position.y += (-pointer.y * 0.4 - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);
      api.update(t, dt, pointer, intro);
      grade.uniforms.uTime.value = t;
      composer.render();
    }
    function play() { if (running) return; running = true; clock.getDelta(); frame(); }
    function pause() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = null; }
    function sync() { (onScreen && visible) ? play() : pause(); }

    var io = new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; sync(); }, { threshold: 0.01 });
    io.observe(art);
    function onVis() { visible = document.visibilityState !== "hidden"; sync(); }
    document.addEventListener("visibilitychange", onVis);
    sync();

    return function dispose() {
      pause();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
      if (api.dispose) api.dispose();
      disposeTree(THREE, scene);
      if (scene.background && scene.background.dispose) scene.background.dispose();
      if (env) env.dispose();
      if (composer.dispose) composer.dispose();
      renderer.dispose();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      art.classList.remove("gl-ready");
      setEmoji(true);
    };
  }

  /* Merged final grade — chromatic aberration (edge-weighted) + vignette +
     animated film grain. One pass; the professional recipe is that no single
     effect is individually noticeable. */
  var GRADE_SHADER = {
    uniforms: {
      tDiffuse: { value: null },
      uTime: { value: 0 },
      uGrain: { value: 0.028 },
      uVignette: { value: 1.1 },
      uCA: { value: 0.0018 }
    },
    vertexShader: [
      "varying vec2 vUv;",
      "void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }"
    ].join("\n"),
    fragmentShader: [
      "varying vec2 vUv;",
      "uniform sampler2D tDiffuse;",
      "uniform float uTime, uGrain, uVignette, uCA;",
      "float rand(vec2 c){ return fract(sin(dot(c, vec2(12.9898,78.233))) * 43758.5453); }",
      "void main(){",
      "  vec2 uv = vUv; vec2 d = uv - 0.5; float r2 = dot(d, d);",
      "  vec2 off = d * uCA * (0.35 + r2 * 2.2);",   // fringing grows toward frame edges
      "  vec3 col;",
      "  col.r = texture2D(tDiffuse, uv + off).r;",
      "  col.g = texture2D(tDiffuse, uv).g;",
      "  col.b = texture2D(tDiffuse, uv - off).b;",
      "  float vig = smoothstep(0.95, 0.12, r2 * uVignette);",
      "  col *= mix(0.86, 1.0, vig);",             // gentle edge darkening
      "  float g = (rand(uv * vec2(1280.0, 720.0) + fract(uTime)) - 0.5) * uGrain;",
      "  col += g;",
      "  gl_FragColor = vec4(col, 1.0);",
      "}"
    ].join("\n")
  };

  /* ---- shared 3D helpers ------------------------------------------------- */
  function readPalette(THREE) {
    var cs = getComputedStyle(document.documentElement);
    function col(name, fb) {
      var v = (cs.getPropertyValue(name) || "").trim();
      try { return new THREE.Color(v || fb); } catch (e) { return new THREE.Color(fb); }
    }
    return { accent: col("--accent", "#2b7fff"), accent2: col("--accent-2", "#22d3ee") };
  }

  // Brand-gradient backdrop drawn behind the 3D (a diagonal accent→accent-2
  // wash with a soft top-light), rendered into the scene so the camera layer
  // grades the whole frame.
  function makeGradientBg(THREE, palette) {
    var c = document.createElement("canvas");
    c.width = 64; c.height = 64;
    var ctx = c.getContext("2d");
    var a = palette.accent.clone();
    var b = palette.accent2.clone();
    var g = ctx.createLinearGradient(0, 0, 64, 64);
    g.addColorStop(0, "#" + a.clone().lerp(new THREE.Color("#05060a"), 0.35).getHexString());
    g.addColorStop(1, "#" + b.clone().lerp(new THREE.Color("#05060a"), 0.55).getHexString());
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    // soft top-left key glow
    var rg = ctx.createRadialGradient(18, 12, 2, 18, 12, 60);
    rg.addColorStop(0, "rgba(255,255,255,0.28)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = rg; ctx.fillRect(0, 0, 64, 64);
    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function rigLights(THREE, scene, palette) {
    scene.add(new THREE.HemisphereLight(0xffffff, 0x141420, 0.45));
    var key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(4, 6, 5);
    scene.add(key);
    var p1 = new THREE.PointLight(palette.accent, 60, 40, 2);
    p1.position.set(-5, 1.5, 4);
    scene.add(p1);
    var p2 = new THREE.PointLight(palette.accent2, 45, 40, 2);
    p2.position.set(5, -2, 3);
    scene.add(p2);
  }

  function std(THREE, opts) { return new THREE.MeshStandardMaterial(opts); }

  function points(THREE, count, fill, matOpts) {
    var g = new THREE.BufferGeometry();
    var pos = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) fill(pos, i * 3, i);
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    var m = new THREE.PointsMaterial(Object.assign({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    }, matOpts));
    var p = new THREE.Points(g, m);
    p.userData.pos = pos;
    return p;
  }

  function disposeTree(THREE, obj) {
    obj.traverse(function (child) {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        var mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(function (m) {
          for (var k in m) { var v = m[k]; if (v && v.isTexture) v.dispose(); }
          m.dispose();
        });
      }
    });
  }

  /* ======================================================================
     SCENES — one signature moment per industry.
     ====================================================================== */
  function SCENES() {}

  /* 🍛 restaurant — a plated dish, rising steam, orbiting spices */
  SCENES.restaurant = function (THREE, root, palette) {
    root.rotation.x = -0.5;
    var plate = new THREE.Group();
    root.add(plate);
    var ceramic = std(THREE, { color: 0xf6f1e7, roughness: 0.35, metalness: 0.05, envMapIntensity: 0.8 });
    var base = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.55, 0.22, 64), ceramic);
    plate.add(base);
    var rim = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.16, 20, 80), ceramic);
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.11;
    plate.add(rim);
    var food = new THREE.Mesh(new THREE.CircleGeometry(1.28, 64),
      std(THREE, { color: palette.accent, roughness: 0.5, metalness: 0.1, emissive: palette.accent, emissiveIntensity: 0.25 }));
    food.rotation.x = -Math.PI / 2; food.position.y = 0.12;
    plate.add(food);

    var orbit = new THREE.Group(); root.add(orbit);
    var garnish = [];
    var gcol = [palette.accent2, 0xff9e57, palette.accent2, 0xffd27a];
    for (var i = 0; i < 4; i++) {
      var s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0),
        std(THREE, { color: gcol[i], roughness: 0.3, metalness: 0.3 }));
      var a = i / 4 * Math.PI * 2;
      s.position.set(Math.cos(a) * 2.0, 0.55, Math.sin(a) * 2.0);
      orbit.add(s); garnish.push(s);
    }
    var steam = points(THREE, 40, function (p, o) {
      p[o] = (Math.random() - 0.5) * 1.4;
      p[o + 1] = Math.random() * 2.2;
      p[o + 2] = (Math.random() - 0.5) * 1.4;
    }, { size: 0.22, color: 0xffffff, opacity: 0.35 });
    root.add(steam);
    var sp = steam.userData.pos;

    return { update: function (t, dt, ptr) {
      plate.rotation.y += dt * 0.15;
      orbit.rotation.y += dt * 0.5;
      for (var i = 0; i < garnish.length; i++) garnish[i].position.y = 0.55 + Math.sin(t * 1.6 + i) * 0.12;
      for (var j = 0; j < sp.length; j += 3) {
        sp[j + 1] += dt * 0.6;
        if (sp[j + 1] > 2.6) { sp[j + 1] = 0.2; sp[j] = (Math.random() - 0.5) * 1.2; sp[j + 2] = (Math.random() - 0.5) * 1.2; }
        sp[j] += Math.sin(t + j) * dt * 0.05;
      }
      steam.geometry.attributes.position.needsUpdate = true;
      root.rotation.x = -0.5 + ptr.y * 0.12;
    } };
  };

  /* 📈 corporate — a living 3D bar chart with a rising trend marker */
  SCENES.corporate = function (THREE, root, palette) {
    var group = new THREE.Group(); root.add(group);
    var heights = [1.1, 1.8, 1.4, 2.3, 2.9];
    var bars = [];
    var metal = { roughness: 0.25, metalness: 0.85, envMapIntensity: 1.1 };
    for (var i = 0; i < heights.length; i++) {
      var h = heights[i];
      var mat = std(THREE, Object.assign({ color: i === heights.length - 1 ? palette.accent2 : palette.accent }, metal));
      var b = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1, 0.62, 1, 1, 1), mat);
      b.position.set((i - 2) * 0.95, 0, 0);
      b.userData.h = h;
      group.add(b); bars.push(b);
    }
    var marker = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1),
      std(THREE, { color: 0xffffff, roughness: 0.1, metalness: 0.6, emissive: palette.accent2, emissiveIntensity: 0.5 }));
    group.add(marker);
    group.position.y = -1.2;

    return { update: function (t, dt, ptr) {
      for (var i = 0; i < bars.length; i++) {
        var b = bars[i];
        var h = b.userData.h * (0.82 + 0.18 * (0.5 + 0.5 * Math.sin(t * 1.4 + i * 0.5)));
        b.scale.y = h; b.position.y = h / 2;
      }
      var last = bars[bars.length - 1];
      marker.position.set(last.position.x, last.position.y * 2 + 0.5 + Math.sin(t * 2) * 0.08, 0.1);
      group.rotation.y = Math.sin(t * 0.25) * 0.35 + ptr.x * 0.25;
    } };
  };

  /* 🎨 portfolio — a metallic torus-knot, dual-tone, cursor-driven */
  SCENES.portfolio = function (THREE, root, palette) {
    var knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.25, 0.4, 220, 32),
      std(THREE, { color: 0xdbe0ea, roughness: 0.3, metalness: 1.0, envMapIntensity: 0.85 }));
    root.add(knot);
    return { update: function (t, dt, ptr) {
      knot.rotation.y += dt * 0.4 + ptr.x * dt * 2.5;
      knot.rotation.x += dt * 0.2 - ptr.y * dt * 2.0;
    } };
  };

  /* 🏙️ realestate — an instanced skyline with slow orbit + parallax */
  SCENES.realestate = function (THREE, root, palette) {
    var city = new THREE.Group(); root.add(city);
    var N = 5, count = N * N;
    var geo = new THREE.BoxGeometry(1, 1, 1);
    var mat = std(THREE, { color: 0x2a3348, roughness: 0.4, metalness: 0.6, emissive: palette.accent, emissiveIntensity: 0.18, envMapIntensity: 1.0 });
    var mesh = new THREE.InstancedMesh(geo, mat, count);
    var d = new THREE.Object3D();
    var i = 0;
    for (var x = 0; x < N; x++) for (var z = 0; z < N; z++) {
      var h = 0.6 + Math.abs(Math.sin(x * 1.7 + z * 2.3)) * 2.6;
      d.position.set((x - (N - 1) / 2) * 0.9, h / 2 - 1.2, (z - (N - 1) / 2) * 0.9);
      d.scale.set(0.62, h, 0.62);
      d.updateMatrix();
      mesh.setMatrixAt(i++, d.matrix);
    }
    mesh.userData.heights = true;
    city.add(mesh);
    return { update: function (t, dt, ptr) {
      city.rotation.y += dt * 0.18;
      city.rotation.x = -0.15 + ptr.y * 0.12;
      city.position.x = ptr.x * 0.4;
    } };
  };

  /* 🩺 medical — a beating core with a floating cross */
  SCENES.medical = function (THREE, root, palette) {
    var heart = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 3),
      std(THREE, { color: palette.accent, roughness: 0.3, metalness: 0.2, emissive: palette.accent, emissiveIntensity: 0.4 }));
    root.add(heart);
    var cross = new THREE.Group();
    var cm = std(THREE, { color: 0xffffff, roughness: 0.2, metalness: 0.3, emissive: 0xffffff, emissiveIntensity: 0.15 });
    cross.add(new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.1, 0.32), cm));
    cross.add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.32, 0.32), cm));
    cross.position.set(0, 0, 1.35);
    root.add(cross);
    function beat(t) { // double-thump, like a pulse
      var x = (t * 1.1) % 1;
      return 1 + 0.10 * Math.exp(-Math.pow((x - 0.10) * 9, 2)) + 0.07 * Math.exp(-Math.pow((x - 0.28) * 9, 2));
    }
    return { update: function (t, dt, ptr) {
      heart.scale.setScalar(beat(t));
      heart.rotation.y += dt * 0.25;
      cross.rotation.z = Math.sin(t * 0.6) * 0.25 + ptr.x * 0.3;
      cross.position.y = Math.sin(t * 1.2) * 0.12;
    } };
  };

  /* 🎓 education — a glowing core of knowledge, orbiting books */
  SCENES.education = function (THREE, root, palette) {
    var core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 1),
      std(THREE, { color: palette.accent2, roughness: 0.15, metalness: 0.4, emissive: palette.accent2, emissiveIntensity: 0.6 }));
    root.add(core);
    var orbit = new THREE.Group(); root.add(orbit);
    var books = [];
    var bcol = [palette.accent, palette.accent2, 0xffffff, 0xffb454];
    for (var i = 0; i < 4; i++) {
      var b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.15, 0.16),
        std(THREE, { color: bcol[i], roughness: 0.4, metalness: 0.2 }));
      var a = i / 4 * Math.PI * 2;
      b.position.set(Math.cos(a) * 1.9, Math.sin(a * 0.5) * 0.4, Math.sin(a) * 1.9);
      orbit.add(b); books.push(b);
    }
    return { update: function (t, dt, ptr) {
      core.rotation.y += dt * 0.4; core.rotation.x += dt * 0.2;
      orbit.rotation.y += dt * 0.4 + ptr.x * dt * 1.5;
      for (var i = 0; i < books.length; i++) {
        books[i].rotation.y = t * 0.8 + i;
        books[i].position.y = Math.sin(t * 0.9 + i * 1.3) * 0.45;
      }
    } };
  };

  /* 📊 saas — the signature morphing "AI" blob + wireframe + satellites */
  SCENES.saas = function (THREE, root, palette) {
    var geo = new THREE.IcosahedronGeometry(1.5, 4);
    var base = geo.attributes.position.array.slice(0);
    var blob = new THREE.Mesh(geo,
      std(THREE, { color: palette.accent, roughness: 0.22, metalness: 0.6, envMapIntensity: 1.3,
        emissive: palette.accent2, emissiveIntensity: 0.18, flatShading: false }));
    root.add(blob);
    var wire = new THREE.Mesh(new THREE.IcosahedronGeometry(1.62, 2),
      new THREE.MeshBasicMaterial({ color: palette.accent2, wireframe: true, transparent: true, opacity: 0.28 }));
    root.add(wire);
    var sats = new THREE.Group(); root.add(sats);
    for (var i = 0; i < 2; i++) {
      var s = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 20),
        std(THREE, { color: 0xffffff, roughness: 0.1, metalness: 0.5, emissive: palette.accent2, emissiveIntensity: 0.5 }));
      s.userData.r = 2.1 + i * 0.5; s.userData.o = i * Math.PI;
      sats.add(s);
    }
    var pos = geo.attributes.position;
    var v = new THREE.Vector3();
    return { update: function (t, dt, ptr) {
      for (var i = 0; i < pos.count; i++) {
        var bx = base[i * 3], by = base[i * 3 + 1], bz = base[i * 3 + 2];
        v.set(bx, by, bz).normalize();
        var n = 0.16 * Math.sin(bx * 1.6 + t * 1.2) + 0.14 * Math.sin(by * 1.9 - t) + 0.12 * Math.sin(bz * 2.2 + t * 0.7);
        pos.setXYZ(i, bx + v.x * n, by + v.y * n, bz + v.z * n);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      blob.rotation.y += dt * 0.2 + ptr.x * dt * 1.2;
      wire.rotation.y -= dt * 0.15; wire.rotation.x += dt * 0.1;
      sats.children.forEach(function (s) {
        var a = t * 0.9 + s.userData.o;
        s.position.set(Math.cos(a) * s.userData.r, Math.sin(a * 1.3) * 0.8, Math.sin(a) * s.userData.r);
      });
    } };
  };

  /* 🏋️ fitness — a kinetic dumbbell with shockwave rings on each rep */
  SCENES.fitness = function (THREE, root, palette) {
    var db = new THREE.Group(); root.add(db);
    var barMat = std(THREE, { color: 0xcfd6e4, roughness: 0.25, metalness: 0.95, envMapIntensity: 1.2 });
    var plateMat = std(THREE, { color: palette.accent, roughness: 0.35, metalness: 0.7 });
    var bar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.4, 24), barMat);
    bar.rotation.z = Math.PI / 2; db.add(bar);
    [-1.0, 1.0].forEach(function (x) {
      [0.55, 0.85].forEach(function (r, k) {
        var w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.34, 40), k === 0 ? plateMat : barMat);
        w.rotation.z = Math.PI / 2; w.position.x = x + (x > 0 ? 1 : -1) * (k * 0.34);
        db.add(w);
      });
    });
    db.rotation.set(0.3, 0.5, 0);
    var rings = [];
    var rmat = new THREE.MeshBasicMaterial({ color: palette.accent2, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    for (var i = 0; i < 4; i++) {
      var ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 8, 48), rmat.clone());
      ring.rotation.x = Math.PI / 2; ring.visible = false; ring.userData.life = 1;
      root.add(ring); rings.push(ring);
    }
    var period = 1.5, lastRep = -1;
    return { update: function (t, dt, ptr) {
      var ph = (t % period) / period;
      var bounce = Math.abs(Math.sin(ph * Math.PI));
      db.position.y = bounce * 0.8 - 0.2;
      db.scale.y = 1 - (1 - bounce) * 0.12;   // squash at the bottom
      db.rotation.y = 0.5 + Math.sin(t * 0.6) * 0.3 + ptr.x * 0.3;
      var rep = Math.floor(t / period);
      if (rep !== lastRep) { // emit a shockwave at each rep
        lastRep = rep;
        for (var i = 0; i < rings.length; i++) if (!rings[i].visible) { rings[i].visible = true; rings[i].userData.life = 0; rings[i].position.y = -0.9; break; }
      }
      for (var j = 0; j < rings.length; j++) {
        var rg = rings[j];
        if (!rg.visible) continue;
        rg.userData.life += dt * 1.6;
        var l = rg.userData.life;
        if (l >= 1) { rg.visible = false; continue; }
        rg.scale.setScalar(0.4 + l * 3.2);
        rg.material.opacity = 0.6 * (1 - l);
      }
    } };
  };

  /* 🌍 travel — a wireframe globe with an orbiting plane on a flight path */
  SCENES.travel = function (THREE, root, palette) {
    var globe = new THREE.Group(); root.add(globe);
    var solid = new THREE.Mesh(new THREE.SphereGeometry(1.35, 40, 32),
      std(THREE, { color: 0x0d2340, roughness: 0.5, metalness: 0.5, emissive: palette.accent, emissiveIntensity: 0.12 }));
    globe.add(solid);
    var grid = new THREE.Mesh(new THREE.SphereGeometry(1.37, 24, 18),
      new THREE.MeshBasicMaterial({ color: palette.accent2, wireframe: true, transparent: true, opacity: 0.35 }));
    globe.add(grid);
    var pathG = new THREE.Group(); root.add(pathG);
    pathG.rotation.set(0.5, 0, 0.4);
    var ringPath = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.012, 8, 96),
      new THREE.MeshBasicMaterial({ color: palette.accent2, transparent: true, opacity: 0.4 }));
    pathG.add(ringPath);
    var plane = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.5, 16),
      std(THREE, { color: 0xffffff, roughness: 0.2, metalness: 0.4, emissive: palette.accent2, emissiveIntensity: 0.4 }));
    pathG.add(plane);
    var clouds = points(THREE, 24, function (p, o) {
      var a = Math.random() * Math.PI * 2, r = 1.7 + Math.random() * 0.5, y = (Math.random() - 0.5) * 2.4;
      p[o] = Math.cos(a) * r; p[o + 1] = y; p[o + 2] = Math.sin(a) * r;
    }, { size: 0.16, color: 0xffffff, opacity: 0.5 });
    root.add(clouds);
    return { update: function (t, dt, ptr) {
      globe.rotation.y += dt * 0.18;
      globe.rotation.x = ptr.y * 0.2;
      var a = t * 0.8;
      plane.position.set(Math.cos(a) * 2.0, 0, Math.sin(a) * 2.0);
      plane.rotation.set(0, -a, Math.PI / 2);
      pathG.rotation.y += dt * 0.05;
      clouds.rotation.y -= dt * 0.06;
    } };
  };

  /* 💎 showcase — the store templates: a faceted brand gem on a lit podium */
  /* 💄 store-beauty — a lacquered serum bottle, glowing elixir, drifting sparkle */
  SCENES.beauty = function (THREE, root, palette) {
    var bottle = new THREE.Group(); root.add(bottle);
    var glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.5, envMapIntensity: 1.6 });
    bottle.add(new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.92, 1.9, 48), glass));
    var elixir = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.85, 1.15, 40),
      std(THREE, { color: palette.accent, roughness: 0.25, metalness: 0.0, emissive: palette.accent, emissiveIntensity: 0.55, transparent: true, opacity: 0.92 }));
    elixir.position.y = -0.34; bottle.add(elixir);
    var neck = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.4, 32), glass); neck.position.y = 1.14; bottle.add(neck);
    var cap = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.5, 32),
      std(THREE, { color: palette.accent2, roughness: 0.18, metalness: 0.95, envMapIntensity: 1.3 })); cap.position.y = 1.55; bottle.add(cap);
    bottle.rotation.z = 0.05;
    var sparks = points(THREE, 60, function (p, o) { var a = Math.random() * 6.2832, r = 1.1 + Math.random() * 1.6; p[o] = Math.cos(a) * r; p[o + 1] = (Math.random() - 0.5) * 3.4; p[o + 2] = Math.sin(a) * r; },
      { size: 0.06, color: 0xffffff, opacity: 0.85 });
    root.add(sparks); var sp = sparks.userData.pos;
    return { update: function (t, dt, ptr) {
      bottle.rotation.y += dt * 0.5 + ptr.x * dt * 1.2;
      bottle.position.y = Math.sin(t * 1.1) * 0.08;
      sparks.rotation.y -= dt * 0.1;
      for (var i = 1; i < sp.length; i += 3) { sp[i] += dt * 0.28; if (sp[i] > 1.8) sp[i] = -1.8; }
      sparks.geometry.attributes.position.needsUpdate = true;
    } };
  };

  /* 🧥 store-fashion — a metal hanger draped with a softly rippling fabric */
  SCENES.fashion = function (THREE, root, palette) {
    var g = new THREE.Group(); root.add(g); g.position.y = 0.2;
    var metal = std(THREE, { color: 0xd6dbe6, roughness: 0.2, metalness: 0.95, envMapIntensity: 1.2 });
    var hook = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.045, 14, 30, Math.PI * 1.5), metal);
    hook.position.y = 1.5; hook.rotation.z = Math.PI * 0.25; g.add(hook);
    var barGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.75, 12);
    var b1 = new THREE.Mesh(barGeo, metal); b1.position.set(-0.44, 0.62, 0); b1.rotation.z = Math.PI * 0.44; g.add(b1);
    var b2 = new THREE.Mesh(barGeo, metal); b2.position.set(0.44, 0.62, 0); b2.rotation.z = -Math.PI * 0.44; g.add(b2);
    var b3 = new THREE.Mesh(barGeo, metal); b3.position.set(0, 0.2, 0); b3.rotation.z = Math.PI / 2; g.add(b3);
    var clothGeo = new THREE.PlaneGeometry(1.85, 1.7, 26, 26);
    var cbase = clothGeo.attributes.position.array.slice(0);
    var cloth = new THREE.Mesh(clothGeo, new THREE.MeshStandardMaterial({ color: palette.accent, roughness: 0.62, metalness: 0.06, side: THREE.DoubleSide, emissive: palette.accent, emissiveIntensity: 0.08 }));
    cloth.position.y = -0.72; g.add(cloth);
    var cpos = clothGeo.attributes.position;
    return { update: function (t, dt, ptr) {
      g.rotation.y = Math.sin(t * 0.3) * 0.5 + ptr.x * 0.5;
      for (var i = 0; i < cpos.count; i++) {
        var bx = cbase[i * 3], by = cbase[i * 3 + 1];
        cpos.setZ(i, Math.sin(bx * 3 + t * 2) * 0.07 + Math.sin(by * 2.4 - t * 1.5) * 0.05);
      }
      cpos.needsUpdate = true; clothGeo.computeVertexNormals();
    } };
  };

  /* 🛋️ store-home — a warm pendant lamp over a little potted plant */
  SCENES.home = function (THREE, root, palette) {
    var g = new THREE.Group(); root.add(g);
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.3, 8), std(THREE, { color: 0x20242e, roughness: 0.6 })).translateY(1.75));
    var shade = new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.72, 40, 1, true),
      std(THREE, { color: palette.accent, roughness: 0.4, metalness: 0.35, side: THREE.DoubleSide, emissive: palette.accent, emissiveIntensity: 0.18 }));
    shade.position.y = 0.95; g.add(shade);
    var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 24), std(THREE, { color: 0xfff3d6, emissive: 0xffdca0, emissiveIntensity: 1.6, roughness: 0.3 }));
    bulb.position.y = 0.66; g.add(bulb);
    var lamp = new THREE.PointLight(0xffd9a0, 26, 12, 2); lamp.position.set(0, 0.6, 0.2); g.add(lamp);
    var pot = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.32, 0.5, 24), std(THREE, { color: palette.accent2, roughness: 0.5, metalness: 0.2 })); pot.position.y = -1.15; g.add(pot);
    var leaves = [];
    for (var i = 0; i < 6; i++) {
      var lf = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 10), std(THREE, { color: 0x3fae72, roughness: 0.55, metalness: 0.05 }));
      lf.scale.set(0.34, 1.05, 0.12); var a = i / 6 * 6.2832;
      lf.position.set(Math.cos(a) * 0.22, -0.55, Math.sin(a) * 0.22);
      lf.rotation.set(0.5, a, Math.sin(a) * 0.4); g.add(lf); leaves.push(lf);
    }
    return { update: function (t, dt, ptr) {
      g.rotation.y += dt * 0.25 + ptr.x * dt * 0.8;
      bulb.material.emissiveIntensity = 1.45 + Math.sin(t * 2.4) * 0.2;
      lamp.intensity = 24 + Math.sin(t * 2.4) * 4;
      for (var i = 0; i < leaves.length; i++) leaves[i].rotation.z = Math.sin(t * 0.9 + i) * 0.15 + Math.sin(i) * 0.4;
    } };
  };

  /* 💪 store-supplements — capsules tumbling in orbit around a protein tub */
  SCENES.supplements = function (THREE, root, palette) {
    var g = new THREE.Group(); root.add(g);
    var tub = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.86, 1.5, 48),
      std(THREE, { color: palette.accent, roughness: 0.35, metalness: 0.4, envMapIntensity: 1.1 }));
    var lid = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.34, 48), std(THREE, { color: 0x0f1216, roughness: 0.4, metalness: 0.6 })); lid.position.y = 0.9;
    var band = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.7, 48), new THREE.MeshBasicMaterial({ color: palette.accent2, transparent: true, opacity: 0.22 })); band.position.y = -0.1;
    g.add(tub); g.add(lid); g.add(band);
    var orbit = new THREE.Group(); g.add(orbit); var caps = [];
    for (var i = 0; i < 5; i++) {
      var cap = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.34, 8, 16),
        std(THREE, { color: i % 2 ? palette.accent2 : 0xffffff, roughness: 0.25, metalness: 0.2, emissive: i % 2 ? palette.accent2 : 0x000000, emissiveIntensity: 0.3 }));
      cap.userData = { a: i / 5 * 6.2832, spin: 0.6 + Math.random() }; orbit.add(cap); caps.push(cap);
    }
    var energy = points(THREE, 44, function (p, o) { var a = Math.random() * 6.2832, r = 0.6 + Math.random() * 1.9; p[o] = Math.cos(a) * r; p[o + 1] = Math.random() * 3 - 1.4; p[o + 2] = Math.sin(a) * r; },
      { size: 0.05, color: palette.accent2, opacity: 0.7 });
    g.add(energy); var ep = energy.userData.pos;
    return { update: function (t, dt, ptr) {
      g.rotation.y += dt * 0.2 + ptr.x * dt * 0.8;
      orbit.rotation.y += dt * 0.7;
      for (var i = 0; i < caps.length; i++) {
        var c = caps[i];
        c.position.set(Math.cos(c.userData.a) * 1.75, Math.sin(t * 1.2 + i) * 0.55, Math.sin(c.userData.a) * 1.75);
        c.rotation.x = t * c.userData.spin; c.rotation.z = t * 1.1;
      }
      for (var j = 1; j < ep.length; j += 3) { ep[j] += dt * 0.35; if (ep[j] > 1.7) ep[j] = -1.7; }
      energy.geometry.attributes.position.needsUpdate = true;
    } };
  };

  /* ⚖️ law — scales of justice, gently finding balance */
  SCENES.law = function (THREE, root, palette) {
    var g = new THREE.Group(); root.add(g); g.position.y = 0.2;
    var gold = std(THREE, { color: 0xd9c27a, roughness: 0.25, metalness: 0.95, envMapIntensity: 1.3 });
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.6, 24), gold));                 // post
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 24), gold).translateY(1.35));         // finial
    var beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 16), gold);
    beam.rotation.z = Math.PI / 2; beam.position.y = 1.15; g.add(beam);
    var arms = new THREE.Group(); arms.position.y = 1.15; g.add(arms);
    var pans = [];
    [-1.3, 1.3].forEach(function (x) {
      var chain = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.85, 8), gold);
      chain.position.set(x, -0.42, 0); arms.add(chain);
      var pan = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.42, 0.12, 32, 1, true), gold);
      pan.position.set(x, -0.85, 0); arms.add(pan); pans.push(pan);
    });
    return { update: function (t, dt, ptr) {
      g.rotation.y += dt * 0.25 + ptr.x * dt * 0.7;
      var tilt = Math.sin(t * 0.9) * 0.12 + ptr.y * 0.06;
      arms.rotation.z = tilt;
      pans[0].rotation.z = -tilt; pans[1].rotation.z = -tilt;   // keep pans level
    } };
  };

  /* 🚗 automotive — a spinning alloy wheel with motion streaks */
  SCENES.automotive = function (THREE, root, palette) {
    var wheel = new THREE.Group(); root.add(wheel);
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.42, 24, 64), std(THREE, { color: 0x14161c, roughness: 0.55, metalness: 0.3 }))); // tyre
    var rimMat = std(THREE, { color: 0xd7dce6, roughness: 0.18, metalness: 1.0, envMapIntensity: 1.4 });
    wheel.add(new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.34, 48), rimMat).rotateX(Math.PI / 2)); // rim disc
    for (var i = 0; i < 5; i++) {
      var spoke = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.95, 0.3), std(THREE, { color: 0x0c0e13, roughness: 0.4, metalness: 0.7 }));
      var a = i / 5 * 6.2832; spoke.position.set(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0); spoke.rotation.z = a + Math.PI / 2; wheel.add(spoke);
    }
    wheel.add(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.4, 24), std(THREE, { color: palette.accent, roughness: 0.3, metalness: 0.8, emissive: palette.accent, emissiveIntensity: 0.3 })).rotateX(Math.PI / 2)); // hub cap
    wheel.rotation.x = 0.42;
    var streaks = points(THREE, 50, function (p, o) { p[o] = -3 - Math.random() * 3; p[o + 1] = (Math.random() - 0.5) * 3.4; p[o + 2] = (Math.random() - 0.5) * 1.5; },
      { size: 0.05, color: palette.accent2, opacity: 0.6 });
    root.add(streaks); var sp = streaks.userData.pos;
    return { update: function (t, dt, ptr) {
      wheel.rotation.z -= dt * 3.2;                 // fast spin
      wheel.rotation.y = ptr.x * 0.4; wheel.rotation.x = 0.42 - ptr.y * 0.2;
      for (var i = 0; i < sp.length; i += 3) { sp[i] += dt * 7; if (sp[i] > 3) sp[i] = -3 - Math.random() * 2; }
      streaks.geometry.attributes.position.needsUpdate = true;
    } };
  };

  /* ☕ cafe — a coffee cup, rising steam, orbiting beans */
  SCENES.cafe = function (THREE, root, palette) {
    var g = new THREE.Group(); root.add(g); g.position.y = -0.2;
    var cupMat = std(THREE, { color: 0xf3ede4, roughness: 0.3, metalness: 0.05, clearcoat: 1 });
    var cup = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.62, 1.0, 48), cupMat); cup.position.y = 0.2; g.add(cup);
    var coffee = new THREE.Mesh(new THREE.CircleGeometry(0.76, 40), std(THREE, { color: 0x3a2318, roughness: 0.4, metalness: 0.1, emissive: 0x2a1710, emissiveIntensity: 0.3 }));
    coffee.rotation.x = -Math.PI / 2; coffee.position.y = 0.69; g.add(coffee);
    var handle = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.09, 16, 32, Math.PI * 1.2), cupMat); handle.position.set(0.82, 0.2, 0); handle.rotation.z = -0.3; g.add(handle);
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.2, 0.1, 48), cupMat).translateY(-0.34)); // saucer
    var steam = points(THREE, 34, function (p, o) { p[o] = (Math.random() - 0.5) * 0.7; p[o + 1] = 0.8 + Math.random() * 2; p[o + 2] = (Math.random() - 0.5) * 0.7; },
      { size: 0.16, color: 0xffffff, opacity: 0.3 });
    g.add(steam); var st = steam.userData.pos;
    var beans = new THREE.Group(); g.add(beans);
    for (var i = 0; i < 4; i++) { var bn = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), std(THREE, { color: 0x4a2c1a, roughness: 0.5, metalness: 0.1 })); bn.scale.set(1, 0.7, 0.55); bn.userData = { a: i / 4 * 6.2832 }; beans.add(bn); }
    return { update: function (t, dt, ptr) {
      g.rotation.y += dt * 0.2 + ptr.x * dt * 0.7;
      for (var j = 1; j < st.length; j += 3) { st[j] += dt * 0.55; st[j - 1] += Math.sin(t + j) * dt * 0.05; if (st[j] > 2.8) st[j] = 0.8; }
      steam.geometry.attributes.position.needsUpdate = true;
      beans.rotation.y += dt * 0.6;
      beans.children.forEach(function (bn, i) { bn.position.set(Math.cos(bn.userData.a) * 1.7, 0.4 + Math.sin(t * 1.3 + i) * 0.25, Math.sin(bn.userData.a) * 1.7); bn.rotation.x = t; });
    } };
  };

  /* 📷 photography — a camera with a focusing lens + light flares */
  SCENES.photography = function (THREE, root, palette) {
    var cam = new THREE.Group(); root.add(cam);
    var body = std(THREE, { color: 0x15171d, roughness: 0.42, metalness: 0.7, envMapIntensity: 1.0 });
    cam.add(new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.35, 0.95), body));
    cam.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.3), body).translateY(0.78).translateZ(0)); // pentaprism
    var lens = new THREE.Group(); lens.position.set(0, -0.05, 0.7); cam.add(lens);
    var lensMat = std(THREE, { color: 0x0b0c10, roughness: 0.35, metalness: 0.8 });
    lens.add(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.8, 40), lensMat).rotateX(Math.PI / 2).translateY(0.4 * 0));
    var lensCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.8, 40), lensMat); lensCyl.rotation.x = Math.PI / 2; lensCyl.position.z = 0.4; lens.add(lensCyl);
    var glass = new THREE.Mesh(new THREE.CircleGeometry(0.45, 40), std(THREE, { color: palette.accent, roughness: 0.05, metalness: 1.0, emissive: palette.accent, emissiveIntensity: 0.35, envMapIntensity: 1.6 }));
    glass.position.z = 0.81; lens.add(glass);
    for (var r = 0; r < 2; r++) { var ring = new THREE.Mesh(new THREE.TorusGeometry(0.58 - r * 0.06, 0.03, 12, 40), std(THREE, { color: 0x2a2d36, roughness: 0.4, metalness: 0.8 })); ring.position.z = 0.15 + r * 0.28; lens.add(ring); }
    cam.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, 0.5), std(THREE, { color: palette.accent2, roughness: 0.3, metalness: 0.5, emissive: palette.accent2, emissiveIntensity: 0.4 })).translateX(-0.8).translateY(0.78)); // flash
    var flares = points(THREE, 30, function (p, o) { var a = Math.random() * 6.2832, rr = 1.4 + Math.random() * 1.4; p[o] = Math.cos(a) * rr; p[o + 1] = (Math.random() - 0.5) * 2.6; p[o + 2] = Math.sin(a) * rr; },
      { size: 0.07, color: 0xffffff, opacity: 0.7 });
    root.add(flares);
    return { update: function (t, dt, ptr) {
      cam.rotation.y = Math.sin(t * 0.35) * 0.5 + ptr.x * 0.5;
      cam.rotation.x = -ptr.y * 0.25;
      var f = 1 + Math.sin(t * 2.2) * 0.06; lens.scale.z = f;    // focus pulse
      glass.material.emissiveIntensity = 0.3 + (0.5 + 0.5 * Math.sin(t * 2.2)) * 0.4;
      flares.rotation.y += dt * 0.12;
    } };
  };

  /* 🎵 music — a pulsing equalizer over a spinning record */
  SCENES.music = function (THREE, root, palette) {
    var g = new THREE.Group(); root.add(g);
    var disc = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.08, 64), std(THREE, { color: 0x0b0c10, roughness: 0.35, metalness: 0.6 }));
    disc.rotation.x = 1.15; disc.position.y = -0.9; g.add(disc);
    disc.add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 48), std(THREE, { color: palette.accent, roughness: 0.4, metalness: 0.3, emissive: palette.accent, emissiveIntensity: 0.3 })));
    disc.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 16), std(THREE, { color: 0xcccccc, metalness: 1, roughness: 0.2 })));
    var bars = [], N = 7, barMat = std(THREE, { color: palette.accent2, roughness: 0.3, metalness: 0.6, emissive: palette.accent2, emissiveIntensity: 0.4 });
    for (var i = 0; i < N; i++) {
      var b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1, 0.34), barMat);
      b.position.set((i - (N - 1) / 2) * 0.5, 0.4, 0); b.userData = { f: 1.4 + i * 0.5, ph: i * 0.7 }; g.add(b); bars.push(b);
    }
    var notes = points(THREE, 26, function (p, o) { p[o] = (Math.random() - 0.5) * 4; p[o + 1] = Math.random() * 3 - 1; p[o + 2] = (Math.random() - 0.5) * 2; },
      { size: 0.08, color: palette.accent, opacity: 0.7 });
    g.add(notes); var np = notes.userData.pos;
    return { update: function (t, dt, ptr) {
      g.rotation.y = Math.sin(t * 0.25) * 0.35 + ptr.x * 0.35;
      disc.rotation.z -= dt * 1.4;
      for (var i = 0; i < bars.length; i++) { var h = 0.5 + (0.5 + 0.5 * Math.sin(t * bars[i].userData.f + bars[i].userData.ph)) * 1.7; bars[i].scale.y = h; bars[i].position.y = h / 2; }
      for (var j = 1; j < np.length; j += 3) { np[j] += dt * 0.5; if (np[j] > 2) np[j] = -1; }
      notes.geometry.attributes.position.needsUpdate = true;
    } };
  };

  /* 🧘 wellness — balancing zen stones over spreading water ripples */
  SCENES.wellness = function (THREE, root, palette) {
    var g = new THREE.Group(); root.add(g);
    var stoneMat = std(THREE, { color: 0x8c99a3, roughness: 0.75, metalness: 0.05 });
    var accentStone = std(THREE, { color: palette.accent, roughness: 0.6, metalness: 0.1, emissive: palette.accent, emissiveIntensity: 0.12 });
    var stones = [], sizes = [0.9, 0.72, 0.56, 0.4], y = -0.9;
    for (var i = 0; i < sizes.length; i++) {
      var s = new THREE.Mesh(new THREE.SphereGeometry(sizes[i], 32, 24), i === sizes.length - 1 ? accentStone : stoneMat);
      s.scale.y = 0.42; s.position.y = y + sizes[i] * 0.42; y = s.position.y + sizes[i] * 0.42;
      s.userData = { base: s.position.y, ph: i * 0.8 }; g.add(s); stones.push(s);
    }
    var ripples = [], rmat = new THREE.MeshBasicMaterial({ color: palette.accent2, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    for (var r = 0; r < 4; r++) { var ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.02, 8, 64), rmat.clone()); ring.rotation.x = Math.PI / 2; ring.position.y = -1.35; ring.userData = { off: r * 0.9 }; g.add(ring); ripples.push(ring); }
    return { update: function (t, dt, ptr) {
      g.rotation.y += dt * 0.12 + ptr.x * dt * 0.5;
      for (var i = 0; i < stones.length; i++) { var s = stones[i]; s.rotation.z = Math.sin(t * 0.5 + s.userData.ph) * 0.05; s.position.x = Math.sin(t * 0.4 + s.userData.ph) * 0.04 * (i + 1); }
      for (var r = 0; r < ripples.length; r++) { var rg = ripples[r]; var k = ((t * 0.5 + rg.userData.off) % 3.6) / 3.6; rg.scale.setScalar(0.3 + k * 3); rg.material.opacity = 0.5 * (1 - k); }
    } };
  };
})();

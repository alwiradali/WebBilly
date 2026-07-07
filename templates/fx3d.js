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
    "store-beauty": "showcase", "store-fashion": "showcase",
    "store-home": "showcase", "store-supplements": "showcase"
  };
  var key = SCENE_KEY[page] || page;

  /* ---- reduced-motion is honoured live ---------------------------------- */
  var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false, addEventListener: function () {} };
  var teardown = null;
  var threePromise = null;

  function importThree() {
    if (!threePromise) {
      threePromise = import(new URL("./vendor/three.module.js", scriptURL).href);
    }
    return threePromise;
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
    importThree().then(function (THREE) {
      if (state.cancelled) { return; }
      state.dispose = boot(THREE);
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
  function boot(THREE) {
    var W = Math.max(art.clientWidth, 2), H = Math.max(art.clientHeight, 2);

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    var canvas = renderer.domElement;
    canvas.className = "gl-canvas";
    art.appendChild(canvas);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    camera.position.set(0, 0, 7);

    var palette = readPalette(THREE);
    var env = makeEnv(THREE, renderer, palette);
    scene.environment = env;
    rigLights(THREE, scene, palette);

    var root = new THREE.Group();
    scene.add(root);
    var build = SCENES[key] || SCENES.saas;   // scene builders are assigned below the IIFE flow
    var api = build(THREE, root, palette, { camera: camera, renderer: renderer });

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

    /* resize */
    var ro = new ResizeObserver(function () {
      var w = art.clientWidth, h = art.clientHeight;
      if (w < 2 || h < 2) return;
      renderer.setSize(w, h, false);
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
      renderer.render(scene, camera);
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
      if (env) env.dispose();
      renderer.dispose();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      art.classList.remove("gl-ready");
      setEmoji(true);
    };
  }

  /* ---- shared 3D helpers ------------------------------------------------- */
  function readPalette(THREE) {
    var cs = getComputedStyle(document.documentElement);
    function col(name, fb) {
      var v = (cs.getPropertyValue(name) || "").trim();
      try { return new THREE.Color(v || fb); } catch (e) { return new THREE.Color(fb); }
    }
    return { accent: col("--accent", "#2b7fff"), accent2: col("--accent-2", "#22d3ee") };
  }

  // Procedural environment map (vertical gradient tinted by the brand) so
  // metallic materials have something real to reflect — the "expensive" look
  // without shipping an HDRI.
  function makeEnv(THREE, renderer, palette) {
    var c = document.createElement("canvas");
    c.width = 16; c.height = 128;
    var ctx = c.getContext("2d");
    var g = ctx.createLinearGradient(0, 0, 0, 128);
    // A studio-softbox gradient: bright sky, brand-tinted mid, never black —
    // so metals reflect light and read jewel-like, not like dark silhouettes.
    var a = palette.accent.clone().lerp(new THREE.Color("#ffffff"), 0.6);
    var b = palette.accent2.clone().lerp(new THREE.Color("#ffffff"), 0.25);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.4, "#" + a.getHexString());
    g.addColorStop(0.72, "#" + b.getHexString());
    g.addColorStop(1, "#3a4152");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 128);
    var tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    var pmrem = new THREE.PMREMGenerator(renderer);
    var env = pmrem.fromEquirectangular(tex).texture;
    tex.dispose();
    pmrem.dispose();
    return env;
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
      std(THREE, { color: 0xffffff, roughness: 0.12, metalness: 1.0, envMapIntensity: 1.4 }));
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
  SCENES.showcase = function (THREE, root, palette) {
    var gemGeoByPage = {
      "store-beauty": new THREE.OctahedronGeometry(1.2, 0),
      "store-fashion": new THREE.DodecahedronGeometry(1.15, 0),
      "store-home": new THREE.IcosahedronGeometry(1.15, 0),
      "store-supplements": new THREE.CapsuleGeometry(0.6, 1.0, 8, 24)
    };
    var geo = gemGeoByPage[page] || new THREE.OctahedronGeometry(1.2, 0);
    var gem = new THREE.Mesh(geo,
      std(THREE, { color: palette.accent, roughness: 0.12, metalness: 0.55, envMapIntensity: 1.6, emissive: palette.accent, emissiveIntensity: 0.14 }));
    gem.position.y = 0.35;
    root.add(gem);
    var podium = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.35, 64),
      std(THREE, { color: 0x14161d, roughness: 0.3, metalness: 0.7, emissive: palette.accent, emissiveIntensity: 0.12 }));
    podium.position.y = -1.5;
    root.add(podium);
    var halo = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.02, 8, 96),
      new THREE.MeshBasicMaterial({ color: palette.accent2, transparent: true, opacity: 0.6 }));
    halo.rotation.x = Math.PI / 2; halo.position.y = -1.3;
    root.add(halo);
    var dust = points(THREE, 40, function (p, o) {
      var a = Math.random() * Math.PI * 2, r = 0.5 + Math.random() * 2.2;
      p[o] = Math.cos(a) * r; p[o + 1] = Math.random() * 3 - 1.4; p[o + 2] = Math.sin(a) * r;
    }, { size: 0.05, color: palette.accent2, opacity: 0.7 });
    root.add(dust);
    return { update: function (t, dt, ptr) {
      gem.rotation.y += dt * 0.5 + ptr.x * dt * 1.5;
      gem.rotation.x = Math.sin(t * 0.4) * 0.2 - ptr.y * 0.3;
      gem.position.y = 0.35 + Math.sin(t * 1.1) * 0.1;
      halo.scale.setScalar(1 + Math.sin(t * 1.5) * 0.03);
      dust.rotation.y += dt * 0.12;
    } };
  };
})();

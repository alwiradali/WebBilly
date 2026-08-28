/* ════════════════════════════════════════════════════════════════════
   SKYLINE INDIGO — Megacity Properties Ltd
   Three.js chevron-ribbon field + Lenis + GSAP scroll choreography.
   Degrades honestly: no JS / reduced motion = fully visible static page.
   Performance rules learned the hard way: DPR capped, renderer sleeps
   when the hero is off screen or the tab is hidden, no shader work at
   all beyond two lights, videos only play in view.
   ════════════════════════════════════════════════════════════════════ */
import * as THREE from "three";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(pointer: fine)").matches;
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

/* ── preloader curtain ─────────────────────────────────────────────── */
(function veil() {
  const v = $(".veil");
  if (!v || reduce || !window.gsap) { document.body.classList.add("is-ready"); return; }
  const bars = $$(".veil i");
  gsap.timeline({ onComplete: () => document.body.classList.add("is-ready") })
    .to(bars[0], { x: "0%", duration: .45, ease: "power3.inOut" }, .55)
    .to(bars[1], { x: "0%", duration: .45, ease: "power3.inOut" }, .68)
    .to(v, { autoAlpha: 0, duration: .4, ease: "power2.out" }, 1.25);
})();

/* ── smooth scroll ─────────────────────────────────────────────────── */
let lenis = null;
if (!reduce && window.Lenis && window.gsap && window.ScrollTrigger) {
  lenis = new Lenis({ lerp: .105, wheelMultiplier: 1 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ── 3D ribbon field ───────────────────────────────────────────────── */
(function bg3d() {
  const host = $("#bg3d");
  if (!host || reduce) return;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  } catch (e) { return; }
  const coarse = matchMedia("(pointer: coarse)").matches;
  const DPR = Math.min(devicePixelRatio || 1, coarse ? 1.25 : 1.6);
  renderer.setPixelRatio(DPR);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xfafbff, 26, 74);
  const cam = new THREE.PerspectiveCamera(38, 1, .1, 120);
  cam.position.set(0, 0, 34);

  scene.add(new THREE.AmbientLight(0xffffff, .85));
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(6, 10, 8);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x4da7d9, .5);
  rim.position.set(-8, -4, 6);
  scene.add(rim);

  /* the logo's ribbon: a flat chevron, extruded */
  const shape = new THREE.Shape();
  shape.moveTo(-2.4, -0.9); shape.lineTo(0, 1.5); shape.lineTo(2.4, -0.9);
  shape.lineTo(2.4, -2.1); shape.lineTo(0, .3); shape.lineTo(-2.4, -2.1);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: .55, bevelEnabled: false });
  geo.center();
  const matNavy = new THREE.MeshLambertMaterial({ color: 0x3d416e });
  const matSky = new THREE.MeshLambertMaterial({ color: 0x4da7d9 });
  const matPale = new THREE.MeshLambertMaterial({ color: 0xd9e6f6 });

  const N = coarse ? 26 : 44;
  const ribbons = [];
  for (let i = 0; i < N; i++) {
    const m = new THREE.Mesh(geo, i % 5 === 0 ? matSky : i % 3 === 0 ? matNavy : matPale);
    const s = .45 + Math.random() * 1.5;
    m.scale.setScalar(s);
    m.position.set((Math.random() - .5) * 56, (Math.random() - .5) * 34, -6 - Math.random() * 42);
    m.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    m.userData = {
      rx: (Math.random() - .5) * .0038, ry: (Math.random() - .5) * .0044,
      fy: .5 + Math.random(), ph: Math.random() * Math.PI * 2, y0: m.position.y,
    };
    scene.add(m);
    ribbons.push(m);
  }

  let w = 0, h = 0;
  function resize() {
    const r = host.getBoundingClientRect();
    if (r.width === w && r.height === h) return;
    w = r.width; h = r.height;
    renderer.setSize(w, h, false);
    cam.aspect = w / Math.max(1, h);
    cam.updateProjectionMatrix();
  }
  resize();
  addEventListener("resize", resize);

  /* pointer + scroll influence, both lerped */
  let px = 0, py = 0, tx = 0, ty = 0, scrollN = 0;
  if (finePointer) addEventListener("pointermove", e => {
    tx = (e.clientX / innerWidth - .5);
    ty = (e.clientY / innerHeight - .5);
  }, { passive: true });
  if (window.ScrollTrigger) {
    ScrollTrigger.create({
      trigger: "#top", start: "top top", end: "bottom top", scrub: true,
      onUpdate: st => { scrollN = st.progress; },
    });
  }

  /* render only while the hero is on screen and the tab is visible */
  let onScreen = true, t0 = performance.now();
  new IntersectionObserver(en => { onScreen = en[0].isIntersecting; }, { threshold: 0 }).observe(host);
  renderer.domElement.addEventListener("webglcontextlost", e => { e.preventDefault(); host.style.display = "none"; });

  function frame(t) {
    requestAnimationFrame(frame);
    if (!onScreen || document.hidden) return;
    const dt = Math.min(50, t - t0); t0 = t;
    px += (tx - px) * .045; py += (ty - py) * .045;
    cam.position.x = px * 3.2;
    cam.position.y = -py * 2.2 - scrollN * 5;
    cam.position.z = 34 - scrollN * 6;
    cam.lookAt(0, -scrollN * 4, 0);
    const tm = t * .001;
    for (let i = 0; i < ribbons.length; i++) {
      const r = ribbons[i], u = r.userData;
      r.rotation.x += u.rx * dt * .06;
      r.rotation.y += u.ry * dt * .06;
      r.position.y = u.y0 + Math.sin(tm * u.fy * .5 + u.ph) * 1.1;
    }
    renderer.render(scene, cam);
  }
  requestAnimationFrame(frame);
})();

/* ── nav state ─────────────────────────────────────────────────────── */
(function navState() {
  const nav = $("#nav");
  const onScroll = () => nav.classList.toggle("is-solid", scrollY > 40);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();

/* ── progress rail ─────────────────────────────────────────────────── */
(function rail() {
  const host = $("#rail");
  const secs = $$("[data-rail]");
  if (!host || !secs.length) return;
  const dots = secs.map(sec => {
    const b = document.createElement("button");
    b.title = sec.getAttribute("data-rail");
    b.setAttribute("aria-label", "Go to " + sec.getAttribute("data-rail"));
    b.onclick = () => (lenis ? lenis.scrollTo(sec, { offset: -60 }) : sec.scrollIntoView({ behavior: "smooth" }));
    host.appendChild(b);
    return b;
  });
  const io = new IntersectionObserver(ens => ens.forEach(en => {
    if (!en.isIntersecting) return;
    const i = secs.indexOf(en.target);
    dots.forEach((d, j) => d.classList.toggle("is-on", i === j));
  }), { rootMargin: "-42% 0px -42% 0px" });
  secs.forEach(s => io.observe(s));
})();

/* ── magnetic buttons ──────────────────────────────────────────────── */
if (finePointer && !reduce && window.gsap) $$(".magnet").forEach(el => {
  el.addEventListener("pointermove", e => {
    const r = el.getBoundingClientRect();
    gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * .22, y: (e.clientY - r.top - r.height / 2) * .3, duration: .4 });
  });
  el.addEventListener("pointerleave", () => gsap.to(el, { x: 0, y: 0, duration: .55, ease: "elastic.out(1,.55)" }));
});

/* ── service card tilt ─────────────────────────────────────────────── */
if (finePointer && !reduce && window.gsap) $$("[data-tilt]").forEach(card => {
  card.addEventListener("pointermove", e => {
    const r = card.getBoundingClientRect();
    gsap.to(card, {
      rotateY: (e.clientX - r.left - r.width / 2) / r.width * 7,
      rotateX: -(e.clientY - r.top - r.height / 2) / r.height * 7,
      transformPerspective: 900, duration: .45,
    });
  });
  card.addEventListener("pointerleave", () => gsap.to(card, { rotateX: 0, rotateY: 0, duration: .7, ease: "power3.out" }));
});

/* ── videos: only play in view ─────────────────────────────────────── */
$$("video").forEach(v => {
  if (reduce) { v.removeAttribute("autoplay"); return; }
  new IntersectionObserver(en => {
    if (en[0].isIntersecting) { v.play().catch(() => {}); }
    else v.pause();
  }, { threshold: .18 }).observe(v);
});

/* ── enquiry form → prefilled email ────────────────────────────────── */
(function enquiry() {
  const f = $("#enq");
  if (!f) return;
  f.addEventListener("submit", e => {
    e.preventDefault();
    const d = new FormData(f);
    const body = "Name: " + (d.get("name") || "") + "\nContact: " + (d.get("contact") || "") +
      "\n\n" + (d.get("message") || "");
    location.href = "mailto:info@megacityproperties.co.uk?subject=" +
      encodeURIComponent("Website enquiry — " + (d.get("name") || "")) +
      "&body=" + encodeURIComponent(body);
  });
})();

/* ── scroll choreography (GSAP — fromTo only, so no-JS stays visible) ── */
if (!reduce && window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);

  /* hero lines rise */
  gsap.fromTo(".hero h1 .ln > span", { yPercent: 110 },
    { yPercent: 0, duration: 1.1, ease: "power4.out", stagger: .12, delay: reduce ? 0 : 1.15 });
  gsap.fromTo(".hero-kicker, .hero-sub, .hero-ctas", { autoAlpha: 0, y: 26 },
    { autoAlpha: 1, y: 0, duration: .9, ease: "power3.out", stagger: .1, delay: 1.45 });

  /* manifesto word fill */
  const manif = $("#manifText");
  if (manif) {
    manif.innerHTML = manif.textContent.trim().split(/\s+/)
      .map(w => '<span class="w">' + w + "</span>").join(" ");
    gsap.fromTo("#manifText .w", { color: "#C6D2E6" }, {
      color: "#12142B", stagger: .06, ease: "none",
      scrollTrigger: { trigger: "#manif", start: "top 72%", end: "bottom 45%", scrub: .4 },
    });
  }

  /* section heads + cards */
  $$(".shead").forEach(el => gsap.fromTo(el, { autoAlpha: 0, y: 46 },
    { autoAlpha: 1, y: 0, duration: 1, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 84%" } }));
  gsap.fromTo(".svc", { autoAlpha: 0, y: 54 },
    { autoAlpha: 1, y: 0, duration: .9, ease: "power3.out", stagger: .12,
      scrollTrigger: { trigger: ".svc-grid", start: "top 82%" } });

  /* city band scale + copy */
  gsap.fromTo("#cityband video, #cityband .poster", { scale: 1.16 }, {
    scale: 1, ease: "none",
    scrollTrigger: { trigger: "#cityband", start: "top bottom", end: "bottom top", scrub: true },
  });
  gsap.fromTo(".band-copy > *", { autoAlpha: 0, y: 40 },
    { autoAlpha: 1, y: 0, duration: 1, stagger: .12, ease: "power3.out",
      scrollTrigger: { trigger: "#cityband", start: "top 55%" } });

  /* process rail: pinned horizontal on desktop */
  const track = $("#procTrack");
  if (track && matchMedia("(min-width: 901px)").matches) {
    const dist = () => Math.max(0, track.scrollWidth - innerWidth + 40);
    gsap.fromTo(track, { x: 0 }, {
      x: () => -dist(), ease: "none",
      scrollTrigger: {
        trigger: "#process", start: "top 12%", end: () => "+=" + (dist() + innerHeight * .2),
        pin: true, scrub: .5, invalidateOnRefresh: true,
      },
    });
  }

  /* homes: inner-image parallax */
  $$("[data-par] img").forEach(img => gsap.fromTo(img, { yPercent: -9 }, {
    yPercent: 0, ease: "none",
    scrollTrigger: { trigger: img.closest(".home"), start: "top bottom", end: "bottom top", scrub: true },
  }));
  gsap.fromTo(".home", { autoAlpha: 0, y: 60 },
    { autoAlpha: 1, y: 0, duration: 1, ease: "power3.out", stagger: .08,
      scrollTrigger: { trigger: ".homes-grid", start: "top 84%" } });

  /* split + duo + creds + contact reveals */
  gsap.fromTo(".split-copy > *", { autoAlpha: 0, y: 34 },
    { autoAlpha: 1, y: 0, duration: .9, stagger: .1, ease: "power3.out",
      scrollTrigger: { trigger: ".split", start: "top 62%" } });
  gsap.fromTo("#homeVideo, .split-media .poster", { yPercent: -6 }, {
    yPercent: 0, ease: "none",
    scrollTrigger: { trigger: ".split", start: "top bottom", end: "bottom top", scrub: true },
  });
  gsap.fromTo(".cred", { autoAlpha: 0, y: 34 },
    { autoAlpha: 1, y: 0, duration: .8, stagger: .09, ease: "power3.out",
      scrollTrigger: { trigger: ".creds", start: "top 80%" } });
  gsap.fromTo(".contact h2", { autoAlpha: 0, y: 50 },
    { autoAlpha: 1, y: 0, duration: 1, ease: "power3.out",
      scrollTrigger: { trigger: ".contact", start: "top 78%" } });
  gsap.fromTo(".footer-word", { yPercent: 42 }, {
    yPercent: 0, ease: "none",
    scrollTrigger: { trigger: ".footer", start: "top bottom", end: "bottom bottom", scrub: true },
  });
}

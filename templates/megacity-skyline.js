/* ════════════════════════════════════════════════════════════════════
   SKYLINE INDIGO — Megacity Properties Ltd
   Three.js chevron-ribbon field + Lenis + GSAP scroll choreography.
   Degrades honestly: no JS / reduced motion = fully visible static page.
   Performance rules learned the hard way: DPR capped, renderer sleeps
   when the hero is off screen or the tab is hidden, no shader work at
   all beyond two lights, videos only play in view.
   ════════════════════════════════════════════════════════════════════ */
/* three.js removed with the 3D hero — saves a 670KB module download */

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
/* (3D chevron field retired — hero is now the real Manchester skyline) */

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

  /* process rail: pinned horizontal on desktop, scroll-driven on mobile */
  const track = $("#procTrack");
  if (track && !matchMedia("(min-width: 901px)").matches) {
    /* phones: vertical scroll slides the cards horizontally — a sticky
       runway, no pinning, no jank on iOS */
    const proc = $("#process"), view = $("#procView");
    const dist = () => Math.max(0, track.scrollWidth - innerWidth + 40);
    view.style.position = "sticky";
    view.style.top = "17vh";
    view.style.overflow = "clip";
    const setup = () => { proc.style.height = (innerHeight * 0.9 + dist()) + "px"; };
    setup();
    addEventListener("resize", setup);
    const drive = () => {
      const r = proc.getBoundingClientRect();
      const total = Math.max(1, r.height - innerHeight * 0.9);
      const p = Math.max(0, Math.min(1, -r.top / total));
      track.style.transform = "translateX(" + (-p * dist()) + "px)";
    };
    addEventListener("scroll", drive, { passive: true });
    drive();
  }
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
  /* landlord service sections */
  $$(".lsec").forEach(sec => {
    gsap.fromTo(sec.querySelectorAll(".lsec-copy > *"), { autoAlpha: 0, y: 34 },
      { autoAlpha: 1, y: 0, duration: .85, stagger: .08, ease: "power3.out",
        scrollTrigger: { trigger: sec, start: "top 74%" } });
    const m = sec.querySelector(".lsec-media img");
    if (m) gsap.fromTo(m, { scale: 1.12 }, { scale: 1, ease: "none",
      scrollTrigger: { trigger: sec, start: "top bottom", end: "bottom top", scrub: .6 } });
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


/* ── free valuation form → the office inbox ─────────────────────────── */
(() => {
  const f = document.getElementById("valForm");
  if (!f) return;
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const g = id => (f.querySelector("#" + id) || {}).value || "";
    const btn = f.querySelector("button");
    btn.disabled = true; btn.style.opacity = ".6";
    try {
      const r = await fetch("/api/megacity-contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: g("vName"), email: g("vEmail"), phone: g("vPhone"),
          topic: "Free landlord valuation",
          message: "Free valuation requested via the website.\nPostcode: " + g("vPost"),
          botcheck: ""
        })
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "something went wrong");
      f.querySelectorAll("input,button").forEach(el => el.style.display = "none");
      f.querySelector(".val-done").hidden = false;
    } catch (err) {
      btn.disabled = false; btn.style.opacity = "";
      const n = f.querySelector(".val-note");
      if (n) n.textContent = "Could not send — " + err.message + ". Please call 0161 220 1763.";
    }
  });
})();


/* ── mega menu ──────────────────────────────────────────────────────── */
(() => {
  const burger = document.getElementById("burger");
  const menu = document.getElementById("megamenu");
  if (!burger || !menu) return;
  let open = false;
  const setOpen = (v) => {
    open = v;
    burger.setAttribute("aria-expanded", v ? "true" : "false");
    burger.setAttribute("aria-label", v ? "Close menu" : "Open menu");
    document.body.classList.toggle("mm-open", v);
    if (v) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add("is-open"));
    } else {
      menu.classList.remove("is-open");
      setTimeout(() => { if (!open) menu.hidden = true; }, 280);
    }
  };
  burger.addEventListener("click", () => setOpen(!open));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && open) setOpen(false); });
})();


/* ── floating buttons must never cover the footer ────────────────────── */
(() => {
  const fab = document.querySelector(".fab");
  const foot = document.querySelector(".footer");
  if (!fab || !foot || !("IntersectionObserver" in window)) return;
  new IntersectionObserver(
    ([e]) => fab.classList.toggle("is-hidden", e.isIntersecting),
    { rootMargin: "0px 0px -25% 0px" }
  ).observe(foot);
})();

/* ── area search → the homes section, filtered ───────────────────────── */
(() => {
  const f = document.getElementById("areaSearch");
  if (!f) return;
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const area = (document.getElementById("asArea") || {}).value || "";
    const type = (document.getElementById("asType") || {}).value || "";
    const budget = (document.getElementById("asBudget") || {}).value || "";
    const cards = Array.from(document.querySelectorAll(".home"));
    let shown = 0;
    cards.forEach((c) => {
      const t = c.textContent.toLowerCase();
      const ok = (!area || t.includes(area.toLowerCase())) &&
                 (!type || t.includes(type.toLowerCase().split(" ")[0]));
      c.style.display = ok ? "" : "none";
      if (ok) shown++;
    });
    const note = document.getElementById("asNote");
    if (note) {
      note.textContent = shown
        ? shown + (shown === 1 ? " home" : " homes") + " matching" + (area ? " in " + area : "") +
          (budget ? " · " + budget.replace(/&pound;/g, "£") : "")
        : "Nothing listed there right now — register and we'll call you first.";
      note.hidden = false;
    }
    const homes = document.getElementById("homes");
    if (homes) homes.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();

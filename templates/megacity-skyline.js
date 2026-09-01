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
  const AWAY_AFTER = 260;   // clear of the hero before it starts hiding
  const DEADZONE   = 6;     // ignore the jitter of a finger resting on glass
  let last = scrollY;

  const onScroll = () => {
    const y = Math.max(0, scrollY);
    const scrolled = y > 40;
    nav.classList.toggle("is-solid", scrolled);

    /* White only at the very top of the page; the moment you scroll, the bar
       holds the brand blue with his white artwork, whatever passes beneath. */
    nav.classList.toggle("nav--dark", scrolled);

    /* Out of the way while you are reading down the page, back the moment you
       head up, because going up is what asking for the menu looks like. */
    const delta = y - last;
    if (Math.abs(delta) > DEADZONE) {
      const menuOpen = !menu().hidden;
      const inBar = nav.contains(document.activeElement);
      if (delta > 0 && y > AWAY_AFTER && !menuOpen && !inBar) nav.classList.add("is-away");
      else if (delta < 0) nav.classList.remove("is-away");
      last = y;
    }
    if (y <= AWAY_AFTER) nav.classList.remove("is-away");
  };

  const menu = () => document.getElementById("megamenu") || { hidden: true };
  // the bar carries the close button, so it can never be away while the menu is up
  nav.addEventListener("mc:show", () => nav.classList.remove("is-away"));

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
      color: "#12142B", stagger: .045, ease: "none",
      // finish the fill while the paragraph is still well in view: ending at
      // "bottom 45%" left the last words pale for anyone reading on a phone
      scrollTrigger: { trigger: "#manif", start: "top 85%", end: "bottom 78%", scrub: .4 },
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

  /* The four steps used to sit on a pinned horizontal rail: the page stopped
     moving down and the cards slid sideways instead. It was already off on
     touch because the swipe was unreliable, and on desktop it took the scroll
     away from the reader in the middle of the page, which is the thing that
     makes people give up. They are a plain grid now and just reveal in place. */
  gsap.fromTo(".step", { autoAlpha: 0, y: 40 },
    { autoAlpha: 1, y: 0, duration: .85, stagger: .1, ease: "power3.out",
      scrollTrigger: { trigger: ".proc-track", start: "top 82%" } });

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
          message: "Free valuation requested via the website."
            + "\nWhat they need: " + ((f.querySelector('input[name=vtype]:checked') || {}).value || "not stated")
            + "\nPostcode: " + g("vPost"),
          botcheck: ""
        })
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "the message did not go through");
      f.querySelectorAll("input,button").forEach(el => el.style.display = "none");
      f.querySelector(".val-done").hidden = false;
    } catch (err) {
      btn.disabled = false; btn.style.opacity = "";
      const n = f.querySelector(".val-note");
      if (n) n.textContent = "That did not go through (" + err.message + "). Please call 0161 220 1763 and we will handle it directly.";
    }
  });
})();


/* ── mega menu ──────────────────────────────────────────────────────── */
(() => {
  const burger = document.getElementById("burger");
  const menu = document.getElementById("megamenu");
  if (!burger || !menu) return;
  let open = false, lastFocus = null;
  const setOpen = (v) => {
    open = v;
    burger.setAttribute("aria-expanded", v ? "true" : "false");
    burger.setAttribute("aria-label", v ? "Close menu" : "Open menu");
    document.body.classList.toggle("mm-open", v);
    /* Locking the body removes the scrollbar, which shifts the whole layout
       sideways as the menu opens. Hold the gap open while it is locked. */
    if (v) {
      const gap = innerWidth - document.documentElement.clientWidth;
      if (gap > 0) document.body.style.paddingRight = gap + "px";
      lastFocus = document.activeElement;
    } else {
      document.body.style.paddingRight = "";
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    // lenis is module scope, not on window: window.lenis is always undefined
    // and the smooth scroller would have kept running behind the open menu
    if (lenis) v ? lenis.stop() : lenis.start();
    if (v) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add("is-open"));
    } else {
      menu.classList.remove("is-open");
      setTimeout(() => { if (!open) menu.hidden = true; }, 280);
    }
  };
  burger.addEventListener("click", () => setOpen(!open));
  // the burger lives in the bar, so bring it back before the menu appears
  const navEl = $("#nav");
  if (navEl) burger.addEventListener("click", () => navEl.dispatchEvent(new Event("mc:show")));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && open) setOpen(false); });
})();


/* ── site search ─────────────────────────────────────────────────────── */
(() => {
  const btn = document.getElementById("navSearch");
  const lay = document.getElementById("searchlay");
  if (!btn || !lay) return;
  const input = document.getElementById("slInput");
  const res = document.getElementById("slRes");

  const PAGES = [
    { t: "Homes to rent", d: "Every property currently available, with filters", u: "megacity-properties", k: "properties homes rent listings available flat house search" },
    { t: "Book a free rental valuation", d: "What your property should let for, from the team", u: "megacity-valuation", k: "valuation appraisal free book rent worth price" },
    { t: "Landlords", d: "Services, fees and how your property is managed properly", u: "megacity-for-landlords", k: "landlord investor manage protect own" },
    { t: "Fees & pricing", d: "5% rent collection, 8% fully managed, and what high street agents charge", u: "megacity-for-landlords#fees", k: "fees pricing cost charges percent compare cheap high street" },
    { t: "Tenant Find", d: "\u00a3295 for landlords new to Megacity: marketing, vetting, paperwork", u: "megacity-tenant-find", k: "tenant find 295 let only advertise vetting referencing" },
    { t: "Rent Collection", d: "Tenant Find plus the rent chased and paid over, at 5%", u: "megacity-rent-collection", k: "rent collection 5 arrears chase statements" },
    { t: "Fully Managed", d: "The whole tenancy handled end to end, at 8%", u: "megacity-fully-managed", k: "fully managed 8 management complete repairs inspections" },
    { t: "Switch to Megacity", d: "Moving from your current agent, handled for you", u: "megacity-switch", k: "switch change agent transfer move leave" },
    { t: "HMO management", d: "Licensing, room lets and shared houses", u: "megacity-hmo", k: "hmo house share licence rooms multiple occupation" },
    { t: "Maintenance & repairs", d: "How repairs are reported, approved and done", u: "megacity-maintenance", k: "maintenance repair broken boiler leak contractor report" },
    { t: "Compliance & certificates", d: "Gas, electrical, EPC, deposits and licensing kept current", u: "megacity-compliance", k: "compliance certificate gas eicr epc legal safety deposit" },
    { t: "Tenants", d: "Renting with Megacity: homes, rights and the portal", u: "megacity-renting", k: "tenant renting rent room apartment rights register" },
    { t: "Rent & yield calculators", d: "Work the numbers on a property", u: "megacity-tools", k: "calculator tools yield mortgage stamp duty numbers" },
    { t: "About us", d: "Where landlords and tenants have peace of mind", u: "megacity-about-us", k: "about team who trust accreditations" },
    { t: "Contact us", d: "0161 220 1763 \u00b7 info@megacityproperties.co.uk", u: "megacity-contact-us", k: "contact phone email office address whatsapp call talk" },
  ];
  const GUIDES = [
    { t: "The Renters\u2019 Rights Act, in plain English", d: "What actually changed for landlords", u: "megacity-journal#renters-rights", k: "renters rights act law section 21 periodic tenancy" },
    { t: "Does my property need an HMO licence?", d: "Mandatory, additional and selective licensing", u: "megacity-journal#hmo-licence", k: "hmo licence licensing selective mandatory council" },
    { t: "Awaab\u2019s Law, damp and mould", d: "The new deadlines and how to meet them", u: "megacity-journal#awaabs-law", k: "awaab damp mould hazard deadline repair" },
    { t: "What a void month really costs", d: "And how to keep a property occupied", u: "megacity-journal#voids", k: "void empty vacancy cost pricing" },
    { t: "Winning a deposit dispute", d: "Starts on move-in day, with the inventory", u: "megacity-journal#deposits", k: "deposit dispute inventory adjudication dps" },
    { t: "Landlord journal", d: "All guides in one place", u: "megacity-journal", k: "journal blog guides articles advice news" },
  ];
  const HOMES = [
    { t: "2 bed apartment, Denmark Road, Manchester", d: "2 bed \u00b7 2 bath \u00b7 bills included", u: "megacity-let-denmark-road", k: "apartment flat manchester denmark two bed bills" },
    { t: "2 bed apartment, Ladywell Point, Salford", d: "2 bed \u00b7 2 bath \u00b7 balcony", u: "megacity-let-ladywell-point", k: "apartment flat salford ladywell balcony two bed" },
    { t: "Furnished double room, licensed HMO, Salford", d: "Double room \u00b7 bills included", u: "megacity-let-room-3", k: "room double share hmo salford bills furnished" },
    { t: "Double room, high spec house share, Salford", d: "Double room \u00b7 bills included", u: "megacity-let-room-5", k: "room double share house salford bills spec" },
    { t: "Large double room, licensed HMO, Salford", d: "Double room \u00b7 bills included", u: "megacity-let-room-7", k: "room double large share hmo salford bills" },
  ];

  const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const item = (r) => `<a class="sl-a" href="${r.u}"><b>${esc(r.t)}</b><span>${esc(r.d)}</span></a>`;
  const group = (h, rows) => rows.length ? `<p class="sl-h">${h}</p>` + rows.map(item).join("") : "";
  const hay = (r) => (r.t + " " + r.d + " " + r.k + " " + r.u).toLowerCase();
  const match = (list, words) => list.filter((r) => { const h = hay(r); return words.every((w) => h.includes(w)); });

  const render = () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      res.innerHTML = group("Popular", [PAGES[0], PAGES[1], PAGES[3], PAGES[14]]);
      return;
    }
    const words = q.split(/\s+/);
    const pages = match(PAGES, words), guides = match(GUIDES, words), homes = match(HOMES, words);
    if (!pages.length && !guides.length && !homes.length) {
      res.innerHTML = `<p class="sl-none">Nothing found for \u201c${esc(input.value.trim())}\u201d. Try
        \u201crooms\u201d, \u201cfees\u201d or \u201cvaluation\u201d, or ring
        <a href="tel:+441612201763">0161 220 1763</a>.</p>`;
      return;
    }
    res.innerHTML = group("Homes to rent", homes) + group("Pages", pages) + group("Landlord guides", guides);
  };

  let open = false, lastFocus = null;
  const setOpen = (v) => {
    open = v;
    btn.setAttribute("aria-expanded", v ? "true" : "false");
    document.body.classList.toggle("sl-open", v);
    // same scrollbar-gap hold as the mega menu, so the page never shifts
    if (v) {
      const gap = innerWidth - document.documentElement.clientWidth;
      if (gap > 0) document.body.style.paddingRight = gap + "px";
      lastFocus = document.activeElement;
    } else {
      document.body.style.paddingRight = "";
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    if (lenis) v ? lenis.stop() : lenis.start();
    if (v) {
      lay.hidden = false;
      render();
      requestAnimationFrame(() => {
        lay.classList.add("is-open");
        input.focus();
      });
    } else {
      lay.classList.remove("is-open");
      setTimeout(() => { if (!open) lay.hidden = true; }, 260);
    }
  };

  btn.addEventListener("click", () => setOpen(!open));
  const navEl = $("#nav");
  if (navEl) btn.addEventListener("click", () => navEl.dispatchEvent(new Event("mc:show")));
  document.getElementById("slClose").addEventListener("click", () => setOpen(false));
  lay.addEventListener("click", (e) => {
    if (e.target.closest("a")) { setOpen(false); return; }
    if (!e.target.closest(".sl-bar") && !e.target.closest(".sl-res")) setOpen(false);
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && open) setOpen(false); });
  input.addEventListener("input", render);
  lay.querySelector(".sl-bar").addEventListener("submit", (e) => {
    e.preventDefault();
    const first = res.querySelector("a");
    if (first) location.href = first.getAttribute("href");
  });
})();


/* ── property page: brochure print + viewing request ─────────────────── */
(() => {
  const pr = document.querySelector("[data-print]");
  if (pr) pr.addEventListener("click", () => print());

  const f = document.querySelector("[data-viewing]");
  if (!f) return;
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const note = f.querySelector(".pd-vnote");
    const btn = f.querySelector("button[type=submit]");
    btn.disabled = true; btn.style.opacity = ".6"; note.textContent = "";
    try {
      const r = await fetch("/api/megacity-viewing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.name.value.trim(),
          phone: f.phone.value.trim(),
          email: f.email.value.trim(),
          day: f.day.value.trim(),
          property: f.dataset.property,
          botcheck: f.botcheck.value
        })
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "the request did not go through");
      f.hidden = true;
      const done = document.querySelector(".pd-vdone");
      if (done) done.hidden = false;
    } catch (err) {
      btn.disabled = false; btn.style.opacity = "";
      note.textContent = "That did not go through (" + err.message + "). Please call 0161 220 1763 and we will book it directly.";
    }
  });
})();


/* ── floating buttons must never cover the footer ────────────────────── */
(() => {
  const fab = document.querySelector(".fab");
  const pill = document.getElementById("fabVal");
  // pointless on the page it links to
  if (pill && /megacity-valuation/.test(location.pathname)) pill.hidden = true;
  const foot = document.querySelector(".footer");
  if (!fab || !foot || !("IntersectionObserver" in window)) return;
  new IntersectionObserver(
    ([e]) => {
      fab.classList.toggle("is-hidden", e.isIntersecting);
      if (pill) pill.classList.toggle("is-hidden", e.isIntersecting);
    },
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

/* ── Property photo viewer ──────────────────────────────────────────────
   Thumbnails open full size, with arrow keys, swipe and a close button. */
(function photoViewer() {
  const thumbs = [...document.querySelectorAll(".pg-thumb")];
  const heroImg = document.querySelector(".pd-main img");
  if (!thumbs.length && !heroImg) return;

  const shots = [];
  if (heroImg) shots.push(heroImg.getAttribute("src"));
  thumbs.forEach(t => shots.push(t.dataset.full));

  const pv = document.createElement("div");
  pv.className = "pv";
  pv.setAttribute("role", "dialog");
  pv.setAttribute("aria-modal", "true");
  pv.setAttribute("aria-label", "Property photograph");
  // no src until it is opened: an <img> sitting in the DOM with an empty src
  // reads as a broken image to crawlers and to our own QA probe
  pv.innerHTML =
    '<img alt="" hidden>' +
    '<button class="pv-x" aria-label="Close">×</button>' +
    '<button class="pv-nav pv-prev" aria-label="Previous photo">‹</button>' +
    '<button class="pv-nav pv-next" aria-label="Next photo">›</button>' +
    '<p class="pv-count"></p>';
  document.body.appendChild(pv);

  const img = pv.querySelector("img");
  const count = pv.querySelector(".pv-count");
  let at = 0, lastFocus = null;

  const show = i => {
    at = (i + shots.length) % shots.length;
    img.hidden = false;
    img.src = shots[at];
    img.alt = "Property photograph " + (at + 1) + " of " + shots.length;
    count.textContent = (at + 1) + " / " + shots.length;
  };
  const open = i => {
    lastFocus = document.activeElement;
    show(i);
    pv.classList.add("is-open");
    document.body.style.overflow = "hidden";
    pv.querySelector(".pv-x").focus();
  };
  const close = () => {
    pv.classList.remove("is-open");
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  };

  if (heroImg) {
    heroImg.style.cursor = "zoom-in";
    heroImg.addEventListener("click", () => open(0));
  }
  thumbs.forEach((t, i) => t.addEventListener("click", () => open(i + (heroImg ? 1 : 0))));

  pv.querySelector(".pv-x").addEventListener("click", close);
  pv.querySelector(".pv-prev").addEventListener("click", e => { e.stopPropagation(); show(at - 1); });
  pv.querySelector(".pv-next").addEventListener("click", e => { e.stopPropagation(); show(at + 1); });
  pv.addEventListener("click", e => { if (e.target === pv || e.target === img) close(); });

  document.addEventListener("keydown", e => {
    if (!pv.classList.contains("is-open")) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") show(at - 1);
    else if (e.key === "ArrowRight") show(at + 1);
  });

  let x0 = null;
  pv.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
  pv.addEventListener("touchend", e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 45) show(at + (dx < 0 ? 1 : -1));
    x0 = null;
  }, { passive: true });
})();

/* ── What you'd save ─────────────────────────────────────────────────
   One slider, the rent. The high street figure is fixed at 15% including VAT:
   published guides put full management at 10% to 15% plus VAT, so 12% to 18%
   inclusive, and 15% is the middle of that. Ours are inclusive already, so the
   two sides are the same kind of number. */
(function savings() {
  const rent = document.getElementById("svRent");
  if (!rent) return;

  const HIGH_ST = 15, RENT_COLL = 5, MANAGED = 8;
  const gbp = n => "\u00a3" + Math.round(n).toLocaleString("en-GB");
  const out = id => document.getElementById(id);
  const year = (r, pct) => r * (pct / 100) * 12;

  const paint = (r) => {
    out("svThem").textContent = gbp(year(r, HIGH_ST)) + " a year";
    out("svRc").textContent   = gbp(year(r, RENT_COLL)) + " a year";
    out("svUs").textContent   = gbp(year(r, MANAGED)) + " a year";
    out("svDiff").textContent = gbp(year(r, HIGH_ST) - year(r, MANAGED)) + " a year";
  };

  const draw = () => {
    const r = +rent.value;
    out("svRentOut").textContent = gbp(r);
    paint(r);
    const pct = ((r - rent.min) / (rent.max - rent.min)) * 100;
    rent.style.background = `linear-gradient(90deg,#176B99 ${pct}%,#DCE6F6 ${pct}%)`;
  };
  rent.addEventListener("input", draw);

  /* A slider cannot land on a real rent like 1,347, and a landlord knows their
     own figure, so let them type it. The slider keeps its range for the fill. */
  const manual = document.getElementById("svManual");
  const entry  = document.getElementById("svEntry");
  const num    = document.getElementById("svRentNum");
  if (manual && entry && num) {
    manual.addEventListener("click", () => {
      const typing = entry.hidden;
      entry.hidden = !typing;
      out("svRentOut").hidden = typing;
      rent.hidden = typing;
      manual.textContent = typing ? "Use the slider" : "Enter amount manually";
      if (typing) { num.value = rent.value; num.focus(); num.select(); }
      else draw();
    });
    num.addEventListener("input", () => {
      const v = Math.max(0, Math.min(20000, +num.value || 0));
      // clamp only what feeds the slider; the typed figure drives the sums
      rent.value = Math.max(+rent.min, Math.min(+rent.max, v));
      paint(v);
    });
  }

  draw();
})();


/* ── the comparison table ───────────────────────────────────────────────
   Twenty four rows runs to about three screens on a phone, which is a lot to
   scroll past before the rest of the page. Collapse the tail behind a control,
   but only from script: with no JS the whole table is there, which is the way
   round it has to be for something that states what a landlord is buying. */
(function pkgTable() {
  const table = document.querySelector(".pkg-table");
  const btn = document.getElementById("pkgMore");
  if (!table || !btn) return;
  const rows = [...table.querySelectorAll(".pkg-row")];
  const KEEP = 10;
  if (rows.length <= KEEP + 3) return;

  const hidden = rows.slice(KEEP);
  const apply = (open) => {
    hidden.forEach(r => r.hidden = !open);
    btn.textContent = open
      ? "Show less"
      : `Show all ${rows.length}, and what each service covers`;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  };
  btn.hidden = false;
  btn.setAttribute("aria-controls", "pkgTable");
  table.id = table.id || "pkgTable";
  apply(false);

  btn.addEventListener("click", () => {
    const open = btn.getAttribute("aria-expanded") === "true";
    apply(!open);
    if (open) table.scrollIntoView({ block: "start", behavior: "smooth" });
  });
})();


/* ── where am I ──────────────────────────────────────────────────────────
   The bar shows seven destinations; mark the one being viewed so the answer
   is visible rather than something the reader has to remember. */
(function currentPage() {
  const here = location.pathname.split("/").pop().replace(/\.html$/, "");
  if (!here) return;
  document.querySelectorAll(".nav-links a").forEach(a => {
    const target = (a.getAttribute("href") || "").split("#")[0].replace(/\.html$/, "");
    if (target && target === here) a.setAttribute("aria-current", "page");
  });
})();


/* ── Properties: filtering ───────────────────────────────────────────────
   Filters run against data attributes already on each card, so nothing is
   fetched and nothing can half-load. With no matches the grid is replaced by
   a real way forward rather than an empty box. */
(function propertyList() {
  const grid = document.getElementById("plGrid");
  if (!grid) return;
  const cards = [...grid.querySelectorAll(".pl-card")];
  const fArea = document.getElementById("fArea");
  const fType = document.getElementById("fType");
  const fBeds = document.getElementById("fBeds");
  const count = document.getElementById("plCount");
  const empty = document.getElementById("plEmpty");

  const apply = () => {
    const a = fArea.value, t = fType.value, b = fBeds.value;
    let shown = 0;
    cards.forEach(c => {
      const ok = (!a || c.dataset.area === a)
              && (!t || c.dataset.type === t)
              && (!b || c.dataset.beds === b);
      c.hidden = !ok;
      if (ok) shown++;
    });
    count.textContent = shown === cards.length
      ? `Showing all ${cards.length} properties`
      : `Showing ${shown} of ${cards.length} properties`;
    empty.hidden = shown > 0;
    grid.hidden = shown === 0;
  };

  const reset = () => { fArea.value = ""; fType.value = ""; fBeds.value = ""; apply(); };
  [fArea, fType, fBeds].forEach(el => el.addEventListener("change", apply));
  document.getElementById("plReset").addEventListener("click", reset);
  document.getElementById("plClear2").addEventListener("click", reset);
  apply();
})();


/* ── Calculators: one reset ──────────────────────────────────────────────
   Every field carries its shipped value as a data attribute the first time
   this runs, so reset restores the page as it loaded rather than emptying it. */
(function toolsReset() {
  const btn = document.getElementById("toolsReset");
  if (!btn) return;
  const fields = [...document.querySelectorAll(".tool-form input, .tool-form select")];
  fields.forEach(f => { if (!f.dataset.initial) f.dataset.initial = f.value; });
  btn.addEventListener("click", () => {
    fields.forEach(f => {
      f.value = f.dataset.initial;
      f.dispatchEvent(new Event("input", { bubbles: true }));
      f.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const first = document.querySelector(".tsec");
    if (first) first.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();

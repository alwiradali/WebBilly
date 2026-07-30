/* ============================================================
   BAY BEAUTY by Bayan — interaction layer.
   Lenis smooth scroll · GSAP ScrollTrigger reveals · magnetic
   cursor · counters · card tilt · mobile menu · WhatsApp FAB ·
   the "Bay" AI concierge (local knowledge base).
   Degrades gracefully with no libs / reduced motion.
   ------------------------------------------------------------
   ⚙️  EDIT ONE PLACE — real links & number live in BB.config.
   ============================================================ */
(function () {
  "use strict";

  /* ========== CONFIG — update with Bayan's real details ========== */
  const BB = window.BB = {
    config: {
      brand: "Bay Beauty",
      artist: "Bayan",
      phoneDisplay: "+44 7XXX XXXXXX",         // ← real number
      whatsapp: "447000000000",                 // ← wa.me digits, no +/spaces
      email: "hello@baybeautybybayan.co.uk",    // ← real email
      instagram: "https://www.instagram.com/officialbaybeautybb",  // ✓ real
      tiktok: "https://www.tiktok.com/@officialbaybeauty2",        // ✓ real
      facebook: "",                                                // ← add if she has one
      area: "Luton · London · UK"
    }
  };
  const C = BB.config;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const waLink = (msg) => `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(msg || "Hi Bayan! I'd love to book a makeup appointment ✨")}`;
  BB.waLink = waLink;

  /* ========== fill in links wherever tagged ========== */
  function wireLinks() {
    $$("[data-wa]").forEach(a => a.href = waLink(a.getAttribute("data-wa") || ""));
    $$("[data-ig]").forEach(a => a.href = C.instagram);
    $$("[data-tt]").forEach(a => a.href = C.tiktok);
    $$("[data-fb]").forEach(a => a.href = C.facebook);
    $$("[data-mail]").forEach(a => a.href = "mailto:" + C.email);
    $$("[data-tel]").forEach(a => { a.href = "tel:" + C.phoneDisplay.replace(/\s/g, ""); });
    $$("[data-phone-txt]").forEach(a => a.textContent = C.phoneDisplay);
    $$("[data-area-txt]").forEach(a => a.textContent = C.area);
    $$("[data-year]").forEach(a => a.textContent = new Date().getFullYear());
  }

  /* ========== preloader ========== */
  function preloader() {
    const pl = $(".pl");
    document.body.classList.add("loading");
    const done = () => {
      document.body.classList.remove("loading");
      if (pl) { pl.classList.add("done"); setTimeout(() => pl.remove(), 1400); }
      document.body.classList.add("ready");
    };
    if (reduce) { done(); return; }
    window.addEventListener("load", () => setTimeout(done, 900));
    setTimeout(done, 2600); // safety
  }

  /* ========== smooth scroll + ScrollTrigger ========== */
  function scrollSetup() {
    let lenis = null;
    if (window.Lenis && !reduce) {
      lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
      if (window.ScrollTrigger) {
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add(t => lenis.raf(t * 1000));
        gsap.ticker.lagSmoothing(0);
      } else {
        const raf = t => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf);
      }
      BB.lenis = lenis;
    }
    // anchor links via lenis
    $$('a[href^="#"]').forEach(a => a.addEventListener("click", e => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const el = $(id); if (!el) return;
      e.preventDefault();
      closeMenu();
      if (lenis) lenis.scrollTo(el, { offset: -70, duration: 1.3 });
      else el.scrollIntoView({ behavior: "smooth" });
    }));
  }

  /* ========== reveals ========== */
  function reveals() {
    const items = $$("[data-rv],[data-stag],[data-text],.clip");
    if (reduce || !("IntersectionObserver" in window)) {
      items.forEach(el => el.classList.add("in")); return;
    }
    // wrap text lines
    $$("[data-text]").forEach(el => {
      const lines = el.innerHTML.split(/<br\s*\/?>/i);
      el.innerHTML = lines.map(l => `<span class="tline"><span>${l}</span></span>`).join("");
    });
    const io = new IntersectionObserver((es) => {
      es.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        el.classList.add("in");
        if (el.hasAttribute("data-stag")) {
          const step = +el.dataset.stagStep || 90;
          $$(":scope > *", el).forEach((c, i) => c.style.transitionDelay = (i * step) + "ms");
        }
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    items.forEach(el => io.observe(el));
  }

  /* ========== progress bar ========== */
  function progress() {
    const bar = $(".progress"); if (!bar) return;
    const upd = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`;
    };
    addEventListener("scroll", upd, { passive: true }); upd();
  }

  /* ========== nav ========== */
  function nav() {
    const n = $(".nav"); if (!n) return;
    const upd = () => n.classList.toggle("solid", scrollY > 40);
    addEventListener("scroll", upd, { passive: true }); upd();
    const burger = $(".burger"), menu = $(".mmenu");
    if (burger && menu) {
      burger.addEventListener("click", () => {
        const open = menu.classList.toggle("open");
        burger.classList.toggle("open", open);
        document.body.style.overflow = open ? "hidden" : "";
      });
    }
  }
  function closeMenu() {
    const menu = $(".mmenu"), burger = $(".burger");
    if (menu) menu.classList.remove("open");
    if (burger) burger.classList.remove("open");
    document.body.style.overflow = "";
  }

  /* ========== custom cursor + magnetic ========== */
  function cursor() {
    if (matchMedia("(hover:none)").matches || reduce) return;
    const c = $(".cursor"), d = $(".cursor-d"); if (!c || !d) return;
    let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
    document.body.classList.add("cursor-on");
    addEventListener("pointermove", e => { mx = e.clientX; my = e.clientY; d.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`; });
    (function loop() { cx += (mx - cx) * 0.18; cy += (my - cy) * 0.18; c.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`; requestAnimationFrame(loop); })();
    $$("a,button,.spec,.gcard,.magnetic,input,textarea,select").forEach(el => {
      el.addEventListener("pointerenter", () => c.classList.add("grow"));
      el.addEventListener("pointerleave", () => c.classList.remove("grow"));
    });
    $$(".magnetic").forEach(el => {
      el.addEventListener("pointermove", e => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.28}px,${(e.clientY - r.top - r.height / 2) * 0.4}px)`;
      });
      el.addEventListener("pointerleave", () => el.style.transform = "");
    });
  }

  /* ========== counters ========== */
  function counters() {
    $$("[data-count]").forEach(el => {
      const to = +el.dataset.count, suf = el.dataset.suffix || "";
      if (reduce) { el.textContent = to + suf; return; }
      const io = new IntersectionObserver(es => {
        if (!es[0].isIntersecting) return;
        let s = 0; const t0 = performance.now(), dur = 1600;
        (function tick(t) {
          const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(to * e) + suf;
          if (p < 1) requestAnimationFrame(tick);
        })(t0);
        io.disconnect();
      }, { threshold: 0.5 });
      io.observe(el);
    });
  }

  /* ========== 3D tilt on cards ========== */
  function tilt() {
    if (matchMedia("(hover:none)").matches || reduce) return;
    $$("[data-tilt]").forEach(el => {
      el.addEventListener("pointermove", e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(800px) rotateY(${px * 9}deg) rotateX(${-py * 9}deg) translateY(-8px)`;
      });
      el.addEventListener("pointerleave", () => el.style.transform = "");
    });
  }

  /* ========================================================
     "BAY" — the AI concierge. Local knowledge base + fuzzy
     keyword intent match. No network needed, always on-brand.
     (Swap replyFor() for a fetch() to a real LLM to go live.)
     ======================================================== */
  const KB = [
    { k: ["price", "cost", "how much", "pricing", "rates", "prices", "£"], a: "Here's the Bay Beauty price list 💫<br><br><b>Soft Glam</b> — £55<br><b>Full Glam</b> — £75<br><b>Occasion Makeup</b> — £75 (trial £35)<br><b>Engagement</b> — £165<br><b>Bridal Trial</b> — £175<br><b>Bridal Makeup</b> — £300<br><b>Bridal Package</b> (3 events) — £700<br><b>Editorial</b> — from £50<br><br>Travel from £5 in Luton; outside Luton by distance. Want me to help you book?" },
    { k: ["bridal", "wedding", "bride", "married"], a: "Congratulations! 🤍 <b>Bridal Makeup is £300</b> and includes luxury skin prep, premium lashes, a touch-up kit, 16+ hour wear and full luxury service. There's a <b>free consultation</b> first, then a <b>Bridal Trial (£175)</b> to perfect your look together. Prefer a whole-wedding <b>Package of 3 events for £700</b>. Shall I take you to booking?" },
    { k: ["soft glam"], a: "<b>Soft Glam — £55</b> ✨ Natural, elegant, you. Fresh flawless complexion, soft blended eyes, strip lashes included, natural contour & highlight, nude or soft lip. Approx 45–60 mins. Touch-up kit included." },
    { k: ["full glam", "glam"], a: "<b>Full Glam — £75</b> 💄 Bold, glamorous, unforgettable. Full-coverage flawless base, sculpted defined eyes, dramatic strip lashes, contour & highlight, lip of your choice. Approx 60–90 mins, touch-up kit included." },
    { k: ["book", "booking", "appointment", "available", "date", "availability", "reserve"], a: "I'd love to get you booked in! ✨ You can use our <a href='/bay-beauty-booking' style='color:var(--gold-deep);font-weight:600'>booking page</a> or message Bayan on WhatsApp directly. A <b>50% deposit</b> secures your date. Which service were you thinking of?" },
    { k: ["deposit", "pay", "payment", "refund", "cancel"], a: "A <b>50% deposit</b> secures your appointment and is non-refundable — unless Bayan ever needs to cancel, in which case you're fully reimbursed. The remaining balance is due before or on your appointment 🤍" },
    { k: ["where", "area", "location", "travel", "luton", "london", "come to", "mobile"], a: "Bay Beauty is a <b>luxury mobile service</b> — Bayan comes to you 🚗 Based in <b>Luton</b>, covering London & across the UK. Travel is from £5 in Luton and calculated by distance outside." },
    { k: ["hijab", "hijabi", "modest", "women", "privacy", "female"], a: "Absolutely 🤍 Bay Beauty is a <b>women-only, hijabi-friendly</b> service. Your privacy is the priority — comfort, confidence and happiness always come first." },
    { k: ["service", "what do you", "offer", "specialise", "specialize", "looks"], a: "Bayan specialises in <b>Bridal, Soft Glam, Full Glam, Editorial, No-Makeup Makeup, Creative & Colour Looks, Hijabi Brides and Occasion Makeup</b>. Every appointment is completely personalised — no two faces are the same 💕" },
    { k: ["occasion", "birthday", "graduation", "party", "eid", "event", "photoshoot", "prom", "dinner"], a: "Perfect! <b>Occasion Makeup is £75</b> (trial £35) — gorgeous for birthdays, graduations, photoshoots, parties, Eid, special events, dinner dates & content creation ✨" },
    { k: ["trial"], a: "Trials let us perfect your look in advance 💫 <b>Occasion Trial £35</b>, <b>Bridal Trial £175</b> (a luxury session where we design your bridal look together)." },
    { k: ["experience", "how long", "years", "who", "about", "qualified"], a: "Bayan has been a professional makeup artist for <b>9+ years</b>, creating timeless, elegant, personalised looks for women across the UK 🤍" },
    { k: ["shop", "buy", "product", "voucher", "gift"], a: "You can shop gift vouchers, lash sets & masterclasses on our <a href='/bay-beauty-shop' style='color:var(--gold-deep);font-weight:600'>shop page</a> 🛍️ A voucher is a lovely gift!" },
    { k: ["hello", "hi", "hey", "salam", "asalam", "assalam", "hiya"], a: "Hi lovely! 💕 I'm Bay, your beauty concierge. Ask me about prices, bridal, booking or where Bayan covers — how can I help you glow today?" },
    { k: ["thank", "thanks", "ty"], a: "You're so welcome! 🤍 Can't wait to glam you. Whenever you're ready, tap Book and I'll sort the rest ✨" },
    { k: ["contact", "phone", "number", "whatsapp", "email", "message", "reach"], a: "The quickest way to reach Bayan is <b>WhatsApp</b> 💬 — tap the green button any time. You can also email us. Want me to open a WhatsApp chat for you?" }
  ];
  function replyFor(text) {
    const t = " " + text.toLowerCase() + " ";
    let best = null, score = 0;
    KB.forEach(item => {
      let s = 0; item.k.forEach(k => { if (t.includes(k)) s += k.length; });
      if (s > score) { score = s; best = item; }
    });
    if (best) return best.a;
    return "Great question! 💕 I can help with <b>prices, services, bridal, booking, deposits</b> and <b>where Bayan covers</b>. For anything specific, message Bayan on WhatsApp — she'll get right back to you. What would you like to know?";
  }

  function chatbot() {
    // build FABs
    const fabs = document.createElement("div"); fabs.className = "fabs";
    fabs.innerHTML = `
      <a class="fab fab-wa" href="${waLink()}" target="_blank" rel="noopener" aria-label="WhatsApp Bay Beauty">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M.05 24l1.7-6.2A11.9 11.9 0 1 1 12 24a11.9 11.9 0 0 1-5.7-1.45L.05 24zM6.6 20.1l.37.22a9.86 9.86 0 0 0 5.03 1.38 9.9 9.9 0 1 0-9.9-9.9c0 1.8.48 3.5 1.4 5.03l.24.38-1 3.65 3.86-.94zM17.5 14.3c-.13-.22-.48-.35-1-.6-.53-.27-3.12-1.54-3.6-1.72-.48-.17-.83-.26-1.18.27-.35.53-1.35 1.7-1.66 2.05-.3.35-.6.4-1.13.13-.53-.26-2.23-.82-4.25-2.62-1.57-1.4-2.63-3.13-2.94-3.66-.3-.53-.03-.82.23-1.08.24-.24.53-.62.8-.93.26-.31.35-.53.53-.88.17-.36.09-.67-.04-.93-.13-.27-1.18-2.85-1.62-3.9-.43-1.03-.86-.88-1.18-.9l-1-.02c-.35 0-.92.13-1.4.66-.48.53-1.84 1.8-1.84 4.38 0 2.58 1.88 5.08 2.14 5.43.26.36 3.7 5.65 8.96 7.92 1.25.54 2.23.86 2.99 1.1 1.26.4 2.4.34 3.3.21.98-.15 3.02-1.23 3.45-2.42.43-1.2.43-2.22.3-2.43z"/></svg>
      </a>
      <button class="fab fab-chat" aria-label="Chat with Bay" data-open-chat>
        <span class="ping"></span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.6-.8L3 21l1.8-5.9a8.5 8.5 0 0 1-.8-3.6A8.38 8.38 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/></svg>
      </button>`;
    document.body.appendChild(fabs);

    const logo = (document.querySelector('link[data-bb-logo]') || {}).href || "/assets/baybeauty/bb-logo-sm.png";
    const panel = document.createElement("div"); panel.className = "chat"; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Bay Beauty chat");
    panel.innerHTML = `
      <div class="chat-head">
        <img src="/assets/baybeauty/bb-logo-sm.png" alt="Bay Beauty">
        <div><b>Bay</b><span>Beauty concierge · replies instantly</span></div>
        <button class="x" aria-label="Close chat" data-close-chat>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="chat-body" id="chatBody"></div>
      <div class="chat-quick" id="chatQuick"></div>
      <form class="chat-input" id="chatForm">
        <input id="chatText" type="text" placeholder="Ask about prices, bridal, booking…" autocomplete="off" aria-label="Message">
        <button type="submit" aria-label="Send">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>
        </button>
      </form>`;
    document.body.appendChild(panel);

    const body = $("#chatBody", panel), quick = $("#chatQuick", panel);
    const quicks = ["Prices 💷", "Bridal 👰", "Book now 📅", "Where do you cover? 📍"];
    quicks.forEach(q => { const b = document.createElement("button"); b.textContent = q; b.onclick = () => send(q); quick.appendChild(b); });

    function bubble(html, who) {
      const m = document.createElement("div"); m.className = "msg " + who; m.innerHTML = html;
      body.appendChild(m); body.scrollTop = body.scrollHeight; return m;
    }
    function typing() {
      const t = document.createElement("div"); t.className = "msg bot typing";
      t.innerHTML = "<span></span><span></span><span></span>";
      body.appendChild(t); body.scrollTop = body.scrollHeight; return t;
    }
    let greeted = false;
    function greet() {
      if (greeted) return; greeted = true;
      bubble("Hi lovely! 💕 I'm <b>Bay</b>, your beauty concierge. Ask me anything about prices, services, bridal or booking — or tap a shortcut below ✨", "bot");
    }
    function send(text) {
      if (!text || !text.trim()) return;
      bubble(text, "me");
      const t = typing();
      const reply = replyFor(text);
      setTimeout(() => { t.remove(); bubble(reply, "bot"); }, 650 + Math.random() * 400);
    }
    $("#chatForm", panel).addEventListener("submit", e => {
      e.preventDefault(); const inp = $("#chatText", panel); send(inp.value); inp.value = "";
    });

    function open() { panel.classList.add("open"); fabs.style.opacity = "0"; fabs.style.pointerEvents = "none"; greet(); setTimeout(() => $("#chatText", panel).focus(), 500); }
    function close() { panel.classList.remove("open"); fabs.style.opacity = "1"; fabs.style.pointerEvents = "auto"; }
    $$("[data-open-chat]").forEach(b => b.addEventListener("click", open));
    $("[data-close-chat]", panel).addEventListener("click", close);
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    BB.openChat = open;
    // gentle auto-nudge after a while
    if (!reduce) setTimeout(() => { const p = $(".fab-chat .ping"); if (p) p.style.animation = "ping 1.6s var(--ease) 3"; }, 8000);
  }

  /* ========== cinematic hero video ==========
     Drop a file in and set <source src>. It auto-detects, grades
     it premium, autoplays muted/looped, and layers gold dust over. */
  function heroVideo() {
    const v = $(".hero-video"); if (!v) return;
    const src = v.querySelector("source");
    const has = src && src.getAttribute("src") && src.getAttribute("src").trim() && !/PUT-VIDEO-HERE/.test(src.getAttribute("src"));
    if (!has) return;                    // no video yet → live WebGL hero stays
    document.body.classList.add("has-hero-video");
    v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute("playsinline", "");
    const tryPlay = () => v.play().catch(() => {});
    v.addEventListener("loadeddata", tryPlay); tryPlay();
    // sound / pause toggle
    const btn = $(".hero-play button");
    if (btn) btn.addEventListener("click", () => {
      if (v.paused) { v.play(); btn.dataset.state = "play"; }
      else { v.muted = !v.muted; }
      btn.setAttribute("aria-pressed", String(!v.muted));
    });
  }

  /* ========== boot ========== */
  function boot() {
    wireLinks(); preloader(); scrollSetup(); reveals(); progress();
    nav(); cursor(); counters(); tilt(); heroVideo(); chatbot();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

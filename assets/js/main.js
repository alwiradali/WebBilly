/* ============================================================
   Billy Digitals — Site Scripts
   ============================================================ */

const CONFIG = {
  brand: "Billy Digitals",
  email: "hello@billydigitals.com",
  // WhatsApp number: country code + number, digits only (e.g. "447700900123")
  whatsapp: "447519022117",
  waMessage: "Hi Billy Digitals! I'd like to discuss a website project.",
};

document.addEventListener("DOMContentLoaded", () => {
  initContactLinks();
  initHeader();
  initReveal();
  initCounters();
  initFilters();
  initFaq();
  initPrefill();
  initForm();
  initChat();
  initScrollProgress();
  initCardSpotlight();
  initPageTransitions();
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
});

/* ---------- Smooth fade-out when navigating to another page ---------- */
function initPageTransitions() {
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a");
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href) return;
    // Only intercept real page navigations on this site — skip anchors,
    // new tabs, downloads and off-site links (those keep native behaviour).
    if (
      href.charAt(0) === "#" ||
      a.target === "_blank" ||
      a.hasAttribute("download") ||
      e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 ||
      /^(mailto:|tel:|https?:\/\/|\/\/)/i.test(href)
    ) return;
    e.preventDefault();
    document.body.classList.add("page-leaving");
    setTimeout(() => { window.location.href = href; }, 300);
  });
  // Restore visibility when returning via the browser back/forward cache.
  window.addEventListener("pageshow", (ev) => {
    if (ev.persisted) document.body.classList.remove("page-leaving");
  });
}

/* ---------- Email / WhatsApp links ---------- */
function initContactLinks() {
  document.querySelectorAll("[data-email-link]").forEach((a) => {
    a.href = "mailto:" + CONFIG.email;
  });
  document.querySelectorAll("[data-email-text]").forEach((el) => {
    el.textContent = CONFIG.email;
  });
  const waUrl =
    "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(CONFIG.waMessage);
  document.querySelectorAll("[data-wa-link]").forEach((a) => {
    a.href = waUrl;
    a.addEventListener("click", () => window.bdTrack && bdTrack("contact_whatsapp"));
  });
  document.querySelectorAll("[data-email-link]").forEach((a) => {
    a.addEventListener("click", () => window.bdTrack && bdTrack("contact_email"));
  });
  // Plan "Request a Quote" buttons — soft engagement signal
  document.querySelectorAll("[data-plan]").forEach((el) => {
    el.addEventListener("click", () =>
      window.bdTrack && bdTrack("select_plan", { plan: el.getAttribute("data-plan") }));
  });
}

/* ---------- Header: scroll state, mobile menu, active link ---------- */
function initHeader() {
  const header = document.getElementById("siteHeader");
  const burger = document.getElementById("hamburger");
  const links = document.getElementById("navLinks");

  if (!header) return;
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 10);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Pages without the full nav (e.g. thank-you) have no burger menu — stop here.
  if (!burger || !links) return;

  burger.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    burger.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", String(open));
  });
  links.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      links.classList.remove("open");
      burger.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
    })
  );

  // Highlight the nav link of the section in view
  const navAnchors = Array.from(links.querySelectorAll("a"));
  const sections = navAnchors
    .map((a) => {
      const href = a.getAttribute("href");
      // Only in-page anchors (#id) are valid selectors; skip cross-page links.
      return href && href.charAt(0) === "#" && href.length > 1
        ? document.querySelector(href)
        : null;
    })
    .filter(Boolean);
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navAnchors.forEach((a) =>
          a.classList.toggle("active", a.getAttribute("href") === "#" + entry.target.id)
        );
      });
    },
    { rootMargin: "-40% 0px -55% 0px" }
  );
  sections.forEach((s) => spy.observe(s));
}

/* ---------- Scroll reveal ---------- */
function initReveal() {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
}

/* ---------- Animated counters ---------- */
function initCounters() {
  const counters = document.querySelectorAll("[data-count]");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        animateCount(entry.target);
      });
    },
    { threshold: 0.5 }
  );
  counters.forEach((c) => io.observe(c));
}

function animateCount(el) {
  const target = parseInt(el.dataset.count, 10) || 0;
  const suffix = el.dataset.suffix || "";
  const duration = 1300;
  let start = null;
  const step = (ts) => {
    if (start === null) start = ts;
    const p = Math.min((ts - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(eased * target) + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- Template filters ---------- */
function initFilters() {
  const buttons = document.querySelectorAll(".fbtn");
  const cards = document.querySelectorAll(".tcard");
  buttons.forEach((btn) =>
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const f = btn.dataset.filter;
      cards.forEach((card) => {
        const show = f === "all" || card.dataset.cat === f;
        card.classList.toggle("hide", !show);
        if (show) card.classList.add("in");
      });
    })
  );
}

/* ---------- FAQ accordion ---------- */
function initFaq() {
  document.querySelectorAll(".faq-item").forEach((item) => {
    const q = item.querySelector(".faq-q");
    q.addEventListener("click", () => {
      const wasOpen = item.classList.contains("open");
      document.querySelectorAll(".faq-item.open").forEach((o) => {
        o.classList.remove("open");
        o.querySelector(".faq-q").setAttribute("aria-expanded", "false");
      });
      if (!wasOpen) {
        item.classList.add("open");
        q.setAttribute("aria-expanded", "true");
      }
    });
  });
}

/* ---------- Prefill form from template / plan links ---------- */
function initPrefill() {
  document.querySelectorAll("[data-prefill]").forEach((link) =>
    link.addEventListener("click", () => {
      const sel = document.getElementById("f-category");
      if (sel) sel.value = link.dataset.prefill;
    })
  );
  document.querySelectorAll("[data-plan]").forEach((link) =>
    link.addEventListener("click", () => {
      const sel = document.getElementById("f-plan");
      if (sel) sel.value = link.dataset.plan;
    })
  );
}

/* ---------- Contact form (Web3Forms delivery, mailto fallback) ---------- */
const WEB3FORMS_KEY = "ad07600b-6d90-4493-9a9c-ba5158049b9a";

function initForm() {
  const form = document.getElementById("contactForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("f-name").value.trim();
    const email = document.getElementById("f-email").value.trim();
    const category = document.getElementById("f-category").value;
    const plan = document.getElementById("f-plan").value;
    const message = document.getElementById("f-message").value.trim();
    const botcheck = form.querySelector('[name="botcheck"]');

    if (!name || !email || !message) {
      showToast("Please fill in your name, email and message.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast("Please enter a valid email address.");
      return;
    }
    if (botcheck && botcheck.checked) return; // spam bot filled the honeypot

    const subject = "New project enquiry — " + category + " (" + plan + ")";
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = "Sending…";

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: subject,
          from_name: "Billy Digitals Website",
          name: name,
          email: email,
          "website type": category,
          plan: plan,
          message: message,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Submission failed");
      window.location.href = "thank-you.html";
    } catch (err) {
      // Delivery service unreachable — fall back to the visitor's email app
      const body =
        "Name: " + name + "\n" +
        "Email: " + email + "\n" +
        "Website type: " + category + "\n" +
        "Plan: " + plan + "\n\n" +
        "Project details:\n" + message;
      window.location.href =
        "mailto:" + CONFIG.email +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);
      showToast("Opening your email app — just hit send!");
    } finally {
      btn.disabled = false;
      btn.textContent = "Send Enquiry";
    }
  });
}

/* ---------- Scroll progress bar ---------- */
function initScrollProgress() {
  const bar = document.getElementById("scrollProgress");
  if (!bar) return;
  let ticking = false;
  const update = () => {
    const doc = document.documentElement;
    const scrolled = window.scrollY || window.pageYOffset || doc.scrollTop || 0;
    const max = doc.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(scrolled / max, 1) : 0;
    bar.style.transform = "scaleX(" + p + ")";
    ticking = false;
  };
  update();
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true }
  );
}

/* ---------- Cursor spotlight on service cards ---------- */
function initCardSpotlight() {
  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", e.clientX - rect.left + "px");
      card.style.setProperty("--my", e.clientY - rect.top + "px");
    });
  });
}

/* ---------- Toast ---------- */
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3400);
}

/* ============================================================
   Billy — AI Chat Assistant
   ============================================================ */
function initChat() {
  const chat = document.getElementById("chat");
  const toggle = document.getElementById("chatToggle");
  const msgs = document.getElementById("chatMsgs");
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatText");
  const chips = document.getElementById("chatChips");
  if (!chat || !toggle || !form) return; // no chat widget on this page (e.g. thank-you)
  let welcomed = false;
  let engaged = false;       // true once the customer has sent a message
  let askedForReview = false; // review is asked at most once per chat

  const waUrl =
    "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(CONFIG.waMessage);
  const contactLine =
    'You can email us at <a href="mailto:' + CONFIG.email + '">' + CONFIG.email +
    '</a> or <a href="' + waUrl + '" target="_blank" rel="noopener">chat on WhatsApp</a> — we reply fast.';

  // Google review link (same as the flyer's "Leave a 5-star review" button).
  const REVIEW_URL = "https://g.page/r/CaibQuMCDDWPEAE/review";
  const reviewLink =
    '<a href="' + REVIEW_URL + '" target="_blank" rel="noopener">Leave a 5-star Google review →</a>';
  const reviewAsk =
    "⭐ Before you go — if I've been helpful, we'd love a quick <strong>Google review</strong>. " +
    "It takes 10 seconds and means the world to a small team like ours. " + reviewLink + " Thank you! 🙏";
  const REVIEW_CHIPS = ["Leave a 5★ review", "Get a quote"];

  // Order matters: first match wins. Greeting/thanks/bye only fire on
  // whole-message matches or word-bounded patterns so they never shadow
  // real questions ("Hi, what are your prices?" reaches the pricing intent).
  const INTENTS = [
    {
      re: /^\s*(hi|hello|hey|hiya|salam|assalamualaikum|howdy|yo)[\s!,.?]*$/i,
      reply: () =>
        "Hey there! 👋 I'm Billy, your assistant here at Billy Digitals. Ask me about our services, plans, timelines — or tell me what you want to build!",
      chips: ["What can you build?", "Show me the plans", "Hosting plans", "Get a quote"],
    },
    {
      re: /^\s*(thanks|thank you|thankyou|great|awesome|perfect|nice|cool)[\s!,.?]*$/i,
      reply: () => "You're welcome! 😊 Anything else you'd like to know — or shall we start your project?",
      chips: ["Get a quote", "Show me the plans", "Talk to a human"],
      end: true,
    },
    {
      re: /^\s*(bye|goodbye|see you|later|see ya)[\s!,.?]*$/i,
      reply: () => "Talk soon! When you're ready to build something amazing, you know where to find us. 👋",
      end: true,
    },
    {
      re: /\b(review|reviews|feedback|rate you|rate us|testimonial|5 ?star|five star|leave a review)\b/i,
      reply: () =>
        "You're a legend ⭐ — thank you! Here's the link, it only takes 10 seconds: " + reviewLink +
        " 🙏 It genuinely helps us reach more people.",
      chips: ["Get a quote", "Show me the plans"],
    },
    {
      re: /\b(price|prices|pricing|cost|costs|rate|rates|charge|charges|budget|quote|quotation|estimate|fee|fees)\b|how much(?!\s+(?:time|long|longer))/i,
      reply: () =>
        "Everything we do — websites, hosting and care plans — is priced per project, with no hourly surprises and no hidden fees. Tell us your vision via the <a href=\"#contact\">enquiry form</a> and you'll get a free, tailored quote within 24 hours. " + contactLine,
      chips: ["Show me the plans", "Hosting plans", "Talk to a human"],
    },
    {
      re: /^\s*standard[\s!,.?]*$/i,
      reply: () =>
        "<strong>Standard</strong> is perfect for personal brands and small businesses: up to 5 custom pages, fully responsive, contact & WhatsApp integration, essential SEO, 2 revision rounds and a month of post-launch support. Hosting is an easy optional add-on. <a href=\"#plans\">See it in Plans</a>.",
      chips: ["Premium", "Ultra Premium", "Get a quote"],
    },
    {
      re: /^\s*premium[\s!,.?]*$/i,
      reply: () =>
        "<strong>Premium</strong> is our most popular: up to 12 custom pages, bespoke UI with animations, a CMS so you can edit content yourself, advanced SEO, an AI chatbot, <strong>managed hosting included</strong>, 4 revision rounds and 3 months of support. <a href=\"#plans\">See it in Plans</a>.",
      chips: ["Standard", "Ultra Premium", "Get a quote"],
    },
    {
      re: /^\s*ultra( premium)?[\s!,.?]*$/i,
      reply: () =>
        "<strong>Ultra Premium</strong> is the flagship: unlimited pages, full web applications, complete branding, AI automation, copywriting included, 12 months hosting & care, a dedicated project manager and unlimited revisions. <a href=\"#plans\">See it in Plans</a>.",
      chips: ["Standard", "Premium", "Get a quote"],
    },
    {
      re: /\b(host|hosting|server|servers|ssl|backup|backups)\b/i,
      reply: () =>
        "We run fast, secure, fully managed UK hosting: 🚀 <strong>Starter</strong> (personal sites), ⭐ <strong>Business</strong> (most popular — 24/7 monitoring, priority fixes) and 💎 <strong>Premium</strong> (fastest server resources, advanced security, same-day support). Free SSL and daily backups on every plan — and hosting is <strong>included free</strong> with Premium & Ultra Premium builds. Message us for a free quote. <a href=\"#hosting\">See hosting plans</a>.",
      chips: ["Care plans", "Get a quote", "Show me the plans"],
    },
    {
      re: /\b(care plan|care plans|seo plan|growth plan|google ranking|rank on google|keyword|ongoing seo)\b/i,
      reply: () =>
        "Our <strong>Care Plans</strong> keep your site growing on Google every month: 🔍 <strong>Starter Care</strong> (SEO health checks, Google Business monitoring), 📈 <strong>Growth Care</strong> (GBP management, keyword tracking, most popular) and 🚀 <strong>Complete Care</strong> (full SEO optimisation, competitor tracking, unlimited edits, monthly strategy call). Hosting keeps you online — Care keeps you found. Message us for a free quote. <a href=\"#care\">See Care Plans</a>.",
      chips: ["Hosting plans", "Get a quote", "Talk to a human"],
    },
    {
      re: /\b(plan|plans|package|packages|tier|tiers)\b/i,
      reply: () =>
        "We offer three levels: <strong>Standard</strong> (up to 5 pages, perfect for small businesses), <strong>Premium</strong> (up to 12 pages, CMS, AI chatbot, hosting included) and <strong>Ultra Premium</strong> (unlimited pages, custom web apps, full branding, a dedicated manager and 12 months of care). Tap one to see details 👇",
      chips: ["Standard", "Premium", "Ultra Premium", "Hosting plans"],
    },
    {
      re: /\b(seo|google|rank|ranking|search engine|traffic)\b/i,
      reply: () =>
        "Every site we build ships SEO-ready: clean structure, fast load times and search-first architecture. Premium and Ultra Premium plans add advanced SEO and speed optimisation so customers find you first. Want it hands-off? Ask about <strong>Auto SEO</strong>.",
      chips: ["Auto SEO", "Advertising & ads", "Get a quote"],
    },
    {
      re: /\b(advertis\w*|ad campaign|ads?|ppc|pay per click|google ads|meta ads|facebook ads|instagram ads|marketing|social media|auto seo|autoseo)\b/i,
      reply: () =>
        "Beyond building your site, we bring customers to it. 🎯 <strong>Advertising &amp; PPC</strong> — Google &amp; Meta ad campaigns that pay for themselves. 📣 <strong>Social Media Marketing</strong> — content, reach and growth on Instagram, Facebook &amp; TikTok. 📈 <strong>Auto SEO</strong> — hands-off, we optimise and grow your rankings every month. Tell us your goals for a free plan. " + contactLine,
      chips: ["Get a quote", "Show me the plans", "Talk to a human"],
    },
    {
      re: /\b(time|timeline|deadline|fast|quick|quickly|duration|days|weeks)\b|how long|how soon/i,
      reply: () =>
        "Standard sites usually launch in 3 days to a week, Premium in 1–2 weeks, and Ultra Premium in 2–4 weeks — it's a bigger build, so it needs the extra time. You get a clear schedule before we start — and we stick to it. ⚡",
      chips: ["Show me the plans", "Get a quote"],
    },
    {
      re: /\b(rack ?pilot|our apps|warehouse|warehouses|factory|factories|inventory|stock)\b/i,
      reply: () =>
        "That's <strong>BillyRackPilot</strong> — our flagship platform for organisations running warehouses and factories. 🏭 Plan racking layouts, track stock locations in real time and manage team access, all from one dashboard, on any device. <a href=\"#apps\">Take a look</a> or request a demo!",
      chips: ["Request a demo", "Talk to a human"],
    },
    {
      re: /\brequest a demo\b|book a demo/i,
      reply: () =>
        "Brilliant — tell us a little about your organisation in the <a href=\"#contact\">enquiry form</a> and we'll set up a tailored RackPilot demo. " + contactLine,
      chips: ["Talk to a human", "What can you build?"],
    },
    {
      re: /\b(support|maintain|maintenance|update|updates|after launch|care)\b/i,
      reply: () =>
        "Yes! Every plan includes post-launch support, and Ultra Premium comes with 12 months of hosting, security and care. We keep your site fast, safe and online — always.",
      chips: ["Hosting plans", "Get a quote"],
    },
    {
      re: /\b(add-?ons?|booking|calendar|appointment|address finder|postcode|login|register|portal|payments?|gallery|newsletter|multi-?language)\b/i,
      reply: () =>
        "We build powerful add-ons into any plan: 🤖 AI chatbots, 📅 booking calendars & appointments, 📍 address/postcode finders, 🔐 customer login & registration, 💳 online payments, ⭐ Google review widgets, 💬 WhatsApp chat, galleries, blogs, newsletters and more. <a href=\"#hosting\">See the add-ons</a> — or tell us what you need!",
      chips: ["Get a quote", "Show me the plans", "Talk to a human"],
    },
    {
      re: /\b(redesign|rebuild|existing|old site|revamp|refresh)\b/i,
      reply: () =>
        "We love a glow-up. ✨ We audit your current site, keep your SEO equity, and rebuild the experience so it looks and performs like new. Tell us your current URL in the <a href=\"#contact\">enquiry form</a>.",
      chips: ["Get a quote", "How long does it take?"],
    },
    {
      re: /\b(template|templates|sample|samples|example|examples|portfolio|your work|previous work|design|designs|style|styles)\b/i,
      reply: () =>
        "We build for every industry — restaurants, corporate, portfolios, real estate, medical, education, SaaS, fitness and travel. Browse the <a href=\"#templates\">sample styles</a>; every project is designed from scratch to match your brand.",
      chips: ["Show me the plans", "Get a quote"],
    },
    {
      re: /\b(process|steps|start|begin|get started|getting started)\b|how (do you|does it|does this) work/i,
      reply: () =>
        "Simple: 1) Discovery — we learn your goals. 2) Design — polished, on-brand screens. 3) Development — fast, clean code. 4) Launch — we handle everything. 5) Growth — ongoing support. Ready? <a href=\"#contact\">Send us your idea</a>!",
      chips: ["Get a quote", "How long does it take?"],
    },
    {
      re: /\b(service|services|what can you|capability|capabilities)\b|what do you (do|offer)|do you (do|make|build)/i,
      reply: () =>
        "We handle everything: custom website design, web applications, UI/UX & branding, SEO & performance, AI chatbots & automation, hosting & security, and copywriting. One team, end to end. See <a href=\"#services\">all services</a>.",
      chips: ["Show me the plans", "Hosting plans", "Our apps"],
    },
    {
      re: /\b(contact|email|e-mail|whatsapp|human|person|talk|speak|call|phone|reach)\b/i,
      reply: () => contactLine,
    },
    {
      re: /\b(website|web site|site|web app|application|landing page)\b/i,
      reply: () =>
        "Whatever you're building, we've got you. 🚀 Explore our <a href=\"#services\">services</a> and <a href=\"#templates\">sample styles</a>, or <a href=\"#contact\">tell us about your project</a> and we'll come back with a plan within 24 hours.",
      chips: ["Show me the plans", "Get a quote", "Talk to a human"],
    },
  ];

  const DEFAULT_CHIPS = ["What can you build?", "Show me the plans", "Hosting plans", "Redesign my old website", "Get a quote"];

  const fallback = () =>
    "Great question — a human can answer that better than I can! " + contactLine +
    " Meanwhile, you can explore our <a href=\"#services\">services</a> and <a href=\"#plans\">plans</a>.";

  let focusTimer = null;
  function setOpen(open) {
    chat.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    clearTimeout(focusTimer);
    if (open) {
      if (!welcomed) {
        welcomed = true;
        botSay(
          "Hi! I'm <strong>Billy</strong> 🤖 — your assistant here at Billy Digitals. I can tell you about our services, plans and process. What are you looking to build?",
          DEFAULT_CHIPS
        );
      }
      focusTimer = setTimeout(() => {
        if (chat.classList.contains("open")) input.focus();
      }, 250);
    }
  }

  toggle.addEventListener("click", () => {
    const isOpen = chat.classList.contains("open");
    // First time an engaged chat is closed, ask for a Google review instead of
    // closing — so every real conversation ends with the review prompt. The
    // next click closes as normal.
    if (isOpen && engaged && !askedForReview) {
      askedForReview = true;
      botSay(reviewAsk, REVIEW_CHIPS);
      return;
    }
    setOpen(!isOpen);
  });

  // Chips are re-rendered after every bot reply — delegate clicks
  chips.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (btn) send(btn.textContent);
  });

  function setChips(list) {
    chips.innerHTML = "";
    (list || DEFAULT_CHIPS).forEach((label) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      chips.appendChild(b);
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    send(text);
  });

  // Close panel when an in-chat anchor link is used, so the section is visible
  msgs.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (a && a.getAttribute("href").startsWith("#")) setOpen(false);
  });

  function send(text) {
    engaged = true;
    addMsg(text, "user");
    const typing = document.createElement("div");
    typing.className = "msg bot typing";
    typing.innerHTML = "<i></i><i></i><i></i>";
    msgs.appendChild(typing);
    scrollDown();
    setTimeout(() => {
      typing.remove();
      const intent = INTENTS.find((i) => i.re.test(text));
      botSay(intent ? intent.reply() : fallback(), intent && intent.chips);
      // When the conversation reaches a natural end (thanks / bye), follow up
      // once with a Google review request.
      if (intent && intent.end && !askedForReview) {
        askedForReview = true;
        setTimeout(() => botSay(reviewAsk, REVIEW_CHIPS), 800);
      }
    }, 650 + Math.random() * 500);
  }

  function botSay(html, followups) {
    const div = document.createElement("div");
    div.className = "msg bot";
    div.innerHTML = html; // bot content is trusted, authored in this file
    msgs.appendChild(div);
    setChips(followups);
    scrollDown();
  }

  function addMsg(text, who) {
    const div = document.createElement("div");
    div.className = "msg " + who;
    div.textContent = text; // user content — always plain text
    msgs.appendChild(div);
    scrollDown();
  }

  function scrollDown() {
    msgs.scrollTop = msgs.scrollHeight;
  }
}

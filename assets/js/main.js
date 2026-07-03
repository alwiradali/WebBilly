/* ============================================================
   Billy Digitals — Site Scripts
   ============================================================ */

const CONFIG = {
  brand: "Billy Digitals",
  email: "info.billydigitals@gmail.com",
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
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
});

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
  });
}

/* ---------- Header: scroll state, mobile menu, active link ---------- */
function initHeader() {
  const header = document.getElementById("siteHeader");
  const burger = document.getElementById("hamburger");
  const links = document.getElementById("navLinks");

  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 10);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

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
    .map((a) => document.querySelector(a.getAttribute("href")))
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

/* ---------- Contact form (mailto compose) ---------- */
function initForm() {
  const form = document.getElementById("contactForm");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("f-name").value.trim();
    const email = document.getElementById("f-email").value.trim();
    const category = document.getElementById("f-category").value;
    const plan = document.getElementById("f-plan").value;
    const message = document.getElementById("f-message").value.trim();

    if (!name || !email || !message) {
      showToast("Please fill in your name, email and message.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast("Please enter a valid email address.");
      return;
    }

    const subject = "New project enquiry — " + category + " (" + plan + ")";
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
  let welcomed = false;

  const waUrl =
    "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(CONFIG.waMessage);
  const contactLine =
    'You can email us at <a href="mailto:' + CONFIG.email + '">' + CONFIG.email +
    '</a> or <a href="' + waUrl + '" target="_blank" rel="noopener">chat on WhatsApp</a> — we reply fast.';

  // Order matters: first match wins. Greeting/thanks/bye only fire on
  // whole-message matches or word-bounded patterns so they never shadow
  // real questions ("Hi, what are your prices?" reaches the pricing intent).
  const INTENTS = [
    {
      re: /^\s*(hi|hello|hey|hiya|salam|assalamualaikum|howdy|yo)[\s!,.?]*$/i,
      reply: () =>
        "Hey there! 👋 I'm Billy, your assistant here at Billy Digitals. Ask me about our services, plans, timelines — or tell me what you want to build!",
    },
    {
      re: /^\s*(thanks|thank you|thankyou|great|awesome|perfect|nice|cool)[\s!,.?]*$/i,
      reply: () => "You're welcome! 😊 Anything else you'd like to know — or shall we start your project?",
    },
    {
      re: /^\s*(bye|goodbye|see you|later|see ya)[\s!,.?]*$/i,
      reply: () => "Talk soon! When you're ready to build something amazing, you know where to find us. 👋",
    },
    {
      re: /\b(price|prices|pricing|cost|costs|rate|rates|charge|charges|budget|quote|quotation|estimate|fee|fees)\b|how much(?!\s+(?:time|long|longer))/i,
      reply: () =>
        "Every project is unique, so we price per project — no hourly surprises, no hidden fees. Tell us your vision via the <a href=\"#contact\">enquiry form</a> and you'll get a tailored quote within 24 hours. " + contactLine,
    },
    {
      re: /\b(plan|plans|package|packages|tier|tiers|standard|premium|ultra)\b/i,
      reply: () =>
        "We offer three levels: <strong>Standard</strong> (up to 5 pages, perfect for small businesses), <strong>Premium</strong> (up to 12 pages, CMS, AI chatbot, advanced SEO) and <strong>Ultra Premium</strong> (unlimited pages, custom web apps, full branding, a dedicated manager and 12 months of care). Check the <a href=\"#plans\">Plans section</a> for full details!",
    },
    {
      re: /\b(seo|google|rank|ranking|search engine|traffic)\b/i,
      reply: () =>
        "Every site we build ships SEO-ready: clean structure, fast load times and search-first architecture. Premium and Ultra Premium plans add advanced SEO and speed optimisation so customers find you first.",
    },
    {
      re: /\b(time|timeline|deadline|fast|quick|quickly|duration|days|weeks)\b|how long|how soon/i,
      reply: () =>
        "Standard sites usually launch in 1–2 weeks, Premium in 2–4 weeks, and Ultra Premium is scoped per project. You get a clear schedule before we start — and we stick to it. ⚡",
    },
    {
      re: /\b(support|maintain|maintenance|host|hosting|update|updates|after launch|care)\b/i,
      reply: () =>
        "Yes! Every plan includes post-launch support, and Ultra Premium comes with 12 months of hosting, security and care. We keep your site fast, safe and online — always.",
    },
    {
      re: /\b(redesign|rebuild|existing|old site|revamp|refresh)\b/i,
      reply: () =>
        "We love a glow-up. ✨ We audit your current site, keep your SEO equity, and rebuild the experience so it looks and performs like new. Tell us your current URL in the <a href=\"#contact\">enquiry form</a>.",
    },
    {
      re: /\b(template|templates|sample|samples|example|examples|portfolio|your work|previous work|design|designs|style|styles)\b/i,
      reply: () =>
        "We build for every industry — restaurants, corporate, portfolios, real estate, medical, education, SaaS, fitness and travel. Browse the <a href=\"#templates\">sample styles</a>; every project is designed from scratch to match your brand.",
    },
    {
      re: /\b(process|steps|start|begin|get started|getting started)\b|how (do you|does it|does this) work/i,
      reply: () =>
        "Simple: 1) Discovery — we learn your goals. 2) Design — polished, on-brand screens. 3) Development — fast, clean code. 4) Launch — we handle everything. 5) Growth — ongoing support. Ready? <a href=\"#contact\">Send us your idea</a>!",
    },
    {
      re: /\b(service|services|what can you|capability|capabilities)\b|what do you (do|offer)|do you (do|make|build)/i,
      reply: () =>
        "We handle everything: custom website design, web applications, UI/UX & branding, SEO & performance, AI chatbots & automation, hosting & security, and copywriting. One team, end to end. See <a href=\"#services\">all services</a>.",
    },
    {
      re: /\b(contact|email|e-mail|whatsapp|human|person|talk|speak|call|phone|reach)\b/i,
      reply: () => contactLine,
    },
    {
      re: /\b(website|web site|site|web app|application|landing page)\b/i,
      reply: () =>
        "Whatever you're building, we've got you. 🚀 Explore our <a href=\"#services\">services</a> and <a href=\"#templates\">sample styles</a>, or <a href=\"#contact\">tell us about your project</a> and we'll come back with a plan within 24 hours.",
    },
  ];

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
          "Hi! I'm <strong>Billy</strong> 🤖 — your assistant here at Billy Digitals. I can tell you about our services, plans and process. What are you looking to build?"
        );
      }
      focusTimer = setTimeout(() => {
        if (chat.classList.contains("open")) input.focus();
      }, 250);
    }
  }

  toggle.addEventListener("click", () => setOpen(!chat.classList.contains("open")));

  chips.querySelectorAll("button").forEach((chip) =>
    chip.addEventListener("click", () => send(chip.textContent))
  );

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
    addMsg(text, "user");
    const typing = document.createElement("div");
    typing.className = "msg bot typing";
    typing.innerHTML = "<i></i><i></i><i></i>";
    msgs.appendChild(typing);
    scrollDown();
    setTimeout(() => {
      typing.remove();
      const intent = INTENTS.find((i) => i.re.test(text));
      botSay(intent ? intent.reply() : fallback());
    }, 650 + Math.random() * 500);
  }

  function botSay(html) {
    const div = document.createElement("div");
    div.className = "msg bot";
    div.innerHTML = html; // bot content is trusted, authored in this file
    msgs.appendChild(div);
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

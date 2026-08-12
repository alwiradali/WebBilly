/* ═══════════════════════════════════════════════════════════════════════════
   HALCYON — shared chrome + components (HAL.ui)
   Injects nav / menu / footer / toasts / compare tray on every public page,
   renders property cards, and owns the small interactions (save, compare,
   modals, focus traps). Motion lives in motion.js.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var api = window.HAL.api, S = window.HAL.seed;
  var BASE = window.HAL_BASE || "/halcyon/";

  function el(html) { var t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  var ICON = {
    heartLine: '<svg class="heart-line" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 20.3 4.8 13a4.7 4.7 0 0 1 0-6.6 4.5 4.5 0 0 1 6.5 0l.7.7.7-.7a4.5 4.5 0 0 1 6.5 0 4.7 4.7 0 0 1 0 6.6Z"/></svg>',
    heartFill: '<svg class="heart-fill" viewBox="0 0 24 24" fill="currentColor"><path d="M12 20.3 4.8 13a4.7 4.7 0 0 1 0-6.6 4.5 4.5 0 0 1 6.5 0l.7.7.7-.7a4.5 4.5 0 0 1 6.5 0 4.7 4.7 0 0 1 0 6.6Z"/></svg>',
    bed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 18v-8m0 5h18v3m0-3v-2a3 3 0 0 0-3-3H9v5"/><circle cx="6.5" cy="9.5" r="1.6"/></svg>',
    bath: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-2Zm2 0V6a2 2 0 0 1 4 0M7 19l-1 2m11-2 1 2"/></svg>',
    area: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16v16H4z"/><path d="M4 9h5V4m6 16v-5h5"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.8-3.8"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m4 11 8-7 8 7v9h-5v-6h-6v6H4z"/></svg>',
    compare: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M9 4v16M4 8l5-4 5 4M15 20V4m5 12-5 4-5-4"/></svg>',
    userIco: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    tick: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m4.5 12.5 5 5 10-11"/></svg>',
    tour: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="8.5"/><ellipse cx="12" cy="12" rx="8.5" ry="3.4"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.4"/></svg>'
  };

  /* ── nav / menu / footer ────────────────────────────────────────────────── */
  var NAV_LINKS = [
    ["search", "Buy", "?status=sale"], ["search", "Rent", "?status=rent"],
    ["developments", "New homes", ""], ["areas", "Areas", ""], ["valuation", "Valuation", ""]
  ];
  var MENU_MAIN = [
    ["", "Home", "01"], ["search", "Search properties", "02"], ["developments", "New developments", "03"],
    ["areas", "Area guides", "04"], ["agents", "Our people", "05"], ["valuation", "Book a valuation", "06"],
    ["account", "My Halcyon", "07"]
  ];

  function chrome(opts) {
    opts = opts || {};
    var page = opts.page || "";
    document.body.insertAdjacentHTML("afterbegin",
      '<a class="skip-link" href="#main">Skip to content</a><div class="veil" aria-hidden="true"></div>');

    var nav = el('<header class="nav' + (opts.dark ? " nav--dark" : " is-solid") + '" role="banner"><div class="container--wide">' +
      '<a class="brand" href="' + BASE + '" data-nolift><span class="brand-word">HALC<em>Y</em>ON</span><span class="brand-sub desktop-only">Estates</span></a>' +
      '<nav class="nav-links desktop-only" aria-label="Primary">' +
      NAV_LINKS.map(function (l) { return '<a href="' + BASE + l[0] + l[2] + '"' + (page === l[0] && !l[2] ? ' aria-current="page"' : "") + '>' + l[1] + "</a>"; }).join("") +
      "</nav>" +
      '<div class="nav-actions">' +
      '<a class="icon-btn desktop-only" href="' + BASE + 'search" aria-label="Search">' + ICON.search + "</a>" +
      '<a class="icon-btn" href="' + BASE + 'account" aria-label="Saved properties" style="position:relative">' + ICON.heartLine + '<span class="nav-count" data-saved-count>0</span></a>' +
      '<button class="icon-btn burger" aria-label="Menu" aria-expanded="false" data-menu-btn><span></span><span></span></button>' +
      "</div></div></header>");
    document.body.insertBefore(nav, document.body.children[2]);

    var menu = el('<div class="menu" id="menu" aria-hidden="true"><div class="menu-main" role="navigation" aria-label="Menu">' +
      MENU_MAIN.map(function (l, i) { return '<a href="' + BASE + l[0] + '" style="--i:' + i + '"><small>' + l[2] + "</small>" + l[1] + "</a>"; }).join("") +
      '</div><div class="menu-side">' +
      '<div><p class="h-label">Offices</p>' + S.BIZ.offices.map(function (o) { return '<a class="plain" href="' + BASE + 'areas">' + o.city + " — " + esc(o.addr) + "</a>"; }).join("") + "</div>" +
      '<div><p class="h-label">Talk to us</p><a class="plain" href="' + S.BIZ.phoneHref + '">' + S.BIZ.phone + '</a><a class="plain" href="mailto:' + S.BIZ.email + '">' + S.BIZ.email + '</a><a class="plain" href="' + S.BIZ.whatsapp + '" rel="noopener">WhatsApp</a></div>' +
      '<div><p class="h-label">Professional</p><a class="plain" href="' + BASE + 'studio/">Halcyon Studio — admin OS</a><a class="plain" href="' + BASE + 'studio/#/tours">360 Tour Studio</a><a class="plain" href="' + BASE + 'studio/#/landlord">Landlord portal</a><a class="plain" href="' + BASE + 'studio/#/agent">Agent portal</a></div>' +
      "</div></div>");
    document.body.appendChild(menu);

    var burger = nav.querySelector("[data-menu-btn]");
    burger.addEventListener("click", function () {
      var open = document.body.classList.toggle("menu-open");
      burger.setAttribute("aria-expanded", open);
      menu.setAttribute("aria-hidden", !open);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.body.classList.contains("menu-open")) burger.click();
    });

    /* solid-on-scroll + hide-on-scroll-down */
    if (opts.dark) {
      var lastY = 0;
      addEventListener("scroll", function () {
        var y = scrollY;
        nav.classList.toggle("is-solid", y > 40);
        nav.classList.toggle("is-hidden", y > 600 && y > lastY && !document.body.classList.contains("menu-open"));
        lastY = y;
      }, { passive: true });
    }

    /* footer */
    if (opts.footer !== false) {
      document.body.appendChild(el('<footer class="footer" role="contentinfo"><div class="container">' +
        '<p class="footer-mark" aria-hidden="true">Halcyon</p>' +
        '<div class="footer-grid">' +
        '<div><p class="h-label">Halcyon Estates</p><p style="max-width:36ch;color:var(--ink-inv-2);font-size:14.5px">' + esc(S.BIZ.strap) + '.</p><p style="margin-top:18px"><a class="lnk" style="color:var(--champagne)" href="' + BASE + 'valuation">Book a valuation <span class="btn-arrow">→</span></a></p></div>' +
        '<div><p class="h-label">Find</p><a href="' + BASE + 'search?status=sale">Properties for sale</a><a href="' + BASE + 'search?status=rent">Properties to rent</a><a href="' + BASE + 'developments">New developments</a><a href="' + BASE + 'search?status=commercial">Commercial</a><a href="' + BASE + 'areas">Area guides</a></div>' +
        '<div><p class="h-label">Services</p><a href="' + BASE + 'valuation">Sell your property</a><a href="' + BASE + 'valuation?intent=let">Let your property</a><a href="' + BASE + 'studio/#/landlord">Landlord portal</a><a href="' + BASE + 'agents">Our people</a><a href="' + BASE + 'compare">Compare properties</a></div>' +
        '<div><p class="h-label">Platform</p><a href="' + BASE + 'studio/">Halcyon Studio</a><a href="' + BASE + 'studio/#/tours">360 Tour Studio</a><a href="/billy360/">billy360 tour engine</a><a href="' + BASE + 'widget.html">Embeddable widget</a></div>' +
        "</div>" +
        '<div class="footer-bottom"><span>© ' + new Date().getFullYear() + " " + esc(S.BIZ.legal) + " — design prototype by Billy Digitals. Demonstration listings; photography via Unsplash.</span><span>" + esc(S.BIZ.phone) + " · " + esc(S.BIZ.email) + "</span></div>" +
        "</div></footer>"));
    }

    /* bottom nav (mobile) */
    document.body.appendChild(el('<nav class="bottom-nav" aria-label="Mobile">' +
      "<ul>" +
      '<li><a href="' + BASE + '"' + (page === "" ? ' aria-current="page"' : "") + ">" + ICON.home + "Home</a></li>" +
      '<li><a href="' + BASE + 'search"' + (page === "search" ? ' aria-current="page"' : "") + ">" + ICON.search + "Search</a></li>" +
      '<li><a href="' + BASE + 'account#saved" style="position:relative">' + ICON.heartLine + '<span class="nav-count" data-saved-count>0</span>Saved</a></li>' +
      '<li><a href="' + BASE + 'compare"' + (page === "compare" ? ' aria-current="page"' : "") + ">" + ICON.compare + "Compare</a></li>" +
      '<li><a href="' + BASE + 'account"' + (page === "account" ? ' aria-current="page"' : "") + ">" + ICON.userIco + "Account</a></li>" +
      "</ul></nav>"));

    /* toasts + compare tray + cursor */
    document.body.appendChild(el('<div class="toasts" role="status" aria-live="polite"></div>'));
    document.body.appendChild(el('<div class="compare-tray" data-tray><span class="tray-thumbs"></span><span class="tray-label"></span>' +
      '<a class="btn btn--inv btn--sm" href="' + BASE + 'compare">Compare</a><button class="tray-clear" data-tray-clear>Clear</button></div>'));
    document.body.appendChild(el('<div class="cursor-dot" aria-hidden="true"></div>'));

    refreshSavedCount(); refreshTray();
    imgFallbacks(document);
  }

  /* ── toast ──────────────────────────────────────────────────────────────── */
  function toast(msg, kind) {
    var box = document.querySelector(".toasts"); if (!box) return;
    var t = el('<div class="toast' + (kind ? " toast--" + kind : "") + '">' + msg + "</div>");
    box.appendChild(t);
    setTimeout(function () { t.classList.add("is-leaving"); setTimeout(function () { t.remove(); }, 320); }, 3400);
  }

  /* ── saved / compare state ──────────────────────────────────────────────── */
  function refreshSavedCount() {
    api.user.saved().then(function (ids) {
      document.querySelectorAll("[data-saved-count]").forEach(function (n) {
        n.textContent = ids.length; n.classList.toggle("is-live", ids.length > 0);
      });
      document.querySelectorAll(".save-btn[data-id]").forEach(function (b) {
        b.classList.toggle("is-saved", ids.indexOf(b.getAttribute("data-id")) >= 0);
      });
    });
  }
  function refreshTray() {
    api.user.compare.list().then(function (ids) {
      var tray = document.querySelector("[data-tray]"); if (!tray) return;
      if (!ids.length) { tray.classList.remove("is-live"); return; }
      Promise.all(ids.map(api.properties.get)).then(function (props) {
        props = props.filter(Boolean);
        tray.querySelector(".tray-thumbs").innerHTML = props.map(function (p) {
          return '<img src="' + api.img(p.hero, 160) + '" alt="">';
        }).join("");
        tray.querySelector(".tray-label").textContent = props.length + (props.length === 1 ? " property" : " properties");
        tray.classList.add("is-live");
        imgFallbacks(tray);
      });
    });
  }
  document.addEventListener("click", function (e) {
    var save = e.target.closest && e.target.closest(".save-btn[data-id]");
    if (save) {
      e.preventDefault(); e.stopPropagation();
      api.user.toggleSaved(save.getAttribute("data-id")).then(function (on) {
        save.classList.toggle("is-saved", on);
        save.classList.remove("just-saved"); void save.offsetWidth; save.classList.add("just-saved");
        toast(on ? "Saved to your collection" : "Removed from saved", on ? "good" : "");
        refreshSavedCount();
      });
      return;
    }
    var cmp = e.target.closest && e.target.closest("[data-compare-id]");
    if (cmp) {
      e.preventDefault(); e.stopPropagation();
      api.user.compare.toggle(cmp.getAttribute("data-compare-id")).then(function (ids) {
        toast(ids.indexOf(cmp.getAttribute("data-compare-id")) >= 0 ? "Added to comparison" : "Removed from comparison");
        refreshTray();
      });
      return;
    }
    var clear = e.target.closest && e.target.closest("[data-tray-clear]");
    if (clear) api.user.compare.clear().then(refreshTray);
  });

  /* ── property card renderer ─────────────────────────────────────────────── */
  function propCard(p, opts) {
    opts = opts || {};
    var alt = p.gallery && p.gallery[1] ? p.gallery[1] : null;
    var specs = [];
    if (p.beds) specs.push(ICON.bed + " " + p.beds);
    if (p.baths) specs.push(ICON.bath + " " + p.baths);
    if (p.sqft) specs.push(ICON.area + " " + Number(p.sqft).toLocaleString("en-GB") + " sq ft");
    var badges = (p.badges || []).map(function (b) {
      return '<span class="badge badge--' + b + '">' + (b === "sponsored" ? "Sponsored" : b === "new" ? "New" : "Featured") + "</span>";
    });
    if (p.tour) badges.push('<span class="badge badge--tour">360 Tour</span>');
    return '<article class="prop-card" data-fx="reveal"' + (opts.delay ? ' data-fx-delay="' + opts.delay + '"' : "") + ' data-prop="' + p.id + '">' +
      '<figure class="card-media">' +
      '<img class="primary" loading="lazy" src="' + api.img(p.hero, 800) + '" srcset="' + api.srcset(p.hero) + '" sizes="(max-width:680px) 92vw, 30vw" alt="' + esc(p.title) + ", " + esc(p.addr) + '">' +
      (alt ? '<img class="alt" loading="lazy" src="' + api.img(alt, 800) + '" alt="" aria-hidden="true">' : "") +
      '<span class="card-badges">' + badges.join("") + "</span>" +
      '<button class="icon-btn save-btn card-save" data-id="' + p.id + '" aria-label="Save ' + esc(p.title) + '">' + ICON.heartLine + ICON.heartFill + "</button>" +
      '<span class="card-count">' + ICON.camera + " " + (p.gallery ? p.gallery.length : 1) + "</span>" +
      "</figure>" +
      '<div class="card-body">' +
      '<div class="card-top"><span class="price">' + api.fmt.price(p.price, p.status) + "</span>" +
      '<button class="chip" style="padding:6px 12px;font-size:11px" data-compare-id="' + p.id + '">Compare</button></div>' +
      '<h3 class="card-title" style="position:relative"><a href="' + BASE + "property?id=" + p.id + '">' + esc(p.title) + "</a></h3>" +
      '<p class="card-addr">' + esc(p.addr) + "</p>" +
      '<p class="card-specs">' + specs.map(function (s) { return "<span>" + s + "</span>"; }).join("") + "</p>" +
      '<div class="card-foot"><span>' + esc(p.type) + "</span><span>EPC " + esc(p.epc) + (p.status === "rent" && p.availableFrom ? " · " + esc(p.availableFrom) : "") + "</span></div>" +
      "</div></article>";
  }

  function skeletonCards(n) {
    var out = "";
    for (var i = 0; i < (n || 6); i++) out += '<div class="sk-card"><div class="skeleton sk-img"></div><div class="skeleton sk-line"></div><div class="skeleton sk-line"></div></div>';
    return out;
  }

  function emptyState(title, body, cta) {
    return '<div class="empty-state"><span class="empty-mark">H</span><h3>' + title + "</h3><p>" + body + "</p>" + (cta || "") + "</div>";
  }
  function errorState(retryLabel) {
    return '<div class="empty-state"><span class="empty-mark">!</span><h3>Something went wrong loading these properties.</h3><p>It isn\'t you — give it another go.</p><button class="btn btn--outline" data-retry>' + (retryLabel || "Try again") + "</button></div>";
  }

  /* ── modals (focus-trapped) ─────────────────────────────────────────────── */
  var lastFocus = null;
  function openModal(overlay) {
    lastFocus = document.activeElement;
    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
    var focusables = overlay.querySelectorAll("a,button,input,select,textarea,[tabindex]");
    if (focusables[0]) focusables[0].focus();
    overlay.__trap = function (e) {
      if (e.key === "Escape") return closeModal(overlay);
      if (e.key !== "Tab") return;
      var f = Array.prototype.filter.call(overlay.querySelectorAll("a,button,input,select,textarea,[tabindex]"), function (n) { return !n.disabled && n.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    };
    document.addEventListener("keydown", overlay.__trap);
  }
  function closeModal(overlay) {
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", overlay.__trap);
    if (lastFocus) lastFocus.focus();
  }
  document.addEventListener("click", function (e) {
    var closer = e.target.closest && e.target.closest("[data-close-modal]");
    if (closer) { var ov = closer.closest(".overlay, .drawer-overlay"); if (ov) closeModal(ov); }
    if (e.target.classList && (e.target.classList.contains("overlay"))) closeModal(e.target);
  });

  /* ── viewing request modal (shared by property page & cards) ───────────── */
  function viewingModal(property) {
    var ov = document.querySelector("#viewing-modal");
    if (!ov) {
      ov = el('<div class="overlay" id="viewing-modal" role="dialog" aria-modal="true" aria-label="Arrange a viewing"><div class="modal">' +
        '<button class="icon-btn modal-x" data-close-modal aria-label="Close">' + ICON.x + "</button>" +
        '<p class="eyebrow eyebrow--bare">Arrange a viewing</p>' +
        '<h3 class="h-2" data-vm-title style="margin:10px 0 4px"></h3>' +
        '<p class="muted" data-vm-addr style="margin-bottom:24px"></p>' +
        '<form data-vm-form novalidate>' +
        '<div class="opt-grid" style="grid-template-columns:1fr 1fr;margin-bottom:20px">' +
        '<label class="opt-card is-on"><input type="radio" name="kind" value="in-person" checked class="visually-hidden">In person<small>At the property</small></label>' +
        '<label class="opt-card"><input type="radio" name="kind" value="virtual" class="visually-hidden">Virtual<small>Live video walkthrough</small></label>' +
        "</div>" +
        '<div class="grid-2" style="gap:20px;margin-bottom:20px">' +
        '<div class="field"><label for="vm-date">Preferred date</label><input id="vm-date" name="date" type="date" required></div>' +
        '<div class="field"><label for="vm-time">Preferred time</label><select id="vm-time" name="time">' +
        ["09:00", "10:30", "12:00", "13:30", "15:00", "16:30", "18:00"].map(function (t) { return "<option>" + t + "</option>"; }).join("") +
        "</select></div></div>" +
        '<div class="grid-2" style="gap:20px;margin-bottom:20px">' +
        '<div class="field"><label for="vm-name">Your name</label><input id="vm-name" name="name" required autocomplete="name"><span class="field-error">Please add your name</span></div>' +
        '<div class="field"><label for="vm-email">Email</label><input id="vm-email" name="email" type="email" required autocomplete="email"><span class="field-error">A valid email helps us confirm</span></div>' +
        "</div>" +
        '<button class="btn btn--bronze btn--lg" style="width:100%" type="submit">Request viewing <span class="btn-arrow">→</span></button>' +
        '<p class="muted" style="font-size:12px;margin-top:14px;text-align:center">Confirmation lands by email — reschedule or cancel any time from My Halcyon.</p>' +
        "</form></div></div>");
      document.body.appendChild(ov);
      ov.addEventListener("click", function (e) {
        var opt = e.target.closest(".opt-card");
        if (opt && opt.parentElement.classList.contains("opt-grid")) {
          opt.parentElement.querySelectorAll(".opt-card").forEach(function (o) { o.classList.remove("is-on"); });
          opt.classList.add("is-on"); var r = opt.querySelector("input"); if (r) r.checked = true;
        }
      });
      ov.querySelector("[data-vm-form]").addEventListener("submit", function (e) {
        e.preventDefault();
        var f = e.target, bad = false;
        [["vm-name", f.name.value.trim()], ["vm-email", /.+@.+\..+/.test(f.email.value)]].forEach(function (pair) {
          var field = f.querySelector("#" + pair[0]).closest(".field");
          field.classList.toggle("is-invalid", !pair[1]); if (!pair[1]) bad = true;
        });
        if (bad) return;
        var btn = f.querySelector("button[type=submit]"); btn.disabled = true; btn.textContent = "Sending…";
        api.viewings.request({
          propertyId: ov.__pid, kind: f.kind.value, date: f.date.value, time: f.time.value,
          name: f.name.value.trim(), email: f.email.value.trim()
        }).then(function () {
          closeModal(ov); btn.disabled = false; btn.innerHTML = 'Request viewing <span class="btn-arrow">→</span>';
          f.reset(); toast("Viewing requested — we'll confirm shortly", "good");
        });
      });
    }
    ov.__pid = property.id;
    ov.querySelector("[data-vm-title]").textContent = property.title;
    ov.querySelector("[data-vm-addr]").textContent = property.addr;
    var d = new Date(Date.now() + 86400000); ov.querySelector("#vm-date").value = d.toISOString().slice(0, 10);
    openModal(ov);
  }

  /* ── image fallbacks ────────────────────────────────────────────────────── */
  function imgFallbacks(root) {
    (root || document).querySelectorAll("img:not([data-fb])").forEach(function (im) {
      im.setAttribute("data-fb", "1");
      im.addEventListener("error", function () {
        im.style.visibility = "hidden";
        if (im.parentElement) im.parentElement.classList.add("img-fallback");
      });
    });
  }

  /* helper to wire a container of injected cards into the fx system */
  function hydrate(rootEl) {
    imgFallbacks(rootEl);
    if (window.ScrollFXKit) window.ScrollFXKit.refresh(rootEl);
  }

  window.HAL.ui = {
    chrome: chrome, el: el, esc: esc, toast: toast, ICON: ICON,
    propCard: propCard, skeletonCards: skeletonCards, emptyState: emptyState, errorState: errorState,
    openModal: openModal, closeModal: closeModal, viewingModal: viewingModal,
    refreshSavedCount: refreshSavedCount, refreshTray: refreshTray, hydrate: hydrate, BASE: BASE
  };
})();

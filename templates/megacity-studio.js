/* ════════════════════════════════════════════════════════════════════
   MEGACITY STUDIO · app
   Hash router + screens for the back office. Talks to the Worker only
   through window.MCStudioAPI (megacity-studio-api.js). Vanilla JS, no
   framework, no build step. British English throughout.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var API = window.MCStudioAPI;
  if (!API) return;

  /* ── helpers ─────────────────────────────────────────────────────── */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function same(a, b) { return JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b); }
  function money(n) { if (n == null || n === "" || isNaN(n)) return ""; return "£" + Number(n).toLocaleString("en-GB"); }
  function plural(n, one, many) { n = n || 0; return n + " " + (n === 1 ? one : (many || one + "s")); }
  function fmtDate(iso) { var d = new Date(iso); if (isNaN(d)) return ""; return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
  function rel(iso) {
    if (!iso) return "";
    var t = new Date(iso).getTime(); if (isNaN(t)) return "";
    var s = Math.round((Date.now() - t) / 1000);
    if (s < 45) return "just now";
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + " min ago";
    if (s < 86400) return Math.round(s / 3600) + " h ago";
    var d = Math.round(s / 86400);
    if (d === 1) return "yesterday";
    if (d < 14) return d + " days ago";
    return fmtDate(iso);
  }
  function getPath(o, p) { var parts = p.split("."), c = o; for (var i = 0; i < parts.length; i++) { if (c == null) return undefined; c = c[parts[i]]; } return c; }
  function setPath(o, p, v) { var parts = p.split("."), c = o; for (var i = 0; i < parts.length - 1; i++) { if (c[parts[i]] == null || typeof c[parts[i]] !== "object") c[parts[i]] = {}; c = c[parts[i]]; } c[parts[parts.length - 1]] = v; }
  function firstName(n) { return String(n || "").trim().split(/\s+/)[0] || "there"; }
  function initials(n) { return String(n || "?").trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join("") || "?"; }
  function optList(key) { return (state.options && state.options[key]) || []; }
  function optLabel(key, value) { if (value == null || value === "") return ""; var hit = optList(key).filter(function (o) { return String(o.value) === String(value); })[0]; return hit ? hit.label : String(value); }
  function isTyping(e) { var t = e.target; if (!t) return false; var tag = (t.tagName || "").toLowerCase(); return tag === "input" || tag === "textarea" || tag === "select" || t.isContentEditable; }
  function debounce(fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); }; }
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
  function hashQuery() { return new URLSearchParams((location.hash.split("?")[1]) || ""); }
  function copyText(text) { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text); return Promise.reject(new Error("no clipboard")); }
  function dayPart() { var h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; }
  function isPhoto(m) { return m && (m.kind === "photo" || m.kind === "pano"); }
  function statusPill(s) { return '<span class="st-pill st-pill--' + esc(s || "draft") + '">' + esc(optLabel("status", s) || s || "Draft") + "</span>"; }
  function loading() { return '<div class="st-empty" style="border:0;background:none"><span class="st-spin" aria-hidden="true"></span><p>Loading…</p></div>'; }
  function errorHtml(err) { return '<div class="st-empty"><h3>Something went wrong</h3><p>' + esc(err && err.message || "Please try again.") + '</p><button type="button" class="st-btn" data-retry-route>Try again</button></div>'; }
  function showError(err) { view.innerHTML = errorHtml(err); }
  function errToast(err) { toast((err && err.message) || "Something went wrong", { kind: "bad" }); }

  /* ── icons (inline SVG, 24-box, stroked) ─────────────────────────── */
  var I = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M10 20v-5h4v5"/></svg>',
    list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    cog: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>',
    more: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
    users: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5c3 0 5.5 2 5.5 5.5"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12l7 7 7-7"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    image: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m5 18 5-5 3 3 3-3 3.5 3.5"/></svg>',
    upload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M6 10l6-6 6 6"/><path d="M4 20h16"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4.2-4.2"/></svg>',
    eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    out: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10"/></svg>',
    doc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/></svg>',
    film: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M8 5v14M16 5v14M3.5 10h4.5M16 10h4.5M3.5 14h4.5M16 14h4.5"/></svg>',
    sort: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4v16M4 16l4 4 4-4M16 20V4M12 8l4-4 4 4"/></svg>',
    key: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="14" r="4"/><path d="m11 11 9-9M15 7l3 3"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    person: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c0-4 3.4-7 7.5-7s7.5 3 7.5 7"/></svg>',
    link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.5 1.5"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5"/></svg>',
    bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
    db: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="6" rx="7.5" ry="3"/><path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6"/><path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 13.5 6 5h12l2.5 8.5V19h-17z"/><path d="M3.5 13.5H9l1.2 2.5h3.6l1.2-2.5h5.5"/></svg>',
    phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/></svg>',
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16v10H9l-4.5 3.5z"/><path d="M8 9.5h8M8 12.5h5"/></svg>',
    expand: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg>',
    tour: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M3.5 12c0 2.8 3.8 5 8.5 5s8.5-2.2 8.5-5-3.8-5-8.5-5-8.5 2.2-8.5 5z"/></svg>',
    spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/></svg>',
    pages: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4"/><path d="M4 7v14h11"/></svg>',
    plug: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3v5M15 3v5M6 8h12v4a6 6 0 0 1-12 0z"/><path d="M12 18v3"/></svg>'
  };

  /* ── state & shell nodes ─────────────────────────────────────────── */
  var state = { user: null, features: {}, options: null, route: null, listIndex: null, listIndexAt: 0, intended: null, liveCount: null, notConnected: false, setup: {}, unread: 0, notifs: [], mediaIndex: null, mediaLists: null, mediaIndexAt: 0 };
  var view = $("#view"), app = $("#app"), authEl = $("#auth"), bootEl = $("#boot"), toasts = $("#toasts");
  var topTitle = $("#topTitle"), topSub = $("#topSub"), topChip = $("#topChip"), topBack = $("#topBack");

  /* ── toasts ──────────────────────────────────────────────────────── */
  function toast(msg, opts) {
    opts = opts || {};
    var el = document.createElement("div");
    el.className = "st-toast" + (opts.kind ? " st-toast--" + opts.kind : "");
    el.setAttribute("role", "status");
    el.innerHTML = "<span>" + esc(msg) + "</span>" + (opts.action ? '<button type="button" data-act>' + esc(opts.action.label) + "</button>" : "") +
      '<button type="button" class="st-toast-x" aria-label="Dismiss">' + I.x + "</button>";
    var timer = setTimeout(remove, opts.ttl || (opts.action ? 9000 : 4200));
    function remove() { clearTimeout(timer); if (el.parentNode) el.parentNode.removeChild(el); }
    el.addEventListener("click", function (e) {
      if (e.target.closest("[data-act]")) { remove(); opts.action.run(); }
      else if (e.target.closest(".st-toast-x")) remove();
    });
    toasts.appendChild(el);
    while (toasts.children.length > 4) toasts.removeChild(toasts.firstChild);
    return remove;
  }

  /* ── focus trap (drawer, modal, palette) ─────────────────────────── */
  var FOCUSABLE = 'a[href],button:not(:disabled),input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])';
  function trapFocus(container, onEsc) {
    var prev = document.activeElement;
    function visible(el) { return !el.hidden && (el.offsetWidth || el.offsetHeight || el.getClientRects().length); }
    function onKey(e) {
      if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); onEsc(); return; }
      if (e.key !== "Tab") return;
      var f = $$(FOCUSABLE, container).filter(visible);
      if (!f.length) { e.preventDefault(); container.focus(); return; }
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || !container.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    container.addEventListener("keydown", onKey);
    return function release() {
      container.removeEventListener("keydown", onKey);
      if (prev && prev.focus && document.contains(prev) && !prev.closest("[hidden]")) { try { prev.focus(); } catch (e) { /* fine */ } }
    };
  }

  /* ── modal ───────────────────────────────────────────────────────── */
  var modalWrap = $("#modalWrap"), modalEl = $("#modal"), modalRelease = null, modalResolve = null, modalNoEsc = false;
  function openModal(html, opts) {
    opts = opts || {};
    closeModal(false);
    modalNoEsc = !!opts.noEsc;
    modalEl.className = "st-modal" + (opts.danger ? " st-modal--danger" : "") + (opts.wide ? " st-modal--wide" : "");
    modalEl.innerHTML = html;
    modalWrap.hidden = false;
    modalRelease = trapFocus(modalEl, function () { if (!modalNoEsc) closeModal(false); });
    var first = $("[data-focus]", modalEl) || $(".st-modal-foot .st-btn--fill", modalEl) || $("input,select,textarea,button:not(:disabled)", modalEl);
    (first || modalEl).focus();
    return modalEl;
  }
  function closeModal(result) {
    if (modalWrap.hidden) return;
    modalWrap.hidden = true;
    if (modalRelease) { modalRelease(); modalRelease = null; }
    var r = modalResolve; modalResolve = null;
    if (r) r(result);
  }
  modalWrap.addEventListener("click", function (e) {
    if (e.target.closest("[data-close]")) { if (!modalNoEsc) closeModal(false); return; }
    if (e.target.closest("[data-usedraft]")) { applyDraft(); return; }
    var pk = e.target.closest("[data-pick]"); if (pk) { var cbp = pickCb; pickCb = null; closeModal(false); if (cbp) cbp(pk.getAttribute("data-pick")); return; }
    var b = e.target.closest("[data-modal]"); if (!b) return;
    closeModal(b.getAttribute("data-modal") === "ok");
  });
  function confirmModal(o) {
    return new Promise(function (resolve) {
      openModal('<h2 id="modalTitle">' + esc(o.title) + "</h2>" + '<div class="st-modal-body">' + (o.html || "<p>" + esc(o.body || "") + "</p>") + "</div>" +
        '<div class="st-modal-foot"><button type="button" class="st-btn" data-modal="cancel">' + esc(o.cancel || "Cancel") + "</button>" +
        '<button type="button" class="st-btn st-btn--fill' + (o.danger ? " st-btn--danger" : "") + '" data-modal="ok" data-focus>' + esc(o.confirm || "Confirm") + "</button></div>", { danger: o.danger });
      modalResolve = resolve;
    });
  }

  /* ── drawer (right on desktop, sheet on phones) ──────────────────── */
  var drawerWrap = $("#drawerWrap"), drawerEl = $(".st-drawer", drawerWrap), drawerBody = $("#drawerBody"), drawerTitle = $("#drawerTitle"), drawerRelease = null;
  function openDrawer(title, html, onReady) {
    closeDrawer();
    drawerTitle.textContent = title; drawerBody.innerHTML = html; drawerWrap.hidden = false;
    drawerRelease = trapFocus(drawerEl, closeDrawer);
    var first = $(FOCUSABLE, drawerBody); (first || drawerEl).focus();
    if (onReady) onReady(drawerBody);
  }
  function closeDrawer() {
    if (drawerWrap.hidden) return;
    drawerWrap.hidden = true; if (drawerRelease) { drawerRelease(); drawerRelease = null; }
    if (/^#\/enquiries\/./.test(location.hash)) history.replaceState(null, "", "#/enquiries");
  }
  drawerWrap.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) closeDrawer(); });

  /* ── top bar, sidebar, bottom bar ────────────────────────────────── */
  function setTop(o) {
    topTitle.textContent = o.title || "";
    document.title = (o.title ? o.title + " · " : "") + "Megacity Studio";
    topSub.hidden = !o.sub; topSub.textContent = o.sub || "";
    topBack.hidden = !o.back; if (o.back) topBack.setAttribute("href", o.back);
    topChip.innerHTML = o.chip || "";
  }
  var NAV = [["Workspace"], ["#/", "Home", "home"], ["#/listings", "Listings", "list", "live"], ["#/listings/new", "New listing", "plus"], ["#/enquiries", "Enquiries", "inbox", "unread"], ["Website"], ["#/pages", "Pages", "pages"], ["#/backlinks", "Backlinks", "link"], ["#/integrations", "Integrations", "plug"], ["Office"], ["#/settings", "Settings", "cog"], ["#/team", "Team", "users"]];
  function navKey() {
    var h = location.hash.replace(/^#/, "").split("?")[0] || "/";
    if (h === "/") return "#/";
    if (h.indexOf("/listings/new") === 0) return "#/listings/new";
    if (h.indexOf("/listings") === 0) return "#/listings";
    if (h.indexOf("/enquiries") === 0) return "#/enquiries";
    if (h.indexOf("/pages") === 0) return "#/pages";
    if (h.indexOf("/backlinks") === 0) return "#/backlinks";
    if (h.indexOf("/integrations") === 0) return "#/integrations";
    if (h.indexOf("/settings") === 0 || h.indexOf("/account") === 0) return "#/settings";
    if (h.indexOf("/team") === 0) return "#/team";
    return "";
  }
  function renderNav() {
    var cur = navKey(), u = state.user || {};
    $("#nav").innerHTML = NAV.map(function (n) {
      if (n.length === 1) return '<p class="st-nav-sec">' + esc(n[0]) + "</p>";
      var badge = n[3] === "live" && state.liveCount != null ? '<span class="st-badge" aria-label="' + state.liveCount + ' live">' + state.liveCount + "</span>" :
        n[3] === "unread" ? '<span class="st-badge st-badge--hot" data-unread' + (state.unread ? "" : " hidden") + ' aria-label="' + (state.unread || 0) + ' unread">' + (state.unread || 0) + "</span>" : "";
      return '<a href="' + n[0] + '"' + (cur === n[0] ? ' class="is-on" aria-current="page"' : "") + ">" + I[n[2]] + "<span>" + esc(n[1]) + "</span>" + badge + "</a>";
    }).join("");
    $("#sideUser").innerHTML = '<div class="st-me"><span class="st-avatar" aria-hidden="true">' + esc(initials(u.name)) + "</span><div><b>" + esc(u.name || "") + "</b><small>" + esc(u.role || "") + "</small></div></div>" +
      '<button type="button" class="st-signout" data-signout>' + I.out + "<span>Sign out</span></button>";
    var BAR = [["#/", "Home", "home"], ["#/listings", "Listings", "list"], ["#/listings/new", "Add", "plus", "add"], ["#/enquiries", "Enquiries", "inbox"]];
    $("#bar").innerHTML = BAR.map(function (b) {
      var dot = b[0] === "#/enquiries" ? '<span class="st-bar-badge" data-unread' + (state.unread ? "" : " hidden") + ">" + (state.unread || 0) + "</span>" : "";
      return '<a href="' + b[0] + '"' + (b[3] ? ' class="st-bar-add" aria-label="New listing"' : (cur === b[0] ? ' class="is-on" aria-current="page"' : "")) + "><span>" + I[b[2]] + dot + "</span><span>" + esc(b[1]) + "</span></a>";
    }).join("") + '<button type="button" data-more' + (cur === "#/team" || cur === "#/settings" ? ' class="is-on"' : "") + ' aria-haspopup="dialog"><span>' + I.more + "</span><span>More</span></button>";
    $("#userMenu").innerHTML = '<button type="button" aria-haspopup="menu" aria-expanded="false" aria-label="Account menu for ' + esc(u.name || "") + '"><span class="st-avatar" aria-hidden="true">' + esc(initials(u.name)) + "</span></button>";
  }
  function toggleUserMenu() {
    var um = $("#userMenu"), open = $(".st-menu", um);
    if (open) return closeUserMenu();
    var u = state.user || {};
    um.insertAdjacentHTML("beforeend", '<div class="st-menu" role="menu"><div class="st-menu-head"><b>' + esc(u.name) + "</b>" + esc(u.email) + "</div>" +
      '<a role="menuitem" href="#/settings/account">' + I.key + "Change password</a>" +
      '<button type="button" role="menuitem" class="is-danger" data-signout>' + I.out + "Sign out</button></div>");
    $("button", um).setAttribute("aria-expanded", "true");
    var f = $("[role=menuitem]", um); if (f) f.focus();
  }
  function closeUserMenu() { var um = $("#userMenu"); var m = um && $(".st-menu", um); if (m) { m.remove(); $("button", um).setAttribute("aria-expanded", "false"); } }
  function openMore() {
    var u = state.user || {};
    openDrawer("More", '<div class="st-menu-list">' +
      '<a href="#/pages" data-close>' + I.pages + "Pages</a>" +
      '<a href="#/backlinks" data-close>' + I.link + "Backlinks</a>" +
      '<a href="#/integrations" data-close>' + I.plug + "Integrations</a>" +
      '<a href="#/settings" data-close>' + I.cog + "Settings</a>" +
      '<a href="#/team" data-close>' + I.users + "Team</a>" +
      '<a href="#/settings/account" data-close>' + I.key + "Change password</a>" +
      '<button type="button" data-cmdk>' + I.search + "Search listings</button>" +
      '<button type="button" class="is-danger" data-signout>' + I.out + "Sign out</button></div>" +
      '<p class="st-hint">Signed in as ' + esc(u.name) + " · " + esc(u.role) + "</p>");
  }
  function signOut() {
    closeDrawer(); closeUserMenu();
    API.auth.logout().catch(function () { /* the cookie may already be gone */ }).then(function () {
      state.user = null; state.listIndex = null; state.intended = null; ed = null; pg = null; state.mediaIndexAt = 0; stopNotifPoll(); stopTourPoll();
      go("#/login");
    });
  }

  /* ── router ──────────────────────────────────────────────────────── */
  var ROUTES = [
    [/^\/login$/, "login", true], [/^\/setup$/, "setup", true], [/^\/accept\/([^/]+)$/, "accept", true], [/^\/reset\/([^/]+)$/, "reset", true], [/^\/forgot$/, "forgot", true],
    [/^\/?$/, "dashboard"], [/^\/listings$/, "listings"], [/^\/listings\/new$/, "newListing"],
    [/^\/listings\/([^/]+)$/, "editor"], [/^\/listings\/([^/]+)\/(details|home|media|tour|publish)$/, "editor"],
    [/^\/enquiries$/, "enquiries"], [/^\/enquiries\/([^/]+)$/, "enquiries"],
    [/^\/pages$/, "pages"], [/^\/pages\/([^/]+)$/, "pageEditor"], [/^\/backlinks$/, "backlinks"], [/^\/integrations$/, "integrations"],
    [/^\/settings$/, "settings"], [/^\/settings\/([^/]+)$/, "settings"], [/^\/team$/, "team"], [/^\/account$/, "account"]
  ];
  function parseRoute() {
    var h = (location.hash.replace(/^#/, "") || "/").split("?")[0];
    for (var i = 0; i < ROUTES.length; i++) {
      var m = ROUTES[i][0].exec(h);
      if (m) return { name: ROUTES[i][1], params: m.slice(1).map(function (p) { try { return decodeURIComponent(p); } catch (e) { return p; } }), pub: !!ROUTES[i][2], path: h };
    }
    return { name: "notfound", params: [], pub: false, path: h };
  }
  var SCREENS = {};
  function route() {
    var r = parseRoute();
    closeDrawer(); closeModal(false); closeUserMenu(); closeCmdk(); closeRowMenus(); closeBell();
    if (state.route && state.route.name === "editor" && !(r.name === "editor" && r.params[0] === state.route.params[0])) editorLeave();
    if (state.route && state.route.name === "pageEditor" && !(r.name === "pageEditor" && r.params[0] === state.route.params[0])) pageLeave();
    state.route = r;
    if (state.notConnected) { showNotConnected(); return; }
    if (r.pub) {
      if (state.user) { go("#/"); return; }
      renderAuthScreen(r); return;
    }
    if (!state.user) { state.intended = "#" + r.path; go("#/login"); return; }
    bootEl.hidden = true; authEl.hidden = true; app.hidden = false;
    renderNav(); ensureNotifPoll();
    window.scrollTo(0, 0);
    (SCREENS[r.name] || SCREENS.notfound).apply(null, r.params);
  }
  window.addEventListener("hashchange", route);
  SCREENS.notfound = function () { setTop({ title: "Not found" }); view.innerHTML = '<div class="st-empty"><h3>That screen does not exist</h3><p>Check the link, or start from the home screen.</p><a class="st-btn" href="#/">Home</a></div>'; };

  /* ── boot: who is signed in, or what is missing ──────────────────── */
  function boot() {
    API.auth.me().then(function (me) {
      state.user = me.user; state.features = me.features || {};
      return loadOptions().then(function () { var r = parseRoute(); if (r.pub) go("#/"); else route(); });
    }).catch(function (err) {
      if (err.status === 503 || (err.body && err.body.connected === false)) { state.notConnected = true; showNotConnected(); return; }
      if (err.status === 401) {
        state.setup = (err.body && err.body.setup) || {};
        var r = parseRoute();
        if (state.setup.needsOwner) { if (r.name === "setup" || r.name === "accept") route(); else go("#/setup"); }
        else if (r.pub) route();
        else { state.intended = "#" + r.path; go("#/login"); }
        return;
      }
      showFatal(err);
    });
  }
  function loadOptions() { return API.options.get().then(function (o) { state.options = o; }); }
  function afterSignIn(user) {
    state.user = user;
    return loadOptions().then(function () { var next = state.intended && state.intended !== "#/login" ? state.intended : "#/"; state.intended = null; go(next); }, function (err) { showFatal(err); });
  }
  function showFatal(err) {
    authShell('<h1>The Studio could not open</h1><p class="st-lead">' + esc(err && err.message || "Something went wrong talking to the server.") + '</p><div class="st-actions" style="margin-top:20px"><button type="button" class="st-btn st-btn--fill" data-retry>Try again</button></div>');
  }

  /* ── auth screens ────────────────────────────────────────────────── */
  function authShell(inner, wide) {
    bootEl.hidden = true; app.hidden = true; authEl.hidden = false;
    authEl.innerHTML = '<div class="st-auth-band"><a class="st-brand" href="#/"><span class="st-wm">Megacity</span><span class="st-wm-sub">Studio</span></a><small>Megacity Properties · back office</small></div>' +
      '<div class="st-auth-body"><div class="st-auth-card' + (wide ? " st-auth-card--wide" : "") + '">' + inner + "</div></div>";
    window.scrollTo(0, 0);
    var first = $("input", authEl); if (first) first.focus();
  }
  function renderAuthScreen(r) {
    if (r.name === "forgot") return screenForgot();
    if (r.name === "reset") return screenReset(r.params[0]);
    if (r.name === "accept") return screenAccept(r.params[0]);
    if (r.name === "setup") return screenSetup();
    return screenLogin();
  }
  function fieldHtml(o) {
    var id = "f_" + o.name;
    return '<div class="st-field"><label class="st-label" for="' + id + '">' + esc(o.label) + (o.required ? ' <span class="st-req">required</span>' : "") + "</label>" +
      '<input class="st-in" id="' + id + '" name="' + o.name + '" type="' + (o.type || "text") + '"' + (o.auto ? ' autocomplete="' + o.auto + '"' : "") + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : "") +
      (o.required ? " required" : "") + (o.value != null ? ' value="' + esc(o.value) + '"' : "") + (o.inputmode ? ' inputmode="' + o.inputmode + '"' : "") + (o.pw ? ' minlength="10"' : "") + ">" +
      (o.pw ? '<span class="st-pw" data-pw-for="' + id + '"><i></i><span>At least 10 characters</span></span>' : "") + (o.hint ? '<span class="st-hint">' + o.hint + "</span>" : "") + "</div>";
  }
  function selectHtml(o) {
    var id = "f_" + o.name, opts = o.options || optList(o.list);
    return '<div class="st-field"><label class="st-label" for="' + id + '">' + esc(o.label) + '</label><div class="st-select"><select id="' + id + '" name="' + o.name + '">' + (o.noEmpty ? "" : '<option value="">— not stated —</option>') +
      opts.map(function (op) { return '<option value="' + esc(op.value) + '"' + (o.value != null && String(o.value) === String(op.value) ? " selected" : "") + ">" + esc(op.label) + "</option>"; }).join("") + "</select></div>" + (o.hint ? '<span class="st-hint">' + o.hint + "</span>" : "") + "</div>";
  }
  function pwStrength(v) {
    var n = (v || "").length;
    if (n < 10) return { w: Math.min(30, n * 3), cls: "", txt: n ? "Too short — at least 10 characters" : "At least 10 characters" };
    var variety = (/[a-z]/.test(v) ? 1 : 0) + (/[A-Z]/.test(v) ? 1 : 0) + (/\d/.test(v) ? 1 : 0) + (/[^\w]/.test(v) ? 1 : 0);
    if (n >= 14 && variety >= 3) return { w: 100, cls: "is-strong", txt: "Strong" };
    if (n >= 12 || variety >= 3) return { w: 70, cls: "is-ok", txt: "Good — longer is stronger" };
    return { w: 45, cls: "is-ok", txt: "OK — a few words together is stronger" };
  }
  document.addEventListener("input", function (e) {
    var t = e.target; if (!t || !t.id) return;
    var m = $('[data-pw-for="' + t.id + '"]'); if (!m) return;
    var s = pwStrength(t.value); m.className = "st-pw " + s.cls; m.querySelector("i").style.setProperty("--w", s.w + "%"); m.querySelector("span").textContent = s.txt;
  });
  function bindForm(form, handler) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var err = $("[data-form-err]", form) || $(".st-err", form); if (err) err.hidden = true;
      var btn = $('button[type="submit"]', form), label = btn.innerHTML;
      var data = {};
      $$("input,select,textarea", form).forEach(function (i) { if (i.name) data[i.name] = i.type === "checkbox" ? i.checked : i.value; });
      var p;
      try { p = handler(data, form); } catch (ex) { p = Promise.reject(ex); }
      if (!p || !p.then) return;
      btn.disabled = true; btn.innerHTML = '<span class="st-spin" aria-hidden="true"></span> ' + label;
      p.catch(function (ex) { showFormError(form, (ex && ex.message) || "Something went wrong"); }).then(function () { if (document.contains(btn)) { btn.disabled = false; btn.innerHTML = label; } });
    });
  }
  function showFormError(form, msg) {
    var err = $("[data-form-err]", form) || $(".st-err", form);
    if (!err) { err = document.createElement("p"); err.className = "st-err"; err.setAttribute("role", "alert"); var btn = $('button[type="submit"]', form); form.insertBefore(err, btn ? btn.parentNode === form ? btn : form.lastChild : null); }
    err.textContent = msg; err.hidden = false;
  }
  function checkPasswords(a, b) {
    if (!a || a.length < 10) throw new Error("Use at least 10 characters for the password");
    if (a !== b) throw new Error("The two passwords do not match");
  }

  function screenLogin() {
    authShell('<h1>Sign in</h1><p class="st-lead">The back office for Megacity Properties.</p><form novalidate>' +
      fieldHtml({ label: "Email address", name: "email", type: "email", auto: "username", required: true, inputmode: "email" }) +
      fieldHtml({ label: "Password", name: "password", type: "password", auto: "current-password", required: true }) +
      '<button type="submit" class="st-btn st-btn--fill">Sign in</button></form>' +
      '<div class="st-auth-links"><a href="#/forgot">Forgot password?</a>' + (API.isMock ? '<span class="st-hint">Mock mode — any email address with a password of 10+ characters signs you in.</span>' : "") + "</div>");
    bindForm($("form", authEl), function (d) {
      if (!d.email || !d.password) throw new Error("Enter your email address and password");
      return API.auth.login(d.email.trim(), d.password).then(function (res) { return afterSignIn(res.user); });
    });
  }
  function screenForgot() {
    authShell('<h1>Forgot your password?</h1><p class="st-lead">Enter the email address you sign in with. If it has an account we will email a link that works for 48 hours.</p><form novalidate>' +
      fieldHtml({ label: "Email address", name: "email", type: "email", auto: "username", required: true, inputmode: "email" }) +
      '<button type="submit" class="st-btn st-btn--fill">Email me a link</button></form><div class="st-auth-links"><a href="#/login">Back to sign in</a></div>');
    bindForm($("form", authEl), function (d) {
      if (!d.email) throw new Error("Enter your email address");
      return API.auth.forgot(d.email.trim()).then(function () {
        $(".st-auth-card", authEl).innerHTML = '<h1>Check your email</h1><p class="st-lead">If that address has an account we have emailed a link. It works for 48 hours and once only.</p><div class="st-auth-links" style="margin-top:22px"><a href="#/login">Back to sign in</a></div>';
      });
    });
  }
  function screenReset(token) {
    authShell('<h1>Choose a new password</h1><p class="st-lead">At least 10 characters. A few words together is easy to remember and hard to guess.</p><form novalidate>' +
      fieldHtml({ label: "New password", name: "password", type: "password", auto: "new-password", required: true, pw: true }) +
      fieldHtml({ label: "New password again", name: "password2", type: "password", auto: "new-password", required: true }) +
      '<button type="submit" class="st-btn st-btn--fill">Change password</button></form><div class="st-auth-links"><a href="#/login">Back to sign in</a></div>');
    bindForm($("form", authEl), function (d) {
      checkPasswords(d.password, d.password2);
      return API.auth.reset(token, d.password).then(function () { toast("Password changed — sign in with it now", { kind: "good" }); go("#/login"); });
    });
  }
  function screenAccept(token) {
    authShell('<h1>Welcome to the Studio</h1><p class="st-lead">You have been invited to the Megacity Properties back office. Tell us your name and choose a password.</p><form novalidate>' +
      fieldHtml({ label: "Your name", name: "name", auto: "name", required: true }) +
      fieldHtml({ label: "Password", name: "password", type: "password", auto: "new-password", required: true, pw: true }) +
      fieldHtml({ label: "Password again", name: "password2", type: "password", auto: "new-password", required: true }) +
      '<button type="submit" class="st-btn st-btn--fill">Create my account</button></form>');
    bindForm($("form", authEl), function (d) {
      if (!d.name.trim()) throw new Error("Tell us your name");
      checkPasswords(d.password, d.password2);
      return API.auth.acceptInvite(token, d.name.trim(), d.password).then(function (res) { return afterSignIn(res.user); });
    });
  }
  function screenSetup() {
    authShell('<h1>Create the owner account</h1><p class="st-lead">This happens once. The setup token is the OFFICE_SETUP_TOKEN secret set during deployment' + (API.isMock ? " (mock mode: <code>setup123</code>)" : "") + ".</p><form novalidate>" +
      fieldHtml({ label: "Setup token", name: "setupToken", auto: "off", required: true }) +
      fieldHtml({ label: "Your name", name: "name", auto: "name", required: true, ph: "Walid Mhana" }) +
      fieldHtml({ label: "Email address", name: "email", type: "email", auto: "username", required: true, inputmode: "email" }) +
      fieldHtml({ label: "Password", name: "password", type: "password", auto: "new-password", required: true, pw: true }) +
      fieldHtml({ label: "Password again", name: "password2", type: "password", auto: "new-password", required: true }) +
      '<button type="submit" class="st-btn st-btn--fill">Create the owner account</button></form>');
    bindForm($("form", authEl), function (d) {
      if (!d.setupToken.trim()) throw new Error("Paste the setup token");
      if (!d.name.trim() || !d.email.trim()) throw new Error("Your name and email address are needed");
      checkPasswords(d.password, d.password2);
      return API.auth.bootstrap({ setupToken: d.setupToken.trim(), name: d.name.trim(), email: d.email.trim(), password: d.password }).then(function (res) { toast("Welcome, " + firstName(res.user && res.user.name), { kind: "good" }); return afterSignIn(res.user); });
    });
  }

  /* ── not connected yet: the setup checklist ──────────────────────── */
  function showNotConnected() {
    var steps = [
      ["Enable R2 in the Cloudflare dashboard", "One click, once: Cloudflare dashboard → R2 → Enable. A payment card must be on the account even for the free 10 GB tier. Nothing else in the dashboard is needed.", []],
      ["Run the setup script", "From the repository on the main branch, on a machine where “npx wrangler whoami” shows the Billy Digitals account. It creates the bucket and the database, writes the real database id into wrangler.toml, applies the migration and sets the one-off setup token — and prints that token at the end. Keep it.", ["bash scripts/megacity-setup.sh"]],
      ["Commit and push what it changed", "The script edits wrangler.toml. Push it to main and the deploy connects the Studio.", ["git add wrangler.toml && git commit -m \"Wire Megacity Studio bindings\" && git push origin main"]],
      ["Come back here", "Reopen this page, choose “Create the owner account” and paste the setup token. Afterwards: npx wrangler secret delete OFFICE_SETUP_TOKEN.", []]
    ];
    authShell('<h1>Not connected yet</h1><p class="st-lead">The Studio needs its database and storage before anyone can sign in. Four steps, once. Doing it by hand instead (or on the Free plan) is described in <code>docs/megacity-studio.md</code>.</p>' +
      '<ol class="st-steps">' + steps.map(function (s) {
        return '<li class="st-step"><div><h3>' + esc(s[0]) + "</h3>" + (s[1] ? "<p>" + esc(s[1]) + "</p>" : "") +
          s[2].map(function (c) { return '<div class="st-cmd"><code>' + esc(c) + '</code><button type="button" class="st-btn st-btn--sm" data-copy="' + esc(c) + '" aria-label="Copy command">' + I.copy + "Copy</button></div>"; }).join("") + "</div></li>";
      }).join("") + "</ol>" +
      '<div class="st-actions" style="margin-top:20px"><button type="button" class="st-btn st-btn--fill" data-retry>Check again</button></div>', true);
  }
  authEl.addEventListener("click", function (e) {
    var c = e.target.closest("[data-copy]");
    if (c) { copyText(c.getAttribute("data-copy")).then(function () { toast("Copied"); }, function () { toast("Copy failed — select the command and copy it by hand", { kind: "warn" }); }); return; }
    if (e.target.closest("[data-retry]")) { state.notConnected = false; authEl.hidden = true; bootEl.hidden = false; boot(); }
  });

  /* ── dashboard ───────────────────────────────────────────────────── */
  var ACTIONS = { "listing.create": "Created a listing", "listing.update": "Edited a listing", "listing.publish": "Advertised a listing", "listing.unpublish": "Took a listing off the website", "listing.status": "Changed a listing's status", "listing.bin": "Moved a listing to the Bin", "listing.restore": "Restored a listing", "listing.delete": "Deleted a listing for good", "listing.duplicate": "Duplicated a listing", "listing.import": "Imported listings", "media.upload": "Added a photo or file", "media.delete": "Removed a photo or file", "settings.update": "Updated settings", "team.invite": "Invited someone", "team.update": "Changed a team member", "user.login": "Signed in" };
  function feedHtml(items) {
    if (!items.length) return '<p class="st-hint">Nothing yet. What you and the team do will show up here.</p>';
    return '<ul class="st-feed">' + items.map(function (it) {
      var label = ACTIONS[it.action] || String(it.action || "").replace(/[._]/g, " ");
      var ent = it.entity === "listing" && it.entityId && String(it.entityId).indexOf(",") < 0 ? '<a href="#/listings/' + esc(encodeURIComponent(it.entityId)) + '">' + esc(it.entityId) + "</a>" : (it.entity === "listing" ? "" : esc(it.entityId || ""));
      return '<li><span class="st-dot" aria-hidden="true">' + I.clock + "</span><div><b>" + esc(label) + "</b><small>" + esc(it.user || "") + (ent ? " · " + ent : "") + '</small></div><time datetime="' + esc(it.at) + '">' + esc(rel(it.at)) + "</time></li>";
    }).join("") + "</ul>";
  }
  function tile(label, n, href, mod, sub) {
    var inner = '<span class="st-tile-l">' + esc(label) + '</span><span class="st-tile-n">' + (n == null ? "—" : esc(n)) + "</span>" + (sub ? '<span class="st-tile-s">' + esc(sub) + "</span>" : "");
    return href ? '<a class="st-tile' + (mod ? " st-tile--" + mod : "") + '" href="' + href + '">' + inner + "</a>" : '<div class="st-tile' + (mod ? " st-tile--" + mod : "") + '">' + inner + "</div>";
  }
  function quickAction(href, icon, title, sub) { return '<a class="st-person" href="' + href + '" style="text-decoration:none"><span class="st-dot st-avatar" style="background:var(--sky-soft);color:var(--blue-deep)">' + icon + "</span><div><b>" + esc(title) + "</b><small>" + esc(sub) + "</small></div><span>" + I.more + "</span></a>"; }
  SCREENS.dashboard = function () {
    setTop({ title: "Home" });
    view.innerHTML = loading();
    API.dashboard.get().then(function (d) {
      var c = d.counts || {}, L = c.listings || {}, u = state.user || {}, E = d.enquiries || null, ev = d.events7 || null;
      state.liveCount = L.live; renderNav();
      var showImport = (L.total || 0) === 0;
      view.innerHTML =
        '<div class="st-hello"><div><h2>' + esc(dayPart()) + ", " + esc(firstName(u.name)) + ".</h2><p>" + (L.live ? plural(L.live, "listing is", "listings are") + " advertised on the website right now." : "Nothing is advertised on the website yet.") + (E && E.new ? " " + plural(E.new, "enquiry needs", "enquiries need") + " a reply." : "") + "</p></div>" +
        '<div class="st-actions"><a class="st-btn st-btn--fill" href="#/listings/new">' + I.plus + 'New listing</a><a class="st-btn" href="#/settings">' + I.cog + "Open settings</a></div></div>" +
        (showImport ? '<section class="st-card st-import" style="margin-bottom:14px"><h2>Import the 5 current listings</h2><p>Bring in the five listings and their photos from the hand-built pages, so the website runs from the Studio. It takes a minute or two and can be re-run safely — anything already imported is skipped.</p><button type="button" class="st-btn" data-import>' + I.upload + "Import the current listings</button></section>" : "") +
        '<div class="st-tiles">' + tile("Live listings", L.live, "#/listings?status=live", "live") + tile("Drafts", L.draft, "#/listings?status=draft") + tile("All listings", L.total, "#/listings") + tile("Photos & files", c.media) + tile("Live tours", c.tours && c.tours.live) + "</div>" +
        '<div class="st-tiles">' + tile("New enquiries", E ? E.new : null, "#/enquiries?status=new", E && E.new ? "hot" : null) + tile("Enquiries this week", E ? E.last7 : null, "#/enquiries?status=") + tile("Listing views this week", ev ? ev.listing_view : null) + tile("Tour opens this week", ev ? ev.tour_open : null) + "</div>" +
        '<div class="st-grid2" style="margin-top:14px">' +
        '<section class="st-card"><div class="st-card-head"><div><h2>Enquiries, last 30 days</h2><p>' + (E ? "By day, and this week by source." : "Numbers appear once the activity store is connected.") + "</p></div></div>" + sparkHtml(E ? E.daily : null) + bySourceHtml(E ? E.bySource : null) + "</section>" +
        '<section class="st-card"><div class="st-card-head"><h2>Recent activity</h2></div>' + feedHtml(d.recent || []) + "</section>" +
        '<section class="st-card"><div class="st-card-head"><h2>Quick actions</h2></div><div class="st-team">' +
        quickAction("#/listings/new", I.plus, "New listing", "Start a draft, add photos, advertise when ready") + quickAction("#/enquiries", I.inbox, "Enquiries", "Reply, ring back, mark handled") +
        quickAction("#/listings", I.list, "All listings", "Search, filter, publish and unpublish") + quickAction("#/settings", I.cog, "Settings", "Branding, notifications and 10ninety links") + quickAction("#/team", I.users, "Team", "Invite staff and manage access") + "</div></section></div>";
    }).catch(showError);
  };

  /* ── listings ────────────────────────────────────────────────────── */
  var ls = { status: "", q: "", area: "", sort: "updated", bin: false }, lsRows = [], lsToken = 0;
  SCREENS.listings = function () {
    var hq = hashQuery();
    if (hq.has("status")) { var st = hq.get("status"); ls.bin = st === "bin"; ls.status = ls.bin ? "" : st; }
    setTop({ title: "Listings" });
    view.innerHTML = '<div class="st-filters" id="lsChips" role="group" aria-label="Filter by status"></div><div class="st-toolbar">' +
      '<div class="st-field"><label class="st-vh" for="lsQ">Search</label><input class="st-in" id="lsQ" type="search" placeholder="Search title, reference or address…" value="' + esc(ls.q) + '" autocomplete="off"></div>' +
      '<div class="st-select"><label class="st-vh" for="lsArea">Area</label><select id="lsArea"><option value="">All areas</option>' + optList("area").map(function (o) { return '<option value="' + esc(o.value) + '"' + (ls.area === o.value ? " selected" : "") + ">" + esc(o.label) + "</option>"; }).join("") + "</select></div>" +
      '<div class="st-select"><label class="st-vh" for="lsSort">Sort</label><select id="lsSort">' + [["updated", "Recently updated"], ["rent", "Rent, high to low"], ["title", "Title, A to Z"]].map(function (s) { return '<option value="' + s[0] + '"' + (ls.sort === s[0] ? " selected" : "") + ">" + s[1] + "</option>"; }).join("") + "</select></div>" +
      '<a class="st-btn st-btn--fill" href="#/listings/new">' + I.plus + "New listing</a></div>" +
      '<div id="lsBody">' + loading() + "</div>";
    var qIn = $("#lsQ");
    qIn.addEventListener("input", debounce(function () { ls.q = qIn.value.trim(); loadListings(); }, 250));
    $("#lsArea").addEventListener("change", function () { ls.area = this.value; loadListings(); });
    $("#lsSort").addEventListener("change", function () { ls.sort = this.value; loadListings(); });
    $("#lsChips").addEventListener("click", function (e) { var b = e.target.closest("[data-status]"); if (!b) return; var v = b.getAttribute("data-status"); ls.bin = v === "bin"; ls.status = ls.bin ? "" : v; loadListings(); });
    $("#lsBody").addEventListener("click", onListingsClick);
    $("#lsBody").addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-id][tabindex]")) { e.preventDefault(); go("#/listings/" + encodeURIComponent(e.target.getAttribute("data-id"))); } });
    loadListings();
  };
  function loadListings() {
    var body = $("#lsBody"); if (!body) return;
    var token = ++lsToken;
    renderChips(null);
    API.listings.list({ status: ls.status, area: ls.area, q: ls.q, sort: ls.sort, bin: ls.bin }).then(function (res) {
      if (token !== lsToken || !document.contains(body)) return;
      lsRows = res.items || [];
      if (!ls.status && !ls.q && !ls.area && !ls.bin) { state.listIndex = lsRows; state.listIndexAt = Date.now(); }
      var counts = res.counts || {};
      renderChips(counts);
      if (counts.live != null) { state.liveCount = counts.live; renderNav(); }
      var sortSel = $("#lsSort"); if (sortSel) sortSel.value = ls.sort;
      body.innerHTML = lsRows.length ? tableHtml(lsRows) + cardsHtml(lsRows) : emptyListings();
    }).catch(function (err) { if (token === lsToken && document.contains(body)) body.innerHTML = errorHtml(err); });
  }
  function renderChips(c) {
    var el = $("#lsChips"); if (!el) return;
    var all = c ? (c.draft || 0) + (c.live || 0) + (c.let_agreed || 0) + (c.let || 0) + (c.withdrawn || 0) : null;
    var chips = [["", "All", all], ["live", "Live", c && c.live], ["draft", "Draft", c && c.draft], ["let_agreed", "Let agreed", c && c.let_agreed], ["let", "Let", c && c.let], ["withdrawn", "Withdrawn", c && c.withdrawn], ["bin", "Bin", c && c.bin]];
    el.innerHTML = chips.map(function (ch) {
      var on = ch[0] === "bin" ? ls.bin : (!ls.bin && ls.status === ch[0]);
      return '<button type="button" class="st-fchip' + (on ? " is-on" : "") + '" data-status="' + ch[0] + '" aria-pressed="' + (on ? "true" : "false") + '">' + esc(ch[1]) + (ch[2] != null ? " <b>" + ch[2] + "</b>" : "") + "</button>";
    }).join("");
  }
  function emptyListings() {
    var filtered = ls.status || ls.q || ls.area || ls.bin;
    return '<div class="st-empty">' + I.image + "<h3>" + (ls.bin ? "The Bin is empty" : filtered ? "Nothing matches" : "No listings yet") + "</h3><p>" + (filtered ? "Try a different status, area or search." : "Start with the first one — it saves as you go.") + "</p>" + (filtered ? '<button type="button" class="st-btn" data-status="">Show everything</button>' : '<a class="st-btn st-btn--fill" href="#/listings/new">' + I.plus + "New listing</a>") + "</div>";
  }
  function rowBits(l) {
    var placeTxt = [optLabel("area", l.area) || l.area, l.town].filter(Boolean).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(", ");
    return {
      cover: l.cover && l.cover.thumb ? '<img class="st-thumb" src="' + esc(l.cover.thumb) + '" alt="" loading="lazy">' : '<span class="st-thumb st-thumb--ph" aria-hidden="true">' + I.image + "</span>",
      sub: [l.ref, placeTxt].filter(Boolean).join(" · "),
      pill: ls.bin ? '<span class="st-pill st-pill--bin">In the Bin</span>' : statusPill(l.status) + (l.hidden ? ' <span class="st-pill st-pill--hidden">Hidden</span>' : ""),
      src: l.source && l.source !== "manual" ? '<span class="st-src">' + esc(l.source) + "</span>" : "",
      rent: l.rentPcm != null ? money(l.rentPcm) + " pcm" : "",
      bb: [l.bedrooms != null ? l.bedrooms + " bed" : "", l.bathrooms ? l.bathrooms + " bath" : ""].filter(Boolean).join(" · "),
      tour: l.tour ? '<a class="st-pill st-pill--tour" href="#/listings/' + esc(encodeURIComponent(l.id)) + '/tour" aria-label="360° tour, ' + esc(l.tour.status || "") + '">360° ' + esc(l.tour.status === "live" ? "Live" : "Draft") + "</a>" : "",
      menu: '<div class="st-rowact"><button type="button" class="st-btn st-btn--sm st-btn--icon" data-menu="' + esc(l.id) + '" aria-haspopup="menu" aria-expanded="false" aria-label="Actions for ' + esc(l.title) + '">' + I.more + "</button></div>"
    };
  }
  function sortTh(label, key) { return '<th scope="col"><button type="button" data-sort="' + key + '"' + (ls.sort === key ? ' class="is-on" aria-sort="descending"' : "") + ">" + esc(label) + I.sort + "</button></th>"; }
  function tableHtml(rows) {
    return '<div class="st-tablewrap"><table class="st-table"><thead><tr><th scope="col"><span class="st-vh">Cover</span></th>' + sortTh("Listing", "title") + '<th scope="col">Status</th>' + sortTh("Rent", "rent") + '<th scope="col">Beds / baths</th><th scope="col">Media</th><th scope="col">Tour</th>' + sortTh("Updated", "updated") + '<th scope="col"><span class="st-vh">Actions</span></th></tr></thead><tbody>' +
      rows.map(function (l) {
        var b = rowBits(l);
        return '<tr data-id="' + esc(l.id) + '" tabindex="0"><td>' + b.cover + '</td><td><div class="st-title">' + esc(l.title) + b.src + '</div><div class="st-sub">' + esc(b.sub) + "</div></td><td>" + b.pill + '</td><td class="num">' + esc(b.rent) + "</td><td>" + esc(b.bb) + '</td><td class="num">' + (l.mediaCount || 0) + "</td><td>" + b.tour + '</td><td class="num"><time datetime="' + esc(l.updatedAt) + '">' + esc(rel(l.updatedAt)) + "</time></td><td>" + b.menu + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  function cardsHtml(rows) {
    return '<div class="st-cards">' + rows.map(function (l) {
      var b = rowBits(l);
      return '<article class="st-rcard" data-id="' + esc(l.id) + '" tabindex="0">' + b.cover + '<div style="min-width:0"><div class="st-title">' + esc(l.title) + b.src + '</div><div class="st-sub">' + esc(b.sub) + '</div><div class="st-rmeta">' + b.pill + (b.rent ? "<b>" + esc(b.rent) + "</b>" : "") + (b.bb ? "<span>" + esc(b.bb) + "</span>" : "") + "<span>" + plural(l.mediaCount || 0, "photo") + "</span>" + b.tour + "<span>" + esc(rel(l.updatedAt)) + "</span></div></div>" + b.menu + "</article>";
    }).join("") + "</div>";
  }
  function onListingsClick(e) {
    var sortBtn = e.target.closest("[data-sort]");
    if (sortBtn) { ls.sort = sortBtn.getAttribute("data-sort"); loadListings(); return; }
    var menuBtn = e.target.closest("[data-menu]");
    if (menuBtn) { e.stopPropagation(); toggleRowMenu(menuBtn); return; }
    var act = e.target.closest("[data-act]");
    if (act) { e.stopPropagation(); closeRowMenus(); rowAction(act.getAttribute("data-act"), act.getAttribute("data-id")); return; }
    var chip = e.target.closest("[data-status]");
    if (chip) { ls.status = ""; ls.bin = false; ls.q = ""; ls.area = ""; var q = $("#lsQ"); if (q) q.value = ""; var a = $("#lsArea"); if (a) a.value = ""; loadListings(); return; }
    if (e.target.closest("a,button,select,input,label")) return;
    var row = e.target.closest("[data-id]");
    if (row) go("#/listings/" + encodeURIComponent(row.getAttribute("data-id")));
  }
  function toggleRowMenu(btn) {
    var wrap = btn.parentNode, open = $(".st-rowmenu", wrap);
    closeRowMenus();
    if (open) return;
    var id = btn.getAttribute("data-menu"), l = lsRows.filter(function (x) { return x.id === id; })[0] || {}, owner = state.user && state.user.role === "owner";
    var b = function (act, label, cls) { return '<button type="button" role="menuitem"' + (cls ? ' class="' + cls + '"' : "") + ' data-act="' + act + '" data-id="' + esc(id) + '">' + label + "</button>"; };
    var items = [b("open", "Open")];
    if (ls.bin) { items.push(b("restore", "Restore")); if (owner) items.push("<hr>", b("delete", "Delete for good", "is-danger")); }
    else { items.push(b("duplicate", "Duplicate"), l.status === "draft" ? b("publish", "Advertise on the website") : b("unpublish", "Take off the website"), "<hr>", b("bin", "Move to the Bin", "is-danger")); }
    wrap.insertAdjacentHTML("beforeend", '<div class="st-rowmenu" role="menu">' + items.join("") + "</div>");
    btn.setAttribute("aria-expanded", "true");
    var first = $("button", $(".st-rowmenu", wrap)); if (first) first.focus();
  }
  function closeRowMenus() { $$(".st-rowmenu").forEach(function (m) { var b = $("[data-menu]", m.parentNode); if (b) b.setAttribute("aria-expanded", "false"); m.parentNode.removeChild(m); }); }
  function rowAction(act, id) {
    var l = lsRows.filter(function (x) { return x.id === id; })[0] || { title: id };
    if (act === "open") return go("#/listings/" + encodeURIComponent(id));
    if (act === "duplicate") return API.listings.duplicate(id).then(function (n) { state.listIndex = null; toast("Duplicated as a draft", { kind: "good" }); go("#/listings/" + encodeURIComponent(n.id)); }).catch(errToast);
    if (act === "publish") return API.listings.publish(id).then(function (res) {
      if (res.ok) { toast("Advertised on the website", { kind: "good" }); loadListings(); }
      else toast("Not ready — " + plural((res.problems || []).length, "thing") + " to sort first", { kind: "warn", action: { label: "Show me", run: function () { go("#/listings/" + encodeURIComponent(id) + "/publish"); } } });
    }).catch(errToast);
    if (act === "unpublish") return API.listings.unpublish(id).then(function () { toast("Taken off the website"); loadListings(); }).catch(errToast);
    if (act === "bin") return confirmModal({ title: "Move to the Bin?", body: "“" + l.title + "” comes off the website and out of the list. You can restore it from the Bin later.", confirm: "Move to the Bin" }).then(function (ok) { if (!ok) return; return API.listings.remove(id).then(function () { state.listIndex = null; toast("Moved to the Bin"); loadListings(); }); }).catch(errToast);
    if (act === "restore") return API.listings.restore(id).then(function () { state.listIndex = null; toast("Restored", { kind: "good" }); loadListings(); }).catch(errToast);
    if (act === "delete") return confirmModal({ title: "Delete for good?", body: "“" + l.title + "” and all of its photos will be deleted permanently. This cannot be undone.", confirm: "Delete for good", danger: true }).then(function (ok) { if (!ok) return; return API.listings.remove(id, true).then(function () { toast("Deleted for good"); loadListings(); }); }).catch(errToast);
  }

  /* ── new listing ─────────────────────────────────────────────────── */
  SCREENS.newListing = function () {
    setTop({ title: "New listing", back: "#/listings" });
    view.innerHTML = '<section class="st-card" style="max-width:680px"><div class="st-card-head"><div><h2>Start a new listing</h2><p>Just the basics now. Everything else is on the next screen and saves as you type.</p></div></div>' +
      '<form novalidate class="st-stack">' + fieldHtml({ label: "Title", name: "title", required: true, ph: "2 bed apartment, Ladywell Point, Salford", hint: "How it appears on the website and in search results." }) +
      '<div class="st-grid2">' + selectHtml({ label: "Property type", name: "type", list: "type" }) + selectHtml({ label: "Area", name: "area", list: "area" }) + "</div>" +
      '<div class="st-field"><label class="st-label" for="f_rentPcm">Rent, per calendar month</label><div class="st-money"><input class="st-in" id="f_rentPcm" name="rentPcm" type="number" inputmode="decimal" min="0" step="1"></div></div>' +
      '<div class="st-actions st-actions--end"><a class="st-btn" href="#/listings">Cancel</a><button type="submit" class="st-btn st-btn--fill">Create listing</button></div></form></section>';
    bindForm($("form", view), function (d) {
      if (!d.title.trim()) throw new Error("Give the listing a title");
      var body = { title: d.title.trim() };
      if (d.type) body.type = d.type;
      if (d.area) body.address = { area: d.area };
      if (d.rentPcm) body.rentPcm = Number(d.rentPcm);
      return API.listings.create(body).then(function (l) { state.listIndex = null; toast("Listing created — it saves as you go", { kind: "good" }); go("#/listings/" + encodeURIComponent(l.id)); });
    });
  };

  /* ── listing editor: load, autosave, tabs ────────────────────────── */
  var ed = null;
  var TABS = [["details", "Details"], ["home", "The home"], ["media", "Media"], ["tour", "360 Tour"], ["publish", "Publish"]];
  SCREENS.editor = function (id, tab) {
    tab = tab || "details";
    if (ed && ed.id === id && ed.doc) { ed.tab = tab; renderEditor(); return; }
    editorLeave();
    var E = ed = { id: id, base: null, doc: null, dirty: {}, timer: null, saving: false, again: false, tab: tab, notes: {}, savedAt: null, chipState: "saved", suggested: {}, aiCopy: null };
    setTop({ title: "Listing", back: "#/listings" });
    view.innerHTML = loading();
    API.listings.get(id).then(function (l) {
      if (ed !== E) return;
      E.base = l; E.doc = clone(l); if (!E.doc.home) E.doc.home = { bathrooms: [], receptions: [], kitchen: null, garden: null, driveway: null }; if (!E.doc.address) E.doc.address = {};
      renderEditor();
    }).catch(function (err) {
      if (ed !== E) return;
      if (err.status === 404) view.innerHTML = '<div class="st-empty"><h3>That listing does not exist</h3><p>It may have been deleted for good.</p><a class="st-btn" href="#/listings">Back to listings</a></div>';
      else showError(err);
    });
  };
  function editorLeave() {
    if (!ed) return;
    var E = ed; clearTimeout(E.timer); stopTourPoll();
    if (Object.keys(E.dirty).length && !E.saving) edSave(E);
    ed = null; topChip.innerHTML = "";
  }
  window.addEventListener("beforeunload", function (e) { if ((ed && (Object.keys(ed.dirty).length || ed.saving)) || (pg && (Object.keys(pg.dirty).length || pg.saving))) { e.preventDefault(); e.returnValue = ""; } });

  function chipMarkup(s, savedAt) {
    var txt, cls;
    if (s === "saving") { txt = "Saving…"; cls = "is-saving"; }
    else if (s === "dirty") { txt = "Not saved"; cls = "is-dirty"; }
    else if (s === "error") { txt = "Not saved"; cls = "is-error"; }
    else { txt = savedAt ? "Saved · " + rel(new Date(savedAt).toISOString()) : "Saved"; cls = "is-saved"; }
    return '<span class="st-chip ' + cls + '" role="status"><i aria-hidden="true"></i>' + esc(txt) + "</span>";
  }
  function chipHtml() { return ed ? chipMarkup(ed.chipState, ed.savedAt) : ""; }
  function setChip(s) { if (!ed) return; ed.chipState = s; topChip.innerHTML = chipHtml(); }
  setInterval(function () { if (ed && ed.chipState === "saved" && ed.savedAt) topChip.innerHTML = chipHtml(); else if (pg && pg.chipState === "saved" && pg.savedAt) topChip.innerHTML = pgChipHtml(); }, 30000);

  function edSet(path, v) { setPath(ed.doc, path, v); edMark(path.split(".")[0]); }
  function edMark(topKey) { ed.dirty[topKey] = true; setChip("dirty"); clearTimeout(ed.timer); var E = ed; ed.timer = setTimeout(function () { edSave(E); }, 900); }
  function edSave(E) {
    E = E || ed; if (!E || !E.base) return;
    clearTimeout(E.timer);
    if (E.saving) { E.again = true; return; }
    var patch = {};
    Object.keys(E.dirty).forEach(function (k) { if (!same(E.base[k], E.doc[k])) patch[k] = clone(E.doc[k]); else delete E.dirty[k]; });
    if (!Object.keys(patch).length) { if (ed === E) setChip("saved"); return; }
    patch.updatedAt = E.base.updatedAt;
    E.saving = true; if (ed === E) setChip("saving");
    var sent = clone(patch);
    API.listings.patch(E.id, patch).then(function (l) {
      E.saving = false;
      Object.keys(sent).forEach(function (k) { if (k !== "updatedAt" && same(E.doc[k], sent[k])) { delete E.dirty[k]; E.doc[k] = clone(l[k]); } });
      Object.keys(l).forEach(function (k) { if (!E.dirty[k]) E.doc[k] = clone(l[k]); });
      E.base = l; E.savedAt = Date.now(); state.listIndex = null;
      if (ed === E) { setChip(Object.keys(E.dirty).length ? "dirty" : "saved"); refreshHeader(); }
      if (E.again || Object.keys(E.dirty).length) { E.again = false; E.timer = setTimeout(function () { edSave(E); }, 500); }
    }).catch(function (err) {
      E.saving = false; E.again = false;
      if (ed === E) setChip("error");
      if (err.status === 409) toast("Someone else saved this listing — reload to see their changes", { kind: "warn", ttl: 20000, action: { label: "Reload", run: function () { if (ed === E) { ed = null; route(); } } } });
      else toast(err.message || "Could not save", { kind: "bad", action: { label: "Retry", run: function () { edSave(E); } } });
    });
  }
  function edAdopt(l) { var E = ed; E.base = l; var nd = clone(l); Object.keys(E.dirty).forEach(function (k) { nd[k] = E.doc[k]; }); E.doc = nd; state.listIndex = null; }

  function tabsHtml() {
    var d = ed.doc, probs = problemsOf(d);
    return '<nav class="st-tabs" aria-label="Listing sections">' + TABS.map(function (t) {
      var extra = t[0] === "media" ? ' <span class="st-badge">' + (d.media || []).length + "</span>" : (t[0] === "publish" && probs.length && d.status === "draft" ? ' <span class="st-tabwarn" role="img" aria-label="' + plural(probs.length, "thing") + ' to sort"></span>' : "");
      return '<a href="#/listings/' + esc(encodeURIComponent(ed.id)) + "/" + t[0] + '"' + (ed.tab === t[0] ? ' aria-current="page"' : "") + ">" + esc(t[1]) + extra + "</a>";
    }).join("") + "</nav>";
  }
  function headHtml() {
    var d = ed.doc;
    return '<div class="st-ehead">' + statusPill(d.status) + (d.hidden ? '<span class="st-pill st-pill--hidden">Hidden from the website</span>' : "") + (d.source && d.source !== "manual" ? '<span class="st-src" title="Read-only once the 10ninety feed is live">' + esc(d.source) + "</span>" : "") +
      '<span class="st-hint">Updated ' + esc(rel(d.updatedAt)) + "</span></div>";
  }
  function renderEditor() {
    var d = ed.doc;
    setTop({ title: d.title || "Untitled listing", sub: [d.ref, optLabel("area", d.address && d.address.area)].filter(Boolean).join(" · "), back: "#/listings", chip: chipHtml() });
    view.innerHTML = tabsHtml() + headHtml() + '<div id="edPanel"></div>';
    renderTab();
  }
  function refreshHeader() { var d = ed.doc; var h = $(".st-ehead", view); if (h) h.outerHTML = headHtml(); topSub.textContent = [d.ref, optLabel("area", d.address && d.address.area)].filter(Boolean).join(" · "); topSub.hidden = !topSub.textContent; refreshTabs(); }
  function refreshTabs() { var t = $(".st-tabs", view); if (t) t.outerHTML = tabsHtml(); }
  function renderTab() {
    var panel = $("#edPanel"); if (!panel) return;
    stopTourPoll();
    if (ed.tab === "details") panel.innerHTML = detailsHtml();
    else if (ed.tab === "home") panel.innerHTML = homeHtml();
    else if (ed.tab === "media") { panel.innerHTML = mediaHtml(); bindMedia(panel); }
    else if (ed.tab === "tour") renderTourTab(panel);
    else panel.innerHTML = publishHtml();
    applyWhen(panel);
  }

  /* form field builders bound to ed.doc paths */
  function when(o) { return o.when ? ' data-when="' + esc(o.when) + '"' : ""; }
  function hint(o) { return o.hint ? '<span class="st-hint">' + o.hint + "</span>" : ""; }
  function fld(o) {
    var id = "ed_" + o.k.replace(/\./g, "_"), v = getPath(ed.doc, o.k), input;
    if (o.type === "toggle") return '<div class="st-field ' + (o.cls || "") + '"' + when(o) + '><label class="st-toggle"><input type="checkbox" id="' + id + '" data-k="' + o.k + '" data-type="toggle"' + (v ? " checked" : "") + '><span class="st-tg" aria-hidden="true"></span><span>' + esc(o.label) + "</span></label>" + hint(o) + "</div>";
    if (o.type === "textarea") input = '<textarea class="st-ta' + (o.tall ? " st-ta--tall" : "") + '" id="' + id + '" data-k="' + o.k + '" data-type="' + (o.lines ? "lines" : "text") + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : "") + (o.rows ? ' rows="' + o.rows + '"' : "") + (o.max ? ' maxlength="' + o.max + '"' : "") + ">" + esc(o.lines ? (v || []).join("\n") : (v == null ? "" : v)) + "</textarea>";
    else if (o.type === "money") input = '<div class="st-money"><input class="st-in" id="' + id + '" data-k="' + o.k + '" data-type="number" type="number" inputmode="decimal" min="0" step="1" value="' + esc(v == null ? "" : v) + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : "") + "></div>";
    else input = '<input class="st-in" id="' + id + '" data-k="' + o.k + '" data-type="' + (o.type === "number" ? "number" : "text") + '" type="' + (o.type || "text") + '"' + (o.type === "number" ? ' inputmode="decimal" min="0"' : "") + ' value="' + esc(v == null ? "" : v) + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : "") + (o.max ? ' maxlength="' + o.max + '"' : "") + (o.auto ? ' autocomplete="' + o.auto + '"' : "") + ">";
    return '<div class="st-field ' + (o.cls || "") + '"' + when(o) + '><label class="st-label" for="' + id + '">' + esc(o.label) + (o.req ? ' <span class="st-req">required</span>' : "") + (o.optn ? ' <span class="st-opt">' + esc(o.optn) + "</span>" : "") + "</label>" + input + (o.after || "") + hint(o) + "</div>";
  }
  function sel(o) {
    var id = "ed_" + o.k.replace(/\./g, "_"), v = getPath(ed.doc, o.k), opts = o.options || optList(o.list);
    return '<div class="st-field ' + (o.cls || "") + '"' + when(o) + '><label class="st-label" for="' + id + '">' + esc(o.label) + (o.req ? ' <span class="st-req">required</span>' : "") + '</label><div class="st-select"><select id="' + id + '" data-k="' + o.k + '" data-type="' + (o.int ? "int" : "text") + '"><option value="">' + esc(o.empty || "— not stated —") + "</option>" +
      opts.map(function (op) { return '<option value="' + esc(op.value) + '"' + (v != null && String(v) === String(op.value) ? " selected" : "") + ">" + esc(op.label) + "</option>"; }).join("") + "</select></div>" + hint(o) + "</div>";
  }
  function applyWhen(root) {
    if (!ed || !ed.doc) return;
    $$("[data-when]", root).forEach(function (el) { var m = /^([\w.]+)=(.*)$/.exec(el.getAttribute("data-when")); if (!m) return; var v = getPath(ed.doc, m[1]); el.hidden = !(v != null && String(v) === m[2]); });
  }
  function featChips(arr) { return (arr || []).map(function (f) { return "<span>" + esc(f) + "</span>"; }).join(""); }
  function serpHtml() {
    var d = ed.doc, t = d.seoTitle || d.title || "Untitled listing", desc = d.seoDescription || d.summary || (d.description || "").split("\n")[0] || "";
    return '<div class="st-serp" id="edSerp" aria-label="Search result preview"><div class="u"><i aria-hidden="true">M</i><div>Megacity Properties<br><small>billydigitals.com › templates › megacity-let-' + esc(d.id) + '</small></div></div><div class="t">' + esc(t) + " | Megacity Properties</div><div class=\"d\">" + esc(desc || "Add a summary so search engines have something to show.") + "</div></div>";
  }
  function updateSerp() { var s = $("#edSerp"); if (s) s.outerHTML = serpHtml(); }

  /* ── Details tab ─────────────────────────────────────────────────── */
  function detailsHtml() {
    var d = ed.doc, nums = function (a, b) { var o = []; for (var i = a; i <= b; i++) o.push({ value: String(i), label: String(i) }); return o; };
    return '<section class="st-card"><div class="st-card-head"><h2>Basics</h2></div><div class="st-form">' +
      fld({ k: "title", label: "Title", req: true, ph: "2 bed apartment, Ladywell Point, Salford", cls: "c8" }) + fld({ k: "ref", label: "Reference", ph: "RL0140", cls: "c4", optn: "as in 10ninety" }) +
      fld({ k: "headline", label: "Headline", ph: "Two doubles a short walk from Ladywell Metrolink", hint: "One line under the title on the property page." }) +
      sel({ k: "type", label: "Property type", list: "type", req: true, cls: "c4" }) + sel({ k: "letType", label: "Let type", list: "letType", cls: "c4" }) + sel({ k: "furnishing", label: "Furnishing", list: "furnishing", cls: "c4" }) + "</div></section>" +
      '<section class="st-card"><div class="st-card-head"><h2>Rent and terms</h2></div><div class="st-form">' +
      fld({ k: "rentPcm", label: "Rent, per calendar month", type: "money", req: true, cls: "c4" }) + fld({ k: "deposit", label: "Deposit", type: "money", cls: "c4" }) + sel({ k: "bills", label: "Bills", list: "bills", cls: "c4" }) +
      fld({ k: "billsNote", label: "Which bills are included?", ph: "Water and broadband included; gas and electricity are metered", when: "bills=some" }) +
      sel({ k: "availability", label: "Availability", list: "availability", cls: "c4" }) + fld({ k: "availableFrom", label: "Available from", type: "date", cls: "c4", when: "availability=from_date" }) + sel({ k: "minTerm", label: "Minimum term", list: "minTerm", cls: "c4" }) + "</div></section>" +
      '<section class="st-card"><div class="st-card-head"><h2>The facts</h2></div><div class="st-form">' +
      sel({ k: "bedrooms", label: "Bedrooms", options: nums(0, 10), int: true, cls: "c3", hint: d.letType === "room" ? "For a room in a share this is the number of rooms being let, usually 1." : "" }) +
      sel({ k: "parkingSpaces", label: "Parking spaces", list: "parkingSpaces", int: true, cls: "c3" }) +
      sel({ k: "councilTaxBand", label: "Council tax band", list: "councilTaxBand", cls: "c3" }) + sel({ k: "epcRating", label: "EPC rating", list: "epcRating", cls: "c3" }) +
      fld({ k: "parkingNote", label: "Where to park", ph: "Free on-street parking on Pilgrims Way", when: "parkingSpaces=0", hint: "Shown because there is no allocated parking." }) +
      sel({ k: "pets", label: "Pets", list: "pets", cls: "c4" }) + fld({ k: "floorAreaSqft", label: "Floor area, sq ft", type: "number", cls: "c4" }) +
      fld({ k: "hmoLicensed", label: "HMO licensed", type: "toggle", cls: "c4" }) + "</div></section>" +
      '<section class="st-card"><div class="st-card-head"><div><h2>Address</h2><p>The street and area appear on the website; the full address stays in the office.</p></div></div><div class="st-form">' +
      fld({ k: "address.line1", label: "Address line 1", cls: "c6", auto: "off" }) + fld({ k: "address.line2", label: "Address line 2", cls: "c6", auto: "off" }) +
      fld({ k: "address.town", label: "Town", cls: "c4" }) + fld({ k: "address.postcode", label: "Postcode", cls: "c4" }) + sel({ k: "address.area", label: "Area", list: "area", req: true, cls: "c4" }) + "</div></section>" +
      '<section class="st-card"><div class="st-card-head"><h2>Words</h2></div><div class="st-form">' +
      fld({ k: "summary", label: "Summary", type: "textarea", rows: 3, ph: "One or two sentences for the listing card and search results.", after: '<span class="st-count' + ((d.summary || "").length > 200 ? " is-over" : "") + '" id="edSumCount">' + (d.summary || "").length + " / 200</span>" }) +
      fld({ k: "description", label: "Description", type: "textarea", tall: true, ph: "Paragraph one.\n\nParagraph two.", hint: "Leave a blank line between paragraphs — each one becomes a paragraph on the page." }) +
      fld({ k: "features", label: "Features", type: "textarea", lines: true, rows: 6, ph: "One per line", after: '<div class="st-fchips" id="edFeatChips">' + featChips(d.features) + "</div>" }) + "</div></section>" +
      aiCopyCardHtml() +
      '<details class="st-details" id="edSeo" style="margin-top:14px"><summary>Search preview</summary><div><div class="st-form">' +
      fld({ k: "seoTitle", label: "Search title", ph: d.title || "", max: 70, hint: "Leave blank to use the title." }) + fld({ k: "seoDescription", label: "Search description", type: "textarea", rows: 2, max: 160, ph: "Leave blank to use the summary." }) +
      "</div>" + serpHtml() + "</div></details>" +
      '<p class="st-note">Anything left blank is simply not shown on the property page.</p>';
  }

  /* ── The home tab ────────────────────────────────────────────────── */
  function optionsHtml(list, v) { return optList(list).map(function (o) { return '<option value="' + esc(o.value) + '"' + (v != null && String(v) === String(o.value) ? " selected" : "") + ">" + esc(o.label) + "</option>"; }).join(""); }
  function listSection(title, key, list, addLabel, note) {
    var rows = ed.doc.home[key] || [];
    return '<section class="st-card"><div class="st-card-head"><div><h2>' + esc(title) + "</h2>" + (note ? "<p>" + esc(note) + "</p>" : "") + '</div><span class="st-tag">' + rows.length + "</span></div>" +
      '<div class="st-hrows">' + (rows.length ? rows.map(function (r, i) {
        return '<div class="st-hrow"><div class="st-select"><label class="st-vh" for="ed_' + key + i + '">' + esc(title) + " " + (i + 1) + '</label><select id="ed_' + key + i + '" data-home="' + key + '" data-i="' + i + '">' + optionsHtml(list, r.subtype) + '</select></div><button type="button" class="st-btn st-btn--sm st-btn--icon" data-eact="rm-home" data-list="' + key + '" data-i="' + i + '" aria-label="Remove ' + esc(title.toLowerCase()) + " " + (i + 1) + '">' + I.x + "</button></div>";
      }).join("") : '<p class="st-hint">None added.</p>') + "</div>" +
      '<div class="st-actions" style="margin-top:12px"><button type="button" class="st-btn st-btn--sm" data-eact="add-home" data-list="' + key + '" data-opts="' + list + '">' + I.plus + esc(addLabel) + "</button></div></section>";
  }
  function singleSection(title, key, list, note) {
    var v = ed.doc.home[key] && ed.doc.home[key].subtype;
    return '<section class="st-card"><div class="st-card-head"><div><h2>' + esc(title) + "</h2>" + (note ? "<p>" + esc(note) + "</p>" : "") + '</div></div><div class="st-field" style="max-width:420px"><label class="st-vh" for="ed_home_' + key + '">' + esc(title) + '</label><div class="st-select"><select id="ed_home_' + key + '" data-home1="' + key + '"><option value="">— none —</option>' + optionsHtml(list, v) + "</select></div></div></section>";
  }
  function homeHtml() {
    var h = ed.doc.home || (ed.doc.home = { bathrooms: [], receptions: [], kitchen: null, garden: null, driveway: null });
    h.bathrooms = h.bathrooms || []; h.receptions = h.receptions || [];
    var beds = ed.doc.bedrooms;
    return '<section class="st-card"><div class="st-card-head"><div><h2>Bedrooms</h2><p>Counted in Details, so the rent, search filters and this page agree.</p></div></div><p><b style="font:700 24px/1 var(--ff-u);color:var(--navy)">' + (beds == null ? "—" : esc(beds)) + '</b> <span class="st-hint">' + (beds == null ? "not stated · " : (beds === 1 ? "bedroom · " : "bedrooms · ")) + '<a href="#/listings/' + esc(encodeURIComponent(ed.id)) + '/details">change in Details</a></span></p></section>' +
      listSection("Bathrooms", "bathrooms", "bathroom", "Add a bathroom", "One row per bathroom, shower room or WC. The count on the website comes from this list.") +
      listSection("Living spaces", "receptions", "reception", "Add a living space", "Lounges, dining rooms, conservatories — not bedrooms or kitchens.") +
      singleSection("Kitchen", "kitchen", "kitchen") + singleSection("Garden / outside", "garden", "garden") +
      '<section class="st-card"><div class="st-card-head"><div><h2>Driveway / parking</h2><p>Parking spaces is the same field as in Details.</p></div></div><div class="st-form">' +
      '<div class="st-field c6"><label class="st-label" for="ed_home_driveway">Driveway or garage</label><div class="st-select"><select id="ed_home_driveway" data-home1="driveway"><option value="">— none —</option>' + optionsHtml("driveway", h.driveway && h.driveway.subtype) + "</select></div></div>" +
      sel({ k: "parkingSpaces", label: "Parking spaces", list: "parkingSpaces", int: true, cls: "c6" }) +
      fld({ k: "parkingNote", label: "Where to park", ph: "Free on-street parking on Pilgrims Way", when: "parkingSpaces=0" }) + "</div></section>";
  }

  /* ── editor input handling (delegated on #view) ──────────────────── */
  function onEdInput(e) {
    if (!ed || !ed.doc) return;
    var t = e.target;
    if (t.hasAttribute("data-k")) {
      var k = t.getAttribute("data-k"), type = t.getAttribute("data-type") || "text", v;
      if (type === "toggle") v = !!t.checked;
      else if (type === "number") v = t.value === "" ? null : Number(t.value);
      else if (type === "int") v = t.value === "" ? null : parseInt(t.value, 10);
      else if (type === "lines") v = t.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
      else v = t.value === "" ? null : t.value;
      if (same(getPath(ed.doc, k), v)) return;
      edSet(k, v);
      if (k === "features") { var chips = $("#edFeatChips"); if (chips) chips.innerHTML = featChips(v); }
      if (k === "summary") { var c = $("#edSumCount"); if (c) { c.textContent = t.value.length + " / 200"; c.classList.toggle("is-over", t.value.length > 200); } }
      if (k === "title" || k === "seoTitle" || k === "seoDescription" || k === "summary" || k === "description") updateSerp();
      if (k === "title") topTitle.textContent = t.value || "Untitled listing";
      if (k === "parkingSpaces" || k === "bills" || k === "availability") applyWhen(view);
      if (k === "hidden" || k === "status") refreshHeader();
      return;
    }
    if (t.hasAttribute("data-home")) {
      if (e.type !== "change") return;
      var key = t.getAttribute("data-home"), i = +t.getAttribute("data-i");
      if (ed.doc.home[key] && ed.doc.home[key][i]) { ed.doc.home[key][i].subtype = t.value; edMark("home"); }
      return;
    }
    if (t.hasAttribute("data-home1")) {
      if (e.type !== "change") return;
      var k1 = t.getAttribute("data-home1");
      ed.doc.home[k1] = t.value ? { subtype: t.value } : null; edMark("home");
      if (k1 === "driveway" && t.value && !(ed.doc.parkingSpaces > 0)) {
        var n = t.value === "driveway_2" ? 2 : 1; edSet("parkingSpaces", n);
        var ps = $('[data-k="parkingSpaces"]', view); if (ps) ps.value = String(n); applyWhen(view);
        toast("Parking spaces set to " + n + " to match the driveway");
      }
      return;
    }
    if (t.hasAttribute("data-mfield") || t.hasAttribute("data-mother")) {
      var smid = t.getAttribute("data-mid") || t.getAttribute("data-mother");
      if (ed.suggested && ed.suggested[smid] && e.isTrusted) { delete ed.suggested[smid]; var sc = t.closest(".st-mcard"), sb = sc && $(".st-mbadge--ai", sc); if (sb) sb.parentNode.removeChild(sb); }
    }
    if (t.hasAttribute("data-mfield")) {
      var mid = t.getAttribute("data-mid"), f = t.getAttribute("data-mfield");
      if (f === "roomLabel") {
        var other = $('[data-mother="' + mid + '"]', view);
        if (t.value === "__other") { if (other) { other.hidden = false; other.focus(); } return; }
        if (other) other.hidden = true;
      }
      if (t.tagName === "SELECT" && e.type !== "change") return;
      mediaPatch(mid, f, t.value);
      return;
    }
    if (t.hasAttribute("data-mother")) { mediaPatch(t.getAttribute("data-mother"), "roomLabel", t.value.trim()); return; }
    if (t.hasAttribute("data-status")) {
      if (e.type !== "change") return;
      var E = ed, sv = t.value; t.disabled = true;
      API.listings.setStatus(E.id, sv).then(function (res) { if (ed !== E) return; edAdopt(res.listing || Object.assign({}, E.base, { status: sv })); toast("Status: " + (optLabel("status", sv) || sv), { kind: "good" }); renderEditor(); }).catch(function (err) { errToast(err); if (document.contains(t)) { t.disabled = false; t.value = E.doc.status; } });
    }
  }

  /* ── Media tab ───────────────────────────────────────────────────── */
  var MAX_BYTES = 60 * 1024 * 1024;
  var HEIC_MSG = "HEIC photos can't be read here. On iPhone: Settings → Camera → Formats → Most Compatible, or share it as JPEG.";
  function isHeic(file) { return /hei[cf]/i.test(file.type || "") || /\.hei[cf]$/i.test(file.name || ""); }
  function fileKind(file) {
    var t = (file.type || "").toLowerCase(), n = (file.name || "").toLowerCase();
    if (window.MCIntake && window.MCIntake.isImageFile ? window.MCIntake.isImageFile(file) : (/^image\//.test(t) || /\.(jpe?g|png|webp|gif|avif|heic|heif)$/.test(n))) return "image";
    if (t === "video/mp4" || t === "video/webm" || /\.(mp4|webm)$/.test(n)) return "video";
    if (t === "application/pdf" || /\.pdf$/.test(n)) return "pdf";
    return null;
  }
  function noteLabel(n) { var s = String(n || "").toLowerCase(); if (s.indexOf("dark") >= 0) return "Looks dark"; if (s.indexOf("soft") >= 0 || s.indexOf("blur") >= 0) return "Looks soft"; if (s.indexOf("low") >= 0 || s.indexOf("small") >= 0) return "Low resolution"; return String(n); }
  function roomChoices() {
    var out = [], beds = ed.doc.bedrooms;
    optList("tourRoom").forEach(function (o) {
      if (o.value === "other") return;
      if (o.value === "bedroom") { if (beds > 0) for (var i = 1; i <= beds; i++) out.push("Bedroom " + i); else out.push("Bedroom"); }
      else out.push(o.label);
    });
    return out;
  }
  function isOtherRoom(v) { return !!v && roomChoices().indexOf(v) < 0; }
  function roomOptions(v) {
    var ch = roomChoices(), other = isOtherRoom(v);
    return '<option value="">— not stated —</option>' + ch.map(function (c) { return '<option value="' + esc(c) + '"' + (c === v ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("") + '<option value="__other"' + (other ? " selected" : "") + ">Other…</option>";
  }
  function findMedia(E, mid) { return ((E && E.doc && E.doc.media) || []).filter(function (m) { return m.id === mid; })[0]; }
  function mediaCard(m, i) {
    var d = ed.doc, isCover = d.coverMediaId === m.id, count = (d.media || []).length, id = esc(m.id);
    var visual = isPhoto(m) ? '<img src="' + esc(m.thumb || m.url) + '" alt="' + esc(m.alt || "") + '" loading="lazy" draggable="false">' : '<div class="st-file">' + (m.kind === "video" ? I.film : I.doc) + "<span>" + esc(m.kind === "video" ? "Video" : "PDF") + "</span></div>";
    var badges = (isCover ? '<span class="st-mbadge st-mbadge--cover">Cover</span>' : (m.role && m.role !== "gallery" && m.role !== "cover" ? '<span class="st-mbadge">' + esc(optLabel("mediaRole", m.role)) + "</span>" : "")) + (m.isPano || m.kind === "pano" ? '<span class="st-mbadge st-mbadge--pano">360°</span>' : "") + (ed.suggested && ed.suggested[m.id] ? '<span class="st-mbadge st-mbadge--ai">AI suggested</span>' : "");
    var notes = (ed.notes[m.id] || []).map(function (n) { return '<span class="st-mnote" title="' + esc(n) + '">' + esc(noteLabel(n)) + "</span>"; }).join("");
    return '<article class="st-mcard' + (isCover ? " is-cover" : "") + '" draggable="true" data-mid="' + id + '" aria-label="' + esc(m.roomLabel || m.alt || "Item " + (i + 1)) + '">' +
      '<div class="st-mthumb">' + visual + '<div class="st-mbadges">' + badges + "</div>" + (notes ? '<div class="st-mnotes">' + notes + "</div>" : "") + "</div>" +
      '<div class="st-mbody">' +
      '<div class="st-field"><label class="st-label" for="mr_' + id + '">Room</label><div class="st-select"><select id="mr_' + id + '" data-mfield="roomLabel" data-mid="' + id + '">' + roomOptions(m.roomLabel) + "</select></div>" +
      '<input class="st-in" type="text" data-mother="' + id + '" placeholder="Which room?" value="' + esc(m.roomLabel || "") + '" aria-label="Room name"' + (isOtherRoom(m.roomLabel) ? "" : " hidden") + "></div>" +
      '<div class="st-field"><label class="st-label" for="ma_' + id + '">Alt text</label><input class="st-in" id="ma_' + id + '" type="text" data-mfield="alt" data-mid="' + id + '" value="' + esc(m.alt || "") + '" placeholder="Living room with corner sofa"></div>' +
      '<div class="st-field"><label class="st-label" for="mro_' + id + '">Use as</label><div class="st-select"><select id="mro_' + id + '" data-mfield="role" data-mid="' + id + '">' + optList("mediaRole").filter(function (o) { return o.value !== "cover"; }).map(function (o) { return '<option value="' + esc(o.value) + '"' + ((m.role === "cover" ? "gallery" : m.role) === o.value ? " selected" : "") + ">" + esc(o.label) + "</option>"; }).join("") + "</select></div></div>" +
      (aiOn() && isPhoto(m) ? '<div class="st-mai"><button type="button" class="st-btn st-btn--sm" data-mai="classify" data-mid="' + id + '">' + I.spark + 'What room is this?</button><button type="button" class="st-btn st-btn--sm" data-mai="alt" data-mid="' + id + '">Suggest alt text</button></div>' : "") +
      (m.isPano || m.kind === "pano" ? '<p class="st-mtour">360° panorama · <a href="#/listings/' + esc(encodeURIComponent(ed.id)) + '/tour">Add it to the tour</a></p>' : "") +
      '<div class="st-mactions">' +
      '<button type="button" class="st-btn st-btn--icon st-star' + (isCover ? " is-on" : "") + '" data-mact="cover" data-mid="' + id + '" aria-pressed="' + (isCover ? "true" : "false") + '" aria-label="' + (isCover ? "This is the cover photo" : "Use as the cover photo") + '"' + (isPhoto(m) ? "" : " disabled") + ">" + I.star + "</button>" +
      '<button type="button" class="st-btn st-btn--icon" data-mact="up" data-mid="' + id + '" aria-label="Move earlier"' + (i === 0 ? " disabled" : "") + ">" + I.up + "</button>" +
      '<button type="button" class="st-btn st-btn--icon" data-mact="down" data-mid="' + id + '" aria-label="Move later"' + (i === count - 1 ? " disabled" : "") + ">" + I.down + "</button>" +
      '<button type="button" class="st-btn st-btn--icon st-del" data-mact="delete" data-mid="' + id + '" aria-label="Delete">' + I.trash + "</button>" +
      "</div></div></article>";
  }
  function mediaHtml() {
    var m = ed.doc.media || [];
    return '<div class="st-drop" id="edDrop">' + I.upload + '<p><b>Drop photos here</b> or</p><label class="st-btn st-btn--fill">' + I.plus + 'Add photos<input type="file" id="edFile" accept="image/*,video/mp4,video/webm,application/pdf" multiple></label>' +
      '<p class="st-hint">JPEG, PNG or WebP photos, MP4 or WebM video and PDF floor plans or EPCs, up to 60 MB each. Photos are resized on this device before they upload, so it is quick even on the phone.</p></div>' +
      '<div class="st-uploads" id="edUploads"></div>' +
      (m.length ? '<p class="st-hint" style="margin-top:14px">' + plural(m.length, "item") + ' · drag to reorder, or use the arrows. The star sets the cover photo.</p><div class="st-media" id="edMedia">' + m.map(mediaCard).join("") + "</div>" : '<div class="st-empty" id="edMediaEmpty" style="margin-top:14px">' + I.image + "<h3>No photos yet</h3><p>Add at least one photo and choose a cover before advertising.</p></div>");
  }
  function renderMediaGrid() {
    var grid = $("#edMedia");
    if (grid) grid.innerHTML = (ed.doc.media || []).map(mediaCard).join("");
    else if (ed.tab === "media") renderTab();
    refreshTabs();
  }
  function bindMedia(panel) {
    var drop = $("#edDrop", panel), input = $("#edFile", panel);
    input.addEventListener("change", function () { addFiles(this.files); this.value = ""; });
    ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("is-over"); }); });
    ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("is-over"); }); });
    drop.addEventListener("drop", function (e) { if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });
    var grid = $("#edMedia", panel); if (!grid) return;
    var dragMid = null;
    grid.addEventListener("dragstart", function (e) { var c = e.target.closest(".st-mcard"); if (!c) return; dragMid = c.getAttribute("data-mid"); c.classList.add("is-drag"); if (e.dataTransfer) { e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", dragMid); } catch (x) { /* ie */ } } });
    grid.addEventListener("dragover", function (e) { var c = e.target.closest(".st-mcard"); if (!c || !dragMid) return; e.preventDefault(); $$(".st-mcard.is-over", grid).forEach(function (x) { if (x !== c) x.classList.remove("is-over"); }); c.classList.add("is-over"); });
    grid.addEventListener("dragleave", function (e) { var c = e.target.closest(".st-mcard"); if (c && !c.contains(e.relatedTarget)) c.classList.remove("is-over"); });
    grid.addEventListener("drop", function (e) { var c = e.target.closest(".st-mcard"); if (!c || !dragMid) return; e.preventDefault(); var to = c.getAttribute("data-mid"); c.classList.remove("is-over"); if (to !== dragMid) reorderMedia(dragMid, to); dragMid = null; });
    grid.addEventListener("dragend", function () { dragMid = null; $$(".st-mcard", grid).forEach(function (x) { x.classList.remove("is-drag", "is-over"); }); });
  }
  function reorderMedia(fromId, toId) {
    var E = ed, list = E.doc.media.slice(), from = list.findIndex(function (m) { return m.id === fromId; }), to = list.findIndex(function (m) { return m.id === toId; });
    if (from < 0 || to < 0) return;
    list.splice(to, 0, list.splice(from, 1)[0]);
    list.forEach(function (m, i) { m.sort = i; });
    E.doc.media = list; E.base.media = clone(list);
    renderMediaGrid();
    API.listings.orderMedia(E.id, list.map(function (m) { return m.id; })).catch(errToast);
  }
  var mpPending = {}, mpTimers = {};
  function mediaPatch(mid, field, value) {
    var E = ed, m = findMedia(E, mid); if (!m) return;
    m[field] = value;
    var b = ((E.base && E.base.media) || []).filter(function (x) { return x.id === mid; })[0]; if (b) b[field] = value;
    mpPending[mid] = mpPending[mid] || {}; mpPending[mid][field] = value;
    clearTimeout(mpTimers[mid]);
    mpTimers[mid] = setTimeout(function () { var p = mpPending[mid]; delete mpPending[mid]; API.media.patch(mid, p).catch(errToast); }, 500);
  }
  function mediaAction(act, mid) {
    var E = ed, m = findMedia(E, mid); if (!m) return;
    if (act === "cover") { if (E.doc.coverMediaId === mid) return; E.doc.coverMediaId = mid; edMark("coverMediaId"); edSave(E); renderMediaGrid(); toast("Cover photo set", { kind: "good" }); return; }
    if (act === "up" || act === "down") {
      var list = E.doc.media, i = list.indexOf(m), j = act === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= list.length) return;
      reorderMedia(mid, list[j].id);
      var btn = $('[data-mact="' + act + '"][data-mid="' + mid + '"]', view); if (btn && !btn.disabled) btn.focus();
      return;
    }
    if (act === "delete") {
      confirmModal({ title: "Delete this " + (m.kind === "video" ? "video" : m.kind === "pdf" ? "PDF" : "photo") + "?", body: "It is removed from the listing and from storage. This cannot be undone.", confirm: "Delete", danger: true }).then(function (ok) {
        if (!ok || ed !== E) return;
        return API.media.remove(mid).then(function () {
          E.doc.media = E.doc.media.filter(function (x) { return x.id !== mid; }); E.base.media = clone(E.doc.media);
          if (E.doc.coverMediaId === mid) { E.doc.coverMediaId = null; E.base.coverMediaId = null; }
          delete E.notes[mid];
          renderMediaGrid(); toast("Deleted");
        });
      }).catch(errToast);
    }
  }

  /* intake + upload pipeline */
  var fallbackIntake = {
    isImageFile: function (f) { return /^image\//.test(f.type || "") || /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i.test(f.name || ""); },
    imageAsync: function (file, opts) {
      opts = opts || {};
      return loadImage(file).then(function (img) {
        var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, maxEdge = opts.maxEdge || 1600;
        var scale = Math.min(1, maxEdge / Math.max(w, h)), ow = Math.max(1, Math.round(w * scale)), oh = Math.max(1, Math.round(h * scale));
        var c = document.createElement("canvas"); c.width = ow; c.height = oh; c.getContext("2d").drawImage(img, 0, 0, ow, oh);
        if (img.close) img.close();
        return { src: c.toDataURL("image/jpeg", opts.quality || 0.82), w: w, h: h, outW: ow, outH: oh, isPano: w / h >= 1.9, name: file.name, luma: null, sharp: null, hash: null, savedKB: null, notes: [] };
      });
    }
  };
  function loadImage(file) {
    if (window.createImageBitmap) return createImageBitmap(file, { imageOrientation: "from-image" }).catch(function () { return loadImageEl(file); });
    return loadImageEl(file);
  }
  function loadImageEl(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("decode")); };
      img.src = url;
    });
  }
  function intake() { return (window.MCIntake && window.MCIntake.imageAsync) ? window.MCIntake : fallbackIntake; }
  function intakeAll(file) {
    var IN = intake();
    return IN.imageAsync(file, { maxEdge: 1600, quality: 0.82 }).then(function (large) {
      return IN.imageAsync(file, { maxEdge: 480, quality: 0.75 }).then(function (thumb) {
        if (!large.isPano) return { large: large, thumb: thumb, pano: null };
        return IN.imageAsync(file, { maxEdge: 4096, panoEdge: 4096, quality: 0.86 }).then(function (pano) { return { large: large, thumb: thumb, pano: pano }; });
      });
    });
  }
  function dataUrlToBlob(u) {
    if (u instanceof Blob) return u;
    var m = /^data:([^;,]+)?((?:;[^,]*)*),(.*)$/.exec(u || "");
    if (!m) return new Blob([u || ""]);
    var mime = m[1] || "image/jpeg", isB64 = /;base64/.test(m[2] || ""), bin = isB64 ? atob(m[3]) : decodeURIComponent(m[3]);
    var arr = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }
  function photoForm(listingId, file, r, extra) {
    var fd = new FormData();
    var meta = { listingId: listingId, kind: r.large.isPano ? "pano" : "photo", role: (extra && extra.role) || "gallery", roomLabel: (extra && extra.roomLabel) || "", alt: (extra && extra.alt) || "", width: r.large.w, height: r.large.h, phash: r.large.hash || null, luma: r.large.luma == null ? null : r.large.luma, sharp: r.large.sharp == null ? null : r.large.sharp, isPano: !!r.large.isPano, filename: file.name };
    fd.append("meta", JSON.stringify(meta));
    fd.append("orig", file, file.name);
    fd.append("large", dataUrlToBlob(r.large.src), "large.jpg");
    fd.append("thumb", dataUrlToBlob(r.thumb.src), "thumb.jpg");
    if (r.pano) fd.append("pano", dataUrlToBlob(r.pano.src), "pano.jpg");
    return fd;
  }
  function uploadRow(name) {
    var box = $("#edUploads"), el = document.createElement("div");
    el.className = "st-upl"; el.innerHTML = "<b>" + esc(name) + '</b><span class="st-upl-s">Queued</span><div class="st-progress"><i></i></div>';
    if (box) box.appendChild(el);
    var s = $(".st-upl-s", el), bar = $(".st-progress i", el);
    return {
      status: function (t) { s.textContent = t; },
      progress: function (f) { bar.style.setProperty("--w", Math.round(f * 100) + "%"); s.textContent = "Uploading… " + Math.round(f * 100) + "%"; },
      done: function () { el.classList.add("is-done"); $(".st-progress", el).classList.add("is-done"); bar.style.setProperty("--w", "100%"); s.textContent = "Done"; setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1800); },
      fail: function (msg) { el.classList.add("is-error"); s.textContent = msg; $(".st-progress", el).hidden = true; el.insertAdjacentHTML("beforeend", '<button type="button" class="st-btn st-btn--sm" data-dismiss style="grid-column:1/-1;justify-self:start">Dismiss</button>'); }
    };
  }
  function addFiles(files) { var E = ed; if (!E) return; Array.prototype.slice.call(files || []).forEach(function (f) { uploadOne(E, f); }); }
  function uploadOne(E, file) {
    var row = uploadRow(file.name);
    if (file.size > MAX_BYTES) { row.fail("Over 60 MB — trim the video or export a smaller file, then try again."); return; }
    if (isHeic(file)) { row.fail(HEIC_MSG); return; }
    var kind = fileKind(file);
    if (!kind) { row.fail("This kind of file is not supported. Photos, MP4 or WebM video and PDF only."); return; }
    var p;
    if (kind === "image") {
      row.status("Preparing…");
      p = intakeAll(file).then(function (r) {
        row.status("Uploading…");
        return API.media.upload(photoForm(E.id, file, r), row.progress).then(function (m) { E.notes[m.id] = r.large.notes || []; return m; });
      }, function (e) { throw new Error(isHeic(file) ? HEIC_MSG : ((e && e.message) || "Could not read this image. Try exporting it as a JPEG.")); });
    } else {
      row.status("Uploading…");
      p = API.media.stream(file, { listingId: E.id, kind: kind, role: kind === "pdf" ? "floorplan" : "gallery", filename: file.name }, row.progress);
    }
    p.then(function (m) {
      row.done();
      if (ed !== E) return;
      E.doc.media = (E.doc.media || []).concat([m]); E.base.media = clone(E.doc.media);
      if (!E.doc.coverMediaId && isPhoto(m)) { E.doc.coverMediaId = m.id; edMark("coverMediaId"); edSave(E); }
      renderMediaGrid();
    }).catch(function (err) { row.fail(err && err.message || "Upload failed"); });
  }

  /* ── Publish tab ─────────────────────────────────────────────────── */
  function checklist(l) {
    var media = l.media || [], out = [];
    out.push(["A title", !!(l.title && String(l.title).trim())]);
    out.push(["A property type", !!l.type]);
    out.push(["The monthly rent", l.rentPcm > 0]);
    out.push(["The area", !!(l.address && l.address.area)]);
    if (l.letType !== "room") out.push(["The number of bedrooms", l.bedrooms != null && l.bedrooms !== ""]);
    out.push(["At least one photo", media.some(isPhoto)]);
    out.push(["A cover photo", !!l.coverMediaId && media.some(function (m) { return m.id === l.coverMediaId; })]);
    return out;
  }
  function problemsOf(l) { return checklist(l).filter(function (c) { return !c[1]; }).map(function (c) { return c[0]; }); }
  function publishHtml() {
    var d = ed.doc, checks = checklist(d), missing = checks.filter(function (c) { return !c[1]; }).length, live = d.status !== "draft";
    return '<section class="st-card"><div class="st-card-head"><div><h2>' + (live ? "What the website needs" : "Ready to advertise?") + "</h2><p>" + (missing ? plural(missing, "thing") + " to sort before it can go on the website." : "Everything the website needs is here.") + '</p></div></div><ul class="st-check">' +
      checks.map(function (c) { return '<li class="' + (c[1] ? "is-ok" : "is-todo") + '"><i aria-hidden="true">' + (c[1] ? I.check : "") + "</i>" + esc(c[0]) + "</li>"; }).join("") + '</ul><ul class="st-problems" id="edProblems" hidden></ul>' +
      (live ? "" : '<div class="st-actions" style="margin-top:18px"><button type="button" class="st-btn st-btn--fill st-btn--lg" data-eact="publish">' + I.eye + "Advertise on the website</button></div>") + "</section>" +
      (live ? '<section class="st-card"><div class="st-card-head"><div><h2>On the website</h2><p>Advertised ' + esc(d.publishedAt ? rel(d.publishedAt) : "") + ".</p></div>" + statusPill(d.status) + '</div><div class="st-live">' +
        '<a class="st-btn" href="/templates/megacity-let-' + esc(encodeURIComponent(d.id)) + '" target="_blank" rel="noopener">' + I.eye + 'View on the website</a><span class="st-tag">Link goes live in the next release</span></div>' +
        '<div class="st-form" style="margin-top:16px"><div class="st-field c6"><label class="st-label" for="edStatus">Status</label><div class="st-select"><select id="edStatus" data-status>' + optList("status").filter(function (o) { return o.value !== "draft"; }).map(function (o) { return '<option value="' + esc(o.value) + '"' + (o.value === d.status ? " selected" : "") + ">" + esc(o.label) + "</option>"; }).join("") + "</select></div></div>" +
        '<div class="st-field c6" style="justify-content:flex-end"><button type="button" class="st-btn" data-eact="unpublish">Take off the website</button></div></div></section>' : "") +
      '<section class="st-card"><div class="st-card-head"><div><h2>Visibility</h2><p>Hide the listing without taking it off — handy while the photos are being redone.</p></div></div>' + fld({ k: "hidden", label: "Hidden from the website", type: "toggle" }) + "</section>" + shareKitCardHtml();
  }
  function editorAction(act, btn) {
    var E = ed; if (!E) return;
    if (act === "add-home") {
      var key = btn.getAttribute("data-list"), first = optList(btn.getAttribute("data-opts"))[0];
      E.doc.home[key] = (E.doc.home[key] || []).concat([{ subtype: first ? first.value : "" }]); edMark("home"); renderTab();
      var last = $$('[data-home="' + key + '"]', view).pop(); if (last) last.focus();
      return;
    }
    if (act === "rm-home") { var k = btn.getAttribute("data-list"), i = +btn.getAttribute("data-i"); E.doc.home[k].splice(i, 1); edMark("home"); renderTab(); return; }
    if (act === "publish") {
      btn.disabled = true; clearTimeout(E.timer);
      var ready = Object.keys(E.dirty).length ? new Promise(function (res) { edSave(E); var t = setInterval(function () { if (!E.saving) { clearInterval(t); res(); } }, 100); }) : Promise.resolve();
      ready.then(function () { return API.listings.publish(E.id); }).then(function (res) {
        if (ed !== E) return;
        if (res.ok) { edAdopt(res.listing); toast("Advertised on the website", { kind: "good" }); renderEditor(); }
        else { var pl = $("#edProblems"); if (pl) { pl.hidden = false; pl.innerHTML = (res.problems || []).map(function (p) { return "<li>" + esc(p) + "</li>"; }).join(""); } btn.disabled = false; }
      }).catch(function (err) { errToast(err); btn.disabled = false; });
      return;
    }
    if (act === "unpublish") {
      confirmModal({ title: "Take it off the website?", body: "It goes back to a draft. Nothing is deleted and you can advertise it again any time.", confirm: "Take off the website" }).then(function (ok) {
        if (!ok || ed !== E) return;
        return API.listings.unpublish(E.id).then(function (res) { if (ed !== E) return; edAdopt(res.listing || Object.assign({}, E.base, { status: "draft" })); toast("Taken off the website"); renderEditor(); });
      }).catch(errToast);
    }
  }

  /* ── settings ────────────────────────────────────────────────────── */
  var SECTIONS = [["branding", "Branding", "cog"], ["notifications", "Notifications", "bell"], ["links", "10ninety links", "link"], ["integrations", "Integrations", "plug"], ["data", "Data", "db"], ["account", "Account", "person"]];
  SCREENS.settings = function (section) {
    if (section === "integrations") { go("#/integrations"); return; }
    section = SECTIONS.some(function (s) { return s[0] === section; }) ? section : "branding";
    setTop({ title: "Settings" });
    view.innerHTML = '<div class="st-settings"><nav class="st-subnav" aria-label="Settings sections">' + SECTIONS.map(function (s) { return '<a href="' + (s[0] === "integrations" ? "#/integrations" : "#/settings/" + s[0]) + '"' + (s[0] === section ? ' aria-current="page"' : "") + ">" + I[s[2]] + esc(s[1]) + "</a>"; }).join("") + '</nav><div id="setBody">' + loading() + "</div></div>";
    var body = $("#setBody");
    if (section === "account") { body.innerHTML = accountHtml(); bindAccount(body); return; }
    if (section === "data") { body.innerHTML = dataHtml(); return; }
    API.settings.get().then(function (res) {
      var s = res.settings || {};
      body.innerHTML = section === "branding" ? brandingHtml(s) : section === "notifications" ? notifyHtml(s) : linksHtml(s);
      var form = $("form", body); if (form) bindSettingsForm(form, section);
    }).catch(function (err) { body.innerHTML = errorHtml(err); });
  };
  SCREENS.account = function () { go("#/settings/account"); };
  function brandingHtml(s) {
    var b = s.brand || {};
    return '<section class="st-card"><div class="st-card-head"><div><h2>Branding</h2><p>Shown in the website header, footer and on every enquiry email.</p></div></div><form novalidate class="st-form">' +
      wrap(fieldHtml({ label: "Business name", name: "brand.name", value: b.name || "", auto: "organization" }), "c6") + wrap(fieldHtml({ label: "Phone", name: "brand.phone", type: "tel", value: b.phone || "", auto: "tel", inputmode: "tel" }), "c6") +
      wrap(fieldHtml({ label: "WhatsApp number", name: "brand.whatsapp", type: "tel", value: b.whatsapp || "", inputmode: "tel", hint: "With the country code, e.g. 44 7… — leave blank to hide the WhatsApp button." }), "c6") + wrap(fieldHtml({ label: "Email address", name: "brand.email", type: "email", value: b.email || "", inputmode: "email" }), "c6") +
      '<div class="st-field"><label class="st-label" for="f_brand_address">Office address</label><textarea class="st-ta" id="f_brand_address" name="brand.address" rows="2">' + esc(b.address || "") + "</textarea></div>" +
      '<div class="st-actions st-actions--end"><button type="submit" class="st-btn st-btn--fill">Save changes</button></div></form></section>';
  }
  function notifyHtml(s) {
    var owner = state.user && state.user.role === "owner", list = s.notifyEmails || [];
    return '<section class="st-card"><div class="st-card-head"><div><h2>Notifications</h2><p>Who gets an email when an enquiry, viewing request or maintenance report comes in.</p></div></div>' +
      (owner ? '<form novalidate class="st-stack"><div class="st-field"><label class="st-label" for="f_notify">Email addresses <span class="st-opt">one per line</span></label><textarea class="st-ta" id="f_notify" name="notifyEmails" rows="4" placeholder="info@megacityproperties.co.uk">' + esc(list.join("\n")) + '</textarea></div><div class="st-actions st-actions--end"><button type="submit" class="st-btn st-btn--fill">Save changes</button></div></form>' :
        '<ul class="st-check">' + (list.length ? list.map(function (e) { return '<li class="is-ok"><i aria-hidden="true">' + I.check + "</i>" + esc(e) + "</li>"; }).join("") : "<li>No addresses set yet.</li>") + '</ul><p class="st-note">Only the owner can change who is notified.</p>') + "</section>";
  }
  function linksHtml(s) {
    var l = s.links10ninety || {};
    return '<section class="st-card"><div class="st-card-head"><div><h2>10ninety links</h2><p>The website sends tenants and landlords to these 10ninety pages. Only the web addresses are kept here — 10ninety credentials are never stored in the Studio.</p></div></div><form novalidate class="st-form">' +
      wrap(fieldHtml({ label: "Maintenance portal", name: "links10ninety.maintenance", type: "url", value: l.maintenance || "", ph: "https://…", inputmode: "url" }), "c6") + wrap(fieldHtml({ label: "Apply for a property", name: "links10ninety.apply", type: "url", value: l.apply || "", ph: "https://…", inputmode: "url" }), "c6") +
      wrap(fieldHtml({ label: "Tenant registration", name: "links10ninety.registerTenant", type: "url", value: l.registerTenant || "", ph: "https://…", inputmode: "url" }), "c6") + wrap(fieldHtml({ label: "Landlord registration", name: "links10ninety.registerLandlord", type: "url", value: l.registerLandlord || "", ph: "https://…", inputmode: "url" }), "c6") +
      '<div class="st-actions st-actions--end"><button type="submit" class="st-btn st-btn--fill">Save changes</button></div></form></section>';
  }
  function wrap(html, cls) { return html.replace('class="st-field"', 'class="st-field ' + cls + '"'); }
  function dataHtml() {
    return '<section class="st-card"><div class="st-card-head"><div><h2>Import the current listings</h2><p>Brings in the five listings and their photos from the hand-built pages. Listings that already have photos are skipped unless you say otherwise, so it is safe to run again.</p></div></div><button type="button" class="st-btn st-btn--fill" data-import>' + I.upload + "Import the current listings</button></section>" +
      '<section class="st-card"><div class="st-card-head"><div><h2>Bin</h2><p>Listings you have moved to the Bin. Restore them, or the owner can delete them for good.</p></div></div><a class="st-btn" href="#/listings?status=bin">' + I.trash + "Open the Bin</a></section>";
  }
  function bindSettingsForm(form, section) {
    bindForm(form, function (d) {
      var partial = {};
      if (section === "notifications") {
        var emails = String(d.notifyEmails || "").split(/[\n,;]+/).map(function (s) { return s.trim(); }).filter(Boolean);
        var bad = emails.filter(function (e) { return !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); });
        if (bad.length) throw new Error("This does not look like an email address: " + bad[0]);
        partial.notifyEmails = emails;
      } else {
        Object.keys(d).forEach(function (k) { setPath(partial, k, String(d[k]).trim()); });
        if (section === "links") Object.keys(partial.links10ninety || {}).forEach(function (k) { var v = partial.links10ninety[k]; if (v && !/^https?:\/\//i.test(v)) throw new Error("Web addresses need to start with https://"); });
      }
      return API.settings.put(partial).then(function () { toast("Saved", { kind: "good" }); });
    });
  }
  function accountHtml() {
    var u = state.user || {};
    return '<section class="st-card"><div class="st-card-head"><div><h2>Your account</h2></div></div><dl class="st-kv"><dt>Name</dt><dd>' + esc(u.name) + "</dd><dt>Email</dt><dd>" + esc(u.email) + "</dd><dt>Role</dt><dd>" + esc(u.role) + "</dd></dl></section>" +
      '<section class="st-card"><div class="st-card-head"><div><h2>Change password</h2><p>At least 10 characters. You stay signed in on this device.</p></div></div><form novalidate class="st-stack" style="max-width:440px">' +
      fieldHtml({ label: "Current password", name: "current", type: "password", auto: "current-password", required: true }) +
      fieldHtml({ label: "New password", name: "next", type: "password", auto: "new-password", required: true, pw: true }) +
      fieldHtml({ label: "New password again", name: "next2", type: "password", auto: "new-password", required: true }) +
      '<div class="st-actions st-actions--end"><button type="submit" class="st-btn st-btn--fill">Change password</button></div></form></section>';
  }
  function bindAccount(body) {
    bindForm($("form", body), function (d, form) {
      if (!d.current) throw new Error("Enter your current password");
      checkPasswords(d.next, d.next2);
      return API.auth.changePassword(d.current, d.next).then(function () { form.reset(); toast("Password changed", { kind: "good" }); });
    });
  }

  /* ── team ────────────────────────────────────────────────────────── */
  SCREENS.team = function () {
    setTop({ title: "Team" });
    view.innerHTML = loading();
    API.team.list().then(renderTeam).catch(showError);
  };
  function personHtml(u, owner) {
    var me = state.user && state.user.id === u.id;
    return '<div class="st-person' + (u.disabled ? " is-off" : "") + '"><span class="st-avatar" aria-hidden="true">' + esc(initials(u.name)) + '</span><div style="min-width:0"><b>' + esc(u.name || u.email) + (me ? ' <span class="st-tag" style="min-height:20px;font-size:11px;margin-left:4px">you</span>' : "") + (u.disabled ? ' <span class="st-pill st-pill--withdrawn" style="margin-left:4px">Access off</span>' : "") + "</b><small>" + esc(u.email) + " · " + (u.lastLoginAt ? "signed in " + esc(rel(u.lastLoginAt)) : "never signed in") + "</small></div>" +
      '<div class="st-actions">' + (owner && !me ?
        '<div class="st-select"><label class="st-vh" for="tr_' + esc(u.id) + '">Role for ' + esc(u.name) + '</label><select id="tr_' + esc(u.id) + '" data-team-role="' + esc(u.id) + '"><option value="staff"' + (u.role === "staff" ? " selected" : "") + '>Staff</option><option value="owner"' + (u.role === "owner" ? " selected" : "") + '>Owner</option></select></div>' +
        '<button type="button" class="st-btn st-btn--sm' + (u.disabled ? "" : " st-btn--danger") + '" data-team-toggle="' + esc(u.id) + '" data-disabled="' + (u.disabled ? "1" : "0") + '">' + (u.disabled ? "Switch access on" : "Switch access off") + "</button>" :
        '<span class="st-tag">' + esc(u.role) + "</span>") + "</div></div>";
  }
  function inviteHtml(inv, owner) {
    var expired = inv.expiresAt && new Date(inv.expiresAt).getTime() < Date.now();
    return '<div class="st-person"><span class="st-avatar" aria-hidden="true" style="background:var(--sky-soft);color:var(--blue-deep)">' + I.bell + '</span><div style="min-width:0"><b>' + esc(inv.email) + "</b><small>" + esc(inv.role) + " · " + (expired ? "link expired" : "expires " + esc(fmtDate(inv.expiresAt))) + '</small></div><div class="st-actions">' + (owner ? '<button type="button" class="st-btn st-btn--sm" data-resend="' + esc(inv.email) + '">Resend</button>' : "") + "</div></div>";
  }
  function renderTeam(res) {
    var owner = state.user && state.user.role === "owner", users = res.users || [], invites = res.invites || [];
    view.innerHTML = '<div class="st-grid2"><div class="st-stack"><section class="st-card"><div class="st-card-head"><div><h2>People</h2><p>' + (owner ? "Owners can change roles and switch access off. The last owner cannot be removed." : "Only the owner can change roles or access.") + '</p></div></div><div class="st-team">' + users.map(function (u) { return personHtml(u, owner); }).join("") + "</div></section>" +
      '<section class="st-card"><div class="st-card-head"><div><h2>Invitations</h2><p>Links work for 48 hours and once only.</p></div></div>' + (invites.length ? '<div class="st-team">' + invites.map(function (i) { return inviteHtml(i, owner); }).join("") + "</div>" : '<p class="st-hint">No open invitations.</p>') + "</section></div>" +
      (owner ? '<section class="st-card"><div class="st-card-head"><div><h2>Invite someone</h2><p>They get an email with a link to set their own password.</p></div></div><form novalidate class="st-stack" id="inviteForm">' +
        fieldHtml({ label: "Email address", name: "email", type: "email", required: true, inputmode: "email", auto: "off" }) +
        selectHtml({ label: "Role", name: "role", noEmpty: true, value: "staff", options: [{ value: "staff", label: "Staff — listings, media and settings" }, { value: "owner", label: "Owner — everything, including the team" }] }) +
        '<button type="submit" class="st-btn st-btn--fill">Send invitation</button></form></section>' : "") + "</div>";
    var form = $("#inviteForm", view);
    if (form) bindForm(form, function (d) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email.trim())) throw new Error("Enter a valid email address");
      return API.team.invite(d.email.trim(), d.role).then(function () { toast("Invitation sent to " + d.email.trim(), { kind: "good" }); SCREENS.team(); });
    });
  }
  function teamAction(e) {
    var t = e.target, id;
    if (e.type === "change" && t.hasAttribute("data-team-role")) {
      id = t.getAttribute("data-team-role"); t.disabled = true;
      API.team.update(id, { role: t.value }).then(function () { toast("Role changed", { kind: "good" }); SCREENS.team(); }).catch(function (err) { errToast(err); SCREENS.team(); });
      return true;
    }
    if (e.type === "click" && t.closest("[data-team-toggle]")) {
      var b = t.closest("[data-team-toggle]"); id = b.getAttribute("data-team-toggle");
      var turningOff = b.getAttribute("data-disabled") === "0";
      var p = turningOff ? confirmModal({ title: "Switch access off?", body: "They will be signed out and cannot sign in again until you switch access back on.", confirm: "Switch access off", danger: true }) : Promise.resolve(true);
      p.then(function (ok) { if (!ok) return; return API.team.update(id, { disabled: turningOff }).then(function () { toast(turningOff ? "Access switched off" : "Access switched on", { kind: "good" }); SCREENS.team(); }); }).catch(errToast);
      return true;
    }
    if (e.type === "click" && t.closest("[data-resend]")) {
      var r = t.closest("[data-resend]"); r.disabled = true;
      API.team.resendInvite(r.getAttribute("data-resend")).then(function () { toast("Invitation sent again", { kind: "good" }); }).catch(errToast).then(function () { r.disabled = false; });
      return true;
    }
    return false;
  }

  /* ── import the five hand-built listings ─────────────────────────── */
  function runImport() {
    openModal('<h2 id="modalTitle">Import the current listings</h2><div class="st-modal-body"><p>Reading the seed and checking what is already here…</p></div>', { noEsc: true });
    var listings, existing;
    API.seed.get().then(function (seed) {
      listings = (seed && seed.listings) || [];
      if (!listings.length) throw new Error("The seed file has no listings in it.");
      return Promise.all(listings.map(function (l) { return API.listings.get(l.id).then(function (x) { return x; }, function (err) { if (err.status === 404) return null; throw err; }); }));
    }).then(function (ex) {
      existing = ex;
      var withMedia = existing.filter(function (x) { return x && (x.media || []).length; });
      var skip = {};
      if (!withMedia.length) return importRun(listings, skip);
      return confirmModal({ title: plural(withMedia.length, "listing already has photos", "listings already have photos"), html: "<p>" + withMedia.map(function (x) { return "<b>" + esc(x.title) + "</b> (" + plural((x.media || []).length, "photo") + ")"; }).join(", ") + ".</p><p>Skipping them is the safe choice. Importing again adds a second copy of every photo.</p>", cancel: "Skip them", confirm: "Import their photos again" }).then(function (again) {
        if (!again) withMedia.forEach(function (x) { skip[x.id] = true; });
        return importRun(listings, skip);
      });
    }).catch(function (err) {
      openModal('<h2 id="modalTitle">Import could not start</h2><div class="st-modal-body"><p>' + esc(err && err.message || "Something went wrong.") + '</p></div><div class="st-modal-foot"><button type="button" class="st-btn st-btn--fill" data-modal="cancel">Close</button></div>');
    });
  }
  function importRun(listings, skip) {
    var total = listings.reduce(function (n, l) { return n + (skip[l.id] ? 0 : 1 + (l.media || []).length); }, 0), done = 0;
    var sum = { listings: 0, photos: 0, skipped: 0, failed: 0 };
    openModal('<h2 id="modalTitle">Importing…</h2><div class="st-modal-body"><div class="st-imp-head" id="impHead"><b>Starting</b><span></span></div><div class="st-progress" id="impBar"><i></i></div><ul class="st-log" id="impLog" aria-live="polite"></ul></div><div class="st-modal-foot"><button type="button" class="st-btn st-btn--fill" data-modal="ok" id="impClose" disabled>Close</button></div>', { wide: true, noEsc: true });
    var log = $("#impLog"), bar = $("#impBar i"), head = $("#impHead");
    function tick(msg, cls) { log.insertAdjacentHTML("beforeend", '<li class="' + (cls || "") + '">' + esc(msg) + "</li>"); log.scrollTop = log.scrollHeight; bar.style.setProperty("--w", Math.round(100 * done / Math.max(total, 1)) + "%"); }
    function setHead(a, b) { head.innerHTML = "<b>" + esc(a) + "</b><span>" + esc(b || "") + "</span>"; }
    var chain = Promise.resolve();
    listings.forEach(function (l, li) {
      chain = chain.then(function () {
        if (skip[l.id]) { sum.skipped++; tick("Skipped " + l.title + " — already has photos", "is-skip"); return; }
        var media = l.media || [], body = Object.assign({}, l); delete body.media;
        setHead(l.title, "Listing " + (li + 1) + " of " + listings.length);
        return API.listings.importLegacy([body]).then(function () {
          done++; sum.listings++; tick("Imported " + l.title, "is-ok");
          var coverId = null, mchain = Promise.resolve();
          media.forEach(function (m, mi) {
            mchain = mchain.then(function () {
              var name = String(m.src || "").split("/").pop();
              setHead(l.title, "Photo " + (mi + 1) + " of " + media.length);
              return fetch("/templates/" + m.src, { credentials: "same-origin" }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.blob(); })
                .then(function (blob) { var file = new File([blob], name, { type: blob.type || "image/jpeg" }); return importUpload(l.id, file, m); })
                .then(function (med) { done++; sum.photos++; if (m.role === "cover" && !coverId) coverId = med.id; tick("  ↳ " + name + (m.roomLabel ? " · " + m.roomLabel : ""), "is-ok"); })
                .catch(function (e) { done++; sum.failed++; tick("  ↳ " + name + " failed: " + (e && e.message || "unknown"), "is-bad"); });
            });
          });
          return mchain.then(function () {
            if (!coverId) return;
            return API.listings.get(l.id).then(function (cur) { return API.listings.patch(l.id, { coverMediaId: coverId, updatedAt: cur.updatedAt }); }).then(function () { tick("  ↳ cover photo set", "is-ok"); }, function (e) { tick("  ↳ could not set the cover: " + e.message, "is-bad"); });
          });
        }).catch(function (e) { done++; sum.failed++; tick(l.title + " failed: " + (e && e.message || "unknown"), "is-bad"); });
      });
    });
    return chain.then(function () {
      setHead("Finished", "");
      $("#modalTitle").textContent = "Import finished";
      tick("Done — " + plural(sum.listings, "listing") + ", " + plural(sum.photos, "photo") + (sum.skipped ? ", " + sum.skipped + " skipped" : "") + (sum.failed ? ", " + sum.failed + " failed" : ""), sum.failed ? "is-bad" : "is-ok");
      state.listIndex = null;
      var close = $("#impClose"); close.disabled = false; close.focus();
      modalResolve = function () { if (state.route && (state.route.name === "dashboard" || state.route.name === "listings")) route(); };
    });
  }
  function importUpload(listingId, file, m) {
    if (m.kind === "video" || m.kind === "pdf") return API.media.stream(file, { listingId: listingId, kind: m.kind, role: m.role || "gallery", filename: file.name });
    return intakeAll(file).then(function (r) { return API.media.upload(photoForm(listingId, file, r, { role: m.role || "gallery", roomLabel: m.roomLabel, alt: m.alt })); });
  }

  /* ── ⌘K palette ──────────────────────────────────────────────────── */
  var cmdkWrap = $("#cmdkWrap"), cmdkInput = $("#cmdkInput"), cmdkList = $("#cmdkList"), cmdkRelease = null, cmdkItems = [], cmdkSel = 0;
  function openCmdk() {
    if (!state.user) return;
    closeDrawer(); closeUserMenu(); closeRowMenus(); closeBell();
    cmdkWrap.hidden = false; cmdkInput.value = "";
    cmdkRelease = trapFocus($(".st-cmdk", cmdkWrap), closeCmdk);
    cmdkInput.focus();
    cmdkRender("");
    ensureIndex().then(function () { if (!cmdkWrap.hidden) cmdkRender(cmdkInput.value); });
  }
  function closeCmdk() { if (cmdkWrap.hidden) return; cmdkWrap.hidden = true; if (cmdkRelease) { cmdkRelease(); cmdkRelease = null; } }
  function ensureIndex() {
    if (state.listIndex && Date.now() - state.listIndexAt < 60000) return Promise.resolve(state.listIndex);
    return API.listings.list({ sort: "updated" }).then(function (r) { state.listIndex = r.items || []; state.listIndexAt = Date.now(); return state.listIndex; }).catch(function () { return state.listIndex || []; });
  }
  function cmdkRender(q) {
    var ql = q.trim().toLowerCase(), items = [];
    [["Home", "#/", "home"], ["Listings", "#/listings", "list"], ["New listing", "#/listings/new", "plus"], ["Enquiries", "#/enquiries", "inbox"], ["Pages", "#/pages", "pages"], ["Backlinks", "#/backlinks", "link"], ["Integrations", "#/integrations", "plug"], ["Settings", "#/settings", "cog"], ["Team", "#/team", "users"], ["Change password", "#/settings/account", "key"], ["Import the current listings", "import", "upload"]].forEach(function (s) {
      if (!ql || s[0].toLowerCase().indexOf(ql) >= 0) items.push({ label: s[0], k: "Screen", go: s[1], icon: s[2] });
    });
    (state.listIndex || []).forEach(function (l) {
      var hay = (l.title + " " + (l.ref || "") + " " + (l.town || "") + " " + (l.id || "")).toLowerCase();
      if (!ql || hay.indexOf(ql) >= 0) items.push({ label: l.title, sub: [l.ref, l.rentPcm != null ? money(l.rentPcm) + " pcm" : ""].filter(Boolean).join(" · "), k: optLabel("status", l.status) || l.status, go: "#/listings/" + encodeURIComponent(l.id), icon: "image" });
    });
    cmdkItems = items.slice(0, 12); cmdkSel = 0;
    cmdkList.innerHTML = cmdkItems.length ? cmdkItems.map(function (it, i) { return '<li role="option" id="ck' + i + '" aria-selected="' + (i === 0 ? "true" : "false") + '" data-i="' + i + '">' + I[it.icon] + "<div>" + esc(it.label) + (it.sub ? ' <span class="st-ck-sub">' + esc(it.sub) + "</span>" : "") + '</div><span class="st-ck-k">' + esc(it.k) + "</span></li>"; }).join("") : '<li class="is-empty">Nothing matches “' + esc(q) + "”</li>";
    cmdkInput.setAttribute("aria-activedescendant", cmdkItems.length ? "ck0" : "");
  }
  function cmdkGo(it) { closeCmdk(); if (!it) return; if (it.go === "import") runImport(); else go(it.go); }
  cmdkInput.addEventListener("input", function () { cmdkRender(this.value); });
  cmdkInput.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); if (!cmdkItems.length) return;
      cmdkSel = (cmdkSel + (e.key === "ArrowDown" ? 1 : cmdkItems.length - 1)) % cmdkItems.length;
      $$("li[data-i]", cmdkList).forEach(function (li, i) { li.setAttribute("aria-selected", i === cmdkSel ? "true" : "false"); });
      cmdkInput.setAttribute("aria-activedescendant", "ck" + cmdkSel);
      var sel = $("#ck" + cmdkSel); if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") { e.preventDefault(); cmdkGo(cmdkItems[cmdkSel]); }
  });
  cmdkList.addEventListener("click", function (e) { var li = e.target.closest("li[data-i]"); if (li) cmdkGo(cmdkItems[+li.getAttribute("data-i")]); });
  cmdkWrap.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) closeCmdk(); });
  $("#btnSearch").addEventListener("click", openCmdk);

  /* ── 360 Tour tab ────────────────────────────────────────────────── */
  var tourTimer = null;
  function tourUrl(id, office) { return location.origin + "/billy360/?site=" + encodeURIComponent(id) + (office ? "&office=1#/studio/rooms" : ""); }
  function embedCode(id) { return '<div data-billy360="' + id + '" data-height="16:9"></div>\n<script src="' + location.origin + '/billy360/embed.js" defer><' + '/script>'; }
  function stopTourPoll() { if (tourTimer) { clearInterval(tourTimer); tourTimer = null; } }
  function startTourPoll() {
    stopTourPoll();
    var E = ed;
    tourTimer = setInterval(function () { if (ed !== E || E.tab !== "tour") { stopTourPoll(); return; } loadTour(E, true); }, 20000);
  }
  function loadTour(E, quiet) {
    return API.tours.get(E.id).then(function (t) {
      if (ed !== E) return;
      E.tour = { data: t, canCreate: false }; paintTour(quiet);
    }, function (err) {
      if (ed !== E) return;
      if (err.status === 404) { E.tour = { data: null, canCreate: !!(err.body && err.body.canCreate) }; paintTour(quiet); }
      else if (!quiet) { var p = $("#edPanel"); if (p) p.innerHTML = errorHtml(err); }
    });
  }
  function renderTourTab(panel) {
    if (ed.tour) paintTour(false); else panel.innerHTML = loading();
    loadTour(ed, !!ed.tour);
    startTourPoll();
  }
  function tourStripHtml(t) {
    var live = t.status === "live", h = t.health;
    return '<div class="st-tourbar" id="tourStrip">' +
      '<div class="st-ring' + (h == null ? " is-empty" : h >= 70 ? " is-good" : h >= 40 ? " is-mid" : " is-low") + '" style="--p:' + (h == null ? 0 : Number(h)) + '" role="img" aria-label="Quality score ' + (h == null ? "not measured yet" : h + " out of 100") + '"><b>' + (h == null ? "—" : esc(h)) + "</b></div>" +
      '<div class="st-tourbar-meta"><b>' + plural(t.roomCount || 0, "room") + "</b><small>" + (h == null ? "The quality score appears after the first save in the studio." : "Quality score · it needs 70 to go live.") + "</small></div>" +
      statusPill(live ? "live" : "draft") + (live && t.liveAt ? '<span class="st-hint">live since ' + esc(fmtDate(t.liveAt)) + "</span>" : "") +
      '<div class="st-actions st-tourbar-actions">' +
      '<a class="st-btn st-btn--sm" href="' + esc(tourUrl(ed.id, true)) + '" target="_blank" rel="noopener">' + I.expand + "Open full screen</a>" +
      '<button type="button" class="st-btn st-btn--sm" data-tact="copy-link">' + I.link + "Copy tour link for 10ninety</button>" +
      '<button type="button" class="st-btn st-btn--sm" data-tact="copy-embed">' + I.copy + "Copy embed code</button>" +
      (live ? '<button type="button" class="st-btn st-btn--sm" data-tact="unpublish">Take it off the listing</button>' : '<button type="button" class="st-btn st-btn--sm st-btn--fill" data-tact="publish">' + I.eye + "Publish tour</button>") +
      "</div></div>";
  }
  function paintTour(quiet) {
    var panel = $("#edPanel"); if (!panel || !ed || ed.tab !== "tour") return;
    var T = ed.tour;
    if (!T) { panel.innerHTML = loading(); return; }
    if (!T.data) {
      panel.innerHTML = T.canCreate ?
        '<section class="st-card"><div class="st-card-head"><div><h2>No tour yet</h2><p>Build it from this listing: a room for each space in The home tab — hallway, living spaces, kitchen, bedrooms, bathrooms, garden and driveway — with the doors already linked. Then capture each room’s 360° in the studio.</p></div></div><div class="st-actions"><button type="button" class="st-btn st-btn--fill st-btn--lg" data-tact="create">' + I.plus + "Build the tour from this listing</button></div></section>" :
        '<div class="st-empty"><h3>No tour for this listing</h3><p>It cannot be created from here.</p></div>';
      return;
    }
    var strip = $("#tourStrip", panel);
    if (quiet && strip && $(".st-tour-frame", panel)) { strip.outerHTML = tourStripHtml(T.data); return; }
    panel.innerHTML = '<section class="st-card st-tourcard">' + tourStripHtml(T.data) + '<ul class="st-problems" id="tourProblems" hidden></ul></section>' +
      '<iframe class="st-tour-frame" src="' + esc(tourUrl(ed.id, true)) + '" title="360° tour studio for ' + esc(ed.doc.title || ed.id) + '" allow="fullscreen; accelerometer; gyroscope" allowfullscreen loading="lazy"></iframe>' +
      '<p class="st-note">Changes made in the studio save on their own. This page checks every 20 seconds so the score and status stay current.</p>';
  }
  function tourAction(act, btn) {
    var E = ed; if (!E) return;
    if (act === "create") {
      btn.disabled = true;
      API.tours.create(E.id, {}).then(function (t) {
        if (ed !== E) return;
        E.tour = { data: t, canCreate: false };
        toast("Tour built with " + plural(t.roomCount || ((t.tour && t.tour.rooms) || []).length, "room"), { kind: "good" });
        paintTour(false); startTourPoll(); state.listIndex = null;
      }).catch(function (err) { errToast(err); btn.disabled = false; });
      return;
    }
    if (act === "copy-link") { copyText(tourUrl(E.id, false)).then(function () { toast("Tour link copied — paste it into 10ninety's virtual tour box", { kind: "good" }); }, function () { toast("Copy failed — the link is " + tourUrl(E.id, false), { kind: "warn", ttl: 12000 }); }); return; }
    if (act === "copy-embed") { copyText(embedCode(E.id)).then(function () { toast("Embed code copied", { kind: "good" }); }, function () { toast("Copy failed — open full screen and use Share there", { kind: "warn" }); }); return; }
    if (act === "publish") {
      btn.disabled = true;
      API.tours.publish(E.id, {}).then(function (res) {
        if (ed !== E) return;
        var pl = $("#tourProblems");
        if (res.ok) { if (pl) pl.hidden = true; toast("The tour is live on the listing", { kind: "good" }); state.listIndex = null; return loadTour(E, true); }
        if (pl) { pl.hidden = false; pl.innerHTML = (res.problems || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join(""); }
        btn.disabled = false;
      }).catch(function (err) { errToast(err); btn.disabled = false; });
      return;
    }
    if (act === "unpublish") {
      confirmModal({ title: "Take the tour off the listing?", body: "Visitors stop seeing it straight away. The draft stays in the studio and you can publish again any time.", confirm: "Take it off" }).then(function (ok) {
        if (!ok || ed !== E) return;
        return API.tours.unpublish(E.id).then(function () { toast("Tour taken off the listing"); state.listIndex = null; return loadTour(E, true); });
      }).catch(errToast);
    }
  }

  /* ── enquiries ───────────────────────────────────────────────────── */
  var eq = { status: "new", source: "" }, eqRows = [], eqToken = 0;
  function fmtDateTime(iso) { var d = new Date(iso); if (isNaN(d)) return ""; return d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
  function nl2br(s) { return esc(s).replace(/\n/g, "<br>"); }
  function qPill(status) { return '<span class="st-pill st-pill--' + esc(status) + '">' + esc(status === "new" ? "New" : status === "handled" ? "Handled" : "Spam") + "</span>"; }
  function srcPill(q) { return '<span class="st-pill st-pill--src">' + esc(q.sourceLabel || optLabel("enquirySource", q.source) || q.source || "") + "</span>"; }
  SCREENS.enquiries = function (id) {
    var hq = hashQuery();
    if (hq.has("status")) eq.status = hq.get("status");
    if (["new", "handled", "spam", ""].indexOf(eq.status) < 0) eq.status = "new";
    setTop({ title: "Enquiries" });
    view.innerHTML = '<div class="st-filters" id="eqChips" role="group" aria-label="Filter by status"></div><div class="st-toolbar">' +
      '<div class="st-select"><label class="st-vh" for="eqSource">Source</label><select id="eqSource"><option value="">All sources</option>' + optList("enquirySource").map(function (o) { return '<option value="' + esc(o.value) + '"' + (eq.source === o.value ? " selected" : "") + ">" + esc(o.label) + "</option>"; }).join("") + "</select></div>" +
      '<span class="st-hint">Ring or message straight from each enquiry. Handled and spam keep the inbox tidy.</span></div>' +
      '<div id="eqBody">' + loading() + "</div>";
    $("#eqSource").addEventListener("change", function () { eq.source = this.value; loadEnquiries(); });
    $("#eqChips").addEventListener("click", function (e) { var b = e.target.closest("[data-status]"); if (!b) return; eq.status = b.getAttribute("data-status"); loadEnquiries(); });
    $("#eqBody").addEventListener("click", function (e) { if (e.target.closest("a")) return; var row = e.target.closest("[data-qid]"); if (row) openEnquiry(row.getAttribute("data-qid")); });
    $("#eqBody").addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-qid][tabindex]")) { e.preventDefault(); openEnquiry(e.target.getAttribute("data-qid")); } });
    loadEnquiries().then(function () { if (id) openEnquiry(id); });
  };
  function loadEnquiries() {
    var body = $("#eqBody"); if (!body) return Promise.resolve();
    var token = ++eqToken;
    renderEqChips(null);
    return API.enquiries.list({ status: eq.status, source: eq.source, limit: 200 }).then(function (res) {
      if (token !== eqToken || !document.contains(body)) return;
      eqRows = res.items || [];
      renderEqChips(res.counts || {});
      body.innerHTML = eqRows.length ? eqTableHtml(eqRows) + eqCardsHtml(eqRows) : eqEmpty(res.counts || {});
    }).catch(function (err) { if (token === eqToken && document.contains(body)) body.innerHTML = errorHtml(err); });
  }
  function renderEqChips(c) {
    var el = $("#eqChips"); if (!el) return;
    var all = c ? (c.new || 0) + (c.handled || 0) + (c.spam || 0) : null;
    el.innerHTML = [["new", "New", c && c.new], ["handled", "Handled", c && c.handled], ["spam", "Spam", c && c.spam], ["", "All", all]].map(function (ch) {
      var on = eq.status === ch[0];
      return '<button type="button" class="st-fchip' + (on ? " is-on" : "") + '" data-status="' + ch[0] + '" aria-pressed="' + (on ? "true" : "false") + '">' + ch[1] + (ch[2] != null ? " <b>" + ch[2] + "</b>" : "") + "</button>";
    }).join("");
  }
  function eqEmpty(c) {
    var total = (c.new || 0) + (c.handled || 0) + (c.spam || 0);
    return '<div class="st-empty">' + I.inbox + "<h3>" + (total ? "Nothing here" : "No enquiries yet") + "</h3><p>" + (total ? "Try another status or source." : "Enquiries from the website land here the moment they are sent.") + "</p></div>";
  }
  function eqAbout(q) { return srcPill(q) + (q.listingTitle || q.listingId ? ' <span class="st-hint">' + esc(q.listingTitle || q.listingId) + "</span>" : ""); }
  function eqTableHtml(rows) {
    return '<div class="st-tablewrap"><table class="st-table"><thead><tr><th scope="col">Received</th><th scope="col">From</th><th scope="col">About</th><th scope="col">Message</th><th scope="col">Status</th></tr></thead><tbody>' +
      rows.map(function (q) {
        return '<tr data-qid="' + esc(q.id) + '" tabindex="0" class="' + (q.status === "new" ? "is-new" : "") + '"><td class="num"><time datetime="' + esc(q.createdAt) + '">' + esc(rel(q.createdAt)) + '</time></td><td><div class="st-title">' + esc(q.name) + '</div><div class="st-sub">' + esc([q.phone, q.email].filter(Boolean).join(" · ")) + "</div></td><td>" + eqAbout(q) + '</td><td><span class="st-msg">' + esc((q.message || "").replace(/\s+/g, " ")) + "</span></td><td>" + qPill(q.status) + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  function eqCardsHtml(rows) {
    return '<div class="st-cards">' + rows.map(function (q) {
      return '<article class="st-rcard' + (q.status === "new" ? " is-new" : "") + '" data-qid="' + esc(q.id) + '" tabindex="0" style="grid-template-columns:1fr auto"><div style="min-width:0"><div class="st-title">' + esc(q.name) + '</div><div class="st-rmeta">' + eqAbout(q) + "<span>" + esc(rel(q.createdAt)) + '</span></div><p class="st-msg">' + esc((q.message || "").replace(/\s+/g, " ")) + "</p></div>" + qPill(q.status) + "</article>";
    }).join("") + "</div>";
  }
  function waDigits(phone) { var d = String(phone || "").replace(/\D/g, ""); if (d.charAt(0) === "0") d = "44" + d.slice(1); return d; }
  function qButtons(q) {
    var b = function (st, label, fill) { return '<button type="button" class="st-btn' + (fill ? " st-btn--fill" : "") + '" data-qact="' + st + '" data-qid="' + esc(q.id) + '">' + label + "</button>"; };
    if (q.status === "new") return b("handled", I.check + "Mark handled", true) + b("spam", "Mark spam");
    if (q.status === "handled") return b("new", "Back to new") + b("spam", "Mark spam");
    return b("new", "Back to new") + b("handled", I.check + "Mark handled", true);
  }
  function enquiryHtml(q) {
    var subject = "Re: your enquiry" + (q.listingTitle ? " about " + q.listingTitle : " to Megacity Properties"), a = q.attribution || {};
    var attr = [["Source", a.utmSource], ["Medium", a.utmMedium], ["Campaign", a.utmCampaign], ["Referrer", a.referrer], ["Landing page", a.landingUrl]].filter(function (x) { return x[1]; });
    var tel = String(q.phone || "").replace(/[^\d+]/g, "");
    return '<div class="st-enq-head">' + srcPill(q) + qPill(q.status) + '<span class="st-hint">' + esc(rel(q.createdAt)) + " · " + esc(fmtDateTime(q.createdAt)) + "</span></div>" +
      (q.listingId ? '<p class="st-enq-about">About <a href="#/listings/' + esc(encodeURIComponent(q.listingId)) + '" data-close>' + esc(q.listingTitle || q.listingId) + "</a></p>" : "") +
      '<blockquote class="st-quote">' + (q.message ? nl2br(q.message) : '<span class="st-hint">No message.</span>') + "</blockquote>" +
      (q.preferredDay ? '<p class="st-hint">Preferred day: <b>' + esc(q.preferredDay) + "</b></p>" : "") +
      '<dl class="st-kv">' + (q.email ? '<dt>Email</dt><dd><a href="mailto:' + esc(q.email) + '">' + esc(q.email) + "</a></dd>" : "") + (q.phone ? "<dt>Phone</dt><dd>" + esc(q.phone) + "</dd>" : "") + "</dl>" +
      '<div class="st-actions">' + (q.phone ? '<a class="st-btn" href="tel:' + esc(tel) + '">' + I.phone + "Call</a>" + '<a class="st-btn" href="https://wa.me/' + esc(waDigits(q.phone)) + '" target="_blank" rel="noopener">' + I.chat + "WhatsApp</a>" : "") +
      (q.email ? '<a class="st-btn" href="mailto:' + esc(q.email) + "?subject=" + encodeURIComponent(subject) + '">' + I.mail + "Email</a>" : "") + "</div>" +
      (attr.length ? '<details class="st-details"><summary>Where it came from</summary><div><dl class="st-kv">' + attr.map(function (x) { return "<dt>" + esc(x[0]) + "</dt><dd>" + esc(x[1]) + "</dd>"; }).join("") + "</dl></div></details>" : "") +
      '<div class="st-field"><label class="st-label" for="qNote">Note <span class="st-opt">for the office, saves as you type</span></label><textarea class="st-ta" id="qNote" rows="3" data-qnote="' + esc(q.id) + '" placeholder="Called back, viewing booked for…">' + esc(q.note || "") + "</textarea>" +
      (q.handledBy ? '<span class="st-hint">Handled by ' + esc(q.handledBy) + (q.handledAt ? " · " + esc(rel(q.handledAt)) : "") + "</span>" : "") + "</div>" +
      '<div class="st-actions" id="qActions">' + qButtons(q) + "</div>";
  }
  function openEnquiry(id) {
    var q = eqRows.filter(function (x) { return x.id === id; })[0];
    var show = function (row) {
      openDrawer(row.name || "Enquiry", enquiryHtml(row));
      if (location.hash.indexOf("#/enquiries/") !== 0) history.replaceState(null, "", "#/enquiries/" + encodeURIComponent(id));
    };
    if (q) show(q); else API.enquiries.get(id).then(show).catch(errToast);
  }
  var qNoteTimers = {};
  function enquiryNote(id, text) {
    clearTimeout(qNoteTimers[id]);
    qNoteTimers[id] = setTimeout(function () {
      API.enquiries.patch(id, { note: text }).then(function (row) { var i = eqRows.findIndex(function (x) { return x.id === id; }); if (i >= 0) eqRows[i] = row; }).catch(errToast);
    }, 600);
  }
  function enquiryStatus(id, status, btn) {
    btn.disabled = true;
    var note = $("#qNote", drawerBody);
    var patch = { status: status }; if (note && note.value !== undefined) patch.note = note.value;
    API.enquiries.patch(id, patch).then(function (row) {
      var i = eqRows.findIndex(function (x) { return x.id === id; }); if (i >= 0) eqRows[i] = row;
      if (!drawerWrap.hidden) { drawerBody.innerHTML = enquiryHtml(row); var f = $("[data-qact]", drawerBody); if (f) f.focus(); }
      toast(status === "handled" ? "Marked as handled" : status === "spam" ? "Marked as spam" : "Back in New", { kind: status === "spam" ? undefined : "good" });
      loadEnquiries();
    }).catch(function (err) { errToast(err); btn.disabled = false; });
  }
  drawerBody.addEventListener("click", function (e) { var b = e.target.closest("[data-qact]"); if (b) enquiryStatus(b.getAttribute("data-qid"), b.getAttribute("data-qact"), b); });
  drawerBody.addEventListener("input", function (e) { var t = e.target; if (t.hasAttribute && t.hasAttribute("data-qnote")) enquiryNote(t.getAttribute("data-qnote"), t.value); });

  /* ── notifications bell ──────────────────────────────────────────── */
  var notifTimer = null, bellOpen = false, notifSeq = 0;
  function ensureNotifPoll() { if (notifTimer || !state.user) return; refreshNotifications(); notifTimer = setInterval(refreshNotifications, 60000); }
  function stopNotifPoll() { if (notifTimer) { clearInterval(notifTimer); notifTimer = null; } closeBell(); state.notifs = []; state.unread = 0; paintUnread(); }
  function refreshNotifications() {
    if (!state.user) return Promise.resolve();
    var seq = ++notifSeq;
    return API.notifications.list().then(function (r) {
      if (seq !== notifSeq) return; /* a local change happened while this was in flight */
      state.notifs = r.items || []; state.unread = r.unread || 0; paintUnread(); if (bellOpen) renderBellList();
    }).catch(function () { /* quiet: the badge just keeps its last value */ });
  }
  function paintUnread() {
    var n = state.unread || 0;
    $$("[data-unread]").forEach(function (el) { el.textContent = n > 99 ? "99+" : n; el.hidden = !n; });
    var b = $("#btnBell"); if (b) b.setAttribute("aria-label", n ? "Notifications, " + n + " unread" : "Notifications");
  }
  function toggleBell() {
    if (bellOpen) return closeBell();
    closeUserMenu(); bellOpen = true;
    $("#btnBell").setAttribute("aria-expanded", "true");
    $("#bellWrap").insertAdjacentHTML("beforeend", '<div class="st-menu st-notif" role="menu" id="bellMenu" aria-label="Notifications"></div>');
    renderBellList(); refreshNotifications();
  }
  function closeBell() { if (!bellOpen) return; bellOpen = false; var m = $("#bellMenu"); if (m) m.parentNode.removeChild(m); var b = $("#btnBell"); if (b) b.setAttribute("aria-expanded", "false"); }
  function renderBellList() {
    var m = $("#bellMenu"); if (!m) return;
    var items = state.notifs || [];
    m.innerHTML = '<div class="st-notif-head"><b>Notifications</b>' + (state.unread ? '<button type="button" class="st-btn st-btn--sm st-btn--ghost" data-read-all>Mark all read</button>' : "") + "</div>" +
      (items.length ? '<ul class="st-notif-list">' + items.slice(0, 30).map(function (n) {
        return '<li><button type="button" role="menuitem" class="' + (n.read ? "" : "is-unread") + '" data-nid="' + esc(n.id) + '" data-link="' + esc(n.link || "") + '"><i aria-hidden="true"></i><span><b>' + esc(n.title) + "</b>" + (n.body ? "<small>" + esc(n.body) + "</small>" : "") + '<time datetime="' + esc(n.at) + '">' + esc(rel(n.at)) + "</time></span></button></li>";
      }).join("") + "</ul>" : '<p class="st-hint st-notif-empty">Nothing new. Enquiries and tour events show up here.</p>');
    var first = $("[role=menuitem]", m); if (first) first.focus();
  }
  function openNotification(btn) {
    var id = btn.getAttribute("data-nid"), link = btn.getAttribute("data-link");
    closeBell();
    var n = (state.notifs || []).filter(function (x) { return x.id === id; })[0];
    if (n && !n.read) { n.read = true; state.unread = Math.max(0, (state.unread || 0) - 1); notifSeq++; paintUnread(); API.notifications.markRead([id]).then(refreshNotifications, function () { /* the next poll corrects it */ }); }
    if (link) go(link);
  }
  function markAllRead() {
    notifSeq++;
    API.notifications.markRead([]).then(function () { (state.notifs || []).forEach(function (n) { n.read = true; }); state.unread = 0; paintUnread(); renderBellList(); return refreshNotifications(); }).catch(errToast);
  }

  /* ── dashboard extras: sparkline + source bars ───────────────────── */
  function num(x) { return x == null ? "—" : esc(x); }
  function sparkHtml(daily) {
    if (!daily) return '<p class="st-hint">Not connected to the activity store yet.</p>';
    var map = {}; daily.forEach(function (d) { map[d[0]] = Number(d[1]) || 0; });
    var pts = [], max = 0, total = 0;
    for (var i = 29; i >= 0; i--) { var key = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10), n = map[key] || 0; pts.push(n); if (n > max) max = n; total += n; }
    var W = 300, H = 56, step = W / 29;
    var xy = pts.map(function (n, i) { return (i * step).toFixed(1) + "," + (H - 4 - (max ? (n / max) * (H - 10) : 0)).toFixed(1); });
    return '<svg class="st-spark" viewBox="0 0 300 56" preserveAspectRatio="none" role="img" aria-label="' + plural(total, "enquiry", "enquiries") + ' in the last 30 days, at most ' + max + ' in a day"><path class="st-spark-area" d="M0,' + H + " L" + xy.join(" L") + " L300," + H + ' Z"/><polyline class="st-spark-line" points="' + xy.join(" ") + '"/></svg>' +
      '<div class="st-spark-foot"><span>30 days ago</span><b>' + plural(total, "enquiry", "enquiries") + "</b><span>today</span></div>";
  }
  function bySourceHtml(by) {
    if (!by) return "";
    var keys = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; });
    if (!keys.length) return '<p class="st-hint" style="margin-top:12px">No enquiries this week.</p>';
    var max = by[keys[0]] || 1;
    return '<ul class="st-bars" aria-label="Enquiries this week by source">' + keys.map(function (k) { return "<li><span>" + esc(optLabel("enquirySource", k) || k) + '</span><i style="--w:' + Math.round(100 * by[k] / max) + '%" aria-hidden="true"></i><b>' + by[k] + "</b></li>"; }).join("") + "</ul>";
  }

  /* ── AI helpers ─────────────────────────────────────────────────── */
  function aiOn() { return !!(state.features && state.features.ai); }
  function aiRun(btn, promise) {
    var label = btn ? btn.innerHTML : "";
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="st-spin" aria-hidden="true"></span> ' + label; }
    return promise.then(function (r) { if (btn && document.contains(btn)) { btn.disabled = false; btn.innerHTML = label; } return r; }, function (err) {
      if (btn && document.contains(btn)) { btn.disabled = false; btn.innerHTML = label; }
      if (err && err.status === 503) { state.features.ai = false; toast("AI is off until the ANTHROPIC_API_KEY secret is added", { kind: "warn", ttl: 8000 }); route(); }
      else toast((err && err.message) || "The AI service did not answer", { kind: "bad", ttl: 7000 });
      throw err;
    });
  }
  var AI_FIELDS = [["summary", "Summary"], ["description", "Description"], ["features", "Features"], ["seoTitle", "Search title"], ["seoDescription", "Search description"]];
  function aiCopyCardHtml() {
    if (!aiOn()) return "";
    if (ed.doc.source === "tenninety") return '<section class="st-card st-ai"><div class="st-card-head"><div><h2>Write the listing for me</h2><p>Copy is managed in 10ninety for this listing.</p></div></div></section>';
    return '<section class="st-card st-ai" id="aiCopy"><div class="st-card-head"><div><h2>Write the listing for me</h2><p>Claude writes a summary, description, features and search text from the facts on this page and The home tab. Nothing is saved until you choose what to use.</p></div></div>' +
      '<div class="st-ai-row"><div class="st-select"><label class="st-vh" for="aiTone">Tone</label><select id="aiTone"><option value="standard">Standard</option><option value="warm">Warm</option><option value="concise">Concise</option></select></div>' +
      '<button type="button" class="st-btn st-btn--blue" data-ai="listing-copy">' + I.spark + 'Write the listing for me</button></div><div id="aiReview"></div></section>';
  }
  function aiFmt(v) { return v == null || v === "" || (Array.isArray(v) && !v.length) ? "" : Array.isArray(v) ? v.join("\n") : String(v); }
  function aiReviewHtml(res) {
    return '<div class="st-review" id="aiReviewPanel" role="region" aria-label="Suggested copy">' + AI_FIELDS.map(function (f) {
      var cur = aiFmt(ed.doc[f[0]]), sug = aiFmt(res[f[0]]);
      return '<div class="st-review-item" data-aif="' + f[0] + '"><h3>' + esc(f[1]) + '</h3><div><span class="lbl">Now</span><div class="cur">' + (cur ? esc(cur) : "<i>blank</i>") + '</div></div><div><span class="lbl">Suggested</span><div class="sug">' + esc(sug) + '</div></div><button type="button" class="st-btn st-btn--sm" data-ai-use="' + f[0] + '"' + (sug ? "" : " disabled") + ">Use this</button></div>";
    }).join("") + '<div class="st-actions"><button type="button" class="st-btn st-btn--fill" data-ai-use="*">Use all</button><button type="button" class="st-btn st-btn--ghost" data-ai-dismiss>Dismiss</button></div></div>';
  }
  function aiApplyField(k) {
    var v = ed && ed.aiCopy ? ed.aiCopy[k] : null;
    if (v == null || v === "" || (Array.isArray(v) && !v.length)) return;
    var val = k === "features" ? (Array.isArray(v) ? v : String(v).split("\n").map(function (s) { return s.trim(); }).filter(Boolean)) : String(v);
    edSet(k, val);
    var el = $('[data-k="' + k + '"]', view); if (el) el.value = k === "features" ? val.join("\n") : val;
    if (k === "features") { var chips = $("#edFeatChips"); if (chips) chips.innerHTML = featChips(val); }
    if (k === "summary") { var c = $("#edSumCount"); if (c) { c.textContent = val.length + " / 200"; c.classList.toggle("is-over", val.length > 200); } }
    updateSerp();
    var item = $('[data-aif="' + k + '"]', view); if (item) { item.classList.add("is-used"); var b = $("[data-ai-use]", item); if (b) { b.disabled = true; b.textContent = "Used"; } }
  }
  function shareKitCardHtml() {
    if (!aiOn()) return "";
    return '<section class="st-card st-ai" id="aiKit"><div class="st-card-head"><div><h2>Share kit</h2><p>Posts for Facebook, Instagram and WhatsApp' + (ed.doc.letType === "room" ? ", plus a SpareRoom advert" : "") + ', written from the listing facts. Copy what you need.</p></div></div><div class="st-actions"><button type="button" class="st-btn st-btn--blue" data-ai="share-kit">' + I.spark + 'Write the share kit</button></div><div id="aiKitOut"></div></section>';
  }
  function shareKitHtml(k) {
    var url = location.origin + (k.url || "/templates/megacity-let-" + ed.id);
    var items = [["Headline", k.headline], ["Facebook", k.facebook], ["Instagram", k.instagram], ["WhatsApp", k.whatsapp], ["SpareRoom", k.spareroom], ["Hashtags", (k.hashtags || []).map(function (h) { return "#" + h; }).join(" ")], ["Meta description", k.metaDescription]].filter(function (x) { return x[1]; });
    return '<div class="st-kit">' + items.map(function (x) {
      var extra = x[0] === "WhatsApp" ? '<a class="st-btn st-btn--sm" href="https://wa.me/?text=' + encodeURIComponent(x[1]) + '" target="_blank" rel="noopener">' + I.chat + "Share on WhatsApp</a>" : x[0] === "Facebook" ? '<a class="st-btn st-btn--sm" href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url) + '" target="_blank" rel="noopener">Share on Facebook</a>' : "";
      return '<div class="st-kit-item"><span class="st-label">' + esc(x[0]) + "</span><p>" + esc(x[1]) + '</p><div class="st-actions"><button type="button" class="st-btn st-btn--sm" data-copy="' + esc(x[1]) + '">' + I.copy + "Copy</button>" + extra + "</div></div>";
    }).join("") + "</div>";
  }
  function aiAction(act, btn) {
    if (act === "listing-copy") {
      var E = ed, tone = ($("#aiTone") || {}).value || "standard";
      aiRun(btn, API.ai.listingCopy(E.id, tone)).then(function (r) { if (ed !== E) return; E.aiCopy = r; var out = $("#aiReview"); if (out) { out.innerHTML = aiReviewHtml(r); var f = $("[data-ai-use]", out); if (f) f.focus(); } }).catch(function () { /* toasted */ });
    } else if (act === "share-kit") {
      var E2 = ed;
      aiRun(btn, API.ai.shareKit(E2.id)).then(function (k) { if (ed !== E2) return; var out = $("#aiKitOut"); if (out) out.innerHTML = shareKitHtml(k); }).catch(function () { /* toasted */ });
    } else if (act === "page-draft") pageDraftDialog();
  }
  function mediaAi(act, mid, btn) {
    var E = ed;
    aiRun(btn, act === "classify" ? API.ai.classifyRoom(mid) : API.ai.altText(mid)).then(function (r) {
      if (ed !== E) return;
      var card = $('.st-mcard[data-mid="' + mid + '"]', view), m = findMedia(E, mid); if (!card || !m) return;
      if (act === "classify") {
        var name = r.name || optLabel("tourRoom", r.kind) || "";
        if (name) {
          var sel = $('[data-mfield="roomLabel"]', card), other = $("[data-mother]", card);
          if (roomChoices().indexOf(name) >= 0) { sel.value = name; if (other) other.hidden = true; } else { sel.value = "__other"; if (other) { other.hidden = false; other.value = name; } }
          mediaPatch(mid, "roomLabel", name);
        }
        if (r.alt && !m.alt) { var alt = $('[data-mfield="alt"]', card); if (alt) alt.value = r.alt; mediaPatch(mid, "alt", r.alt); }
        toast("Looks like " + (name || "something else") + (r.confidence != null ? " · " + Math.round(r.confidence * 100) + "% sure" : ""));
      } else if (r.alt) { var a2 = $('[data-mfield="alt"]', card); if (a2) a2.value = r.alt; mediaPatch(mid, "alt", r.alt); }
      E.suggested[mid] = true;
      var badges = $(".st-mbadges", card); if (badges && !$(".st-mbadge--ai", badges)) badges.insertAdjacentHTML("beforeend", '<span class="st-mbadge st-mbadge--ai">AI suggested</span>');
    }).catch(function () { /* toasted */ });
  }

  /* ── pages: list ────────────────────────────────────────────────── */
  var KIND_LABEL = { area: "Area guide", landing: "Landing page", guide: "Guide" }, KIND_OPTS = [{ value: "area", label: "Area guide" }, { value: "landing", label: "Landing page" }, { value: "guide", label: "Guide" }];
  var BLOCK_LABEL = { h2: "Heading", p: "Paragraph", list: "List", cta: "Call to action", image: "Photo" };
  function kindBadge(k) { return '<span class="st-kind st-kind--' + esc(k) + '">' + esc(KIND_LABEL[k] || k) + "</span>"; }
  function pagePill(s) { return '<span class="st-pill st-pill--' + (s === "live" ? "live" : "draft") + '">' + (s === "live" ? "Live" : "Draft") + "</span>"; }
  function slugify(v) { return String(v || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80); }
  SCREENS.pages = function () {
    setTop({ title: "Pages" });
    view.innerHTML = '<div class="st-toolbar"><p class="st-hint" style="flex:1 1 300px;margin:0">Area guides, landing pages and guides, published at /templates/megacity-&lt;address&gt; with the search markup done for you.</p><button type="button" class="st-btn st-btn--fill" data-newpage>' + I.plus + 'New page</button></div><div id="pgBody">' + loading() + "</div>";
    API.pages.list().then(function (res) {
      var items = res.items || [], body = $("#pgBody"); if (!body) return;
      body.innerHTML = items.length ? pagesTable(items) + pagesCards(items) : '<div class="st-empty">' + I.doc + '<h3>No pages yet</h3><p>Start with an area guide for somewhere you let a lot.</p><button type="button" class="st-btn st-btn--fill" data-newpage>' + I.plus + "New page</button></div>";
    }).catch(function (err) { var b = $("#pgBody"); if (b) b.innerHTML = errorHtml(err); });
    $("#pgBody").addEventListener("click", function (e) { if (e.target.closest("a,button")) return; var row = e.target.closest("[data-pid]"); if (row) go("#/pages/" + encodeURIComponent(row.getAttribute("data-pid"))); });
    $("#pgBody").addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-pid][tabindex]")) { e.preventDefault(); go("#/pages/" + encodeURIComponent(e.target.getAttribute("data-pid"))); } });
  };
  function pagesTable(items) {
    return '<div class="st-tablewrap"><table class="st-table"><thead><tr><th scope="col">Page</th><th scope="col">Kind</th><th scope="col">Status</th><th scope="col">Published</th><th scope="col">Updated</th></tr></thead><tbody>' + items.map(function (p) {
      return '<tr data-pid="' + esc(p.id) + '" tabindex="0"><td><div class="st-title">' + esc(p.title) + '</div><div class="st-sub">' + esc(p.url) + "</div></td><td>" + kindBadge(p.kind) + "</td><td>" + pagePill(p.status) + '</td><td class="num">' + (p.publishedAt ? esc(fmtDate(p.publishedAt)) : "—") + '</td><td class="num">' + esc(rel(p.updatedAt)) + "</td></tr>";
    }).join("") + "</tbody></table></div>";
  }
  function pagesCards(items) {
    return '<div class="st-cards">' + items.map(function (p) { return '<article class="st-rcard" data-pid="' + esc(p.id) + '" tabindex="0" style="grid-template-columns:1fr auto"><div style="min-width:0"><div class="st-title">' + esc(p.title) + '</div><div class="st-sub">' + esc(p.url) + '</div><div class="st-rmeta">' + kindBadge(p.kind) + "<span>" + esc(rel(p.updatedAt)) + "</span></div></div>" + pagePill(p.status) + "</article>"; }).join("") + "</div>";
  }
  function newPageDrawer() {
    openDrawer("New page", '<form novalidate class="st-stack" id="newPageForm">' + fieldHtml({ label: "Title", name: "title", required: true, ph: "Renting in Salford" }) +
      selectHtml({ label: "Kind", name: "kind", noEmpty: true, value: "area", options: KIND_OPTS }) +
      '<div class="st-field"><label class="st-label" for="f_slug">Address <span class="st-opt">made from the title if left blank</span></label><div class="st-slug"><span>/templates/megacity-</span><input id="f_slug" name="slug" autocomplete="off" spellcheck="false" placeholder="renting-in-salford"></div><p class="st-err" id="slugErr" role="alert" hidden></p><span class="st-hint" id="slugPrev"></span></div>' +
      '<p class="st-err" data-form-err role="alert" hidden></p><button type="submit" class="st-btn st-btn--fill">Create page</button></form>', function (body) {
        var f = $("#newPageForm", body), t = $("#f_title", f), sl = $("#f_slug", f), prev = $("#slugPrev", f);
        var upd = function () { var s = slugify(sl.value || t.value); prev.textContent = s ? "Will be published at /templates/megacity-" + s : ""; };
        t.addEventListener("input", upd); sl.addEventListener("input", upd);
        bindForm(f, function (d) {
          if (!d.title.trim()) throw new Error("Give the page a title");
          var payload = { title: d.title.trim(), kind: d.kind }; if (d.slug.trim()) payload.slug = d.slug.trim();
          $("#slugErr", f).hidden = true;
          return API.pages.create(payload).then(function (p) { closeDrawer(); state.mediaIndexAt = 0; toast("Page created — it saves as you go", { kind: "good" }); go("#/pages/" + encodeURIComponent(p.id)); }, function (err) {
            if (err.status === 400 || err.status === 409) { var se = $("#slugErr", f); se.textContent = err.message; se.hidden = false; sl.focus(); return; }
            throw err;
          });
        });
      });
  }

  /* ── pages: editor with autosave ────────────────────────────────── */
  var pg = null;
  SCREENS.pageEditor = function (id) {
    if (pg && pg.id === id && pg.doc) { renderPage(); return; }
    pageLeave();
    var P = pg = { id: id, base: null, doc: null, dirty: {}, timer: null, saving: false, again: false, chipState: "saved", savedAt: null, aiDraft: null };
    setTop({ title: "Page", back: "#/pages" });
    view.innerHTML = loading();
    API.pages.get(id).then(function (p) {
      if (pg !== P) return;
      P.base = p; P.doc = clone(p); P.doc.blocks = P.doc.blocks || []; P.doc.faq = P.doc.faq || [];
      renderPage();
      if (neededMedia(P.doc).length) ensureMediaIndex().then(function () { if (pg === P) { var h = $("#pgHero"); if (h) h.innerHTML = heroThumbHtml(); $$("#pgBlocks .st-block--image").forEach(function (el) { var i = +el.getAttribute("data-bi"); el.outerHTML = blockHtml(P.doc.blocks[i], i, P.doc.blocks.length); }); } }).catch(function () { /* thumbs stay as placeholders */ });
    }).catch(function (err) { if (pg !== P) return; if (err.status === 404) view.innerHTML = '<div class="st-empty"><h3>That page does not exist</h3><a class="st-btn" href="#/pages">Back to pages</a></div>'; else showError(err); });
  };
  function pageLeave() { if (!pg) return; var P = pg; clearTimeout(P.timer); if (Object.keys(P.dirty).length && !P.saving) pgSave(P); pg = null; topChip.innerHTML = ""; }
  function pgChipHtml() { return chipMarkup(pg.chipState, pg.savedAt); }
  function pgSetChip(s) { if (!pg) return; pg.chipState = s; topChip.innerHTML = pgChipHtml(); }
  function pgSet(k, v) { pg.doc[k] = v; pgMark(k); }
  function pgMark(k) { pg.dirty[k] = true; pgSetChip("dirty"); clearTimeout(pg.timer); var P = pg; pg.timer = setTimeout(function () { pgSave(P); }, 900); }
  function pgSave(P) {
    P = P || pg; if (!P || !P.base) return;
    clearTimeout(P.timer);
    if (P.saving) { P.again = true; return; }
    var patch = {};
    Object.keys(P.dirty).forEach(function (k) { if (!same(P.base[k], P.doc[k])) patch[k] = clone(P.doc[k]); else delete P.dirty[k]; });
    if (!Object.keys(patch).length) { if (pg === P) pgSetChip("saved"); return; }
    P.saving = true; if (pg === P) pgSetChip("saving");
    var sent = clone(patch);
    API.pages.patch(P.id, patch).then(function (res) {
      P.saving = false;
      Object.keys(sent).forEach(function (k) { if (same(P.doc[k], sent[k])) { delete P.dirty[k]; if (k !== "blocks" && k !== "faq") P.doc[k] = clone(res[k]); } });
      Object.keys(res).forEach(function (k) { if (!P.dirty[k] && k !== "blocks" && k !== "faq") P.doc[k] = clone(res[k]); });
      P.base = res; P.savedAt = Date.now();
      if (pg === P) { pgSetChip(Object.keys(P.dirty).length ? "dirty" : "saved"); refreshPageHead(); }
      if (P.again || Object.keys(P.dirty).length) { P.again = false; P.timer = setTimeout(function () { pgSave(P); }, 500); }
    }).catch(function (err) {
      P.saving = false; P.again = false;
      if (pg === P) pgSetChip("error");
      toast(err.message || "Could not save the page", { kind: "bad", action: { label: "Retry", run: function () { pgSave(P); } } });
    });
  }
  function pgAdopt(p) { var P = pg; P.base = p; var nd = clone(p); Object.keys(P.dirty).forEach(function (k) { nd[k] = P.doc[k]; }); nd.blocks = nd.blocks || []; nd.faq = nd.faq || []; P.doc = nd; }
  function flushPage(P) {
    clearTimeout(P.timer);
    if (!Object.keys(P.dirty).length && !P.saving) return Promise.resolve();
    return new Promise(function (res) { pgSave(P); var t = setInterval(function () { if (!P.saving) { clearInterval(t); res(); } }, 100); });
  }
  function neededMedia(d) { var ids = []; if (d.heroMediaId) ids.push(d.heroMediaId); (d.blocks || []).forEach(function (b) { if (b.type === "image" && b.mediaId) ids.push(b.mediaId); }); return ids.filter(function (id) { return !(state.mediaIndex && state.mediaIndex[id]); }); }
  function ensureMediaIndex() {
    if (state.mediaIndexAt && Date.now() - state.mediaIndexAt < 120000) return Promise.resolve(state.mediaIndex);
    return API.listings.list({}).then(function (r) { return Promise.all((r.items || []).slice(0, 25).map(function (s) { return API.listings.get(s.id).catch(function () { return null; }); })); }).then(function (ls) {
      var idx = state.mediaIndex || {}, lists = [];
      ls.forEach(function (l) { if (!l) return; lists.push({ id: l.id, title: l.title, media: (l.media || []).filter(isPhoto) }); (l.media || []).forEach(function (m) { idx[m.id] = { id: m.id, thumb: m.thumb || m.url, alt: m.alt || "", listing: l.title }; }); });
      state.mediaIndex = idx; state.mediaLists = lists; state.mediaIndexAt = Date.now();
      return idx;
    });
  }
  function thumbFor(id, size) { var m = id && state.mediaIndex && state.mediaIndex[id]; return m ? '<img src="' + esc(m.thumb) + '" alt="' + esc(m.alt) + '">' : '<span class="st-thumb st-thumb--ph" aria-hidden="true">' + I.image + "</span>"; }
  function heroThumbHtml() {
    var id = pg.doc.heroMediaId;
    return thumbFor(id) + '<div class="st-actions"><button type="button" class="st-btn st-btn--sm" data-hero="pick">' + (id ? "Change photo" : "Choose a photo") + "</button>" + (id ? '<button type="button" class="st-btn st-btn--sm st-btn--ghost" data-hero="remove">Remove</button>' : '<span class="st-hint">Optional — the page uses the site’s Manchester photo without one.</span>') + "</div>";
  }
  function pf(o) {
    var id = "pg_" + o.k, v = pg.doc[o.k], input;
    if (o.type === "textarea") input = '<textarea class="st-ta" id="' + id + '" data-pk="' + o.k + '" rows="' + (o.rows || 3) + '"' + (o.max ? ' maxlength="' + o.max + '"' : "") + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : "") + ">" + esc(v == null ? "" : v) + "</textarea>";
    else input = '<input class="st-in" id="' + id + '" data-pk="' + o.k + '" type="text" value="' + esc(v == null ? "" : v) + '"' + (o.max ? ' maxlength="' + o.max + '"' : "") + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : "") + ">";
    return '<div class="st-field ' + (o.cls || "") + '"><label class="st-label" for="' + id + '">' + esc(o.label) + (o.req ? ' <span class="st-req">required</span>' : "") + "</label>" + input + (o.counter ? '<span class="st-count' + ((v || "").length > o.counter ? " is-over" : "") + '" data-count-for="' + id + '" data-max="' + o.counter + '">' + (v || "").length + " / " + o.counter + "</span>" : "") + (o.hint ? '<span class="st-hint">' + o.hint + "</span>" : "") + "</div>";
  }
  function blockHtml(b, i, n) {
    var bi = ' data-bi="' + i + '"', body;
    if (b.type === "h2") body = '<input class="st-in" data-bk="text"' + bi + ' value="' + esc(b.text || "") + '" placeholder="Heading" aria-label="Heading text">';
    else if (b.type === "p") body = '<textarea class="st-ta" data-bk="text"' + bi + ' placeholder="Paragraph" aria-label="Paragraph">' + esc(b.text || "") + "</textarea>";
    else if (b.type === "list") body = '<textarea class="st-ta" data-bk="items"' + bi + ' placeholder="One item per line" aria-label="List items, one per line">' + esc((b.items || []).join("\n")) + "</textarea>";
    else if (b.type === "cta") body = '<div class="st-form"><div class="st-field c6"><label class="st-label" for="cta_t' + i + '">Button text</label><input class="st-in" id="cta_t' + i + '" data-bk="text"' + bi + ' value="' + esc(b.text || "") + '" placeholder="Talk to the office"></div><div class="st-field c6"><label class="st-label" for="cta_h' + i + '">Goes to</label><input class="st-in" id="cta_h' + i + '" data-bk="href"' + bi + ' value="' + esc(b.href || "") + '" placeholder="megacity-contact-us or https://…"></div></div>';
    else body = '<div class="st-block-img">' + thumbFor(b.mediaId) + '<div class="st-stack" style="flex:1;min-width:200px"><div class="st-actions"><button type="button" class="st-btn st-btn--sm" data-bact="pick"' + bi + ">" + (b.mediaId ? "Change photo" : "Choose a photo") + '</button></div><div class="st-field"><label class="st-label" for="img_c' + i + '">Caption</label><input class="st-in" id="img_c' + i + '" data-bk="caption"' + bi + ' value="' + esc(b.caption || "") + '"></div></div></div>';
    return '<div class="st-block st-block--' + b.type + '"' + bi + '><div class="st-block-head"><span class="st-tag">' + esc(BLOCK_LABEL[b.type] || b.type) + '</span><div class="st-actions">' +
      '<button type="button" class="st-btn st-btn--sm st-btn--icon" data-bact="up"' + bi + ' aria-label="Move up"' + (i === 0 ? " disabled" : "") + ">" + I.up + "</button>" +
      '<button type="button" class="st-btn st-btn--sm st-btn--icon" data-bact="down"' + bi + ' aria-label="Move down"' + (i === n - 1 ? " disabled" : "") + ">" + I.down + "</button>" +
      '<button type="button" class="st-btn st-btn--sm st-btn--icon st-del" data-bact="delete"' + bi + ' aria-label="Delete block">' + I.trash + "</button></div></div>" + body + "</div>";
  }
  function blocksHtml() { var b = pg.doc.blocks; return b.length ? b.map(function (x, i) { return blockHtml(x, i, b.length); }).join("") : '<p class="st-hint">No content yet — add a heading and a paragraph below.</p>'; }
  function faqHtml() {
    var f = pg.doc.faq;
    return f.length ? f.map(function (x, i) { return '<div class="st-faq-row"><div class="st-stack"><input class="st-in" data-fk="q" data-fi="' + i + '" value="' + esc(x.q || "") + '" placeholder="Question" aria-label="Question ' + (i + 1) + '"><textarea class="st-ta" data-fk="a" data-fi="' + i + '" rows="2" placeholder="Answer" aria-label="Answer ' + (i + 1) + '">' + esc(x.a || "") + '</textarea></div><button type="button" class="st-btn st-btn--sm st-btn--icon st-del" data-faq-rm="' + i + '" aria-label="Remove question">' + I.trash + "</button></div>"; }).join("") : '<p class="st-hint">None yet.</p>';
  }
  function pageHeadHtml() {
    var d = pg.doc, live = d.status === "live";
    return '<div class="st-pagehead" id="pgHead">' + pagePill(d.status) + kindBadge(d.kind) + (live && d.publishedAt ? '<span class="st-hint">published ' + esc(rel(d.publishedAt)) + "</span>" : "") +
      '<div class="st-actions">' + (aiOn() ? '<button type="button" class="st-btn" data-ai="page-draft">' + I.spark + "Draft with AI</button>" : "") +
      (live ? '<a class="st-btn" href="' + esc(d.url) + '" target="_blank" rel="noopener">' + I.eye + "View live page</a>" : '<span class="st-status-note">Publish to see it on the website</span>') +
      (live ? '<button type="button" class="st-btn" data-pact="unpublish">Unpublish</button>' : '<button type="button" class="st-btn st-btn--fill" data-pact="publish">' + I.eye + "Publish</button>") +
      '<button type="button" class="st-btn st-btn--danger" data-pact="delete">Delete</button></div></div>';
  }
  function refreshPageHead() { var h = $("#pgHead"); if (h) h.outerHTML = pageHeadHtml(); topSub.textContent = "/templates/megacity-" + pg.doc.slug; topSub.hidden = false; }
  function renderPage() {
    var d = pg.doc;
    setTop({ title: d.title || "Untitled page", sub: "/templates/megacity-" + d.slug, back: "#/pages", chip: pgChipHtml() });
    view.innerHTML = pageHeadHtml() + '<ul class="st-problems" id="pgProblems" hidden style="margin:12px 0"></ul>' +
      '<section class="st-card" style="margin-top:14px"><div class="st-card-head"><h2>Page</h2></div><div class="st-form">' +
      pf({ k: "title", label: "Title", req: true, cls: "c8" }) +
      '<div class="st-field c4"><label class="st-label" for="pg_kind">Kind</label><div class="st-select"><select id="pg_kind" data-pk="kind">' + KIND_OPTS.map(function (o) { return '<option value="' + o.value + '"' + (d.kind === o.value ? " selected" : "") + ">" + o.label + "</option>"; }).join("") + "</select></div></div>" +
      '<div class="st-field"><label class="st-label" for="pg_slug">Address</label><div class="st-slug"><span>/templates/megacity-</span><input id="pg_slug" data-pk="slug" value="' + esc(d.slug) + '" autocomplete="off" spellcheck="false"></div><span class="st-hint">Changing the address changes the link; search engines take a while to catch up.</span></div>' +
      pf({ k: "seoTitle", label: "Search title", max: 70, counter: 60, cls: "c6", ph: d.title, hint: "Blank uses the title." }) + pf({ k: "seoDescription", label: "Search description", type: "textarea", rows: 2, max: 170, counter: 155, cls: "c6", hint: "What Google shows under the title. Needed before publishing." }) +
      '<div class="st-field"><span class="st-label">Hero photo</span><div class="st-hero-thumb" id="pgHero">' + heroThumbHtml() + "</div></div></div></section>" +
      '<section class="st-card"><div class="st-card-head"><div><h2>Content</h2><p>Blocks in the order they appear. Headings break the page up; a call to action sends people to the office.</p></div></div><div class="st-blocks" id="pgBlocks">' + blocksHtml() + '</div><div class="st-addrow">' +
      ["h2", "p", "list", "cta", "image"].map(function (t) { return '<button type="button" class="st-btn st-btn--sm" data-addblock="' + t + '">' + I.plus + esc(BLOCK_LABEL[t]) + "</button>"; }).join("") + "</div></section>" +
      '<section class="st-card"><div class="st-card-head"><div><h2>Questions and answers</h2><p>Shown at the end of the page and marked up for search engines.</p></div></div><div class="st-faq" id="pgFaq">' + faqHtml() + '</div><div class="st-addrow"><button type="button" class="st-btn st-btn--sm" data-addfaq>' + I.plus + "Add a question</button></div></section>";
  }
  function rerenderBlocks() { var b = $("#pgBlocks"); if (b) b.innerHTML = blocksHtml(); }
  function rerenderFaq() { var f = $("#pgFaq"); if (f) f.innerHTML = faqHtml(); }
  function onPgInput(e) {
    var t = e.target; if (!pg || !pg.doc || !t.getAttribute) return false;
    if (t.hasAttribute("data-pk")) {
      var k = t.getAttribute("data-pk"), v = t.value;
      if (k === "slug") v = v.trim();
      if (same(pg.doc[k], v === "" && k !== "slug" ? null : v)) return true;
      pgSet(k, v === "" && k !== "slug" ? null : v);
      if (k === "title") topTitle.textContent = v || "Untitled page";
      if (k === "slug") topSub.textContent = "/templates/megacity-" + slugify(v);
      if (k === "kind") refreshPageHead();
      var cnt = $('[data-count-for="' + t.id + '"]', view); if (cnt) { var max = +cnt.getAttribute("data-max"); cnt.textContent = v.length + " / " + max; cnt.classList.toggle("is-over", v.length > max); }
      return true;
    }
    if (t.hasAttribute("data-bk")) { var i = +t.getAttribute("data-bi"), bk = t.getAttribute("data-bk"), b = pg.doc.blocks[i]; if (!b) return true; b[bk] = bk === "items" ? t.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean) : t.value; pgMark("blocks"); return true; }
    if (t.hasAttribute("data-fk")) { var fi = +t.getAttribute("data-fi"), fk = t.getAttribute("data-fk"), f = pg.doc.faq[fi]; if (!f) return true; f[fk] = t.value; pgMark("faq"); return true; }
    return false;
  }
  function pageClick(el) {
    var P = pg, d = P.doc;
    if (el.hasAttribute("data-addblock")) {
      var t = el.getAttribute("data-addblock");
      d.blocks.push(t === "list" ? { type: "list", items: [] } : t === "cta" ? { type: "cta", text: "Talk to the office", href: "megacity-contact-us" } : t === "image" ? { type: "image", mediaId: "", caption: "" } : { type: t, text: "" });
      pgMark("blocks"); rerenderBlocks();
      var last = $$("#pgBlocks .st-block").pop(), f = last && $("input,textarea", last); if (f) f.focus();
      if (t === "image") { var idx = d.blocks.length - 1; pickMedia(function (id) { if (pg !== P) return; d.blocks[idx].mediaId = id; pgMark("blocks"); rerenderBlocks(); }); }
      return true;
    }
    if (el.hasAttribute("data-bact")) {
      var act = el.getAttribute("data-bact"), i = +el.getAttribute("data-bi");
      if (act === "pick") { pickMedia(function (id) { if (pg !== P || !d.blocks[i]) return; d.blocks[i].mediaId = id; pgMark("blocks"); rerenderBlocks(); }); return true; }
      if (act === "up" && i > 0) { d.blocks.splice(i - 1, 0, d.blocks.splice(i, 1)[0]); }
      else if (act === "down" && i < d.blocks.length - 1) { d.blocks.splice(i + 1, 0, d.blocks.splice(i, 1)[0]); }
      else if (act === "delete") d.blocks.splice(i, 1);
      pgMark("blocks"); rerenderBlocks();
      var ni = act === "up" ? i - 1 : act === "down" ? i + 1 : Math.min(i, d.blocks.length - 1);
      var nb = $('#pgBlocks [data-bact="' + act + '"][data-bi="' + ni + '"]'); if (nb && !nb.disabled) nb.focus(); else { var any = $('#pgBlocks [data-bi="' + ni + '"] button'); if (any) any.focus(); }
      return true;
    }
    if (el.hasAttribute("data-addfaq")) { d.faq.push({ q: "", a: "" }); pgMark("faq"); rerenderFaq(); var lf = $$("#pgFaq input").pop(); if (lf) lf.focus(); return true; }
    if (el.hasAttribute("data-faq-rm")) { d.faq.splice(+el.getAttribute("data-faq-rm"), 1); pgMark("faq"); rerenderFaq(); return true; }
    if (el.hasAttribute("data-hero")) {
      if (el.getAttribute("data-hero") === "remove") { pgSet("heroMediaId", null); $("#pgHero").innerHTML = heroThumbHtml(); }
      else pickMedia(function (id) { if (pg !== P) return; pgSet("heroMediaId", id); var h = $("#pgHero"); if (h) h.innerHTML = heroThumbHtml(); });
      return true;
    }
    if (el.hasAttribute("data-pact")) { pageAction(el.getAttribute("data-pact"), el); return true; }
    return false;
  }
  function pageAction(act, btn) {
    var P = pg;
    if (act === "publish") {
      btn.disabled = true;
      flushPage(P).then(function () { return API.pages.publish(P.id); }).then(function (res) {
        if (pg !== P) return;
        var pl = $("#pgProblems");
        if (res.ok) { pgAdopt(res.page); toast("The page is live", { kind: "good" }); renderPage(); }
        else { if (pl) { pl.hidden = false; pl.innerHTML = (res.problems || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join(""); } btn.disabled = false; }
      }).catch(function (err) { errToast(err); btn.disabled = false; });
    } else if (act === "unpublish") {
      confirmModal({ title: "Take the page off the website?", body: "Visitors get a not-found page until you publish it again. Nothing is deleted.", confirm: "Unpublish" }).then(function (ok) {
        if (!ok || pg !== P) return;
        return API.pages.unpublish(P.id).then(function (res) { if (pg !== P) return; pgAdopt(res.page); toast("Page taken off the website"); renderPage(); });
      }).catch(errToast);
    } else if (act === "delete") {
      confirmModal({ title: "Delete this page?", body: "“" + (P.doc.title || "Untitled page") + "” is deleted for good, with its questions and answers. Photos stay with their listings.", confirm: "Delete page", danger: true }).then(function (ok) {
        if (!ok) return;
        return API.pages.remove(P.id).then(function () { pg = null; toast("Page deleted"); go("#/pages"); });
      }).catch(errToast);
    }
  }
  var pickCb = null;
  function pickMedia(cb) {
    pickCb = cb;
    openModal('<h2 id="modalTitle">Choose a photo</h2><div class="st-modal-body" id="pickBody">' + loading() + '</div><div class="st-modal-foot"><button type="button" class="st-btn" data-modal="cancel">Cancel</button></div>', { wide: true });
    ensureMediaIndex().then(function () {
      var body = $("#pickBody"); if (!body) return;
      var lists = state.mediaLists || [];
      body.innerHTML = '<p class="st-hint">Photos already on a listing — nothing is uploaded twice.</p><div class="st-select"><label class="st-vh" for="pickListing">Listing</label><select id="pickListing" data-pick-listing>' + lists.map(function (l, i) { return '<option value="' + i + '">' + esc(l.title) + " (" + l.media.length + ")</option>"; }).join("") + '</select></div><div class="st-picker" id="pickGrid" role="listbox" aria-label="Photos"></div>';
      renderPickGrid(0);
      var first = $("#pickGrid button"); if (first) first.focus();
    }).catch(function (err) { var body = $("#pickBody"); if (body) body.innerHTML = '<p class="st-err">' + esc(err.message || "Could not load the photos") + "</p>"; });
  }
  function renderPickGrid(i) {
    var l = (state.mediaLists || [])[i], g = $("#pickGrid"); if (!g) return;
    g.innerHTML = l && l.media.length ? l.media.map(function (m) { return '<button type="button" role="option" data-pick="' + esc(m.id) + '" aria-label="' + esc(m.roomLabel || m.alt || "Photo") + '"><img src="' + esc(m.thumb || m.url) + '" alt="" loading="lazy"></button>'; }).join("") : '<p class="st-hint">No photos on this listing yet.</p>';
  }
  modalWrap.addEventListener("change", function (e) { if (e.target.hasAttribute && e.target.hasAttribute("data-pick-listing")) renderPickGrid(+e.target.value); });
  function pageDraftDialog() {
    var P = pg; if (!P) return;
    openModal('<h2 id="modalTitle">Draft with AI</h2><div class="st-modal-body"><p>Claude drafts the page from a short brief and the homes we let there — no statistics, prices or claims that are not in the brief. You review it before anything changes.</p><form novalidate class="st-stack" id="draftForm">' +
      '<dl class="st-kv"><dt>Kind</dt><dd>' + esc(KIND_LABEL[P.doc.kind] || P.doc.kind) + "</dd></dl>" +
      fieldHtml({ label: "Area", name: "area", ph: "Salford", value: P.doc.kind === "area" ? (P.doc.title || "").replace(/^(renting|living) in /i, "") : "" }) +
      '<div class="st-field"><label class="st-label" for="f_brief">Brief <span class="st-opt">what the page should cover</span></label><textarea class="st-ta" id="f_brief" name="brief" rows="4" placeholder="Who it is for, what to mention, what to leave out"></textarea></div>' +
      '<p class="st-err" data-form-err role="alert" hidden></p><div class="st-modal-foot"><button type="button" class="st-btn" data-modal="cancel">Cancel</button><button type="submit" class="st-btn st-btn--fill">' + I.spark + "Draft it</button></div></form></div>", { wide: true });
    bindForm($("#draftForm"), function (d, form) {
      if (!d.area.trim() && !d.brief.trim()) throw new Error("Give the page a subject: an area, or a brief");
      var btn = $('button[type="submit"]', form);
      return aiRun(btn, API.ai.pageDraft({ kind: P.doc.kind, area: d.area.trim(), brief: d.brief.trim() })).then(function (r) {
        if (pg !== P) return;
        P.aiDraft = r;
        openModal('<h2 id="modalTitle">Review the draft</h2><div class="st-modal-body"><p><b>' + esc(r.title) + '</b></p><p class="st-hint">' + esc(r.seoDescription || "") + "</p><p>" + plural((r.blocks || []).length, "block") + " · " + plural((r.faq || []).length, "question") + '</p><ul class="st-log" style="max-height:240px">' +
          (r.blocks || []).map(function (b) { return "<li><b>" + esc(BLOCK_LABEL[b.type] || b.type) + "</b>&nbsp;" + esc(b.type === "list" ? (b.items || []).join(" · ") : b.text || "") + "</li>"; }).join("") +
          '</ul><p class="st-hint">Using it replaces the title, search text, content and questions on this page. Photos are not touched, and it saves as a draft.</p></div><div class="st-modal-foot"><button type="button" class="st-btn" data-modal="cancel">Keep mine</button><button type="button" class="st-btn st-btn--fill" data-usedraft data-focus>Use this draft</button></div>', { wide: true });
      }, function () { /* toasted by aiRun */ });
    });
  }
  function applyDraft() {
    var P = pg, r = P && P.aiDraft; closeModal(false); if (!r) return;
    P.doc.title = r.title || P.doc.title; P.doc.seoTitle = r.seoTitle || null; P.doc.seoDescription = r.seoDescription || null;
    P.doc.blocks = (r.blocks || []).map(function (b) { return b.type === "list" ? { type: "list", items: b.items || [] } : b.type === "cta" ? { type: "cta", text: b.text || "Talk to the office", href: "megacity-contact-us" } : { type: b.type === "h2" ? "h2" : "p", text: b.text || "" }; }).filter(function (b) { return b.type === "list" ? b.items.length : b.text; });
    P.doc.faq = (r.faq || []).filter(function (f) { return f.q && f.a; });
    ["title", "seoTitle", "seoDescription", "blocks", "faq"].forEach(function (k) { P.dirty[k] = true; });
    P.aiDraft = null; renderPage(); pgMark("blocks");
    toast("Draft applied — read it through before publishing", { kind: "good" });
  }

  /* ── backlinks ──────────────────────────────────────────────────── */
  var blRows = [], BL_STATUS = [["planned", "Planned"], ["requested", "Requested"], ["live", "Live"], ["lost", "Lost"]];
  var OUTREACH = [
    ["Local directory", "Subject: Listing Megacity Properties in your directory\n\nHello,\n\nWe are Megacity Properties, a lettings and property management agency in Manchester, based at The Tube Business Centre on North Street. Could we be listed in your directory?\n\nMegacity Properties\n<website address>\n0161 220 1763\ninfo@megacityproperties.co.uk\n\nHappy to send a logo or a short description in whatever format suits you.\n\nThank you,\n<your name>\nMegacity Properties"],
    ["Business association", "Subject: Our entry on your members page\n\nHello,\n\nMegacity Properties is a member of <association>. Could you check that our entry on the members page links to our website, <website address>? If there is a form or a preferred wording, tell me and I will send it straight back.\n\nThank you,\n<your name>\nMegacity Properties"],
    ["Partner mention", "Subject: A link between our websites\n\nHello <name>,\n\nWe work with you on <what you do together> and mention you on our website. Would you be open to a short mention of Megacity Properties on yours, linking to <website address>? One sentence is plenty, and I can suggest wording if that helps.\n\nThank you,\n<your name>\nMegacity Properties"]
  ];
  function blPill(s) { var l = BL_STATUS.filter(function (x) { return x[0] === s; })[0]; return '<span class="st-pill st-pill--' + esc(s) + '">' + esc(l ? l[1] : s) + "</span>"; }
  SCREENS.backlinks = function () {
    setTop({ title: "Backlinks" });
    view.innerHTML = '<p class="st-hint" style="margin-bottom:12px">Links are earned by asking. This list tracks the ones you have asked for and checks they are still there.</p>' +
      '<div class="st-toolbar"><div class="st-counts" id="blCounts" style="margin:0;flex:1 1 200px"></div><button type="button" class="st-btn" data-blact="check-all">Check all</button><button type="button" class="st-btn st-btn--fill" data-blact="add">' + I.plus + 'Add a link</button></div>' +
      '<div id="blBody">' + loading() + "</div>" +
      '<section class="st-card" style="margin-top:16px"><div class="st-card-head"><div><h2>Outreach templates</h2><p>Short and plain. Fill in the angle brackets before sending.</p></div></div><div class="st-tpl">' +
      OUTREACH.map(function (t) { return '<details class="st-details"><summary>' + esc(t[0]) + "</summary><div><pre>" + esc(t[1]) + '</pre><div class="st-actions"><button type="button" class="st-btn st-btn--sm" data-copy="' + esc(t[1]) + '">' + I.copy + "Copy email</button></div></div></details>"; }).join("") + "</div></section>";
    loadBacklinks();
  };
  function loadBacklinks() {
    return API.backlinks.list().then(function (res) {
      var body = $("#blBody"); if (!body) return;
      blRows = res.items || [];
      var c = res.counts || {}; var cnt = $("#blCounts"); if (cnt) cnt.innerHTML = BL_STATUS.map(function (s) { return '<span class="st-fchip">' + s[1] + " <b>" + (c[s[0]] || 0) + "</b></span>"; }).join("");
      body.innerHTML = blRows.length ? blTable(blRows) + blCards(blRows) : '<div class="st-empty">' + I.link + '<h3>No links tracked yet</h3><p>Add the first one you ask for — a local directory is a good start.</p><button type="button" class="st-btn st-btn--fill" data-blact="add">' + I.plus + "Add a link</button></div>";
    }).catch(function (err) { var b = $("#blBody"); if (b) b.innerHTML = errorHtml(err); });
  }
  function blActions(b) { return '<div class="st-actions"><button type="button" class="st-btn st-btn--sm" data-blact="check" data-bid="' + esc(b.id) + '">Check now</button><button type="button" class="st-btn st-btn--sm" data-blact="edit" data-bid="' + esc(b.id) + '">Edit</button><button type="button" class="st-btn st-btn--sm st-btn--danger" data-blact="delete" data-bid="' + esc(b.id) + '" aria-label="Delete link">' + I.trash + "</button></div>"; }
  function blHost(u) { try { return new URL(u).host + new URL(u).pathname.replace(/\/$/, ""); } catch (e) { return u; } }
  function blTable(rows) {
    return '<div class="st-tablewrap"><table class="st-table"><thead><tr><th scope="col">Source page</th><th scope="col">Points to</th><th scope="col">Anchor</th><th scope="col">Status</th><th scope="col">Last checked</th><th scope="col"><span class="st-vh">Actions</span></th></tr></thead><tbody>' + rows.map(function (b) {
      return '<tr data-bid="' + esc(b.id) + '" style="cursor:default"><td><a class="st-url" href="' + esc(b.sourceUrl) + '" target="_blank" rel="noopener" title="' + esc(b.sourceUrl) + '">' + esc(blHost(b.sourceUrl)) + "</a>" + (b.contact ? '<div class="st-sub">' + esc(b.contact) + "</div>" : "") + "</td><td><code>" + esc(b.targetPath) + "</code></td><td>" + esc(b.anchor || "—") + "</td><td>" + blPill(b.status) + "</td><td>" + (b.lastCheckedAt ? '<time datetime="' + esc(b.lastCheckedAt) + '">' + esc(rel(b.lastCheckedAt)) + "</time>" : '<span class="st-hint">never</span>') + (b.lastResult ? '<span class="st-result">' + esc(b.lastResult) + "</span>" : "") + "</td><td>" + blActions(b) + "</td></tr>";
    }).join("") + "</tbody></table></div>";
  }
  function blCards(rows) {
    return '<div class="st-cards">' + rows.map(function (b) { return '<article class="st-rcard" data-bid="' + esc(b.id) + '" style="grid-template-columns:1fr;cursor:default"><div style="min-width:0"><div class="st-title"><a href="' + esc(b.sourceUrl) + '" target="_blank" rel="noopener">' + esc(blHost(b.sourceUrl)) + '</a></div><div class="st-sub">→ ' + esc(b.targetPath) + (b.anchor ? " · “" + esc(b.anchor) + "”" : "") + '</div><div class="st-rmeta">' + blPill(b.status) + "<span>" + (b.lastCheckedAt ? "checked " + esc(rel(b.lastCheckedAt)) : "never checked") + "</span></div>" + (b.lastResult ? '<p class="st-msg">' + esc(b.lastResult) + "</p>" : "") + '<div style="margin-top:10px">' + blActions(b) + "</div></div></article>"; }).join("") + "</div>";
  }
  function backlinkDrawer(b) {
    var isNew = !b; b = b || { sourceUrl: "", targetPath: "/templates/megacity-skyline", anchor: "Megacity Properties", contact: "", notes: "", status: "planned" };
    openDrawer(isNew ? "Add a link" : "Edit link", '<form novalidate class="st-stack" id="blForm">' +
      fieldHtml({ label: "Source page", name: "sourceUrl", type: "url", required: true, value: b.sourceUrl, ph: "https://…", inputmode: "url", hint: "The page on their site that links, or will link, to ours." }) +
      fieldHtml({ label: "Points to", name: "targetPath", value: b.targetPath, ph: "/templates/megacity-skyline", hint: "The path on our site they should link to." }) +
      fieldHtml({ label: "Anchor text", name: "anchor", value: b.anchor, ph: "Megacity Properties" }) +
      fieldHtml({ label: "Contact", name: "contact", value: b.contact, ph: "Name or email at the other end", auto: "off" }) +
      '<div class="st-field"><label class="st-label" for="f_notes">Notes</label><textarea class="st-ta" id="f_notes" name="notes" rows="3">' + esc(b.notes || "") + "</textarea></div>" +
      selectHtml({ label: "Status", name: "status", noEmpty: true, value: b.status, options: BL_STATUS.map(function (s) { return { value: s[0], label: s[1] }; }) }) +
      '<p class="st-err" data-form-err role="alert" hidden></p><button type="submit" class="st-btn st-btn--fill">' + (isNew ? "Add the link" : "Save changes") + "</button></form>", function (body) {
        bindForm($("#blForm", body), function (d) {
          if (!/^https?:\/\/\S+$/i.test(d.sourceUrl.trim())) throw new Error("The source page must be a full address starting with https://");
          var payload = { sourceUrl: d.sourceUrl.trim(), targetPath: d.targetPath.trim() || "/", anchor: d.anchor.trim(), contact: d.contact.trim(), notes: d.notes.trim(), status: d.status };
          return (isNew ? API.backlinks.create(payload) : API.backlinks.patch(b.id, payload)).then(function () { closeDrawer(); toast(isNew ? "Link added" : "Saved", { kind: "good" }); loadBacklinks(); });
        });
      });
  }
  function backlinkAction(act, id, btn) {
    var row = blRows.filter(function (x) { return x.id === id; })[0];
    if (act === "add") return backlinkDrawer(null);
    if (act === "edit") return backlinkDrawer(row);
    if (act === "check") { btn.disabled = true; return API.backlinks.check(id).then(function (b) { var i = blRows.findIndex(function (x) { return x.id === id; }); if (i >= 0) blRows[i] = b; var body = $("#blBody"); if (body) body.innerHTML = blTable(blRows) + blCards(blRows); toast(b.lastResult || "Checked"); }).catch(function (err) { errToast(err); btn.disabled = false; }); }
    if (act === "check-all") { btn.disabled = true; return API.backlinks.checkAll().then(function (r) { toast("Checking " + plural(r.checking || 0, "link") + " — the list refreshes in a few seconds"); setTimeout(function () { if ($("#blBody")) loadBacklinks(); if (document.contains(btn)) btn.disabled = false; }, 8000); }).catch(function (err) { errToast(err); btn.disabled = false; }); }
    if (act === "delete") return confirmModal({ title: "Delete this link?", body: "Only the record here is removed — nothing changes on their site.", confirm: "Delete", danger: true }).then(function (ok) { if (!ok) return; return API.backlinks.remove(id).then(function () { toast("Deleted"); loadBacklinks(); }); }).catch(errToast);
  }

  /* ── integrations ───────────────────────────────────────────────── */
  SCREENS.integrations = function () {
    setTop({ title: "Integrations" });
    view.innerHTML = loading();
    var owner = state.user && state.user.role === "owner";
    Promise.all([API.settings.get(), aiOn() ? API.ai.usage().catch(function () { return null; }) : Promise.resolve(null)]).then(function (r) {
      var s = r[0].settings || {}, usage = r[1], ro = owner ? "" : " readonly";
      var lockNote = owner ? "" : '<p class="st-lock">' + I.key + "Only the owner can change the three IDs above. The banner wording is yours to edit.</p>";
      view.innerHTML = '<div class="st-stack" style="max-width:860px">' +
        '<section class="st-card"><div class="st-card-head"><div><h2>Analytics and pixels</h2><p>Nothing here loads for visitors until they accept the cookie banner.</p></div></div><form novalidate class="st-form" id="intForm">' +
        '<div class="st-field c6"><label class="st-label" for="f_ga4Id">Google Analytics 4</label><input class="st-in" id="f_ga4Id" name="ga4Id" value="' + esc(s.ga4Id || "") + '" placeholder="G-XXXXXXXXXX" autocomplete="off" spellcheck="false"' + ro + '><span class="st-hint">Measures visits, listing views and enquiries. The measurement ID looks like G-XXXXXXXXXX.</span></div>' +
        '<div class="st-field c6"><label class="st-label" for="f_metaPixelId">Meta Pixel</label><input class="st-in" id="f_metaPixelId" name="metaPixelId" value="' + esc(s.metaPixelId || "") + '" placeholder="Digits only" inputmode="numeric" autocomplete="off"' + ro + '><span class="st-hint">Lets Facebook and Instagram ads count enquiries. The pixel ID is a long number.</span></div>' +
        '<div class="st-field"><label class="st-label" for="f_gscVerification">Google Search Console verification</label><input class="st-in" id="f_gscVerification" name="gscVerification" value="' + esc(s.gscVerification || "") + '" autocomplete="off" spellcheck="false"' + ro + '><span class="st-hint">Proves to Google that this is our site so it reports search clicks and indexing. In Search Console choose the HTML tag method and paste only the <code>content</code> value of the meta tag it gives you; the site puts the tag on every page.</span></div>' +
        '<div class="st-field"><label class="st-label" for="f_consentText">Cookie banner wording</label><textarea class="st-ta" id="f_consentText" name="consentText" rows="3">' + esc(s.consentText || "") + '</textarea><span class="st-hint">Shown on the banner every visitor sees first. Analytics and the pixel only load once they accept.</span></div>' +
        lockNote + '<p class="st-err" data-form-err role="alert" hidden></p><div class="st-actions st-actions--end"><button type="submit" class="st-btn st-btn--fill">Save changes</button></div></form></section>' +
        '<section class="st-card"><div class="st-card-head"><div><h2>AI</h2><p>' + (aiOn() ? "Claude writes listing copy, share kits and page drafts from the facts in the Studio; staff review before anything is saved." : "") + "</p></div></div>" +
        (aiOn() ? usageHtml(usage) : '<p class="st-hint">AI is off until the ANTHROPIC_API_KEY secret is added.</p>') + "</section></div>";
      bindForm($("#intForm"), function (d) {
        var partial = { consentText: d.consentText.trim() };
        if (owner) { partial.ga4Id = d.ga4Id.trim(); partial.metaPixelId = d.metaPixelId.trim(); partial.gscVerification = d.gscVerification.trim(); }
        return API.settings.put(partial).then(function () { toast("Saved", { kind: "good" }); });
      });
    }).catch(showError);
  };
  function usageHtml(u) {
    var rows = (u && u.last30) || [];
    if (!rows.length) return '<p class="st-hint">No AI calls in the last 30 days.</p>';
    return '<table class="st-usage"><caption class="st-vh">AI calls in the last 30 days</caption><thead><tr><th scope="col">What</th><th scope="col" style="text-align:right">Calls</th><th scope="col" style="text-align:right">Worked</th><th scope="col" style="text-align:right">Tokens in / out</th></tr></thead><tbody>' + rows.map(function (r) { return "<tr><td>" + esc(r.route) + '</td><td class="num">' + esc(r.calls) + '</td><td class="num">' + esc(r.ok) + '</td><td class="num">' + esc((r.inputTokens || 0).toLocaleString("en-GB")) + " / " + esc((r.outputTokens || 0).toLocaleString("en-GB")) + "</td></tr>"; }).join("") + "</tbody></table>";
  }

  /* ── global delegation, shortcuts, init ──────────────────────────── */
  view.addEventListener("input", function (e) { if (pg && onPgInput(e)) return; onEdInput(e); });
  view.addEventListener("change", function (e) { if (teamAction(e)) return; if (pg && onPgInput(e)) return; onEdInput(e); });
  view.addEventListener("click", function (e) {
    if (e.target.closest("[data-import]")) { runImport(); return; }
    if (e.target.closest("[data-retry-route]")) { route(); return; }
    var c = e.target.closest("[data-copy]");
    if (c) { copyText(c.getAttribute("data-copy")).then(function () { toast("Copied"); }, function () { toast("Copy failed", { kind: "warn" }); }); return; }
    if (teamAction(e)) return;
    var aiBtn = e.target.closest("[data-ai]"); if (aiBtn) { aiAction(aiBtn.getAttribute("data-ai"), aiBtn); return; }
    var aiUse = e.target.closest("[data-ai-use]"); if (aiUse) { var uk = aiUse.getAttribute("data-ai-use"); if (uk === "*") AI_FIELDS.forEach(function (f) { aiApplyField(f[0]); }); else aiApplyField(uk); return; }
    if (e.target.closest("[data-ai-dismiss]")) { var rp = $("#aiReviewPanel"); if (rp) rp.parentNode.removeChild(rp); return; }
    var mai = e.target.closest("[data-mai]"); if (mai) { mediaAi(mai.getAttribute("data-mai"), mai.getAttribute("data-mid"), mai); return; }
    if (e.target.closest("[data-newpage]")) { newPageDrawer(); return; }
    if (pg) { var pa = e.target.closest("[data-pact],[data-bact],[data-addblock],[data-addfaq],[data-faq-rm],[data-hero]"); if (pa && pageClick(pa)) return; }
    var blb = e.target.closest("[data-blact]"); if (blb) { backlinkAction(blb.getAttribute("data-blact"), blb.getAttribute("data-bid"), blb); return; }
    if (!ed) return;
    var ea = e.target.closest("[data-eact]"); if (ea) { editorAction(ea.getAttribute("data-eact"), ea); return; }
    var ma = e.target.closest("[data-mact]"); if (ma) { mediaAction(ma.getAttribute("data-mact"), ma.getAttribute("data-mid")); return; }
    if (e.target.closest("[data-dismiss]")) { var row = e.target.closest(".st-upl"); if (row) row.parentNode.removeChild(row); return; }
    var ta = e.target.closest("[data-tact]"); if (ta) { tourAction(ta.getAttribute("data-tact"), ta); }
  });
  document.addEventListener("click", function (e) {
    if (e.target.closest("#btnBell")) { toggleBell(); return; }
    if (!e.target.closest("#bellWrap")) closeBell();
    var ni = e.target.closest("#bellMenu [data-nid]"); if (ni) { openNotification(ni); return; }
    if (e.target.closest("#bellMenu [data-read-all]")) { markAllRead(); return; }
    if (e.target.closest("#userMenu > button")) { closeBell(); toggleUserMenu(); return; }
    if (!e.target.closest("#userMenu")) closeUserMenu();
    if (!e.target.closest(".st-rowact")) closeRowMenus();
    if (e.target.closest("[data-signout]")) { signOut(); return; }
    if (e.target.closest("[data-more]")) { openMore(); return; }
    if (e.target.closest("[data-cmdk]")) { closeDrawer(); openCmdk(); return; }
  });
  document.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && String(e.key).toLowerCase() === "k") { e.preventDefault(); if (cmdkWrap.hidden) openCmdk(); else closeCmdk(); return; }
    if (e.key === "Escape") {
      if (!cmdkWrap.hidden) { closeCmdk(); return; }
      if (!modalWrap.hidden) { if (!modalNoEsc) closeModal(false); return; }
      if (!drawerWrap.hidden) { closeDrawer(); return; }
      if (bellOpen) { closeBell(); var bb = $("#btnBell"); if (bb) bb.focus(); return; }
      closeRowMenus(); closeUserMenu(); return;
    }
    if (e.key === "n" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e) && state.user && state.route && state.route.name === "listings" && modalWrap.hidden && drawerWrap.hidden && cmdkWrap.hidden) { e.preventDefault(); go("#/listings/new"); }
  });
  document.addEventListener("studio:signedout", function () {
    if (!state.user) return;
    state.user = null; state.listIndex = null; ed = null; stopNotifPoll(); stopTourPoll();
    state.intended = location.hash && location.hash !== "#/login" ? location.hash : null;
    toast("Your session has ended — sign in again to carry on", { kind: "warn" });
    go("#/login");
  });
  boot();
})();

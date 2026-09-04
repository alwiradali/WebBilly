/* Megacity Properties — cookie consent + analytics loader.
   Injected by the Worker only when a GA4 measurement ID, a Google Tag Manager
   container ID or a Meta Pixel ID is set in the Studio (Settings →
   Integrations). Nothing loads until the visitor accepts: Google Consent
   Mode v2 starts denied, and gtag.js / gtm.js / fbevents.js are fetched only
   after "Accept all". Essential-only leaves the page as it is. The choice is
   kept in localStorage (mc_consent) for six months. */
(function () {
  "use strict";
  var s = document.currentScript;
  if (!s) return;
  var GA = s.getAttribute("data-ga") || "";
  var PIXEL = s.getAttribute("data-pixel") || "";
  var GTM = s.getAttribute("data-gtm") || "";
  var PRIVACY = s.getAttribute("data-privacy") || "megacity-privacy";
  var TEXT = s.getAttribute("data-text") || "We use cookies to understand how the site is used and to measure our advertising. Essential cookies keep the site working.";
  if (!GA && !PIXEL && !GTM) return;
  var KEY = "mc_consent";
  var queue = [];

  function read() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || "null");
      if (v && v.exp > Date.now()) return v.choice;
    } catch (e) { }
    return null;
  }
  function write(choice) {
    try { localStorage.setItem(KEY, JSON.stringify({ choice: choice, exp: Date.now() + 182 * 864e5 })); } catch (e) { }
  }

  /* ── the trackers, loaded only after consent ─────────────────────────── */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
  gtag("consent", "default", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied", wait_for_update: 500 });

  function loadGA() {
    if (!GA || document.getElementById("mc-gtag")) return;
    var el = document.createElement("script");
    el.id = "mc-gtag"; el.async = true;
    el.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA);
    document.head.appendChild(el);
    gtag("js", new Date());
    gtag("config", GA, { anonymize_ip: true });
  }
  function loadGTM() {
    if (!GTM || document.getElementById("mc-gtm")) return;
    /* the standard Tag Manager snippet, unchanged */
    window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    var el = document.createElement("script");
    el.id = "mc-gtm"; el.async = true;
    el.src = "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(GTM);
    document.head.appendChild(el);
  }
  function loadPixel() {
    if (!PIXEL || window.fbq) return;
    /* the standard Meta base snippet, unchanged */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", PIXEL);
    window.fbq("track", "PageView");
  }
  function grant() {
    gtag("consent", "update", { ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted", analytics_storage: "granted" });
    loadGA(); loadGTM(); loadPixel();
    queue.splice(0).forEach(function (q) { window.mcTrack(q[0], q[1]); });
  }

  /* one call from the site scripts, fanned out to whatever is allowed */
  var granted = false;
  window.mcTrack = function (name, params) {
    if (!granted) { queue.push([name, params]); return; }
    try { if (GA && window.gtag) window.gtag("event", name, params || {}); } catch (e) { }
    try { if (GTM && !GA) window.dataLayer.push(Object.assign({ event: name }, params || {})); } catch (e) { }
    try {
      if (PIXEL && window.fbq) {
        var std = { generate_lead: "Lead", viewing_request: "Schedule", listing_view: "ViewContent", tour_open: "ViewContent" }[name];
        if (std) window.fbq("track", std, params || {}); else window.fbq("trackCustom", name, params || {});
      }
    } catch (e) { }
  };

  /* ── the banner ──────────────────────────────────────────────────────── */
  function banner() {
    var css = "#mcConsent{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;max-width:520px;margin:0 auto;background:#fff;color:#1D2049;border:1px solid rgba(29,32,73,.16);border-radius:18px;box-shadow:0 24px 60px rgba(12,14,34,.28);padding:18px 20px;font:15px/1.55 Inter,system-ui,-apple-system,Segoe UI,sans-serif}" +
      "#mcConsent h2{margin:0 0 6px;font:700 17px/1.3 'Playfair Display',Georgia,serif}#mcConsent p{margin:0 0 14px;color:#48506B}" +
      "#mcConsent .mcc-row{display:flex;flex-wrap:wrap;gap:8px}#mcConsent button{font:600 14px/1 Inter,system-ui,sans-serif;padding:12px 18px;border-radius:999px;border:1px solid #1D2049;background:#fff;color:#1D2049;cursor:pointer}" +
      "#mcConsent button.mcc-yes{background:#1D2049;color:#fff}#mcConsent button:focus-visible{outline:2px solid #2E90B8;outline-offset:2px}#mcConsent a{color:#176B99}" +
      "@media (max-width:480px){#mcConsent{left:8px;right:8px;bottom:8px;padding:16px}}";
    var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    var box = document.createElement("div");
    box.id = "mcConsent"; box.setAttribute("role", "dialog"); box.setAttribute("aria-labelledby", "mccTitle"); box.setAttribute("data-lenis-prevent", "");
    box.innerHTML = '<h2 id="mccTitle">Cookies</h2><p>' + TEXT.replace(/&/g, "&amp;").replace(/</g, "&lt;") + ' <a href="' + PRIVACY.replace(/"/g, "") + '">Privacy &amp; cookies</a></p>' +
      '<div class="mcc-row"><button type="button" class="mcc-yes" data-c="all">Accept all</button><button type="button" data-c="essential">Essential only</button></div>';
    document.body.appendChild(box);
    box.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-c]");
      if (!b) return;
      write(b.getAttribute("data-c"));
      box.remove();
      if (b.getAttribute("data-c") === "all") { granted = true; grant(); }
    });
  }

  var choice = read();
  if (choice === "all") { granted = true; grant(); }
  else if (!choice) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", banner); else banner();
  }
  /* a "Cookie settings" link anywhere on the site re-opens the choice */
  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-cookie-settings]");
    if (!a) return;
    e.preventDefault();
    try { localStorage.removeItem(KEY); } catch (err) { }
    if (!document.getElementById("mcConsent")) banner();
  });
})();

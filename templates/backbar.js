/* ============================================================
   Billy Digitals — Template "Back to site" pill
   A single, always-visible escape hatch on every sample template
   so a visitor can return to the main Billy Digitals homepage no
   matter how they got here (direct link, new tab, or the in-site
   preview overlay). Uses target="_top" so it breaks out of the
   preview iframe and loads the real homepage. Self-contained —
   no CSS or markup dependency on the template itself.
   ============================================================ */
(function () {
  "use strict";
  var pill = document.createElement("a");
  pill.href = "../index.html";
  pill.target = "_top";                 // break out of the preview iframe
  pill.rel = "noopener";
  pill.className = "bd-backpill";
  pill.setAttribute("aria-label", "Back to Billy Digitals homepage");
  pill.innerHTML =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" ' +
    'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M15 6l-6 6 6 6"/></svg><span>Billy Digitals</span>';

  var css = document.createElement("style");
  css.textContent =
    ".bd-backpill{position:fixed;left:16px;bottom:16px;z-index:2147483000;" +
    "display:inline-flex;align-items:center;gap:7px;padding:10px 16px 10px 11px;" +
    "border-radius:999px;font:600 14px/1 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;" +
    "color:#fff;background:linear-gradient(100deg,#1d6ff5,#0891b2);" +
    "box-shadow:0 10px 30px rgba(0,0,0,.42);text-decoration:none;opacity:.95;" +
    "transition:transform .25s ease,opacity .25s ease,box-shadow .25s ease;-webkit-tap-highlight-color:transparent}" +
    ".bd-backpill:hover{opacity:1;transform:translateY(-2px);box-shadow:0 14px 38px rgba(0,0,0,.5)}" +
    ".bd-backpill svg{flex:none}" +
    "@media print{.bd-backpill{display:none}}";

  // If we're being previewed inside the in-site viewer (an iframe on the
  // homepage), the pill should just close the viewer — one clean click,
  // no full reload, and it lands you back exactly where you were with the
  // carousel still on this style. Otherwise (opened directly / new tab)
  // it keeps its normal link to the homepage.
  var inFrame = false;
  try { inFrame = window.parent && window.parent !== window; } catch (e) { inFrame = true; }
  if (inFrame) {
    pill.addEventListener("click", function (e) {
      e.preventDefault();
      try { window.parent.postMessage({ bdCloseViewer: true }, "*"); }
      catch (err) { window.top.location.href = "../index.html"; }
    });
  }

  function mount() {
    if (!document.body) return;
    document.head.appendChild(css);
    document.body.appendChild(pill);
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();

/* ═══════════════════════════════════════════════════════════════════════════
   HALCYON · DROP-IN PROPERTY WIDGET
   Put Halcyon listings (and their 360 tours) inside ANY estate agency website
   without rebuilding it — WordPress, Squarespace, Webflow, GoDaddy, custom.

     <div data-halcyon="featured"></div>
     <script src="https://your-domain.com/halcyon/embed.js"></script>

   data-halcyon values:
     "featured"          the current featured collection
     "search"            a mini search box that deep-links into the platform
     "property:<id>"     one property card
   Options: data-max="6"  data-theme="light|dark"

   The widget renders an <iframe> onto /halcyon/widget.html so the host page
   needs no CSS, no framework and inherits nothing. The 360 button inside the
   card launches the billy360 tour exactly as it does on the platform itself:

     Host website → Halcyon widget → Halcyon property API → billy360 tours
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var here = (function () {
    var s = document.currentScript;
    if (!s) {
      var all = document.getElementsByTagName("script");
      for (var i = all.length - 1; i >= 0; i--) if (/halcyon\/embed\.js(\?|$)/.test(all[i].src || "")) { s = all[i]; break; }
    }
    return s ? s.src.replace(/embed\.js(\?.*)?$/, "") : "/halcyon/";
  })();

  function build(host) {
    if (host.getAttribute("data-halcyon-done")) return;
    host.setAttribute("data-halcyon-done", "1");
    var kind = host.getAttribute("data-halcyon") || "featured";
    var max = host.getAttribute("data-max") || "6";
    var theme = host.getAttribute("data-theme") || "light";
    var frame = document.createElement("iframe");
    frame.src = here + "widget.html?kind=" + encodeURIComponent(kind) + "&max=" + encodeURIComponent(max) + "&theme=" + encodeURIComponent(theme);
    frame.title = "Halcyon properties";
    frame.loading = "lazy";
    frame.style.cssText = "display:block;width:100%;border:0;min-height:420px";
    frame.setAttribute("allowfullscreen", "");
    host.appendChild(frame);
    /* auto-height: widget posts its size */
    addEventListener("message", function (e) {
      if (e.data && e.data.halcyonHeight && e.source === frame.contentWindow) frame.style.height = e.data.halcyonHeight + "px";
    });
  }

  function scan() {
    var hosts = document.querySelectorAll("[data-halcyon]:not([data-halcyon-done])");
    for (var i = 0; i < hosts.length; i++) build(hosts[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan);
  else scan();
  window.HalcyonEmbed = { scan: scan, base: here };
})();

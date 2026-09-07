/* ═══════════════════════════════════════════════════════════════════════════
   BILLY360 · DROP-IN EMBED
   For the website the agency already has. Put this on the page once and mark
   up each spot you want a tour in:

     <div data-billy360="willow-lane-12"></div>
     <script src="/billy360/embed.js" defer></script>

   Options, all optional, as data- attributes on the div:
     data-height="640"     pixels, or "16:9" / "4:3" for an aspect ratio
                           (default 16:9; phones under 700 px get 4:5 unless
                           data-height-phone says otherwise)
     data-room="kitchen"   open on a particular position (default: the cover)
     data-chrome="1"       keep the portfolio chrome inside the frame
     data-lazy="0"         load immediately instead of on scroll

   data-billy360="*" shows the folder deployment's whole portfolio. It is not
   for Studio-backed pages — those have one tour per listing.

   It writes a plain <iframe>. No stylesheet, no globals, no dependency on the
   host page's framework — it works the same in WordPress, Wix, Squarespace,
   Webflow, a Rightmove microsite or a hand-written HTML page.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* where this script is being served from — the tour lives next to it */
  var here = (function () {
    var s = document.currentScript;
    if (!s) {
      var all = document.getElementsByTagName("script");
      for (var i = all.length - 1; i >= 0; i--) {
        if (/embed\.js(\?|$)/.test(all[i].src || "")) { s = all[i]; break; }
      }
    }
    return s ? s.src.replace(/embed\.js(\?.*)?$/, "") : "./";
  })();

  var RATIO = /^(\d+):(\d+)$/;
  var hasAspect = (function () { try { return !!(window.CSS && CSS.supports && CSS.supports("aspect-ratio", "1 / 1")); } catch (e) { return false; } })();
  function phone() { return (window.innerWidth || document.documentElement.clientWidth || 1024) < 700; }
  /* a Studio-backed listing page: one tour per listing, so "*" would only ever show a demo portfolio (F85) */
  function studioPage() { return !!document.querySelector(".pd-tour, [data-billy360][data-title]"); }

  /* which box each host wants: pixels, or a ratio (16:9 desktop, 4:5 on phones) */
  function shape(host) {
    var h = host.getAttribute("data-height") || "16:9";
    var m = RATIO.exec(h);
    if (!m) return { px: parseInt(h, 10) || 640 };
    if (phone()) { var p = RATIO.exec(host.getAttribute("data-height-phone") || "4:5"); if (p) m = p; }
    return { w: +m[1], h: +m[2] };
  }

  /* reserve the space before anything downloads, so the page never shifts (F225) */
  function reserve(host) {
    var s = shape(host);
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    if (s.px) { host.style.height = s.px + "px"; return; }
    if (hasAspect) host.style.aspectRatio = s.w + " / " + s.h;
    else if (!host.style.paddingTop) host.style.paddingTop = (100 * s.h / s.w).toFixed(4) + "%";
    if (!host.style.minHeight) host.style.minHeight = phone() ? "60vh" : "280px";
  }

  function build(host) {
    if (host.getAttribute("data-billy360-done")) return;
    host.setAttribute("data-billy360-done", "1");
    reserve(host);

    var id = host.getAttribute("data-billy360") || "";
    var room = host.getAttribute("data-room") || "";
    var chrome = host.getAttribute("data-chrome") === "1";
    var single = !!id && id !== "*";
    if (!single && studioPage()) console.warn('billy360 embed: data-billy360="*" shows the demo portfolio, not this site\'s tours — use the listing id instead.');

    var url = here;
    if (single) url += "?site=" + encodeURIComponent(id) + (chrome ? "" : "&embed=1");
    else if (!chrome) url += "?embed=1";
    /* straight into the walkthrough: the named room, or the cover room when none is given (F80) */
    url += single ? "#/tour" + (room ? "/" + encodeURIComponent(room) : "") : "#/sites";

    var frame = document.createElement("iframe");
    frame.src = url;
    frame.title = host.getAttribute("data-title") || "360° virtual tour";
    frame.loading = "lazy";
    frame.allow = "fullscreen; accelerometer; gyroscope; web-share; clipboard-write";
    frame.setAttribute("allowfullscreen", "");
    frame.style.cssText = "display:block;position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:16px;background:#0B0C0E";
    host.appendChild(frame);

    /* the viewer says how tall it wants to be when a sheet opens — never shrink */
    window.addEventListener("message", function (e) {
      var d = e.data;
      if (!d || d.source !== "billy360" || d.type !== "billy360:height" || e.source !== frame.contentWindow) return;
      var px = Math.round(+d.px || 0);
      if (px > 0 && px > (parseFloat(host.style.minHeight) || 0) && px > host.getBoundingClientRect().height) host.style.minHeight = Math.min(px, window.innerHeight || px) + "px";
    });
  }

  function scan() {
    var hosts = document.querySelectorAll("[data-billy360]:not([data-billy360-done])");
    for (var i = 0; i < hosts.length; i++) {
      var host = hosts[i];
      reserve(host);
      if (host.getAttribute("data-lazy") === "0" || !("IntersectionObserver" in window)) {
        build(host);
        continue;
      }
      /* a listing page can carry twenty of these — only build what is on screen */
      observer.observe(host);
    }
  }

  var observer = ("IntersectionObserver" in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      observer.unobserve(e.target);
      build(e.target);
    });
  }, { rootMargin: "400px" }) : null;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan);
  else scan();

  /* the host page can add tours later — infinite scroll, a filter, a modal */
  window.BILLY360Embed = { scan: scan, mount: build, base: here };
})();

/* ═══════════════════════════════════════════════════════════════════════════
   BILLY360 · DROP-IN EMBED
   For the website the agency already has. Put this on the page once and mark
   up each spot you want a tour in:

     <div data-billy360="willow-lane-12"></div>
     <script src="/tours/embed.js"></script>

   Options, all optional, as data- attributes on the div:
     data-height="640"     pixels, or "16:9" / "4:3" for an aspect ratio
     data-room="kitchen"   open on a particular position
     data-chrome="1"       keep the portfolio chrome inside the frame
     data-lazy="0"         load immediately instead of on scroll

   Use data-billy360="*" for the whole portfolio rather than one property.

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

  function build(host) {
    if (host.getAttribute("data-billy360-done")) return;
    host.setAttribute("data-billy360-done", "1");

    var id = host.getAttribute("data-billy360") || "";
    var room = host.getAttribute("data-room") || "";
    var chrome = host.getAttribute("data-chrome") === "1";
    var h = host.getAttribute("data-height") || "640";

    var url = here;
    if (id && id !== "*") url += "?site=" + encodeURIComponent(id) + (chrome ? "" : "&embed=1");
    else if (!chrome) url += "?embed=1";
    url += (id && id !== "*" && room) ? "#/tour/" + encodeURIComponent(room)
      : (id && id !== "*") ? "" : "#/sites";

    var frame = document.createElement("iframe");
    frame.src = url;
    frame.title = host.getAttribute("data-title") || "360° virtual tour";
    frame.loading = "lazy";
    frame.allow = "fullscreen; accelerometer; gyroscope; magnetometer; xr-spatial-tracking";
    frame.setAttribute("allowfullscreen", "");
    frame.style.cssText = "display:block;width:100%;border:0;border-radius:16px;background:#0B0C0E";

    var ratio = /^(\d+):(\d+)$/.exec(h);
    if (ratio) {
      /* aspect-ratio, with a padding fallback for older browsers */
      var box = document.createElement("div");
      box.style.cssText = "position:relative;width:100%;padding-top:" +
        (100 * (+ratio[2] / +ratio[1])).toFixed(4) + "%";
      frame.style.cssText += ";position:absolute;inset:0;height:100%";
      box.appendChild(frame);
      host.appendChild(box);
    } else {
      frame.style.height = (parseInt(h, 10) || 640) + "px";
      host.appendChild(frame);
    }
  }

  function scan() {
    var hosts = document.querySelectorAll("[data-billy360]:not([data-billy360-done])");
    for (var i = 0; i < hosts.length; i++) {
      var host = hosts[i];
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

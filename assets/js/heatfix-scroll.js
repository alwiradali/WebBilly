/* HeatFix — where the page sits after a reload.
 *
 * Two things used to send a visitor back down the page when they refreshed at
 * the top:
 *
 *   1. The nav links are in-page anchors, so tapping Services or Contact puts
 *      #services in the address bar. Scrolling back up by hand does not remove
 *      it, and a refresh honours the hash and jumps straight back down.
 *   2. Browsers restore their own scroll position on reload, which on a page
 *      this tall lands somewhere arbitrary once lazy images have settled.
 *
 * So: the browser is told not to restore the position itself, and once the
 * visitor is genuinely back at the top the stale hash is dropped from the URL.
 * Anchors still work — this only clears one that is no longer where you are.
 */
(function () {
  if ('scrollRestoration' in history) {
    try { history.scrollRestoration = 'manual'; } catch (e) {}
  }

  var timer;
  function tidy() {
    if (window.scrollY < 4 && location.hash) {
      try {
        history.replaceState(null, '', location.pathname + location.search);
      } catch (e) {}
    }
  }
  addEventListener('scroll', function () {
    clearTimeout(timer);
    timer = setTimeout(tidy, 220);
  }, { passive: true });

  /* A reload with no hash should start at the top, not wherever the browser
     decides once the tall sections have laid themselves out. */
  if (!location.hash) {
    addEventListener('load', function () {
      if (window.scrollY < 3) window.scrollTo(0, 0);
    });
  }
})();

/* ---- the menu, for anyone not using a mouse ----
 *
 * Every page that uses this drawer carries its own inline open/close handler.
 * This adds only what all of them were missing, in one place rather than
 * twelve: Escape to shut it, a tap on the space around the links to shut it,
 * focus moved into the menu when it opens and handed back to the button when
 * it closes, and Tab kept inside it while it is open.
 *
 * It deliberately lives here rather than in heatfix-links.js, which returns
 * immediately unless the page is being previewed under /templates/ — code put
 * there would have worked everywhere except his own website.
 */
(function () {
  var drawer = document.getElementById("drawer");
  var burger = document.getElementById("burger");
  if (!drawer || !burger || !drawer.classList.contains("drawer")) return;

  function isOpen() { return drawer.classList.contains("on"); }
  function close(restore) {
    drawer.classList.remove("on");
    burger.classList.remove("on");
    burger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (restore) burger.focus();
  }

  /* addEventListener runs after the page's own inline onclick, so by now the
     class reflects the new state. */
  burger.addEventListener("click", function () {
    if (!isOpen()) return;
    var first = drawer.querySelector("a");
    if (first) first.focus();
  });

  drawer.addEventListener("click", function (e) {
    if (e.target === drawer) close(true);        /* the space around the links */
  });

  document.addEventListener("keydown", function (e) {
    if (!isOpen()) return;
    if (e.key === "Escape") { close(true); return; }
    if (e.key !== "Tab") return;
    var items = drawer.querySelectorAll("a");
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
})();

/* ---- anchor jumps that land where they should ----
 *
 * Tapping "Contact" scrolled to the right place and then stopped being the
 * right place. The reveal animations above the target finish a moment after
 * the jump, each one settling from a translate into its final position, and
 * everything below shifts by the total. The browser's scroll was correct when
 * it happened and wrong a heartbeat later, which is why the form kept ending
 * up just off the top of the screen.
 *
 * So the jump is taken over here: scroll with the fixed header's height
 * subtracted, then re-measure once the animations have run and correct
 * silently. Anything that is not a same-page anchor is left alone.
 */
(function () {
  function headroom() { return window.innerWidth <= 900 ? 86 : 116; }

  function goTo(el, smooth) {
    var y = el.getBoundingClientRect().top + (window.pageYOffset || 0) - headroom();
    window.scrollTo({ top: y < 0 ? 0 : y, behavior: smooth ? "smooth" : "auto" });
  }

  /* "#quote", "/#quote" and "/index.html#quote" all mean this page when this
     page is the one being linked to; anything else is a real navigation. */
  function samePage(path) {
    if (!path) return true;
    if (path === location.pathname) return true;
    return path === "/" && (location.pathname === "/" ||
      /(^|\/)(index|heatfixmcr)\.html$/.test(location.pathname));
  }

  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href*="#"]');
    if (!a || a.target === "_blank") return;
    var href = a.getAttribute("href") || "";
    var cut = href.indexOf("#");
    var id = href.slice(cut + 1);
    if (!id || !samePage(href.slice(0, cut))) return;
    var el = document.getElementById(id);
    if (!el) return;

    e.preventDefault();
    goTo(el, true);
    /* Long enough for the reveals to have settled, short enough not to fight
       a visitor who has started scrolling again. */
    setTimeout(function () { goTo(el, false); }, 450);
    if (history.replaceState) history.replaceState(null, "", "#" + id);
  });
})();

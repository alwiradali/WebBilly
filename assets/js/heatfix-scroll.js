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

/* Heat Fix — preview link bridge.
 *
 * The site's own links are written root-absolute (/about, /blog, /#quote)
 * because that is what they must be on heatfixmcrlimited.co.uk, where the
 * worker maps those clean URLs onto the templates. Google sees those, and
 * they are the ones that count for his ranking, so the HTML is left alone.
 *
 * On the billydigitals.com preview the same pages are served from
 * /templates/<name>, so /about would leave the site entirely. Here — and
 * only here — the links are rewritten in the browser to point at the
 * matching template. On his own domain this file does nothing at all.
 *
 * Keep in step with HEATFIX_PAGES in worker.js.
 */
(function () {
  if (!/^\/templates\//.test(location.pathname)) return;

  var MAP = {
    "/": "/templates/heatfixmcr",
    "/book": "/templates/heatfix-book",
    "/about": "/templates/heatfix-about",
    "/faqs": "/templates/heatfix-faqs",
    "/blog": "/templates/heatfix-blog",
    "/safety-tips": "/templates/heatfix-safety-tips",
    "/plumbing-gas-safety": "/templates/heatfix-plumbing-gas-safety",
    "/manufacturers-warranty": "/templates/heatfix-manufacturers-warranty",
    "/privacy": "/templates/heatfix-privacy",
    "/terms": "/templates/heatfix-terms",
    "/invoice": "/templates/heatfix-invoice",
    "/i": "/templates/heatfix-invoice-view"
  };
  var BLOG = /^\/blog\/([a-z0-9-]{2,60})$/;

  function target(path) {
    if (MAP[path]) return MAP[path];
    var m = BLOG.exec(path);
    return m ? "/templates/heatfix-blog-" + m[1] : null;
  }

  function rewrite(a) {
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) !== "/" || href.charAt(1) === "/") return;
    var cut = href.search(/[#?]/),
        path = (cut < 0 ? href : href.slice(0, cut)).replace(/\/+$/, "") || "/",
        rest = cut < 0 ? "" : href.slice(cut),
        to = target(path);
    if (to) a.setAttribute("href", to + rest);
  }

  function run() {
    var links = document.querySelectorAll('a[href^="/"]');
    for (var i = 0; i < links.length; i++) rewrite(links[i]);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();

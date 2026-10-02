/* SMARTin SCIENCE — self-service content bridge (full-site mirror)
   Same design as templates/mm/content.js (Molecular Miracles).
   ------------------------------------------------------------------
   Every page of this site has a same-named page on Rod's hidden
   editor site (his own free WordPress.com account — public API on,
   search engines off; the address is EDITOR below) holding that
   page's headings, paragraphs, lists and images in reading order. He
   edits there, from the WordPress app or wordpress.com; this script
   fetches the edited version on page load and swaps it into the design.
   No deploys, no backend.

   Same pattern as the timetable (Google Calendar) and strictly
   progressive enhancement: the shipped copy stays baked into the HTML,
   so if WordPress is unreachable — or he empties or deletes a block —
   the site shows what it shipped with. Google indexes the baked copy.

   The mapping is positional: the Nth heading in the WordPress page
   fills the Nth heading here, and so on per element type. Deleting a
   block over there leaves the baked text in place; extra blocks are
   ignored. Layout, nav, footer, forms and the live timetable are
   deliberately not editable — that is what makes the
   design unbreakable.

   The generator in scripts/export-smartin-content.py uses collectForExport()
   below, so what gets exported is BY CONSTRUCTION what gets replaced.  */

(function () {
  /* Set to Rod's editor site once it exists, e.g. 'smartinscienceeditor.wordpress.com'.
     Left empty, the bridge does nothing and the site shows its built-in copy. */
  var EDITOR = '';
  var API = 'https://public-api.wordpress.com/wp/v2/sites/' + EDITOR + '/pages';

  /* editable elements, and the zones that must never be editable */
  var SELECT = 'h1,h2,h3,p,ul,img';
  var EXCLUDE = 'nav,footer,form,#whats-on,#timetable-body,#letters,#bg,#sm-notice,.crumb,.wa-float,[data-no-edit]';

  function collect() {
    return [].filter.call(document.querySelectorAll(SELECT), function (el) {
      return !el.closest(EXCLUDE);
    });
  }

  /* Whitelist sanitizer: only the tags a text edit can produce survive.
     Scripts, styles, iframes and event handlers can never reach the page.
     span is allowed solely to carry the gradient classes used in headings. */
  var ALLOW = { UL: 1, OL: 1, LI: 1, P: 1, B: 1, STRONG: 1, EM: 1, I: 1, BR: 1, A: 1, SPAN: 1 };

  function safeHref(href) {
    if (/^https?:\/\//i.test(href)) return true;
    return !/^[a-z][a-z0-9+.-]*:/i.test(href);   // relative, /path or #anchor
  }

  function sanitize(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var out = document.createDocumentFragment();
    (function walk(from, to) {
      for (var n = from.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) { to.appendChild(document.createTextNode(n.nodeValue)); continue; }
        if (n.nodeType !== 1) continue;
        if (!ALLOW[n.tagName]) { walk(n, to); continue; }  // unwrap unknown tags, keep their text
        var el = document.createElement(n.tagName.toLowerCase());
        if (n.tagName === 'A') {
          var href = n.getAttribute('href') || '';
          if (href && safeHref(href)) {
            el.setAttribute('href', href);
            if (/^https?:\/\//i.test(href)) el.setAttribute('rel', 'noopener');
          }
        }
        if (n.tagName === 'SPAN') {
          var cls = (n.getAttribute('class') || '').trim();
          if (/^(g|g2|hl|accent)$/.test(cls)) el.setAttribute('class', cls);
        }
        walk(n, el);
        to.appendChild(el);
      }
    })(doc.body, out);
    return out;
  }

  /* which editor page belongs to this URL: /areas/glasgow -> areas-glasgow */
  function pageSlug() {
    var p = location.pathname
      .replace(/^\/templates\/smartin/, '')  // the demo copy on billydigitals
      .replace(/\.html$/, '')
      .replace(/index$/, '')
      .replace(/^\/+|\/+$/g, '');
    return p ? p.split('/').join('-') : 'home';
  }

  function applyText(el, wpEl) {
    var frag = sanitize(wpEl.innerHTML);
    if (!frag.textContent.trim()) return;          // an emptied block never blanks the site
    el.innerHTML = '';
    el.appendChild(frag);
  }

  function applyImage(el, figure) {
    var im = figure.querySelector('img');
    if (!im) return;
    var src = im.getAttribute('src') || '';
    if (!/^https:\/\//i.test(src)) return;
    // the seeded copy points at the same file on smartinscience.co.uk: leave it (and its srcset) alone
    var same = false;
    try { same = new URL(src).pathname.replace(/^\/templates\/smartin/, '') === new URL(el.src, location.href).pathname.replace(/^\/templates\/smartin/, ''); } catch (e) {}
    if (!same && el.getAttribute('src') !== src) {
      el.removeAttribute('srcset');
      el.setAttribute('src', src);
    }
    var alt = im.getAttribute('alt');
    if (alt) el.setAttribute('alt', alt);
  }

  function applyPage(page) {
    var doc = new DOMParser().parseFromString(page.content.rendered, 'text/html');
    var wp = [].filter.call(doc.body.children, function (n) {
      return /^(H1|H2|H3|P|UL|FIGURE)$/.test(n.tagName);
    });
    var j = 0;
    collect().forEach(function (el) {
      var want = el.tagName === 'IMG' ? 'FIGURE' : el.tagName;
      for (var k = j; k < wp.length; k++) {
        if (wp[k].tagName === want) {
          try {
            el.tagName === 'IMG' ? applyImage(el, wp[k]) : applyText(el, wp[k]);
          } catch (e) { /* one bad block never affects the rest */ }
          j = k + 1;
          return;
        }
      }
      // no matching block left (she deleted it) — baked copy stays
    });
  }

  /* announcement bar — hidden until she writes something */
  function applyAnnouncement(page) {
    var frag = sanitize(page.content.rendered);
    if (!frag.textContent.trim()) return;
    var bar = document.getElementById('sm-notice');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'sm-notice';
      bar.setAttribute('role', 'status');
      document.body.insertBefore(bar, document.body.firstChild);
    }
    bar.innerHTML = '';
    var inner = document.createElement('div');
    inner.className = 'wrap';
    inner.appendChild(frag);
    bar.appendChild(inner);
    bar.classList.add('on');
  }

  /* used by scripts/export-smartin-content.py to build the editor pages */
  window.__smContent = {
    collectForExport: function () {
      return collect().map(function (el) {
        if (el.tagName === 'IMG') {
          return { tag: 'img', src: el.getAttribute('src') || '', alt: el.getAttribute('alt') || '' };
        }
        var d = document.createElement('div');
        d.appendChild(sanitize(el.innerHTML));
        return { tag: el.tagName.toLowerCase(), html: d.innerHTML };
      });
    }
  };

  if (!EDITOR) return;   // not connected yet: built-in copy only
  var slug = pageSlug();
  fetch(API + '?slug=' + encodeURIComponent(slug) + ',announcement&_fields=slug,title,content&per_page=2',
        { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (pages) {
      pages.forEach(function (p) {
        try {
          if (p.slug === 'announcement') applyAnnouncement(p);
          else if (p.slug === slug) applyPage(p);
        } catch (e) { /* never let one page's content break another's */ }
      });
    })
    .catch(function (e) {
      // Baked-in content is already on screen — this is informational only.
      console.info('[content] live content unavailable, showing built-in copy —',
                   e && e.message ? e.message : e);
    });
})();

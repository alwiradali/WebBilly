/* Molecular Miracles — self-service content bridge
   ------------------------------------------------------------------
   Lets Lynsey edit parts of this site herself, with no deploys and no
   backend, using the same pattern as the timetable: the page loads, a
   fetch asks WordPress for the latest text, and the matching section is
   updated in place.

   She edits at molecularmiracleseditor.wordpress.com (free, hidden,
   never linked from anywhere) — usually from the WordPress app on her
   phone. Saving there is all she does; this script picks it up on the
   next page load.

   Progressive enhancement, strictly: every wired section keeps its real
   content baked into the HTML, so if WordPress is slow, unreachable, or
   the page over there is ever deleted, the site simply shows what it
   shows today. Google indexes the baked-in copy either way.

   To wire another section: publish a page on the editor site, then add
   one entry to MAP below.                                              */

(function () {
  var API = 'https://public-api.wordpress.com/wp/v2/sites/molecularmiracleseditor.wordpress.com/pages';

  /* slug on the editor site → how it lands in this page */
  var MAP = [
    { slug: 'included-in-every-course', apply: applyIncluded },
    { slug: 'announcement', apply: applyAnnouncement }
  ];

  /* Only the tags a text edit can produce survive; everything else —
     scripts, styles, iframes, event handlers — is dropped, so nothing
     pasted into WordPress can run code or break the layout here. */
  var ALLOW = { UL: 1, OL: 1, LI: 1, P: 1, B: 1, STRONG: 1, EM: 1, I: 1, BR: 1, A: 1 };

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
          if (/^https?:\/\//i.test(href)) { el.setAttribute('href', href); el.setAttribute('rel', 'noopener'); }
        }
        walk(n, el);
        to.appendChild(el);
      }
    })(doc.body, out);
    return out;
  }

  function text(html) {
    var d = document.createElement('div');
    d.innerHTML = html;
    return (d.textContent || '').replace(/ /g, ' ').trim();
  }

  /* "Included in every course" panels — home page and the courses hub */
  function applyIncluded(page) {
    var frag = sanitize(page.content.rendered);
    if (!frag.textContent.trim()) return;  // an emptied page never blanks the site
    document.querySelectorAll('.incl').forEach(function (box) {
      var h = box.querySelector('h3');
      var title = text(page.title.rendered);
      if (h && title) h.textContent = title;
      while (h && h.nextSibling) box.removeChild(h.nextSibling);
      box.appendChild(frag.cloneNode(true));
    });
  }

  /* Announcement bar — hidden until she writes something */
  function applyAnnouncement(page) {
    var bar = document.getElementById('mm-notice');
    if (!bar) return;
    var frag = sanitize(page.content.rendered);
    if (!frag.textContent.trim()) return;
    bar.innerHTML = '';
    var inner = document.createElement('div');
    inner.className = 'wrap';
    inner.appendChild(frag);
    bar.appendChild(inner);
    bar.classList.add('on');
  }

  fetch(API + '?slug=' + MAP.map(function (m) { return m.slug; }).join(',') +
        '&_fields=slug,title,content&per_page=' + MAP.length, { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (pages) {
      MAP.forEach(function (m) {
        var page = pages.find(function (p) { return p.slug === m.slug; });
        if (page) try { m.apply(page); } catch (e) { /* one bad section never affects the rest */ }
      });
    })
    .catch(function (e) {
      // Baked-in content is already on screen — this is informational only.
      console.info('[content] live content unavailable, showing built-in copy —',
                   e && e.message ? e.message : e);
    });
})();

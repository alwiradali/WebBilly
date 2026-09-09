#!/usr/bin/env python3
"""Rewrite the shared chrome on every Roses by Rachel page.

The site is nine ordinary pages, not one long scroll, so four blocks are the
same on all of them: the opening curtain, the header, the footer, and the
overlay screens (product, cart, checkout, share sheet, cookie bar). They are
written here once and stamped into each page between its marker comments:

    python3 scripts/rachel-chrome.py

Each page carries, in its body:

    <!-- chrome:loader --><!-- /chrome:loader -->
    <!-- chrome:nav --><!-- /chrome:nav -->
    <!-- chrome:footer --><!-- /chrome:footer -->
    <!-- chrome:overlays --><!-- /chrome:overlays -->

and everything between a pair is replaced. Nothing else in the file is
touched. A page missing a marker is an error, not a silent skip: a page that
quietly loses its header is worse than a script that stops.
"""

import glob
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'templates', 'rachel')

# The eight that share the links row. Contact is the button beside the cart,
# FAQs is in the burgundy strip, and every page including the four shop
# categories is in the footer, so nothing is reachable only from the menu.
LINKS = [
    ('shop.html', 'Shop'),
    ('build.html', 'Build Your Own'),
    ('subscriptions.html', 'Subscriptions'),
    ('weddings.html', 'Weddings'),
    ('airport.html', 'Airport Arrivals'),
    ('corporate.html', 'Corporate'),
    ('journal.html', 'Journal'),
    ('about.html', 'About Us'),
]
DRAWER_LINKS = LINKS + [('faqs.html', 'Questions'), ('contact.html', 'Contact')]

# A page inside a section should light that section up in the header.
BELONGS = {
    'shop-roses.html': 'shop.html', 'shop-bouquets.html': 'shop.html',
    'shop-wedding.html': 'shop.html', 'shop-gifts.html': 'shop.html',
    'journal-roses-last-longer.html': 'journal.html',
    'journal-wedding-flowers-timeline.html': 'journal.html',
    'journal-what-is-in-season.html': 'journal.html',
}

FOOTER_COLS = [
    ('Shop', [('shop.html', 'The whole collection'), ('shop-roses.html', 'Roses'),
              ('shop-bouquets.html', 'Bouquets'), ('shop-wedding.html', 'Wedding'),
              ('shop-gifts.html', 'Gifts'), ('build.html', 'Build your own')]),
    ('Services', [('subscriptions.html', 'Subscriptions'), ('weddings.html', 'Weddings &amp; occasions'),
                  ('airport.html', 'Airport arrivals'), ('corporate.html', 'Corporate &amp; contract')]),
    ('More', [('about.html', 'About Us'), ('journal.html', 'The journal'),
              ('faqs.html', 'Questions &amp; answers'), ('contact.html', 'Place an order')]),
]

WA = ('https://wa.me/447306063563?text=Hi%2C%20I%20found%20you%20through%20'
      'your%20website%20and%20I%27d%20love%20to%20ask%20about%20ordering%20some%20flowers.')

LOADER = '''<div class="rrload" id="rrload" role="status" aria-live="polite" aria-label="Loading Roses by Rachel">
  <div class="rrload-in">
    <img src="../../assets/rachel/logo-official.webp" alt="Roses by Rachel" width="557" height="464">
    <div class="rrload-rule" aria-hidden="true"></div>
  </div>
</div>
<script>
/* Inline and first, so the curtain is up before anything paints. Everything
   about it is fail-safe: it is only ever shown by this script, it lifts on
   window load, it lifts anyway after 2.6 seconds, and it is skipped entirely
   for anyone returning within the session or asking for reduced motion — so
   moving between pages never meets it twice. */
(function () {
  var el = document.getElementById('rrload');
  if (!el) return;
  var seen = false;
  try { seen = sessionStorage.getItem('rr-seen') === '1'; } catch (e) {}
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (seen || still) { el.parentNode.removeChild(el); return; }
  el.classList.add('on');
  document.documentElement.style.overflow = 'hidden';
  var done = false;
  function lift() {
    if (done) return; done = true;
    try { sessionStorage.setItem('rr-seen', '1'); } catch (e) {}
    document.documentElement.style.overflow = '';
    el.classList.add('gone');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 700);
  }
  var started = Date.now(), MIN = 1150;
  function liftWhenSettled() {
    var waited = Date.now() - started;
    setTimeout(lift, waited >= MIN ? 260 : MIN - waited);
  }
  if (document.readyState === 'complete') liftWhenSettled();
  else window.addEventListener('load', liftWhenSettled);
  setTimeout(lift, 2600);
})();
</script>

<div class="ground" aria-hidden="true"></div>
<canvas id="petals" aria-hidden="true"></canvas>'''


def nav(page):
    here = BELONGS.get(page, page)
    links = '\n'.join(
        '      <a href="%s"%s>%s</a>' % (href, ' class="on"' if href == here else '', text)
        for href, text in LINKS)
    drawer = '\n'.join(
        '    <a href="%s">%s</a>' % (href, text) for href, text in DRAWER_LINKS)
    return '''<nav class="nav" id="nav">
  <div class="navtop">
    <div class="navtop-in">
      <span class="navwhere">Delivery across Greater Manchester and Manchester Airport</span>
      <span class="navtop-r">
        <a href="faqs.html">Questions</a>
        <a class="tel" href="tel:+447306063563">07306 063563</a>
        <a href="https://www.instagram.com/rosesbyrachelx" target="_blank" rel="noopener">Instagram</a>
      </span>
    </div>
  </div>
  <div class="nav-in">
    <a class="brand" href="index.html" aria-label="Roses by Rachel, home">
      <img class="mk" src="../../assets/rachel/logo-monogram.webp" alt="" width="433" height="365">
      <img class="wd" src="../../assets/rachel/logo-word.webp" alt="Roses by Rachel" width="1005" height="82">
    </a>
    <div class="navutil">
      <a class="btn sm navbtn" href="contact.html">Order a Bouquet</a>
      <button class="cartbtn" id="cartbtn" type="button" aria-label="Open your cart">
        <svg viewBox="0 0 24 24"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L21 8H6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/></svg>
        <b id="cartcount">0</b>
      </button>
      <button class="burger" id="burger" type="button" aria-label="Open menu">
        <svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" stroke-linecap="round"/></svg>
      </button>
    </div>
  </div>
  <div class="navrow">
    <div class="navlinks">
%s
    </div>
  </div>
</nav>
<div class="drawer" id="drawer">
  <div class="drawer-in">
    <button class="x" id="drawerx" type="button" aria-label="Close menu">&times;</button>
%s
    <a class="btn" href="contact.html">Order a Bouquet</a>
  </div>
</div>''' % (links, drawer)


def footer():
    cols = '\n'.join(
        '      <div><h4>%s</h4><ul>%s</ul></div>'
        % (head, ''.join('<li><a href="%s">%s</a></li>' % (h, t) for h, t in items))
        for head, items in FOOTER_COLS)
    return '''<footer>
  <div class="wrap">
    <div class="fmain">
      <a href="index.html"><img class="m" src="../../assets/rachel/logo-official.webp" alt="Roses by Rachel" width="557" height="464" style="width:96px;height:auto;margin:0 auto"></a>
      <div class="fdiv" aria-hidden="true"></div>
      <div class="fcontact">
        <div><svg viewBox="0 0 24 24"><path d="M3 6h18v12H3z"/><path d="m3 7 9 6 9-6"/></svg>
          <span><b>Email</b><a href="mailto:info@rosesbyrachel.co.uk">info@rosesbyrachel.co.uk</a></span></div>
        <div><svg viewBox="0 0 24 24"><path d="M6 3h3l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4 5.2 2 2 0 0 1 6 3z" stroke-linejoin="round"/></svg>
          <span><b>Phone</b><a href="tel:+447306063563">07306 063563</a></span></div>
        <!-- WhatsApp opens with the message already written, so nobody has to
             work out how to start. It is a complete sentence on purpose: most
             people press send without changing a word, and a half-finished
             line would arrive looking like a mistake. -->
        <div><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2z"/><path d="M8.5 7.5c.3 0 .5.4.7.9l.6 1.4-.7.8c.5 1 1.3 1.8 2.3 2.3l.8-.7 1.4.6c.5.2.9.4.9.7 0 .8-.7 1.5-1.6 1.5-2.9 0-5.9-3-5.9-5.9 0-.9.7-1.6 1.5-1.6z" stroke-linejoin="round"/></svg>
          <span><b>WhatsApp</b><a href="%s" target="_blank" rel="noopener">Message us</a></span></div>
      </div>
      <div class="fsocial">
        <a href="https://www.instagram.com/rosesbyrachelx" target="_blank" rel="noopener" aria-label="Instagram"><span><svg viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 3.2A6.6 6.6 0 1 0 18.6 12 6.6 6.6 0 0 0 12 5.4zm0 10.9A4.3 4.3 0 1 1 16.3 12 4.3 4.3 0 0 1 12 16.3zm6.9-11.1a1.5 1.5 0 1 1-1.5-1.5 1.5 1.5 0 0 1 1.5 1.5z"/></svg></span>Instagram</a>
      </div>
    </div>
    <div class="fcols">
%s
    </div>
    <p>Manchester florist · Delivery across Greater Manchester and Manchester Airport<br>
      © <span id="yr">2026</span> Roses by Rachel</p>
    <div class="fbottom">
      <svg viewBox="0 0 34 12" aria-hidden="true"><path d="M2 6h10M22 6h10M14 6c1-3 3-3 3 0s-2 3-3 0zm6 0c-1-3-3-3-3 0s2 3 3 0z"/></svg>
      Roses by Rachel
      <svg viewBox="0 0 34 12" aria-hidden="true"><path d="M2 6h10M22 6h10M14 6c1-3 3-3 3 0s-2 3-3 0zm6 0c-1-3-3-3-3 0s2 3 3 0z"/></svg>
    </div>
  </div>
</footer>''' % (WA, cols)


OVERLAYS = open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                             'rachel-overlays.html')).read().strip()


def stamp(html, name, block):
    open_t = '<!-- chrome:%s -->' % name
    close_t = '<!-- /chrome:%s -->' % name
    pat = re.compile(re.escape(open_t) + '.*?' + re.escape(close_t), re.S)
    if not pat.search(html):
        return None
    return pat.sub(lambda _m: open_t + '\n' + block + '\n' + close_t, html)


def main():
    files = sorted(glob.glob(os.path.join(ROOT, '*.html')))
    if not files:
        sys.exit('no pages found in %s' % ROOT)
    changed = 0
    for f in files:
        page = os.path.basename(f)
        s = before = open(f).read()
        for name, block in (('loader', LOADER), ('nav', nav(page)),
                            ('footer', footer()), ('overlays', OVERLAYS)):
            out = stamp(s, name, block)
            if out is None:
                sys.exit('%s: no <!-- chrome:%s --> markers — refusing to write '
                         'a half-updated page' % (page, name))
            s = out
        if s != before:
            open(f, 'w').write(s)
            changed += 1
    print('chrome refreshed on %d of %d pages' % (changed, len(files)))


if __name__ == '__main__':
    main()

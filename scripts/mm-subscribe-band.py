#!/usr/bin/env python3
"""Put the mailing-list band on every Molecular Miracles page, once.

Lynsey asked to start collecting parents' email addresses, so the signup has
to be somewhere every visitor passes rather than on one page they may never
reach. It sits directly above the footer on all 43 pages.

Run it again after adding a page and it will pick that page up; pages that
already carry the band are left alone, so it is safe to run any number of
times. The band is delimited by markers, so this can also replace it later
without touching anything around it.

    python3 scripts/mm-subscribe-band.py

The page's own relative prefix is reused for the script tag — the root pages
reference shared.css, the ones in areas/ and courses/ reference ../shared.css
— rather than guessing from the path, so a page that moves keeps working.
"""

import os
import re
import sys

SRC = os.path.join(os.path.dirname(__file__), '..', 'templates', 'mm')

OPEN, CLOSE = '<!-- mm:subscribe -->', '<!-- /mm:subscribe -->'

BAND = """{open}
<section class="sub-band">
  <div class="wrap">
    <div class="sub-in">
      <div>
        <span class="pill">Keep in touch</span>
        <h2>Occasional updates from Lynsey</h2>
        <p>New class dates, masterclass releases and the odd revision tip &mdash;
          a few times a term and no more. Your address stays with Molecular
          Miracles, is never passed to anyone else, and you can ask to come off
          the list whenever you like.</p>
      </div>
      <form class="sub-form" novalidate>
        <label class="sr-only" for="sub-email{n}">Your email address</label>
        <input id="sub-email{n}" type="email" name="email" autocomplete="email"
               placeholder="you@example.com" required>
        <input class="sub-pot" type="text" name="company" tabindex="-1"
               autocomplete="off" aria-hidden="true">
        <label class="sub-consent">
          <input type="checkbox" id="sub-consent{n}" required>
          <span>Yes, email me occasional updates about classes and masterclasses.</span>
        </label>
        <button class="btn btn-p" type="submit">Sign me up</button>
        <p class="sub-say" role="status" aria-live="polite"></p>
      </form>
    </div>
  </div>
</section>
{close}
"""


def prefix(html):
    """The relative prefix this page already uses for its own scripts."""
    m = re.search(r'src="((?:\.\./)*)content\.js"', html)
    if m:
        return m.group(1)
    m = re.search(r'href="((?:\.\./)*)shared\.css"', html)
    return m.group(1) if m else ''


def main():
    pages = []
    for dirpath, _dirs, files in os.walk(SRC):
        for name in sorted(files):
            if name.endswith('.html'):
                pages.append(os.path.join(dirpath, name))
    pages.sort()

    added = skipped = replaced = 0
    for i, path in enumerate(pages):
        with open(path, encoding='utf8') as fh:
            html = fh.read()

        band = BAND.format(open=OPEN, close=CLOSE, n=i)

        if OPEN in html:
            # already banded — replace between the markers so a change to the
            # wording here reaches every page
            new = re.sub(re.escape(OPEN) + r'.*?' + re.escape(CLOSE),
                         band.strip(), html, count=1, flags=re.S)
            if new != html:
                replaced += 1
            else:
                skipped += 1
            html = new
        else:
            if html.count('<footer>') != 1:
                sys.exit('%s: expected exactly one <footer>, found %d'
                         % (path, html.count('<footer>')))
            html = html.replace('<footer>', band + '<footer>', 1)
            added += 1

        # the script that submits it, once, alongside the page's own scripts
        tag = '<script src="%ssubscribe.js" defer></script>' % prefix(html)
        if 'subscribe.js' not in html:
            if '</body>' not in html:
                sys.exit('%s: no </body> to put the script before' % path)
            html = html.replace('</body>', tag + '\n</body>', 1)

        with open(path, 'w', encoding='utf8') as fh:
            fh.write(html)

    print('%d pages: %d banded, %d rewritten, %d already current'
          % (len(pages), added, replaced, skipped))


if __name__ == '__main__':
    main()

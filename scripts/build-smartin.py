#!/usr/bin/env python3
"""Build a standalone, deployable copy of the SMARTin SCIENCE site.

Same idea as build-mm.py: the site lives in the repo at templates/smartin as
a noindex demo served under billydigitals.com/templates/smartin. Rod's real
site sits at his own domain root on his own Cloudflare account, so this
produces that copy — paths rewritten to the root, indexing switched on,
canonicals and a sitemap added, clean URLs throughout.

    python3 scripts/build-smartin.py smartinscience.co.uk

Output lands in dist/smartin-science/ (gitignored, like the mm build).
Upload the folder to Cloudflare Pages in Rod's account.
"""

import html as htmlmod
import os
import posixpath
import re
import shutil
import sys
from datetime import date

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'templates', 'smartin')
OUT = os.path.join(ROOT, 'dist', 'smartin-science')

# Rod's class calendar. The timetable page carries the calendar id and the
# browser key in its own markup. The key is restricted to the Calendar API and
# to his two domains, and the calendar it reads is public, so it grants nothing
# that was not already public and cannot be used from anywhere else — checked:
# smartinscience.co.uk and www answer 200, every other referer and no referer
# at all are refused. It is served in the page the moment this deploys either
# way, which is how Google intends a browser key to work.
#
# These two environment variables override what is in the page, so the key can
# be rotated through a repository secret without touching the markup. Setting
# neither is the ordinary case and changes nothing.
GCAL_ID = os.environ.get('SMARTIN_GCAL_ID', '').strip()
GCAL_KEY = os.environ.get('SMARTIN_GCAL_KEY', '').strip()


def inject_calendar(html):
    """Override the calendar attributes on the one page that has them."""
    if 'id="timetable-body"' not in html or not (GCAL_ID and GCAL_KEY):
        return html
    for attr, value in (('data-calendar-id', GCAL_ID), ('data-api-key', GCAL_KEY)):
        # Replace whatever is there rather than only an empty value: the page
        # now ships with real ones, and an override has to win over them.
        pattern = r'(%s=")[^"]*(")' % re.escape(attr)
        html, hits = re.subn(
            pattern,
            lambda m: m.group(1) + htmlmod.escape(value, quote=True) + m.group(2),
            html, count=1)
        if not hits:
            sys.exit('timetable page no longer has a %s to override' % attr)
    return html


def rewrite(html, domain, path):
    # asset paths: any depth of ../ ending in assets/ becomes root-absolute
    html = re.sub(r'(?:\.\./)+assets/', '/assets/', html)

    # Page links become clean root URLs, resolved against the page's OWN
    # directory. The previous version matched a bare "cardiff.html" and emitted
    # "/cardiff" wherever it appeared, so every chip on every area page pointed
    # at a root URL that does not exist — 740 dead links in the build, none of
    # them visible in the source, because there the relative link is correct.
    page_dir = path if path.endswith('/') else posixpath.dirname(path)
    if not page_dir.endswith('/'):
        page_dir += '/'          # dirname('/faqs') is already '/', don't double it

    def resolve(m):
        href = m.group(1)
        if re.match(r'(?:[a-z]+:|//|/|#)', href):
            return m.group(0)    # already absolute, external, or a bare fragment
        target, _, frag = href.partition('#')
        if not target.endswith('.html'):
            return m.group(0)
        out = posixpath.normpath(posixpath.join(page_dir, target))
        if posixpath.basename(out) == 'index.html':
            out = posixpath.dirname(out).rstrip('/') + '/'
        else:
            out = out[:-len('.html')]
        return 'href="%s%s"' % (out, '#' + frag if frag else '')

    html = re.sub(r'href="([^"]+)"', resolve, html)

    # local css/js referenced relatively from blog pages
    html = html.replace('href="../shared.css"', 'href="/shared.css"')
    html = re.sub(r'src="(?:\.\./)+(site|letters|book-hero)\.js"', r'src="/\1.js"', html)
    html = html.replace('src="site.js"', 'src="/site.js"')
    html = html.replace('src="letters.js"', 'src="/letters.js"')
    html = html.replace('src="book-hero.js"', 'src="/book-hero.js"')
    html = html.replace('src="calendar.js"', 'src="/calendar.js"')
    html = html.replace('href="shared.css"', 'href="/shared.css"')
    html = html.replace('href="book-hero.css"', 'href="/book-hero.css"')

    html = inject_calendar(html)

    # the demo is noindex; the real site is very much not
    html = re.sub(r'<meta name="robots"[^>]*>\n?', '', html)
    canonical = f'https://{domain}{path}'
    html = html.replace('</title>',
        f'</title>\n<link rel="canonical" href="{canonical}">')
    # absolute og:image so shares resolve off-site
    html = html.replace('content="/assets/smartin/og.png"',
                        f'content="https://{domain}/assets/smartin/og.png"')
    return html


def main():
    if len(sys.argv) != 2:
        sys.exit('usage: build-smartin.py <domain>   e.g. build-smartin.py smartinscience.co.uk')
    domain = sys.argv[1].strip().lower().removeprefix('https://').removeprefix('http://').rstrip('/')
    if '.' not in domain:
        sys.exit('that does not look like a domain: ' + domain)

    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(os.path.join(OUT, 'assets'))

    # assets the pages actually reference
    shutil.copytree(os.path.join(ROOT, 'assets', 'smartin'), os.path.join(OUT, 'assets', 'smartin'))
    shutil.copytree(os.path.join(ROOT, 'assets', 'fonts'), os.path.join(OUT, 'assets', 'fonts'))
    os.makedirs(os.path.join(OUT, 'assets', 'css'))
    os.makedirs(os.path.join(OUT, 'assets', 'js'))
    shutil.copy(os.path.join(ROOT, 'assets', 'css', 'scroll-fx.css'), os.path.join(OUT, 'assets', 'css'))
    shutil.copy(os.path.join(ROOT, 'assets', 'js', 'scroll-fx.js'), os.path.join(OUT, 'assets', 'js'))

    # site-level css/js
    for f in sorted(os.listdir(SRC)):
        if f.endswith(('.css', '.js')):
            shutil.copy(os.path.join(SRC, f), os.path.join(OUT, f))

    pages = []
    held = []
    for dirpath, _dirs, files in os.walk(SRC):
        rel_dir = os.path.relpath(dirpath, SRC)
        rel_dir = '' if rel_dir == '.' else rel_dir
        for name in sorted(f for f in files if f.endswith('.html')):
            rel = os.path.join(rel_dir, name) if rel_dir else name
            # Rod asked for the blog on 08.09: "I'd rather not put up anything
            # yet until I have the content written by myself and checked.
            # There's information on it that I don't agree with." The drafts
            # stay in the repo so he can read them on the preview, where every
            # page is noindex — but this build strips the robots meta and puts
            # every page it writes into sitemap.xml, so publishing them here
            # would submit copy he has not approved to Google under his name.
            # The blog index ships; it says the first article is coming.
            if rel_dir == 'blog' and name != 'index.html':
                held.append(rel)
                continue
            if name == 'index.html':
                path = '/' + (rel_dir + '/' if rel_dir else '')
            else:
                path = '/' + (rel_dir + '/' if rel_dir else '') + name[:-5]
            with open(os.path.join(SRC, rel)) as fh:
                html = fh.read()
            dest = os.path.join(OUT, rel)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with open(dest, 'w') as fh:
                fh.write(rewrite(html, domain, path))
            pages.append(path)

    today = date.today().isoformat()
    with open(os.path.join(OUT, 'sitemap.xml'), 'w') as fh:
        fh.write('<?xml version="1.0" encoding="UTF-8"?>\n'
                 '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
        for p in sorted(pages):
            fh.write(f'  <url><loc>https://{domain}{p}</loc><lastmod>{today}</lastmod></url>\n')
        fh.write('</urlset>\n')

    with open(os.path.join(OUT, 'robots.txt'), 'w') as fh:
        fh.write(f'User-agent: *\nAllow: /\n\nSitemap: https://{domain}/sitemap.xml\n')

    print(f'built {len(pages)} pages into dist/smartin-science/ for {domain}')
    # Report what the built page actually carries, and never the key itself.
    built = os.path.join(OUT, 'timetable.html')
    has_cal = False
    if os.path.exists(built):
        with open(built) as fh:
            page = fh.read()
        has_cal = bool(re.search(r'data-api-key="[^"]+"', page)
                       and re.search(r'data-calendar-id="[^"]+"', page))
    if has_cal:
        print('  timetable reads his Google Calendar%s'
              % (' (overridden from the environment)' if GCAL_ID and GCAL_KEY else ''))
    else:
        print('  no calendar in the timetable page — it keeps "confirmed when '
              'you enquire" (see docs/smartin-calendar.md)')
    if held:
        print(f'  held back {len(held)} unapproved blog draft(s): '
              + ', '.join(sorted(held)))


if __name__ == '__main__':
    main()

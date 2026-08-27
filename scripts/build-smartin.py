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

import os
import re
import shutil
import sys
from datetime import date

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'templates', 'smartin')
OUT = os.path.join(ROOT, 'dist', 'smartin-science')


def rewrite(html, domain, path):
    # asset paths: any depth of ../ ending in assets/ becomes root-absolute
    html = re.sub(r'(?:\.\./)+assets/', '/assets/', html)

    # page links become clean root URLs, from either depth
    def clean(m):
        target = m.group(2)
        if target == 'index.html':
            return m.group(1) + '/'
        if target.startswith('blog/'):
            return m.group(1) + '/' + target[:-5].replace('/index', '/')
        return m.group(1) + '/' + target[:-5]
    html = re.sub(r'(href=")(?:\.\./)*((?:blog/)?[a-z0-9-]+\.html)', clean, html)
    html = html.replace('href="/blog/index"', 'href="/blog/"')

    # local css/js referenced relatively from blog pages
    html = html.replace('href="../shared.css"', 'href="/shared.css"')
    html = re.sub(r'src="(?:\.\./)+(site|letters|book-hero)\.js"', r'src="/\1.js"', html)
    html = html.replace('src="site.js"', 'src="/site.js"')
    html = html.replace('src="letters.js"', 'src="/letters.js"')
    html = html.replace('src="book-hero.js"', 'src="/book-hero.js"')
    html = html.replace('href="shared.css"', 'href="/shared.css"')
    html = html.replace('href="book-hero.css"', 'href="/book-hero.css"')

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
    for dirpath, _dirs, files in os.walk(SRC):
        rel_dir = os.path.relpath(dirpath, SRC)
        rel_dir = '' if rel_dir == '.' else rel_dir
        for name in sorted(f for f in files if f.endswith('.html')):
            rel = os.path.join(rel_dir, name) if rel_dir else name
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


if __name__ == '__main__':
    main()

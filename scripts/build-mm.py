#!/usr/bin/env python3
"""Build a standalone, deployable copy of the Molecular Miracles site.

The site lives in the repo at templates/mm as a noindex demo served under
billydigitals.com/templates/mm. Lynsey now has her own domain on her own
Cloudflare account, so the live copy needs to sit at a domain root instead:
paths rewritten, indexing switched on, canonicals and a sitemap added.

This script produces that copy. It never edits the source — the demo stays a
noindex demo, and the deployable build is generated fresh each time.

    python3 scripts/build-mm.py molecularmiracles.co.uk

Output lands in dist/molecular-miracles/, which is gitignored so it can never
be picked up by the billydigitals Worker (its [assets] directory is the whole
repo, and an indexable second copy there would compete with her real domain).

Upload that folder to Cloudflare Pages in her account — Pages serves clean
URLs natively, so /areas/glasgow works with no redirect hop.
"""

import os
import re
import shutil
import sys
from datetime import date

SRC = os.path.join(os.path.dirname(__file__), '..', 'templates', 'mm')
ASSETS = os.path.join(os.path.dirname(__file__), '..', 'assets', 'mm')
OUT = os.path.join(os.path.dirname(__file__), '..', 'dist', 'molecular-miracles')


def rewrite(html, domain, canonical_path):
    """Rewrite one page from repo-relative to domain-root paths."""
    # assets: ../../assets/mm/x (root page) and ../../../assets/mm/x (area page)
    html = re.sub(r'(?:\.\./)+assets/mm/', '/assets/', html)

    # shared css/js, referenced as ../x from areas and bare x from the root
    html = re.sub(r'(?:href|src)="(?:\.\./)?(shared\.css|molecules\.js|schedule\.js)"',
                  lambda m: m.group(0).split('=')[0] + '="/' + m.group(1) + '"', html)

    # Internal links -> absolute clean URLs, so Pages serves them without a
    # 301 hop. Every pattern has to tolerate a trailing #fragment: the area
    # pages link back to ../index.html#booking and friends, and an earlier
    # version of this that ignored fragments left those pointing at .html.
    in_areas = canonical_path.startswith('/areas/')
    frag = r'(#[^"]*)?'

    def sub(pattern, target):
        return lambda h: re.sub(pattern, lambda m: 'href="%s%s"' % (
            target(m), m.groups()[-1] or ''), h)

    # the home page, linked from any depth
    html = sub(r'href="(?:\.\./)+index\.html' + frag + '"', lambda m: '/')(html)
    # the areas hub, linked from the home page or from a sibling area page
    html = sub(r'href="(?:areas/)?index\.html' + frag + '"',
               lambda m: '/areas/' if in_areas else '/areas/')(html)
    # individual area pages, from inside /areas/ or from the home page
    html = sub(r'href="areas/([a-z0-9-]+)\.html' + frag + '"',
               lambda m: '/areas/' + m.group(1))(html)
    if in_areas:
        html = sub(r'href="([a-z0-9-]+)\.html' + frag + '"',
                   lambda m: '/areas/' + m.group(1))(html)

    # this is her live site now, not a client demo
    html = html.replace('<meta name="robots" content="noindex, nofollow">',
                        '<meta name="robots" content="index, follow">')

    # absolute og:image so link previews resolve off-site
    html = re.sub(r'(<meta property="og:image" content=")[^"]*(")',
                  r'\1https://' + domain + r'/assets/og.png\2', html)

    # canonical + og:url, inserted once before </head>
    tags = ('<link rel="canonical" href="https://%s%s">\n'
            '<meta property="og:url" content="https://%s%s">\n'
            % (domain, canonical_path, domain, canonical_path))
    html = html.replace('</head>', tags + '</head>', 1)

    return html


def main():
    if len(sys.argv) != 2:
        sys.exit('usage: build-mm.py <domain>   e.g. build-mm.py molecularmiracles.co.uk')
    domain = sys.argv[1].strip().lower().removeprefix('https://').removeprefix('http://').rstrip('/')
    if '.' not in domain:
        sys.exit('that does not look like a domain: ' + domain)

    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(os.path.join(OUT, 'areas'))

    shutil.copytree(ASSETS, os.path.join(OUT, 'assets'))
    for f in ('shared.css', 'molecules.js', 'schedule.js'):
        shutil.copy(os.path.join(SRC, f), os.path.join(OUT, f))

    pages = []

    with open(os.path.join(SRC, 'index.html')) as fh:
        html = fh.read()
    with open(os.path.join(OUT, 'index.html'), 'w') as fh:
        fh.write(rewrite(html, domain, '/'))
    pages.append(('/', '1.0'))

    for name in sorted(os.listdir(os.path.join(SRC, 'areas'))):
        if not name.endswith('.html'):
            continue
        path = '/areas/' if name == 'index.html' else '/areas/' + name[:-5]
        with open(os.path.join(SRC, 'areas', name)) as fh:
            html = fh.read()
        with open(os.path.join(OUT, 'areas', name), 'w') as fh:
            fh.write(rewrite(html, domain, path))
        pages.append((path, '0.8' if name == 'index.html' else '0.6'))

    today = date.today().isoformat()
    sitemap = ['<?xml version="1.0" encoding="UTF-8"?>',
               '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path, priority in pages:
        sitemap.append('  <url><loc>https://%s%s</loc><lastmod>%s</lastmod>'
                       '<priority>%s</priority></url>' % (domain, path, today, priority))
    sitemap.append('</urlset>')
    with open(os.path.join(OUT, 'sitemap.xml'), 'w') as fh:
        fh.write('\n'.join(sitemap) + '\n')

    with open(os.path.join(OUT, 'robots.txt'), 'w') as fh:
        fh.write('User-agent: *\nAllow: /\n\nSitemap: https://%s/sitemap.xml\n' % domain)

    # long cache on fingerprint-free assets is safe here: images change rarely
    # and the HTML that references them is always revalidated.
    with open(os.path.join(OUT, '_headers'), 'w') as fh:
        fh.write('/assets/*\n  Cache-Control: public, max-age=604800\n')

    print('built %d pages into dist/molecular-miracles/ for %s' % (len(pages), domain))


if __name__ == '__main__':
    main()

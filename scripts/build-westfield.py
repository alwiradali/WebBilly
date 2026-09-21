#!/usr/bin/env python3
"""Build a standalone, deployable copy of the Westfield Garage site.

Same idea as build-smartin.py. The site lives in this repo at
templates/westfield-garage.html as a noindex demo served under
billydigitals.com/templates/westfield-garage. His real site sits at the root of
his own domain on his own Cloudflare account, so this produces that copy: paths
rewritten to the root, indexing switched on, a canonical, a sitemap, and only
the files this one page actually uses.

    python3 scripts/build-westfield.py westfieldgarageintlimited.co.uk

Optionally takes a Cloudflare Web Analytics token, which is injected as the
beacon script (cookieless, so no consent banner):

    python3 scripts/build-westfield.py <domain> --analytics <token>

Output lands in dist/westfield-garage/ (gitignored, like the other builds).

Anything in templates/westfield-root/ is copied to the ROOT of the build as-is:
that is where Google's Search Console verification file lives, and where any
other must-sit-at-the-root file for his domain goes.

IT REFUSES TO BUILD while the page still carries anything that is fine on a
demo and not fine on a business's live website — see BLOCKERS below. That list
is the point of this script as much as the copying is: a demo becomes a live
site by somebody running this, and nobody reads a checklist at that moment.
"""

import os
import re
import shutil
import sys
from datetime import date

ROOT = os.path.join(os.path.dirname(__file__), '..')
PAGE = os.path.join(ROOT, 'templates', 'westfield-garage.html')
ROOTFILES = os.path.join(ROOT, 'templates', 'westfield-root')
OUT = os.path.join(ROOT, 'dist', 'westfield-garage')

# Things that must not reach his customers. Each is (needle, why, how to fix).
#
# Notes that are useful on the demo and meaningless on a live site carry
# data-demo instead and are simply stripped below — blocking on those would
# only teach whoever hits it to delete a sentence they wanted to keep.
# These four are different: each one is either a legal problem or a link that
# visibly goes nowhere, and each has a real fix rather than a deletion.
BLOCKERS = [
    ('data-demo-reviews',
     'the three reviews on the page are still the invented ones',
     'paste three of his real Google reviews in and delete the data-demo-reviews '
     'attribute, or delete the whole reviews section. Invented testimonials on a '
     'trading website are an offence, not a style choice.'),

    ('"https://www.facebook.com/"',
     'CONFIG.facebook still points at Facebook\'s own home page',
     'put his real profile URL in assets/js/westfield.js, or set it to "" and '
     'the button is removed from the page automatically.'),

    ('"https://www.instagram.com/"',
     'CONFIG.instagram still points at Instagram\'s own home page',
     'put his real profile URL in assets/js/westfield.js, or set it to "" and '
     'the button is removed from the page automatically.'),

]

# Copied wholesale; everything else in assets/ belongs to other clients.
ASSET_DIRS = ['westfield']
ASSET_FILES = [
    ('css', 'scroll-fx.css'), ('css', 'westfield.css'),
    ('js', 'scroll-fx.js'), ('js', 'westfield.js'),
]

BEACON = ('<script defer src="https://static.cloudflareinsights.com/beacon.min.js" '
          'data-cf-beacon=\'{"token": "%s"}\'></script>')


def check(sources):
    """Refuse to build a live site out of a demo that is still a demo.

    Reads the page AND westfield.js together, because half of what is still
    placeholder lives in the CONFIG block rather than in the markup."""
    found = [(why, fix) for needle, why, fix in BLOCKERS if needle in sources]
    if not found:
        return
    print('build-westfield: refusing to build.\n', file=sys.stderr)
    for why, fix in found:
        print('  ✗ %s\n      → %s\n' % (why, fix), file=sys.stderr)
    print('  See docs/westfield-golive.md.', file=sys.stderr)
    sys.exit(1)


def rewrite(html, domain, analytics):
    # assets sit at the root here, not one level up from /templates/
    html = html.replace('../assets/', '/assets/')
    html = html.replace('src="vendor/lenis.min.js"', 'src="/vendor/lenis.min.js"')

    # the demo is noindex; his site is very much not
    html = re.sub(r'\s*<meta name="robots"[^>]*>', '', html)

    # Notes addressed to us, not to his customers: "photography is placeholder
    # stock", "an embedded map can drop in here", "see the handoff note". They
    # earn their place on the demo and have no business on his website.
    html = re.sub(r'\s*<[a-z]+[^>]*\sdata-demo(?=[\s>])[^>]*>.*?</[a-z]+>', '', html, flags=re.S | re.I)

    # HTML comments are for us too. Invisible to a reader, a gift to anyone who
    # views source, and several of them say the word "placeholder".
    html = re.sub(r'<!--(?!\[if).*?-->', '', html, flags=re.S)

    html = html.replace('</title>',
                        '</title>\n<link rel="canonical" href="https://%s/">' % domain)

    # og:image has to be absolute or no share card resolves it
    html = html.replace('content="/assets/westfield/og-card.png"',
                        'content="https://%s/assets/westfield/og-card.png"' % domain)
    html = html.replace('<meta property="og:image"',
                        '<meta property="og:url" content="https://%s/">\n<meta property="og:image"'
                        % domain, 1)

    # the LocalBusiness should say where it lives on the web
    html = html.replace('"name": "Westfield Garage Int Limited",',
                        '"name": "Westfield Garage Int Limited",\n  '
                        '"url": "https://%s/",\n  '
                        '"image": "https://%s/assets/westfield/og-card.png",' % (domain, domain))

    if analytics:
        html = html.replace('</body>', BEACON % analytics + '\n</body>')

    # tidy the blank lines the comment strip leaves behind
    html = re.sub(r'\n{3,}', '\n\n', html)
    return html


def verify(html):
    """Everything the built page asks for has to exist in the build."""
    missing = []
    for ref in sorted(set(re.findall(r'(?:src|href)="(/[^"]+)"', html))):
        path = os.path.join(OUT, ref.lstrip('/').split('?')[0])
        if not os.path.exists(path):
            missing.append(ref)
    for ref in sorted(set(re.findall(r'srcset="([^"]+)"', html))):
        for part in ref.split(','):
            url = part.strip().split(' ')[0]
            if url.startswith('/') and not os.path.exists(os.path.join(OUT, url.lstrip('/'))):
                missing.append(url)
    stale = sorted(set(re.findall(r'(?:src|href)="(\.\./[^"]*|[^":]*templates/[^"]*)"', html)))
    problems = []
    if missing:
        problems.append('missing from the build: ' + ', '.join(sorted(set(missing))))
    if stale:
        problems.append('paths not rewritten to the root: ' + ', '.join(stale))
    if 'noindex' in html:
        problems.append('the robots noindex meta survived the rewrite')
    # placeholder="..." on a form input is the real HTML attribute and stays;
    # the word anywhere else means a demo note survived the strip.
    for leak, pattern in (('data-demo', r'data-demo'),
                          ('handoff note', r'handoff note'),
                          ('placeholder', r'placeholder(?!=")')):
        if re.search(pattern, html, re.I):
            problems.append('"%s" is still in the built page' % leak)
    if problems:
        sys.exit('build-westfield: ' + '\n  '.join(problems))


def main():
    args = sys.argv[1:]
    analytics = ''
    if '--analytics' in args:
        i = args.index('--analytics')
        analytics = args[i + 1] if len(args) > i + 1 else ''
        del args[i:i + 2]
    if len(args) != 1:
        sys.exit('usage: build-westfield.py <domain> [--analytics <cf token>]\n'
                 '   e.g. build-westfield.py westfieldgarageintlimited.co.uk')

    domain = args[0].strip().lower()
    for p in ('https://', 'http://'):
        if domain.startswith(p):
            domain = domain[len(p):]
    domain = domain.rstrip('/')
    if '.' not in domain:
        sys.exit('that does not look like a domain: ' + domain)

    with open(PAGE, encoding='utf-8') as fh:
        html = fh.read()
    with open(os.path.join(ROOT, 'assets', 'js', 'westfield.js'), encoding='utf-8') as fh:
        js = fh.read()
    check(html + js)

    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(os.path.join(OUT, 'assets'))

    for d in ASSET_DIRS:
        shutil.copytree(os.path.join(ROOT, 'assets', d), os.path.join(OUT, 'assets', d))
    for sub, name in ASSET_FILES:
        os.makedirs(os.path.join(OUT, 'assets', sub), exist_ok=True)
        shutil.copy(os.path.join(ROOT, 'assets', sub, name),
                    os.path.join(OUT, 'assets', sub, name))

    os.makedirs(os.path.join(OUT, 'vendor'))
    shutil.copy(os.path.join(ROOT, 'templates', 'vendor', 'lenis.min.js'),
                os.path.join(OUT, 'vendor', 'lenis.min.js'))

    # crawlers and old browsers ask for /favicon.ico whatever the page links to
    shutil.copy(os.path.join(ROOT, 'assets', 'westfield', 'icon-32.png'),
                os.path.join(OUT, 'favicon.ico'))

    built = rewrite(html, domain, analytics)
    with open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8') as fh:
        fh.write(built)

    with open(os.path.join(OUT, 'robots.txt'), 'w', encoding='utf-8') as fh:
        fh.write('User-agent: *\nAllow: /\n\nSitemap: https://%s/sitemap.xml\n' % domain)
    with open(os.path.join(OUT, 'sitemap.xml'), 'w', encoding='utf-8') as fh:
        fh.write('<?xml version="1.0" encoding="UTF-8"?>\n'
                 '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                 '  <url><loc>https://%s/</loc><lastmod>%s</lastmod></url>\n'
                 '</urlset>\n' % (domain, date.today().isoformat()))

    # files that have to sit at the root of his domain, byte for byte
    if os.path.isdir(ROOTFILES):
        for name in sorted(os.listdir(ROOTFILES)):
            shutil.copy(os.path.join(ROOTFILES, name), os.path.join(OUT, name))

    verify(built)

    files = sum(len(f) for _r, _d, f in os.walk(OUT))
    kb = sum(os.path.getsize(os.path.join(r, f))
             for r, _d, fs in os.walk(OUT) for f in fs) // 1024
    print('built dist/westfield-garage/ for %s — %d files, %d KB%s'
          % (domain, files, kb, ', with Web Analytics' if analytics else ''))


if __name__ == '__main__':
    main()

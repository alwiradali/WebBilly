#!/usr/bin/env python3
"""Check that the editor site really serves what scripts/mm-editor-seed holds.

Seeding the editor site pushes 40 block-markup payloads through the WordPress
API. WordPress is free to renormalise block markup on save, so comparing the
raw markup back would flag differences that do not matter. What actually has
to survive is what the bridge consumes: content.js reads the *rendered* page
and maps the Nth h1/h2/h3/p/ul/img onto the Nth one in the design. So this
compares that sequence — element type and visible text, in order — between the
payload on disk and the page the public API serves.

    python3 scripts/verify-mm-editor.py molecularmiracleseditor2.wordpress.com

Reads the public API anonymously, which is also exactly how the live site
reaches it, so a pass here means the bridge will work for a visitor.
"""

import html
import json
import os
import re
import sys
import urllib.request

SEED = os.path.join(os.path.dirname(__file__), 'mm-editor-seed')
# content.js edits these element types, in this order of appearance.
TAGS = ('h1', 'h2', 'h3', 'p', 'ul', 'img')


def elements(markup):
    """Reduce HTML to the [(tag, text)] sequence the bridge cares about.

    Images carry no text, so they compare on their src filename instead —
    enough to catch a dropped or reordered image without depending on the
    CDN query string WordPress appends when it re-serves one.
    """
    out = []
    pattern = re.compile(
        r'<(h1|h2|h3|p|ul)\b[^>]*>(.*?)</\1>|<img\b([^>]*)>',
        re.S | re.I,
    )
    for m in pattern.finditer(markup):
        if m.group(1):
            tag = m.group(1).lower()
            text = re.sub(r'<[^>]+>', '', m.group(2))
            text = html.unescape(text)
            text = re.sub(r'\s+', ' ', text).strip()
            if text:
                out.append((tag, text))
        else:
            src = re.search(r'src="([^"]*)"', m.group(3) or '')
            name = src.group(1).rsplit('/', 1)[-1].split('?')[0] if src else ''
            out.append(('img', name))
    return out


def fetch(site, slug):
    url = ('https://public-api.wordpress.com/wp/v2/sites/%s/pages'
           '?slug=%s&_fields=slug,title,content,status' % (site, slug))
    with urllib.request.urlopen(url, timeout=30) as fh:
        return json.load(fh)


def main():
    if len(sys.argv) != 2:
        sys.exit('usage: verify-mm-editor.py <editor-subdomain>')
    site = sys.argv[1]

    slugs = sorted(
        f[:-5] for f in os.listdir(SEED)
        if f.endswith('.json') and f != 'ids.json'
    )

    failures = []
    for slug in slugs:
        want = json.load(open(os.path.join(SEED, slug + '.json')))
        try:
            got = fetch(site, slug)
        except Exception as exc:                      # noqa: BLE001
            failures.append((slug, 'fetch failed: %s' % exc))
            continue
        if not got:
            failures.append((slug, 'page missing on the editor site'))
            continue
        page = got[0]
        if page.get('status') != 'publish':
            failures.append((slug, 'status is %r, not published' % page.get('status')))
            continue

        expect = elements(want['content'])
        actual = elements(page['content']['rendered'])
        if expect == actual:
            print('ok    %-28s %3d elements' % (slug, len(expect)))
            continue

        # Report the first divergence rather than the whole sequence; that is
        # what tells you which block to look at.
        detail = 'element counts %d vs %d' % (len(expect), len(actual))
        for i in range(max(len(expect), len(actual))):
            a = expect[i] if i < len(expect) else None
            b = actual[i] if i < len(actual) else None
            if a != b:
                detail = 'first difference at element %d:\n      want %r\n      got  %r' % (i, a, b)
                break
        failures.append((slug, detail))
        print('FAIL  %-28s %s' % (slug, detail))

    announcement = fetch(site, 'announcement')
    if not announcement:
        failures.append(('announcement', 'page missing on the editor site'))
    elif elements(announcement[0]['content']['rendered']):
        failures.append(('announcement', 'expected to be empty but has content'))
    else:
        print('ok    %-28s empty, as the notice bar expects' % 'announcement')

    print()
    if failures:
        print('%d of %d pages differ' % (len(failures), len(slugs) + 1))
        return 1
    print('all %d pages match the seed payloads' % (len(slugs) + 1))
    return 0


if __name__ == '__main__':
    sys.exit(main())

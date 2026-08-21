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

import json
import os
import posixpath
import re
import shutil
import sys
from datetime import date

SRC = os.path.join(os.path.dirname(__file__), '..', 'templates', 'mm')
ASSETS = os.path.join(os.path.dirname(__file__), '..', 'assets', 'mm')
OUT = os.path.join(os.path.dirname(__file__), '..', 'dist', 'molecular-miracles')


def breadcrumb_jsonld(html, domain, canonical_path):
    """Build BreadcrumbList markup from the page's own visible breadcrumb.

    The area pages already render "Home > Areas > Glasgow" but carry no
    structured data for it, so Google shows a bare URL in results instead of a
    trail. Google requires the markup to match what the user actually sees, so
    the names are read straight out of the rendered crumb rather than being
    reconstructed from the path.
    """
    m = re.search(r'<p class="crumb[^"]*">(.*?)</p>', html, re.S)
    if not m:
        return ''
    text = re.sub(r'<[^>]+>', '', m.group(1)).replace('&rsaquo;', '›')
    names = [n.strip() for n in text.split('›') if n.strip()]
    if len(names) < 2:
        return ''  # a one-item trail is not a breadcrumb

    # First crumb is always home and the last is always this page; anything in
    # between is the section hub (/areas/, /courses/), derived from the path so
    # this keeps working as new sections are added.
    section = '/' + canonical_path.strip('/').split('/')[0] + '/'
    paths = ['/'] + [section] * (len(names) - 2) + [canonical_path]
    items = [
        '{"@type":"ListItem","position":%d,"name":%s,"item":"https://%s%s"}'
        % (i + 1, json.dumps(name), domain, paths[i])
        for i, name in enumerate(names)
    ]
    return ('<script type="application/ld+json">\n'
            '{"@context":"https://schema.org","@type":"BreadcrumbList",'
            '"itemListElement":[%s]}\n</script>\n' % ','.join(items))


def rewrite(html, domain, canonical_path):
    """Rewrite one page from repo-relative to domain-root paths."""
    # assets: ../../assets/mm/x (root page) and ../../../assets/mm/x (area page)
    html = re.sub(r'(?:\.\./)+assets/mm/', '/assets/', html)

    # shared css/js, referenced as ../x from areas and bare x from the root
    html = re.sub(r'(?:href|src)="(?:\.\./)?(shared\.css|molecules\.js|schedule\.js|reviews\.js|content\.js)"',
                  lambda m: m.group(0).split('=')[0] + '="/' + m.group(1) + '"', html)

    # Internal links -> absolute clean URLs, so the host serves them without a
    # 301 hop. This resolves each href against the page's own directory rather
    # than matching folder names: an earlier version hardcoded "areas/" and
    # silently left the courses pages' links pointing at .html.
    page_dir = canonical_path if canonical_path.endswith('/') else \
        posixpath.dirname(canonical_path)
    if not page_dir.endswith('/'):
        page_dir += '/'  # dirname('/faq') is already '/', so don't double it

    def resolve(m):
        href = m.group(1)
        if re.match(r'(?:[a-z]+:|//|/|#)', href):
            return m.group(0)  # already absolute, external, or a bare fragment
        path, _, frag = href.partition('#')
        if not path.endswith('.html'):
            return m.group(0)
        target = posixpath.normpath(posixpath.join(page_dir, path))
        if posixpath.basename(target) == 'index.html':
            target = posixpath.dirname(target).rstrip('/') + '/'
        else:
            target = target[:-len('.html')]
        return 'href="%s%s"' % (target, '#' + frag if frag else '')

    html = re.sub(r'href="([^"]+)"', resolve, html)

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
    tags += breadcrumb_jsonld(html, domain, canonical_path)
    html = html.replace('</head>', tags + '</head>', 1)

    return html


PAGES_WORKER = r"""/* Generated by scripts/build-mm.py — do not edit in dist. */
const MM_SHOP_URL = "https://payhip.com/molecularmiraclesChemistryResourcesScottishCurricu";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/mm-shop") return handleMMShop(request);
    return env.ASSETS.fetch(request);
  },
};

async function handleMMShop(request) {
  const cache = caches.default;
  const cacheKey = new Request("https://mm-shop-cache/api/mm-shop");
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  let products = [];
  try {
    const r = await fetch(MM_SHOP_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (site integration for the store owner)" },
    });
    if (r.ok) products = parsePayhipStore(await r.text());
  } catch (e) { /* empty list below */ }

  const res = new Response(JSON.stringify({ store: MM_SHOP_URL, products }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
  await cache.put(cacheKey, res.clone());
  return res;
}

function parsePayhipStore(html) {
  /* Payhip currently ships two storefront themes. Newer stores render each
     product as a "card" with the name inside a linked heading; older ones
     render "grid-item" blocks where the link is a separate anchor after the
     name and price. Lynsey's store is empty until she adds her first
     product, so which theme she has is unknowable today — both are parsed,
     and a store that matches neither yields an empty list, never an error. */
  var out = cardTheme(html);
  if (!out.length) out = gridTheme(html);
  return out.slice(0, 40);

  function cardTheme(html) {
    var out = [], seen = {};
    var re = /card__heading[^"]*productName[^>]*>\s*<a\s+href="(https:\/\/payhip\.com\/b\/[A-Za-z0-9]+)"[^>]*>\s*([\s\S]*?)\s*<\/a>/g;
    var m;
    while ((m = re.exec(html)) !== null) {
      if (seen[m[1]]) continue;
      seen[m[1]] = 1;
      var name = clean(m[2]);
      if (!name) continue;
      var before = html.slice(Math.max(0, m.index - 4000), m.index);
      var img = lastMatch(before, /src="(https:\/\/payhip\.com\/cdn-cgi\/image\/[^"]+)"/g);
      var after = html.slice(m.index, m.index + 4000);
      var price = (after.match(/price-item--regular">\s*([^<]+?)\s*</) || [, ''])[1].trim();
      out.push({ name: name, link: m[1], price: price, img: img });
    }
    return out;
  }

  function gridTheme(html) {
    var out = [], seen = {};
    var starts = [];
    var re = /class="grid-item js-grid-item"/g, m;
    while ((m = re.exec(html)) !== null) starts.push(m.index);
    for (var i = 0; i < starts.length; i++) {
      var block = html.slice(starts[i], starts[i + 1] || starts[i] + 6000);
      var link = (block.match(/grid-item-link[^>]*href="((?:https:\/\/payhip\.com)?\/b\/[A-Za-z0-9]+)"/) || [])[1];
      if (!link) continue;
      if (link.charAt(0) === '/') link = 'https://payhip.com' + link;
      if (seen[link]) continue;
      seen[link] = 1;
      var name = clean((block.match(/productName[^>]*>\s*<span[^>]*>([\s\S]*?)<\/span>/) || [, ''])[1]);
      if (!name) continue;
      var price = clean((block.match(/class="price[\s"][^>]*>\s*([^<]+?)\s*</) || [, ''])[1]);
      var img = (block.match(/(?:data-src|src)="(https:\/\/payhip\.com\/cdn-cgi\/image\/[^"]+)"/) || [, ''])[1];
      out.push({ name: name, link: link, price: price, img: img });
    }
    return out;
  }

  function clean(s) {
    return (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  }
  function lastMatch(s, re) {
    var v = '', m;
    while ((m = re.exec(s)) !== null) v = m[1];
    return v;
  }
}
"""


def main():
    if len(sys.argv) != 2:
        sys.exit('usage: build-mm.py <domain>   e.g. build-mm.py molecularmiracles.co.uk')
    domain = sys.argv[1].strip().lower().removeprefix('https://').removeprefix('http://').rstrip('/')
    if '.' not in domain:
        sys.exit('that does not look like a domain: ' + domain)

    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)

    shutil.copytree(ASSETS, os.path.join(OUT, 'assets'))

    # Cloudflare Pages "advanced mode" worker: serves /api/mm-shop (Lynsey's
    # Payhip storefront parsed to JSON, so the Resources page lists whatever
    # is in her shop right now) and passes everything else to the static
    # assets. Kept in lockstep with the same handler in the billydigitals
    # worker.js, which serves the demo copy.
    with open(os.path.join(OUT, '_worker.js'), 'w') as fh:
        fh.write(PAGES_WORKER)

    # copy every stylesheet and script, rather than naming them: a hardcoded
    # list silently dropped reviews.js when it was added, and the page failed
    # with a 404 that only showed up in the console.
    for f in sorted(os.listdir(SRC)):
        if f.endswith(('.css', '.js')):
            shutil.copy(os.path.join(SRC, f), os.path.join(OUT, f))

    # Walk every page rather than naming the sections, so adding a new folder
    # under templates/mm is picked up without touching this script.
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

            depth = path.strip('/').count('/')
            priority = '1.0' if path == '/' else ('0.8' if depth == 0 or name == 'index.html' else '0.6')
            pages.append((path, priority))

    pages.sort(key=lambda p: (p[0] != '/', p[0]))

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

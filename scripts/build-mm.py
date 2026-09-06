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


SHOP_URL = "https://payhip.com/molecularmiraclesChemistryResourcesScottishCurricu"

PAGES_WORKER = r"""/* Generated by scripts/build-mm.py — do not edit in dist. */
const MM_SHOP_URL = "https://payhip.com/molecularmiraclesChemistryResourcesScottishCurricu";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/mm-shop") return handleMMShop(request, env);
    return env.ASSETS.fetch(request);
  },
};

/* Payhip's official product API. Preferred over reading the storefront HTML,
   which depends on their markup staying put. Only used when a key is present
   as a Cloudflare secret; the scrape below stays as the fallback, so a missing
   key, a wrong key or an unfamiliar response can only ever cost us the upgrade,
   never the shop. The key is read from env and never reaches the browser. */
const MM_API_URL = "https://payhip.com/api/v1/product";
let MM_DIAG = [];

async function fetchViaApi(env) {
  const key = env && env.PAYHIP_API_KEY;
  if (!key) return null;

  /* Payhip answers every unauthenticated request with the same generic error,
     so which header it wants cannot be established from the outside. Rather
     than guess once and be silently wrong, try each shape and keep the one
     that answers. This runs at most once every five minutes, on a cache miss. */
  const shapes = [
    { headers: { "payhip-api-key": key } },
    { headers: { "Authorization": "Bearer " + key } },
    { headers: { "X-Api-Key": key } },
    { url: MM_API_URL + "?api_key=" + encodeURIComponent(key) },
  ];

  for (const shape of shapes) {
    try {
      const r = await fetch(shape.url || MM_API_URL, {
        headers: Object.assign({ "Accept": "application/json" }, shape.headers || {}),
      });
      const text = await r.text();
      /* Diagnostic only. Records the status and the first fragment of the
         reply for each attempt, so a failing shape can be told apart from a
         wrong endpoint or an unexpected body. The key is never recorded —
         only how Payhip answered. */
      MM_DIAG.push({
        via: shape.url ? "query" : Object.keys(shape.headers)[0],
        status: r.status,
        body: text.slice(0, 120),
      });
      if (!r.ok) continue;
      let body = null;
      try { body = JSON.parse(text); } catch (e) { continue; }
      if (!body || body.success === false) continue;
      const list = normaliseApi(body);
      MM_DIAG.push({ via: "parsed", got: list.length });
      if (list.length) return list;
    } catch (e) {
      MM_DIAG.push({ via: shape.url ? "query" : Object.keys(shape.headers)[0], error: String(e).slice(0, 80) });
    }
  }
  return null;
}

/* The response shape is not documented anywhere we can reach, so accept the
   field names it might plausibly use rather than insisting on one. Anything
   that does not yield a usable product key is dropped, because without the key
   the buy and basket buttons have nothing to bind to. */
function normaliseApi(body) {
  let raw = [];
  if (Array.isArray(body)) raw = body;
  else if (body && Array.isArray(body.data)) raw = body.data;
  else if (body && Array.isArray(body.products)) raw = body.products;
  else if (body && body.data && Array.isArray(body.data.products)) raw = body.data.products;

  const pick = (o, names) => {
    for (const n of names) if (o && o[n] !== undefined && o[n] !== null && o[n] !== "") return o[n];
    return "";
  };

  const out = [];
  for (const p of raw) {
    const link = String(pick(p, ["link", "url", "permalink", "product_url"]));
    let keyPart = (link.match(/\/b\/([A-Za-z0-9]+)/) || [])[1];
    if (!keyPart) keyPart = String(pick(p, ["key", "product_key", "permalink_key", "slug"]));
    if (!keyPart) continue;

    let price = pick(p, ["price_formatted", "formatted_price", "display_price", "price"]);
    if (typeof price === "number") {
      /* minor units when it is a whole number too large to be pounds */
      const pounds = price > 1000 ? price / 100 : price;
      price = "£" + pounds.toFixed(2);
    }

    out.push({
      name: String(pick(p, ["name", "title", "product_name"])).trim(),
      link: link || ("https://payhip.com/b/" + keyPart),
      price: String(price || "").trim(),
      img: String(pick(p, ["image", "image_url", "thumbnail", "cover", "cover_image"])),
    });
  }
  return out.filter((p) => p.name).slice(0, 40);
}

async function handleMMShop(request, env) {
  const diag = new URL(request.url).searchParams.has("diag");
  MM_DIAG = [];
  const cache = caches.default;
  const cacheKey = new Request("https://mm-shop-cache/api/mm-shop");
  const hit = diag ? null : await cache.match(cacheKey);
  if (hit) return hit;

  let products = [];
  let source = "storefront";

  const viaApi = await fetchViaApi(env);
  if (viaApi && viaApi.length) {
    products = viaApi;
    source = "api";
  } else {
    try {
      const r = await fetch(MM_SHOP_URL, {
        headers: { "User-Agent": "Mozilla/5.0 (site integration for the store owner)" },
      });
      if (r.ok) products = parsePayhipStore(await r.text());
    } catch (e) { /* snapshot below */ }
  }

  /* Payhip is behind Cloudflare, and Cloudflare challenges requests coming
     from a Worker — every live attempt above returns a 403 bot page. So the
     product list is read at build time, where the request is ordinary and
     works, and shipped with the site. This serves that snapshot. The live
     attempts stay because they cost nothing and would be preferred the day
     that block goes away. */
  if (!products.length) {
    try {
      const snap = await env.ASSETS.fetch(new URL("/shop.json", request.url));
      if (snap.ok) {
        const d = await snap.json();
        if (d && d.products && d.products.length) {
          products = d.products;
          source = "snapshot";
        }
      }
    } catch (e) { /* nothing left to try */ }
  }

  /* "source" says which path answered — useful for checking the key landed,
     and it reveals nothing secret. */
  const payload = { store: MM_SHOP_URL, source, products };
  if (diag) { payload.keyPresent = !!(env && env.PAYHIP_API_KEY); payload.attempts = MM_DIAG; }

  /* Never cache an empty shop. A five-minute cache is right for a good answer
     and badly wrong for a bad one: one failed lookup pinned an empty product
     list in front of every visitor for five minutes, and the pages showed
     their "not loading" fallback the whole time even after the underlying
     problem was fixed. An empty result is treated as a miss and retried on
     the next request instead. */
  const good = products.length > 0;
  const res = new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": good ? "public, max-age=300" : "no-store",
    },
  });
  if (!diag && good) await cache.put(cacheKey, res.clone());
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


def fetch_shop_products():
    """Read her Payhip storefront at build time and return the products.

    The Worker cannot do this itself. Payhip sits behind Cloudflare, and
    Cloudflare answers requests coming from a Cloudflare Worker with a bot
    challenge — every attempt from inside the Worker returns 403 "Just a
    moment...", whether it asks the storefront or the documented API, with or
    without a key. So the fetch happens here, where it is an ordinary request
    from an ordinary machine and simply works, and the result ships with the
    site as shop.json.

    A build that cannot reach Payhip returns None rather than an empty list,
    so the caller can leave the previous snapshot in place instead of
    publishing an empty shop.
    """
    import urllib.request, re as _re, html as _html
    req = urllib.request.Request(SHOP_URL, headers={
        "User-Agent": "Mozilla/5.0 (site build for the store owner)"})
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            page = r.read().decode("utf-8", "replace")
    except Exception as e:
        print(f"  ! could not reach the shop ({e}) — keeping the previous snapshot")
        return None

    out, seen = [], set()
    pattern = _re.compile(
        r'card__heading[^"]*productName[^>]*>\s*<a\s+href="(https://payhip\.com/b/[A-Za-z0-9]+)"[^>]*>\s*(.*?)\s*</a>',
        _re.S)
    for m in pattern.finditer(page):
        link, raw = m.group(1), m.group(2)
        if link in seen:
            continue
        seen.add(link)
        name = _re.sub(r"<[^>]+>", " ", raw)
        name = _re.sub(r"\s+", " ", _html.unescape(name)).strip()
        if not name:
            continue
        before = page[max(0, m.start() - 4000):m.start()]
        imgs = _re.findall(r'src="(https://payhip\.com/cdn-cgi/image/[^"]+)"', before)
        after = page[m.start():m.start() + 4000]
        pm = _re.search(r'price-item--regular">\s*([^<]+?)\s*<', after)
        out.append({
            "name": name,
            "link": link,
            "price": pm.group(1).strip() if pm else "",
            "img": imgs[-1] if imgs else "",
        })
    return out[:40]


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

    # Deployed as a Worker, the entry script is uploaded as code — but it also
    # sits in the asset directory, where the asset router would happily serve
    # it to anyone asking for /_worker.js. It was doing exactly that on the
    # live site. This keeps it out of the served files.
    with open(os.path.join(OUT, '.assetsignore'), 'w') as fh:
        fh.write('_worker.js\n')

    # the shop, read here because the Worker is not allowed to
    import json as _json
    snapshot = fetch_shop_products()
    if snapshot is None:
        prev = os.path.join(os.path.dirname(__file__), 'mm-shop-snapshot.json')
        snapshot = _json.load(open(prev)) if os.path.exists(prev) else []
    else:
        with open(os.path.join(os.path.dirname(__file__), 'mm-shop-snapshot.json'), 'w') as fh:
            _json.dump(snapshot, fh, indent=1)
    with open(os.path.join(OUT, 'shop.json'), 'w') as fh:
        _json.dump({'products': snapshot}, fh)
    print(f'  shop snapshot: {len(snapshot)} products')

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

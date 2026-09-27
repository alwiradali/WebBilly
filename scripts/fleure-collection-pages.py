#!/usr/bin/env python3
"""Write Fleuré & Co.'s collection pages from one shell.

Four pages that differ only in their content are four chances to fix a bug
three times and miss it on the fourth, so they are generated rather than
hand-kept. Everything they say comes out of templates/fleure-data.js — this
script reads that file through node so there is never a second copy of the
collections to keep in step.

Run after editing the collections:  python3 scripts/fleure-collection-pages.py
"""
import json, subprocess, pathlib, html

ROOT = pathlib.Path(__file__).resolve().parent.parent

data = json.loads(subprocess.run(
    ["node", "-e",
     "global.window={};const fs=require('fs');"
     "eval(fs.readFileSync('templates/fleure-data.js','utf8'));"
     "process.stdout.write(JSON.stringify(window.FLEURE));"],
    cwd=ROOT, capture_output=True, text=True, check=True).stdout)

COLS = data["collections"]
E = lambda t: html.escape(t, quote=True)

SHELL = """<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{name} — Fleuré &amp; Co., Nottingham florist</title>
<meta name="description" content="{meta}">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#84083a">

<meta property="og:type" content="website">
<meta property="og:title" content="{name} — Fleuré &amp; Co.">
<meta property="og:description" content="{meta}">
<meta property="og:image" content="/assets/fleure/icon-512.png">

<link rel="icon" href="/assets/fleure/icon-32.png" sizes="32x32">
<link rel="icon" href="/assets/fleure/icon-192.png" sizes="192x192">
<link rel="apple-touch-icon" href="/assets/fleure/icon-180.png">

<link rel="preload" as="font" type="font/woff2" href="/assets/fleure/fonts/cormorant.woff2" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="/assets/fleure/fonts/jost.woff2" crossorigin>
<link rel="preload" as="image" href="/assets/fleure/mark-ink.png">
<link rel="stylesheet" href="/assets/fleure/fonts/fonts.css">
<link rel="stylesheet" href="/templates/fleure.css">
</head>
<body data-collection-page="{cid}">

<a class="skip" href="#main">Skip to content</a>

<div class="loader" id="loader" aria-hidden="true">
  <img src="/assets/fleure/mark-ink.png" alt="" width="850" height="850">
  <span class="loader-bar"><i></i></span>
</div>

<div class="petals" id="petals" aria-hidden="true"></div>

<header class="nav" id="nav">
  <a class="nav-logo" href="/templates/fleure" aria-label="Fleuré &amp; Co. — home">
    <span class="nm">
      <img class="nm-dark" src="/assets/fleure/mark-icon-blush.png" alt="" aria-hidden="true" width="373" height="373">
      <img class="nm-light" src="/assets/fleure/mark-icon.png" alt="" aria-hidden="true" width="373" height="373">
    </span>
    <b>Fleuré &amp; Co.</b>
  </a>
  <nav class="nav-links" aria-label="Sections">
    <a href="/templates/fleure">Home</a>
    <a href="#collections" aria-current="page">Collections</a>
    <a href="/templates/fleure#order">How to order</a>
    <a href="/templates/fleure-work">The flowers</a>
    <a href="/templates/fleure#ordering">Ordering</a>
    <a href="/templates/fleure#contact">Contact</a>
  </nav>
  <a class="btn btn-fill btn-sm nav-cta" href="/templates/fleure?type={cid}#enquire">Enquire</a>
  <button class="menu-open" id="menuOpen" aria-label="Open the menu" aria-expanded="false" aria-controls="menu"><span></span></button>
</header>

<div class="menu" id="menu" aria-hidden="true">
  <button class="menu-close" id="menuClose" aria-label="Close the menu">&times;</button>
  <a href="/templates/fleure">Home</a>
  <a href="#collections">Collections</a>
  <a href="/templates/fleure#order">How to order</a>
  <a href="/templates/fleure-work">The flowers</a>
  <a href="/templates/fleure?type={cid}#enquire">Enquire</a>
  <a href="/templates/fleure#ordering">Ordering</a>
  <a href="/templates/fleure#contact">Contact</a>
</div>

<main id="main">

<section class="page-head" data-dark>
  <div class="wrap">
    <p class="crumb"><a href="/templates/fleure">Fleuré &amp; Co.</a> <span>/</span> {name}</p>
    <h1><span class="rise">{h1}</span></h1>
    <div class="hero-cta">
      <a class="btn btn-blush" href="/templates/fleure?type={cid}#enquire">Enquire about this</a>
      <a class="btn btn-ghost" href="/templates/fleure-work">See all the flowers</a>
    </div>
  </div>
</section>

<section class="sec sec-blush">
  <div class="wrap basket">
    <div class="basket-art" data-rv>
      <img src="/assets/fleure/{img}" alt="{alt}" width="1100" height="1347">
    </div>
    <div>
      <p class="kicker" data-rv>{name}</p>
      <h2 class="big" data-rv data-rv-d="1"><span class="rise">{tagline}</span></h2>
      <p class="lede" data-rv data-rv-d="2">{intro}</p>
      <ul data-rv data-rv-d="3">
{points}
      </ul>
      <div class="hero-cta" data-rv data-rv-d="4">
        <a class="btn btn-fill" href="/templates/fleure?type={cid}#enquire">Start an enquiry</a>
      </div>
    </div>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    <div class="sec-head centre">
      <p class="kicker" data-rv>Recent ones</p>
      <h2 class="big" data-rv data-rv-d="1"><span class="rise">{galHead}</span></h2>
    </div>
    <div class="gal gal-fixed" style="--cols:{cols}">
{figures}
    </div>
    <div class="work-more" data-rv style="justify-content:center">
      <a class="btn btn-line" href="/templates/fleure-work">See all the flowers</a>
    </div>
  </div>
</section>

<section class="sec sec-blush" id="collections">
  <div class="wrap">
    <div class="sec-head centre">
      <p class="kicker" data-rv>The rest</p>
      <h2 class="big" data-rv data-rv-d="1"><span class="rise">The other <em>collections</em></span></h2>
    </div>
    <div class="tiles">
{others}
    </div>
  </div>
</section>

<section class="sec sec-wine" data-dark>
  <div class="wrap sec-head centre" style="margin-bottom:0">
    <h2 class="big" data-rv><span class="rise">Ready when <em>you are</em></span></h2>
    <p class="lede" data-rv data-rv-d="1">
      Tell us the colours, the budget, the occasion and the date, and we will price it.
    </p>
    <div class="hero-cta" data-rv data-rv-d="2" style="justify-content:center">
      <a class="btn btn-blush" href="/templates/fleure?type={cid}#enquire">Start an enquiry</a>
      <a class="btn btn-ghost" href="/templates/fleure#contact">Other ways to reach us</a>
    </div>
  </div>
</section>
</main>

<footer class="foot">
  <div class="wrap foot-top">
    <div>
      <div class="foot-logo">
        <img src="/assets/fleure/icon-192.png" alt="" width="192" height="192" loading="lazy">
        <b>Fleuré &amp; Co.</b>
      </div>
      <p>Fresh and faux florals, personalised and made to order in Nottingham.</p>
    </div>
    <div>
      <h4>Collections</h4>
      <ul>
{footCols}
      </ul>
    </div>
    <div>
      <h4>Get in touch</h4>
      <ul id="footContact"></ul>
    </div>
  </div>
  <div class="wrap foot-btm">
    <span id="footCopy"></span>
    <span>Site by <a href="https://billydigitals.com" target="_blank" rel="noopener">Billy Digitals</a></span>
  </div>
</footer>

<script src="/templates/vendor/lenis.min.js"></script>
<script src="/templates/fleure-data.js"></script>
<script src="/templates/fleure.js"></script>
</body>
</html>
"""

TAGLINE = {
    "fresh":   "Cut this week, <em>wrapped by hand</em>",
    "forever": "The same flowers, <em>that never go over</em>",
    "baskets": "The flowers, and <em>everything else</em>",
    "bespoke": "Whatever you <em>have in mind</em>",
}
GAL_HEAD = {
    "fresh":   "A few we have <em>sent out</em>",
    "forever": "One we <em>made earlier</em>",
    "baskets": "Baskets we have <em>built</em>",
    "bespoke": "Asked for, and <em>made</em>",
}

written = []
for c in COLS:
    photos = c["photos"]
    alts = {w["src"]: w["alt"] for w in data["work"]}
    figures = "\n".join(
        '      <figure data-rv data-rv-d="{d}"><img src="/assets/fleure/{src}" alt="{alt}" '
        'loading="{ld}"><figcaption>{alt}</figcaption></figure>'.format(
            d=(i % 4) + 1, src=src, alt=E(alts.get(src, c["alt"])),
            ld="eager" if i < 2 else "lazy")
        for i, src in enumerate(photos))
    points = "\n".join("        <li>{}</li>".format(E(p)) for p in c["points"])

    others = "\n".join(
        '      <a class="tile" href="/templates/{slug}" data-rv data-rv-d="{d}">\n'
        '        <div class="tile-art"><img src="/assets/fleure/{img}" alt="{alt}" loading="lazy"></div>\n'
        '        <div class="tile-body"><h3>{name}</h3><p>{blurb}</p>'
        '<span class="tile-more">Have a look</span></div>\n'
        '      </a>'.format(slug=o["slug"], d=(i % 4) + 1, img=o["img"], alt=E(o["alt"]),
                            name=E(o["name"]), blurb=E(o["blurb"]))
        for i, o in enumerate([x for x in COLS if x["id"] != c["id"]]))

    foot_cols = "\n".join(
        '        <li><a href="/templates/{}">{}</a></li>'.format(o["slug"], E(o["name"]))
        for o in COLS)

    page = SHELL.format(
        cid=c["id"], name=E(c["name"]), meta=E(c["blurb"]),
        h1=TAGLINE[c["id"]], tagline=TAGLINE[c["id"]],
        img=c["img"], alt=E(c["alt"]), intro=E(c["intro"]),
        points=points, figures=figures, others=others, footCols=foot_cols,
        cols=min(len(photos), 3),
        galHead=GAL_HEAD[c["id"]])

    out = ROOT / "templates" / (c["slug"] + ".html")
    out.write_text(page, encoding="utf-8")
    written.append(c["slug"])
    print("wrote", out.name)

print("\n%d pages" % len(written))

# Bakedwith Amabilis — assets

**The page is unlisted.** It lives at `/templates/amabilis` and anyone with the
link can open it — that is the point, it gets sent to the client. It is kept out
of search by four separate things: nothing on the site links to it, it is absent
from `sitemap.xml`, `robots.txt` disallows `/templates/` for every crawler
including the AI agents, and `_headers` serves
`X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex` for the
page and `noindex, noimageindex` for the media. Link-preview scrapers ignore all
of that, so sharing the URL still renders a proper card.

Unlisted is not the same as private. If the URL needs a key before it opens,
that is a small addition to `worker.js` — ask.

Everything the site shows lives here. Nothing needs rebuilding, bundling or
deploying: drop a file in at the right path, reload the page, done.

---

## 1. The logo  ← the one thing still missing

The supplied logo is the authoritative brand asset and the site uses it
**untouched** — no redraw, no recolour, no restretch. It just needs to exist:

```
assets/amabilis/brand/logo.png       (or .svg / .webp — update studio.logo in data.js)
```

The page probes that path on load. If it resolves, the file is placed as-is in
the nav, the loader and the footer, scaled only by height, with its transparent
space preserved. If it doesn't resolve, a plain typographic lockup stands in —
set in the site's own faces (Playfair Display italic + tracked Inter) precisely
so it can never be mistaken for the real signature artwork.

**Best format:** transparent PNG or SVG, the signature and "WITH LOVE" only, no
white circle around it — the site supplies its own ground. If all that exists is
the round Instagram avatar, that works too; it will simply sit as a circle.

Path is set in one place — `templates/amabilis/data.js` → `studio.logo`.

---

## 2. Photographs

### What's here now

The page currently runs entirely on Pexels stock (see `stock/`) at the client's
request — the reel frames in `cakes/` are no longer referenced but are kept so
her real work can come back with a one-line change. Every cake slug in
`templates/amabilis/data.js` maps to a stock file; replace the file (or repoint
the path) with her photograph and that cake is hers again everywhere.

### Replacing them with the real photographs

Save over the same filenames and everything updates — cards, the anatomy
section, the craft sequence, the feed grid and the hero all read from these:

| file | where it appears |
|---|---|
| `cakes/heirloom.webp` + `-detail` | showcase, anatomy, feed |
| `cakes/merlot.webp` + `-detail` | showcase, anatomy, feed |
| `cakes/bloom.webp` + `-detail` | **hero**, showcase, anatomy, about, feed |
| `cakes/midnight.webp` + `-detail` | showcase, feed |
| `cakes/velocity.webp` + `-detail` | showcase, feed |
| `cakes/texture-build/-pipe/-finish.webp` | craft sequence (macro shots) |
| `video/<slug>.mp4` + `-poster.webp` | the reels row |

Portrait, roughly 2:3 or taller, ≥1200px on the long edge. WebP at quality ~85.

### The four photographs already sent

These were sent as messages rather than files, so they aren't in the repository
yet. Send them as attachments and they slot straight in — copy written, entries
ready in `data.js` under `awaitingPhotos`; move an entry into `cakes` and it
appears everywhere the others do.

| save as | the cake |
|---|---|
| `cakes/noel.webp` | Christmas — coconut snow, Santa in a drift, piped sleigh, tree and gifts |
| `cakes/macaron.webp` | watercolour buttercream, gold leaf, rose drip, crown of macarons |
| `cakes/blessing.webp` | christening — ivory, silver and pearl cascade, blue florals, glitter cross |
| `cakes/peony.webp` | marbled blush buttercream, fresh peonies, gold script topper |

A portrait of the baker is the other useful addition — save it as
`cakes/baker.webp` and point the About section's `<img>` at it
(`templates/amabilis/index.html`, in `.about-fig`).

---

## 3. Stock imagery and film

`stock/` is **not her work** and is never presented as it. Everything in there
is Pexels-licensed (free for commercial use, modification allowed, no
attribution required) and is used for two jobs only:

- **`hero-drip.mp4` / `.webm` / `-poster.webp`** — the full-bleed hero film: a
  white cake having its drip poured on a turntable. Trimmed to a 7.3s loop with
  the tail cross-faded back over the head so it does not visibly reset. Swap the
  three paths in `data.js` -> `hero` for one of her own reels and the hero uses
  it instead, no markup change.
- **atmosphere and process stills** — the ingredients band, and the three middle
  frames of the craft sequence (`The build`, `The piping`, `The finish`). She has
  no photographs of her own kitchen mid-bake yet; the first and last frames of
  that sequence are her actual cakes.

Every stock surface on the page carries a visible "stock photography" flag.
Replace `stock/*.webp` with her own kitchen and delete the flag from the
`#ingredients` section in `index.html`.

Rebuild or re-source with `scripts/amabilis-assets.sh` for her own media; the
stock files were fetched directly from the Pexels CDN.

---

## 4. Fonts

`fonts/*.woff2` are the latin subsets of Fraunces (display) and Inter (body),
both Google Fonts under the SIL Open Font Licence, self-hosted so the critical
path never leaves this origin — the page makes no third-party requests at all.
They are variable files, so one download covers the whole weight range.
`@font-face` rules live at the top of `templates/amabilis/amabilis.css`.

---

## 5. Rebuilding from the source clips

```bash
FF=/path/to/ffmpeg SRC=/folder/holding/the/five/mp4s bash scripts/amabilis-assets.sh
```

The script documents where the watermark sits and why each crop is where it is.

---

## 6. What is real and what is placeholder

Real, taken from the studio's own price list, order card and policy card:

- box prices (6/£15, 9/£22, 12/£28, 18/£40) and all eight flavours
- notice periods (cakes and cupcakes a week, brownies and cookies five days)
- bank transfer, in full, before making; collection from Basingstoke
- the whole fine-print section
- the pull quote, which is hers verbatim

Placeholder, and flagged as such on the page itself:

- the four **cake pricing tiers** (£45 / £65 / £85 / £120) — `data.js` → `pricing`
- the four **reviews** — `data.js` → `testimonials`
- the **hero film** and everything in `stock/` — `data.js` → `hero`, `atmosphere`
- per-cake `serves` and `from` figures on the showcase cards — `data.js` → `cakes`

Set `pricingIsDemo` / `testimonialsAreDemo` to `false` in `data.js` once real
figures are in, and delete the `data-demo-flag` chips from `index.html`.

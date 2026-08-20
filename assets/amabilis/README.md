# Bakedwith Amabilis — assets

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

`cakes/*.webp` are frames lifted from the studio's own five reels and cropped so
the TikTok handle watermark falls outside the frame (see
`scripts/amabilis-assets.sh` for how). They're 576px-wide source upscaled 2×, so
they hold up at the sizes the site uses them and no larger.

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

## 3. Fonts

`fonts/*.woff2` are the latin subsets of Playfair Display and Inter (Google
Fonts, SIL Open Font Licence), self-hosted so the critical path never leaves
this origin — the page makes no third-party requests at all. They are variable
files, so one download covers both weights. `@font-face` rules live at the top
of `templates/amabilis/amabilis.css`.

---

## 4. Rebuilding from the source clips

```bash
FF=/path/to/ffmpeg SRC=/folder/holding/the/five/mp4s bash scripts/amabilis-assets.sh
```

The script documents where the watermark sits and why each crop is where it is.

---

## 5. What is real and what is placeholder

Real, taken from the studio's own price list, order card and policy card:

- box prices (6/£15, 9/£22, 12/£28, 18/£40) and all eight flavours
- notice periods (cakes and cupcakes a week, brownies and cookies five days)
- bank transfer, in full, before making; collection from Basingstoke
- the whole fine-print section
- the pull quote, which is hers verbatim

Placeholder, and flagged as such on the page itself:

- the four **cake pricing tiers** (£45 / £65 / £85 / £120) — `data.js` → `pricing`
- the four **reviews** — `data.js` → `testimonials`
- per-cake `serves` and `from` figures on the showcase cards — `data.js` → `cakes`

Set `pricingIsDemo` / `testimonialsAreDemo` to `false` in `data.js` once real
figures are in, and delete the `data-demo-flag` chips from `index.html`.
